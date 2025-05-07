import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/supabase/schema';
import { eq } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';

// Singleton instances for connection reuse
let supabaseClient: SupabaseClient<Database> | null = null
let supabaseTransactionClient: SupabaseClient<Database> | null = null
let drizzleClient: ReturnType<typeof drizzle> | null = null

// Initialize LRU cache for database queries
const queryCache = new LRUCache<string, any>({
  max: 500, // Maximum number of items to store
  ttl: 60000, // 1 minute TTL
  updateAgeOnGet: true, // Reset TTL when item is accessed
  allowStale: true, // Allow returning stale items before removing them
})

// Cache statistics for monitoring
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
}

// Initialize Supabase client using session pooler
export const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient
  }

  // Use session pooler URL if available, otherwise fall back to regular URL
  const supabaseUrl = process.env.SESSION_POOL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase credentials not found. Please set SESSION_POOL_URL/NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    )
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-client-info': 'SupabaseMemory-SessionPool'
      }
    },
  })

  return supabaseClient
}

// Initialize Supabase transaction client using transaction pooler
export const getSupabaseTransactionClient = () => {
  if (supabaseTransactionClient) {
    return supabaseTransactionClient
  }

  // Use transaction pooler URL (DATABASE_URL)
  const supabaseUrl = process.env.DATABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase transaction credentials not found. Please set DATABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    )
  }

  supabaseTransactionClient = createClient<Database>(supabaseUrl, supabaseKey, {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-client-info': 'SupabaseMemory-TransactionPool'
      }
    },
  })

  return supabaseTransactionClient
}

/**
 * Log a database connection to the database_connections table
 * This helps track and monitor connection usage
 *
 * @param connectionType - Type of connection ('session', 'transaction', 'direct')
 * @param poolName - Name of the connection pool
 * @param connectionUrl - URL of the connection (will be masked for security)
 * @param options - Additional options
 * @returns Connection ID
 */
export async function logDatabaseConnection(
  connectionType: 'session' | 'transaction' | 'direct',
  poolName: string,
  connectionUrl: string,
  options?: {
    maxConnections?: number
    idleTimeoutMs?: number
    connectionTimeoutMs?: number
    metadata?: Record<string, any>
  }
): Promise<string> {
  try {
    const supabase = getSupabaseClient()

    // Mask sensitive information in the connection URL
    const maskedUrl = connectionUrl.replace(/:[^@]*@/, ':***@')

    const { data, error } = await supabase
      .from('database_connections')
      .insert({
        id: crypto.randomUUID(),
        connection_type: connectionType,
        pool_name: poolName,
        connection_url: maskedUrl,
        max_connections: options?.maxConnections || 10,
        idle_timeout_ms: options?.idleTimeoutMs || 10000,
        connection_timeout_ms: options?.connectionTimeoutMs || 30000,
        status: 'active',
        metadata: options?.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error logging database connection:', error)
      throw error
    }

    return data.id
  } catch (error) {
    console.error('Error logging database connection:', error)
    // Return a fallback ID in case of error to not block operations
    return crypto.randomUUID()
  }
}

// Initialize Drizzle client
export const getDrizzleClient = () => {
  if (drizzleClient) {
    return drizzleClient
  }

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      "Database connection string not found. Please set DATABASE_URL environment variable."
    )
  }

  // Create a Postgres client
  const client = postgres(connectionString, { max: 10 })

  // Create a Drizzle client
  drizzleClient = drizzle(client, { schema })

  return drizzleClient
}

// Check if Supabase is available
export const isSupabaseAvailable = async () => {
  const supabase = getSupabaseClient()

  try {
    const { error } = await supabase.from("models").select("count", { count: "exact", head: true })
    return !error
  } catch (error) {
    console.error("Error checking Supabase availability:", error)
    return false
  }
}

// Generic function to get data from Supabase
export async function getData<T>(
  tableName: string,
  options?: {
    select?: string
    filters?: Record<string, any>
    limit?: number
    offset?: number
    orderBy?: { column: string; ascending?: boolean }
  },
): Promise<T[]> {
  const supabase = getSupabaseClient()

  try {
    let query = supabase.from(tableName).select(options?.select || "*")

    // Apply filters if provided
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (key === "search") {
          // Handle search filter specially - this would need to be customized based on your schema
          // This is a simplified example that searches in name or title columns
          query = query.or(`name.ilike.%${value}%,title.ilike.%${value}%`)
        } else {
          query = query.eq(key, value)
        }
      })
    }

    // Apply ordering if provided
    if (options?.orderBy) {
      const { column, ascending = true } = options.orderBy
      query = query.order(column, { ascending })
    }

    // Apply pagination if provided
    if (options?.limit !== undefined) {
      query = query.range(options?.offset || 0, (options?.offset || 0) + options.limit - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error(`Error fetching data from ${tableName}:`, error)
      throw error
    }

    return data as T[]
  } catch (error) {
    console.error(`Error fetching data from ${tableName}:`, error)
    throw error
  }
}

// Generic function to get a single item by ID
export async function getItemById<T>(tableName: string, id: string): Promise<T | null> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase.from(tableName).select("*").eq("id", id).single()

    if (error) {
      console.error(`Error fetching item from ${tableName}:`, error)
      throw error
    }

    return data as T
  } catch (error) {
    console.error(`Error fetching item from ${tableName}:`, error)
    throw error
  }
}

// Generic function to create an item
export async function createItem<T>(tableName: string, item: Omit<T, "id" | "created_at" | "updated_at">): Promise<T> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase.from(tableName).insert(item).select().single()

    if (error) {
      console.error(`Error creating item in ${tableName}:`, error)
      throw error
    }

    return data as T
  } catch (error) {
    console.error(`Error creating item in ${tableName}:`, error)
    throw error
  }
}

// Generic function to update an item
export async function updateItem<T>(tableName: string, id: string, updates: Partial<T>): Promise<T> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from(tableName)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error(`Error updating item in ${tableName}:`, error)
      throw error
    }

    return data as T
  } catch (error) {
    console.error(`Error updating item in ${tableName}:`, error)
    throw error
  }
}

// Generic function to delete an item
export async function deleteItem(tableName: string, id: string): Promise<boolean> {
  const supabase = getSupabaseClient()

  try {
    const { error } = await supabase.from(tableName).delete().eq("id", id)

    if (error) {
      console.error(`Error deleting item from ${tableName}:`, error)
      throw error
    }

    return true
  } catch (error) {
    console.error(`Error deleting item from ${tableName}:`, error)
    throw error
  }
}

// Get model configuration by ID
export async function getModelConfig(modelId: string) {
  try {
    // Check cache first
    const cacheKey = `model_config_${modelId}`;
    const cachedModel = queryCache.get(cacheKey);

    if (cachedModel) {
      cacheStats.hits++;
      return cachedModel;
    }

    cacheStats.misses++;

    // Try using Drizzle first
    if (process.env.USE_DRIZZLE === 'true') {
      try {
        const db = getDrizzleClient();
        const allModels = await db.select().from(schema.models);

        // Find the model with the matching ID
        const model = allModels.find(m => m.id === modelId);

        if (model) {
          // Cache the result
          queryCache.set(cacheKey, model);
          cacheStats.sets++;
          return model;
        }
      } catch (drizzleError) {
        console.error("Error using Drizzle, falling back to Supabase:", drizzleError);
        // Continue to Supabase fallback
      }
    }

    // Fall back to Supabase client
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("models").select("*").eq("id", modelId).single();

    if (error) {
      console.error("Error fetching model config:", error);
      throw error;
    }

    // Cache the result
    queryCache.set(cacheKey, data);
    cacheStats.sets++;

    return data;
  } catch (error) {
    console.error("Error fetching model config:", error);
    throw error;
  }
}

// Get all available models
export async function getModels(options?: { provider?: string; status?: string }) {
  try {
    // Build cache key based on options
    const optionsKey = options ?
      `_provider_${options.provider || 'all'}_status_${options.status || 'all'}` :
      '_all';
    const cacheKey = `models${optionsKey}`;

    // Check cache first
    const cachedModels = queryCache.get(cacheKey);

    if (cachedModels) {
      cacheStats.hits++;
      return cachedModels;
    }

    cacheStats.misses++;

    // Try using Drizzle first
    if (process.env.USE_DRIZZLE === 'true') {
      try {
        const db = getDrizzleClient();

        // For simplicity, we'll just get all models and filter in memory
        const allModels = await db.select().from(schema.models);

        // Apply filters in memory
        let result = allModels;

        if (options?.provider) {
          result = result.filter(model => model.provider === options.provider);
        }

        if (options?.status) {
          result = result.filter(model => model.status === options.status);
        }

        // Sort by name
        result.sort((a, b) => a.name.localeCompare(b.name));

        // Cache the result with a shorter TTL for lists (30 seconds)
        queryCache.set(cacheKey, result, { ttl: 30000 });
        cacheStats.sets++;

        return result;
      } catch (drizzleError) {
        console.error("Error using Drizzle, falling back to Supabase:", drizzleError);
        // Continue to Supabase fallback
      }
    }

    // Fall back to Supabase client
    const supabase = getSupabaseClient();
    let query = supabase.from("models").select("*");

    if (options?.provider) {
      query = query.eq("provider", options.provider);
    }

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query.order("name");

    if (error) {
      console.error("Error fetching models:", error);
      throw error;
    }

    // Cache the result with a shorter TTL for lists (30 seconds)
    queryCache.set(cacheKey, data, { ttl: 30000 });
    cacheStats.sets++;

    return data;
  } catch (error) {
    console.error("Error fetching models:", error);
    throw error;
  }
}

// Get agent configuration by ID
export async function getAgentConfig(agentId: string) {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase.from("agents").select("*").eq("id", agentId).single()

    if (error) {
      console.error("Error fetching agent config:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error fetching agent config:", error)
    throw error
  }
}

// Get all available agents
export async function getAgents() {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase.from("agents").select("*").order("name")

    if (error) {
      console.error("Error fetching agents:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error fetching agents:", error)
    throw error
  }
}

// Get all tools for an agent
export async function getAgentTools(agentId: string) {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("agent_tools")
      .select("tools(*)")
      .eq("agent_id", agentId)

    if (error) {
      console.error("Error fetching agent tools:", error)
      throw error
    }

    // Extract the tools from the nested structure
    return data.map((item: any) => item.tools)
  } catch (error) {
    console.error("Error fetching agent tools:", error)
    throw error
  }
}

// Get a setting by category and key
export async function getSetting(category: string, key: string): Promise<string | null> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("category", category)
      .eq("key", key)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null
      }
      console.error("Error fetching setting:", error)
      throw error
    }

    return data.value
  } catch (error) {
    console.error("Error fetching setting:", error)
    throw error
  }
}

/**
 * Create a new scheduled task using pg_cron
 *
 * @param name - Name of the scheduled task
 * @param cronExpression - Cron expression (e.g., '0 0 * * *' for daily at midnight)
 * @param sqlCommand - SQL command to execute
 * @param options - Additional options
 * @returns Task ID
 */
export async function createScheduledTask(
  name: string,
  cronExpression: string,
  sqlCommand: string,
  options?: {
    description?: string
    isActive?: boolean
    metadata?: Record<string, any>
  }
): Promise<string> {
  const supabase = getSupabaseTransactionClient()

  try {
    // Generate a unique job name
    const jobName = `job_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`

    // Create the task record
    const taskId = crypto.randomUUID()
    const { data, error } = await supabase
      .from('scheduled_tasks')
      .insert({
        id: taskId,
        name,
        description: options?.description,
        cron_expression: cronExpression,
        job_name: jobName,
        sql_command: sqlCommand,
        is_active: options?.isActive !== false, // Default to true
        metadata: options?.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    // Schedule the job with pg_cron if task is active
    if (options?.isActive !== false) {
      // Execute the SQL to schedule the cron job
      const { error: cronError } = await supabase.rpc('pg_cron_schedule', {
        job_name: jobName,
        cron_schedule: cronExpression,
        command: sqlCommand
      })

      if (cronError) {
        // If the RPC fails, try direct SQL execution
        const { error: directError } = await supabase.rpc('execute_sql', {
          sql_command: `SELECT cron.schedule('${jobName}', '${cronExpression}', $$ ${sqlCommand} $$)`
        })

        if (directError) {
          // Clean up the task record since we couldn't schedule the job
          await supabase.from('scheduled_tasks').delete().eq('id', taskId)
          throw directError
        }
      }

      // Try to calculate the next run time
      try {
        const { data: nextRunData } = await supabase.rpc('pg_cron_next_run', {
          cron_expression: cronExpression
        })

        if (nextRunData) {
          // Update the task with the next run time
          await supabase
            .from('scheduled_tasks')
            .update({
              next_run_at: nextRunData,
              updated_at: new Date().toISOString()
            })
            .eq('id', taskId)
        }
      } catch (nextRunError) {
        // Non-critical error, just log it
        console.warn('Could not calculate next run time:', nextRunError)
      }
    }

    return taskId
  } catch (error) {
    console.error('Error creating scheduled task:', error)
    throw error
  }
}

/**
 * Update an existing scheduled task
 *
 * @param taskId - ID of the task to update
 * @param updates - Fields to update
 * @returns Success status
 */
export async function updateScheduledTask(
  taskId: string,
  updates: {
    name?: string
    description?: string
    cronExpression?: string
    sqlCommand?: string
    isActive?: boolean
    metadata?: Record<string, any>
  }
): Promise<boolean> {
  const supabase = getSupabaseTransactionClient()

  try {
    // Get the current task
    const { data: currentTask, error: fetchError } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!currentTask) {
      throw new Error(`Task with ID ${taskId} not found`)
    }

    // Prepare updates
    const taskUpdates: any = {
      updated_at: new Date().toISOString()
    }

    if (updates.name !== undefined) taskUpdates.name = updates.name
    if (updates.description !== undefined) taskUpdates.description = updates.description
    if (updates.cronExpression !== undefined) taskUpdates.cron_expression = updates.cronExpression
    if (updates.sqlCommand !== undefined) taskUpdates.sql_command = updates.sqlCommand
    if (updates.isActive !== undefined) taskUpdates.is_active = updates.isActive
    if (updates.metadata !== undefined) taskUpdates.metadata = updates.metadata

    // Update the task record
    const { error: updateError } = await supabase
      .from('scheduled_tasks')
      .update(taskUpdates)
      .eq('id', taskId)

    if (updateError) {
      throw updateError
    }

    // Handle cron job updates if needed
    const needsCronUpdate = updates.cronExpression !== undefined ||
                           updates.sqlCommand !== undefined ||
                           updates.isActive !== undefined

    if (needsCronUpdate) {
      // Unschedule the existing job
      const { error: unscheduleError } = await supabase.rpc('pg_cron_unschedule', {
        job_name: currentTask.job_name
      })

      if (unscheduleError) {
        // Try direct SQL execution if RPC fails
        const { error: directUnscheduleError } = await supabase.rpc('execute_sql', {
          sql_command: `SELECT cron.unschedule('${currentTask.job_name}')`
        })

        // Only throw if it's not a "job doesn't exist" error
        if (directUnscheduleError &&
            !directUnscheduleError.message.includes('does not exist')) {
          throw directUnscheduleError
        }
      }

      // Schedule a new job if the task should be active
      const isActive = updates.isActive !== undefined ? updates.isActive : currentTask.is_active

      if (isActive) {
        const cronExpression = updates.cronExpression || currentTask.cron_expression
        const sqlCommand = updates.sqlCommand || currentTask.sql_command

        const { error: scheduleError } = await supabase.rpc('pg_cron_schedule', {
          job_name: currentTask.job_name,
          cron_schedule: cronExpression,
          command: sqlCommand
        })

        if (scheduleError) {
          // Try direct SQL execution if RPC fails
          const { error: directScheduleError } = await supabase.rpc('execute_sql', {
            sql_command: `SELECT cron.schedule('${currentTask.job_name}', '${cronExpression}', $$ ${sqlCommand} $$)`
          })

          if (directScheduleError) {
            throw directScheduleError
          }
        }

        // Try to calculate next run time
        try {
          const { data: nextRunData } = await supabase.rpc('pg_cron_next_run', {
            cron_expression: cronExpression
          })

          if (nextRunData) {
            // Update the task with the next run time
            await supabase
              .from('scheduled_tasks')
              .update({
                next_run_at: nextRunData,
                updated_at: new Date().toISOString()
              })
              .eq('id', taskId)
          }
        } catch (nextRunError) {
          // Non-critical error, just log it
          console.warn('Could not calculate next run time:', nextRunError)
        }
      }
    }

    return true
  } catch (error) {
    console.error('Error updating scheduled task:', error)
    throw error
  }
}

/**
 * Delete a scheduled task
 *
 * @param taskId - ID of the task to delete
 * @returns Success status
 */
export async function deleteScheduledTask(taskId: string): Promise<boolean> {
  const supabase = getSupabaseTransactionClient()

  try {
    // Get the task to delete
    const { data: task, error: fetchError } = await supabase
      .from('scheduled_tasks')
      .select('job_name')
      .eq('id', taskId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`)
    }

    // Unschedule the cron job
    const { error: unscheduleError } = await supabase.rpc('pg_cron_unschedule', {
      job_name: task.job_name
    })

    if (unscheduleError) {
      // Try direct SQL execution if RPC fails
      const { error: directUnscheduleError } = await supabase.rpc('execute_sql', {
        sql_command: `SELECT cron.unschedule('${task.job_name}')`
      })

      // Only throw if it's not a "job doesn't exist" error
      if (directUnscheduleError &&
          !directUnscheduleError.message.includes('does not exist')) {
        throw directUnscheduleError
      }
    }

    // Delete the task record
    const { error: deleteError } = await supabase
      .from('scheduled_tasks')
      .delete()
      .eq('id', taskId)

    if (deleteError) {
      throw deleteError
    }

    return true
  } catch (error) {
    console.error('Error deleting scheduled task:', error)
    throw error
  }
}

/**
 * Get all scheduled tasks
 *
 * @param options - Filter options
 * @returns List of scheduled tasks
 */
export async function getScheduledTasks(options?: {
  isActive?: boolean
  name?: string
  limit?: number
  offset?: number
}): Promise<any[]> {
  const supabase = getSupabaseClient()

  try {
    let query = supabase
      .from('scheduled_tasks')
      .select('*')

    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive)
    }

    if (options?.name) {
      query = query.ilike('name', `%${options.name}%`)
    }

    if (options?.limit !== undefined) {
      query = query.range(
        options.offset || 0,
        (options.offset || 0) + options.limit - 1
      )
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching scheduled tasks:', error)
    throw error
  }
}

/**
 * Get a scheduled task by ID
 *
 * @param taskId - ID of the task to retrieve
 * @returns Scheduled task
 */
export async function getScheduledTask(taskId: string): Promise<any> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('scheduled_tasks')
      .select('*, scheduled_task_runs(*)')
      .eq('id', taskId)
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching scheduled task:', error)
    throw error
  }
}

/**
 * Run a scheduled task immediately
 *
 * @param taskId - ID of the task to run
 * @returns Run ID
 */
export async function runScheduledTaskNow(taskId: string): Promise<string> {
  const supabase = getSupabaseTransactionClient()

  try {
    // Get the task to run
    const { data: task, error: fetchError } = await supabase
      .from('scheduled_tasks')
      .select('sql_command')
      .eq('id', taskId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`)
    }

    // Create a run record
    const runId = crypto.randomUUID()
    const startTime = new Date().toISOString()

    const { error: createRunError } = await supabase
      .from('scheduled_task_runs')
      .insert({
        id: runId,
        task_id: taskId,
        start_time: startTime,
        status: 'running',
        created_at: startTime
      })

    if (createRunError) {
      throw createRunError
    }

    try {
      // Execute the SQL command
      const { error: execError } = await supabase.rpc('execute_sql', {
        sql_command: task.sql_command
      })

      if (execError) {
        throw execError
      }

      // Update the run record as completed
      const endTime = new Date()
      const durationMs = endTime.getTime() - new Date(startTime).getTime()

      await supabase
        .from('scheduled_task_runs')
        .update({
          end_time: endTime.toISOString(),
          duration_ms: durationMs,
          status: 'completed'
        })
        .eq('id', runId)

      // Update the task record
      await supabase
        .from('scheduled_tasks')
        .update({
          last_run_at: endTime.toISOString(),
          run_count: supabase.rpc('increment_counter', { row_id: taskId, counter_name: 'run_count' }),
          updated_at: endTime.toISOString()
        })
        .eq('id', taskId)

    } catch (execError) {
      // Update the run record as failed
      const endTime = new Date()
      const durationMs = endTime.getTime() - new Date(startTime).getTime()
      const errorMessage = execError instanceof Error ? execError.message : String(execError)

      await supabase
        .from('scheduled_task_runs')
        .update({
          end_time: endTime.toISOString(),
          duration_ms: durationMs,
          status: 'failed',
          error: errorMessage
        })
        .eq('id', runId)

      // Update the task record
      await supabase
        .from('scheduled_tasks')
        .update({
          last_run_at: endTime.toISOString(),
          error_count: supabase.rpc('increment_counter', { row_id: taskId, counter_name: 'error_count' }),
          last_error: errorMessage,
          updated_at: endTime.toISOString()
        })
        .eq('id', taskId)

      throw execError
    }

    return runId
  } catch (error) {
    console.error('Error running scheduled task:', error)
    throw error
  }
}



/**
 * Start a database transaction and log it
 *
 * @param connectionId - ID of the database connection
 * @param transactionType - Type of transaction ('read', 'write', 'mixed')
 * @param metadata - Additional metadata
 * @returns Transaction ID and client
 */
export async function startTransaction(
  connectionId: string,
  transactionType: 'read' | 'write' | 'mixed',
  metadata?: Record<string, any>
): Promise<{ transactionId: string, client: SupabaseClient<Database> }> {
  const client = getSupabaseTransactionClient()

  try {
    // Begin transaction
    const { error: beginError } = await client.rpc('begin')
    if (beginError) throw beginError

    // Log transaction
    const { data, error } = await client
      .from('database_transactions')
      .insert({
        id: crypto.randomUUID(),
        connection_id: connectionId,
        transaction_type: transactionType,
        start_time: new Date().toISOString(),
        status: 'in_progress',
        query_count: 0,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error logging transaction:', error)
      // Rollback if we couldn't log the transaction
      try {
        await client.rpc('rollback')
      } catch (e) {
        console.error('Error rolling back transaction:', e)
      }
      throw error
    }

    return { transactionId: data.id, client }
  } catch (error) {
    console.error('Error starting transaction:', error)
    throw error
  }
}

/**
 * Commit a database transaction
 *
 * @param transactionId - ID of the transaction
 * @param client - Supabase client
 * @param queryCount - Number of queries executed in the transaction
 * @returns Success status
 */
export async function commitTransaction(
  transactionId: string,
  client: SupabaseClient<Database>,
  queryCount: number = 0
): Promise<boolean> {
  try {
    // Commit transaction
    const { error: commitError } = await client.rpc('commit')
    if (commitError) throw commitError

    // Calculate duration
    const startTime = await getTransactionStartTime(transactionId)
    const endTime = new Date().toISOString()
    const durationMs = startTime ? new Date(endTime).getTime() - new Date(startTime).getTime() : 0

    // Update transaction record
    const { error } = await client
      .from('database_transactions')
      .update({
        status: 'committed',
        end_time: endTime,
        duration_ms: durationMs,
        query_count: queryCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)

    if (error) {
      console.error('Error updating transaction record:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error committing transaction:', error)

    // Update transaction record to failed state
    try {
      await client
        .from('database_transactions')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)
    } catch (e) {
      console.error('Error updating transaction record:', e)
    }

    throw error
  }
}

/**
 * Rollback a database transaction
 *
 * @param transactionId - ID of the transaction
 * @param client - Supabase client
 * @param error - Error that caused the rollback
 * @returns Success status
 */
export async function rollbackTransaction(
  transactionId: string,
  client: SupabaseClient<Database>,
  error?: Error
): Promise<boolean> {
  try {
    // Rollback transaction
    const { error: rollbackError } = await client.rpc('rollback')
    if (rollbackError) throw rollbackError

    // Calculate duration
    const startTime = await getTransactionStartTime(transactionId)
    const endTime = new Date().toISOString()
    const durationMs = startTime ? new Date(endTime).getTime() - new Date(startTime).getTime() : 0

    // Update transaction record
    const { error: updateError } = await client
      .from('database_transactions')
      .update({
        status: 'rolled_back',
        end_time: endTime,
        duration_ms: durationMs,
        error: error?.message || 'Transaction rolled back',
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)

    if (updateError) {
      console.error('Error updating transaction record:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error rolling back transaction:', error)
    return false
  }
}

/**
 * Log a database query
 *
 * @param transactionId - ID of the transaction
 * @param queryText - SQL query text
 * @param queryType - Type of query
 * @param options - Additional options
 * @returns Query ID
 */
export async function logDatabaseQuery(
  transactionId: string,
  queryText: string,
  queryType: 'select' | 'insert' | 'update' | 'delete' | 'other',
  options?: {
    executionTimeMs?: number
    rowCount?: number
    status?: 'pending' | 'executing' | 'completed' | 'failed'
    error?: string
  }
): Promise<string> {
  try {
    const supabase = getSupabaseClient()

    // Mask sensitive information in the query
    const maskedQuery = queryText
      .replace(/(password\s*=\s*['"]).*?(['"])/gi, '$1***$2')
      .replace(/(api_key\s*=\s*['"]).*?(['"])/gi, '$1***$2')

    const { data, error } = await supabase
      .from('database_queries')
      .insert({
        id: crypto.randomUUID(),
        transaction_id: transactionId,
        query_text: maskedQuery,
        query_type: queryType,
        execution_time_ms: options?.executionTimeMs,
        row_count: options?.rowCount,
        status: options?.status || 'completed',
        error: options?.error,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error logging database query:', error)
      throw error
    }

    // Increment query count in transaction
    try {
      await supabase
        .from('database_transactions')
        .update({
          query_count: supabase.rpc('increment_counter', { row_id: transactionId, counter_name: 'query_count' })
        })
        .eq('id', transactionId)
    } catch (e) {
      console.error('Error incrementing query count:', e)
    }

    return data.id
  } catch (error) {
    console.error('Error logging database query:', error)
    // Return a fallback ID in case of error to not block operations
    return crypto.randomUUID()
  }
}

/**
 * Get the start time of a transaction
 *
 * @param transactionId - ID of the transaction
 * @returns Start time as ISO string or null if not found
 */
async function getTransactionStartTime(transactionId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('database_transactions')
      .select('start_time')
      .eq('id', transactionId)
      .single()

    if (error) {
      console.error('Error fetching transaction start time:', error)
      return null
    }

    return data.start_time
  } catch (error) {
    console.error('Error fetching transaction start time:', error)
    return null
  }
}



/**
 * Execute operations within a database transaction
 * All operations will be committed together or rolled back if any fails
 *
 * @param operations - Function containing operations to execute in transaction
 * @returns Result of the transaction
 */
export async function withTransaction<R>(
  operations: (client: SupabaseClient<Database>) => Promise<R>
): Promise<R> {
  const transactionClient = getSupabaseTransactionClient()

  try {
    // Begin transaction
    const { error: beginError } = await transactionClient.rpc('begin')
    if (beginError) throw beginError

    try {
      // Execute operations within transaction
      const result = await operations(transactionClient)

      // Commit transaction
      const { error: commitError } = await transactionClient.rpc('commit')
      if (commitError) throw commitError

      return result
    } catch (err) {
      // Rollback transaction on error
      try {
        const { error: rollbackError } = await transactionClient.rpc('rollback')
        if (rollbackError) {
          console.error('Error rolling back transaction:', rollbackError)
        }
      } catch (rollbackErr) {
        console.error('Error rolling back transaction:', rollbackErr)
      }

      throw err
    }
  } catch (err) {
    console.error('Transaction error:', err)
    throw err
  }
}
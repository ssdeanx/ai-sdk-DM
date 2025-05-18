import { getRedisClient } from '../memory/upstash/upstashClients';
import { generateId } from 'ai';
import { z } from 'zod';
import { shouldUseUpstash } from '../memory/supabase';
import { trace, span, event } from '../tracing';

// --- Constants for Redis Keys ---
const TOOL_EXECUTION_PREFIX = 'tool:execution:';
const TOOL_EXECUTIONS_INDEX = 'tool:executions'; // Sorted set for all tool executions, scored by timestamp
const TOOL_EXECUTIONS_BY_TOOL_PREFIX = 'tool:executions:tool:'; // Sorted set of executions for a specific tool
const TOOL_EXECUTIONS_BY_THREAD_PREFIX = 'tool:executions:thread:'; // Sorted set of executions for a specific thread
const TOOL_EXECUTIONS_BY_AGENT_PREFIX = 'tool:executions:agent:'; // Sorted set of executions for a specific agent
const TOOL_STATS_PREFIX = 'tool:stats:'; // Hash of statistics for a specific tool

// --- Zod Schemas ---

/**
 * Schema for tool execution data
 */
export const ToolExecutionDataSchema = z.object({
  id: z.string().uuid(),
  tool_id: z.string(),
  tool_name: z.string(),
  parameters: z.record(z.any()),
  result: z.any().optional(),
  error_message: z.string().optional(),
  status: z.enum(['success', 'error', 'in_progress']),
  execution_time: z.number().positive().optional(),
  thread_id: z.string().optional(),
  agent_id: z.string().optional(),
  created_at: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Schema for tool execution input (without id and created_at)
 */
export const ToolExecutionInputSchema = ToolExecutionDataSchema.omit({
  id: true,
  created_at: true,
});

/**
 * Schema for tool statistics
 */
export const ToolStatsSchema = z.object({
  total_executions: z.number().int().nonnegative(),
  successful_executions: z.number().int().nonnegative().optional(),
  failed_executions: z.number().int().nonnegative().optional(),
  avg_execution_time: z.number().nonnegative().optional(),
  execution_time_count: z.number().int().nonnegative().optional(),
  last_execution: z.string().datetime().optional(),
});

// --- Types ---
export type ToolExecutionData = z.infer<typeof ToolExecutionDataSchema>;
export type ToolExecutionInput = z.infer<typeof ToolExecutionInputSchema>;
export type ToolStats = z.infer<typeof ToolStatsSchema>;

// --- Error Handling ---
export class ToolExecutionStoreError extends Error {
  constructor(
    message: string,
    public cause?: any
  ) {
    super(message);
    this.name = 'ToolExecutionStoreError';
    Object.setPrototypeOf(this, ToolExecutionStoreError.prototype);
  }
}

/**
 * Creates a trace for a tool execution
 * @param executionData The tool execution data
 * @param userId Optional user ID for the trace
 * @returns A promise that resolves with the trace ID
 */
export async function traceToolExecution(
  executionData: ToolExecutionData,
  userId?: string
): Promise<string | undefined> {
  try {
    // Create a trace for this tool execution
    const traceObj = await trace({
      name: `tool_execution_${executionData.tool_name}`,
      userId,
      metadata: {
        tool_id: executionData.tool_id,
        tool_name: executionData.tool_name,
        execution_id: executionData.id,
        thread_id: executionData.thread_id,
        agent_id: executionData.agent_id,
        status: executionData.status,
        timestamp: executionData.created_at,
      },
    });

    const traceId = traceObj?.id;
    if (!traceId) return undefined;

    // Create a span for the tool execution
    const executionSpan = span({
      traceId,
      name: `${executionData.tool_name}_execution`,
      metadata: {
        tool_id: executionData.tool_id,
        parameters: JSON.stringify(executionData.parameters),
        execution_time: executionData.execution_time,
        span_kind: 'internal', // Use string instead of enum
      },
    });

    // Log the result or error
    if (executionData.status === 'success') {
      await event({
        traceId,
        name: 'tool_execution_success',
        metadata: {
          result: JSON.stringify(executionData.result),
          execution_time: executionData.execution_time,
        },
      });

      // End the span with success
      executionSpan.end({
        success: true,
        result: JSON.stringify(executionData.result),
        durationMs: executionData.execution_time,
      });
    } else if (executionData.status === 'error') {
      await event({
        traceId,
        name: 'tool_execution_error',
        metadata: {
          error_message: executionData.error_message,
          execution_time: executionData.execution_time,
        },
      });

      // End the span with error
      executionSpan.end({
        success: false,
        error: executionData.error_message,
        durationMs: executionData.execution_time,
      });
    }

    return traceId;
  } catch (error) {
    console.error('Error tracing tool execution:', error);
    return undefined;
  }
}

/**
 * Logs a tool execution to Redis and optionally creates a trace
 * @param executionData The tool execution data
 * @param options Optional configuration
 * @param options.userId Optional user ID for tracing
 * @param options.enableTracing Whether to enable tracing (default: true)
 * @returns A promise that resolves with the execution ID
 * @throws ToolExecutionStoreError if logging fails
 */
export async function logToolExecution(
  executionData: ToolExecutionInput,
  options?: {
    userId?: string;
    enableTracing?: boolean;
  }
): Promise<string> {
  // Check if Upstash is available
  if (!shouldUseUpstash()) {
    throw new ToolExecutionStoreError(
      'Upstash is not available. Set USE_UPSTASH_ADAPTER=true to use this feature.'
    );
  }

  // Validate input with Zod
  try {
    ToolExecutionInputSchema.parse(executionData);
  } catch (error) {
    throw new ToolExecutionStoreError(
      `Invalid tool execution data: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }

  const redis = getRedisClient();
  const executionId = uuidv4();
  const now = new Date();
  const timestamp = now.getTime();

  // Complete the execution data
  const completeExecutionData: ToolExecutionData = {
    ...executionData,
    id: executionId,
    created_at: now.toISOString(),
  };

  // Validate complete data with Zod
  try {
    ToolExecutionDataSchema.parse(completeExecutionData);
  } catch (error) {
    throw new ToolExecutionStoreError(
      `Invalid complete tool execution data: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }

  // Create trace if tracing is enabled
  let traceId: string | undefined;
  if (options?.enableTracing !== false) {
    traceId = await traceToolExecution(completeExecutionData, options?.userId);

    // Add traceId to metadata if available
    if (traceId && completeExecutionData.metadata) {
      completeExecutionData.metadata.traceId = traceId;
    } else if (traceId) {
      completeExecutionData.metadata = { traceId };
    }
  }

  // Serialize execution data
  const executionJson = JSON.stringify(completeExecutionData);

  try {
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Save execution data
    pipeline.set(`${TOOL_EXECUTION_PREFIX}${executionId}`, executionJson);

    // Add to global index with timestamp
    pipeline.zadd(TOOL_EXECUTIONS_INDEX, {
      score: timestamp,
      member: executionId,
    });

    // Add to tool-specific index
    pipeline.zadd(
      `${TOOL_EXECUTIONS_BY_TOOL_PREFIX}${executionData.tool_name}`,
      { score: timestamp, member: executionId }
    );

    // Add to thread-specific index if thread_id is provided
    if (executionData.thread_id) {
      pipeline.zadd(
        `${TOOL_EXECUTIONS_BY_THREAD_PREFIX}${executionData.thread_id}`,
        { score: timestamp, member: executionId }
      );
    }

    // Add to agent-specific index if agent_id is provided
    if (executionData.agent_id) {
      pipeline.zadd(
        `${TOOL_EXECUTIONS_BY_AGENT_PREFIX}${executionData.agent_id}`,
        { score: timestamp, member: executionId }
      );
    }

    // Update tool statistics
    const statsKey = `${TOOL_STATS_PREFIX}${executionData.tool_name}`;

    // Increment total executions
    pipeline.hincrby(statsKey, 'total_executions', 1);

    // Increment success/error count
    if (executionData.status === 'success') {
      pipeline.hincrby(statsKey, 'successful_executions', 1);
    } else if (executionData.status === 'error') {
      pipeline.hincrby(statsKey, 'failed_executions', 1);
    }

    // Update average execution time if provided
    if (executionData.execution_time !== undefined) {
      // Get current average and count
      const currentAvg = await redis.hget(statsKey, 'avg_execution_time');
      const currentCount = await redis.hget(statsKey, 'execution_time_count');

      if (
        currentAvg !== null &&
        currentCount !== null &&
        typeof currentAvg === 'string' &&
        typeof currentCount === 'string'
      ) {
        const avg = parseFloat(currentAvg);
        const count = parseInt(currentCount, 10);

        // Calculate new average
        const newAvg =
          (avg * count + executionData.execution_time) / (count + 1);

        pipeline.hset(statsKey, {
          avg_execution_time: newAvg.toString(),
          execution_time_count: (count + 1).toString(),
        });
      } else {
        // First execution with time
        pipeline.hset(statsKey, {
          avg_execution_time: executionData.execution_time.toString(),
          execution_time_count: '1',
        });
      }
    }

    // Update last execution timestamp
    pipeline.hset(statsKey, { last_execution: now.toISOString() });

    // Execute pipeline
    await pipeline.exec();

    return executionId;
  } catch (error) {
    console.error(
      `Error logging tool execution for ${executionData.tool_name}:`,
      error
    );
    throw new ToolExecutionStoreError(
      `Failed to log tool execution for ${executionData.tool_name}`,
      error
    );
  }
}

/**
 * Gets a tool execution from Redis
 * @param executionId The execution ID
 * @param options Optional configuration
 * @param options.userId Optional user ID for tracing
 * @param options.enableTracing Whether to enable tracing (default: true)
 * @returns A promise that resolves with the execution data, or null if not found
 * @throws ToolExecutionStoreError if retrieval fails
 */
export async function getToolExecution(
  executionId: string,
  options?: {
    userId?: string;
    enableTracing?: boolean;
  }
): Promise<ToolExecutionData | null> {
  // Check if Upstash is available
  if (!shouldUseUpstash()) {
    throw new ToolExecutionStoreError(
      'Upstash is not available. Set USE_UPSTASH_ADAPTER=true to use this feature.'
    );
  }

  // Validate executionId
  if (!executionId || typeof executionId !== 'string') {
    throw new ToolExecutionStoreError('Invalid execution ID');
  }

  const redis = getRedisClient();

  try {
    const executionJson = await redis.get(
      `${TOOL_EXECUTION_PREFIX}${executionId}`
    );

    if (!executionJson) {
      return null;
    }

    // Parse JSON
    let executionData: unknown;
    try {
      executionData = JSON.parse(executionJson as string);
    } catch (parseError) {
      throw new ToolExecutionStoreError(
        `Failed to parse execution data for ${executionId}`,
        parseError
      );
    }

    // Validate with Zod
    try {
      const validatedData = ToolExecutionDataSchema.parse(executionData);

      // Create trace if tracing is enabled
      if (options?.enableTracing !== false) {
        // Create a trace event for retrieving the tool execution
        const retrieveTraceId = await trace({
          name: `tool_execution_retrieve_${validatedData.tool_name}`,
          userId: options?.userId,
          metadata: {
            execution_id: validatedData.id,
            tool_name: validatedData.tool_name,
            tool_id: validatedData.tool_id,
            timestamp: new Date().toISOString(),
          },
        });

        if (retrieveTraceId?.id) {
          await event({
            traceId: retrieveTraceId.id,
            name: 'tool_execution_retrieved',
            metadata: {
              execution_id: validatedData.id,
              status: validatedData.status,
              has_result: !!validatedData.result,
              has_error: !!validatedData.error_message,
            },
          });
        }
      }

      return validatedData;
    } catch (validationError) {
      throw new ToolExecutionStoreError(
        `Invalid execution data format for ${executionId}`,
        validationError
      );
    }
  } catch (error) {
    if (error instanceof ToolExecutionStoreError) {
      throw error;
    }
    console.error(`Error getting tool execution ${executionId}:`, error);
    throw new ToolExecutionStoreError(
      `Failed to get tool execution ${executionId}`,
      error
    );
  }
}

/**
 * Lists tool executions for a specific tool
 * @param toolName The tool name
 * @param limit Maximum number of executions to return
 * @param offset Offset for pagination
 * @param options Optional configuration
 * @param options.userId Optional user ID for tracing
 * @param options.enableTracing Whether to enable tracing (default: true)
 * @returns A promise that resolves with an array of execution data
 * @throws ToolExecutionStoreError if listing fails
 */
export async function listToolExecutions(
  toolName: string,
  limit: number = 10,
  offset: number = 0,
  options?: {
    userId?: string;
    enableTracing?: boolean;
  }
): Promise<ToolExecutionData[]> {
  // Check if Upstash is available
  if (!shouldUseUpstash()) {
    throw new ToolExecutionStoreError(
      'Upstash is not available. Set USE_UPSTASH_ADAPTER=true to use this feature.'
    );
  }

  // Validate parameters
  if (!toolName || typeof toolName !== 'string') {
    throw new ToolExecutionStoreError('Invalid tool name');
  }

  // Validate limit and offset
  const validatedLimit = z.number().int().positive().default(10).parse(limit);
  const validatedOffset = z
    .number()
    .int()
    .nonnegative()
    .default(0)
    .parse(offset);

  const redis = getRedisClient();

  try {
    // Get execution IDs from tool-specific index
    const executionIds = await redis.zrange(
      `${TOOL_EXECUTIONS_BY_TOOL_PREFIX}${toolName}`,
      validatedOffset,
      validatedOffset + validatedLimit - 1,
      { rev: true }
    );

    if (!executionIds || executionIds.length === 0) {
      return [];
    }

    // Get execution data for each ID
    const pipeline = redis.pipeline();
    for (const id of executionIds) {
      pipeline.get(`${TOOL_EXECUTION_PREFIX}${id}`);
    }

    const results = await pipeline.exec();

    // Parse and validate results
    const validatedResults: ToolExecutionData[] = [];

    for (const result of results) {
      if (result === null) continue;

      try {
        // Parse JSON
        const parsed = JSON.parse(result as string);

        // Validate with Zod
        const validated = ToolExecutionDataSchema.parse(parsed);
        validatedResults.push(validated);
      } catch (parseError) {
        console.warn(
          `Skipping invalid tool execution data: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
        // Skip invalid entries but continue processing
      }
    }

    return validatedResults;
  } catch (error) {
    console.error(`Error listing tool executions for ${toolName}:`, error);
    throw new ToolExecutionStoreError(
      `Failed to list tool executions for ${toolName}`,
      error
    );
  }
}

/**
 * Gets statistics for a specific tool
 * @param toolName The tool name
 * @returns A promise that resolves with the tool statistics
 * @throws ToolExecutionStoreError if retrieval fails
 */
export async function getToolStats(toolName: string): Promise<ToolStats> {
  // Check if Upstash is available
  if (!shouldUseUpstash()) {
    throw new ToolExecutionStoreError(
      'Upstash is not available. Set USE_UPSTASH_ADAPTER=true to use this feature.'
    );
  }

  // Validate parameters
  if (!toolName || typeof toolName !== 'string') {
    throw new ToolExecutionStoreError('Invalid tool name');
  }

  const redis = getRedisClient();

  try {
    const statsKey = `${TOOL_STATS_PREFIX}${toolName}`;
    const stats = await redis.hgetall(statsKey);

    // Default stats if none found
    if (!stats || Object.keys(stats).length === 0) {
      return {
        total_executions: 0,
        successful_executions: 0,
        failed_executions: 0,
      };
    }

    // Convert numeric strings to numbers
    const processedStats: Record<string, string | number> = {};

    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'string' && !isNaN(Number(value))) {
        processedStats[key] = Number(value);
      } else if (typeof value === 'string') {
        processedStats[key] = value;
      }
      // Skip non-string values
    }

    // Validate with Zod
    try {
      return ToolStatsSchema.parse(processedStats);
    } catch (validationError) {
      console.warn(
        `Invalid tool stats format for ${toolName}: ${validationError instanceof Error ? validationError.message : String(validationError)}`
      );

      // Return default stats if validation fails
      return {
        total_executions: (processedStats.total_executions as number) || 0,
        successful_executions:
          (processedStats.successful_executions as number) || 0,
        failed_executions: (processedStats.failed_executions as number) || 0,
      };
    }
  } catch (error) {
    console.error(`Error getting tool stats for ${toolName}:`, error);
    throw new ToolExecutionStoreError(
      `Failed to get tool stats for ${toolName}`,
      error
    );
  }
}

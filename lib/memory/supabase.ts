import { SupabaseClient, createClient, PostgrestError } from '@supabase/supabase-js';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { LRUCache } from 'lru-cache';
import type { Database, Json } from '@/types/supabase';
import * as schema from '@/db/supabase/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

// Singleton instances for connection reuse
let supabaseClientInstance: SupabaseClient<Database> | null = null;
let supabaseTransactionClientInstance: SupabaseClient<Database> | null = null;
let drizzleClientInstance: PostgresJsDatabase<typeof schema> | null = null;

// Initialize LRU cache for database queries
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  errors: 0,
  evictions: 0,
};

const queryCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 5,
  updateAgeOnGet: true,
  allowStale: false,
  dispose: (value: any, key: string, reason: LRUCache.DisposeReason) => {
    if (reason === 'evict') {
      cacheStats.evictions++;
    }
  },
});

export const getCacheStats = () => ({ ...cacheStats });
export const resetCacheStats = () => {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.sets = 0;
  cacheStats.errors = 0;
  cacheStats.evictions = 0;
};
export const clearQueryCache = () => {
  queryCache.clear();
  resetCacheStats();
  console.log("Supabase query cache cleared.");
};

// Initialize Supabase client using session pooler
export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  const supabaseUrl = process.env.SESSION_POOL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const errorMsg = "Supabase session client credentials not found. Ensure SESSION_POOL_URL (or NEXT_PUBLIC_SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    supabaseClientInstance = createClient<Database>(supabaseUrl, supabaseKey, {
      db: { schema: 'public' },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: { headers: { 'x-client-info': 'ai-sdk-dm-supabase-memory-module-session' } },
    });
    return supabaseClientInstance;
  } catch (error) {
    console.error("Error creating Supabase session client:", error);
    throw error;
  }
};

// Initialize Supabase transaction client
export const getSupabaseTransactionClient = (): SupabaseClient<Database> => {
  if (supabaseTransactionClientInstance) {
    return supabaseTransactionClientInstance;
  }

  const supabaseDirectUrl = process.env.DATABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseDirectUrl || !supabaseServiceKey) {
    const errorMsg = "Supabase transaction client credentials not found. Ensure DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY as fallback) are set.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  try {
    supabaseTransactionClientInstance = createClient<Database>(supabaseDirectUrl, supabaseServiceKey, {
      db: { schema: 'public' },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: { headers: { 'x-client-info': 'ai-sdk-dm-supabase-memory-module-transaction' } },
    });
    return supabaseTransactionClientInstance;
  } catch (error) {
    console.error("Error creating Supabase transaction client:", error);
    throw error;
  }
};

// Initialize Drizzle client
export const getDrizzleClient = (): PostgresJsDatabase<typeof schema> => {
  if (drizzleClientInstance) {
    return drizzleClientInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const errorMsg = "Database connection string not found for Drizzle. Ensure DATABASE_URL is set.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const pgClient = postgres(connectionString, {
      max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS) : 10,
      idle_timeout: process.env.DB_IDLE_TIMEOUT_SEC ? parseInt(process.env.DB_IDLE_TIMEOUT_SEC) : 20,
      connect_timeout: process.env.DB_CONNECT_TIMEOUT_SEC ? parseInt(process.env.DB_CONNECT_TIMEOUT_SEC) : 10,
    });
    drizzleClientInstance = drizzle(pgClient, { schema, logger: process.env.NODE_ENV === 'development' });
    return drizzleClientInstance;
  } catch (error) {
    console.error("Error creating Drizzle client:", error);
    throw error;
  }
};

export async function logDatabaseConnection(
  connectionType: Database['public']['Tables']['database_connections']['Row']['connection_type'],
  poolName: string,
  connectionUrlInput: string,
  options?: {
    maxConnections?: number;
    idleTimeoutMs?: number;
    connectionTimeoutMs?: number;
    status?: Database['public']['Tables']['database_connections']['Row']['status'];
    metadata?: Database['public']['Tables']['database_connections']['Row']['metadata'];
  }
): Promise<string | null> {
  try {
    const db = getDrizzleClient();
    const maskedUrl = connectionUrlInput.replace(/:[^@]*@/, ':***@');
    const connectionId = crypto.randomUUID();

    const result = await db
      .insert(schema.database_connections)
      .values({
        id: connectionId,
        connection_type: connectionType!,
        pool_name: poolName,
        connection_url: maskedUrl,
        max_connections: options?.maxConnections,
        idle_timeout_ms: options?.idleTimeoutMs,
        connection_timeout_ms: options?.connectionTimeoutMs,
        status: options?.status || 'active',
        metadata: options?.metadata || {},
      })
      .returning({ id: schema.database_connections.id });

    return result[0]?.id || null;
  } catch (err) {
    console.error('Exception in logDatabaseConnection:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export const isSupabaseAvailable = async (): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    const { error, count } = await supabase.from('users').select('id', { count: 'exact', head: true });
    if (error) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
};

// Generic CRUD Functions

type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

export async function getData<T extends TableName>(
  tableName: T,
  options?: {
    select?: string;
    match?: Partial<TableRow<T>>;
    filters?: (query: ReturnType<SupabaseClient<Database>['from']>) => ReturnType<SupabaseClient<Database>['from']>;
    limit?: number;
    offset?: number;
    orderBy?: { column: keyof TableRow<T>; ascending?: boolean };
    cacheKey?: string;
    cacheTTL?: number;
  }
): Promise<Array<TableRow<T>>> {
  const effectiveCacheKey = options?.cacheKey || `getData_${tableName}_${JSON.stringify(options?.match)}_${options?.select}_${options?.limit}_${options?.offset}_${JSON.stringify(options?.orderBy)}`;

  if (queryCache.has(effectiveCacheKey)) {
    cacheStats.hits++;
    return queryCache.get(effectiveCacheKey)!;
  }
  cacheStats.misses++;

  try {
    const supabase = getSupabaseClient();
    let query = supabase.from(tableName).select(options?.select || "*");

    if (options?.match) {
      query = query.match(options.match as any);
    }
    if (options?.filters) {
      query = options.filters(query as any) as any;
    }

    if (options?.orderBy) {
      const { column, ascending = true } = options.orderBy;
      query = query.order(column as string, { ascending });
    }

    if (options?.limit !== undefined) {
      query = query.range(options?.offset || 0, (options?.offset || 0) + options.limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching data from ${tableName}:`, error.message, error.details, error.hint);
      throw error;
    }

    if (data) {
      queryCache.set(effectiveCacheKey, data, { ttl: options?.cacheTTL });
      cacheStats.sets++;
    }
    return (data as unknown as Array<TableRow<T>>) || [];
  } catch (err) {
    cacheStats.errors++;
    console.error(`Exception in getData from ${tableName}:`, err instanceof Error ? err.message : String(err));
    if (err instanceof PostgrestError) throw err;
    throw new Error(`Failed to get data from ${tableName}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function getItemById<T extends TableName>(
  tableName: T,
  id: string,
  options?: { select?: string; cacheKey?: string; cacheTTL?: number; }
): Promise<TableRow<T> | null> {
  const effectiveCacheKey = options?.cacheKey || `getItemById_${tableName}_${id}_${options?.select || "*"}`;
  if (queryCache.has(effectiveCacheKey)) {
    cacheStats.hits++;
    return queryCache.get(effectiveCacheKey)!;
  }
  cacheStats.misses++;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(tableName)
      .select(options?.select || "*")
      .eq('id' as any, id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error(`Error fetching item by ID from ${tableName} (ID: ${id}):`, error.message);
      throw error;
    }
    if (data) {
      queryCache.set(effectiveCacheKey, data, { ttl: options?.cacheTTL });
      cacheStats.sets++;
    }
    return data as unknown as TableRow<T> | null;
  } catch (err) {
    cacheStats.errors++;
    console.error(`Exception in getItemById from ${tableName} (ID: ${id}):`, err instanceof Error ? err.message : String(err));
    if (err instanceof PostgrestError) throw err;
    throw new Error(`Failed to get item by ID from ${tableName}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function createItem<T extends TableName>(
  tableName: T,
  item: TableInsert<T>,
  options?: { select?: string; }
): Promise<TableRow<T>> {
  try {
    const supabase = getSupabaseTransactionClient();
    const { data, error } = await supabase
      .from(tableName)
      .insert(item as any)
      .select(options?.select || "*")
      .single();

    if (error) {
      console.error(`Error creating item in ${tableName}:`, error.message);
      throw error;
    }
    if (!data) {
      throw new Error(`Failed to create item in ${tableName}, no data returned.`);
    }
    queryCache.clear();
    return data as unknown as TableRow<T>;
  } catch (err) {
    console.error(`Exception in createItem in ${tableName}:`, err instanceof Error ? err.message : String(err));
    if (err instanceof PostgrestError) throw err;
    throw new Error(`Failed to create item in ${tableName}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function updateItem<T extends TableName>(
  tableName: T,
  id: string,
  itemUpdates: TableUpdate<T>,
  options?: { select?: string; }
): Promise<TableRow<T> | null> {
  try {
    const supabase = getSupabaseTransactionClient();
    const { data, error } = await supabase
      .from(tableName)
      .update(itemUpdates as any)
      .eq('id' as any, id)
      .select(options?.select || "*")
      .single();

    if (error) {
      console.error(`Error updating item in ${tableName} (ID: ${id}):`, error.message);
      throw error;
    }
    queryCache.clear();
    return data as unknown as TableRow<T> | null;
  } catch (err) {
    console.error(`Exception in updateItem in ${tableName} (ID: ${id}):`, err instanceof Error ? err.message : String(err));
    if (err instanceof PostgrestError) throw err;
    throw new Error(`Failed to update item in ${tableName}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function deleteItem<T extends TableName>(
  tableName: T,
  id: string
): Promise<{ success: boolean; error?: PostgrestError }> {
  try {
    const supabase = getSupabaseTransactionClient();
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id' as any, id);

    if (error) {
      console.error(`Error deleting item from ${tableName} (ID: ${id}):`, error.message);
      return { success: false, error };
    }
    queryCache.clear();
    return { success: true };
  } catch (err) {
    const pgErr = err instanceof PostgrestError ? err : undefined;
    console.error(`Exception in deleteItem from ${tableName} (ID: ${id}):`, err instanceof Error ? err.message : String(err));
    return { success: false, error: pgErr };
  }
}

// Document (RAG) Specific Functions

type DocumentRow = Database['public']['Tables']['documents']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'];

export async function createDocument(
  documentData: Omit<DocumentInsert, 'embedding'>,
  embedding: number[]
): Promise<DocumentRow> {
  const documentToInsert: DocumentInsert = {
    ...documentData,
    embedding: `[${embedding.join(',')}]`,
  };
  return createItem('documents', documentToInsert);
}

export async function getDocumentById(id: string): Promise<DocumentRow | null> {
  return getItemById('documents', id);
}

export async function updateDocument(
  id: string,
  updates: Partial<Omit<DocumentInsert, 'embedding'>>,
  newEmbedding?: number[]
): Promise<DocumentRow | null> {
  const documentToUpdate: Partial<DocumentInsert> = { ...updates };
  if (newEmbedding) {
    documentToUpdate.embedding = `[${newEmbedding.join(',')}]`;
  }
  return updateItem('documents', id, documentToUpdate);
}

export async function deleteDocument(id: string): Promise<{ success: boolean; error?: PostgrestError }> {
  return deleteItem('documents', id);
}

export async function searchSimilarDocuments(
  queryEmbedding: number[],
  matchThreshold: number,
  matchCount: number,
  userId?: string,
  documentType?: string
): Promise<Array<Database['public']['Functions']['match_documents']['Returns'][0]>> {
  const effectiveCacheKey = `searchSimilarDocuments_${JSON.stringify(queryEmbedding)}_${matchThreshold}_${matchCount}_${userId}_${documentType}`;
  if (queryCache.has(effectiveCacheKey)) {
    cacheStats.hits++;
    return queryCache.get(effectiveCacheKey)!;
  }
  cacheStats.misses++;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: `[${queryEmbedding.join(',')}]` as any,
      match_threshold: matchThreshold,
      match_count: matchCount,
      p_user_id: userId,
      p_document_type: documentType,
    });

    if (error) {
      console.error('Error calling match_documents RPC:', error.message);
      throw error;
    }
    if (data) {
      queryCache.set(effectiveCacheKey, data, { ttl: 60000 });
      cacheStats.sets++;
    }
    return data || [];
  } catch (err) {
    cacheStats.errors++;
    console.error('Exception in searchSimilarDocuments:', err instanceof Error ? err.message : String(err));
    if (err instanceof PostgrestError) throw err;
    throw new Error(`Failed to search similar documents: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// MemoryThread and Message Specific Functions

type MemoryThreadRow = Database['public']['Tables']['memory_threads']['Row'];
type MemoryThreadInsert = Database['public']['Tables']['memory_threads']['Insert'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

export async function createMemoryThread(threadData: MemoryThreadInsert): Promise<MemoryThreadRow> {
  return createItem('memory_threads', threadData);
}

export async function getMemoryThreadById(id: string): Promise<MemoryThreadRow | null> {
  return getItemById('memory_threads', id);
}

export async function updateMemoryThread(id: string, updates: Partial<MemoryThreadInsert>): Promise<MemoryThreadRow | null> {
  return updateItem('memory_threads', id, updates);
}

export async function listMemoryThreads(userId?: string, agentId?: string, limit: number = 50, offset: number = 0): Promise<MemoryThreadRow[]> {
  const match: Partial<MemoryThreadRow> = {};
  if (userId) match.user_id = userId;
  if (agentId) match.agent_id = agentId;

  return getData('memory_threads', {
    match,
    limit,
    offset,
    orderBy: { column: 'updated_at', ascending: false }
  });
}

export async function deleteMemoryThread(id: string): Promise<{ success: boolean; error?: PostgrestError }> {
  return deleteItem('memory_threads', id);
}

export async function createMessage(messageData: MessageInsert): Promise<MessageRow> {
  return createItem('messages', messageData);
}

export async function getMessagesByThreadId(threadId: string, limit: number = 100, offset: number = 0, orderBy: { column: keyof MessageRow; ascending?: boolean } = { column: 'created_at', ascending: true }): Promise<MessageRow[]> {
  return getData('messages', {
    match: { thread_id: threadId } as Partial<MessageRow>,
    limit,
    offset,
    orderBy
  });
}

export async function deleteMessagesByThreadId(threadId: string): Promise<{ count: number; error?: PostgrestError }> {
  try {
    const supabase = getSupabaseTransactionClient();
    const { error, count } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .eq('thread_id', threadId);

    if (error) {
      console.error(`Error deleting messages for thread ${threadId}:`, error.message);
      return { count: 0, error };
    }
    queryCache.forEach((value, key) => {
      if (key.startsWith(`getData_messages_`)) {
        const matchPart = `"match":{"thread_id":"${threadId}"`;
        if (key.includes(matchPart)) {
          queryCache.delete(key);
        }
      }
    });
    return { count: count || 0, error: undefined };
  } catch (err: any) {
    console.error(`Exception in deleteMessagesByThreadId for thread ${threadId}:`, err);
    const pgError: PostgrestError = {
      name: 'PostgrestError',
      message: err.message || 'Unknown error during message deletion',
      details: typeof err.details === 'string' ? err.details : JSON.stringify(err.details) || '',
      hint: err.hint || '',
      code: err.code || 'EXCEPTION_DELETE_MSGS',
    };
    return { count: 0, error: pgError };
  }
}

export async function getRecentThreadsWithLastMessage(userId: string, limit: number = 10) {
  const db = getDrizzleClient();
  try {
    const latestMessageTimeCorrectedSq = db
      .select({
        thread_id: schema.messages.thread_id,
        last_message_at: sql<string>`MAX(${schema.messages.created_at})`.as('last_message_at'),
      })
      .from(schema.messages)
      .groupBy(schema.messages.thread_id)
      .as('latest_message_time_corrected_sq');

    const results = await db
      .with(latestMessageTimeCorrectedSq)
      .select({
        thread_id: schema.memory_threads.id,
        thread_name: schema.memory_threads.name,
        thread_updated_at: schema.memory_threads.updated_at,
        last_message_content: schema.messages.content,
        last_message_role: schema.messages.role,
        last_message_at: latestMessageTimeCorrectedSq.last_message_at,
      })
      .from(schema.memory_threads)
      .leftJoin(latestMessageTimeCorrectedSq, eq(schema.memory_threads.id, latestMessageTimeCorrectedSq.thread_id))
      .leftJoin(schema.messages, and(
        eq(schema.messages.thread_id, latestMessageTimeCorrectedSq.thread_id),
        eq(schema.messages.created_at, latestMessageTimeCorrectedSq.last_message_at)
      ))
      .where(eq(schema.memory_threads.user_id, userId))
      .orderBy(desc(latestMessageTimeCorrectedSq.last_message_at))
      .limit(limit);

    return results;

  } catch (error) {
    console.error("Error fetching recent threads with last message:", error);
    throw error;
  }
}
/**
 * Supabase Database Integration with Upstash Adapter Support
 *
 * This module provides database access through Supabase with the ability to
 * conditionally use Upstash Redis and Vector as a drop-in replacement.
 *
 * To use Upstash instead of Supabase, set the following environment variables:
 * - USE_UPSTASH_ADAPTER=true
 * - UPSTASH_REDIS_REST_URL=your_upstash_redis_url
 * - UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
 * - UPSTASH_VECTOR_REST_URL=your_upstash_vector_url (optional for vector operations)
 * - UPSTASH_VECTOR_REST_TOKEN=your_upstash_vector_token (optional for vector operations)
 *
 * The module automatically detects which client to use based on these environment variables.
 *
 * --- NOTE ---
 * This file is intended for server-side use only. Do not import it in browser/client code.
 * If you need to use these functions in the browser, move them to a /lib/shared/ or /lib/client/ folder and use dynamic import.
 */

import { SupabaseClient, createClient, PostgrestError } from '@supabase/supabase-js';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { LRUCache } from 'lru-cache';
import type { Database } from '@/types/supabase';
import * as schema from '@/db/supabase/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { z } from 'zod';

// Import Upstash adapter modules
import {
  createSupabaseClient,
  SupabaseClient as UpstashSupabaseClient
} from './upstash/supabase-adapter-factory';
import { getPrimaryKeyForTable } from './upstash/redis-store';
import { upstashLogger } from './upstash/upstash-logger';

// --- Upstash Client Utilities ---
// These are re-exported for use in supabase.ts and other modules
export { getRedisClient, getVectorClient, isUpstashRedisAvailable } from './upstash/upstashClients';
export {
  RedisConfigSchema,
  VectorConfigSchema,
  EnvVarsSchema,
  UpstashClientError,
  validateRedisConfig,
  validateVectorConfig,
  checkUpstashAvailability
} from './upstash/upstashClients';

// Define cache item type and client types
export type CacheItem = Record<string, unknown> | unknown[]; // Use precise type for cache items

// Type guard for client types
export type ClientType = SupabaseClient<Database> | UpstashSupabaseClient;

// Define error type
export const ErrorSchema = z.object({
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.string().optional(),
  hint: z.string().optional()
}).passthrough();
export type ErrorType = z.infer<typeof ErrorSchema>;

// Helper type guard for array
function isArrayOf<T>(val: unknown, predicate: (v: unknown) => v is T): val is T[] {
  return Array.isArray(val) && val.every(predicate);
}

// Singleton instances for connection reuse
let supabaseClientInstance: SupabaseClient<Database> | null = null;
let supabaseTransactionClientInstance: SupabaseClient<Database> | null = null;
let drizzleClientInstance: PostgresJsDatabase<typeof schema> | null = null;
let upstashSupabaseClientInstance: UpstashSupabaseClient | null = null;

/**
 * Determines if Upstash should be used as a Supabase replacement based on environment variables
 * @returns boolean indicating if Upstash should be used
 */
export const shouldUseUpstash = (): boolean => {
  return process.env.USE_UPSTASH_ADAPTER === 'true' &&
         process.env.UPSTASH_REDIS_REST_URL !== undefined &&
         process.env.UPSTASH_REDIS_REST_TOKEN !== undefined;
};

// Initialize LRU cache for database queries
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  errors: 0,
  evictions: 0,
};

const queryCache = new LRUCache<string, CacheItem>({
  max: 500,
  ttl: 1000 * 60 * 5,
  updateAgeOnGet: true,
  allowStale: false,
  dispose: (value: CacheItem, key: string, reason: LRUCache.DisposeReason) => {
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
  // Production logging: Supabase query cache cleared.
};

// Initialize Supabase client using session pooler
export const getSupabaseClient = (): SupabaseClient<Database> | UpstashSupabaseClient => {
  // Check if we should use Upstash adapter
  if (shouldUseUpstash()) {
    if (upstashSupabaseClientInstance) {
      return upstashSupabaseClientInstance;
    }

    try {
      // Production logging: Using Upstash adapter for Supabase client
      upstashSupabaseClientInstance = createSupabaseClient();
      return upstashSupabaseClientInstance;
    } catch (error) {
      // Production logging: Error creating Upstash adapter for Supabase
      throw error;
    }
  }

  // Use regular Supabase client
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  const supabaseUrl = process.env.SESSION_POOL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const errorMsg = "Supabase session client credentials not found. Ensure SESSION_POOL_URL (or NEXT_PUBLIC_SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.";
    // Production logging: errorMsg
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
    // Production logging: Error creating Supabase session client
    throw error;
  }
};

// Initialize Supabase transaction client
export const getSupabaseTransactionClient = (): SupabaseClient<Database> | UpstashSupabaseClient => {
  // Check if we should use Upstash adapter
  if (shouldUseUpstash()) {
    // For Upstash, we use the same client for both regular and transaction operations
    return getSupabaseClient();
  }

  // Use regular Supabase transaction client
  if (supabaseTransactionClientInstance) {
    return supabaseTransactionClientInstance;
  }

  const supabaseDirectUrl = process.env.DATABASE_URL;
  const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseDirectUrl || !supabaseServiceKey) {
    const errorMsg = "Supabase transaction client credentials not found. Ensure DATABASE_URL and NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY are set.";
    // Production logging: errorMsg
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
    // Production logging: Error creating Supabase transaction client
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
    // Production logging: errorMsg
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
    // Production logging: Error creating Drizzle client
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
  } catch (err: unknown) {
    // Production logging: Exception in logDatabaseConnection
    return null;
  }
}

/**
 * Type guard to check if a client is a Supabase client
 * @param client The client to check
 * @returns True if the client is a Supabase client
 */
export const isSupabaseClient = (client: ClientType): client is SupabaseClient<Database> => {
  return client && 'auth' in client && 'rpc' in client;
};

/**
 * Type guard to check if a client is an Upstash Supabase client
 * @param client The client to check
 * @returns True if the client is an Upstash Supabase client
 */
export const isUpstashClient = (client: ClientType): client is UpstashSupabaseClient => {
  return client && 'from' in client && 'vector' in client && !('auth' in client);
};

export const isSupabaseAvailable = async (): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();

    // Handle different client types
    if (isSupabaseClient(supabase)) {
      const { error } = await supabase.from('users').select('id', { count: 'exact', head: true });
      if (error) {
        return false;
      }
    } else if (isUpstashClient(supabase)) {
      // For Upstash, we'll just check if we can access the client
      const tableClient = supabase.from('users');
      await tableClient.getAll({ limit: 1 });
    }

    return true;
  } catch (err: unknown) {
    // Production logging: Error checking Supabase availability
    return false;
  }
};

// Helper to try Upstash first, then Supabase as backup
async function upstashFirst<T>(fnUpstash: () => Promise<T>, fnSupabase: () => Promise<T>): Promise<T> {
  try {
    return await fnUpstash();
  } catch (err: unknown) {
    // Production logging: [Upstash failed, falling back to Supabase]
    return await fnSupabase();
  }
}

// Generic CRUD Functions

export type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

export async function getData<T extends TableName>(
  tableName: T,
  options?: {
    select?: string;
    match?: Partial<TableRow<T>>;
    filters?: (query: ReturnType<SupabaseClient<Database>["from"]>) => ReturnType<SupabaseClient<Database>["from"]>;
    limit?: number;
    offset?: number;
    orderBy?: { column: keyof TableRow<T>; ascending?: boolean };
    cacheKey?: string;
    cacheTTL?: number;
  }
): Promise<Array<TableRow<T>>> {
  try {
    const client = getSupabaseClient();
    if (!isSupabaseClient(client)) {
      throw new Error('getData only supported for SupabaseClient. Use Upstash adapter for Upstash operations.');
    }
    let query = client.from(tableName).select(options?.select || "*");
    if (options?.match) {
      for (const [key, value] of Object.entries(options.match)) {
        query = query.eq(key as any, value as any);
      }
    }
    if (options?.filters) {
      query = options.filters(query);
    }
    if (options?.orderBy) {
      query = query.order(options.orderBy.column as string, { ascending: options.orderBy.ascending });
    }
    if (options?.limit !== undefined) {
      query = query.limit(options.limit);
    }
    if (options?.offset !== undefined) {
      query = query.range(options.offset, (options.offset || 0) + (options.limit || 0) - 1);
    }
    const { data, error } = await query;
    if (error) {
      await upstashLogger.error('supabase', 'Error in getData', error);
      throw error;
    }
    return (Array.isArray(data) ? data : []) as unknown as Array<TableRow<T>>;
  } catch (err) {
    await upstashLogger.error('supabase', 'Exception in getData', err instanceof Error ? err : { message: String(err) });
    throw err;
  }
}

export async function getItemById<T extends TableName>(
  tableName: T,
  id: string,
  options?: { select?: string; cacheKey?: string; cacheTTL?: number }
): Promise<TableRow<T> | null> {
  try {
    const client = getSupabaseClient();
    if (!isSupabaseClient(client)) {
      throw new Error('getItemById only supported for SupabaseClient. Use Upstash adapter for Upstash operations.');
    }
    const key = getPrimaryKeyForTable(tableName);
    if (Array.isArray(key)) {
      throw new Error("Composite primary keys not supported in getItemById. Use a custom query.");
    }
    let query = client.from(tableName).select(options?.select || "*");
    query = query.eq(key as any, id as any);
    const { data, error } = await query.single();
    if (error) {
      if (error.code === "PGRST116") return null;
      await upstashLogger.error('supabase', 'Error in getItemById', error);
      throw error;
    }
    return data as unknown as TableRow<T>;
  } catch (err) {
    await upstashLogger.error('supabase', 'Exception in getItemById', err instanceof Error ? err : { message: String(err) });
    throw err;
  }
}

export async function createItem<T extends TableName>(
  tableName: T,
  item: TableInsert<T>,
  options?: { select?: string }
): Promise<TableRow<T>> {
  try {
    const client = getSupabaseClient();
    if (!isSupabaseClient(client)) {
      throw new Error('createItem only supported for SupabaseClient. Use Upstash adapter for Upstash operations.');
    }
    const { data, error } = await client
      .from(tableName)
      .insert([item] as any)
      .select(options?.select || "*");
    if (error) {
      await upstashLogger.error('supabase', 'Error in createItem', error);
      throw error;
    }
    if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Insert failed");
    return data[0] as unknown as TableRow<T>;
  } catch (err) {
    await upstashLogger.error('supabase', 'Exception in createItem', err instanceof Error ? err : { message: String(err) });
    throw err;
  }
}

export async function updateItem<T extends TableName>(
  tableName: T,
  id: string,
  itemUpdates: TableUpdate<T>,
  options?: { select?: string }
): Promise<TableRow<T> | null> {
  try {
    const client = getSupabaseClient();
    if (!isSupabaseClient(client)) {
      throw new Error('updateItem only supported for SupabaseClient. Use Upstash adapter for Upstash operations.');
    }
    const key = getPrimaryKeyForTable(tableName);
    if (Array.isArray(key)) {
      throw new Error("Composite primary keys not supported in updateItem. Use a custom query.");
    }
    const { data, error } = await client
      .from(tableName)
      .update(itemUpdates as any)
      .eq(key as any, id as any)
      .select(options?.select || "*");
    if (error) {
      await upstashLogger.error('supabase', 'Error in updateItem', error);
      throw error;
    }
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data[0] as unknown as TableRow<T>;
  } catch (err) {
    await upstashLogger.error('supabase', 'Exception in updateItem', err instanceof Error ? err : { message: String(err) });
    throw err;
  }
}export async function deleteItem<T extends TableName>(  tableName: T,
  id: string
): Promise<{ success: boolean; error?: PostgrestError }> {
  try {
    const client = getSupabaseClient();
    if (!isSupabaseClient(client)) {
      throw new Error('deleteItem only supported for SupabaseClient. Use Upstash adapter for Upstash operations.');
    }
    const key = getPrimaryKeyForTable(tableName);
    if (Array.isArray(key)) {
      throw new Error("Composite primary keys not supported in deleteItem. Use a custom query.");
    }
    let query = client.from(tableName).delete();
    query = query.eq(key as any, id as any);
    const { error } = await query;
    if (error) {
      await upstashLogger.error('supabase', 'Error in deleteItem', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    await upstashLogger.error('supabase', 'Exception in deleteItem', err instanceof Error ? err : { message: String(err) });
    return { success: false, error: err as PostgrestError };
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
    const cachedData = queryCache.get(effectiveCacheKey);
    if (cachedData !== undefined && isArrayOf<Database['public']['Functions']['match_documents']['Returns'][0]>(cachedData, (item): item is Database['public']['Functions']['match_documents']['Returns'][0] => typeof item === 'object')) {
      return cachedData!;
    }
  }
  cacheStats.misses++;

  return upstashFirst(
    async () => {
      const client = getSupabaseClient();
      if (!isSupabaseClient(client)) throw new Error('Supabase not available');
      const result = await client.rpc('match_documents', {
        query_embedding: `[${queryEmbedding.join(',')}]` as string,
        match_threshold: matchThreshold,
        match_count: matchCount,
        p_user_id: userId,
        p_document_type: documentType,
      });
      if (result.error) throw result.error;
      const data = result.data || [];
      queryCache.set(effectiveCacheKey, data, { ttl: 60000 });
      cacheStats.sets++;
      return data || [];
    },    async () => {
      const client = getSupabaseClient();
      if (!isSupabaseClient(client)) throw new Error('Supabase not available');
      const result = await client.rpc('match_documents', {
        query_embedding: `[${queryEmbedding.join(',')}]` as string,
        match_threshold: matchThreshold,
        match_count: matchCount,
        p_user_id: userId,
        p_document_type: documentType,
      });
      if (result.error) throw result.error;
      const data = result.data || [];
      queryCache.set(effectiveCacheKey, data, { ttl: 60000 });
      cacheStats.sets++;
      return data || [];
    }
  );
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
    const client = getSupabaseTransactionClient();
    let count = 0;
    let error: unknown = null;

    return upstashFirst(
      async () => {
        const client = getSupabaseTransactionClient();
        if (!isUpstashClient(client)) throw new Error('Upstash not available');
        const tableClient = client.from('messages');
        const messages = await tableClient.filter('thread_id', 'eq', threadId).getAll();
        if (messages && messages.length > 0) {
          for (const message of messages) {
            await tableClient.delete(message.id);
            count++;
          }
        }
        queryCache.forEach((_, key) => {
          if (key.startsWith(`getData_messages_`)) {
            const matchPart = `"match":{"thread_id":"${threadId}"`;
            if (key.includes(matchPart)) {
              queryCache.delete(key);
            }
          }
        });
        return { count, error: undefined };
      },
      async () => {
        const client = getSupabaseTransactionClient();
        if (!isSupabaseClient(client)) throw new Error('Supabase not available');
        const result = await client
          .from('messages')
          .delete({ count: 'exact' })
          .eq('thread_id', threadId as keyof MessageRow);
        count = result.count || 0;
        error = result.error;
        if (error) throw error;
        queryCache.forEach((_, key) => {
          if (key.startsWith(`getData_messages_`)) {
            const matchPart = `"match":{"thread_id":"${threadId}"`;
            if (key.includes(matchPart)) {
              queryCache.delete(key);
            }
          }
        });
        return { count, error: undefined };
      }
    );
  } catch (err: unknown) {
    // Production logging: Exception in deleteMessagesByThreadId for thread
    const pgError: PostgrestError = {
      name: 'PostgrestError',
      message: (err as Error).message || 'Unknown error during message deletion',
      details: String((err as { details?: unknown }).details || ''),
      hint: String((err as { hint?: unknown }).hint || ''),
      code: String((err as { code?: unknown }).code || 'EXCEPTION_DELETE_MSGS'),
    };
    return { count: 0, error: pgError };
  }
}

export async function getRecentThreadsWithLastMessage(userId: string, limit: number = 10) {  const db = getDrizzleClient();
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
    // Production logging: Error fetching recent threads with last message
    throw error;
  }
}
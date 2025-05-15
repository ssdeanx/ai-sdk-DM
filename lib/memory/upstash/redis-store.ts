import { generateId } from 'ai';
import { getRedisClient, shouldFallbackToBackup, getUpstashQueryClient, runRediSearchHybridQuery, enqueueQStashTask, trackWorkflowNode } from './upstashClients';
import { Thread, Message, ThreadMetadata, RedisHashData, RedisStoreError, RediSearchHybridQuery, RediSearchHybridResult, QStashTaskPayload, WorkflowNode, UpstashEntityBase } from './upstashTypes';
import { logError } from './upstash-logger';
import { createItem, getItemById, updateItem, deleteItem, getData } from './supabase-adapter';
import { z } from 'zod';
import { Query } from '@upstash/query';

// --- Constants for Redis Keys ---
const THREAD_PREFIX = "thread:";
const THREADS_SET = "threads"; // Sorted set for all thread IDs, scored by last update timestamp
const THREAD_MESSAGES_SET_SUFFIX = ":messages"; // Set of message IDs for a thread
const MESSAGE_PREFIX = "message:";

// --- Logger-safe error helper ---
function toLoggerError(err: unknown): Error | { error: string } {
  if (err instanceof Error) return err;
  return { error: String(err) };
}

// Helper to prepare data for Redis (handles metadata stringification)
function prepareDataForRedis<T extends { metadata?: Record<string, unknown> | null }>(data: T): RedisHashData {
  const result: RedisHashData = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === 'metadata' && v != null) {
      result[k] = JSON.stringify(v);
    } else if (v !== undefined) {
      result[k] = v as string | number | boolean | null;
    }
  }
  return result;
}

// Helper to parse raw Redis data and metadata string into the target type
function parseRedisHashData<T extends { metadata?: Record<string, unknown> | null }>(rawData: RedisHashData | null): T | null {
  if (!rawData) return null;
  const parsed: Record<string, unknown> = { ...rawData };
  if (parsed.metadata && typeof parsed.metadata === 'string') {
    try { parsed.metadata = JSON.parse(parsed.metadata); } catch { parsed.metadata = null; }
  }
  return parsed as T;
}

// --- Thread Operations ---
export async function createRedisThread(
  name?: string | null,
  userId?: string | null,
  agentId?: string | null,
  initialMetadata?: ThreadMetadata | null
): Promise<Thread> {
  const redis = getRedisClient();
  const threadId = generateId();
  const now = new Date().toISOString();
  const thread: Thread = {
    id: threadId,
    name: name || '',
    user_id: userId || '',
    agent_id: agentId || '',
    metadata: initialMetadata || {},
    created_at: now,
    updated_at: now,
  };
  try {
    await redis.hset(`${THREAD_PREFIX}${threadId}`, prepareDataForRedis(thread));
    await redis.zadd(THREADS_SET, { score: Date.now(), member: threadId });
    return thread;
  } catch (err) {
    await logError('redis-store', 'Failed to create thread', toLoggerError(err));
    throw new RedisStoreError('Failed to create thread', err);
  }
}

export async function getRedisThreadById(threadId: string): Promise<Thread | null> {
  const redis = getRedisClient();
  try {
    const data = await redis.hgetall(`${THREAD_PREFIX}${threadId}`);
    return parseRedisHashData<Thread>(data as RedisHashData);
  } catch (err) {
    await logError('redis-store', 'Failed to get thread by id', toLoggerError(err));
    throw new RedisStoreError('Failed to get thread by id', err);
  }
}

export async function updateRedisThread(
  threadId: string,
  updates: Partial<Pick<Thread, 'name' | 'metadata' | 'user_id' | 'agent_id'>>
): Promise<Thread | null> {
  const redis = getRedisClient();
  try {
    const existing = await getRedisThreadById(threadId);
    if (!existing) return null;
    const updated: Thread = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await redis.hset(`${THREAD_PREFIX}${threadId}`, prepareDataForRedis(updated));
    await redis.zadd(THREADS_SET, { score: Date.now(), member: threadId });
    return updated;
  } catch (err) {
    await logError('redis-store', 'Failed to update thread', toLoggerError(err));
    throw new RedisStoreError('Failed to update thread', err);
  }
}

export async function listRedisThreads(
  limit: number = 10,
  offset: number = 0,
  userId?: string,
  agentId?: string
): Promise<Thread[]> {
  const redis = getRedisClient();
  try {
    const threadIds = (await redis.zrange(THREADS_SET, offset, offset + limit - 1, { rev: true })) as string[];
    const threads: Thread[] = [];
    for (const threadId of threadIds) {
      const thread = await getRedisThreadById(threadId);
      if (thread) {
        if ((userId && thread.user_id !== userId) || (agentId && thread.agent_id !== agentId)) continue;
        threads.push(thread);
      }
    }
    return threads;
  } catch (err) {
    await logError('redis-store', 'Failed to list threads', toLoggerError(err));
    throw new RedisStoreError('Failed to list threads', err);
  }
}

export async function deleteRedisThread(threadId: string): Promise<boolean> {
  const redis = getRedisClient();
  try {
    const messageIds = (await redis.smembers(`${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`)) as string[];
    for (const messageId of messageIds) {
      await redis.del(`${MESSAGE_PREFIX}${messageId}`);
    }
    await redis.del(`${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`);
    await redis.del(`${THREAD_PREFIX}${threadId}`);
    await redis.zrem(THREADS_SET, threadId);
    return true;
  } catch (err) {
    await logError('redis-store', 'Failed to delete thread', toLoggerError(err));
    throw new RedisStoreError('Failed to delete thread', err);
  }
}

// --- Message Operations ---
export async function createRedisMessage(
  threadId: string,
  messageData: Omit<Message, 'id' | 'thread_id' | 'created_at'>
): Promise<Message> {
  const redis = getRedisClient();
  const messageId = generateId();
  const now = new Date().toISOString();
  const message: Message = {
    id: messageId,
    thread_id: threadId,
    ...messageData,
    created_at: now,
  };
  try {
    await redis.hset(`${MESSAGE_PREFIX}${messageId}`, prepareDataForRedis(message));
    await redis.sadd(`${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`, messageId);
    await redis.hset(`${THREAD_PREFIX}${threadId}`, { updated_at: now });
    return message;
  } catch (err) {
    await logError('redis-store', 'Failed to create message', toLoggerError(err));
    throw new RedisStoreError('Failed to create message', err);
  }
}

export async function getRedisMessageById(messageId: string): Promise<Message | null> {
  const redis = getRedisClient();
  try {
    const data = await redis.hgetall(`${MESSAGE_PREFIX}${messageId}`);
    return parseRedisHashData<Message>(data as RedisHashData);
  } catch (err) {
    await logError('redis-store', 'Failed to get message by id', toLoggerError(err));
    throw new RedisStoreError('Failed to get message by id', err);
  }
}

export async function getRedisMessagesByThreadId(
  threadId: string,
  limit: number = 50,
  offset: number = 0,
  order: 'asc' | 'desc' = 'asc'
): Promise<Message[]> {
  const redis = getRedisClient();
  try {
    const messageIds = (await redis.smembers(`${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`)) as string[];
    const sorted = messageIds.slice();
    if (order === 'asc') sorted.sort();
    else sorted.sort().reverse();
    const paged = sorted.slice(offset, offset + limit);
    const messages: Message[] = [];
    for (const messageId of paged) {
      const msg = await getRedisMessageById(messageId);
      if (msg) messages.push(msg);
    }
    return messages;
  } catch (err) {
    await logError('redis-store', 'Failed to get messages by thread id', toLoggerError(err));
    throw new RedisStoreError('Failed to get messages by thread id', err);
  }
}

export async function deleteRedisMessage(
  threadId: string, 
  messageId: string
): Promise<boolean> {
  const redis = getRedisClient();
  try {
    await redis.del(`${MESSAGE_PREFIX}${messageId}`);
    await redis.srem(`${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`, messageId);
    return true;
  } catch (err) {
    await logError('redis-store', 'Failed to delete message', toLoggerError(err));
    throw new RedisStoreError('Failed to delete message', err);
  }
}

// --- Hybrid Search Example (Vector + Redis) ---
export async function hybridThreadSearch({
  query,
  limit = 10,
  userId,
  agentId,
  vectorSearchFn,
}: {
  query: string;
  limit?: number;
  userId?: string;
  agentId?: string;
  vectorSearchFn?: (q: string, l: number) => Promise<string[]>;
}): Promise<Thread[]> {
  try {
    let threadIds: string[] = [];
    if (vectorSearchFn) {
      threadIds = await vectorSearchFn(query, limit);
    }
    // Fallback: If no vector results, do a Redis search
    if (!threadIds.length) {
      const redis = getRedisClient();
      const allIds = (await redis.zrange(THREADS_SET, 0, -1, { rev: true })) as string[];
      threadIds = allIds.slice(0, limit);
    }
    const threads: Thread[] = [];
    for (const threadId of threadIds) {
      const thread = await getRedisThreadById(threadId);
      if (thread) {
        if ((userId && thread.user_id !== userId) || (agentId && thread.agent_id !== agentId)) continue;
        threads.push(thread);
      }
    }
    return threads;
  } catch (err) {
    await logError('redis-store', 'Failed hybrid thread search', toLoggerError(err));
    throw new RedisStoreError('Failed hybrid thread search', err);
  }
}

// --- Advanced RediSearch/Hybrid Search ---
export async function advancedThreadHybridSearch(query: RediSearchHybridQuery): Promise<RediSearchHybridResult[]> {
  try {
    const results = await runRediSearchHybridQuery(query);
    return results as RediSearchHybridResult[];
  } catch (err) {
    await logError('redis-store', 'Failed advanced hybrid search', toLoggerError(err));
    throw new RedisStoreError('Failed advanced hybrid search', err);
  }
}

// --- QStash/Workflow Integration Example ---
export async function enqueueThreadWorkflow(threadId: string, type: string, data: Record<string, unknown>) {
  const payload: QStashTaskPayload = {
    id: generateId(),
    type,
    data: { threadId, ...data },
    created_at: new Date().toISOString(),
    status: 'pending',
  };
  return enqueueQStashTask(payload);
}

export async function trackThreadWorkflowNode(node: WorkflowNode) {
  return trackWorkflowNode(node);
}

// --- Generic Entity CRUD ---
/**
 * Generic create for any entity type (Upstash-first, fallback to Supabase/LibSQL)
 */
export async function createRedisEntity<T extends { metadata?: Record<string, unknown> | null; id?: string }>(
  entityType: string,
  entity: T,
  schema?: z.ZodType<T>
): Promise<T> {
  try {
    if (schema) schema.parse(entity);
    const redis = getRedisClient();
    const id = entity.id || generateId();
    const key = `${entityType}:${id}`;
    await redis.hset(key, prepareDataForRedis({ ...entity, id }));
    await redis.sadd(`${entityType}:ids`, id);
    return { ...entity, id };
  } catch (err) {
    await logError('redis-store', `Failed to create entity: ${entityType}`, toLoggerError(err));
    if (shouldFallbackToBackup()) {
      // Fallback to Supabase/LibSQL
      return createItem(entityType, entity) as Promise<T>;
    }
    throw new RedisStoreError(`Failed to create entity: ${entityType}`, err);
  }
}

/**
 * Generic get by ID for any entity type
 */
export async function getRedisEntityById<T extends { metadata?: Record<string, unknown> | null }>(entityType: string, id: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const data = await redis.hgetall(`${entityType}:${id}`);
    return parseRedisHashData<T>(data as RedisHashData);
  } catch (err) {
    await logError('redis-store', `Failed to get entity by id: ${entityType}`, toLoggerError(err));
    if (shouldFallbackToBackup()) {
      return getItemById(entityType, id) as Promise<T | null>;
    }
    throw new RedisStoreError(`Failed to get entity by id: ${entityType}`, err);
  }
}

/**
 * Generic update for any entity type
 */
export async function updateRedisEntity<T extends { metadata?: Record<string, unknown> | null; id: string }>(entityType: string, id: string, updates: Partial<T>, schema?: z.ZodType<T>): Promise<T | null> {
  try {
    if (schema) schema.parse({ ...updates, id });
    const redis = getRedisClient();
    const key = `${entityType}:${id}`;
    const existing = await getRedisEntityById<T>(entityType, id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    await redis.hset(key, prepareDataForRedis(updated));
    return updated;
  } catch (err) {
    await logError('redis-store', `Failed to update entity: ${entityType}`, toLoggerError(err));
    if (shouldFallbackToBackup()) {
      return updateItem(entityType, id, updates) as Promise<T | null>;
    }
    throw new RedisStoreError(`Failed to update entity: ${entityType}`, err);
  }
}

/**
 * Generic delete for any entity type
 */
export async function deleteRedisEntity(entityType: string, id: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    await redis.del(`${entityType}:${id}`);
    await redis.srem(`${entityType}:ids`, id);
    return true;
  } catch (err) {
    await logError('redis-store', `Failed to delete entity: ${entityType}`, toLoggerError(err));
    if (shouldFallbackToBackup()) {
      return deleteItem(entityType, id);
    }
    throw new RedisStoreError(`Failed to delete entity: ${entityType}`, err);
  }
}

/**
 * Generic list/search for any entity type (with optional filters, order, pagination)
 */
export interface ListEntitiesOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  select?: string[];
}

export async function listRedisEntities<T extends { metadata?: Record<string, unknown> | null }>(
  entityType: string,
  options?: ListEntitiesOptions
): Promise<T[]> {
  try {
    const redis = getRedisClient();
    const ids = (await redis.smembers(`${entityType}:ids`)) as string[];
    const paged = ids.slice(options?.offset || 0, (options?.offset || 0) + (options?.limit || ids.length));
    const entities: T[] = [];
    for (const id of paged) {
      const entity = await getRedisEntityById<T>(entityType, id);
      if (entity) entities.push(entity);
    }
    // TODO: Add advanced filtering/order/select using @upstash/query if needed
    return entities;
  } catch (err) {
    await logError('redis-store', `Failed to list entities: ${entityType}`, toLoggerError(err));
    if (shouldFallbackToBackup()) {
      // Convert ListEntitiesOptions to QueryOptions for fallback
      const queryOptions = options
        ? {
            limit: options.limit,
            offset: options.offset,
            select: options.select,
            orderBy: options.orderBy,
            filters: options.filters
              ? Object.entries(options.filters).map(([field, value]) => ({ field, operator: 'eq', value }))
              : undefined,
          }
        : undefined;
      return getData(entityType, queryOptions) as Promise<T[]>;
    }
    throw new RedisStoreError(`Failed to list entities: ${entityType}`, err);
  }
}

// Example: Use pipelining for batch operations
export async function batchGetThreads(threadIds: string[]): Promise<(Thread | null)[]> {
  const redis = getRedisClient();
  const pipeline = redis.pipeline();
  for (const id of threadIds) {
    pipeline.hgetall(`${THREAD_PREFIX}${id}`);
  }
  const results = await pipeline.exec();
  return (results as [unknown, unknown][]).map((result, idx) => {
    const [err, data] = result;
    if (err) {
      logError('redis-store', 'Error in batchGetThreads', toLoggerError(err));
      return null;
    }
    try {
      return z.object({
        id: z.string(),
        name: z.string().optional(),
        user_id: z.string().optional(),
        agent_id: z.string().optional(),
        metadata: z.string().optional(),
      }).parse(data) as Thread;
    } catch (e) {
      logError('redis-store', 'Thread parse error', toLoggerError(e));
      return null;
    }
  });
}

// --- RediSearch: Advanced Query Support for API Integration ---
/**
 * Search threads by metadata using Redis and in-memory filtering.
 * This is robust and ready for API route integration (e.g. /api/threads/search).
 *
 * @param query - Metadata fields to match (e.g. { user_id: 'abc', agent_id: 'xyz' })
 * @param options - Optional limit, offset
 * @returns Array of matching Thread objects
 */
export async function searchThreadsByMetadata(
  query: Record<string, unknown>,
  options?: { limit?: number; offset?: number }
): Promise<Thread[]> {
  try {
    // Fetch all thread IDs from Redis
    const redis = getRedisClient();
    const threadIds = (await redis.zrange(THREADS_SET, 0, -1, { rev: true })) as string[];
    const threads: Thread[] = [];
    for (const threadId of threadIds) {
      const thread = await getRedisThreadById(threadId);
      if (!thread) continue;
      // Filter by query fields
      if (Object.entries(query).every(([k, v]) => thread[k as keyof Thread] === v)) {
        threads.push(thread);
      }
    }
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;
    return threads.slice(offset, offset + limit);
  } catch (err) {
    await logError('redis-store', 'Failed RediSearch query', toLoggerError(err));
    throw new RedisStoreError('Failed RediSearch query', err);
  }
}

import { generateId } from 'ai';
import { createItem, getItemById, updateItem, deleteItem, getData } from './supabase-adapter';
import { z } from 'zod';
import { logError } from './upstash-logger';

import {
  // Error classes
  RedisStoreError,
  // Zod schemas
  ThreadEntitySchema,
  MessageEntitySchema,
  AgentStateEntitySchema,
  ToolExecutionEntitySchema,
  WorkflowNodeEntitySchema,
  LogEntryEntitySchema,
  LogEntrySchema,
  AdvancedLogQueryOptionsSchema,
  AgentStateSchema,
  StoredAgentStateSchema,
  ThreadSearchResultSchema,
  MessageSearchResultSchema,
  // Types
  ThreadMetadata,
  Thread,
  Message,
  RedisHashData,
  RediSearchHybridQuery,
  RediSearchHybridResult,
  QStashTaskPayload,
  WorkflowNode,
  AgentState,
  ToolExecutionEntity,
  LogEntry,
  ListEntitiesOptions,
  UpstashEntityBase,
  UserEntity,
  WorkflowEntity,
  WorkflowNodeEntity,
  LogEntryEntity,
  AgentStateEntity,
  MessageEntity,
  ThreadEntity
} from './upstashTypes';

import {
  getRedisClient,
  runRediSearchHybridQuery,
  enqueueQStashTask,
  trackWorkflowNode,
  shouldFallbackToBackup
} from './upstashClients';

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
    const key = `${entityType}:${id}`;
    await redis.del(key);
    await redis.srem(`${entityType}:ids`, id);
    return true;
  } catch (err) {
    await logError('redis-store', `Failed to delete entity: ${entityType}`, toLoggerError(err));
    if (shouldFallbackToBackup()) {
      // Fallback to Supabase/LibSQL
      return deleteItem(entityType, id);
    }
    throw new RedisStoreError(`Failed to delete entity: ${entityType}`, err);
  }
}

/**
 * Generic list/search for any entity type (with optional filters, order, pagination)
 */
export interface ListEntitiesOptions {
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  select?: string[];
}

export async function listRedisEntities<T extends { metadata?: Record<string, unknown> | null }>(
  entityType: string,
  options?: ListEntitiesOptions
): Promise<T[]> {
  try {
    const redis = getRedisClient();
    const ids = await redis.smembers(`${entityType}:ids`);
    if (!ids || ids.length === 0) return [];
    const pipeline = redis.pipeline();
    for (const id of ids) {
      pipeline.hgetall(`${entityType}:${id}`);
    }
    const results = await pipeline.exec();
    let entities = (results as Array<Record<string, unknown> | null>).map((data) => {
      if (!data) return null;
      return parseRedisHashData<T>(data as RedisHashData);
    }).filter((e): e is T => !!e);
    // Apply filters, order, pagination, select
    if (options?.filters) entities = applyFilters(entities, options.filters);
    if (options?.orderBy) entities = applyOrdering(entities, options.orderBy);
    entities = applyPagination(entities, options?.limit, options?.offset);
    if (options?.select) entities = entities.map(e => selectFields(e, options.select) as T);
    return entities;
  } catch (err) {
    await logError('redis-store', `Failed to list entities: ${entityType}`, toLoggerError(err));
    if (shouldFallbackToBackup()) {
      // Fallback to Supabase/LibSQL
      return getData(entityType, options) as Promise<T[]>;
    }
    throw new RedisStoreError(`Failed to list entities: ${entityType}`, err);
  }
}

// Example: Use pipelining for batch operations
export async function batchGetThreads(threadIds: string[]): Promise<(Thread | null)[]> {
  try {
    const redis = getRedisClient();
    const pipeline = redis.pipeline();
    for (const threadId of threadIds) {
      pipeline.hgetall(`${THREAD_PREFIX}${threadId}`);
    }
    const results = await pipeline.exec();
    return (results as Array<Record<string, unknown> | null>).map((data) => {
      if (!data) return null;
      try {
        return parseRedisHashData<Thread>(data as RedisHashData);
      } catch (e) {
        logError('redis-store', 'Thread parse error', toLoggerError(e));
        return null;
      }
    });
  } catch (err) {
    await logError('redis-store', 'Error in batchGetThreads', toLoggerError(err));
    throw new RedisStoreError('Error in batchGetThreads', err);
  }
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
    const threads = await listRedisThreads(1000, 0); // Get all threads (or a large page)
    const matches = threads.filter(thread => {
      if (!thread.metadata) return false;
      return Object.entries(query).every(([k, v]) => {
        return thread.metadata && thread.metadata[k] === v;
      });
    });
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 10;
    return matches.slice(offset, offset + limit);
  } catch (err) {
    await logError('redis-store', 'Failed RediSearch query', toLoggerError(err));
    throw new RedisStoreError('Failed RediSearch query', err);
  }
}

// --- Helper functions for filtering, ordering, pagination, select ---
function applyFilters<T>(items: T[], filters?: Array<{ field: string; operator: string; value: unknown }>): T[] {
  if (!filters || filters.length === 0) return items;
  return items.filter(item => {
    return filters.every(filter => {
      const value = (item as Record<string, unknown>)[filter.field];
      switch (filter.operator) {
        case 'eq': return value === filter.value;
        case 'neq': return value !== filter.value;
        case 'gt': return typeof value === 'number' && typeof filter.value === 'number' && value > filter.value;
        case 'gte': return typeof value === 'number' && typeof filter.value === 'number' && value >= filter.value;
        case 'lt': return typeof value === 'number' && typeof filter.value === 'number' && value < filter.value;
        case 'lte': return typeof value === 'number' && typeof filter.value === 'number' && value <= filter.value;
        case 'like': return typeof value === 'string' && typeof filter.value === 'string' && value.includes(filter.value);
        case 'ilike': return typeof value === 'string' && typeof filter.value === 'string' && value.toLowerCase().includes(filter.value.toLowerCase());
        case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
        case 'is': return value === filter.value;
        default: return false;
      }
    });
  });
}

function applyOrdering<T>(items: T[], orderBy?: { column: string; ascending?: boolean }): T[] {
  if (!orderBy) return items;
  const { column, ascending = true } = orderBy;
  return [...items].sort((a, b) => {
    const aValue = (a as Record<string, unknown>)[column];
    const bValue = (b as Record<string, unknown>)[column];
    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return ascending ? 1 : -1;
    if (bValue === null || bValue === undefined) return ascending ? -1 : 1;
    if (ascending) return aValue > bValue ? 1 : -1;
    return aValue < bValue ? 1 : -1;
  });
}

function applyPagination<T>(items: T[], limit?: number, offset?: number): T[] {
  let result = items;
  if (offset !== undefined && offset > 0) result = result.slice(offset);
  if (limit !== undefined && limit > 0) result = result.slice(0, limit);
  return result;
}

function selectFields<T extends object>(item: T, select?: string[]): Partial<T> {
  if (!select || select.length === 0) return item;
  const result: Partial<T> = {};
  for (const field of select) {
    if (field in item) {
      result[field as keyof T] = item[field as keyof T];
    }
  }
  return result;
}

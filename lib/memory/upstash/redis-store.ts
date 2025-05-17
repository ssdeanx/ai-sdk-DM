import { generateId } from 'ai';
import {
  createItem,
  getItemById,
  updateItem,
  deleteItem,
  getData,
  applyFilters,
  applyOrdering,
  applyPagination,
  selectFields,
  type QueryOptions,
  type TableName,
  type TableRow,
  type TableInsert,
  type TableUpdate,
} from './supabase-adapter';
import { z } from 'zod';

import {
  UserEntity,
  WorkflowEntity,
  UserEntitySchema,
  WorkflowEntitySchema,
  ToolExecutionEntity,
  ToolExecutionEntitySchema,
  WorkflowNodeEntity,
  WorkflowNodeEntitySchema,
  LogEntryEntity,
  LogEntryEntitySchema,
  ListEntitiesOptions,
  RedisStoreError,
  Thread,
  Message,
  RedisHashData,
  ThreadMetadata,
  RediSearchHybridQuery,
  RediSearchHybridResult,
  QStashTaskPayload,
  WorkflowNode,
  SettingsEntity,
  SettingsEntitySchema,
  SystemMetricEntity,
  SystemMetricEntitySchema,
  TraceEntity,
  TraceEntitySchema,
  SpanEntity,
  SpanEntitySchema,
  EventEntity,
  EventEntitySchema,
  ProviderEntity,
  ProviderEntitySchema,
  ModelEntity,
  ModelEntitySchema,
  AuthProviderEntity,
  AuthProviderEntitySchema,
  DashboardConfigEntity,
  DashboardConfigEntitySchema,
} from './upstashTypes';

import {
  getRedisClient,
  runRediSearchHybridQuery,
  enqueueQStashTask,
  trackWorkflowNode,
  shouldFallbackToBackup,
} from './upstashClients';
import { logError } from './upstash-logger';

// --- Constants for Redis Keys ---
const THREAD_PREFIX = 'thread:';
const THREADS_SET = 'threads'; // Sorted set for all thread IDs, scored by last update timestamp
const THREAD_MESSAGES_SET_SUFFIX = ':messages'; // Set of message IDs for a thread
const MESSAGE_PREFIX = 'message:';

// --- Logger-safe error helper ---
function toLoggerError(err: unknown): Error | { error: string } {
  if (err instanceof Error) return err;
  return { error: String(err) };
}

// Helper to prepare data for Redis (handles metadata stringification)
function prepareDataForRedis<
  T extends { metadata?: Record<string, unknown> | null },
>(data: T): RedisHashData {
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

// Overload for generic objects without metadata
function prepareDataForRedisGeneric(data: object): RedisHashData {
  const result: RedisHashData = {};
  for (const [k, v] of Object.entries(data)) {
    result[k] = v as string | number | boolean | null;
  }
  return result;
}

// Helper to parse raw Redis data and metadata string into the target type
function parseRedisHashData<
  T extends { metadata?: Record<string, unknown> | null },
>(rawData: RedisHashData | null): T | null {
  if (!rawData) return null;
  const parsed: Record<string, unknown> = { ...rawData };
  if (parsed.metadata && typeof parsed.metadata === 'string') {
    try {
      parsed.metadata = JSON.parse(parsed.metadata);
    } catch {
      parsed.metadata = null;
    }
  }
  return parsed as T;
}

// Overload for generic objects without metadata
function parseRedisHashDataGeneric<T extends object>(
  rawData: RedisHashData | null
): T | null {
  if (!rawData) return null;
  return { ...rawData } as T;
}

// --- Primary Key Helper ---
/**
 * Returns the primary key field(s) for a given table/entity name.
 * For most entities, this is 'id', but for some (e.g. agent_tools, settings) it is a composite key.
 * Returns an array of key field names (for composite keys) or a single string for simple keys.
 */
export function getPrimaryKeyForTable(tableName: string): string | string[] {
  switch (tableName) {
    case 'agent_tools':
      return ['agent_id', 'tool_id'];
    case 'settings':
      return ['category', 'key'];
    default:
      return 'id';
  }
}

// --- TableName mapping and type guard ---
const upstashToSupabaseTable: Record<string, TableName> = {
  user: 'users',
  workflow: 'workflows',
  tool_execution: 'tools',
  workflow_node: 'workflow_steps',
  log_entry: 'events',
  settings: 'settings',
  system_metric: 'model_performance',
  trace: 'traces',
  span: 'spans',
  event: 'events',
  provider: 'agents',
  model: 'models',
  auth_provider: 'agent_personas',
  dashboard_config: 'documents',
};
export function getSupabaseTableName(
  entityType: string
): TableName | undefined {
  return upstashToSupabaseTable[entityType];
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
    await redis.hset(
      `${THREAD_PREFIX}${threadId}`,
      prepareDataForRedis(thread)
    );
    await redis.zadd(THREADS_SET, { score: Date.now(), member: threadId });
    return thread;
  } catch (err) {
    await logError(
      'redis-store',
      'Failed to create thread',
      toLoggerError(err)
    );
    throw new RedisStoreError('Failed to create thread', err);
  }
}

export async function getRedisThreadById(
  threadId: string
): Promise<Thread | null> {
  const redis = getRedisClient();
  try {
    const data = await redis.hgetall(`${THREAD_PREFIX}${threadId}`);
    return parseRedisHashData<Thread>(data as RedisHashData);
  } catch (err) {
    await logError(
      'redis-store',
      'Failed to get thread by id',
      toLoggerError(err)
    );
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
    await redis.hset(
      `${THREAD_PREFIX}${threadId}`,
      prepareDataForRedis(updated)
    );
    await redis.zadd(THREADS_SET, { score: Date.now(), member: threadId });
    return updated;
  } catch (err) {
    await logError(
      'redis-store',
      'Failed to update thread',
      toLoggerError(err)
    );
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
    const threadIds = (await redis.zrange(
      THREADS_SET,
      offset,
      offset + limit - 1,
      { rev: true }
    )) as string[];
    const threads: Thread[] = [];
    for (const threadId of threadIds) {
      const thread = await getRedisThreadById(threadId);
      if (thread) {
        if (
          (userId && thread.user_id !== userId) ||
          (agentId && thread.agent_id !== agentId)
        )
          continue;
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
    const messageIds = (await redis.smembers(
      `${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`
    )) as string[];
    for (const messageId of messageIds) {
      await redis.del(`${MESSAGE_PREFIX}${messageId}`);
    }
    await redis.del(`${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`);
    await redis.del(`${THREAD_PREFIX}${threadId}`);
    await redis.zrem(THREADS_SET, threadId);
    return true;
  } catch (err) {
    await logError(
      'redis-store',
      'Failed to delete thread',
      toLoggerError(err)
    );
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
    await redis.hset(
      `${MESSAGE_PREFIX}${messageId}`,
      prepareDataForRedis(message)
    );
    await redis.sadd(
      `${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`,
      messageId
    );
    await redis.hset(`${THREAD_PREFIX}${threadId}`, { updated_at: now });
    return message;
  } catch (err) {
    await logError(
      'redis-store',
      'Failed to create message',
      toLoggerError(err)
    );
    throw new RedisStoreError('Failed to create message', err);
  }
}

export async function getRedisMessageById(
  messageId: string
): Promise<Message | null> {
  const redis = getRedisClient();
  try {
    const data = await redis.hgetall(`${MESSAGE_PREFIX}${messageId}`);
    return parseRedisHashData<Message>(data as RedisHashData);
  } catch (err) {
    await logError(
      'redis-store',
      'Failed to get message by id',
      toLoggerError(err)
    );
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
    const messageIds = (await redis.smembers(
      `${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`
    )) as string[];
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
    await logError(
      'redis-store',
      'Failed to get messages by thread id',
      toLoggerError(err)
    );
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
    await redis.srem(
      `${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`,
      messageId
    );
    return true;
  } catch (err) {
    await logError(
      'redis-store',
      'Failed to delete message',
      toLoggerError(err)
    );
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
      const allIds = (await redis.zrange(THREADS_SET, 0, -1, {
        rev: true,
      })) as string[];
      threadIds = allIds.slice(0, limit);
    }
    const threads: Thread[] = [];
    for (const threadId of threadIds) {
      const thread = await getRedisThreadById(threadId);
      if (thread) {
        if (
          (userId && thread.user_id !== userId) ||
          (agentId && thread.agent_id !== agentId)
        )
          continue;
        threads.push(thread);
      }
    }
    return threads;
  } catch (err) {
    await logError(
      'redis-store',
      'Failed hybrid thread search',
      toLoggerError(err)
    );
    throw new RedisStoreError('Failed hybrid thread search', err);
  }
}

// --- Advanced RediSearch/Hybrid Search ---
export async function advancedThreadHybridSearch(
  query: RediSearchHybridQuery
): Promise<RediSearchHybridResult[]> {
  try {
    const results = await runRediSearchHybridQuery(query);
    return results as RediSearchHybridResult[];
  } catch (err) {
    await logError(
      'redis-store',
      'Failed advanced hybrid search',
      toLoggerError(err)
    );
    throw new RedisStoreError('Failed advanced hybrid search', err);
  }
}

// --- QStash/Workflow Integration Example ---
export async function enqueueThreadWorkflow(
  threadId: string,
  type: string,
  data: Record<string, unknown>
) {
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
export async function createRedisEntity<T extends object>(
  entityType: string,
  entity: T,
  schema?: z.ZodType<T>
): Promise<T> {
  try {
    if (schema) schema.parse(entity);
    const redis = getRedisClient();
    const id = (entity as { id?: string }).id || generateId();
    const key = `${entityType}:${id}`;
    // Use correct prepareDataForRedis overload
    const redisData =
      'metadata' in entity
        ? prepareDataForRedis(
            entity as { metadata?: Record<string, unknown> | null }
          )
        : prepareDataForRedisGeneric({ ...entity, id });
    await redis.hset(key, redisData);
    await redis.sadd(`${entityType}:ids`, id);
    return { ...entity, id };
  } catch (err) {
    await logError(
      'redis-store',
      `Failed to create entity: ${entityType}`,
      toLoggerError(err)
    );
    if (shouldFallbackToBackup()) {
      const supabaseTable = getSupabaseTableName(entityType);
      if (supabaseTable) {
        return createItem(
          supabaseTable,
          entity as TableInsert<typeof supabaseTable>
        ) as Promise<TableRow<typeof supabaseTable>> as unknown as Promise<T>;
      }
    }
    throw new RedisStoreError(`Failed to create entity: ${entityType}`, err);
  }
}

/**
 * Generic get by ID for any entity type
 */
export async function getRedisEntityById<T extends object>(
  entityType: string,
  id: string
): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const data = await redis.hgetall(`${entityType}:${id}`);
    return parseRedisHashData<T>(data as RedisHashData);
  } catch (err) {
    await logError(
      'redis-store',
      `Failed to get entity by id: ${entityType}`,
      toLoggerError(err)
    );
    if (shouldFallbackToBackup()) {
      const supabaseTable = getSupabaseTableName(entityType);
      if (supabaseTable) {
        return getItemById(supabaseTable, id) as Promise<TableRow<
          typeof supabaseTable
        > | null> as unknown as Promise<T | null>;
      }
    }
    throw new RedisStoreError(`Failed to get entity by id: ${entityType}`, err);
  }
}

/**
 * Generic update for any entity type
 */
export async function updateRedisEntity<T extends object>(
  entityType: string,
  id: string,
  updates: Partial<T>,
  schema?: z.ZodType<T>
): Promise<T | null> {
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
    await logError(
      'redis-store',
      `Failed to update entity: ${entityType}`,
      toLoggerError(err)
    );
    if (shouldFallbackToBackup()) {
      const supabaseTable = getSupabaseTableName(entityType);
      if (supabaseTable) {
        return updateItem(
          supabaseTable,
          id,
          updates as TableUpdate<typeof supabaseTable>
        ) as Promise<TableRow<
          typeof supabaseTable
        > | null> as unknown as Promise<T | null>;
      }
    }
    throw new RedisStoreError(`Failed to update entity: ${entityType}`, err);
  }
}

/**
 * Generic delete for any entity type
 */
export async function deleteRedisEntity(
  entityType: string,
  id: string
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const key = `${entityType}:${id}`;
    await redis.del(key);
    await redis.srem(`${entityType}:ids`, id);
    return true;
  } catch (err) {
    await logError(
      'redis-store',
      `Failed to delete entity: ${entityType}`,
      toLoggerError(err)
    );
    if (shouldFallbackToBackup()) {
      const supabaseTable = getSupabaseTableName(entityType);
      if (supabaseTable) {
        return deleteItem(supabaseTable, id);
      }
    }
    throw new RedisStoreError(`Failed to delete entity: ${entityType}`, err);
  }
}

/**
 * Generic list/search for any entity type (with optional filters, order, pagination)
 */
export async function listRedisEntities<T extends object>(
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
    let entities = (results as Array<Record<string, unknown> | null>)
      .map((data) => {
        if (!data) return null;
        return parseRedisHashData<T>(data as RedisHashData);
      })
      .filter((e): e is T => !!e);
    if (options?.filters) {
      const filterArray = Object.entries(options.filters).map(
        ([field, value]) => ({ field, operator: 'eq', value })
      );
      entities = applyFilters(entities, filterArray);
    }
    if (options?.sortBy) {
      entities = applyOrdering(entities, {
        column: options.sortBy,
        ascending: options.sortOrder !== 'DESC',
      });
    }
    entities = applyPagination(entities, options?.limit, options?.offset);
    if (options?.select)
      entities = entities.map((e) => selectFields(e, options.select) as T);
    return entities;
  } catch (err) {
    await logError(
      'redis-store',
      `Failed to list entities: ${entityType}`,
      toLoggerError(err)
    );
    if (shouldFallbackToBackup()) {
      const supabaseTable = getSupabaseTableName(entityType);
      if (supabaseTable) {
        // Map ListEntitiesOptions to QueryOptions for Supabase
        const queryOptions: QueryOptions = {
          select: options?.select,
          filters: options?.filters
            ? Object.entries(options.filters).map(([field, value]) => ({
                field,
                operator: 'eq',
                value,
              }))
            : undefined,
          orderBy: options?.sortBy
            ? {
                column: options.sortBy,
                ascending: options.sortOrder !== 'DESC',
              }
            : undefined,
          limit: options?.limit,
          offset: options?.offset,
        };
        return getData(supabaseTable, queryOptions) as Promise<
          TableRow<typeof supabaseTable>[]
        > as unknown as Promise<T[]>;
      }
    }
    throw new RedisStoreError(`Failed to list entities: ${entityType}`, err);
  }
}

// Example: Use pipelining for batch operations
export async function batchGetThreads(
  threadIds: string[]
): Promise<(Thread | null)[]> {
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
    await logError(
      'redis-store',
      'Error in batchGetThreads',
      toLoggerError(err)
    );
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
    const matches = threads.filter((thread) => {
      if (!thread.metadata) return false;
      return Object.entries(query).every(([k, v]) => {
        return thread.metadata && thread.metadata[k] === v;
      });
    });
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 10;
    return matches.slice(offset, offset + limit);
  } catch (err) {
    await logError(
      'redis-store',
      'Failed RediSearch query',
      toLoggerError(err)
    );
    throw new RedisStoreError('Failed RediSearch query', err);
  }
}

// --- Helper functions for filtering, ordering, pagination, select ---

// --- UserEntity CRUD ---
export async function createRedisUser(user: UserEntity): Promise<UserEntity> {
  return createRedisEntity<UserEntity>('user', user, UserEntitySchema);
}
export async function getRedisUserById(id: string): Promise<UserEntity | null> {
  return getRedisEntityById<UserEntity>('user', id);
}
export async function updateRedisUser(
  id: string,
  updates: Partial<UserEntity>
): Promise<UserEntity | null> {
  return updateRedisEntity<UserEntity>('user', id, updates, UserEntitySchema);
}
export async function deleteRedisUser(id: string): Promise<boolean> {
  return deleteRedisEntity('user', id);
}
export async function listRedisUsers(
  options?: ListEntitiesOptions
): Promise<UserEntity[]> {
  return listRedisEntities<UserEntity>('user', options);
}

// --- WorkflowEntity CRUD ---
export async function createRedisWorkflow(
  workflow: WorkflowEntity
): Promise<WorkflowEntity> {
  return createRedisEntity<WorkflowEntity>(
    'workflow',
    workflow,
    WorkflowEntitySchema
  );
}
export async function getRedisWorkflowById(
  id: string
): Promise<WorkflowEntity | null> {
  return getRedisEntityById<WorkflowEntity>('workflow', id);
}
export async function updateRedisWorkflow(
  id: string,
  updates: Partial<WorkflowEntity>
): Promise<WorkflowEntity | null> {
  return updateRedisEntity<WorkflowEntity>(
    'workflow',
    id,
    updates,
    WorkflowEntitySchema
  );
}
export async function deleteRedisWorkflow(id: string): Promise<boolean> {
  return deleteRedisEntity('workflow', id);
}
export async function listRedisWorkflows(
  options?: ListEntitiesOptions
): Promise<WorkflowEntity[]> {
  return listRedisEntities<WorkflowEntity>('workflow', options);
}

// --- ToolExecutionEntity CRUD ---
export async function createRedisToolExecution(
  exec: ToolExecutionEntity
): Promise<ToolExecutionEntity> {
  return createRedisEntity<ToolExecutionEntity>(
    'tool_execution',
    exec,
    ToolExecutionEntitySchema
  );
}
export async function getRedisToolExecutionById(
  id: string
): Promise<ToolExecutionEntity | null> {
  return getRedisEntityById<ToolExecutionEntity>('tool_execution', id);
}
export async function updateRedisToolExecution(
  id: string,
  updates: Partial<ToolExecutionEntity>
): Promise<ToolExecutionEntity | null> {
  return updateRedisEntity<ToolExecutionEntity>(
    'tool_execution',
    id,
    updates,
    ToolExecutionEntitySchema
  );
}
export async function deleteRedisToolExecution(id: string): Promise<boolean> {
  return deleteRedisEntity('tool_execution', id);
}
export async function listRedisToolExecutions(
  options?: ListEntitiesOptions
): Promise<ToolExecutionEntity[]> {
  return listRedisEntities<ToolExecutionEntity>('tool_execution', options);
}

// --- WorkflowNodeEntity CRUD ---
export async function createRedisWorkflowNode(
  node: WorkflowNodeEntity
): Promise<WorkflowNodeEntity> {
  return createRedisEntity<WorkflowNodeEntity>(
    'workflow_node',
    node,
    WorkflowNodeEntitySchema
  );
}
export async function getRedisWorkflowNodeById(
  id: string
): Promise<WorkflowNodeEntity | null> {
  return getRedisEntityById<WorkflowNodeEntity>('workflow_node', id);
}
export async function updateRedisWorkflowNode(
  id: string,
  updates: Partial<WorkflowNodeEntity>
): Promise<WorkflowNodeEntity | null> {
  return updateRedisEntity<WorkflowNodeEntity>(
    'workflow_node',
    id,
    updates,
    WorkflowNodeEntitySchema
  );
}
export async function deleteRedisWorkflowNode(id: string): Promise<boolean> {
  return deleteRedisEntity('workflow_node', id);
}
export async function listRedisWorkflowNodes(
  options?: ListEntitiesOptions
): Promise<WorkflowNodeEntity[]> {
  return listRedisEntities<WorkflowNodeEntity>('workflow_node', options);
}

// --- LogEntryEntity CRUD ---
export async function createRedisLogEntry(
  entry: LogEntryEntity
): Promise<LogEntryEntity> {
  return createRedisEntity<LogEntryEntity>(
    'log_entry',
    entry,
    LogEntryEntitySchema
  );
}
export async function getRedisLogEntryById(
  id: string
): Promise<LogEntryEntity | null> {
  return getRedisEntityById<LogEntryEntity>('log_entry', id);
}
export async function updateRedisLogEntry(
  id: string,
  updates: Partial<LogEntryEntity>
): Promise<LogEntryEntity | null> {
  return updateRedisEntity<LogEntryEntity>(
    'log_entry',
    id,
    updates,
    LogEntryEntitySchema
  );
}
export async function deleteRedisLogEntry(id: string): Promise<boolean> {
  return deleteRedisEntity('log_entry', id);
}
export async function listRedisLogEntries(
  options?: ListEntitiesOptions
): Promise<LogEntryEntity[]> {
  return listRedisEntities<LogEntryEntity>('log_entry', options);
}

// --- SettingsEntity CRUD ---
export async function createRedisSettings(
  settings: SettingsEntity
): Promise<SettingsEntity> {
  return createRedisEntity<SettingsEntity>(
    'settings',
    settings,
    SettingsEntitySchema
  );
}
export async function getRedisSettingsById(
  id: string
): Promise<SettingsEntity | null> {
  return getRedisEntityById<SettingsEntity>('settings', id);
}
export async function updateRedisSettings(
  id: string,
  updates: Partial<SettingsEntity>
): Promise<SettingsEntity | null> {
  return updateRedisEntity<SettingsEntity>(
    'settings',
    id,
    updates,
    SettingsEntitySchema
  );
}
export async function deleteRedisSettings(id: string): Promise<boolean> {
  return deleteRedisEntity('settings', id);
}
export async function listRedisSettings(
  options?: ListEntitiesOptions
): Promise<SettingsEntity[]> {
  return listRedisEntities<SettingsEntity>('settings', options);
}

// --- SystemMetricEntity CRUD ---
export async function createRedisSystemMetric(
  metric: SystemMetricEntity
): Promise<SystemMetricEntity> {
  return createRedisEntity<SystemMetricEntity>(
    'system_metric',
    metric,
    SystemMetricEntitySchema
  );
}
export async function getRedisSystemMetricById(
  id: string
): Promise<SystemMetricEntity | null> {
  return getRedisEntityById<SystemMetricEntity>('system_metric', id);
}
export async function updateRedisSystemMetric(
  id: string,
  updates: Partial<SystemMetricEntity>
): Promise<SystemMetricEntity | null> {
  return updateRedisEntity<SystemMetricEntity>(
    'system_metric',
    id,
    updates,
    SystemMetricEntitySchema
  );
}
export async function deleteRedisSystemMetric(id: string): Promise<boolean> {
  return deleteRedisEntity('system_metric', id);
}
export async function listRedisSystemMetrics(
  options?: ListEntitiesOptions
): Promise<SystemMetricEntity[]> {
  return listRedisEntities<SystemMetricEntity>('system_metric', options);
}

// --- TraceEntity CRUD ---
export async function createRedisTrace(
  trace: TraceEntity
): Promise<TraceEntity> {
  return createRedisEntity<TraceEntity>('trace', trace, TraceEntitySchema);
}
export async function getRedisTraceById(
  id: string
): Promise<TraceEntity | null> {
  return getRedisEntityById<TraceEntity>('trace', id);
}
export async function updateRedisTrace(
  id: string,
  updates: Partial<TraceEntity>
): Promise<TraceEntity | null> {
  return updateRedisEntity<TraceEntity>(
    'trace',
    id,
    updates,
    TraceEntitySchema
  );
}
export async function deleteRedisTrace(id: string): Promise<boolean> {
  return deleteRedisEntity('trace', id);
}
export async function listRedisTraces(
  options?: ListEntitiesOptions
): Promise<TraceEntity[]> {
  return listRedisEntities<TraceEntity>('trace', options);
}

// --- SpanEntity CRUD ---
export async function createRedisSpan(span: SpanEntity): Promise<SpanEntity> {
  return createRedisEntity<SpanEntity>('span', span, SpanEntitySchema);
}
export async function getRedisSpanById(id: string): Promise<SpanEntity | null> {
  return getRedisEntityById<SpanEntity>('span', id);
}
export async function updateRedisSpan(
  id: string,
  updates: Partial<SpanEntity>
): Promise<SpanEntity | null> {
  return updateRedisEntity<SpanEntity>('span', id, updates, SpanEntitySchema);
}
export async function deleteRedisSpan(id: string): Promise<boolean> {
  return deleteRedisEntity('span', id);
}
export async function listRedisSpans(
  options?: ListEntitiesOptions
): Promise<SpanEntity[]> {
  return listRedisEntities<SpanEntity>('span', options);
}

// --- EventEntity CRUD ---
export async function createRedisEvent(
  event: EventEntity
): Promise<EventEntity> {
  return createRedisEntity<EventEntity>('event', event, EventEntitySchema);
}
export async function getRedisEventById(
  id: string
): Promise<EventEntity | null> {
  return getRedisEntityById<EventEntity>('event', id);
}
export async function updateRedisEvent(
  id: string,
  updates: Partial<EventEntity>
): Promise<EventEntity | null> {
  return updateRedisEntity<EventEntity>(
    'event',
    id,
    updates,
    EventEntitySchema
  );
}
export async function deleteRedisEvent(id: string): Promise<boolean> {
  return deleteRedisEntity('event', id);
}
export async function listRedisEvents(
  options?: ListEntitiesOptions
): Promise<EventEntity[]> {
  return listRedisEntities<EventEntity>('event', options);
}

// --- ProviderEntity CRUD ---
export async function createRedisProvider(
  provider: ProviderEntity
): Promise<ProviderEntity> {
  return createRedisEntity<ProviderEntity>(
    'provider',
    provider,
    ProviderEntitySchema
  );
}
export async function getRedisProviderById(
  id: string
): Promise<ProviderEntity | null> {
  return getRedisEntityById<ProviderEntity>('provider', id);
}
export async function updateRedisProvider(
  id: string,
  updates: Partial<ProviderEntity>
): Promise<ProviderEntity | null> {
  return updateRedisEntity<ProviderEntity>(
    'provider',
    id,
    updates,
    ProviderEntitySchema
  );
}
export async function deleteRedisProvider(id: string): Promise<boolean> {
  return deleteRedisEntity('provider', id);
}
export async function listRedisProviders(
  options?: ListEntitiesOptions
): Promise<ProviderEntity[]> {
  return listRedisEntities<ProviderEntity>('provider', options);
}

// --- ModelEntity CRUD ---
export async function createRedisModel(
  model: ModelEntity
): Promise<ModelEntity> {
  return createRedisEntity<ModelEntity>('model', model, ModelEntitySchema);
}
export async function getRedisModelById(
  id: string
): Promise<ModelEntity | null> {
  return getRedisEntityById<ModelEntity>('model', id);
}
export async function updateRedisModel(
  id: string,
  updates: Partial<ModelEntity>
): Promise<ModelEntity | null> {
  return updateRedisEntity<ModelEntity>(
    'model',
    id,
    updates,
    ModelEntitySchema
  );
}
export async function deleteRedisModel(id: string): Promise<boolean> {
  return deleteRedisEntity('model', id);
}
export async function listRedisModels(
  options?: ListEntitiesOptions
): Promise<ModelEntity[]> {
  return listRedisEntities<ModelEntity>('model', options);
}

// --- AuthProviderEntity CRUD ---
export async function createRedisAuthProvider(
  authProvider: AuthProviderEntity
): Promise<AuthProviderEntity> {
  return createRedisEntity<AuthProviderEntity>(
    'auth_provider',
    authProvider,
    AuthProviderEntitySchema
  );
}
export async function getRedisAuthProviderById(
  id: string
): Promise<AuthProviderEntity | null> {
  return getRedisEntityById<AuthProviderEntity>('auth_provider', id);
}
export async function updateRedisAuthProvider(
  id: string,
  updates: Partial<AuthProviderEntity>
): Promise<AuthProviderEntity | null> {
  return updateRedisEntity<AuthProviderEntity>(
    'auth_provider',
    id,
    updates,
    AuthProviderEntitySchema
  );
}
export async function deleteRedisAuthProvider(id: string): Promise<boolean> {
  return deleteRedisEntity('auth_provider', id);
}
export async function listRedisAuthProviders(
  options?: ListEntitiesOptions
): Promise<AuthProviderEntity[]> {
  return listRedisEntities<AuthProviderEntity>('auth_provider', options);
}

// --- DashboardConfigEntity CRUD ---
export async function createRedisDashboardConfig(
  config: DashboardConfigEntity
): Promise<DashboardConfigEntity> {
  return createRedisEntity<DashboardConfigEntity>(
    'dashboard_config',
    config,
    DashboardConfigEntitySchema
  );
}
export async function getRedisDashboardConfigById(
  id: string
): Promise<DashboardConfigEntity | null> {
  return getRedisEntityById<DashboardConfigEntity>('dashboard_config', id);
}
export async function updateRedisDashboardConfig(
  id: string,
  updates: Partial<DashboardConfigEntity>
): Promise<DashboardConfigEntity | null> {
  return updateRedisEntity<DashboardConfigEntity>(
    'dashboard_config',
    id,
    updates,
    DashboardConfigEntitySchema
  );
}
export async function deleteRedisDashboardConfig(id: string): Promise<boolean> {
  return deleteRedisEntity('dashboard_config', id);
}
export async function listRedisDashboardConfigs(
  options?: ListEntitiesOptions
): Promise<DashboardConfigEntity[]> {
  return listRedisEntities<DashboardConfigEntity>('dashboard_config', options);
}

export type { Thread, Message, ThreadMetadata, ListEntitiesOptions };
export { RedisStoreError };

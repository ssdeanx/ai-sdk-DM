import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from './upstashClients';
import { upstashLogger } from './upstash-logger';
import { Mutex } from 'async-mutex';

// --- Constants for Redis Keys ---
const THREAD_PREFIX = "thread:";
const THREADS_SET = "threads"; // Sorted set for all thread IDs, scored by last update timestamp
const THREAD_MESSAGES_SET_SUFFIX = ":messages"; // Sorted set of message IDs for a thread, scored by creation timestamp
const MESSAGE_PREFIX = "message:";

// --- Types ---
export type ThreadMetadata = Record<string, unknown>;

export interface MessageMetadata {
  [key: string]: unknown;
  tool_calls?: Record<string, unknown>;
  tool_invocation_id?: string;
}

export interface Thread {
  id: string;
  name?: string | null;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  user_id?: string | null;
  agent_id?: string | null;
  metadata?: ThreadMetadata | null;
}

export interface Message {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string; // ISO 8601 timestamp
  metadata?: MessageMetadata | null;
  name?: string; // Optional name, e.g., for tool calls/results
}

type RedisHashData = Record<string, string | number | boolean | null>;

// --- Error Handling ---
export class RedisStoreError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "RedisStoreError";
    Object.setPrototypeOf(this, RedisStoreError.prototype);
  }
}

// --- Logger-safe error helper ---
function toLoggerError(err: unknown): Error | { error: string } {
  if (err instanceof Error) return err;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return { error: String((err as { message: unknown }).message) };
  }
  return { error: JSON.stringify(err) };
}

// Helper to prepare data for Redis (handles metadata stringification)
function prepareDataForRedis<T extends { metadata?: Record<string, unknown> | null }>(data: T): Record<string, string | number | boolean> {
  const dataForRedis: Record<string, string | number | boolean> = {};
  for (const key in data) {
    if (key === 'metadata') {
      if (data.metadata && typeof data.metadata === 'object') {
        dataForRedis.metadata = JSON.stringify(data.metadata);
      } else if (data.metadata === null) {
        dataForRedis.metadata = 'null';
      }
      // skip undefined
    } else {
      const value = data[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        dataForRedis[key] = value;
      } else if (value === null) {
        dataForRedis[key] = 'null';
      } else if (typeof value !== 'undefined') {
        dataForRedis[key] = JSON.stringify(value);
      }
    }
  }
  return dataForRedis;
}

// Helper to parse raw Redis data and metadata string into the target type
function parseRedisHashData<T extends { metadata?: Record<string, unknown> | null }>(
  rawData: RedisHashData | null
): T | null {
  if (!rawData || Object.keys(rawData).length === 0) {
    return null;
  }

  const result: Record<string, unknown> = {};
  for (const key in rawData) {
    const value = rawData[key];
    if (typeof value === 'string') {
      if (value === "true") {
        result[key] = true;
      } else if (value === "false") {
        result[key] = false;
      } else if (value === "null") {
        result[key] = null;
      } else if (!isNaN(Number(value)) && value.trim() !== '') {
        result[key] = Number(value);
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  if (result.metadata && typeof result.metadata === 'string') {
    try {
      if (result.metadata === 'null') {
        result.metadata = null;
      } else {
        result.metadata = JSON.parse(result.metadata as string);
      }
    } catch (e) {
      upstashLogger.warn('redis-store', `Failed to parse metadata string: '${result.metadata}'`, { error: e });
    }
  }
  return result as T;
}

// --- Thread Operations ---
export async function createRedisThread(
  name?: string | null,
  userId?: string | null,
  agentId?: string | null,
  initialMetadata?: ThreadMetadata | null
): Promise<Thread> {
  return withObservability('createRedisThread', async () => {
    const redis = getRedisClient();
    const threadId = uuidv4();
    const now = new Date().toISOString();
    const nowTimestamp = Date.parse(now);

    const thread: Thread = {
      id: threadId,
      name,
      created_at: now,
      updated_at: now,
      user_id: userId,
      agent_id: agentId,
      metadata: initialMetadata,
    };

    try {
      const threadDataForRedis = prepareDataForRedis(thread);
      const pipeline = redis.pipeline();
      pipeline.hset(`${THREAD_PREFIX}${threadId}`, threadDataForRedis);
      pipeline.zadd(THREADS_SET, { score: nowTimestamp, member: threadId });
      await pipeline.exec();
      return thread;
    } catch (error: unknown) {
      await upstashLogger.error('redis-store', 'Failed to create thread', toLoggerError(error));
      throw new RedisStoreError('Failed to create thread', error);
    }
  });
}

export async function getRedisThreadById(threadId: string): Promise<Thread | null> {
  return withObservability('getRedisThreadById', async () => {
    const redis = getRedisClient();
    try {
      const rawData = await redis.hgetall(`${THREAD_PREFIX}${threadId}`);
      return parseRedisHashData<Thread>(rawData as RedisHashData | null);
    } catch (error: unknown) {
      await upstashLogger.error('redis-store', `Failed to retrieve thread ${threadId}`, toLoggerError(error));
      throw new RedisStoreError(`Failed to retrieve thread ${threadId}`, error);
    }
  });
}

export async function updateRedisThread(
  threadId: string,
  updates: Partial<Pick<Thread, 'name' | 'metadata' | 'user_id' | 'agent_id'>>
): Promise<Thread | null> {
  return withObservability('updateRedisThread', async () => {
    const redis = getRedisClient();
    const now = new Date().toISOString();
    const nowTimestamp = Date.parse(now);
    const threadKey = `${THREAD_PREFIX}${threadId}`;

    try {
      const exists = await redis.exists(threadKey);
      if (!exists) {
        await upstashLogger.warn('redis-store', `Thread with ID ${threadId} not found for update.`);
        return null;
      }

      const updatesForRedis: Record<string, string | number | boolean> = {};
      for (const key in updates) {
        const value = updates[key as keyof typeof updates];
        if (key === 'metadata') {
          if (value && typeof value === 'object') {
            updatesForRedis.metadata = JSON.stringify(value);
          } else if (value === null) {
            updatesForRedis.metadata = 'null';
          }
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          updatesForRedis[key] = value;
        } else if (value === null) {
          updatesForRedis[key] = 'null';
        } else if (typeof value !== 'undefined') {
          updatesForRedis[key] = JSON.stringify(value);
        }
      }
      updatesForRedis.updated_at = now;

      if (Object.keys(updatesForRedis).length > 0) {
        const pipeline = redis.pipeline();
        pipeline.hset(threadKey, updatesForRedis);
        pipeline.zadd(THREADS_SET, { score: nowTimestamp, member: threadId });
        await pipeline.exec();
      } else {
        await redis.zadd(THREADS_SET, { score: nowTimestamp, member: threadId });
      }

      return getRedisThreadById(threadId);
    } catch (error: unknown) {
      await upstashLogger.error('redis-store', `Failed to update thread ${threadId}`, toLoggerError(error));
      throw new RedisStoreError(`Failed to update thread ${threadId}`, error);
    }
  });
}

export async function listRedisThreads(
  limit: number = 10,
  offset: number = 0,
  userId?: string,
  agentId?: string
): Promise<Thread[]> {
  return withObservability('listRedisThreads', async () => {
    const redis = getRedisClient();
    try {
      const threadIds = await redis.zrange(THREADS_SET, offset, offset + limit - 1, { rev: true });
      if (!threadIds || threadIds.length === 0) {
        return [];
      }

      const threads: Thread[] = [];
      const pipeline = redis.pipeline();
      threadIds.forEach((id) => pipeline.hgetall(`${THREAD_PREFIX}${id}`));
      const results = await pipeline.exec<Array<RedisHashData | null>>();

      for (const rawData of results) {
        const threadData = parseRedisHashData<Thread>(rawData as RedisHashData | null);
        if (threadData) {
          if (userId && threadData.user_id !== userId) continue;
          if (agentId && threadData.agent_id !== agentId) continue;
          threads.push(threadData);
        }
      }
      return threads;
    } catch (error: unknown) {
      await upstashLogger.error('redis-store', 'Failed to list threads', toLoggerError(error));
      throw new RedisStoreError('Failed to list threads', error);
    }
  });
}

export async function deleteRedisThread(threadId: string): Promise<boolean> {
  return withObservability('deleteRedisThread', async () => {
    const redis = getRedisClient();
    const threadKey = `${THREAD_PREFIX}${threadId}`;
    const messagesKey = `${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`;

    try {
      const messageIds = await redis.zrange(messagesKey, 0, -1);

      const pipeline = redis.pipeline();
      if (messageIds && messageIds.length > 0) {
        messageIds.forEach((msgId) => pipeline.del(`${MESSAGE_PREFIX}${msgId}`));
      }
      pipeline.del(messagesKey);
      pipeline.del(threadKey);
      pipeline.zrem(THREADS_SET, threadId);

      const results = await pipeline.exec<number[]>();
      return results.every(result => typeof result === 'number');
    } catch (error: unknown) {
      await upstashLogger.error('redis-store', `Failed to delete thread ${threadId}`, toLoggerError(error));
      throw new RedisStoreError(`Failed to delete thread ${threadId}`, error);
    }
  });
}

// --- Message Operations ---
export async function createRedisMessage(
  threadId: string,
  messageData: Omit<Message, 'id' | 'thread_id' | 'created_at'>
): Promise<Message> {
  const redis = getRedisClient();
  const messageId = uuidv4();
  const now = new Date().toISOString();
  const nowTimestamp = Date.parse(now);

  const threadKey = `${THREAD_PREFIX}${threadId}`;
  const messagesKey = `${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`;

  const message: Message = {
    id: messageId,
    thread_id: threadId,
    ...messageData,
    created_at: now,
  };

  try {
    const threadExists = await redis.exists(threadKey);
    if (!threadExists) {
      throw new RedisStoreError(`Thread with ID ${threadId} not found. Cannot save message.`);
    }

    const messageDataForRedis = prepareDataForRedis(message);

    const pipeline = redis.pipeline();
    pipeline.hset(`${MESSAGE_PREFIX}${messageId}`, messageDataForRedis);
    pipeline.zadd(messagesKey, { score: nowTimestamp, member: messageId });
    pipeline.hset(threadKey, { updated_at: now });
    pipeline.zadd(THREADS_SET, { score: nowTimestamp, member: threadId });
    await pipeline.exec();

    return message;
  } catch (error: unknown) {
    await upstashLogger.error('redis-store', `Failed to save message to thread ${threadId}`, toLoggerError(error));
    throw new RedisStoreError(`Failed to save message to thread ${threadId}`, error);
  }
}

export async function getRedisMessageById(messageId: string): Promise<Message | null> {
  return withObservability('getRedisMessageById', async () => {
    const redis = getRedisClient();
    try {
      const rawData = await redis.hgetall(`${MESSAGE_PREFIX}${messageId}`);
      return parseRedisHashData<Message>(rawData as RedisHashData | null);
    } catch (error: unknown) {
      await upstashLogger.error('redis-store', `Failed to retrieve message ${messageId}`, toLoggerError(error));
      throw new RedisStoreError(`Failed to retrieve message ${messageId}`, error);
    }
  });
}

export async function getRedisMessagesByThreadId(
  threadId: string,
  limit: number = 50,
  offset: number = 0,
  order: 'asc' | 'desc' = 'asc'
): Promise<Message[]> {
  return withObservability('getRedisMessagesByThreadId', async () => {
    const redis = getRedisClient();
    const messagesKey = `${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`;

    try {
      let messageIds: string[];
      if (order === 'asc') {
        messageIds = await redis.zrange(messagesKey, offset, offset + limit - 1);
      } else {
        messageIds = await redis.zrange(messagesKey, offset, offset + limit - 1, { rev: true });
      }

      if (!messageIds || messageIds.length === 0) {
        return [];
      }

      const pipeline = redis.pipeline();
      messageIds.forEach((id) => pipeline.hgetall(`${MESSAGE_PREFIX}${id}`));
      const results = await pipeline.exec<Array<RedisHashData | null>>();

      const messages: Message[] = [];
      for (const rawData of results) {
        const messageData = parseRedisHashData<Message>(rawData as RedisHashData | null);
        if (messageData) {
          messages.push(messageData);
        }
      }
      return messages;
    } catch (error: unknown) {
      await upstashLogger.error('redis-store', `Failed to retrieve messages for thread ${threadId}`, toLoggerError(error));
      throw new RedisStoreError(`Failed to retrieve messages for thread ${threadId}`, error);
    }
  });
}

export async function deleteRedisMessage(
  threadId: string, 
  messageId: string
): Promise<boolean> {
  return withObservability('deleteRedisMessage', async () => {
    const redis = getRedisClient();
    const messagesKey = `${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`;
    const messageKey = `${MESSAGE_PREFIX}${messageId}`;

    try {
      const pipeline = redis.pipeline();
      pipeline.del(messageKey);
      pipeline.zrem(messagesKey, messageId);
      
      const results = await pipeline.exec<number[]>();
      return results.every(result => typeof result === 'number');
    } catch (error: unknown) {
      await upstashLogger.error('redis-store', `Failed to delete message ${messageId} from thread ${threadId}`, toLoggerError(error));
      throw new RedisStoreError(`Failed to delete message ${messageId}`, error);
    }
  });
}

// --- Advanced Upstash Query Integration and Observability ---
function getUpstashQueryClient() {
  return getRedisClient();
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
  const redis = getRedisClient();
  const vectorThreadIds: string[] = [];
  const threadIds: string[] = [];

  // 1. Vector search (if provided)
  if (vectorSearchFn) {
    try {
      vectorThreadIds.push(...await vectorSearchFn(query, limit));
    } catch (err: unknown) {
      await upstashLogger.warn('redis-store', 'Vector search failed', { error: toLoggerError(err).toString() });
    }
  }

  // 2. Redis full-text/hybrid search (using RediSearch FT.SEARCH via .ft.search)
  try {
    // @upstash/redis supports .ft.search if RediSearch is enabled
    // See: https://github.com/upstash/upstash-redis#redisearch
    // FT.SEARCH idx:threads <query> LIMIT 0 <limit> RETURN 1 id
    // @ts-expect-error: ft may not be typed in upstash/redis, but is present if RediSearch is enabled
    const searchRes = await (redis as any).ft.search(
      'idx:threads',
      query,
      {
        LIMIT: { from: 0, size: limit },
        RETURN: ['id'],
      }
    );
    if (searchRes && Array.isArray(searchRes.documents)) {
      for (const doc of searchRes.documents) {
        if (doc && typeof doc === 'object' && 'id' in doc) {
          threadIds.push(doc.id as string);
        }
      }
    }
  } catch (err: unknown) {
    await upstashLogger.warn('redis-store', 'Upstash FT.SEARCH failed', { error: toLoggerError(err).toString() });
  }

  // 3. Merge and dedupe thread IDs
  const allThreadIds = Array.from(new Set([...vectorThreadIds, ...threadIds]));
  if (allThreadIds.length === 0) return [];

  // 4. Fetch threads and filter by user/agent if needed
  const pipeline = redis.pipeline();
  allThreadIds.forEach((id) => pipeline.hgetall(`${THREAD_PREFIX}${id}`));
  const results = await pipeline.exec<Array<RedisHashData | null>>();
  const threads: Thread[] = [];
  for (const rawData of results) {
    const threadData = parseRedisHashData<Thread>(rawData as RedisHashData | null);
    if (threadData) {
      if (userId && threadData.user_id !== userId) continue;
      if (agentId && threadData.agent_id !== agentId) continue;
      threads.push(threadData);
    }
  }
  return threads.slice(0, limit);
}

// --- Observability/Concurrency Hooks Example ---
async function withObservability<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    await upstashLogger.info('redis-store', `${operation} succeeded`, { durationMs: Date.now() - start });
    return result;
  } catch (error: unknown) {
    await upstashLogger.error('redis-store', `${operation} failed`, toLoggerError(error));
    throw error;
  }
}

// --- Concurrency Control Example (Mutex) ---
const threadMutexes = new Map<string, Mutex>();
function getThreadMutex(threadId: string): Mutex {
  if (!threadMutexes.has(threadId)) {
    threadMutexes.set(threadId, new Mutex());
  }
  return threadMutexes.get(threadId)!;
}

// --- Export helpers for wiring ---
export {
  getRedisClient,
  getUpstashQueryClient,
  withObservability,
  getThreadMutex,
};

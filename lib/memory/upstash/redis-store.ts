import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from './upstashClients';
import type { Redis } from '@upstash/redis';

// --- Constants for Redis Keys ---
const THREAD_PREFIX = "thread:";
const THREADS_SET = "threads"; // Sorted set for all thread IDs, scored by last update timestamp
const THREAD_MESSAGES_SET_SUFFIX = ":messages"; // Sorted set of message IDs for a thread, scored by creation timestamp
const MESSAGE_PREFIX = "message:";

// --- Types ---
export interface ThreadMetadata {
  [key: string]: any;
}

export interface MessageMetadata {
  [key: string]: any;
  tool_calls?: any;
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

// Type for raw data from Redis hgetall, where values are typically strings.
type RedisHashData = Record<string, string | number | boolean | null>;

// --- Error Handling ---
export class RedisStoreError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "RedisStoreError";
    Object.setPrototypeOf(this, RedisStoreError.prototype);
  }
}

// Helper to prepare data for Redis (handles metadata stringification)
function prepareDataForRedis<T extends { metadata?: any }>(data: T): Record<string, string | number | boolean> {
  const dataForRedis: Record<string, any> = { ...data };
  if (data.metadata && typeof data.metadata === 'object') {
    dataForRedis.metadata = JSON.stringify(data.metadata);
  } else if (data.metadata === null) {
    dataForRedis.metadata = 'null'; // Store null as the string "null"
  } else if (typeof data.metadata === 'undefined') {
    delete dataForRedis.metadata; // Do not store undefined fields
  }
  // Ensure all other fields are primitives that hset can handle directly
  for (const key in dataForRedis) {
    if (typeof dataForRedis[key] === 'object' && dataForRedis[key] !== null && key !== 'metadata') {
      // This case should ideally not happen if types are correct, but as a safeguard:
      console.warn(`RedisStore: Field '${key}' is an object but not metadata. Stringifying.`);
      dataForRedis[key] = JSON.stringify(dataForRedis[key]);
    }
  }
  return dataForRedis as Record<string, string | number | boolean>;
}

// Helper to parse raw Redis data and metadata string into the target type
function parseRedisHashData<T extends { metadata?: any }>(
  rawData: RedisHashData | null
): T | null {
  if (!rawData || Object.keys(rawData).length === 0) {
    return null;
  }

  const result: { [key: string]: any } = {};
  for (const key in rawData) {
    // Attempt to parse numbers and booleans that might have been stored as strings
    const value = rawData[key];
    if (typeof value === 'string') {
      if (value === "true") {
        result[key] = true;
      } else if (value === "false") {
        result[key] = false;
      } else if (value === "null") {
        result[key] = null;
      } else if (!isNaN(Number(value)) && value.trim() !== '') {
         // Check if it's a number, but avoid converting empty strings or only whitespace to 0
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
        result.metadata = JSON.parse(result.metadata);
      }
    } catch (e) {
      console.warn(`RedisStore: Failed to parse metadata string: '${result.metadata}'`, e);
      // Keep as string or assign error state if preferred
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
  } catch (error) {
    console.error("RedisStore Error (createRedisThread):", error);
    throw new RedisStoreError("Failed to create thread", error);
  }
}

export async function getRedisThreadById(threadId: string): Promise<Thread | null> {
  const redis = getRedisClient();
  try {
    const rawData = await redis.hgetall(`${THREAD_PREFIX}${threadId}`);
    return parseRedisHashData<Thread>(rawData as RedisHashData | null);
  } catch (error) {
    console.error(`RedisStore Error (getRedisThreadById: ${threadId}):`, error);
    throw new RedisStoreError(`Failed to retrieve thread ${threadId}`, error);
  }
}

export async function updateRedisThread(
  threadId: string,
  updates: Partial<Pick<Thread, 'name' | 'metadata' | 'user_id' | 'agent_id'>>
): Promise<Thread | null> {
  const redis = getRedisClient();
  const now = new Date().toISOString();
  const nowTimestamp = Date.parse(now);
  const threadKey = `${THREAD_PREFIX}${threadId}`;

  try {
    const exists = await redis.exists(threadKey);
    if (!exists) {
      console.warn(`RedisStore: Thread with ID ${threadId} not found for update.`);
      return null;
    }

    const updatesForRedis: Record<string, any> = { ...updates, updated_at: now };
    if (updates.hasOwnProperty('metadata')) {
      if (updates.metadata && typeof updates.metadata === 'object') {
        updatesForRedis.metadata = JSON.stringify(updates.metadata);
      } else if (updates.metadata === null) {
        updatesForRedis.metadata = 'null';
      } else if (typeof updates.metadata === 'undefined') {
        delete updatesForRedis.metadata;
      }
    }
    
    Object.keys(updatesForRedis).forEach(key => {
        if (updatesForRedis[key] === undefined) {
            delete updatesForRedis[key];
        }
    });

    if (Object.keys(updatesForRedis).length > 0) {
        const pipeline = redis.pipeline();
        pipeline.hset(threadKey, updatesForRedis);
        pipeline.zadd(THREADS_SET, { score: nowTimestamp, member: threadId });
        await pipeline.exec();
    } else {
        await redis.zadd(THREADS_SET, { score: nowTimestamp, member: threadId });
    }

    return getRedisThreadById(threadId);
  } catch (error) {
    console.error(`RedisStore Error (updateRedisThread: ${threadId}):`, error);
    if (error instanceof RedisStoreError) throw error;
    throw new RedisStoreError(`Failed to update thread ${threadId}`, error);
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
    const threadIds = await redis.zrange(THREADS_SET, offset, offset + limit - 1, { rev: true });
    if (!threadIds || threadIds.length === 0) {
      return [];
    }

    const threads: Thread[] = [];
    const pipeline = redis.pipeline();
    threadIds.forEach((id: unknown) => pipeline.hgetall(`${THREAD_PREFIX}${String(id)}`));    const results = await pipeline.exec<Array<Record<string, any> | null>>();

    for (const rawData of results) {
      const threadData = parseRedisHashData<Thread>(rawData as RedisHashData | null);
      if (threadData) {
        if (userId && threadData.user_id !== userId) continue;
        if (agentId && threadData.agent_id !== agentId) continue;
        threads.push(threadData);
      }
    }
    return threads;
  } catch (error) {
    console.error("RedisStore Error (listRedisThreads):", error);
    throw new RedisStoreError("Failed to list threads", error);
  }
}

export async function deleteRedisThread(threadId: string): Promise<boolean> {
  const redis = getRedisClient();
  const threadKey = `${THREAD_PREFIX}${threadId}`;
  const messagesKey = `${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`;

  try {
    const messageIds = await redis.zrange(messagesKey, 0, -1);

    const pipeline = redis.pipeline();
    if (messageIds && messageIds.length > 0) {
      messageIds.forEach((msgId: unknown) => pipeline.del(`${MESSAGE_PREFIX}${String(msgId)}`));    }
    pipeline.del(messagesKey);
    pipeline.del(threadKey);
    pipeline.zrem(THREADS_SET, threadId);

    const results = await pipeline.exec<number[]>();
    return results.every(result => typeof result === 'number');
  } catch (error) {
    console.error(`RedisStore Error (deleteRedisThread: ${threadId}):`, error);
    throw new RedisStoreError(`Failed to delete thread ${threadId}`, error);
  }
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
  } catch (error) {
    console.error(`RedisStore Error (createRedisMessage for thread ${threadId}):`, error);
    if (error instanceof RedisStoreError) throw error;
    throw new RedisStoreError(`Failed to save message to thread ${threadId}`, error);
  }
}

export async function getRedisMessageById(messageId: string): Promise<Message | null> {
  const redis = getRedisClient();
  try {
    const rawData = await redis.hgetall(`${MESSAGE_PREFIX}${messageId}`);
    return parseRedisHashData<Message>(rawData as RedisHashData | null);
  } catch (error) {
    console.error(`RedisStore Error (getRedisMessageById: ${messageId}):`, error);
    throw new RedisStoreError(`Failed to retrieve message ${messageId}`, error);
  }
}

export async function getRedisMessagesByThreadId(
  threadId: string,
  limit: number = 50,
  offset: number = 0,
  order: 'asc' | 'desc' = 'asc'
): Promise<Message[]> {
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
    messageIds.forEach((id: string) => pipeline.hgetall(`${MESSAGE_PREFIX}${id}`));
    const results = await pipeline.exec<Array<Record<string, any> | null>>();

    const messages: Message[] = [];
    for (const rawData of results) {
      const messageData = parseRedisHashData<Message>(rawData as RedisHashData | null);
      if (messageData) {
        messages.push(messageData);
      }
    }
    return messages;
  } catch (error) {
    console.error(`RedisStore Error (getRedisMessagesByThreadId for thread ${threadId}):`, error);
    throw new RedisStoreError(`Failed to retrieve messages for thread ${threadId}`, error);
  }
}

export async function deleteRedisMessage(
  threadId: string, 
  messageId: string
): Promise<boolean> {
  const redis = getRedisClient();
  const messagesKey = `${THREAD_PREFIX}${threadId}${THREAD_MESSAGES_SET_SUFFIX}`;
  const messageKey = `${MESSAGE_PREFIX}${messageId}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.del(messageKey);
    pipeline.zrem(messagesKey, messageId);
    
    const results = await pipeline.exec<number[]>();
    return results.every(result => typeof result === 'number');
  } catch (error) {
    console.error(`RedisStore Error (deleteRedisMessage ${messageId} from thread ${threadId}):`, error);
    throw new RedisStoreError(`Failed to delete message ${messageId}`, error);
  }
}

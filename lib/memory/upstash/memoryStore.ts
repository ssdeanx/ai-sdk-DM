import {
  Thread,
  ThreadMetadata,
  Message,
  MessageMetadata,
} from '../../shared/types/upstashTypes';
import { generateId } from 'ai';
import { getRedisClient } from './upstashClients';
import { upstashLogger } from './upstash-logger';

// --- Provider selection helper ---
function getMemoryProvider(): 'upstash' | 'supabase' | 'libsql' {
  return (
    (process.env.MEMORY_PROVIDER as 'upstash' | 'supabase' | 'libsql') ||
    'upstash'
  );
}

// --- Error handling helper ---
function toLoggerError(err: unknown): Error | { error: string } {
  if (err instanceof Error) return err;
  return { error: String(err) };
}

// --- Thread operations ---
/**
 * Create a thread in the configured memory provider (Upstash, Supabase, or LibSQL).
 * @param name Thread name
 * @param metadata Optional thread metadata
 * @returns Thread ID
 */
export async function createThread(
  name: string,
  metadata: ThreadMetadata = {}
): Promise<string> {
  const provider = getMemoryProvider();
  const now = new Date().toISOString();
  try {
    if (provider === 'upstash') {
      const redis = getRedisClient();
      const threadId = generateId();
      const thread: Thread = {
        id: threadId,
        name,
        metadata,
        created_at: now,
        updated_at: now,
      };
      await redis.hset(`thread:${threadId}`, { ...thread });
      await redis.zadd('threads', { score: Date.now(), member: threadId });
      return threadId;
    } else if (provider === 'supabase') {
      throw new Error('Supabase thread creation not yet implemented');
    } else if (provider === 'libsql') {
      throw new Error('LibSQL thread creation not yet implemented');
    }
    throw new Error('Unknown memory provider');
  } catch (err) {
    await upstashLogger.error(
      'memoryStore',
      'Failed to create thread',
      toLoggerError(err)
    );
    throw err;
  }
}

/**
 * Get a thread by ID from the configured memory provider.
 * @param threadId Thread ID
 * @returns Thread object or null
 */
export async function getThread(threadId: string): Promise<Thread | null> {
  const provider = getMemoryProvider();
  try {
    if (provider === 'upstash') {
      const redis = getRedisClient();
      const thread = await redis.hgetall(`thread:${threadId}`);
      if (thread && Object.keys(thread).length > 0) {
        const result: Partial<Thread> = { ...thread };
        if (typeof result.metadata === 'string') {
          try {
            result.metadata = JSON.parse(result.metadata);
          } catch {
            result.metadata = {};
          }
        }
        return result as Thread;
      }
      return null;
    } else if (provider === 'supabase') {
      throw new Error('Supabase getThread not yet implemented');
    } else if (provider === 'libsql') {
      throw new Error('LibSQL getThread not yet implemented');
    }
    throw new Error('Unknown memory provider');
  } catch (err) {
    await upstashLogger.error(
      'memoryStore',
      'Failed to get thread',
      toLoggerError(err)
    );
    throw err;
  }
}

/**
 * List threads with pagination and optional filters.
 * @param limit Max number of threads
 * @param offset Offset for pagination
 * @returns Array of Thread objects
 */
export async function listThreads(limit = 10, offset = 0): Promise<Thread[]> {
  const provider = getMemoryProvider();
  try {
    if (provider === 'upstash') {
      const redis = getRedisClient();
      const threadIds = await redis.zrange(
        'threads',
        offset,
        offset + limit - 1,
        { rev: true }
      );
      const threads: Thread[] = [];
      for (const threadId of threadIds) {
        const thread = await getThread(threadId as string);
        if (thread) threads.push(thread);
      }
      return threads;
    } else if (provider === 'supabase') {
      throw new Error('Supabase listThreads not yet implemented');
    } else if (provider === 'libsql') {
      throw new Error('LibSQL listThreads not yet implemented');
    }
    throw new Error('Unknown memory provider');
  } catch (err) {
    await upstashLogger.error(
      'memoryStore',
      'Failed to list threads',
      toLoggerError(err)
    );
    throw err;
  }
}

/**
 * Delete a thread and all its messages.
 * @param threadId Thread ID
 * @returns True if deleted
 */
export async function deleteThread(threadId: string): Promise<boolean> {
  const provider = getMemoryProvider();
  try {
    if (provider === 'upstash') {
      const redis = getRedisClient();
      const messageIds = await redis.smembers(`thread:${threadId}:messages`);
      for (const messageId of messageIds) {
        await redis.del(`message:${messageId}`);
      }
      await redis.del(`thread:${threadId}:messages`);
      await redis.del(`thread:${threadId}`);
      await redis.zrem('threads', threadId);
      return true;
    } else if (provider === 'supabase') {
      throw new Error('Supabase deleteThread not yet implemented');
    } else if (provider === 'libsql') {
      throw new Error('LibSQL deleteThread not yet implemented');
    }
    throw new Error('Unknown memory provider');
  } catch (err) {
    await upstashLogger.error(
      'memoryStore',
      'Failed to delete thread',
      toLoggerError(err)
    );
    throw err;
  }
}

/**
 * Save a message to a thread in the configured memory provider.
 * @param threadId Thread ID
 * @param message Message object (role, content, metadata, name)
 * @returns Message ID
 */
export async function saveMessage(
  threadId: string,
  message: {
    role: Message['role'];
    content: string;
    metadata?: MessageMetadata;
    name?: string;
  }
): Promise<string> {
  const provider = getMemoryProvider();
  const now = new Date().toISOString();
  try {
    if (provider === 'upstash') {
      const redis = getRedisClient();
      const messageId = generateId();
      const messageData: Message = {
        id: messageId,
        thread_id: threadId,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
        name: message.name,
        created_at: now,
      };
      // Convert metadata to string for Redis
      const redisData = {
        ...messageData,
        metadata: JSON.stringify(messageData.metadata),
      };
      await redis.hset(`message:${messageId}`, redisData);
      await redis.sadd(`thread:${threadId}:messages`, messageId);
      await redis.hset(`thread:${threadId}`, { updated_at: now });
      await redis.zadd('threads', { score: Date.now(), member: threadId });
      return messageId;
    } else if (provider === 'supabase') {
      throw new Error('Supabase saveMessage not yet implemented');
    } else if (provider === 'libsql') {
      throw new Error('LibSQL saveMessage not yet implemented');
    }
    throw new Error('Unknown memory provider');
  } catch (err) {
    await upstashLogger.error(
      'memoryStore',
      'Failed to save message',
      toLoggerError(err)
    );
    throw err;
  }
}

/**
 * Get all messages for a thread from the configured memory provider.
 * @param threadId Thread ID
 * @returns Array of Message objects
 */
export async function getMessages(threadId: string): Promise<Message[]> {
  const provider = getMemoryProvider();
  try {
    if (provider === 'upstash') {
      const redis = getRedisClient();
      const messageIds = await redis.smembers(`thread:${threadId}:messages`);
      const messages: Message[] = [];
      for (const messageId of messageIds) {
        const msg = await redis.hgetall(`message:${messageId}`);
        if (msg) {
          // Use a type-safe conversion for Redis message to Message
          const safeMsg: Partial<Message> = { ...msg };
          if (safeMsg.metadata && typeof safeMsg.metadata === 'string') {
            try {
              safeMsg.metadata = JSON.parse(safeMsg.metadata);
            } catch {
              safeMsg.metadata = {};
            }
          }
          // Only push if all required fields are present
          if (
            safeMsg.id &&
            safeMsg.thread_id &&
            safeMsg.role &&
            safeMsg.content &&
            safeMsg.created_at
          ) {
            messages.push(safeMsg as Message);
          }
        }
      }
      // Sort by created_at
      return messages.sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aTime - bTime;
      });
    } else if (provider === 'supabase') {
      throw new Error('Supabase getMessages not yet implemented');
    } else if (provider === 'libsql') {
      throw new Error('LibSQL getMessages not yet implemented');
    }
    throw new Error('Unknown memory provider');
  } catch (err) {
    await upstashLogger.error(
      'memoryStore',
      'Failed to get messages',
      toLoggerError(err)
    );
    throw err;
  }
}

/**
 * Delete a message by ID from the configured memory provider.
 * @param threadId Thread ID
 * @param messageId Message ID
 * @returns True if deleted
 */
export async function deleteMessage(
  threadId: string,
  messageId: string
): Promise<boolean> {
  const provider = getMemoryProvider();
  try {
    if (provider === 'upstash') {
      const redis = getRedisClient();
      await redis.del(`message:${messageId}`);
      await redis.srem(`thread:${threadId}:messages`, messageId);
      return true;
    } else if (provider === 'supabase') {
      throw new Error('Supabase deleteMessage not yet implemented');
    } else if (provider === 'libsql') {
      throw new Error('LibSQL deleteMessage not yet implemented');
    }
    throw new Error('Unknown memory provider');
  } catch (err) {
    await upstashLogger.error(
      'memoryStore',
      'Failed to delete message',
      toLoggerError(err)
    );
    throw err;
  }
}

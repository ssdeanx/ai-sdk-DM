import { generateId } from 'ai';
import { RediSearchHybridQuery, QStashTaskPayload, WorkflowNode } from './upstashTypes';
import {
  getRedisClient,
  getVectorClient,
  runRediSearchHybridQuery,
  enqueueQStashTask,
  trackWorkflowNode
} from './upstashClients';

// Check if Upstash is available
export const isUpstashAvailable = async (): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    await redis.ping();
    return true;
  } catch {
    // Use robust error handling, do not use console
    return false;
  }
};

// Thread operations
export async function createThread(name: string, metadata: Record<string, unknown> = {}): Promise<string> {
  const redis = getRedisClient();
  const threadId = generateId();
  const now = new Date().toISOString();

  const thread = {
    id: threadId,
    name,
    metadata,
    created_at: now,
    updated_at: now,
  };

  await redis.hset(`thread:${threadId}`, thread);
  await redis.zadd('threads', { score: Date.now(), member: threadId });

  return threadId;
}

export async function getThread(threadId: string): Promise<Record<string, unknown> | null> {
  const redis = getRedisClient();
  const thread = await redis.hgetall(`thread:${threadId}`);
  return thread && Object.keys(thread).length > 0 ? thread : null;
}

export async function listThreads(limit = 10, offset = 0): Promise<Record<string, unknown>[]> {
  const redis = getRedisClient();
  const threadIds = await redis.zrange('threads', offset, offset + limit - 1, { rev: true });

  const threads: Record<string, unknown>[] = [];
  for (const threadId of threadIds) {
    const thread = await getThread(threadId as string);
    if (thread) threads.push(thread);
  }

  return threads;
}

export async function deleteThread(threadId: string): Promise<boolean> {
  const redis = getRedisClient();

  // Get all message IDs for this thread
  const messageIds = await redis.smembers(`thread:${threadId}:messages`);

  // Delete all messages
  for (const messageId of messageIds) {
    await redis.del(`message:${messageId}`);
  }

  // Delete thread metadata and references
  await redis.del(`thread:${threadId}:messages`);
  await redis.del(`thread:${threadId}`);
  await redis.zrem('threads', threadId);

  return true;
}

// Message operations
export async function saveMessage(
  threadId: string,
  message: {
    role: string;
    content: string;
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  const redis = getRedisClient();
  const messageId = generateId();
  const now = new Date().toISOString();

  const messageData = {
    id: messageId,
    thread_id: threadId,
    role: message.role,
    content: message.content,
    metadata: JSON.stringify(message.metadata || {}),
    created_at: now,
  };

  // Save message
  await redis.hset(`message:${messageId}`, messageData);

  // Add to thread's message set
  await redis.sadd(`thread:${threadId}:messages`, messageId);

  // Update thread's updated_at timestamp
  await redis.hset(`thread:${threadId}`, { updated_at: now });

  // Update thread's position in the sorted set
  await redis.zadd('threads', { score: Date.now(), member: threadId });

  return messageId;
}

export async function getMessages(threadId: string): Promise<Record<string, unknown>[]> {
  const redis = getRedisClient();

  // Get all message IDs for this thread
  const messageIds = await redis.smembers(`thread:${threadId}:messages`);

  // Get all messages
  const messages: Record<string, unknown>[] = [];
  for (const messageId of messageIds) {
    const message = await redis.hgetall(`message:${messageId}`);
    if (message) {
      // Parse metadata
      if (message.metadata) {
        try {
          message.metadata = JSON.parse(message.metadata as string);
        } catch {
          message.metadata = {};
        }
      }
      messages.push(message);
    }
  }

  // Sort by created_at
  return messages.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at as string).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at as string).getTime() : 0;
    return aTime - bTime;
  });
}

// Vector operations
export async function storeEmbedding(
  text: string,
  vector: number[],
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const vectorDb = getVectorClient();
  const id = generateId();

  await vectorDb.upsert({
    id,
    vector,
    metadata: {
      ...metadata,
      text,
      created_at: new Date().toISOString(),
    },
  });

  return id;
}

export async function searchEmbeddings(vector: number[], limit = 5): Promise<unknown[]> {
  const vectorDb = getVectorClient();

  const results = await vectorDb.query({
    vector,
    topK: limit,
    includeMetadata: true,
  });

  return results;
}

// --- Advanced RediSearch/Hybrid Search ---
export async function advancedThreadHybridSearch(query: RediSearchHybridQuery): Promise<unknown> {
  return runRediSearchHybridQuery(query);
}

// --- QStash/Workflow Integration Example ---
export async function enqueueMemoryWorkflow(type: string, data: Record<string, unknown>): Promise<unknown> {
  const payload: QStashTaskPayload = {
    id: generateId(),
    type,
    data,
    created_at: new Date().toISOString(),
    status: 'pending',
  };
  return enqueueQStashTask(payload);
}

export async function trackMemoryWorkflowNode(node: WorkflowNode): Promise<unknown> {
  return trackWorkflowNode(node);
}

// Export for convenience
export { getRedisClient as Memory, getVectorClient as Vectordb };
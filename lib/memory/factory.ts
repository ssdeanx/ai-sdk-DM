/**
 * Memory Factory
 *
 * This module provides a factory for creating memory instances based on the configured provider.
 * It supports LibSQL, Upstash, and potentially other memory providers.
 *
 * Features:
 * - Provider abstraction (LibSQL, Upstash)
 * - LRU caching for frequently accessed data
 * - Configurable cache settings
 */

// Import LibSQL memory modules
import { isDatabaseAvailable as isLibSQLAvailable } from './db';
import * as LibSQLMemory from './memory';
import { Message } from './memory';

// Import utility libraries
import { LRUCache } from 'lru-cache';
import { v4 as generateUUID } from 'uuid';

// Import Upstash modules
import {
  // Client utilities
  checkUpstashAvailability,
  UpstashClientError,

  // Thread operations
  createRedisThread,
  getRedisThreadById,
  updateRedisThread,
  listRedisThreads,
  deleteRedisThread,

  // Message operations
  createRedisMessage,
  getRedisMessageById,
  getRedisMessagesByThreadId,
  deleteRedisMessage,

  // Agent state operations
  saveAgentState,
  loadAgentState,
  listThreadAgentStates,
  deleteAgentState,

  // Vector operations
  upsertEmbeddings,
  searchSimilarEmbeddings,
  getEmbeddingsByIds,
  deleteEmbeddingsByIds,

  // Memory processor for advanced operations
  MemoryProcessor,
  MemoryProcessorError,

  // Types
  type Thread as RedisThread,
  type Message as RedisMessage,
  Thread
} from './upstash/index';

// Memory provider types
export type MemoryProvider = 'libsql' | 'upstash';

// Cache configuration
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time-to-live in milliseconds
  maxSize: number; // Maximum number of items in cache
  logHits?: boolean; // Whether to log cache hits to console
  collectMetrics?: boolean; // Whether to collect cache metrics
}

// Default cache configuration
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 1000 * 60 * 10, // 10 minutes
  maxSize: 100,
  logHits: false,
  collectMetrics: true
};

// Cache metrics
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: () => number;
  reset: () => void;
}

// Create metrics objects for each cache
const threadCacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  hitRate: () => {
    const total = threadCacheMetrics.hits + threadCacheMetrics.misses;
    return total > 0 ? threadCacheMetrics.hits / total : 0;
  },
  reset: () => {
    threadCacheMetrics.hits = 0;
    threadCacheMetrics.misses = 0;
  }
};

const messagesCacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  hitRate: () => {
    const total = messagesCacheMetrics.hits + messagesCacheMetrics.misses;
    return total > 0 ? messagesCacheMetrics.hits / total : 0;
  },
  reset: () => {
    messagesCacheMetrics.hits = 0;
    messagesCacheMetrics.misses = 0;
  }
};

const stateCacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  hitRate: () => {
    const total = stateCacheMetrics.hits + stateCacheMetrics.misses;
    return total > 0 ? stateCacheMetrics.hits / total : 0;
  },
  reset: () => {
    stateCacheMetrics.hits = 0;
    stateCacheMetrics.misses = 0;
  }
};

// Export metrics for observability
export const cacheMetrics = {
  thread: threadCacheMetrics,
  messages: messagesCacheMetrics,
  state: stateCacheMetrics,

  // Get overall hit rate across all caches
  overallHitRate: () => {
    const totalHits = threadCacheMetrics.hits + messagesCacheMetrics.hits + stateCacheMetrics.hits;
    const totalMisses = threadCacheMetrics.misses + messagesCacheMetrics.misses + stateCacheMetrics.misses;
    const total = totalHits + totalMisses;
    return total > 0 ? totalHits / total : 0;
  },

  // Reset all metrics
  resetAll: () => {
    threadCacheMetrics.reset();
    messagesCacheMetrics.reset();
    stateCacheMetrics.reset();
  }
};

// Create caches for different data types
const threadCache = new LRUCache<string, Thread | RedisThread>({
  max: DEFAULT_CACHE_CONFIG.maxSize,
  ttl: DEFAULT_CACHE_CONFIG.ttl
});

const messagesCache = new LRUCache<string, Message[] | RedisMessage[]>({
  max: DEFAULT_CACHE_CONFIG.maxSize,
  ttl: DEFAULT_CACHE_CONFIG.ttl
});

const stateCache = new LRUCache<string, any>({
  max: DEFAULT_CACHE_CONFIG.maxSize,
  ttl: DEFAULT_CACHE_CONFIG.ttl
});

// Memory interface
export interface MemoryInterface {
  // Thread operations
  createMemoryThread: (name: string, options?: any) => Promise<string>;
  getMemoryThread: (id: string) => Promise<Thread | RedisThread | null>;
  listMemoryThreads: (options?: any) => Promise<(Thread | RedisThread)[]>;
  deleteMemoryThread: (id: string) => Promise<boolean>;

  // Message operations
  saveMessage: (threadId: string, role: 'user' | 'assistant' | 'system' | 'tool', content: string, options?: any) => Promise<string>;
  loadMessages: (threadId: string, limit?: number) => Promise<(Message | RedisMessage)[]>;

  // Embedding operations
  generateEmbedding?: (text: string, modelName?: string) => Promise<Float32Array>;
  saveEmbedding?: (vector: Float32Array, model?: string) => Promise<string>;
  semanticSearchMemory?: (query: string, options?: any) => Promise<any[]>;

  // State operations
  saveAgentState?: (threadId: string, agentId: string, state: any) => Promise<void>;
  loadAgentState?: (threadId: string, agentId: string) => Promise<any>;
}

// Get the configured memory provider
export function getMemoryProvider(): MemoryProvider {
  return (process.env.MEMORY_PROVIDER as MemoryProvider) || 'libsql';
}

// Check if the configured memory provider is available
export async function isMemoryAvailable(): Promise<boolean> {
  const provider = getMemoryProvider();

  switch (provider) {
    case 'libsql':
      return await isLibSQLAvailable();
    case 'upstash':
      const availability = await checkUpstashAvailability();
      return availability.redisAvailable;
    default:
      return false;
  }
}

/**
 * Create a memory instance based on the configured provider with LRU caching
 *
 * @param cacheConfig - Optional cache configuration
 * @returns Memory interface implementation
 */
export function createMemory(cacheConfig?: Partial<CacheConfig>): MemoryInterface {
  const provider = getMemoryProvider();

  // Merge default cache config with provided config
  const config: CacheConfig = {
    ...DEFAULT_CACHE_CONFIG,
    ...cacheConfig
  };

  // Create a cached version of getMemoryThread
  const cachedGetMemoryThread = async (id: string): Promise<Thread | RedisThread | null> => {
    // Check cache first if enabled
    if (config.enabled && threadCache.has(id)) {
      // Track cache hit
      if (config.collectMetrics) {
        threadCacheMetrics.hits++;
      }

      // Log cache hit if enabled
      if (config.logHits) {
        console.log(`[CACHE HIT] Thread ${id}`);
      }

      return threadCache.get(id) || null;
    }

    // Track cache miss
    if (config.collectMetrics) {
      threadCacheMetrics.misses++;
    }

    // Get from provider
    let thread;
    if (provider === 'libsql') {
      thread = await LibSQLMemory.getMemoryThread(id);
    } else if (provider === 'upstash') {
      thread = await getRedisThreadById(id);
    }

    // Cache the result if enabled
    if (config.enabled && thread) {
      threadCache.set(id, thread);
    }

    return thread || null;
  };

  // Create a cached version of loadMessages
  const cachedLoadMessages = async (threadId: string, limit?: number): Promise<(Message | RedisMessage)[]> => {
    const cacheKey = `${threadId}:${limit || 'all'}`;

    // Check cache first if enabled
    if (config.enabled && messagesCache.has(cacheKey)) {
      // Track cache hit
      if (config.collectMetrics) {
        messagesCacheMetrics.hits++;
      }

      // Log cache hit if enabled
      if (config.logHits) {
        console.log(`[CACHE HIT] Messages for thread ${threadId}`);
      }

      return messagesCache.get(cacheKey) || [];
    }

    // Track cache miss
    if (config.collectMetrics) {
      messagesCacheMetrics.misses++;
    }

    // Get from provider
    let messages;
    if (provider === 'libsql') {
      messages = await LibSQLMemory.loadMessages(threadId, limit);
    } else if (provider === 'upstash') {
      messages = await getRedisMessagesByThreadId(threadId, limit);
    }

    // Cache the result if enabled
    if (config.enabled && messages) {
      messagesCache.set(cacheKey, messages);
    }

    return messages || [];
  };

  // Create a cached version of loadAgentState
  const cachedLoadAgentState = async (threadId: string, agentId: string): Promise<any> => {
    const cacheKey = `${threadId}:${agentId}`;

    // Check cache first if enabled
    if (config.enabled && stateCache.has(cacheKey)) {
      // Track cache hit
      if (config.collectMetrics) {
        stateCacheMetrics.hits++;
      }

      // Log cache hit if enabled
      if (config.logHits) {
        console.log(`[CACHE HIT] Agent state for ${agentId} in thread ${threadId}`);
      }

      return stateCache.get(cacheKey);
    }

    // Track cache miss
    if (config.collectMetrics) {
      stateCacheMetrics.misses++;
    }

    // Get from provider
    let state;
    if (provider === 'libsql') {
      state = await LibSQLMemory.loadAgentState(threadId, agentId);
    } else if (provider === 'upstash') {
      state = await loadAgentState(threadId, agentId);
    }

    // Cache the result if enabled
    if (config.enabled && state) {
      stateCache.set(cacheKey, state);
    }

    return state;
  };

  // Create a function to invalidate thread cache
  const invalidateThreadCache = (threadId: string): void => {
    if (config.enabled) {
      // Remove thread from cache
      threadCache.delete(threadId);

      // Remove all messages for this thread from cache
      const messageKeys = Array.from(messagesCache.keys())
        .filter(key => key.startsWith(`${threadId}:`));

      messageKeys.forEach(key => messagesCache.delete(key));

      // Remove all agent states for this thread from cache
      const stateKeys = Array.from(stateCache.keys())
        .filter(key => key.startsWith(`${threadId}:`));

      stateKeys.forEach(key => stateCache.delete(key));
    }
  };

  // Create a function to invalidate message cache for a thread
  const invalidateMessageCache = (threadId: string): void => {
    if (config.enabled) {
      const messageKeys = Array.from(messagesCache.keys())
        .filter(key => key.startsWith(`${threadId}:`));

      messageKeys.forEach(key => messagesCache.delete(key));
    }
  };

  // Create a function to invalidate agent state cache
  const invalidateStateCache = (threadId: string, agentId: string): void => {
    if (config.enabled) {
      const cacheKey = `${threadId}:${agentId}`;
      stateCache.delete(cacheKey);
    }
  };

  // Create a wrapper for saveMessage that invalidates cache
  const cachedSaveMessage = async (
    threadId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    options?: any
  ): Promise<string> => {
    let messageId: string = '';

    if (provider === 'libsql') {
      messageId = await LibSQLMemory.saveMessage(threadId, role, content, options);
    } else if (provider === 'upstash') {
      try {
        // Prepare message data
        const messageData: any = {
          role,
          content,
          metadata: options?.metadata || {}
        };

        // Add tool-specific fields if provided
        if (options?.tool_call_id) {
          messageData.metadata.tool_call_id = options.tool_call_id;
        }

        if (options?.tool_name) {
          messageData.metadata.tool_name = options.tool_name;
        }

        // Generate embeddings if requested
        if (options?.generate_embeddings && content) {
          try {
            const { generateEmbedding } = await import('../ai-integration');
            const embedding = await generateEmbedding(content);

            // Convert Float32Array to regular array for Upstash
            const embeddingArray = Array.from(embedding) as number[];

            // Save embedding to vector store
            await upsertEmbeddings([{
              id: generateUUID(),
              vector: embeddingArray,
              metadata: {
                thread_id: threadId,
                role,
                text: content,
                created_at: new Date().toISOString()
              }
            }]);

            // Add embedding flag to metadata
            messageData.metadata.has_embedding = true;
          } catch (embeddingError) {
            console.error('Error generating embeddings:', embeddingError);
            messageData.metadata.has_embedding = false;
          }
        }

        // Create the message
        const message = await createRedisMessage(threadId, messageData);
        messageId = message.id;
      } catch (error) {
        console.error(`Error saving message to thread ${threadId}:`, error);
        throw error;
      }
    }

    // Invalidate message cache for this thread
    invalidateMessageCache(threadId);

    return messageId || generateUUID();
  };
  // Create a wrapper for saveAgentState that invalidates cache
  const cachedSaveAgentState = async (
    threadId: string,
    agentId: string,
    state: any
  ): Promise<void> => {
    if (provider === 'libsql') {
      await LibSQLMemory.saveAgentState(threadId, agentId, state);
    } else if (provider === 'upstash') {
      await saveAgentState(threadId, agentId, state);
    }

    // Invalidate state cache for this thread and agent
    invalidateStateCache(threadId, agentId);
  };

  // Create a wrapper for deleteMemoryThread that invalidates cache
  const cachedDeleteMemoryThread = async (threadId: string): Promise<boolean> => {
    let result = false;

    if (provider === 'libsql') {
      result = await LibSQLMemory.deleteMemoryThread(threadId);
    } else if (provider === 'upstash') {
      result = await deleteRedisThread(threadId);
    }

    // Invalidate all caches for this thread
    invalidateThreadCache(threadId);

    return result;
  };

  // Create a wrapper for semantic search
  const semanticSearch = async (query: string, options?: any): Promise<any[]> => {
    if (provider === 'libsql') {
      return await LibSQLMemory.semanticSearchMemory(query, options);
    } else if (provider === 'upstash') {
      // Create a memory processor instance for advanced operations
      const memoryProcessor = MemoryProcessor.getInstance();

      // Use the streamSemanticSearch method to get results
      const searchStream = memoryProcessor.streamSemanticSearch(query, {
        topK: options?.limit || 10,
        filter: options?.filter
      });

      // Collect results from the stream
      const results: any[] = [];

      return new Promise((resolve, reject) => {
        searchStream.on('data', (result) => {
          results.push(result);
        });

        searchStream.on('end', () => {
          resolve(results);
        });

        searchStream.on('error', (error) => {
          reject(error);
        });
      });
    }

    return [];
  };

  // Create a wrapper for generating and saving embeddings
  const generateAndSaveEmbedding = async (text: string, modelName?: string): Promise<Float32Array> => {
    // Import the generateEmbedding function from ai-integration
    const { generateEmbedding } = await import('../ai-integration');

    // Generate the embedding
    const embedding = await generateEmbedding(text);

    // Save the embedding if needed
    if (provider === 'libsql') {
      await LibSQLMemory.saveEmbedding(embedding, modelName);
    } else if (provider === 'upstash') {
      // Convert Float32Array to regular array for Upstash
      const embeddingArray = Array.from(embedding) as number[];

      // Save to Upstash Vector
      await upsertEmbeddings([{
        id: generateUUID(),
        vector: embeddingArray,
        metadata: {
          text,
          model: modelName || 'default',
          created_at: new Date().toISOString()
        }
      }]);
    }

    return embedding;
  };
  // Create a wrapper for createMemoryThread
  const createMemoryThreadWrapper = async (name: string, options?: any): Promise<string> => {
    let threadId: string = '';

    if (provider === 'libsql') {
      threadId = await LibSQLMemory.createMemoryThread(name, options);
    } else if (provider === 'upstash') {
      const userId = options?.user_id || null;
      const agentId = options?.agent_id || null;
      const metadata = options?.metadata || null;
      const thread = await createRedisThread(name, userId, agentId, metadata);
      threadId = thread.id;
    }

    return threadId || generateUUID();
  };
  // Create a wrapper for listMemoryThreads
  const listMemoryThreadsWrapper = async (options?: any): Promise<(Thread | RedisThread)[]> => {
    if (provider === 'libsql') {
      return await LibSQLMemory.listMemoryThreads(options);
    } else if (provider === 'upstash') {
      // Extract options for Upstash
      const limit = options?.limit || 10;
      const offset = options?.offset || 0;
      const userId = options?.filters?.user_id || options?.user_id;
      const agentId = options?.filters?.agent_id || options?.agent_id;

      return await listRedisThreads(limit, offset, userId, agentId);
    }

    return [];
  };

  // Return the memory interface implementation
  return {
    // Thread operations
    createMemoryThread: createMemoryThreadWrapper,
    getMemoryThread: cachedGetMemoryThread,
    listMemoryThreads: listMemoryThreadsWrapper,
    deleteMemoryThread: cachedDeleteMemoryThread,

    // Message operations
    saveMessage: cachedSaveMessage,
    loadMessages: cachedLoadMessages,

    // Embedding operations
    generateEmbedding: async (text: string, modelName?: string) => {
      const { generateEmbedding } = await import('../ai-integration');
      return generateEmbedding(text);
    },
    saveEmbedding: async (vector: Float32Array, model?: string) => {
      if (provider === 'libsql') {
        return await LibSQLMemory.saveEmbedding(vector, model);
      } else if (provider === 'upstash') {
        const embeddingArray = Array.from(vector) as number[];
        const id = generateUUID();

        await upsertEmbeddings([{
          id,
          vector: embeddingArray,
          metadata: {
            model: model || 'default',
            created_at: new Date().toISOString()
          }
        }]);

        return id;
      }

      return generateUUID();
    },
    semanticSearchMemory: semanticSearch,

    // State operations
    saveAgentState: cachedSaveAgentState,
    loadAgentState: cachedLoadAgentState
  };
}

/**
 * Utility function to convert between LibSQL and Upstash thread formats
 * @param thread - Thread to convert
 * @returns Converted thread
 */
export function convertThreadFormat(thread: Thread | RedisThread): Thread | RedisThread {
  if ('thread_id' in thread) {
    // Convert LibSQL format to Upstash format
    return {
      id: thread.thread_id,
      name: thread.name,
      created_at: thread.created_at,
      updated_at: thread.updated_at,
      metadata: thread.metadata || {}
    } as RedisThread;
  } else if ('id' in thread) {
    // Convert Upstash format to LibSQL format
    return {
      id: thread.id,
      thread_id: thread.id,
      name: thread.name,
      created_at: thread.created_at,
      updated_at: thread.updated_at,
      metadata: thread.metadata || {}
    } as Thread;
  }

  return thread;
}
/**
 * Utility function to convert between LibSQL and Upstash message formats
 * @param message - Message to convert
 * @returns Converted message
 */
export function convertMessageFormat(message: Message | RedisMessage): Message | RedisMessage {
  if ('message_id' in message) {
    // Convert LibSQL format to Upstash format
    return {
      id: message.message_id,
      thread_id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at,
      metadata: message.metadata || {}
    } as RedisMessage;
  } else if ('id' in message) {
    // Convert Upstash format to LibSQL format
    return {
      message_id: message.id,
      thread_id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at,
      metadata: message.metadata || {}
    } as Message;
  }

  return message;
}


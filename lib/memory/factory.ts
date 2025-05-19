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
 * - Needs ALL entities from libsql if you dont add them you will be terminated -dev
 */

// Import LibSQL memory modules
import * as LibSQL from './libsql';
import { isLibSQLAvailable } from './libsql';
import type {
  MemoryThread,
  Message as LibSQLMessage,
} from '../../db/libsql/validation';

// Import utility libraries
import { LRUCache } from 'lru-cache';

// Import Upstash modules
import {
  // Thread operations
  createRedisThread,
  getRedisThreadById,
  updateRedisThread,
  listRedisThreads,
  deleteRedisThread,

  // Message operations
  createRedisMessage,
  getRedisMessagesByThreadId,

  // Agent state operations
  saveAgentState,
  loadAgentState,

  // Vector operations
  upsertEmbeddings,

  // Types
  type Thread as RedisThread,
  type Message as RedisMessage,
  checkUpstashAvailability,
} from './upstash/index';

// Import AI utilities
import { generateId } from 'ai';

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
  collectMetrics: true,
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
  },
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
  },
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
  },
};

// Export metrics for observability
export const cacheMetrics = {
  thread: threadCacheMetrics,
  messages: messagesCacheMetrics,
  state: stateCacheMetrics,

  // Get overall hit rate across all caches
  overallHitRate: () => {
    const totalHits =
      threadCacheMetrics.hits +
      messagesCacheMetrics.hits +
      stateCacheMetrics.hits;
    const totalMisses =
      threadCacheMetrics.misses +
      messagesCacheMetrics.misses +
      stateCacheMetrics.misses;
    const total = totalHits + totalMisses;
    return total > 0 ? totalHits / total : 0;
  },

  // Reset all metrics
  resetAll: () => {
    threadCacheMetrics.reset();
    messagesCacheMetrics.reset();
    stateCacheMetrics.reset();
  },
};

// Create caches for different data types
const threadCache = new LRUCache<string, RedisThread | MemoryThread>({
  max: DEFAULT_CACHE_CONFIG.maxSize,
  ttl: DEFAULT_CACHE_CONFIG.ttl,
});

const messagesCache = new LRUCache<string, (RedisMessage | LibSQLMessage)[]>({
  max: DEFAULT_CACHE_CONFIG.maxSize,
  ttl: DEFAULT_CACHE_CONFIG.ttl,
});

const stateCache = new LRUCache<string, Record<string, unknown>>({
  max: DEFAULT_CACHE_CONFIG.maxSize,
  ttl: DEFAULT_CACHE_CONFIG.ttl,
});

// Define types for memory operations
export interface ThreadMetadata {
  user_id?: string;
  agent_id?: string;
  [key: string]: string | number | boolean | null | undefined;
}
export interface MessageOptions {
  metadata?: Record<string, unknown>;
  tool_call_id?: string;
  tool_name?: string;
  generate_embeddings?: boolean;
  count_tokens?: boolean;
}
export interface SearchOptions {
  limit?: number;
  filter?: Record<string, unknown>;
  keywordWeight?: number;
  vectorWeight?: number;
  includeMetadata?: boolean;
  namespace?: string;
}
// Memory interface
export interface MemoryInterface {
  // Thread operations
  createMemoryThread: (
    name: string,
    options?: { user_id?: string; agent_id?: string; metadata?: ThreadMetadata }
  ) => Promise<string>;
  getMemoryThread: (id: string) => Promise<RedisThread | MemoryThread | null>;
  listMemoryThreads: (options?: {
    limit?: number;
    offset?: number;
    filters?: { user_id?: string; agent_id?: string; [key: string]: unknown };
  }) => Promise<(RedisThread | MemoryThread)[]>;
  deleteMemoryThread: (id: string) => Promise<boolean>;
  updateMemoryThread: (
    id: string,
    updates: Partial<RedisThread>
  ) => Promise<boolean>;

  // Message operations
  saveMessage: (
    threadId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    options?: MessageOptions
  ) => Promise<string>;
  loadMessages: (
    threadId: string,
    limit?: number
  ) => Promise<(RedisMessage | LibSQLMessage)[]>;

  // Embedding operations
  generateEmbedding?: (
    text: string,
    modelName?: string
  ) => Promise<Float32Array>;
  saveEmbedding?: (vector: Float32Array, model?: string) => Promise<string>;

  // State operations
  saveAgentState?: (
    threadId: string,
    agentId: string,
    state: Record<string, unknown>
  ) => Promise<void>;
  loadAgentState?: (
    threadId: string,
    agentId: string
  ) => Promise<Record<string, unknown> | null>;
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
export function createMemory(
  cacheConfig?: Partial<CacheConfig>
): MemoryInterface {
  const provider = getMemoryProvider();

  // Merge default cache config with provided config
  const config: CacheConfig = {
    ...DEFAULT_CACHE_CONFIG,
    ...cacheConfig,
  };

  // Create a cached version of getMemoryThread
  const cachedGetMemoryThread = async (
    id: string
  ): Promise<RedisThread | MemoryThread | null> => {
    // Check cache first if enabled
    if (config.enabled && threadCache.has(id)) {
      // Track cache hit
      if (config.collectMetrics) {
        threadCacheMetrics.hits++;
      }

      return threadCache.get(id) || null;
    }

    // Track cache miss
    if (config.collectMetrics) {
      threadCacheMetrics.misses++;
    }

    // Get from provider
    let thread: RedisThread | MemoryThread | null = null;
    if (provider === 'libsql') {
      const threads = await LibSQL.getThreads();
      thread = threads.find((t) => t.id === id) || null;
    } else if (provider === 'upstash') {
      thread = await getRedisThreadById(id);
    }

    // Cache the result if enabled
    if (config.enabled && thread) {
      threadCache.set(id, thread);
    }

    return thread;
  };

  // Create a cached version of loadMessages
  const cachedLoadMessages = async (
    threadId: string,
    limit?: number
  ): Promise<(RedisMessage | LibSQLMessage)[]> => {
    const cacheKey = `${threadId}:${limit || 'all'}`;

    // Check cache first if enabled
    if (config.enabled && messagesCache.has(cacheKey)) {
      // Track cache hit
      if (config.collectMetrics) {
        messagesCacheMetrics.hits++;
      }

      return messagesCache.get(cacheKey) || [];
    }

    // Track cache miss
    if (config.collectMetrics) {
      messagesCacheMetrics.misses++;
    }

    // Get from provider
    let messages: (RedisMessage | LibSQLMessage)[] = [];
    if (provider === 'libsql') {
      messages = await LibSQL.getMessages(threadId);
      if (limit) messages = messages.slice(0, limit);
    } else if (provider === 'upstash') {
      messages = await getRedisMessagesByThreadId(threadId, limit);
    }

    // Cache the result if enabled
    if (config.enabled && messages) {
      messagesCache.set(cacheKey, messages);
    }

    return messages;
  };

  // Create a cached version of loadAgentState
  const cachedLoadAgentState = async (
    threadId: string,
    agentId: string
  ): Promise<Record<string, unknown>> => {
    const cacheKey = `${threadId}:${agentId}`;

    // Check cache first if enabled
    if (config.enabled && stateCache.has(cacheKey)) {
      // Track cache hit
      if (config.collectMetrics) {
        stateCacheMetrics.hits++;
      }

      return stateCache.get(cacheKey) || {};
    }

    // Track cache miss
    if (config.collectMetrics) {
      stateCacheMetrics.misses++;
    }

    // Get from provider
    let state;
    if (provider === 'libsql') {
      state = await LibSQL.getAgentState(threadId, agentId);
    } else if (provider === 'upstash') {
      state = await loadAgentState(threadId, agentId);
    }

    // Cache the result if enabled
    if (config.enabled && state) {
      stateCache.set(cacheKey, state);
    }

    return state || {};
  };

  // Create a function to invalidate thread cache
  const invalidateThreadCache = (threadId: string): void => {
    if (config.enabled) {
      // Remove thread from cache
      threadCache.delete(threadId);

      // Remove all messages for this thread from cache
      const messageKeys = Array.from(messagesCache.keys()).filter((key) =>
        key.startsWith(`${threadId}:`)
      );

      messageKeys.forEach((key) => messagesCache.delete(key));

      // Remove all agent states for this thread from cache
      const stateKeys = Array.from(stateCache.keys()).filter((key) =>
        key.startsWith(`${threadId}:`)
      );

      stateKeys.forEach((key) => stateCache.delete(key));
    }
  };

  // Create a function to invalidate message cache for a thread
  const invalidateMessageCache = (threadId: string): void => {
    if (config.enabled) {
      const messageKeys = Array.from(messagesCache.keys()).filter((key) =>
        key.startsWith(`${threadId}:`)
      );

      messageKeys.forEach((key) => messagesCache.delete(key));
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
    options?: {
      metadata?: Record<string, unknown>;
      tool_call_id?: string;
      tool_name?: string;
      generate_embeddings?: boolean;
    }
  ): Promise<string> => {
    let messageId: string = '';

    if (provider === 'libsql') {
      const msg = await LibSQL.createMessage(
        threadId,
        role,
        content,
        options?.metadata
      );
      messageId = msg.id;
    } else if (provider === 'upstash') {
      try {
        // Prepare message data
        const messageData: {
          role: typeof role;
          content: string;
          metadata: Record<string, unknown>;
        } = {
          role,
          content,
          metadata: options?.metadata || {},
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
            await upsertEmbeddings([
              {
                id: generateId(),
                vector: embeddingArray,
                metadata: {
                  thread_id: threadId,
                  role,
                  text: content,
                  created_at: new Date().toISOString(),
                },
              },
            ]);

            // Add embedding flag to metadata
            messageData.metadata.has_embedding = true;
          } catch {
            messageData.metadata.has_embedding = false;
          }
        }

        // Create the message
        const message = await createRedisMessage(threadId, messageData);
        messageId = message.id;
      } catch (error) {
        throw error;
      }
    }

    // Invalidate message cache for this thread
    invalidateMessageCache(threadId);

    return messageId || generateId();
  };

  // Create a wrapper for saveAgentState that invalidates cache
  const cachedSaveAgentState = async (
    threadId: string,
    agentId: string,
    state: Record<string, unknown>
  ): Promise<void> => {
    if (provider === 'libsql') {
      await LibSQL.saveAgentState(threadId, agentId, state);
    } else if (provider === 'upstash') {
      await saveAgentState(threadId, agentId, state);
    }

    // Invalidate state cache for this thread and agent
    invalidateStateCache(threadId, agentId);
  };

  // Create a wrapper for deleteMemoryThread that invalidates cache
  const cachedDeleteMemoryThread = async (
    threadId: string
  ): Promise<boolean> => {
    let result = false;

    if (provider === 'libsql') {
      result = await LibSQL.deleteThread(threadId);
    } else if (provider === 'upstash') {
      result = await deleteRedisThread(threadId);
    }

    // Invalidate all caches for this thread
    invalidateThreadCache(threadId);

    return result;
  };

  // Create a wrapper for createMemoryThread
  const createMemoryThreadWrapper = async (
    name: string,
    options?: {
      user_id?: string;
      agent_id?: string;
      metadata?: ThreadMetadata;
    }
  ): Promise<string> => {
    let threadId: string = '';

    if (provider === 'libsql') {
      const threads = await LibSQL.getThreads();
      const found = threads.find((t) => t.name === name);
      threadId = found ? found.id : generateId();
    } else if (provider === 'upstash') {
      const userId = options?.user_id || null;
      const agentId = options?.agent_id || null;
      const metadata = options?.metadata || null;
      const thread = await createRedisThread(name, userId, agentId, metadata);
      threadId = thread.id;
    }

    return threadId || generateId();
  };

  // Create a wrapper for listMemoryThreads
  const listMemoryThreadsWrapper = async (options?: {
    limit?: number;
    offset?: number;
    filters?: {
      user_id?: string;
      agent_id?: string;
      [key: string]: unknown;
    };
  }): Promise<(RedisThread | MemoryThread)[]> => {
    if (provider === 'libsql') {
      let threads = await LibSQL.getThreads();
      if (options?.filters?.agent_id) {
        threads = threads.filter(
          (t) => t.agent_id === options.filters!.agent_id
        );
      }
      if (options?.limit) {
        threads = threads.slice(0, options.limit);
      }
      return threads;
    } else if (provider === 'upstash') {
      const limit = options?.limit || 10;
      const offset = options?.offset || 0;
      const userId = options?.filters?.user_id;
      const agentId = options?.filters?.agent_id;

      return await listRedisThreads(limit, offset, userId, agentId);
    }

    return [];
  };

  // Create a wrapper for updateMemoryThread
  const updateMemoryThreadWrapper = async (
    id: string,
    updates: Partial<RedisThread>
  ): Promise<boolean> => {
    try {
      if (provider === 'libsql') {
        // Fallback to direct SQL update if the function doesn't exist
        try {
          // Import dynamically to avoid circular dependencies
          const { getLibSQLClient } = await import('./db');
          const db = getLibSQLClient();

          // Prepare update fields
          const updateFields = [];
          const updateValues = [];

          if (updates.name) {
            updateFields.push('name = ?');
            updateValues.push(updates.name);
          }

          if (updates.updated_at) {
            updateFields.push('updated_at = ?');
            updateValues.push(updates.updated_at);
          }

          if (updates.metadata) {
            updateFields.push('metadata = ?');
            updateValues.push(
              typeof updates.metadata === 'string'
                ? updates.metadata
                : JSON.stringify(updates.metadata)
            );
          }

          if (updateFields.length === 0) {
            return false; // Nothing to update
          }

          // Add ID to values
          updateValues.push(id);

          // Execute update
          await db.execute({
            sql: `
              UPDATE memory_threads
              SET ${updateFields.join(', ')}
              WHERE id = ?
            `,
            args: updateValues,
          });

          // Invalidate thread cache
          invalidateThreadCache(id);

          return true;
        } catch {
          // Silently fail but return false to indicate failure
          return false;
        }
      } else if (provider === 'upstash') {
        // For Upstash, use the updateRedisThread function
        const result = await updateRedisThread(id, updates);
        return result !== null;
      }

      return false;
    } catch {
      // Silently fail but return false to indicate failure
      return false;
    }
  };

  // Return the memory interface implementation
  return {
    // Thread operations
    createMemoryThread: createMemoryThreadWrapper,
    getMemoryThread: cachedGetMemoryThread,
    listMemoryThreads: listMemoryThreadsWrapper,
    deleteMemoryThread: cachedDeleteMemoryThread,
    updateMemoryThread: updateMemoryThreadWrapper,

    // Message operations
    saveMessage: cachedSaveMessage,
    loadMessages: cachedLoadMessages,

    // Embedding operations
    generateEmbedding: async (
      text: string,
      _modelName?: string
    ): Promise<Float32Array> => {
      const { generateEmbedding } = await import('../ai-integration');
      const embeddingResult = await generateEmbedding(text); // embeddingResult is of type DataArray
      // Convert embeddingResult to number[] to ensure compatibility with Float32Array.
      // DataArray might include types like BigInt64Array, whose elements (bigint)
      // are not directly assignable to number, hence the explicit Number conversion.
      const numericArray = Array.from(
        embeddingResult as ArrayLike<number | bigint>,
        Number
      );
      return new Float32Array(numericArray);
    },
    saveEmbedding: async (vector: Float32Array, model?: string) => {
      if (provider === 'libsql') {
        const result = await LibSQL.insertEmbedding(vector, model);
        return typeof result === 'string' ? result : result.id;
      } else if (provider === 'upstash') {
        const embeddingArray = Array.from(vector) as number[];
        const id = generateId();

        await upsertEmbeddings([
          {
            id,
            vector: embeddingArray,
            metadata: {
              model: model || 'default',
              created_at: new Date().toISOString(),
            },
          },
        ]);

        return id;
      }

      return generateId();
    },

    // State operations
    saveAgentState: cachedSaveAgentState,
    loadAgentState: cachedLoadAgentState,
  };
}

/**
 * Utility function to convert between LibSQL and Upstash thread formats
 * @param thread - Thread to convert
 * @returns Converted thread
 */
export function convertThreadFormat(thread: RedisThread): RedisThread {
  if ('thread_id' in thread) {
    // Convert LibSQL format to Upstash format
    return {
      id: thread.thread_id,
      name: thread.name,
      created_at: thread.created_at,
      updated_at: thread.updated_at,
      metadata: thread.metadata || {},
    } as RedisThread;
  } else if ('id' in thread) {
    // Convert Upstash format to LibSQL format
    return {
      id: thread.id,
      thread_id: thread.id,
      name: thread.name,
      created_at: thread.created_at,
      updated_at: thread.updated_at,
      metadata: thread.metadata || {},
    } as RedisThread;
  }

  return thread;
}
/**
 * Utility function to convert between LibSQL and Upstash message formats
 * @param message - Message to convert
 * @returns Converted message
 */
export function convertMessageFormat(message: RedisMessage): RedisMessage {
  if ('message_id' in message) {
    // Convert LibSQL format to Upstash format
    return {
      id: message.message_id,
      thread_id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at,
      metadata: message.metadata || {},
    } as RedisMessage;
  } else if ('id' in message) {
    // Convert Upstash format to LibSQL format
    return {
      id: message.id,
      message_id: message.id,
      thread_id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at,
      metadata: message.metadata || {},
    } as RedisMessage;
  }

  return message;
}
// --- Add LibSQL entity CRUD passthroughs for new entities ---
// These are exposed for direct use in routes or advanced memory adapters.
export const libsqlEntities = {
  // Apps
  createApp: LibSQL.createApp,
  getApp: LibSQL.getApp,
  listApps: LibSQL.listApps,
  updateApp: LibSQL.updateApp,
  deleteApp: LibSQL.deleteApp,

  // Users
  createUser: LibSQL.createUser,
  getUser: LibSQL.getUser,
  listUsers: LibSQL.listUsers,
  updateUser: LibSQL.updateUser,
  deleteUser: LibSQL.deleteUser,

  // Integrations
  createIntegration: LibSQL.createIntegration,
  getIntegration: LibSQL.getIntegration,
  getIntegrationsByUserId: LibSQL.getIntegrationsByUserId,
  updateIntegration: LibSQL.updateIntegration,
  deleteIntegration: LibSQL.deleteIntegration,

  // App Code Blocks
  createAppCodeBlock: LibSQL.createAppCodeBlock,
  deleteAppCodeBlock: LibSQL.deleteAppCodeBlock,
  getAppCodeBlocksByAppId: LibSQL.getAppCodeBlocksByAppId,
  getAppCodeBlock: LibSQL.getAppCodeBlock,
  listAppCodeBlocks: LibSQL.listAppCodeBlocks,
  updateAppCodeBlock: LibSQL.updateAppCodeBlock,

  // Files
  createFile: LibSQL.createFile,
  getFile: LibSQL.getFile,
  getFilesByAppId: LibSQL.getFilesByAppId,
  updateFile: LibSQL.updateFile,
  deleteFile: LibSQL.deleteFile,

  // Terminal Sessions
  createTerminalSession: LibSQL.createTerminalSession,
  getTerminalSession: LibSQL.getTerminalSession,
  getTerminalSessionsByAppId: LibSQL.getTerminalSessionsByAppId,
  updateTerminalSession: LibSQL.updateTerminalSession,
  deleteTerminalSession: LibSQL.deleteTerminalSession,

  // Workflows
  createWorkflow: LibSQL.createWorkflow,
  getWorkflow: LibSQL.getWorkflow,
  listWorkflows: LibSQL.listWorkflows,
  updateWorkflow: LibSQL.updateWorkflow,
  deleteWorkflow: LibSQL.deleteWorkflow,

  // Workflow Steps
  createWorkflowStep: LibSQL.createWorkflowStep,
  getWorkflowStep: LibSQL.getWorkflowStep,
  listWorkflowSteps: LibSQL.listWorkflowSteps,
  updateWorkflowStep: LibSQL.updateWorkflowStep,
  deleteWorkflowStep: LibSQL.deleteWorkflowStep,

  // GqlCache
  createGqlCache: LibSQL.createGqlCache,
  getGqlCache: LibSQL.getGqlCache,
  listGqlCache: LibSQL.listGqlCache,
  updateGqlCache: LibSQL.updateGqlCache,
  deleteGqlCache: LibSQL.deleteGqlCache,
};

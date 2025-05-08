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

import { isDatabaseAvailable as isLibSQLAvailable } from './db'
import { isUpstashAvailable } from './upstash/memoryStore'
import * as LibSQLMemory from './memory'
import * as UpstashMemory from './upstash/memoryStore'
import { LRUCache } from 'lru-cache'
import { Message } from './memory'
import { v4 as generateUUID } from 'uuid'

// Memory provider types
export type MemoryProvider = 'libsql' | 'upstash'

// Cache configuration
export interface CacheConfig {
  enabled: boolean
  ttl: number // Time-to-live in milliseconds
  maxSize: number // Maximum number of items in cache
  logHits?: boolean // Whether to log cache hits to console
  collectMetrics?: boolean // Whether to collect cache metrics
}

// Default cache configuration
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 1000 * 60 * 10, // 10 minutes
  maxSize: 100,
  logHits: false,
  collectMetrics: true
}

// Cache metrics
export interface CacheMetrics {
  hits: number
  misses: number
  hitRate: () => number
  reset: () => void
}

// Create metrics objects for each cache
const threadCacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  hitRate: () => {
    const total = threadCacheMetrics.hits + threadCacheMetrics.misses
    return total > 0 ? threadCacheMetrics.hits / total : 0
  },
  reset: () => {
    threadCacheMetrics.hits = 0
    threadCacheMetrics.misses = 0
  }
}

const messagesCacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  hitRate: () => {
    const total = messagesCacheMetrics.hits + messagesCacheMetrics.misses
    return total > 0 ? messagesCacheMetrics.hits / total : 0
  },
  reset: () => {
    messagesCacheMetrics.hits = 0
    messagesCacheMetrics.misses = 0
  }
}

const stateCacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  hitRate: () => {
    const total = stateCacheMetrics.hits + stateCacheMetrics.misses
    return total > 0 ? stateCacheMetrics.hits / total : 0
  },
  reset: () => {
    stateCacheMetrics.hits = 0
    stateCacheMetrics.misses = 0
  }
}

// Export metrics for observability
export const cacheMetrics = {
  thread: threadCacheMetrics,
  messages: messagesCacheMetrics,
  state: stateCacheMetrics,

  // Get overall hit rate across all caches
  overallHitRate: () => {
    const totalHits = threadCacheMetrics.hits + messagesCacheMetrics.hits + stateCacheMetrics.hits
    const totalMisses = threadCacheMetrics.misses + messagesCacheMetrics.misses + stateCacheMetrics.misses
    const total = totalHits + totalMisses
    return total > 0 ? totalHits / total : 0
  },

  // Reset all metrics
  resetAll: () => {
    threadCacheMetrics.reset()
    messagesCacheMetrics.reset()
    stateCacheMetrics.reset()
  }
}

// Create caches for different data types
const threadCache = new LRUCache<string, any>({
  max: DEFAULT_CACHE_CONFIG.maxSize,
  ttl: DEFAULT_CACHE_CONFIG.ttl
})

const messagesCache = new LRUCache<string, Message[]>({
  max: DEFAULT_CACHE_CONFIG.maxSize,
  ttl: DEFAULT_CACHE_CONFIG.ttl
})

const stateCache = new LRUCache<string, any>({
  max: DEFAULT_CACHE_CONFIG.maxSize,
  ttl: DEFAULT_CACHE_CONFIG.ttl
})

// Memory interface
export interface MemoryInterface {
  // Thread operations
  createMemoryThread: (name: string, options?: any) => Promise<string>
  getMemoryThread: (id: string) => Promise<any>
  listMemoryThreads: (options?: any) => Promise<any[]>
  deleteMemoryThread: (id: string) => Promise<boolean>

  // Message operations
  saveMessage: (threadId: string, role: 'user' | 'assistant' | 'system' | 'tool', content: string, options?: any) => Promise<string>
  loadMessages: (threadId: string, limit?: number) => Promise<any[]>

  // Embedding operations
  generateEmbedding?: (text: string, modelName?: string) => Promise<Float32Array>
  saveEmbedding?: (vector: Float32Array, model?: string) => Promise<string>
  semanticSearchMemory?: (query: string, options?: any) => Promise<any[]>

  // State operations
  saveAgentState?: (threadId: string, agentId: string, state: any) => Promise<void>
  loadAgentState?: (threadId: string, agentId: string) => Promise<any>
}

// Get the configured memory provider
export function getMemoryProvider(): MemoryProvider {
  return (process.env.MEMORY_PROVIDER as MemoryProvider) || 'libsql'
}

// Check if the configured memory provider is available
export async function isMemoryAvailable(): Promise<boolean> {
  const provider = getMemoryProvider()

  switch (provider) {
    case 'libsql':
      return await isLibSQLAvailable()
    case 'upstash':
      return await isUpstashAvailable()
    default:
      return false
  }
}

/**
 * Create a memory instance based on the configured provider with LRU caching
 *
 * @param cacheConfig - Optional cache configuration
 * @returns Memory interface implementation
 */
export function createMemory(cacheConfig?: Partial<CacheConfig>): MemoryInterface {
  const provider = getMemoryProvider()

  // Merge default cache config with provided config
  const config: CacheConfig = {
    ...DEFAULT_CACHE_CONFIG,
    ...cacheConfig
  }

  // Create a cached version of getMemoryThread
  const cachedGetMemoryThread = async (id: string): Promise<any> => {
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

      return threadCache.get(id);
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
      thread = await UpstashMemory.getThread(id);
    }

    // Cache the result if enabled
    if (config.enabled && thread) {
      threadCache.set(id, thread);
    }

    return thread;
  };

  // Create a cached version of loadMessages
  const cachedLoadMessages = async (threadId: string, limit?: number): Promise<Message[]> => {
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
      messages = await UpstashMemory.getMessages(threadId);
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

    // Get from provider (only LibSQL supports agent state)
    let state;
    if (provider === 'libsql') {
      state = await LibSQLMemory.loadAgentState(threadId, agentId);
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
      messageId = await UpstashMemory.saveMessage(threadId, {
        role,
        content,
        metadata: options?.metadata
      });
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
      result = await UpstashMemory.deleteThread(threadId);
    }

    // Invalidate all caches for this thread
    invalidateThreadCache(threadId);

    return result;
  };

  // Return the appropriate memory interface based on provider
  switch (provider) {
    case 'libsql':
      return {
        createMemoryThread: LibSQLMemory.createMemoryThread,
        getMemoryThread: cachedGetMemoryThread,
        listMemoryThreads: LibSQLMemory.listMemoryThreads,
        deleteMemoryThread: cachedDeleteMemoryThread,
        saveMessage: cachedSaveMessage,
        loadMessages: cachedLoadMessages,
        generateEmbedding: LibSQLMemory.generateEmbedding,
        saveEmbedding: LibSQLMemory.saveEmbedding,
        semanticSearchMemory: LibSQLMemory.semanticSearchMemory,
        saveAgentState: cachedSaveAgentState,
        loadAgentState: cachedLoadAgentState,
      }
    case 'upstash':
      return {
        createMemoryThread: (name, options) => UpstashMemory.createThread(name, options?.metadata),
        getMemoryThread: cachedGetMemoryThread,
        listMemoryThreads: (options) => UpstashMemory.listThreads(options?.limit, options?.offset),
        deleteMemoryThread: cachedDeleteMemoryThread,
        saveMessage: cachedSaveMessage,
        loadMessages: cachedLoadMessages,
      }
    default:
      throw new Error(`Unsupported memory provider: ${provider}`)
  }
}

/**
 * Export a singleton memory instance with default caching enabled
 *
 * Usage:
 * ```typescript
 * import { memory } from '@/lib/memory/factory';
 *
 * // Create a thread
 * const threadId = await memory.createMemoryThread('My Thread');
 *
 * // Save a message (invalidates message cache for this thread)
 * await memory.saveMessage(threadId, 'user', 'Hello, world!');
 *
 * // Load messages (uses cache if available)
 * const messages = await memory.loadMessages(threadId);
 * ```
 *
 * To create a memory instance with custom cache settings:
 * ```typescript
 * import { createMemory } from '@/lib/memory/factory';
 *
 * const customMemory = createMemory({
 *   enabled: true,
 *   ttl: 1000 * 60 * 5, // 5 minutes
 *   maxSize: 200
 * });
 * ```
 *
 * To disable caching:
 * ```typescript
 * const uncachedMemory = createMemory({ enabled: false });
 * ```
 */
export const memory = createMemory()

// Re-export memory and persistence utilities
export * from './supabase'
export * from './db'

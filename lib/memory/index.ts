/**
 * Memory System Barrel File
 *
 * This file exports all memory-related functionality from the memory system.
 * It provides a unified API for creating, reading, updating, and deleting memory threads and messages,
 * as well as embedding operations, state management, and database abstractions.
 */

// Core memory operations
export * from './memory';

// Database clients and helpers
export { getLibSQLClient, isDatabaseAvailable, query, transaction } from './db';

// LibSQL direct operations
export {
  isLibSQLAvailable,
  getMemory,
  addMemory,
  getThreads,
  deleteThread,
  initVectorIndex,
  vectorSearch,
} from './libsql';

// Supabase integration
export {
  getSupabaseClient,
  getDrizzleClient,
  isSupabaseAvailable,
  getData,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getModelConfig,
  getModels,
  isSupabaseClient,
  isUpstashClient,
  type ClientType,
  type ErrorType,
} from './supabase';

// Drizzle ORM integration
export {
  getDrizzleClient as getDrizzleClientForSupabase,
  isDrizzleAvailable,
  getDataWithDrizzle,
} from './drizzle';

// Memory factory for provider abstraction
export {
  createMemoryProvider,
  getMemoryProvider,
  type MemoryInterface,
  type ThreadMetadata,
  type MessageOptions,
  type SearchOptions,
} from './factory';

// Upstash integration
export {
  // Client utilities
  getRedisClient,
  getVectorClient,
  checkUpstashAvailability,
  UpstashClientError,
  validateRedisConfig,
  validateVectorConfig,
  RedisConfigSchema,
  VectorConfigSchema,
  EnvVarsSchema,
  type IndexConfig,

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
  deleteThreadAgentStates,
  createAgentState,
  getAllAgentStates,
  AgentStateStoreError,
  AgentStateSchema,
  StoredAgentStateSchema,

  // Vector operations
  upsertEmbeddings,
  searchSimilarEmbeddings,
  getEmbeddingsByIds,
  deleteEmbeddingsByIds,

  // Memory processor for advanced operations
  MemoryProcessor,
  MemoryProcessorError,

  // Logging
  logInfo,
  logWarn,
  logError,
  logDebug,
  getLogs,
  deleteLogs,
  clearLogs,
  LoggerError,
  LogLevelSchema,
  LogEntrySchema,
  type LogLevel,
  type LogEntry,

  // Types
  type Thread as RedisThread,
  type Message as RedisMessage,
  Thread,
} from './upstash';

// Re-export types from memory.ts
export type {
  Thread,
  Message,
  EmbeddingModel,
  ThreadOptions,
  MessageOptions as MemoryMessageOptions,
} from './memory';

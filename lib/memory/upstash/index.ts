/**
 * Barrel file for the Upstash memory module.
 * Exports all necessary functions, types, and classes for interacting with
 * Upstash Redis and VectorDB as a memory store and logger.
 */

// From upstashClients.ts
export {
  getRedisClient,
  getVectorClient,
  checkUpstashAvailability,
  UpstashClientError,
  type RedisClient, // Re-exporting the type alias if needed by consumers
  type VectorClient // Re-exporting the type alias if needed by consumers
} from './upstashClients';

// From redis-store.ts
export {
  createRedisThread,
  getRedisThreadById,
  updateRedisThread,
  listRedisThreads,
  deleteRedisThread,
  createRedisMessage,
  getRedisMessageById,
  getRedisMessagesByThreadId,
  deleteRedisMessage,
  RedisStoreError,
  type Thread,
  type Message,
  type ThreadMetadata,
  type MessageMetadata
} from './redis-store';

// From vector-store.ts
export {
  upsertVectors,
  searchVectors,
  fetchVectorsById,
  deleteVectorsById,
  resetVectorIndex,
  getVectorIndexInfo,
  VectorStoreError,
  type VectorDocument,
  type VectorMetadata,
  type VectorSearchOptions,
  type VectorSearchResult
} from './vector-store';

// From upstash-logger.ts
export {
  logToUpstash,
  getUpstashLogs,
  LoggerError,
  type LogEntry,
  type LogQueryOptions
} from './upstash-logger';

// General type for the combined Upstash Memory Store (if we create a class wrapper later)
// For now, we export individual functions.

// Example of a combined interface if we were to create a unified class later:
/*
export interface IUpstashMemory {
  // Thread operations
  createThread: typeof createRedisThread;
  getThreadById: typeof getRedisThreadById;
  // ... other thread ops

  // Message operations
  createMessage: typeof createRedisMessage;
  // ... other message ops

  // Vector operations
  upsertVectors: typeof upsertVectors;
  // ... other vector ops

  // Logging
  log: typeof logToUpstash;
  getLogs: typeof getUpstashLogs;

  // Availability
  checkAvailability: typeof checkUpstashAvailability;
}
*/

// It's generally better to export the functions directly if a class wrapper isn't strictly necessary
// for state management or a more complex API contract.

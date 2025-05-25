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
  validateRedisConfig,
  validateVectorConfig,
  RedisConfigSchema,
  VectorConfigSchema,
  EnvVarsSchema,
  type IndexConfig,
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
  createRedisSettings,
  getRedisSettingsById,
  updateRedisSettings,
  deleteRedisSettings,
  listRedisSettings,
  createRedisSystemMetric,
  getRedisSystemMetricById,
  updateRedisSystemMetric,
  deleteRedisSystemMetric,
  listRedisSystemMetrics,
  createRedisTrace,
  getRedisTraceById,
  updateRedisTrace,
  deleteRedisTrace,
  listRedisTraces,
  createRedisSpan,
  getRedisSpanById,
  updateRedisSpan,
  deleteRedisSpan,
  listRedisSpans,
  createRedisEvent,
  getRedisEventById,
  updateRedisEvent,
  deleteRedisEvent,
  listRedisEvents,
  createRedisProvider,
  getRedisProviderById,
  updateRedisProvider,
  deleteRedisProvider,
  listRedisProviders,
  createRedisModel,
  getRedisModelById,
  updateRedisModel,
  deleteRedisModel,
  listRedisModels,
  createRedisAuthProvider,
  getRedisAuthProviderById,
  updateRedisAuthProvider,
  deleteRedisAuthProvider,
  listRedisAuthProviders,
  createRedisDashboardConfig,
  getRedisDashboardConfigById,
  updateRedisDashboardConfig,
  deleteRedisDashboardConfig,
  listRedisDashboardConfigs,
} from './redis-store';

// From vector-store.ts
export {
  upsertEmbeddings,
  searchSimilarEmbeddings,
  getEmbeddingsByIds,
  deleteEmbeddingsByIds,
  resetVectorIndex,
  getVectorIndexInfo,
  VectorStoreError,
  type EmbeddingMetadata,
  type EmbeddingVector,
  type SearchEmbeddingsOptions,
  type EmbeddingSearchResult,
} from './vector-store';

// From upstash-logger.ts
export {
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
} from './upstash-logger';

// From agent-state-store.ts
export {
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
} from './agent-state-store';

// From memory-processor.ts
export { MemoryProcessor, MemoryProcessorError } from './memory-processor';

// From upstashTypes.ts
export {
  RedisClientError,
  VectorStoreError as VectorClientError,
  VectorMetadataSchema,
  VectorDocumentSchema,
  type VectorMetadata as VectorClientMetadata,
  type VectorDocument as VectorClientDocument,
  type RedisClientConfig,
  type VectorStoreConfig,
  type VectorQueryOptions,
  type VectorQueryResult,
  type VectorFetchResult,
  type RedisPipeline,
  type VectorIndexConfig,
  type RedisType,
  type IndexType,
  type VectorType,
  type ZodType,
} from '../../shared/types/upstashTypes';

// From stream-processor.ts
export {
  streamProcessor,
  StreamProcessor,
  StreamProcessorError,
  type StreamProcessorOptions,
  type RedisStreamOptions,
  type VectorStreamOptions,
} from './stream-processor';

// From supabase-adapter.ts
export {
  getData,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  vectorSearch,
  upsertVectors as upsertSupabaseVectors,
  type TableRow,
  type FilterOptions,
  type OrderOptions,
  type QueryOptions,
} from './supabase-adapter';

// From supabase-adapter-factory.ts
export {
  createSupabaseClient,
  type SupabaseClient,
  type TableClient,
  type VectorClient,
} from './supabase-adapter-factory';

import { z } from 'zod';

// --- Error Classes ---
export class RedisClientError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'RedisClientError';
    this.cause = cause;
  }
}

export class VectorStoreError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'VectorStoreError';
    this.cause = cause;
  }
}

export class RedisStoreError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'RedisStoreError';
    this.cause = cause;
    if (cause) this.stack += '\nCaused by: ' + (cause instanceof Error ? cause.stack : String(cause));
  }
}

// --- Zod Schemas ---
export const VectorMetadataSchema = z.record(z.any()).and(
  z.object({
    text: z.string().optional(),
    source_url: z.string().optional(),
    document_id: z.string().optional(),
    chunk_id: z.string().optional(),
    user_id: z.string().optional(),
    created_at: z.string().optional(),
  }).partial()
);

export const VectorDocumentSchema = z.object({
  id: z.string(),
  vector: z.array(z.number()),
  metadata: VectorMetadataSchema.optional(),
  sparseVector: z
    .object({
      indices: z.array(z.number()),
      values: z.array(z.number()),
    })
    .optional(),
});

// --- Types ---
export type VectorMetadata = z.infer<typeof VectorMetadataSchema>;
export type VectorDocument = z.infer<typeof VectorDocumentSchema>;

export interface RedisClientConfig {
  url: string;
  token: string;
}

export interface VectorStoreConfig {
  url: string;
  token: string;
  dimensions?: number;
  similarity?: 'cosine' | 'euclidean' | 'dot';
  indexName?: string;
}

export interface VectorQueryOptions {
  topK?: number;
  includeVectors?: boolean;
  includeMetadata?: boolean;
  filter?: Record<string, unknown>;
}

export interface VectorQueryResult {
  id: string;
  score: number;
  vector?: number[];
  metadata?: VectorMetadata;
}

export interface VectorFetchResult<T = VectorMetadata> {
  id: string;
  vector?: number[];
  metadata?: T;
}

export type RedisPipeline = Array<{ command: string; args: unknown[] }>;

export interface VectorIndexConfig {
  name: string;
  dimensions: number;
  similarity: 'cosine' | 'euclidean' | 'dot';
}

export type RedisType = 'hash' | 'set' | 'zset' | 'stream';
export type IndexType = 'flat' | 'hnsw';
export type VectorType = 'dense' | 'sparse';
export type ZodType = typeof z;

// --- Additional Types for Query/Hybrid Search ---
export interface VectorSearchOptions {
  query: number[] | string;
  topK?: number;
  filter?: Record<string, unknown>;
  includeVectors?: boolean;
  includeMetadata?: boolean;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  vector?: number[];
  metadata?: VectorMetadata;
}

// --- Upstash Memory Types ---
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

export type RedisHashData = Record<string, string | number | boolean | null>;

// --- RediSearch / @upstash/query Types & Schemas ---
export interface RediSearchQueryOptions {
  index: string;
  query: string;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  offset?: number;
  limit?: number;
}

export const RediSearchResultSchema = z.object({
  id: z.string(),
  score: z.number().optional(),
  fields: z.record(z.any()),
});
export type RediSearchResult = z.infer<typeof RediSearchResultSchema>;

export interface QueryIndexOptions {
  name: string;
  terms: string[];
}

export interface QueryMatchOptions {
  [key: string]: string | number | boolean;
}

export interface QueryRangeOptions {
  [key: string]: { gte?: number; lte?: number; gt?: number; lt?: number };
}

export interface QueryDocResult<T = Record<string, unknown>> {
  id: string;
  data: T;
}

// --- RediSearch/Hybrid Search Types ---
export interface RediSearchHybridQuery {
  index: string;
  query: string;
  vector?: number[];
  hybrid?: boolean;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  offset?: number;
  limit?: number;
}

export const RediSearchHybridQuerySchema = z.object({
  index: z.string(),
  query: z.string(),
  vector: z.array(z.number()).optional(),
  hybrid: z.boolean().optional(),
  filters: z.record(z.any()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional(),
  offset: z.number().optional(),
  limit: z.number().optional(),
});

export const RediSearchHybridResultSchema = z.object({
  id: z.string(),
  score: z.number().optional(),
  fields: z.record(z.any()),
  vector: z.array(z.number()).optional(),
  metadata: z.record(z.any()).optional(),
});
export type RediSearchHybridResult = z.infer<typeof RediSearchHybridResultSchema>;

// --- QStash/Workflow Types ---
export interface QStashTaskPayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

export const QStashTaskPayloadSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.any()),
  created_at: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
  result: z.any().optional(),
  error: z.string().optional(),
});

export interface WorkflowNode {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error?: string;
  tags?: string[];
  commands?: string[];
  relationships?: string[];
}

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  error: z.string().optional(),
  tags: z.array(z.string()).optional(),
  commands: z.array(z.string()).optional(),
  relationships: z.array(z.string()).optional(),
});

// --- Generic Upstash Entity Types ---
export interface UpstashEntityBase {
  id: string;
  type: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export const UpstashEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z.record(z.any()).optional(),
});

// Thread entity (for chat, memory, etc)
export interface ThreadEntity extends UpstashEntityBase {
  name?: string | null;
  user_id?: string | null;
  agent_id?: string | null;
  messages?: string[]; // message IDs
}
export const ThreadEntitySchema = UpstashEntitySchema.extend({
  name: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
  agent_id: z.string().nullable().optional(),
  messages: z.array(z.string()).optional(),
});

// Message entity (for chat, memory, etc)
export interface MessageEntity extends UpstashEntityBase {
  thread_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
}
export const MessageEntitySchema = UpstashEntitySchema.extend({
  thread_id: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  name: z.string().optional(),
});

// AgentState entity (for agent state store)
export interface AgentStateEntity extends UpstashEntityBase {
  thread_id: string;
  agent_id: string;
  state: Record<string, unknown>;
}
export const AgentStateEntitySchema = UpstashEntitySchema.extend({
  thread_id: z.string(),
  agent_id: z.string(),
  state: z.record(z.any()),
});

// ToolExecution entity (for tool execution store)
export interface ToolExecutionEntity extends UpstashEntityBase {
  tool_id: string;
  thread_id?: string;
  agent_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}
export const ToolExecutionEntitySchema = UpstashEntitySchema.extend({
  tool_id: z.string(),
  thread_id: z.string().optional(),
  agent_id: z.string().optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  result: z.any().optional(),
  error: z.string().optional(),
});

// WorkflowNode entity (for workflow orchestration)
export interface WorkflowNodeEntity extends UpstashEntityBase {
  workflow_id: string;
  node_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error?: string;
  tags?: string[];
  commands?: string[];
  relationships?: string[];
}
export const WorkflowNodeEntitySchema = UpstashEntitySchema.extend({
  workflow_id: z.string(),
  node_type: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  error: z.string().optional(),
  tags: z.array(z.string()).optional(),
  commands: z.array(z.string()).optional(),
  relationships: z.array(z.string()).optional(),
});

// LogEntry entity (for logging)
export interface LogEntryEntity extends UpstashEntityBase {
  level: LogLevel;
  message: string;
}
export const LogEntryEntitySchema = UpstashEntitySchema.extend({
  level: z.enum(['info', 'warn', 'error', 'debug']),
  message: z.string(),
});

// --- UserEntity ---
export interface UserEntity extends UpstashEntityBase {
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  role: string;
}
export const UserEntitySchema = UpstashEntitySchema.extend({
  email: z.string().email(),
  name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  role: z.string(),
});

// --- WorkflowEntity ---
export interface WorkflowEntity extends UpstashEntityBase {
  name: string;
  description?: string | null;
  current_step_index: number;
  status: string;
  metadata?: Record<string, unknown>;
}
export const WorkflowEntitySchema = UpstashEntitySchema.extend({
  name: z.string(),
  description: z.string().nullable().optional(),
  current_step_index: z.number(),
  status: z.string(),
  metadata: z.record(z.any()).optional(),
});

// --- SettingsEntity ---
export interface SettingsEntity extends UpstashEntityBase {
  category: string;
  key: string;
  value: string;
}
export const SettingsEntitySchema = UpstashEntitySchema.extend({
  category: z.string(),
  key: z.string(),
  value: z.string(),
});

// --- SystemMetricEntity ---
export interface SystemMetricEntity extends UpstashEntityBase {
  time_range?: string;
  timestamp: string;
  cpu_usage?: number;
  memory_usage?: number;
  database_connections?: number;
  api_requests_per_minute?: number;
  average_response_time_ms?: number;
  active_users?: number;
}
export const SystemMetricEntitySchema = UpstashEntitySchema.extend({
  time_range: z.string().optional(),
  timestamp: z.string(),
  cpu_usage: z.number().optional(),
  memory_usage: z.number().optional(),
  database_connections: z.number().optional(),
  api_requests_per_minute: z.number().optional(),
  average_response_time_ms: z.number().optional(),
  active_users: z.number().optional(),
});

// --- TraceEntity (Observability) ---
export interface TraceEntity extends UpstashEntityBase {
  name: string;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  status: string;
  user_id?: string;
  session_id?: string;
}
export const TraceEntitySchema = UpstashEntitySchema.extend({
  name: z.string(),
  start_time: z.string(),
  end_time: z.string().optional(),
  duration_ms: z.number().optional(),
  status: z.string(),
  user_id: z.string().optional(),
  session_id: z.string().optional(),
});

// --- SpanEntity (Observability) ---
export interface SpanEntity extends UpstashEntityBase {
  trace_id: string;
  parent_span_id?: string;
  name: string;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  status: string;
  attributes?: Record<string, unknown>;
}
export const SpanEntitySchema = UpstashEntitySchema.extend({
  trace_id: z.string(),
  parent_span_id: z.string().optional(),
  name: z.string(),
  start_time: z.string(),
  end_time: z.string().optional(),
  duration_ms: z.number().optional(),
  status: z.string(),
  attributes: z.record(z.any()).optional(),
});

// --- EventEntity (Observability) ---
export interface EventEntity extends UpstashEntityBase {
  trace_id: string;
  span_id?: string;
  name: string;
  timestamp: string;
  attributes?: Record<string, unknown>;
}
export const EventEntitySchema = UpstashEntitySchema.extend({
  trace_id: z.string(),
  span_id: z.string().optional(),
  name: z.string(),
  timestamp: z.string(),
  attributes: z.record(z.any()).optional(),
});

// --- ProviderEntity ---
export interface ProviderEntity extends UpstashEntityBase {
  name: string;
  api_key?: string;
  base_url?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}
export const ProviderEntitySchema = UpstashEntitySchema.extend({
  name: z.string(),
  api_key: z.string().optional(),
  base_url: z.string().optional(),
  status: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// --- ModelEntity ---
export interface ModelEntity extends UpstashEntityBase {
  name: string;
  provider: string;
  model_id: string;
  max_tokens?: number;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  supports_vision?: boolean;
  supports_functions?: boolean;
  supports_streaming?: boolean;
  default_temperature?: number;
  default_top_p?: number;
  default_frequency_penalty?: number;
  default_presence_penalty?: number;
  context_window?: number;
  description?: string;
  category?: string;
  capabilities?: Record<string, unknown>;
  base_url?: string;
  api_key?: string;
  status?: string;
}
export const ModelEntitySchema = UpstashEntitySchema.extend({
  name: z.string(),
  provider: z.string(),
  model_id: z.string(),
  max_tokens: z.number().optional(),
  input_cost_per_token: z.number().optional(),
  output_cost_per_token: z.number().optional(),
  supports_vision: z.boolean().optional(),
  supports_functions: z.boolean().optional(),
  supports_streaming: z.boolean().optional(),
  default_temperature: z.number().optional(),
  default_top_p: z.number().optional(),
  default_frequency_penalty: z.number().optional(),
  default_presence_penalty: z.number().optional(),
  context_window: z.number().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  capabilities: z.record(z.any()).optional(),
  base_url: z.string().optional(),
  api_key: z.string().optional(),
  status: z.string().optional(),
});

// --- AuthProviderEntity ---
export interface AuthProviderEntity extends UpstashEntityBase {
  provider: string;
  user_id: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}
export const AuthProviderEntitySchema = UpstashEntitySchema.extend({
  provider: z.string(),
  user_id: z.string(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_at: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// --- DashboardConfigEntity ---
export interface DashboardConfigEntity extends UpstashEntityBase {
  user_id?: string;
  widgets?: Record<string, unknown>[];
  layout?: Record<string, unknown>;
}
export const DashboardConfigEntitySchema = UpstashEntitySchema.extend({
  user_id: z.string().optional(),
  widgets: z.array(z.record(z.any())).optional(),
  layout: z.record(z.any()).optional(),
});

// --- Logging Types & Schemas ---
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export const LogEntrySchema = z.object({
  id: z.string(),
  level: z.string(),
  message: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.any()).optional(),
});
export type LogEntry = z.infer<typeof LogEntrySchema>;

export interface LogQueryOptions {
  level?: LogLevel;
  startTime?: string; // ISO 8601
  endTime?: string;   // ISO 8601
  limit?: number;
  offset?: number;
}

// --- Advanced Log Query Options ---
export interface AdvancedLogQueryOptions extends LogQueryOptions {
  thread_id?: string;
  agent_id?: string;
  workflow_id?: string;
  tool_id?: string;
  search?: string;
}

export const AdvancedLogQueryOptionsSchema = LogEntrySchema.extend({
  thread_id: z.string().optional(),
  agent_id: z.string().optional(),
  workflow_id: z.string().optional(),
  tool_id: z.string().optional(),
  search: z.string().optional(),
});

// --- Agent State Types & Schemas ---
export const AgentStateSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  agent_id: z.string(),
  state: z.record(z.any()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AgentState = z.infer<typeof AgentStateSchema>;

export const StoredAgentStateSchema = AgentStateSchema.extend({
  metadata: z.record(z.any()).optional(),
});
export type StoredAgentState = z.infer<typeof StoredAgentStateSchema>;

export class AgentStateStoreError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AgentStateStoreError';
    this.cause = cause;
  }
}

// --- Thread/Message Search Result Types ---
export const ThreadSearchResultSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  user_id: z.string().nullable().optional(),
  agent_id: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  score: z.number().optional(),
});
export type ThreadSearchResult = z.infer<typeof ThreadSearchResultSchema>;

export const MessageSearchResultSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  role: z.string(),
  content: z.string(),
  created_at: z.string(),
  metadata: z.record(z.any()).nullable().optional(),
  name: z.string().optional(),
  score: z.number().optional(),
});
export type MessageSearchResult = z.infer<typeof MessageSearchResultSchema>;

// --- ListEntitiesOptions ---
export interface ListEntitiesOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  select?: string[];
}
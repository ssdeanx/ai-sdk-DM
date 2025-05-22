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
    if (cause)
      this.stack +=
        '\nCaused by: ' +
        (cause instanceof Error ? cause.stack : String(cause));
  }
}

// --- Zod Schemas ---
export const VectorMetadataSchema = z.record(z.any()).and(
  z
    .object({
      text: z.string().optional(),
      source_url: z.string().optional(),
      document_id: z.string().optional(),
      chunk_id: z.string().optional(),
      user_id: z.string().optional(),
      created_at: z.string().optional(),
    })
    .partial()
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
  role: 'user' | 'assistant' | 'system' | 'tool';
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
export type RediSearchHybridResult = z.infer<
  typeof RediSearchHybridResultSchema
>;

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
export const UpstashEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z.record(z.any()).optional(),
});

/**
 * App entity (for app management, compatible with both Supabase and LibSQL)
 */
export interface AppEntity {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  code: string;
  parameters_schema?: Record<string, unknown> | string | null;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
  updated_at: string;
}
export const AppEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  code: z.string(),
  parameters_schema: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  metadata: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * AppCodeBlock entity (for code blocks in apps)
 */
export interface AppCodeBlockEntity {
  id: string;
  type: string;
  app_id: string;
  language: string;
  code: string;
  description?: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}
export const AppCodeBlockEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  app_id: z.string(),
  language: z.string(),
  code: z.string(),
  description: z.string().nullable().optional(),
  order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Integration entity (for integrations)
 */
export interface IntegrationEntity {
  id: string;
  type: string;
  user_id: string;
  provider: string;
  name?: string | null;
  config?: Record<string, unknown> | string | null;
  credentials?: Record<string, unknown> | string | null;
  status: string;
  last_synced_at?: string | null;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
  updated_at: string;
}
export const IntegrationEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  user_id: z.string(),
  provider: z.string(),
  name: z.string().nullable().optional(),
  config: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  credentials: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  status: z.string(),
  last_synced_at: z.string().nullable().optional(),
  metadata: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * File entity (for files in apps)
 */
export interface FileEntity {
  id: string;
  type: string;
  app_id: string;
  parent_id?: string | null;
  name: string;
  file_type: string;
  content?: string | null;
  created_at: string;
  updated_at: string;
}
export const FileEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  app_id: z.string(),
  parent_id: z.string().nullable().optional(),
  name: z.string(),
  file_type: z.string(),
  content: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * TerminalSession entity (for terminal sessions)
 */
export interface TerminalSessionEntity {
  id: string;
  type: string;
  app_id: string;
  user_id: string;
  command: string;
  output?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}
export const TerminalSessionEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  app_id: z.string(),
  user_id: z.string(),
  command: z.string(),
  output: z.string().nullable().optional(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * AgentPersona entity
 */
export interface AgentPersonaEntity {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
  updated_at: string;
}
export const AgentPersonaEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  metadata: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Agent entity
 */
export interface AgentEntity {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
  updated_at: string;
}
export const AgentEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  metadata: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Tool entity
 */
export interface ToolEntity {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
  updated_at: string;
}
export const ToolEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  metadata: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * WorkflowStep entity
 */
export interface WorkflowStepEntity {
  id: string;
  type: string;
  workflow_id: string;
  agent_id: string;
  input?: string | null;
  thread_id: string;
  status: string;
  result?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
  updated_at: string;
}
export const WorkflowStepEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  workflow_id: z.string(),
  agent_id: z.string(),
  input: z.string().nullable().optional(),
  thread_id: z.string(),
  status: z.string(),
  result: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  metadata: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * AgentTool entity
 */
export interface AgentToolEntity {
  id: string;
  type: string;
  agent_id: string;
  tool_id: string;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
  updated_at: string;
}
export const AgentToolEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  agent_id: z.string(),
  tool_id: z.string(),
  metadata: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Setting entity
 */
export interface SettingEntity {
  id: string;
  type: string;
  category: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}
export const SettingEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  category: z.string(),
  key: z.string(),
  value: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * BlogPost entity
 */
export interface BlogPostEntity {
  id: string;
  type: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}
export const BlogPostEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  author_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * MdxDocument entity
 */
export interface MdxDocumentEntity {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
  updated_at: string;
}
export const MdxDocumentEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  metadata: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Message entity (LibSQL)
 */
export interface MessageLibSQLEntity {
  id: string;
  type: string;
  memory_thread_id: string;
  role: string;
  content: string;
  tool_call_id?: string | null;
  tool_name?: string | null;
  token_count?: number | null;
  embedding_id?: string | null;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
}
export const MessageLibSQLEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  memory_thread_id: z.string(),
  role: z.string(),
  content: z.string(),
  tool_call_id: z.string().nullable().optional(),
  tool_name: z.string().nullable().optional(),
  token_count: z.number().nullable().optional(),
  embedding_id: z.string().nullable().optional(),
  metadata: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  created_at: z.string(),
});

/**
 * MemoryThread entity (LibSQL)
 */
export interface MemoryThreadEntity {
  id: string;
  type: string;
  agent_id?: string | null;
  network_id?: string | null;
  name: string;
  summary?: string | null;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
  updated_at: string;
}
export const MemoryThreadEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  agent_id: z.string().nullable().optional(),
  network_id: z.string().nullable().optional(),
  name: z.string(),
  summary: z.string().nullable().optional(),
  metadata: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Embedding entity (LibSQL)
 */
export interface EmbeddingEntity {
  id: string;
  type: string;
  vector: number[];
  model?: string | null;
  dimensions?: number | null;
  created_at: string;
}
export const EmbeddingEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  vector: z.array(z.number()),
  model: z.string().nullable().optional(),
  dimensions: z.number().nullable().optional(),
  created_at: z.string(),
});

/**
 * GqlCache entity (LibSQL)
 */
export interface GqlCacheEntity {
  id: string;
  type: string;
  query: string;
  variables?: Record<string, unknown> | string | null;
  response?: string | null;
  createdAt: string;
}
export const GqlCacheEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  query: z.string(),
  variables: z
    .union([z.record(z.any()), z.string()])
    .optional()
    .nullable(),
  response: z.string().nullable().optional(),
  createdAt: z.string(),
});

import { Redis } from "@upstash/redis";
import { Index, Vector } from "@upstash/vector";
import { z } from 'zod';

// --- Error Classes ---
export class RedisClientError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'RedisClientError';
  }
}

export class VectorStoreError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'VectorStoreError';
  }
}

export class RedisStoreError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'RedisStoreError';
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

// --- Export for completeness ---
export type { VectorQueryOptions as QueryOptions, VectorQueryResult as QueryResult, VectorFetchResult as FetchResult };
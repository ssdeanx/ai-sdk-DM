import { Redis } from "@upstash/redis";
import { Index, Vector, QueryResult, FetchResult, IndexConfig as UpstashVectorIndexConfig } from "@upstash/vector";
import { z } from 'zod';

// --- Client Types & Errors ---

/**
 * Custom error class for Redis client operations.
 */
export class RedisClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisClientError";
    Object.setPrototypeOf(this, RedisClientError.prototype);
  }
}

// --- Vector Store Types & Errors ---

/**
 * Custom error class for Vector store operations.
 */
export class VectorStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VectorStoreError";
    Object.setPrototypeOf(this, VectorStoreError.prototype);
  }
}

/**
 * Metadata for an embedding. Can be any JSON-serializable object.
 * Strictly typed, with extension fields as unknown for type safety.
 */
export interface VectorMetadata {
  text?: string;
  source_url?: string;
  document_id?: string;
  chunk_id?: string;
  user_id?: string;
  created_at?: string;
  [key: string]: unknown; // Use unknown for extension fields
}

/**
 * Represents a vector document to be upserted into the Upstash Vector database.
 * Includes the vector, its ID, and associated metadata.
 * Uses strict types from @upstash/vector and VectorMetadata.
 */
export interface VectorDocument extends Vector {
  metadata?: VectorMetadata;
  // data?: string; // The 'data' field from @upstash/vector's Vector type can be used for string content
}

// --- Zod Schemas ---

/**
 * Schema for vector metadata (strict, extension fields as unknown)
 */
export const VectorMetadataSchema = z.object({
  text: z.string().optional(),
  source_url: z.string().optional(),
  document_id: z.string().optional(),
  chunk_id: z.string().optional(),
  user_id: z.string().optional(),
  created_at: z.string().optional(),
}).catchall(z.unknown());

/**
 * Schema for vector document
 */
export const VectorDocumentSchema = z.object({
  id: z.string(),
  vector: z.array(z.number()),
  metadata: VectorMetadataSchema.optional(),
  data: z.string().optional(),
});

// --- Redis Client Configuration ---

/**
 * Configuration options for Redis client.
 */
export interface RedisClientConfig {
  url: string;
  token: string;
  cache?: boolean;
}

// --- Vector Store Configuration ---

/**
 * Configuration options for Vector store.
 */
export interface VectorStoreConfig {
  url: string;
  token: string;
  indexName: string;
  dimensions?: number;
  similarity?: 'cosine' | 'euclidean' | 'dot';
}

// --- Query Types ---

/**
 * Options for vector search queries.
 */
export interface VectorQueryOptions {
  topK?: number;
  filter?: Record<string, unknown>;
  includeMetadata?: boolean;
  includeVectors?: boolean;
  namespace?: string;
}

/**
 * Result of a vector search query.
 */
export type VectorQueryResult = QueryResult;

/**
 * Result of fetching vectors by IDs.
 */
export type VectorFetchResult = FetchResult;

// --- Utility Types ---

/**
 * Type for Redis pipeline operations.
 */
export type RedisPipeline = ReturnType<Redis['pipeline']>;

/**
 * Type for Upstash Vector index configuration.
 */
export type VectorIndexConfig = UpstashVectorIndexConfig;

// Use all imported types to prevent unused import warnings
export type RedisType = Redis;
export type IndexType = Index;
export type VectorType = Vector;
export type ZodType = typeof z;
import { Redis } from "@upstash/redis";
import { Index, Vector, QueryResult, FetchResult, IndexConfig as UpstashVectorIndexConfig } from "@upstash/vector";
import { z } from 'zod'; // Add zod import

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
 */
export interface VectorMetadata { // Renamed from EmbeddingMetadata for consistency
  text?: string; // The original text chunk, often useful to store
  source_url?: string;
  document_id?: string;
  chunk_id?: string;
  user_id?: string;
  created_at?: string; // ISO 8601 timestamp
  [key: string]: any; // Allow other arbitrary metadata
}

/**
 * Represents a vector document to be upserted into the Upstash Vector database.
 * Includes the vector, its ID, and associated metadata.
 */
export interface VectorDocument extends Vector { // Renamed from EmbeddingVector
  // id: string; // Already in Vector type from @upstash/vector
  // vector: number[]; // Already in Vector type
  metadata?: VectorMetadata;
  // data?: string; // The 'data' field from @upstash/vector's Vector type can be used for string content
}

// --- Zod Schemas ---

/**
 * Schema for vector metadata
 */
export const VectorMetadataSchema = z.object({
  text: z.string().optional(),
  source_url: z.string().optional(),
  document_id: z.string().optional(),
  chunk_id: z.string().optional(),
  user_id: z.string().optional(),
  created_at: z.string().optional(),
}).catchall(z.any());

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
  filter?: Record<string, any>;
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
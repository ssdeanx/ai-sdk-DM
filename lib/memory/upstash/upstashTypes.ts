import { Redis } from "@upstash/redis";
import { Index, Vector, QueryResult, FetchResult, IndexConfig as UpstashVectorIndexConfig } from "@upstash/vector";

// --- Client Types & Errors ---

/**
 * Custom error class for Redis client operations.
 */
export class RedisClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisClientError";
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
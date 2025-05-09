import { v4 as uuidv4 } from 'uuid';
import { getVectorClient } from './upstashClients';
import type { Index, Vector, QueryResult, FetchResult } from '@upstash/vector';

// --- Types ---

/**
 * Metadata for an embedding. Can be any JSON-serializable object.
 * It's recommended to include fields that might be useful for filtering searches.
 */
export interface EmbeddingMetadata {
  text?: string; // The original text chunk, often useful to store
  source_url?: string;
  document_id?: string;
  chunk_id?: string;
  user_id?: string;
  created_at?: string; // ISO 8601 timestamp
  [key: string]: any; // Allow other arbitrary metadata
}

/**
 * Represents a vector to be upserted into the Upstash Vector database.
 */
export interface EmbeddingVector extends Vector {
  id: string; // Unique ID for the vector
  vector: number[];
  metadata?: EmbeddingMetadata;
}

/**
 * Options for querying similar embeddings.
 */
export interface SearchEmbeddingsOptions {
  topK?: number;
  includeVectors?: boolean;
  includeMetadata?: boolean;
  filter?: string; // Upstash Vector metadata filter string (e.g., "user_id = 'abc' AND type = 'document'")
}

/**
 * Represents a search result from Upstash Vector.
 */
export interface EmbeddingSearchResult extends QueryResult {
  id: string;
  score: number;
  vector?: number[];
  metadata?: EmbeddingMetadata;
}

// --- Error Handling ---
export class VectorStoreError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "VectorStoreError";
  }
}

// --- Vector Operations ---

/**
 * Upserts (inserts or updates) one or more embedding vectors into the Upstash Vector index.
 * @param embeddings An array of EmbeddingVector objects or a single EmbeddingVector.
 * @returns A promise that resolves with the result of the upsert operation from Upstash.
 * @throws VectorStoreError if upsertion fails.
 */
export async function upsertEmbeddings(
  embeddings: EmbeddingVector | EmbeddingVector[]
): Promise<any> { // The Upstash SDK returns `Promise<string>` for upsert, often "OK"
  const vectorDb: Index = getVectorClient();
  try {
    const result = await vectorDb.upsert(embeddings);
    return result;
  } catch (error) {
    console.error("Error upserting embeddings to Upstash Vector:", error);
    throw new VectorStoreError("Failed to upsert embeddings", error);
  }
}

/**
 * Searches for embeddings similar to a given query vector.
 * @param queryVector The vector to find similar embeddings for.
 * @param options Optional search parameters (topK, includeVectors, includeMetadata, filter).
 * @returns A promise that resolves to an array of EmbeddingSearchResult objects.
 * @throws VectorStoreError if the search fails.
 */
export async function searchSimilarEmbeddings(
  queryVector: number[],
  options?: SearchEmbeddingsOptions
): Promise<EmbeddingSearchResult[]> {
  const vectorDb: Index = getVectorClient();
  const { topK = 10, includeVectors = false, includeMetadata = true, filter } = options || {};

  try {
    const results = await vectorDb.query({
      vector: queryVector,
      topK,
      includeVectors,
      includeMetadata,
      filter,
    });
    return results as EmbeddingSearchResult[]; // Cast to ensure metadata type
  } catch (error) {
    console.error("Error searching embeddings in Upstash Vector:", error);
    throw new VectorStoreError("Failed to search embeddings", error);
  }
}

/**
 * Fetches one or more embedding vectors by their IDs.
 * @param ids An array of vector IDs or a single vector ID.
 * @param includeVectors Whether to include the vector data in the result (default: false).
 * @param includeMetadata Whether to include metadata in the result (default: true).
 * @returns A promise that resolves to an array of fetched EmbeddingVector objects (or null if not found), or a single object/null.
 * @throws VectorStoreError if fetching fails.
 */
export async function getEmbeddingsByIds(
  ids: string | string[],
  includeVectors: boolean = false,
  includeMetadata: boolean = true
): Promise<Array<FetchResult<EmbeddingMetadata> | null> | FetchResult<EmbeddingMetadata> | null> {
  const vectorDb: Index = getVectorClient();
  try {
    const normalizedIds = Array.isArray(ids) ? ids : [ids];
    const results = await vectorDb.fetch(normalizedIds, { includeVectors, includeMetadata });
    return results as Array<FetchResult<EmbeddingMetadata> | null> | FetchResult<EmbeddingMetadata> | null;
  } catch (error) {
    console.error("Error fetching embeddings by ID from Upstash Vector:", error);
    throw new VectorStoreError("Failed to fetch embeddings by ID", error);
  }
}
/**
 * Deletes one or more embedding vectors by their IDs.
 * @param ids An array of vector IDs or a single vector ID.
 * @returns A promise that resolves with the result of the delete operation from Upstash.
 * @throws VectorStoreError if deletion fails.
 */
export async function deleteEmbeddingsByIds(ids: string | string[]): Promise<any> { // Upstash SDK returns `Promise<number>` (count of deleted vectors)
  const vectorDb: Index = getVectorClient();
  try {
    const result = await vectorDb.delete(ids);
    return result;
  } catch (error) {
    console.error("Error deleting embeddings by ID from Upstash Vector:", error);
    throw new VectorStoreError("Failed to delete embeddings by ID", error);
  }
}

/**
 * Resets the entire vector index, deleting all vectors. Use with extreme caution.
 * @returns A promise that resolves when the reset operation is complete.
 * @throws VectorStoreError if reset fails.
 */
export async function resetVectorIndex(): Promise<void> {
  const vectorDb: Index = getVectorClient();
  try {
    await vectorDb.reset();
  } catch (error) {
    console.error("Error resetting Upstash Vector index:", error);
    throw new VectorStoreError("Failed to reset vector index", error);
  }
}

/**
 * Gets information about the vector index, such as vector count, pending vector count, and dimension.
 * @returns A promise that resolves with the index information.
 * @throws VectorStoreError if fetching info fails.
 */
export async function getVectorIndexInfo(): Promise<any> { // Upstash SDK returns `Promise<InfoResult>`
  const vectorDb: Index = getVectorClient();
  try {
    const info = await vectorDb.info();
    return info;
  } catch (error) {
    console.error("Error fetching Upstash Vector index info:", error);
    throw new VectorStoreError("Failed to fetch vector index info", error);
  }
}

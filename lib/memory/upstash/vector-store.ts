import { generateId } from 'ai';
import {
  getVectorClient,
  isUpstashVectorAvailable,
  runRediSearchHybridQuery,
  enqueueQStashTask,
  trackWorkflowNode,
} from './upstashClients';
import type { Index, Vector, QueryResult, FetchResult } from '@upstash/vector';
import { generateEmbedding } from '../../ai-integration';
import { z } from 'zod';
import {
  RediSearchHybridQuery,
  RediSearchHybridResult,
  QStashTaskPayload,
  WorkflowNode,
  UpstashEntityBase,
  VectorMetadataSchema, // Centralized
  VectorMetadata, // Centralized
  VectorDocumentSchema, // Centralized
  VectorDocument, // Centralized
  VectorQueryOptions, // Centralized (Interface)
  VectorSearchResultSchema, // Centralized
  VectorSearchResult, // Centralized
} from '../../../types/upstashTypes';
import { upstashLogger } from './upstash-logger';

// --- Zod Schemas ---

// Local Zod schema for VectorQueryOptions as it's an interface in upstashTypes.ts
// This is needed if SearchEmbeddingsOptionsSchema was used for parsing.
export const VectorQueryOptionsSchema = z.object({
  topK: z.number().positive().optional().default(10),
  includeVectors: z.boolean().optional().default(false),
  includeMetadata: z.boolean().optional().default(true),
  filter: z.string().optional(), // Assuming filter in VectorQueryOptions is string. If it's Record<string, unknown> in upstashTypes, this needs adjustment.
  // Check types/upstashTypes.ts: VectorQueryOptions has filter?: Record<string, unknown>;
  // The @upstash/vector client `query` method expects filter as a string.
  // So, if VectorQueryOptions.filter is Record, it needs to be stringified before passing to client.
  // For now, aligning with client expectation of string filter.
});


// --- Types ---
// Local types are removed, using centralized ones from upstashTypes.ts

// --- Error Handling ---
// VectorStoreError is imported from upstashTypes.ts.

// --- Vector Operations ---

/**
 * Upserts (inserts or updates) one or more embedding vectors into the Upstash Vector index.
 * @param embeddings An array of VectorDocument objects or a single VectorDocument.
 * @returns A promise that resolves with the result of the upsert operation from Upstash.
 * @throws VectorStoreError if upsertion fails.
 */
export async function upsertEmbeddings(
  embeddings: VectorDocument | VectorDocument[]
): Promise<string> {
  const vectorDb: Index = getVectorClient();
  try {
    // Ensure the input matches what @upstash/vector expects.
    // VectorDocument structure should align with the client's Vector interface.
    const result = await vectorDb.upsert(embeddings);
    return result as string;
  } catch (error: unknown) {
    upstashLogger.error(
      'vector-store',
      'Error upserting embeddings to Upstash Vector',
      error instanceof Error ? error : { message: String(error) }
    );
    throw new VectorStoreError('Failed to upsert embeddings', error);
  }
}

/**
 * Searches for embeddings similar to a given query vector.
 * @param queryVector The vector to find similar embeddings for.
 * @param options Optional search parameters (topK, includeVectors, includeMetadata, filter).
 * @returns A promise that resolves to an array of VectorSearchResult objects.
 * @throws VectorStoreError if the search fails.
 */
export async function searchSimilarEmbeddings(
  queryVector: number[],
  options?: VectorQueryOptions 
): Promise<VectorSearchResult[]> {
  const vectorDb: Index = getVectorClient();
  const {
    topK = 10,
    includeVectors = false,
    includeMetadata = true,
    filter,
  } = options || {};

  try {
    const results = await vectorDb.query({
      vector: queryVector,
      topK,
      includeVectors,
      includeMetadata,
      filter: typeof options?.filter === 'object' ? JSON.stringify(options.filter) : options?.filter, // Stringify filter if it's an object
    });
    return results as VectorSearchResult[];
  } catch (error: unknown) {
    upstashLogger.error(
      'vector-store',
      'Error searching embeddings in Upstash Vector',
      error instanceof Error ? error : { message: String(error) }
    );
    throw new VectorStoreError('Failed to search embeddings', error);
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
): Promise<
  | Array<FetchResult<VectorMetadata> | null>
  | FetchResult<VectorMetadata>
  | null
> {
  const vectorDb: Index = getVectorClient();
  try {
    const normalizedIds = Array.isArray(ids) ? ids : [ids];
    const results = await vectorDb.fetch(normalizedIds, {
      includeVectors,
      includeMetadata,
    });
    return results as
      | Array<FetchResult<VectorMetadata> | null>
      | FetchResult<VectorMetadata>
      | null;
  } catch (error: unknown) {
    upstashLogger.error(
      'vector-store',
      'Error fetching embeddings by ID from Upstash Vector',
      error instanceof Error ? error : { message: String(error) }
    );
    throw new VectorStoreError('Failed to fetch embeddings by ID', error);
  }
}

/**
 * Deletes one or more embedding vectors by their IDs.
 * @param ids An array of vector IDs or a single vector ID.
 * @returns A promise that resolves with the result of the delete operation from Upstash.
 * @throws VectorStoreError if deletion fails.
 */
export async function deleteEmbeddingsByIds(
  ids: string | string[]
): Promise<number> {
  const vectorDb: Index = getVectorClient();
  try {
    const result = await vectorDb.delete(ids);
    // Upstash Vector returns { deleted: number }
    if (typeof result === 'object' && result !== null && 'deleted' in result) {
      return (result as { deleted: number }).deleted;
    }
    throw new VectorStoreError(
      'Unexpected response from Upstash Vector delete',
      result
    );
  } catch (error: unknown) {
    upstashLogger.error(
      'vector-store',
      'Error deleting embeddings by ID from Upstash Vector',
      error instanceof Error ? error : { message: String(error) }
    );
    throw new VectorStoreError('Failed to delete embeddings by ID', error);
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
  } catch (error: unknown) {
    upstashLogger.error(
      'vector-store',
      'Error resetting Upstash Vector index',
      error instanceof Error ? error : { message: String(error) }
    );
    throw new VectorStoreError('Failed to reset vector index', error);
  }
}

/**
 * Gets information about the vector index, such as vector count, pending vector count, and dimension.
 * @returns A promise that resolves with the index information.
 * @throws VectorStoreError if fetching info fails.
 */
export async function getVectorIndexInfo(): Promise<unknown> {
  const vectorDb: Index = getVectorClient();
  try {
    const info = await vectorDb.info();
    return info;
  } catch (error: unknown) {
    upstashLogger.error(
      'vector-store',
      'Error fetching Upstash Vector index info',
      error instanceof Error ? error : { message: String(error) }
    );
    throw new VectorStoreError('Failed to fetch vector index info', error);
  }
}

// --- RAG-specific Functions ---

/**
 * Stores text embedding in Upstash Vector.
 * This function generates an embedding for the given text and stores it in the vector database.
 *
 * @param text - The text to generate an embedding for
 * @param metadata - Optional metadata to store with the embedding
 * @returns Promise resolving to the ID of the stored embedding
 * @throws VectorStoreError if storing fails
 */
export async function storeTextEmbedding(
  text: string,
  metadata?: VectorMetadata 
): Promise<string> {
  try {
    // Check if Upstash Vector is available
    if (!isUpstashVectorAvailable()) {
      throw new VectorStoreError(
        'Upstash Vector is not available. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.'
      );
    }

    // Validate text input
    if (!text || typeof text !== 'string') {
      throw new VectorStoreError('Invalid text input for embedding generation');
    }

    // Generate embedding for the text
    const embedding = await generateEmbedding(text);

    // Convert Float32Array to regular array
    const embeddingArray = Array.from(embedding) as number[];

    // Generate a unique ID for the embedding
    const id = generateId();

    // Prepare metadata with the original text
    const fullMetadata: VectorMetadata = { // Use VectorMetadata
      text,
      created_at: new Date().toISOString(),
      ...metadata,
    };

    // Validate with Zod schema
    const vectorData = VectorDocumentSchema.parse({ // Use VectorDocumentSchema
      id,
      vector: embeddingArray,
      metadata: fullMetadata,
    });

    // Store the embedding in Upstash Vector
    await upsertEmbeddings(vectorData); // upsertEmbeddings now expects VectorDocument

    return id;
  } catch (error: unknown) {
    upstashLogger.error(
      'vector-store',
      'Error storing text embedding',
      error instanceof Error ? error : { message: String(error) }
    );
    if (error instanceof VectorStoreError) {
      throw error;
    }
    throw new VectorStoreError('Failed to store text embedding', error);
  }
}

/**
 * Searches for similar text in the vector store.
 * This function generates an embedding for the query text and searches for similar embeddings.
 *
 * @param query - The text query to search for
 * @param limit - Maximum number of results to return
 * @param filter - Optional filter for the search
 * @returns Promise resolving to an array of search results
 * @throws VectorStoreError if search fails
 */
export async function searchTextStore(
  query: string,
  limit: number = 10,
  filter?: string 
): Promise<VectorSearchResult[]> {
  try {
    // Check if Upstash Vector is available
    if (!isUpstashVectorAvailable()) {
      throw new VectorStoreError(
        'Upstash Vector is not available. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.'
      );
    }

    // Validate query input
    if (!query || typeof query !== 'string') {
      throw new VectorStoreError('Invalid query text for search');
    }

    // Generate embedding for the query
    const embedding = await generateEmbedding(query);

    // Convert Float32Array to regular array
    const embeddingArray = Array.from(embedding) as number[];

    // Validate search options with Zod schema
    const searchOptions = VectorQueryOptionsSchema.parse({ // Use VectorQueryOptionsSchema
      topK: limit,
      includeMetadata: true,
      filter, // Filter is string here, matching client
    });

    // Search for similar embeddings
    const results = await searchSimilarEmbeddings( // searchSimilarEmbeddings now returns Promise<VectorSearchResult[]>
      embeddingArray,
      searchOptions // options type is VectorQueryOptions
    );

    return results; // Type is VectorSearchResult[]
  } catch (error: unknown) {
    upstashLogger.error(
      'vector-store',
      'Error searching text store',
      error instanceof Error ? error : { message: String(error) }
    );
    if (error instanceof VectorStoreError) {
      throw error;
    }
    throw new VectorStoreError('Failed to search text store', error);
  }
}

/**
 * Performs a hybrid search combining vector similarity and keyword matching.
 *
 * @param query - The text query to search for
 * @param options - Search options
 * @returns Promise resolving to an array of search results
 * @throws VectorStoreError if search fails
 */
export async function hybridSearch(
  query: string,
  options?: {
    limit?: number;
    filter?: string;
    keywordWeight?: number; // Weight for keyword matching (0-1)
    vectorWeight?: number; // Weight for vector similarity (0-1)
  }
): Promise<VectorSearchResult[]> { // Return type updated
  try {
    // Default options
    const limit = options?.limit || 10;
    const filter = options?.filter;
    const keywordWeight = options?.keywordWeight || 0.3;
    const vectorWeight = options?.vectorWeight || 0.7;

    // Validate weights
    if (
      keywordWeight < 0 ||
      keywordWeight > 1 ||
      vectorWeight < 0 ||
      vectorWeight > 1
    ) {
      throw new VectorStoreError('Weights must be between 0 and 1');
    }

    // Perform vector search
    const vectorResults = await searchTextStore(query, limit * 2, filter);

    // Extract keywords from query (simple implementation)
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3) // Filter out short words
      .map((word) => word.replace(/[^\w]/g, '')); // Remove non-word characters

    // Re-rank results based on keyword matching
    const rerankedResults = vectorResults.map((result) => {
      const text = result.metadata?.text || '';

      // Calculate keyword score
      let keywordScore = 0;
      if (text && keywords.length > 0) {
        const textLower = text.toLowerCase();
        const matchedKeywords = keywords.filter((keyword) =>
          textLower.includes(keyword)
        );
        keywordScore = matchedKeywords.length / keywords.length;
      }

      // Calculate combined score
      const combinedScore =
        result.score * vectorWeight + keywordScore * keywordWeight;

      return {
        ...result,
        score: combinedScore,
      };
    });

    // Sort by combined score and limit results
    rerankedResults.sort((a, b) => b.score - a.score);
    return rerankedResults.slice(0, limit);
  } catch (error: unknown) {
    upstashLogger.error(
      'vector-store',
      'Error performing hybrid search',
      error instanceof Error ? error : { message: String(error) }
    );
    if (error instanceof VectorStoreError) {
      throw error;
    }
    throw new VectorStoreError('Failed to perform hybrid search', error);
  }
}

// --- Advanced RediSearch/Hybrid Search ---
export async function advancedVectorHybridSearch(
  query: RediSearchHybridQuery
): Promise<RediSearchHybridResult[]> {
  try {
    const results = await runRediSearchHybridQuery(query);
    return results as RediSearchHybridResult[];
  } catch (err) {
    upstashLogger.error(
      'vector-store',
      'Failed advanced hybrid search',
      err instanceof Error ? err : { message: String(err) }
    );
    throw new VectorStoreError('Failed advanced hybrid search', err);
  }
}

// --- QStash/Workflow Integration Example ---
export async function enqueueVectorWorkflow(
  type: string,
  data: Record<string, unknown>
) {
  const payload: QStashTaskPayload = {
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    type,
    data,
    created_at: new Date().toISOString(),
    status: 'pending',
  };
  return enqueueQStashTask(payload);
}

export async function trackVectorWorkflowNode(node: WorkflowNode) {
  return trackWorkflowNode(node);
}

/**
 * @file RAG (Retrieval-Augmented Generation) tools for the Vercel AI SDK.
 *
 * @remarks
 *   • Provides document search, document addition, chunking, and vector store operations.
 *   • Supports multiple vector store providers (Supabase, LibSQL, Upstash).
 *   • Each tool returns a discriminated union (`success: true | false`) that
 *     matches the shapes in `lib/tools/rag/types.ts`.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getLibSQLClient } from '@/lib/memory/db';
import { generateEmbedding, saveEmbedding } from '@/lib/ai-integration';
// Import LibSQL vector store functions
import {
  storeTextEmbedding as libsqlStoreTextEmbedding,
  searchTextStore as libsqlSearchTextStore,
} from '@/lib/memory/vector-store';
// Import Upstash client utilities
import {
  getVectorClient,
  isUpstashVectorAvailable,
  shouldUseUpstashAdapter,
} from '@/lib/memory/upstash/upstashClients';
// Import Upstash adapter functions
import {
  vectorSearch as upstashVectorSearch,
  upsertTexts as upstashUpsertTexts,
  semanticSearch as upstashSemanticSearch,
} from '@/lib/memory/upstash/supabase-adapter';
// Import Upstash vector store functions
import {
  storeTextEmbedding as upstashStoreTextEmbedding,
  searchTextStore as upstashSearchTextStore,
  hybridSearch as upstashHybridSearch,
  EmbeddingMetadata,
} from '@/lib/memory/upstash/vector-store';

import {
  VECTOR_PROVIDERS,
  CHUNKING_STRATEGIES,
  SIMILARITY_METRICS,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
} from './constants';

// Define hybrid vector search schema
const hybridVectorSearchSchema = z.object({
  query: z.string().describe('Search query to find relevant documents'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_SEARCH_LIMIT)
    .default(DEFAULT_SEARCH_LIMIT)
    .describe('Maximum number of results to return'),
  filter: z
    .record(z.any())
    .optional()
    .describe('Optional metadata filter criteria'),
  keywordWeight: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Weight for keyword matching (0-1)'),
  vectorWeight: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Weight for vector similarity (0-1)'),
});

// Define hybrid vector search result type
type HybridVectorSearchResult =
  | {
      success: true;
      query: string;
      results: Array<{
        id: string;
        metadata: Record<string, any>;
        score: number;
        content?: string;
      }>;
    }
  | ToolFailure;
import {
  DocumentSearchResult,
  DocumentAddResult,
  ChunkDocumentResult,
  VectorStoreUpsertResult,
  VectorStoreQueryResult,
  ToolFailure,
  DocumentSearchItem,
  VectorStoreQueryItem,
} from './types';

/* ───────────────────────────────  schemas  ─────────────────────────────── */

export const documentSearchSchema = z.object({
  query: z.string().describe('Search query to find relevant documents'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_SEARCH_LIMIT)
    .default(DEFAULT_SEARCH_LIMIT)
    .describe('Maximum number of results to return'),
  provider: z
    .enum(VECTOR_PROVIDERS)
    .default('libsql')
    .describe('Vector store provider to use'),
  filter: z
    .record(z.any())
    .optional()
    .describe('Optional metadata filter criteria'),
});

export const documentAddSchema = z.object({
  title: z.string().describe('Document title'),
  content: z.string().describe('Document content'),
  metadata: z
    .record(z.any())
    .optional()
    .describe('Optional metadata for the document'),
  generateEmbedding: z
    .boolean()
    .default(true)
    .describe('Whether to generate an embedding for the document'),
});

export const chunkDocumentSchema = z.object({
  content: z.string().describe('Document content to chunk'),
  strategy: z
    .enum(CHUNKING_STRATEGIES)
    .default('fixed')
    .describe('Chunking strategy to use'),
  chunkSize: z
    .number()
    .int()
    .min(100)
    .max(8000)
    .default(DEFAULT_CHUNK_SIZE)
    .describe('Size of each chunk in characters'),
  chunkOverlap: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .default(DEFAULT_CHUNK_OVERLAP)
    .describe('Overlap between chunks in characters'),
  metadata: z
    .record(z.any())
    .optional()
    .describe('Optional metadata to include with each chunk'),
});

export const vectorStoreUpsertSchema = z.object({
  texts: z.array(z.string()).describe('Array of text strings to embed'),
  metadatas: z
    .array(z.record(z.any()))
    .optional()
    .describe('Optional array of metadata objects (one per text)'),
  provider: z
    .enum(VECTOR_PROVIDERS)
    .default('libsql')
    .describe('Vector store provider to use'),
  namespace: z
    .string()
    .optional()
    .describe('Optional namespace for the vectors'),
});

export const vectorStoreQuerySchema = z.object({
  query: z.string().describe('Query text to search for'),
  provider: z
    .enum(VECTOR_PROVIDERS)
    .default('libsql')
    .describe('Vector store provider to use'),
  namespace: z.string().optional().describe('Optional namespace to search in'),
  filter: z
    .record(z.any())
    .optional()
    .describe('Optional metadata filter criteria'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_SEARCH_LIMIT)
    .default(DEFAULT_SEARCH_LIMIT)
    .describe('Maximum number of results to return'),
  similarityMetric: z
    .enum(SIMILARITY_METRICS)
    .default('cosine')
    .describe('Similarity metric to use'),
});

/* ────────────────────────────  helper functions  ───────────────────────────── */

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Chunk text using a fixed size strategy
 */
function chunkTextFixed(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const chunks: string[] = [];
  let i = 0;

  while (i < text.length) {
    const chunk = text.slice(i, i + chunkSize);
    chunks.push(chunk);
    i += chunkSize - chunkOverlap;
  }

  return chunks;
}

/**
 * Chunk text using a recursive strategy (split by sections, then paragraphs, then sentences)
 */
function chunkTextRecursive(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  // Split by double newlines (sections)
  const sections = text.split(/\n\s*\n/);

  const chunks: string[] = [];

  for (const section of sections) {
    if (section.length <= chunkSize) {
      chunks.push(section);
      continue;
    }

    // Split by single newlines (paragraphs)
    const paragraphs = section.split(/\n/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length <= chunkSize) {
        currentChunk += (currentChunk ? '\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          // Add overlap by keeping the last part of the previous chunk
          const overlapText = currentChunk.slice(-chunkOverlap);
          currentChunk = overlapText + '\n' + paragraph;
        } else {
          // Paragraph is longer than chunk size, split by sentences
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          let sentenceChunk = '';

          for (const sentence of sentences) {
            if (sentenceChunk.length + sentence.length <= chunkSize) {
              sentenceChunk += sentenceChunk ? ' ' + sentence : sentence;
            } else {
              if (sentenceChunk) {
                chunks.push(sentenceChunk);
                // Add overlap
                const overlapText = sentenceChunk.slice(-chunkOverlap);
                sentenceChunk = overlapText + ' ' + sentence;
              } else {
                // Sentence is too long, force split
                chunks.push(sentence.slice(0, chunkSize));
              }
            }
          }

          if (sentenceChunk) {
            chunks.push(sentenceChunk);
          }
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }
  }

  return chunks;
}

/**
 * Chunk text using the specified strategy
 */
function chunkText(
  text: string,
  strategy: (typeof CHUNKING_STRATEGIES)[number],
  chunkSize: number,
  chunkOverlap: number
): string[] {
  switch (strategy) {
    case 'fixed':
      return chunkTextFixed(text, chunkSize, chunkOverlap);
    case 'recursive':
      return chunkTextRecursive(text, chunkSize, chunkOverlap);
    case 'semantic':
      // For semantic chunking, we'd ideally use a more sophisticated algorithm
      // that understands semantic boundaries. For now, fall back to recursive.
      return chunkTextRecursive(text, chunkSize, chunkOverlap);
    default:
      return chunkTextFixed(text, chunkSize, chunkOverlap);
  }
}

/* ────────────────────────────  executions  ───────────────────────────── */

/**
 * Search for documents using semantic similarity
 */
async function documentSearch(
  params: z.infer<typeof documentSearchSchema>
): Promise<DocumentSearchResult> {
  const { query, limit, provider, filter } = params;

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Search based on provider
    switch (provider) {
      case 'libsql': {
        const db = getLibSQLClient();

        // Get all document embeddings
        const result = await db.execute({
          sql: `
            SELECT d.id, d.title, d.content, d.metadata, e.vector
            FROM documents d
            JOIN embeddings e ON d.embedding_id = e.id
          `,
          args: [],
        });

        // Calculate similarities
        const similarities = result.rows
          .map((row) => {
            // Handle vector data safely
            const vectorData = row.vector as unknown;
            let storedVector: Float32Array;

            if (vectorData instanceof Buffer) {
              storedVector = new Float32Array(vectorData.buffer);
            } else if (vectorData instanceof ArrayBuffer) {
              storedVector = new Float32Array(vectorData);
            } else if (vectorData instanceof Uint8Array) {
              storedVector = new Float32Array(vectorData.buffer);
            } else {
              console.warn('Unexpected vector data type:', typeof vectorData);
              return null;
            }

            const similarity = cosineSimilarity(queryEmbedding, storedVector);
            const metadata = JSON.parse((row.metadata as string) || '{}');

            // Apply filter if provided
            if (filter) {
              for (const [key, value] of Object.entries(filter)) {
                if (metadata[key] !== value) {
                  return null;
                }
              }
            }

            return {
              id: row.id as string,
              title: row.title as string,
              content: row.content as string,
              metadata,
              similarity,
            };
          })
          .filter(Boolean) as DocumentSearchItem[];

        // Sort by similarity (descending)
        similarities.sort((a, b) => b.similarity - a.similarity);

        // Return top results
        return {
          success: true,
          query,
          results: similarities.slice(0, limit),
        };
      }

      case 'supabase': {
        try {
          // Use searchTextStore from vector-store.ts
          const searchResults = await libsqlSearchTextStore(query, limit);

          // Format results based on the actual structure
          // The vectorSearch function in lib/memory/db.ts returns Array<{ id: string; similarity: number }>
          const formattedResults = searchResults.map((result: any) => {
            return {
              id: result.id,
              title: 'Untitled', // Default title
              content: '', // Default content
              metadata: {}, // Default empty metadata
              similarity:
                'similarity' in result
                  ? 1 - (result.similarity as number)
                  : 0.5,
            };
          });

          return {
            success: true,
            query,
            results: formattedResults,
          };
        } catch (error) {
          console.error('Error in Supabase document search:', error);
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unknown error in document search',
          } as ToolFailure;
        }
      }

      case 'upstash': {
        try {
          // Check if Upstash Vector is available
          if (!isUpstashVectorAvailable()) {
            throw new Error(
              'Upstash Vector is not available. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.'
            );
          }

          // Get vector client for direct operations
          const vectorClient = getVectorClient();

          // Try multiple search strategies for comprehensive results
          try {
            // Strategy 1: Use upstashVectorSearch for direct vector search
            // Generate embedding for the query
            const queryEmbedding = await generateEmbedding(query);
            const vectorQueryOptions = {
              topK: limit,
              includeMetadata: true,
              filter: filter ? JSON.stringify(filter) : undefined,
            };

            // Use upstashVectorSearch for direct vector search
            const vectorResults = await upstashVectorSearch(
              Array.from(queryEmbedding) as number[],
              vectorQueryOptions
            );

            // Format results to match DocumentSearchItem
            const formattedResults = vectorResults.map((result: any) => {
              const metadata = result.metadata || {};
              return {
                id: result.id,
                title: metadata.title || 'Untitled',
                content: metadata.text || '',
                metadata,
                similarity: result.score || 0.5,
              };
            });

            return {
              success: true,
              query,
              results: formattedResults,
            };
          } catch (vectorSearchError) {
            console.warn(
              'Error using upstashVectorSearch, trying upstashSearchTextStore:',
              vectorSearchError
            );

            // Strategy 2: Try using upstashSearchTextStore (from vector-store.ts)
            try {
              const searchResults = await upstashSearchTextStore(
                query,
                limit,
                filter ? JSON.stringify(filter) : undefined
              );

              // Format results to match DocumentSearchItem
              const formattedResults = searchResults.map((result: any) => {
                const metadata = result.metadata || {};
                return {
                  id: result.id,
                  title: metadata.title || 'Untitled',
                  content: metadata.text || '',
                  metadata,
                  similarity: result.score || 0.5,
                };
              });

              return {
                success: true,
                query,
                results: formattedResults,
              };
            } catch (searchError) {
              console.warn(
                'Error using upstashSearchTextStore, falling back to semanticSearch:',
                searchError
              );

              // Strategy 3: Fall back to semanticSearch from supabase-adapter.ts
              const searchOptions = {
                topK: limit,
                includeMetadata: true,
                ...(filter ? { filter } : {}),
              };

              const searchResults = await upstashSemanticSearch(
                query,
                searchOptions
              );

              // Format results to match DocumentSearchItem
              const formattedResults = searchResults.map((result: any) => {
                const metadata = result.metadata || {};
                return {
                  id: result.id,
                  title: metadata.title || 'Untitled',
                  content: metadata.text || '',
                  metadata,
                  similarity: result.score || 0.5,
                };
              });

              return {
                success: true,
                query,
                results: formattedResults,
              };
            }
          }
        } catch (error) {
          console.error('Error in Upstash document search:', error);
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unknown error in Upstash document search',
          } as ToolFailure;
        }
      }

      default:
        throw new Error(`Unsupported vector store provider: ${provider}`);
    }
  } catch (error) {
    console.error('Error in document search:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    } as ToolFailure;
  }
}

/**
 * Add a document to the knowledge base
 */
async function documentAdd(
  params: z.infer<typeof documentAddSchema>
): Promise<DocumentAddResult> {
  const {
    title,
    content,
    metadata = {},
    generateEmbedding: shouldGenerateEmbedding,
  } = params;

  try {
    // Check if Upstash is available and should be used
    if (shouldUseUpstashAdapter() && isUpstashVectorAvailable()) {
      try {
        const documentId = uuidv4();

        // Use upsertTexts from upstash/supabase-adapter.ts
        await upstashUpsertTexts([
          {
            id: documentId,
            text: content,
            metadata: {
              ...metadata,
              title,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
        ]);

        return {
          success: true,
          documentId,
          title,
        };
      } catch (error) {
        console.error('Error adding document to Upstash:', error);
        throw error;
      }
    } else {
      // Fall back to LibSQL
      const db = getLibSQLClient();
      const documentId = uuidv4();
      let embeddingId = null;

      // Generate embedding if requested
      if (shouldGenerateEmbedding) {
        const embedding = await generateEmbedding(content);
        embeddingId = await saveEmbedding(embedding);
      }

      // Save the document
      await db.execute({
        sql: `
          INSERT INTO documents (id, title, content, metadata, embedding_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `,
        args: [
          documentId,
          title,
          content,
          JSON.stringify(metadata),
          embeddingId,
        ],
      });

      return {
        success: true,
        documentId,
        title,
      };
    }
  } catch (error) {
    console.error('Error adding document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    } as ToolFailure;
  }
}

/**
 * Chunk a document into smaller pieces
 */
async function chunkDocument(
  params: z.infer<typeof chunkDocumentSchema>
): Promise<ChunkDocumentResult> {
  const { content, strategy, chunkSize, chunkOverlap, metadata = {} } = params;

  try {
    // Generate chunks
    const chunks = chunkText(content, strategy, chunkSize, chunkOverlap);

    // Create document chunks with IDs and metadata
    const documentId = uuidv4();
    const documentChunks = chunks.map((chunk, index) => ({
      id: `${documentId}-chunk-${index}`,
      content: chunk,
      metadata: {
        ...metadata,
        chunkIndex: index,
        chunkCount: chunks.length,
        strategy,
        chunkSize,
        chunkOverlap,
        documentId,
      },
    }));

    return {
      success: true,
      documentId,
      chunks: documentChunks,
    };
  } catch (error) {
    console.error('Error chunking document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    } as ToolFailure;
  }
}

/**
 * Upsert texts and their embeddings to a vector store
 */
async function vectorStoreUpsert(
  params: z.infer<typeof vectorStoreUpsertSchema>
): Promise<VectorStoreUpsertResult> {
  const { texts, metadatas = [], provider, namespace } = params;

  try {
    const ids: string[] = [];

    switch (provider) {
      case 'libsql': {
        const db = getLibSQLClient();

        // Process each text
        for (let i = 0; i < texts.length; i++) {
          const text = texts[i];
          const metadata = metadatas[i] || {};
          const id = uuidv4();

          // Generate embedding
          const embedding = await generateEmbedding(text);
          const embeddingId = await saveEmbedding(embedding);

          // Store document with reference to embedding
          await db.execute({
            sql: `
              INSERT INTO documents (id, title, content, metadata, embedding_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `,
            args: [
              id,
              metadata.title || 'Untitled',
              text,
              JSON.stringify({ ...metadata, namespace }),
              embeddingId,
            ],
          });

          ids.push(id);
        }

        break;
      }

      case 'supabase': {
        // For each text, store embedding using storeTextEmbedding
        for (let i = 0; i < texts.length; i++) {
          const text = texts[i];
          // Note: We're not using metadata directly here as storeTextEmbedding
          // doesn't support metadata in its current implementation
          const id = await libsqlStoreTextEmbedding(text);

          // Store additional metadata if needed
          // This would depend on your implementation of vector-store.ts

          ids.push(id);
        }

        break;
      }

      case 'upstash': {
        try {
          // Check if Upstash Vector is available
          if (!isUpstashVectorAvailable()) {
            throw new Error(
              'Upstash Vector is not available. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.'
            );
          }

          // Ensure vector client is available
          getVectorClient();

          // Try using upstashStoreTextEmbedding first for each text
          try {
            for (let i = 0; i < texts.length; i++) {
              const text = texts[i];
              const metadata = metadatas[i] || ({} as EmbeddingMetadata);

              // Store with upstashStoreTextEmbedding
              const id = await upstashStoreTextEmbedding(text, {
                ...metadata,
                namespace,
                created_at: new Date().toISOString(),
              });

              ids.push(id);
            }
          } catch (storeError) {
            console.warn(
              'Error using upstashStoreTextEmbedding, falling back to upsertTexts:',
              storeError
            );

            // Fall back to upsertTexts from supabase-adapter.ts
            // Prepare text items with IDs and metadata
            const textItems = texts.map((text, index) => {
              const id = uuidv4();
              const metadata = metadatas[index] || {};

              return {
                id,
                text,
                metadata: {
                  ...metadata,
                  namespace,
                  created_at: new Date().toISOString(),
                },
              };
            });

            // Use upsertTexts from upstash/supabase-adapter.ts
            await upstashUpsertTexts(textItems, { namespace });

            // Collect IDs
            ids.push(...textItems.map((item) => item.id));

            // Also try direct vector upsert for future compatibility
            const vectors = await Promise.all(
              textItems.map(async (item) => {
                const embedding = await generateEmbedding(item.text);
                return {
                  id: item.id,
                  vector: Array.from(embedding) as number[],
                  metadata: item.metadata,
                };
              })
            );

            // Upsert vectors directly using the vector client
            const vectorClient = getVectorClient();
            await vectorClient.upsert(vectors);
          }
        } catch (error) {
          console.error('Error in Upstash vector upsert:', error);
          throw error;
        }

        break;
      }

      default:
        throw new Error(`Unsupported vector store provider: ${provider}`);
    }

    return {
      success: true,
      ids,
      provider,
    };
  } catch (error) {
    console.error('Error in vector store upsert:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    } as ToolFailure;
  }
}

/**
 * Query a vector store for similar items
 */
async function vectorStoreQuery(
  params: z.infer<typeof vectorStoreQuerySchema>
): Promise<VectorStoreQueryResult> {
  const { query, provider, namespace, filter, limit, similarityMetric } =
    params;

  try {
    switch (provider) {
      case 'libsql': {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);
        const db = getLibSQLClient();

        // Get all document embeddings
        const result = await db.execute({
          sql: `
            SELECT d.id, d.metadata, e.vector
            FROM documents d
            JOIN embeddings e ON d.embedding_id = e.id
          `,
          args: [],
        });

        // Calculate similarities
        const similarities = result.rows
          .map((row) => {
            // Handle vector data safely
            const vectorData = row.vector as unknown;
            let storedVector: Float32Array;

            if (vectorData instanceof Buffer) {
              storedVector = new Float32Array(vectorData.buffer);
            } else if (vectorData instanceof ArrayBuffer) {
              storedVector = new Float32Array(vectorData);
            } else if (vectorData instanceof Uint8Array) {
              storedVector = new Float32Array(vectorData.buffer);
            } else {
              console.warn('Unexpected vector data type:', typeof vectorData);
              return null;
            }

            const metadata = JSON.parse((row.metadata as string) || '{}');

            // Filter by namespace if provided
            if (namespace && metadata.namespace !== namespace) {
              return null;
            }

            // Apply additional filters if provided
            if (filter) {
              for (const [key, value] of Object.entries(filter)) {
                if (metadata[key] !== value) {
                  return null;
                }
              }
            }

            // Calculate similarity based on the selected metric
            let score: number;
            switch (similarityMetric) {
              case 'cosine':
                score = cosineSimilarity(queryEmbedding, storedVector);
                break;
              case 'euclidean':
                // Euclidean distance (converted to similarity)
                let sum = 0;
                for (let i = 0; i < queryEmbedding.length; i++) {
                  sum += Math.pow(queryEmbedding[i] - storedVector[i], 2);
                }
                score = 1 / (1 + Math.sqrt(sum));
                break;
              case 'dot':
                // Dot product
                let dot = 0;
                for (let i = 0; i < queryEmbedding.length; i++) {
                  dot += queryEmbedding[i] * storedVector[i];
                }
                score = dot;
                break;
              default:
                score = cosineSimilarity(queryEmbedding, storedVector);
            }

            return {
              id: row.id as string,
              metadata,
              score,
            };
          })
          .filter(Boolean) as VectorStoreQueryItem[];

        // Sort by score (descending)
        similarities.sort((a, b) => b.score - a.score);

        // Return top results
        return {
          success: true,
          query,
          results: similarities.slice(0, limit),
          provider,
        };
      }

      case 'supabase': {
        try {
          // Use searchTextStore from vector-store.ts
          const searchResults = await libsqlSearchTextStore(query, limit);

          // Format results based on the actual structure
          // The vectorSearch function in lib/memory/db.ts returns Array<{ id: string; similarity: number }>
          const formattedResults = searchResults.map((result: any) => {
            return {
              id: result.id,
              metadata: {}, // Default empty metadata
              score:
                'similarity' in result
                  ? 1 - (result.similarity as number)
                  : 0.5,
            };
          });

          return {
            success: true,
            query,
            results: formattedResults,
            provider,
          };
        } catch (error) {
          console.error('Error in Supabase vector search:', error);
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unknown error in vector search',
          } as ToolFailure;
        }
      }

      case 'upstash': {
        try {
          // Check if Upstash Vector is available
          if (!isUpstashVectorAvailable()) {
            throw new Error(
              'Upstash Vector is not available. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.'
            );
          }

          // Use semanticSearch from upstash/supabase-adapter.ts
          const searchOptions = {
            topK: limit,
            includeMetadata: true,
            ...(namespace ? { namespace } : {}),
            ...(filter ? { filter } : {}),
          };

          const searchResults = await upstashSemanticSearch(
            query,
            searchOptions
          );

          // Format results to match VectorStoreQueryItem
          const formattedResults = searchResults.map((result: any) => {
            return {
              id: result.id,
              metadata: result.metadata || {},
              score: result.score || 0.5,
            };
          });

          return {
            success: true,
            query,
            results: formattedResults,
            provider,
          };
        } catch (error) {
          console.error('Error in Upstash vector search:', error);
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unknown error in Upstash vector search',
          } as ToolFailure;
        }
      }

      default:
        throw new Error(`Unsupported vector store provider: ${provider}`);
    }
  } catch (error) {
    console.error('Error in vector store query:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    } as ToolFailure;
  }
}

/**
 * Perform a hybrid search using Upstash Vector
 * This combines vector similarity with keyword matching for better results
 */
async function hybridVectorSearch(
  params: z.infer<typeof hybridVectorSearchSchema>
): Promise<HybridVectorSearchResult> {
  const { query, limit, filter, keywordWeight, vectorWeight } = params;

  try {
    // Check if Upstash Vector is available
    if (!isUpstashVectorAvailable()) {
      throw new Error(
        'Upstash Vector is not available. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.'
      );
    }

    // Use hybridSearch from upstash/vector-store.ts
    const searchResults = await upstashHybridSearch(query, {
      limit,
      filter: filter ? JSON.stringify(filter) : undefined,
      keywordWeight,
      vectorWeight,
    });

    // Format results
    const formattedResults = searchResults.map((result) => {
      const metadata = result.metadata || {};
      return {
        id: result.id,
        metadata,
        score: result.score,
        content: metadata.text || '',
      };
    });

    return {
      success: true,
      query,
      results: formattedResults,
    };
  } catch (error) {
    console.error('Error in hybrid vector search:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    } as ToolFailure;
  }
}

/* ─────────────────────────────  exports  ────────────────────────────── */

export const tools = {
  DocumentSearch: tool({
    description: 'Search for documents using semantic similarity',
    parameters: documentSearchSchema,
    execute: documentSearch,
  }),

  DocumentAdd: tool({
    description: 'Add a new document to the knowledge base',
    parameters: documentAddSchema,
    execute: documentAdd,
  }),

  ChunkDocument: tool({
    description: 'Split a document into smaller chunks for processing',
    parameters: chunkDocumentSchema,
    execute: chunkDocument,
  }),

  VectorStoreUpsert: tool({
    description: 'Add texts and their embeddings to a vector store',
    parameters: vectorStoreUpsertSchema,
    execute: vectorStoreUpsert,
  }),

  VectorStoreQuery: tool({
    description: 'Query a vector store for semantically similar items',
    parameters: vectorStoreQuerySchema,
    execute: vectorStoreQuery,
  }),

  HybridVectorSearch: tool({
    description:
      'Perform a hybrid search combining vector similarity with keyword matching (Upstash only)',
    parameters: hybridVectorSearchSchema,
    execute: hybridVectorSearch,
  }),
};

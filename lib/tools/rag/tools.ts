/**
 * @file RAG (Retrieval-Augmented Generation) tools for the Vercel AI SDK.
 *
 * @remarks
 *   • Provides document search, document addition, chunking, and vector store operations.
 *   • Supports multiple vector store providers (Supabase, Pinecone, LibSQL).
 *   • Each tool returns a discriminated union (`success: true | false`) that
 *     matches the shapes in `lib/tools/rag/types.ts`.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getLibSQLClient } from '@/lib/memory/db';
import { generateEmbedding, saveEmbedding } from '@/lib/ai-integration';
import { storeTextEmbedding, searchTextStore } from '@/lib/memory/vector-store';
import {
  VECTOR_PROVIDERS,
  CHUNKING_STRATEGIES,
  SIMILARITY_METRICS,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
} from './constants';
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
  namespace: z
    .string()
    .optional()
    .describe('Optional namespace to search in'),
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

  let chunks: string[] = [];

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
  strategy: typeof CHUNKING_STRATEGIES[number],
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
        });

        // Calculate similarities
        const similarities = result.rows.map((row) => {
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
        }).filter(Boolean) as DocumentSearchItem[];

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
          const searchResults = await searchTextStore(query, limit);

          // Format results based on the actual structure
          // The vectorSearch function in lib/memory/db.ts returns Array<{ id: string; similarity: number }>
          const formattedResults = searchResults.map((result: any) => {
            return {
              id: result.id,
              title: 'Untitled', // Default title
              content: '', // Default content
              metadata: {}, // Default empty metadata
              similarity: 'similarity' in result ? 1 - (result.similarity as number) : 0.5,
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
            error: error instanceof Error ? error.message : 'Unknown error in document search',
          } as ToolFailure;
        }
      }

      case 'pinecone':
        // Placeholder for Pinecone integration
        throw new Error('Pinecone integration not yet implemented');

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
  const { title, content, metadata = {}, generateEmbedding: shouldGenerateEmbedding } = params;

  try {
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
          const id = await storeTextEmbedding(text);

          // Store additional metadata if needed
          // This would depend on your implementation of vector-store.ts

          ids.push(id);
        }

        break;
      }

      case 'pinecone':
        // Placeholder for Pinecone integration
        throw new Error('Pinecone integration not yet implemented');

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
  const { query, provider, namespace, filter, limit, similarityMetric } = params;

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
        });

        // Calculate similarities
        const similarities = result.rows.map((row) => {
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
        }).filter(Boolean) as VectorStoreQueryItem[];

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
          const searchResults = await searchTextStore(query, limit);

          // Format results based on the actual structure
          // The vectorSearch function in lib/memory/db.ts returns Array<{ id: string; similarity: number }>
          const formattedResults = searchResults.map((result: any) => {
            return {
              id: result.id,
              metadata: {}, // Default empty metadata
              score: 'similarity' in result ? 1 - (result.similarity as number) : 0.5,
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
            error: error instanceof Error ? error.message : 'Unknown error in vector search',
          } as ToolFailure;
        }
      }

      case 'pinecone':
        // Placeholder for Pinecone integration
        throw new Error('Pinecone integration not yet implemented');

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
};
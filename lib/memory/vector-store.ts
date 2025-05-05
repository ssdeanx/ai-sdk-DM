import { initVectorIndex, vectorSearch } from "./libsql"
import { generateEmbedding, saveEmbedding } from "./memory"

/**
 * Initialize or migrate the HNSW index on the embeddings table.
 */
export async function initVectorStore(options?: { dims?: number; m?: number; efConstruction?: number }) {
  await initVectorIndex(options)
}

/**
 * Store a text embedding in the embeddings table and return its ID.
 */
export async function storeTextEmbedding(text: string, modelName?: string): Promise<string> {
  const vector = await generateEmbedding(text, modelName)
  const id = await saveEmbedding(vector, modelName)
  return id
}

/**
 * Search for similar items by text query, returning up to `limit` results.
 */
export async function searchTextStore(query: string, limit = 5) {
  const vector = await generateEmbedding(query)
  const results = await vectorSearch(vector, limit)
  return results
}
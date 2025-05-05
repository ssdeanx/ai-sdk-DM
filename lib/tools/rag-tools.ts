import { tool } from "ai"
import { z } from "zod"
import { getLibSQLClient } from "../memory/db"
import { generateEmbedding, saveEmbedding } from "../ai-integration"

// Document search tool schema
export const documentSearchSchema = z.object({
  query: z.string().describe("The search query"),
  limit: z.number().int().min(1).max(20).default(5).describe("Maximum number of results to return"),
})

// Document add tool schema
export const documentAddSchema = z.object({
  title: z.string().describe("Document title"),
  content: z.string().describe("Document content"),
  metadata: z.record(z.string()).optional().describe("Optional metadata for the document"),
})

// Document search implementation
async function documentSearch(params: z.infer<typeof documentSearchSchema>) {
  const { query, limit } = params

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query)

    const db = getLibSQLClient()

    // Get all document embeddings
    const result = await db.execute({
      sql: `
        SELECT d.id, d.title, d.content, d.metadata, e.vector
        FROM documents d
        JOIN embeddings e ON d.embedding_id = e.id
      `,
    })

    // Calculate similarities
    const similarities = result.rows.map((row) => {
      const storedVector = new Float32Array(row.vector as Buffer)
      const similarity = cosineSimilarity(queryEmbedding, storedVector)

      return {
        id: row.id,
        title: row.title,
        content: row.content,
        metadata: JSON.parse((row.metadata as string) || "{}"),
        similarity,
      }
    })

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity)

    // Return top results
    return {
      results: similarities.slice(0, limit),
      query,
    }
  } catch (error) {
    console.error("Error in document search:", error)
    return { error: error.message, results: [] }
  }
}

// Document add implementation
async function documentAdd(params: z.infer<typeof documentAddSchema>) {
  const { title, content, metadata = {} } = params

  try {
    // Generate embedding for the document
    const embedding = await generateEmbedding(content)
    const embeddingId = await saveEmbedding(embedding)

    const db = getLibSQLClient()
    const documentId = crypto.randomUUID()

    // Save the document
    await db.execute({
      sql: `
        INSERT INTO documents (id, title, content, metadata, embedding_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      args: [documentId, title, content, JSON.stringify(metadata), embeddingId],
    })

    return {
      success: true,
      documentId,
      title,
    }
  } catch (error) {
    console.error("Error adding document:", error)
    return { success: false, error: error.message }
  }
}

// Helper function to compute cosine similarity
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimensions")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Export tools
export const tools = {
  DocumentSearch: tool({
    description: "Search for documents using semantic similarity",
    parameters: documentSearchSchema,
    execute: documentSearch,
  }),

  DocumentAdd: tool({
    description: "Add a new document to the knowledge base",
    parameters: documentAddSchema,
    execute: documentAdd,
  }),
}

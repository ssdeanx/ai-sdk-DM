import { getLibSQLClient } from "./db"
import { generateEmbedding } from "./memory"
import { v4 as generateUUID } from "uuid"

/**
 * Batch save embeddings for an array of text inputs.
 * Returns a map of input index to embedding ID.
 */
export async function batchSaveEmbeddings(
  texts: string[],
  modelName: string = "all-MiniLM-L6-v2"
): Promise<string[]> {
  const db = getLibSQLClient()
  const embeddingIds: string[] = []

  for (const text of texts) {
    // generate the embedding vector
    const vector = await generateEmbedding(text)
    // new embedding ID
    const id = generateUUID()
    // store in the database
    await db.execute({
      sql: `INSERT INTO embeddings (id, vector, model, dimensions) VALUES (?, ?, ?, ?)`,
      args: [id, Buffer.from(vector.buffer), modelName, vector.length],
    })
    embeddingIds.push(id)
  }

  return embeddingIds
}
import { createClient } from "@libsql/client"

// Initialize the LibSQL client for agent memory and threads
export const getLibSQLClient = () => {
  const url = process.env.LIBSQL_DATABASE_URL || ".output/memory.db"
  if (!url) {
    throw new Error("LIBSQL_DATABASE_URL environment variable is not set")
  }
  return createClient({
    url,
    authToken: process.env.LIBSQL_AUTH_TOKEN || "",
  })
}

// Check if database is available
export async function isDatabaseAvailable() {
  try {
    if (!process.env.LIBSQL_DATABASE_URL) {
      return false
    }

    const db = getLibSQLClient()
    await db.execute("SELECT 1")
    return true
  } catch (error) {
    console.warn("Database not available:", error)
    return false
  }
}

// Helper function to execute a query and return the results
export async function query(sql: string, params: any[] = []) {
  try {
    const db = getLibSQLClient()
    const result = await db.execute({
      sql,
      args: params,
    })
    return result
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

// Helper function to execute a transaction
export async function transaction(queries: { sql: string; params: any[] }[]) {
  try {
    const db = getLibSQLClient()
    return await db.batch(
      queries.map((q) => ({
        sql: q.sql,
        args: q.params,
      })),
    )
  } catch (error) {
    console.error("Database transaction error:", error)
    throw error
  }
}

// Create HNSW index on embeddings for vector search
export async function initVectorIndex(
  options: { dims?: number; m?: number; efConstruction?: number } = { dims: 384, m: 16, efConstruction: 200 }
) {
  const db = getLibSQLClient()
  const { dims = 384, m = 16, efConstruction = 200 } = options
  await db.execute({
    sql: `
      CREATE INDEX IF NOT EXISTS embeddings_hnsw
        ON embeddings USING HNSW (vector)
        WITH (dims = ?, m = ?, efConstruction = ?);
    `,
    args: [dims, m, efConstruction],
  })
}

// Perform vector similarity search on embeddings using native HNSW
export async function vectorSearch(
  queryVector: Float32Array,
  limit = 5
): Promise<Array<{ id: string; similarity: number }>> {
  const db = getLibSQLClient()
  const buffer = Buffer.from(queryVector.buffer)
  const result = await db.execute({
    sql: `
      SELECT id, vector <-> ? AS similarity
      FROM embeddings
      ORDER BY similarity ASC
      LIMIT ?;
    `,
    args: [buffer, limit],
  })
  return result.rows.map(row => ({ id: row.id as string, similarity: row.similarity as number }))
}

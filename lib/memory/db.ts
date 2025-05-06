import { createClient, Client } from "@libsql/client"

// Singleton instance for connection reuse
let libsqlClient: Client | null = null

// Initialize the LibSQL client for agent memory and threads
export const getLibSQLClient = () => {
  if (libsqlClient) {
    return libsqlClient
  }

  const url = process.env.LIBSQL_DATABASE_URL || ".output/memory.db"
  if (!url) {
    throw new Error("LIBSQL_DATABASE_URL environment variable is not set")
  }

  libsqlClient = createClient({
    url,
    authToken: process.env.LIBSQL_AUTH_TOKEN || "",
  })

  return libsqlClient
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
    libsqlClient = null // Reset the client on connection error
    return false
  }
}

// Helper function to execute a query with proper error handling
export async function query(sql: string, params: any[] = []) {
  try {
    const db = getLibSQLClient()
    const result = await db.execute({
      sql,
      args: params,
    })
    return result
  } catch (error) {
    console.error("LibSQL query error:", error)
    throw error
  }
}

// Helper function to execute multiple queries in a transaction
export async function transaction(queries: { sql: string; params: any[] }[]) {
  const db = getLibSQLClient()

  try {
    await db.execute("BEGIN TRANSACTION")

    for (const { sql, params } of queries) {
      await db.execute({ sql, args: params })
    }

    await db.execute("COMMIT")
    return true
  } catch (error) {
    try {
      await db.execute("ROLLBACK")
    } catch (rollbackError) {
      console.error("Error during transaction rollback:", rollbackError)
    }
    console.error("LibSQL transaction error:", error)
    throw error
  }
}

// Alternative transaction method using batch
export async function batchTransaction(queries: { sql: string; params: any[] }[]) {
  try {
    const db = getLibSQLClient()
    return await db.batch(
      queries.map((q) => ({
        sql: q.sql,
        args: q.params,
      })),
    )
  } catch (error) {
    console.error("Database batch transaction error:", error)
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

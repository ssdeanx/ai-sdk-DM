import { createClient } from "@libsql/client"

// Initialize the LibSQL client for agent memory and threads
export const getLibSQLClient = () => {
  // Check if database URL is available
  if (!process.env.LIBSQL_NEON_DATABASE_URL) {
    throw new Error("LIBSQL_DATABASE_URL environment variable is not set")
  }

  // Create and return client
  return createClient({
    url: process.env.LIBSQL_DATABASE_URL!,
    authToken: process.env.LIBSQL_AUTH_TOKEN,
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

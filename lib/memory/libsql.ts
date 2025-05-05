import { createClient } from "@libsql/client"

// Initialize LibSQL client for agent memory and threads
export const createLibSQLClient = () => {
  const url = process.env.LIBSQL_NEON_DATABASE_URL
  const authToken = process.env.LIBSQL_AUTH_TOKEN

  if (!url) {
    throw new Error("LibSQL database URL not found. Please set LIBSQL_DATABASE_URL environment variable.")
  }

  return createClient({ url, authToken })
}

// Check if LibSQL is available
export const isLibSQLAvailable = async () => {
  const client = createLibSQLClient()

  try {
    await client.execute("SELECT 1")
    return true
  } catch (error) {
    console.error("Error checking LibSQL availability:", error)
    return false
  }
}

// Function to get memory for a specific thread
export async function getMemory(threadId: string) {
  const client = createLibSQLClient()

  try {
    const result = await client.execute({
      sql: "SELECT * FROM memory WHERE thread_id = ? ORDER BY created_at ASC",
      args: [threadId],
    })

    return result.rows
  } catch (error) {
    console.error("Error fetching memory:", error)
    throw error
  }
}

// Function to add a memory entry
export async function addMemory(threadId: string, role: string, content: string, metadata?: any) {
  const client = createLibSQLClient()

  try {
    const result = await client.execute({
      sql: "INSERT INTO memory (thread_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, datetime('now')) RETURNING *",
      args: [threadId, role, content, metadata ? JSON.stringify(metadata) : null],
    })

    return result.rows[0]
  } catch (error) {
    console.error("Error adding memory:", error)
    throw error
  }
}

// Function to get all threads
export async function getThreads() {
  const client = createLibSQLClient()

  try {
    const result = await client.execute({
      sql: "SELECT DISTINCT thread_id, MAX(created_at) as last_updated FROM memory GROUP BY thread_id ORDER BY last_updated DESC",
    })

    return result.rows
  } catch (error) {
    console.error("Error fetching threads:", error)
    throw error
  }
}

// Function to delete a thread and all its memories
export async function deleteThread(threadId: string) {
  const client = createLibSQLClient()

  try {
    await client.execute({
      sql: "DELETE FROM memory WHERE thread_id = ?",
      args: [threadId],
    })

    return true
  } catch (error) {
    console.error("Error deleting thread:", error)
    throw error
  }
}

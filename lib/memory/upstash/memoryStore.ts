import { Redis } from '@upstash/redis'
import { Index } from "@upstash/vector"
import { v4 as generateUUID } from "uuid"

// Singleton instances for connection reuse
let redisClient: Redis | null = null
let vectorClient: Index | null = null

// Initialize Redis client
export const getRedisClient = () => {
  if (redisClient) {
    return redisClient
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error("Upstash Redis credentials not found. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.")
  }

  redisClient = new Redis({
    url,
    token,
  })

  return redisClient
}

// Initialize Vector client
export const getVectorClient = () => {
  if (vectorClient) {
    return vectorClient
  }

  const url = process.env.UPSTASH_VECTOR_REST_URL
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN

  if (!url || !token) {
    throw new Error("Upstash Vector credentials not found. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.")
  }

  vectorClient = new Index({
    url,
    token,
  })

  return vectorClient
}

// Check if Upstash is available
export const isUpstashAvailable = async () => {
  try {
    const redis = getRedisClient()
    await redis.ping()
    return true
  } catch (error) {
    console.error("Error checking Upstash availability:", error)
    return false
  }
}

// Thread operations
export async function createThread(name: string, metadata: any = {}) {
  const redis = getRedisClient()
  const threadId = generateUUID()
  const now = new Date().toISOString()

  const thread = {
    id: threadId,
    name,
    metadata,
    created_at: now,
    updated_at: now,
  }

  await redis.hset(`thread:${threadId}`, thread)
  await redis.zadd("threads", { score: Date.now(), member: threadId })

  return threadId
}

export async function getThread(threadId: string) {
  const redis = getRedisClient()
  return await redis.hgetall(`thread:${threadId}`)
}

export async function listThreads(limit = 10, offset = 0) {
  const redis = getRedisClient()
  const threadIds = await redis.zrange("threads", offset, offset + limit - 1, { rev: true })

  const threads = []
  for (const threadId of threadIds) {
    const thread = await getThread(threadId as string)
    threads.push(thread)
  }

  return threads
}

export async function deleteThread(threadId: string) {
  const redis = getRedisClient()

  // Get all message IDs for this thread
  const messageIds = await redis.smembers(`thread:${threadId}:messages`)

  // Delete all messages
  for (const messageId of messageIds) {
    await redis.del(`message:${messageId}`)
  }

  // Delete thread metadata and references
  await redis.del(`thread:${threadId}:messages`)
  await redis.del(`thread:${threadId}`)
  await redis.zrem("threads", threadId)

  return true
}

// Message operations
export async function saveMessage(threadId: string, message: {
  role: string
  content: string
  metadata?: any
}) {
  const redis = getRedisClient()
  const messageId = generateUUID()
  const now = new Date().toISOString()

  const messageData = {
    id: messageId,
    thread_id: threadId,
    role: message.role,
    content: message.content,
    metadata: JSON.stringify(message.metadata || {}),
    created_at: now,
  }

  // Save message
  await redis.hset(`message:${messageId}`, messageData)

  // Add to thread's message set
  await redis.sadd(`thread:${threadId}:messages`, messageId)

  // Update thread's updated_at timestamp
  await redis.hset(`thread:${threadId}`, { updated_at: now })

  // Update thread's position in the sorted set
  await redis.zadd("threads", { score: Date.now(), member: threadId })

  return messageId
}

export async function getMessages(threadId: string) {
  const redis = getRedisClient()

  // Get all message IDs for this thread
  const messageIds = await redis.smembers(`thread:${threadId}:messages`)

  // Get all messages
  const messages: any[] = []
  for (const messageId of messageIds) {
    const message = await redis.hgetall(`message:${messageId}`)

    if (message) {
      // Parse metadata
      if (message.metadata) {
        try {
          message.metadata = JSON.parse(message.metadata as string)
        } catch (e) {
          console.error("Error parsing message metadata:", e)
          message.metadata = {}
        }
      }

      messages.push(message)
    }
  }

  // Sort by created_at
  return messages.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at as string).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at as string).getTime() : 0
    return aTime - bTime
  })
}

// Vector operations
export async function storeEmbedding(text: string, vector: number[], metadata: any = {}) {
  const vectorDb = getVectorClient()
  const id = generateUUID()

  await vectorDb.upsert({
    id,
    vector,
    metadata: {
      ...metadata,
      text,
      created_at: new Date().toISOString()
    },
  })

  return id
}

export async function searchEmbeddings(vector: number[], limit = 5) {
  const vectorDb = getVectorClient()

  const results = await vectorDb.query({
    vector,
    topK: limit,
    includeMetadata: true,
  })

  return results
}

// Export for convenience
export { getRedisClient as Memory, getVectorClient as Vectordb }
import { streamText, generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { getLibSQLClient } from "./memory/db"
import { getEncoding } from "js-tiktoken"
import { pipeline } from "@xenova/transformers"

// Initialize Google AI provider with enhanced capabilities
export function getGoogleAI(apiKey: string, baseURL?: string) {
  return createGoogleGenerativeAI({
    apiKey: apiKey || process.env.GOOGLE_API_KEY,
    ...(baseURL ? { baseURL } : {}),
  })
}

// Stream AI response with enhanced capabilities
export async function streamAIResponse(
  providerName: string,
  modelName: string,
  apiKey: string,
  messages: any[],
  options: {
    tools?: any
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
    stopSequences?: string[]
  } = {},
  baseURL?: string,
) {
  try {
    // Initialize AI provider
    let provider
    let model

    if (providerName.toLowerCase() === "google") {
      provider = getGoogleAI(apiKey, baseURL)
      model = provider(modelName)
    } else {
      throw new Error(`Provider ${providerName} not supported yet`)
    }

    // Stream the response using AI SDK
    const result = streamText({
      model,
      messages,
      ...options,
    })

    return result
  } catch (error) {
    console.error("Error streaming AI response:", error)
    throw error
  }
}

// Generate AI response (non-streaming)
export async function generateAIResponse(
  providerName: string,
  modelName: string,
  apiKey: string,
  messages: any[],
  options: {
    tools?: any
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
    stopSequences?: string[]
  } = {},
  baseURL?: string,
) {
  try {
    // Initialize AI provider
    let provider
    let model

    if (providerName.toLowerCase() === "google") {
      provider = getGoogleAI(apiKey, baseURL)
      model = provider(modelName)
    } else {
      throw new Error(`Provider ${providerName} not supported yet`)
    }

    // Generate the response using AI SDK
    const result = await generateText({
      model,
      messages,
      ...options,
    })

    return result
  } catch (error) {
    console.error("Error generating AI response:", error)
    throw error
  }
}

// Count tokens in a text using js-tiktoken
export function countTokens(text: string, modelName = "gpt-4") {
  try {
    // Note: js-tiktoken might require specific encoding names like 'cl100k_base' for gpt-4
    // Adjust the encoding name based on the model if needed.
    const encoding = getEncoding("cl100k_base") // Or map modelName to encoding name
    const tokens = encoding.encode(text)
    return tokens.length
  } catch (error) {
    console.error("Error counting tokens:", error)
    // Fallback to approximate token count (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4)
  }
}

// Generate embeddings using @xenova/transformers
let embeddingModel: any = null

export async function generateEmbedding(text: string) {
  try {
    if (!embeddingModel) {
      // Initialize the embedding model
      embeddingModel = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
    }

    const result = await embeddingModel(text, {
      pooling: "mean",
      normalize: true,
    })

    return result.data
  } catch (error) {
    console.error("Error generating embedding:", error)
    throw error
  }
}

// Save embedding to database
export async function saveEmbedding(vector: Float32Array, model = "all-MiniLM-L6-v2") {
  try {
    const db = getLibSQLClient()
    const id = crypto.randomUUID()

    // Convert Float32Array to Buffer
    const buffer = Buffer.from(vector.buffer)

    await db.execute({
      sql: `
        INSERT INTO embeddings (id, vector, model, dimensions)
        VALUES (?, ?, ?, ?)
      `,
      args: [id, buffer, model, vector.length],
    })

    return id
  } catch (error) {
    console.error("Error saving embedding:", error)
    throw error
  }
}

// Perform vector search
export async function performVectorSearch(vector: Float32Array, limit = 5) {
  try {
    const db = getLibSQLClient()

    // This is a simplified approach - in a real implementation, you would use
    // a vector database or extension that supports efficient similarity search
    // For now, we'll retrieve all embeddings and compute similarity in JS

    const result = await db.execute({
      sql: `SELECT id, vector FROM embeddings`,
    })

    const similarities = result.rows.map((row) => {
      // Assuming row.vector is returned as Uint8Array for BLOB data
      const storedVector = new Float32Array((row.vector as unknown as Uint8Array).buffer)
      const similarity = cosineSimilarity(vector, storedVector)
      return {
        id: row.id,
        similarity,
      }
    })

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity)

    // Return top results
    return similarities.slice(0, limit)
  } catch (error) {
    console.error("Error performing vector search:", error)
    throw error
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

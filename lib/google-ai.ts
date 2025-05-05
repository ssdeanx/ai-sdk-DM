import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { streamText, generateText } from "ai"
import { getSupabaseClient } from "./memory/supabase"

// Initialize Google AI provider
export function getGoogleAI(apiKey?: string, baseURL?: string) {
  return createGoogleGenerativeAI({
    apiKey: apiKey || process.env.GOOGLE_API_KEY,
    ...(baseURL ? { baseURL } : {}),
  })
}

// Get model configuration from Supabase
export async function getModelConfig(modelId: string) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.from("models").select("*").eq("id", modelId).single()

  if (error) {
    console.error("Error fetching model config:", error)
    throw error
  }

  return data
}

// Stream text with Google AI
export async function streamGoogleAI({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  apiKey,
  baseURL,
}: {
  modelId: string
  messages: any[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>
  apiKey?: string
  baseURL?: string
}) {
  try {
    // Get model configuration if not provided
    let modelConfig

    if (!modelId.includes("gemini")) {
      modelConfig = await getModelConfig(modelId)
      if (!modelConfig) {
        throw new Error(`Model configuration not found for ID: ${modelId}`)
      }
    } else {
      modelConfig = {
        model_id: modelId,
        provider: "google",
      }
    }

    // Initialize Google AI
    const googleAI = getGoogleAI(apiKey, baseURL)
    const model = googleAI(modelConfig.model_id)

    // Stream the response
    const result = await streamText({
      model,
      messages,
      temperature,
      maxTokens,
      ...(Object.keys(tools).length > 0 ? { tools } : {}),
    })

    return result
  } catch (error) {
    console.error("Error streaming Google AI response:", error)
    throw error
  }
}

// Generate text with Google AI (non-streaming)
export async function generateGoogleAI({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  apiKey,
  baseURL,
}: {
  modelId: string
  messages: any[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>
  apiKey?: string
  baseURL?: string
}) {
  try {
    // Get model configuration if not provided
    let modelConfig

    if (!modelId.includes("gemini")) {
      modelConfig = await getModelConfig(modelId)
      if (!modelConfig) {
        throw new Error(`Model configuration not found for ID: ${modelId}`)
      }
    } else {
      modelConfig = {
        model_id: modelId,
        provider: "google",
      }
    }

    // Initialize Google AI
    const googleAI = getGoogleAI(apiKey, baseURL)
    const model = googleAI(modelConfig.model_id)

    // Generate the response
    const result = await generateText({
      model,
      messages,
      temperature,
      maxTokens,
      ...(Object.keys(tools).length > 0 ? { tools } : {}),
    })

    return result
  } catch (error) {
    console.error("Error generating Google AI response:", error)
    throw error
  }
}

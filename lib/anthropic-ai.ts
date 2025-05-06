import { createAnthropic } from "@ai-sdk/anthropic"
import { streamText, generateText } from "ai"
import { getSupabaseClient } from "./memory/supabase"

// Initialize Anthropic provider
export function getAnthropic(apiKey?: string, baseURL?: string) {
  return createAnthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
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

// Stream text with Anthropic
export async function streamAnthropic({
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

    if (!modelId.includes("claude")) {
      modelConfig = await getModelConfig(modelId)
      if (!modelConfig) {
        throw new Error(`Model configuration not found for ID: ${modelId}`)
      }
    } else {
      modelConfig = {
        model_id: modelId,
        provider: "anthropic",
      }
    }

    // Initialize Anthropic
    const anthropic = getAnthropic(apiKey, baseURL)
    const model = anthropic(modelConfig.model_id)

    // Stream the response
    const result = streamText({
      model,
      messages,
      temperature,
      maxTokens,
      ...(Object.keys(tools).length > 0 ? { tools } : {}),
    })

    return result
  } catch (error) {
    console.error("Error streaming Anthropic response:", error)
    throw error
  }
}

// Generate text with Anthropic (non-streaming)
export async function generateAnthropic({
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

    if (!modelId.includes("claude")) {
      modelConfig = await getModelConfig(modelId)
      if (!modelConfig) {
        throw new Error(`Model configuration not found for ID: ${modelId}`)
      }
    } else {
      modelConfig = {
        model_id: modelId,
        provider: "anthropic",
      }
    }

    // Initialize Anthropic
    const anthropic = getAnthropic(apiKey, baseURL)
    const model = anthropic(modelConfig.model_id)

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
    console.error("Error generating Anthropic response:", error)
    throw error
  }
}

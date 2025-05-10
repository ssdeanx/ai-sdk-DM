import { createOpenAI } from "@ai-sdk/openai"
import { streamText, generateText } from "ai"
import { getSupabaseClient } from "./memory/supabase"

// Initialize OpenAI provider
export function getOpenAI(apiKey?: string, baseURL?: string) {
  return createOpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
    ...(baseURL ? { baseURL } : {}),
  })
}

// Get model configuration from Supabase
export async function getModelConfig(modelId: string) {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase.from("models").select("*").eq("id", modelId).single()

  if (error) {
    console.error("Error fetching model config:", error)
    throw error
  }

  return data
}
// Stream text with OpenAI
export async function streamOpenAI({
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

    if (!modelId.includes("gpt")) {
      modelConfig = await getModelConfig(modelId)
      if (!modelConfig) {
        throw new Error(`Model configuration not found for ID: ${modelId}`)
      }
    } else {
      modelConfig = {
        model_id: modelId,
        provider: "openai",
      }
    }

    // Initialize OpenAI
    const openAI = getOpenAI(apiKey, baseURL)
    const model = openAI(modelConfig.model_id)

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
    console.error("Error streaming OpenAI response:", error)
    throw error
  }
}

// Generate text with OpenAI (non-streaming)
export async function generateOpenAI({
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

    if (!modelId.includes("gpt")) {
      modelConfig = await getModelConfig(modelId)
      if (!modelConfig) {
        throw new Error(`Model configuration not found for ID: ${modelId}`)
      }
    } else {
      modelConfig = {
        model_id: modelId,
        provider: "openai",
      }
    }

    // Initialize OpenAI
    const openAI = getOpenAI(apiKey, baseURL)
    const model = openAI(modelConfig.model_id)

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
    console.error("Error generating OpenAI response:", error)
    throw error
  }
}

import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { streamText, generateText } from "ai"
import { getSupabaseClient } from "./memory/supabase"

// Define model configuration type
export interface ModelConfig {
  model_id: string
  provider: string
  max_tokens?: number
  context_window?: number
  supports_vision?: boolean
  supports_functions?: boolean
  supports_streaming?: boolean
  default_temperature?: number
  api_key?: string
  base_url?: string
  capabilities?: {
    text?: boolean
    vision?: boolean
    audio?: boolean
    video?: boolean
    functions?: boolean
    streaming?: boolean
    json_mode?: boolean
    fine_tuning?: boolean
    thinking?: boolean
    search_grounding?: boolean
    dynamic_retrieval?: boolean
    hybrid_grounding?: boolean
    cached_content?: boolean
    code_execution?: boolean
    structured_output?: boolean
    image_generation?: boolean
    video_generation?: boolean
    audio_generation?: boolean
    response_modalities?: boolean
    file_inputs?: boolean
  }
}

// Default model configurations for the latest Google models
export const GOOGLE_MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Gemini 2.5 Models
  "models/gemini-2.5-pro-preview-05-06": {
    model_id: "models/gemini-2.5-pro-preview-05-06",
    provider: "google",
    max_tokens: 65536,
    context_window: 1048576,
    supports_vision: true,
    supports_functions: true,
    supports_streaming: true,
    default_temperature: 0.7,
    capabilities: {
      text: true,
      vision: true,
      audio: true,
      video: true,
      functions: true,
      streaming: true,
      json_mode: true,
      fine_tuning: false,
      thinking: true,
      search_grounding: true,
      dynamic_retrieval: true,
      hybrid_grounding: true,
      cached_content: true,
      code_execution: true,
      structured_output: true,
      image_generation: false,
      video_generation: false,
      audio_generation: false,
      response_modalities: true,
      file_inputs: true
    }
  },
  "models/gemini-2.5-flash-preview-04-17": {
    model_id: "models/gemini-2.5-flash-preview-04-17",
    provider: "google",
    max_tokens: 65536,
    context_window: 1048576,
    supports_vision: true,
    supports_functions: true,
    supports_streaming: true,
    default_temperature: 0.7,
    capabilities: {
      text: true,
      vision: true,
      audio: true,
      video: true,
      functions: true,
      streaming: true,
      json_mode: true,
      fine_tuning: false,
      thinking: true,
      search_grounding: true,
      dynamic_retrieval: true,
      hybrid_grounding: true,
      cached_content: true,
      code_execution: true,
      structured_output: true,
      image_generation: false,
      video_generation: false,
      audio_generation: false,
      response_modalities: true,
      file_inputs: true
    }
  },
  // Gemini 2.0 Models
  "models/gemini-2.0-pro": {
    model_id: "models/gemini-2.0-pro",
    provider: "google",
    max_tokens: 8192,
    context_window: 32768,
    supports_vision: true,
    supports_functions: true,
    supports_streaming: true,
    default_temperature: 0.7,
    capabilities: {
      text: true,
      vision: true,
      audio: true,
      video: true,
      functions: true,
      streaming: true,
      json_mode: true,
      fine_tuning: false,
      thinking: true,
      search_grounding: true,
      dynamic_retrieval: true,
      hybrid_grounding: true,
      cached_content: false,
      code_execution: true,
      structured_output: true,
      image_generation: false,
      video_generation: false,
      audio_generation: false,
      response_modalities: true,
      file_inputs: true
    }
  },
  "models/gemini-2.0-flash": {
    model_id: "models/gemini-2.0-flash",
    provider: "google",
    max_tokens: 8192,
    context_window: 32768,
    supports_vision: true,
    supports_functions: true,
    supports_streaming: true,
    default_temperature: 0.7,
    capabilities: {
      text: true,
      vision: true,
      audio: true,
      video: true,
      functions: true,
      streaming: true,
      json_mode: true,
      fine_tuning: false,
      thinking: false,
      search_grounding: true,
      dynamic_retrieval: true,
      hybrid_grounding: true,
      cached_content: false,
      code_execution: true,
      structured_output: true,
      image_generation: false,
      video_generation: false,
      audio_generation: false,
      response_modalities: true,
      file_inputs: true
    }
  },
  "models/gemini-2.0-flash-live-001": {
    model_id: "models/gemini-2.0-flash-live-001",
    provider: "google",
    max_tokens: 8192,
    context_window: 1048576,
    supports_vision: true,
    supports_functions: true,
    supports_streaming: true,
    default_temperature: 0.7,
    capabilities: {
      text: true,
      vision: true,
      audio: true,
      video: true,
      functions: true,
      streaming: true,
      json_mode: true,
      fine_tuning: false,
      thinking: false,
      search_grounding: true,
      dynamic_retrieval: true,
      hybrid_grounding: true,
      cached_content: false,
      code_execution: true,
      structured_output: true,
      image_generation: false,
      video_generation: false,
      audio_generation: true,
      response_modalities: true,
      file_inputs: true
    }
  },
  // Gemini 1.5 Models
  "models/gemini-1.5-pro": {
    model_id: "models/gemini-1.5-pro",
    provider: "google",
    max_tokens: 8192,
    context_window: 1048576,
    supports_vision: true,
    supports_functions: true,
    supports_streaming: true,
    default_temperature: 0.7,
    capabilities: {
      text: true,
      vision: true,
      audio: true,
      video: true,
      functions: true,
      streaming: true,
      json_mode: true,
      fine_tuning: false,
      thinking: false,
      search_grounding: true,
      dynamic_retrieval: true,
      hybrid_grounding: true,
      cached_content: true,
      code_execution: true,
      structured_output: true,
      image_generation: false,
      video_generation: false,
      audio_generation: false,
      response_modalities: true,
      file_inputs: true
    }
  },
  "models/gemini-1.5-flash": {
    model_id: "models/gemini-1.5-flash",
    provider: "google",
    max_tokens: 8192,
    context_window: 1048576,
    supports_vision: true,
    supports_functions: true,
    supports_streaming: true,
    default_temperature: 0.7,
    capabilities: {
      text: true,
      vision: true,
      audio: true,
      video: true,
      functions: true,
      streaming: true,
      json_mode: true,
      fine_tuning: false,
      thinking: false,
      search_grounding: true,
      dynamic_retrieval: true,
      hybrid_grounding: true,
      cached_content: true,
      code_execution: true,
      structured_output: true,
      image_generation: false,
      video_generation: false,
      audio_generation: false,
      response_modalities: true,
      file_inputs: true
    }
  },
  // Embedding Models
  "models/gemini-embedding-exp-03-07": {
    model_id: "models/gemini-embedding-exp-03-07",
    provider: "google",
    max_tokens: 8192,
    context_window: 8192,
    supports_vision: false,
    supports_functions: false,
    supports_streaming: false,
    default_temperature: 0.0,
    capabilities: {
      text: true,
      vision: false,
      audio: false,
      video: false,
      functions: false,
      streaming: false,
      json_mode: false,
      fine_tuning: false,
      thinking: false,
      search_grounding: false,
      dynamic_retrieval: false,
      hybrid_grounding: false,
      cached_content: false,
      code_execution: false,
      structured_output: false,
      image_generation: false,
      video_generation: false,
      audio_generation: false,
      response_modalities: false,
      file_inputs: false
    }
  },
  "models/text-embedding-004": {
    model_id: "models/text-embedding-004",
    provider: "google",
    max_tokens: 2048,
    context_window: 2048,
    supports_vision: false,
    supports_functions: false,
    supports_streaming: false,
    default_temperature: 0.0,
  },
  // Image Generation Models
  "models/imagen-3.0-generate-002": {
    model_id: "models/imagen-3.0-generate-002",
    provider: "google",
    max_tokens: 4096,
    context_window: 4096,
    supports_vision: false,
    supports_functions: false,
    supports_streaming: false,
    default_temperature: 0.7,
  },
  // Video Generation Models
  "models/veo-2.0-generate-001": {
    model_id: "models/veo-2.0-generate-001",
    provider: "google",
    max_tokens: 4096,
    context_window: 4096,
    supports_vision: true,
    supports_functions: false,
    supports_streaming: false,
    default_temperature: 0.7,
  },
}

// Initialize Google AI provider
export function getGoogleAI(apiKey?: string, baseURL?: string) {
  return createGoogleGenerativeAI({
    apiKey: apiKey || process.env.GOOGLE_API_KEY,
    ...(baseURL ? { baseURL } : {}),
  })
}

// Get model configuration from Supabase or default configs
export async function getModelConfig(modelId: string) {
  // Check if we have a default configuration for this model
  const normalizedModelId = modelId.startsWith("models/") ? modelId : `models/${modelId}`

  if (GOOGLE_MODEL_CONFIGS[modelId] || GOOGLE_MODEL_CONFIGS[normalizedModelId]) {
    return GOOGLE_MODEL_CONFIGS[modelId] || GOOGLE_MODEL_CONFIGS[normalizedModelId]
  }

  // If not in default configs, try to get from Supabase
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("models").select("*").eq("id", modelId).single()

    if (error) {
      console.error("Error fetching model config:", error)
      // Fall back to a default configuration
      return {
        model_id: modelId,
        provider: "google",
        max_tokens: 8192,
        context_window: 32768,
        supports_vision: modelId.includes("vision") || modelId.includes("pro"),
        supports_functions: true,
        supports_streaming: true,
        default_temperature: 0.7,
      }
    }

    return data
  } catch (error) {
    console.error("Error accessing Supabase:", error)
    // Fall back to a default configuration
    return {
      model_id: modelId,
      provider: "google",
      max_tokens: 8192,
      context_window: 32768,
      supports_vision: modelId.includes("vision") || modelId.includes("pro"),
      supports_functions: true,
      supports_streaming: true,
      default_temperature: 0.7,
    }
  }
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
    let modelConfig

    // Get model configuration
    modelConfig = await getModelConfig(modelId)

    // Initialize Google AI
    const googleAI = getGoogleAI(apiKey, baseURL)
    const model = googleAI(modelConfig.model_id)

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

    // Get model configuration
    modelConfig = await getModelConfig(modelId)

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

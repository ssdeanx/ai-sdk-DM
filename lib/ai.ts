import { generateText, streamText } from "ai"
import { createGoogleGenerativeAI, GoogleGenerativeAIProvider } from "@ai-sdk/google"
// Import other providers as needed
// import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
// import { createAnthropic, AnthropicProvider } from '@ai-sdk/anthropic'
import { getItemById } from "./memory/supabase"

// Define a union type for possible providers (add others when implemented)
type AIProvider = GoogleGenerativeAIProvider // | OpenAIProvider | AnthropicProvider;

// Initialize Google AI provider
export function getGoogleAI(apiKey?: string, baseURL?: string) {
  return createGoogleGenerativeAI({
    apiKey: apiKey || process.env.GOOGLE_API_KEY,
    ...(baseURL ? { baseURL } : {}),
  })
}

// Initialize OpenAI provider
export function getOpenAI(apiKey: string, baseURL?: string) {
  // Uncomment when needed
  // return createOpenAI({
  //   apiKey,
  //   ...(baseURL ? { baseURL } : {})
  // })
  throw new Error("OpenAI provider not implemented yet")
}

// Initialize Anthropic provider
export function getAnthropic(apiKey: string, baseURL?: string) {
  // Uncomment when needed
  // return createAnthropic({
  //   apiKey,
}

// Get provider based on name
export async function getProviderByName(providerName: string, apiKey?: string, baseURL?: string): Promise<AIProvider> {
  switch (providerName.toLowerCase()) {
    case "google":
      return getGoogleAI(apiKey, baseURL)
    case "openai":
      // return getOpenAI(apiKey, baseURL); // Uncomment and implement when ready
      throw new Error("OpenAI provider not implemented yet")
    case "anthropic":
      // return getAnthropic(apiKey, baseURL); // Uncomment and implement when ready
      throw new Error("Anthropic provider not implemented yet")
    default:
      throw new Error(`Unsupported provider: ${providerName}`)
  }
}

// Generate text with AI model
export async function generateAIResponse(
  providerName: string,
  modelId: string,
  messages: any[],
  options: {
    apiKey?: string
    baseURL?: string
    tools?: any
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
    stopSequences?: string[]
    systemPrompt?: string
  } = {},
) {
  try {
    // Fetch model config from Supabase
    const modelConfig = await getItemById<any>("models", modelId)
    if (!modelConfig) {
      throw new Error(`Model config not found for modelId: ${modelId}`)
    }
    const provider = await getProviderByName(
      modelConfig.provider,
      modelConfig.api_key,
      modelConfig.base_url || undefined
    )
    const model = provider(modelConfig.model_id)

    // Add system prompt if provided and not already in messages
    const finalMessages = [...messages]
    if (options.systemPrompt && !messages.some((msg) => msg.role === "system")) {
      finalMessages.unshift({ role: "system", content: options.systemPrompt })
    }

    // Generate response
    const result = await generateText({
      model,
      messages: finalMessages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      stopSequences: options.stopSequences,
      ...(options.tools && Object.keys(options.tools).length > 0 ? { tools: options.tools } : {}),
    })

    return result
  } catch (error) {
    console.error("Error generating AI response:", error)
    throw error
  }
}

// Stream text with AI model
export async function streamAIResponse(
  providerName: string,
  modelId: string,
  messages: any[],
  options: {
    apiKey?: string
    baseURL?: string
    tools?: any
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
    stopSequences?: string[]
    systemPrompt?: string
    onChunk?: (chunk: any) => void
  } = {},
) {
  try {
    // Fetch model config from Supabase
    const modelConfig = await getItemById<any>("models", modelId)
    if (!modelConfig) {
      throw new Error(`Model config not found for modelId: ${modelId}`)
    }
    const provider = await getProviderByName(
      modelConfig.provider,
      modelConfig.api_key,
      modelConfig.base_url || undefined
    )
    const model = provider(modelConfig.model_id)

    // Add system prompt if provided and not already in messages
    const finalMessages = [...messages]
    if (options.systemPrompt && !messages.some((msg) => msg.role === "system")) {
      finalMessages.unshift({ role: "system", content: options.systemPrompt })
    }

    // Stream response
    const result = streamText({
      model,
      messages: finalMessages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      stopSequences: options.stopSequences,
      ...(options.tools && Object.keys(options.tools).length > 0 ? { tools: options.tools } : {}),
      onChunk: options.onChunk,
    })

    return result
  } catch (error) {
    console.error("Error streaming AI response:", error)
    throw error
  }
}

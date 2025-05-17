import { generateText, streamText } from 'ai';
import {
  createGoogleGenerativeAI,
  GoogleGenerativeAIProvider,
} from '@ai-sdk/google';
import { createVertex, GoogleVertexProvider } from '@ai-sdk/google-vertex';
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { createAnthropic, AnthropicProvider } from '@ai-sdk/anthropic';
import { getItemById } from './memory/supabase';
import { getItemById as getUpstashItemById } from './memory/upstash/supabase-adapter';
import { shouldUseUpstash } from './memory/supabase';

// Define a union type for possible providers
type AIProvider =
  | GoogleGenerativeAIProvider
  | GoogleVertexProvider
  | OpenAIProvider
  | AnthropicProvider;

// Initialize Google AI provider
export function getGoogleAI(apiKey?: string, baseURL?: string) {
  return createGoogleGenerativeAI({
    apiKey: apiKey || process.env.GOOGLE_API_KEY,
    ...(baseURL ? { baseURL } : {}),
  });
}

// Initialize OpenAI provider
export function getOpenAI(apiKey: string, baseURL?: string) {
  if (!apiKey) {
    throw new Error('API key is required for OpenAI');
  }
  return createOpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

// Initialize Anthropic provider
export function getAnthropic(apiKey: string, baseURL?: string) {
  if (!apiKey) {
    throw new Error('API key is required for Anthropic');
  }
  return createAnthropic({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

// Initialize Google Vertex AI provider
export function getGoogleVertex(project?: string, location?: string) {
  const effectiveProject = project || process.env.GOOGLE_VERTEX_PROJECT_ID;
  const effectiveLocation =
    location || process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';

  if (!effectiveProject) {
    throw new Error('Project ID is required for Google Vertex AI');
  }

  return createVertex({
    project: effectiveProject,
    location: effectiveLocation,
  });
}

// Get provider based on name
export async function getProviderByName(
  providerName: string,
  apiKey?: string,
  baseURL?: string,
  project?: string,
  location?: string
): Promise<AIProvider> {
  switch (providerName.toLowerCase()) {
    case 'google':
      return getGoogleAI(apiKey, baseURL);
    case 'google-vertex':
      return getGoogleVertex(project, location);
    case 'openai':
      return getOpenAI(apiKey || '', baseURL);
    case 'anthropic':
      return getAnthropic(apiKey || '', baseURL);
    default:
      throw new Error(`Unsupported provider: ${providerName}`);
  }
}

// Generate text with AI model
export async function generateAIResponse(
  providerName: string,
  modelId: string,
  messages: any[],
  options: {
    apiKey?: string;
    baseURL?: string;
    tools?: any;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
    systemPrompt?: string;
  } = {}
) {
  try {
    // Fetch model config from Upstash or Supabase
    let modelConfig;

    if (shouldUseUpstash()) {
      // Use Upstash adapter
      modelConfig = await getUpstashItemById<any>('models', modelId);
    } else {
      // Use regular Supabase
      modelConfig = await getItemById<any>('models', modelId);
    }

    if (!modelConfig) {
      throw new Error(`Model config not found for modelId: ${modelId}`);
    }

    const provider = await getProviderByName(
      modelConfig.provider,
      modelConfig.api_key,
      modelConfig.base_url || undefined
    );
    const model = provider(modelConfig.model_id);

    // Add system prompt if provided and not already in messages
    const finalMessages = [...messages];
    if (
      options.systemPrompt &&
      !messages.some((msg) => msg.role === 'system')
    ) {
      finalMessages.unshift({ role: 'system', content: options.systemPrompt });
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
      ...(options.tools && Object.keys(options.tools).length > 0
        ? { tools: options.tools }
        : {}),
    });

    return result;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}

// Stream text with AI model
export async function streamAIResponse(
  providerName: string,
  modelId: string,
  messages: any[],
  options: {
    apiKey?: string;
    baseURL?: string;
    tools?: any;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
    systemPrompt?: string;
    onChunk?: (chunk: any) => void;
  } = {}
) {
  try {
    // Fetch model config from Upstash or Supabase
    let modelConfig;

    if (shouldUseUpstash()) {
      // Use Upstash adapter
      modelConfig = await getUpstashItemById<any>('models', modelId);
    } else {
      // Use regular Supabase
      modelConfig = await getItemById<any>('models', modelId);
    }

    if (!modelConfig) {
      throw new Error(`Model config not found for modelId: ${modelId}`);
    }

    const provider = await getProviderByName(
      modelConfig.provider,
      modelConfig.api_key,
      modelConfig.base_url || undefined
    );
    const model = provider(modelConfig.model_id);

    // Add system prompt if provided and not already in messages
    const finalMessages = [...messages];
    if (
      options.systemPrompt &&
      !messages.some((msg) => msg.role === 'system')
    ) {
      finalMessages.unshift({ role: 'system', content: options.systemPrompt });
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
      ...(options.tools && Object.keys(options.tools).length > 0
        ? { tools: options.tools }
        : {}),
      onChunk: options.onChunk,
    });

    return result;
  } catch (error) {
    console.error('Error streaming AI response:', error);
    throw error;
  }
}

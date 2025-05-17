import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  streamText,
  generateText,
  convertToCoreMessages,
  type ToolSet,
} from 'ai';
import { getModelById } from './models/model-service';
import type { ModelSettings } from './models/model-registry';

// Define model configuration type
export interface ModelConfig {
  model_id: string;
  provider: string;
  max_tokens?: number;
  context_window?: number;
  supports_vision?: boolean;
  supports_functions?: boolean;
  supports_streaming?: boolean;
  default_temperature?: number;
  api_key?: string;
  base_url?: string;
  capabilities?: {
    text?: boolean;
    vision?: boolean;
    audio?: boolean;
    video?: boolean;
    functions?: boolean;
    streaming?: boolean;
    json_mode?: boolean;
    fine_tuning?: boolean;
    thinking?: boolean;
    search_grounding?: boolean;
    dynamic_retrieval?: boolean;
    hybrid_grounding?: boolean;
    cached_content?: boolean;
    code_execution?: boolean;
    structured_output?: boolean;
    image_generation?: boolean;
    video_generation?: boolean;
    audio_generation?: boolean;
    response_modalities?: boolean;
    file_inputs?: boolean;
  };
}

// Default model configurations for the latest Google models
export const GOOGLE_MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Gemini 2.5 Models
  'models/gemini-2.5-pro-preview-05-06': {
    model_id: 'models/gemini-2.5-pro-preview-05-06',
    provider: 'google',
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
      file_inputs: true,
    },
  },
  'models/gemini-2.5-flash-preview-04-17': {
    model_id: 'models/gemini-2.5-flash-preview-04-17',
    provider: 'google',
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
      file_inputs: true,
    },
  },
  // Gemini 2.0 Models
  'models/gemini-2.0-pro': {
    model_id: 'models/gemini-2.0-pro',
    provider: 'google',
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
      file_inputs: true,
    },
  },
  'models/gemini-2.0-flash': {
    model_id: 'models/gemini-2.0-flash',
    provider: 'google',
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
      file_inputs: true,
    },
  },
  'models/gemini-2.0-flash-live-001': {
    model_id: 'models/gemini-2.0-flash-live-001',
    provider: 'google',
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
      file_inputs: true,
    },
  },
  // Gemini 1.5 Models
  'models/gemini-1.5-pro': {
    model_id: 'models/gemini-1.5-pro',
    provider: 'google',
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
      file_inputs: true,
    },
  },
  'models/gemini-1.5-flash': {
    model_id: 'models/gemini-1.5-flash',
    provider: 'google',
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
      file_inputs: true,
    },
  },
  // Embedding Models
  'models/gemini-embedding-exp-03-07': {
    model_id: 'models/gemini-embedding-exp-03-07',
    provider: 'google',
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
      file_inputs: false,
    },
  },
  'models/text-embedding-004': {
    model_id: 'models/text-embedding-004',
    provider: 'google',
    max_tokens: 2048,
    context_window: 2048,
    supports_vision: false,
    supports_functions: false,
    supports_streaming: false,
    default_temperature: 0.0,
  },
  // Image Generation Models
  'models/imagen-3.0-generate-002': {
    model_id: 'models/imagen-3.0-generate-002',
    provider: 'google',
    max_tokens: 4096,
    context_window: 4096,
    supports_vision: false,
    supports_functions: false,
    supports_streaming: false,
    default_temperature: 0.7,
  },
  // Video Generation Models
  'models/veo-2.0-generate-001': {
    model_id: 'models/veo-2.0-generate-001',
    provider: 'google',
    max_tokens: 4096,
    context_window: 4096,
    supports_vision: true,
    supports_functions: false,
    supports_streaming: false,
    default_temperature: 0.7,
  },
};

// Initialize Google AI provider
export function getGoogleAI(apiKey?: string, baseURL?: string) {
  return createGoogleGenerativeAI({
    apiKey: apiKey || process.env.GOOGLE_API_KEY,
    ...(baseURL ? { baseURL } : {}),
  });
}

// Get model configuration from Model Service (Upstash/Supabase/Registry) or default configs
export async function getModelConfig(modelId: string): Promise<ModelSettings> {
  // Check if we have a default configuration for this model
  const normalizedModelId = modelId.startsWith('models/')
    ? modelId
    : `models/${modelId}`;

  const staticConfig =
    GOOGLE_MODEL_CONFIGS[modelId] || GOOGLE_MODEL_CONFIGS[normalizedModelId];
  if (staticConfig) {
    // Fill in missing ModelSettings fields with defaults
    return {
      id: staticConfig.model_id,
      name: staticConfig.model_id,
      provider: 'google',
      model_id: staticConfig.model_id,
      max_tokens: staticConfig.max_tokens ?? 8192,
      input_cost_per_token: 0,
      output_cost_per_token: 0,
      supports_vision: staticConfig.supports_vision ?? false,
      supports_functions: staticConfig.supports_functions ?? false,
      supports_streaming: staticConfig.supports_streaming ?? false,
      default_temperature: staticConfig.default_temperature ?? 0.7,
      default_top_p: 1.0,
      default_frequency_penalty: 0,
      default_presence_penalty: 0,
      context_window: staticConfig.context_window ?? 8192,
      status: 'active',
      base_url: staticConfig.base_url ?? undefined,
      api_key: staticConfig.api_key ?? undefined,
      description: undefined,
      category: 'text',
      capabilities: staticConfig.capabilities ?? {},
      metadata: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Try to get from model service (which handles registry, DB, and type safety)
  try {
    const data = await getModelById(modelId);
    if (!data) throw new Error('Model not found');
    // Patch: ensure provider is 'google' for Google models
    return { ...data, provider: 'google' } as ModelSettings;
  } catch {
    // Fall back to a default configuration
    return {
      id: modelId,
      name: modelId,
      provider: 'google',
      model_id: modelId,
      max_tokens: 8192,
      input_cost_per_token: 0,
      output_cost_per_token: 0,
      supports_vision: modelId.includes('vision') || modelId.includes('pro'),
      supports_functions: true,
      supports_streaming: true,
      default_temperature: 0.7,
      default_top_p: 1.0,
      default_frequency_penalty: 0,
      default_presence_penalty: 0,
      context_window: 32768,
      status: 'active',
      base_url: undefined,
      api_key: undefined,
      description: undefined,
      category: 'text',
      capabilities: {},
      metadata: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

// See: https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai

// Helper to extract provider config from model settings (handles joined providers table)
function getProviderConfig(model: ModelSettings): {
  apiKey?: string;
  baseUrl?: string;
} {
  // Prefer joined providers table, then model, then env
  const providers =
    typeof model === 'object' && 'providers' in model
      ? (model as { providers?: { api_key?: string; base_url?: string } })
          .providers
      : undefined;
  return {
    apiKey: providers?.api_key || model.api_key || process.env.GOOGLE_API_KEY,
    baseUrl: providers?.base_url ?? model.base_url ?? undefined,
  };
}

// Type guard for ToolSet (basic check)
function isToolSet(tools: unknown): tools is ToolSet {
  if (!tools || typeof tools !== 'object') return false;
  const values = Object.values(tools) as unknown[];
  return (
    values.length > 0 &&
    values.every(
      (t): t is { execute: (...args: unknown[]) => unknown } =>
        typeof t === 'object' &&
        t !== null &&
        typeof (t as { execute?: unknown }).execute === 'function'
    )
  );
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
  modelId: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'data';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolSet;
  apiKey?: string;
  baseURL?: string;
}) {
  const modelConfig = await getModelConfig(modelId);
  const { apiKey: providerApiKey, baseUrl: providerBaseUrl } =
    getProviderConfig(modelConfig);
  const googleAI = getGoogleAI(
    apiKey || providerApiKey,
    baseURL || providerBaseUrl
  );
  const model = googleAI(modelConfig.model_id);
  const coreMessages = convertToCoreMessages(
    messages,
    isToolSet(tools) ? { tools } : undefined
  );
  return streamText({
    model,
    messages: coreMessages,
    temperature,
    maxTokens,
    ...(isToolSet(tools) ? { tools } : {}),
  });
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
  modelId: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'data';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolSet;
  apiKey?: string;
  baseURL?: string;
}) {
  const modelConfig = await getModelConfig(modelId);
  const { apiKey: providerApiKey, baseUrl: providerBaseUrl } =
    getProviderConfig(modelConfig);
  const googleAI = getGoogleAI(
    apiKey || providerApiKey,
    baseURL || providerBaseUrl
  );
  const model = googleAI(modelConfig.model_id);
  const coreMessages = convertToCoreMessages(
    messages,
    isToolSet(tools) ? { tools } : undefined
  );
  return generateText({
    model,
    messages: coreMessages,
    temperature,
    maxTokens,
    ...(isToolSet(tools) ? { tools } : {}),
  });
}

// ---
// Docs:
// https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
// https://ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-core-messages
// https://ai-sdk.dev/docs/reference/ai-sdk-ui/stream-text
// https://ai-sdk.dev/docs/reference/ai-sdk-ui/generate-text
// https://ai-sdk.dev/docs/reference/ai-sdk-ui/create-data-stream
// https://ai-sdk.dev/docs/reference/ai-sdk-ui/create-data-stream-response
// https://ai-sdk.dev/docs/reference/ai-sdk-ui/pipe-data-stream-to-response
// ---

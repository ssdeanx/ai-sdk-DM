/**
 * Model Registry
 *
 * This module provides a centralized registry for AI models with Zod schemas for type safety.
 * It includes model configurations, provider settings, and utility functions for model management.
 *
 * @module model-registry
 */

import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { customProvider, wrapLanguageModel, type LanguageModelV1Middleware, type LanguageModel } from 'ai';

// --- Zod Schemas ---

/**
 * Schema for model provider
 */
export const ModelProviderSchema = z.enum([
  'google',
  'openai',
  'anthropic',
  'vertex',
  'custom'
]);

export type ModelProvider = z.infer<typeof ModelProviderSchema>;

/**
 * Schema for model capabilities
 */
export const ModelCapabilitiesSchema = z.object({
  text: z.boolean().default(true),
  vision: z.boolean().default(false),
  audio: z.boolean().default(false),
  video: z.boolean().default(false),
  functions: z.boolean().default(false),
  streaming: z.boolean().default(true),
  json_mode: z.boolean().default(false),
  fine_tuning: z.boolean().default(false),
  thinking: z.boolean().default(false),
  search_grounding: z.boolean().default(false),
  dynamic_retrieval: z.boolean().default(false),
  hybrid_grounding: z.boolean().default(false),
  cached_content: z.boolean().default(false),
  code_execution: z.boolean().default(false),
  structured_output: z.boolean().default(false),
  image_generation: z.boolean().default(false),
  video_generation: z.boolean().default(false),
  audio_generation: z.boolean().default(false),
  response_modalities: z.boolean().default(false),
  file_inputs: z.boolean().default(false)
}).partial();

export type ModelCapabilities = z.infer<typeof ModelCapabilitiesSchema>;

/**
 * Schema for model category
 */
export const ModelCategorySchema = z.enum([
  'text',
  'chat',
  'multimodal',
  'image',
  'video',
  'audio',
  'embedding',
  'fine-tuning'
]);

export type ModelCategory = z.infer<typeof ModelCategorySchema>;

/**
 * Schema for model settings
 */
export const ModelSettingsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: ModelProviderSchema,
  model_id: z.string().min(1),
  max_tokens: z.number().int().positive(),
  input_cost_per_token: z.number().min(0),
  output_cost_per_token: z.number().min(0),
  supports_vision: z.boolean().default(false),
  supports_functions: z.boolean().default(false),
  supports_streaming: z.boolean().default(true),
  default_temperature: z.number().min(0).max(2).default(0.7),
  default_top_p: z.number().min(0).max(1).default(1.0),
  default_frequency_penalty: z.number().min(-2).max(2).default(0),
  default_presence_penalty: z.number().min(-2).max(2).default(0),
  context_window: z.number().int().positive(),
  description: z.string().optional(),
  category: ModelCategorySchema,
  capabilities: ModelCapabilitiesSchema.optional().default({}),
  metadata: z.record(z.any()).optional(),
  base_url: z.string().optional().nullable(),
  api_key: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  created_at: z.string().datetime().default(() => new Date().toISOString()),
  updated_at: z.string().datetime().default(() => new Date().toISOString())
});

export type ModelSettings = z.infer<typeof ModelSettingsSchema>;

/**
 * Schema for model settings input (for creating a new model)
 */
export const ModelSettingsInputSchema = ModelSettingsSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

export type ModelSettingsInput = z.infer<typeof ModelSettingsInputSchema>;

/**
 * Schema for model settings update (for updating an existing model)
 */
export const ModelSettingsUpdateSchema = ModelSettingsSchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true
});

export type ModelSettingsUpdate = z.infer<typeof ModelSettingsUpdateSchema>;

// --- Provider Factory Functions ---

/**
 * Creates a Google AI provider with the given API key and base URL
 *
 * @param apiKey - API key for Google AI
 * @param baseURL - Optional base URL for Google AI
 * @returns Google AI provider
 */
export function createGoogleAIProvider(apiKey?: string, baseURL?: string) {
  return createGoogleGenerativeAI({
    apiKey: apiKey || process.env.GOOGLE_API_KEY,
    ...(baseURL ? { baseURL } : {})
  });
}

/**
 * Creates an OpenAI provider with the given API key and base URL
 *
 * @param apiKey - API key for OpenAI
 * @param baseURL - Optional base URL for OpenAI
 * @returns OpenAI provider
 */
export function createOpenAIProvider(apiKey?: string, baseURL?: string) {
  return createOpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
    ...(baseURL ? { baseURL } : {})
  });
}

/**
 * Creates an Anthropic provider with the given API key and base URL
 *
 * @param apiKey - API key for Anthropic
 * @param baseURL - Optional base URL for Anthropic
 * @returns Anthropic provider
 */
export function createAnthropicProvider(apiKey?: string, baseURL?: string) {
  return createAnthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    ...(baseURL ? { baseURL } : {})
  });
}

// --- Model Registry ---

/**
 * Model registry class for managing AI models
 */
export class ModelRegistry {
  private models: Map<string, ModelSettings> = new Map();
  private providers: Map<string, any> = new Map();
  private middlewares: Map<string, LanguageModelV1Middleware[]> = new Map();
  private static instance: ModelRegistry;

  /**
   * Creates a new ModelRegistry instance
   * @private
   */
  private constructor() {
    // Initialize providers
    this.providers.set('google', createGoogleAIProvider());
    this.providers.set('openai', createOpenAIProvider());
    this.providers.set('anthropic', createAnthropicProvider());
  }

  /**
   * Gets the singleton instance of ModelRegistry
   *
   * @returns The ModelRegistry instance
   */
  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  /**
   * Registers a model with the registry
   *
   * @param model - Model settings
   * @returns The registered model settings
   */
  public registerModel(model: ModelSettings): ModelSettings {
    // Validate model settings
    const validatedModel = ModelSettingsSchema.parse(model);

    // Add model to registry
    this.models.set(validatedModel.id, validatedModel);

    return validatedModel;
  }

  /**
   * Gets a model from the registry
   *
   * @param modelId - Model ID
   * @returns The model settings or undefined if not found
   */
  public getModel(modelId: string): ModelSettings | undefined {
    return this.models.get(modelId);
  }

  /**
   * Gets a provider for a model
   *
   * @param modelId - Model ID
   * @returns The provider or undefined if not found
   */
  public getProvider(modelId: string): any {
    const model = this.getModel(modelId);

    if (!model) {
      return undefined;
    }

    // Get provider
    let provider = this.providers.get(model.provider);

    // Create provider if not found
    if (!provider) {
      switch (model.provider) {
        case 'google':
          provider = createGoogleAIProvider(model.api_key, model.base_url || undefined);
          break;
        case 'openai':
          provider = createOpenAIProvider(model.api_key, model.base_url || undefined);
          break;
        case 'anthropic':
          provider = createAnthropicProvider(model.api_key, model.base_url || undefined);
          break;
        default:
          return undefined;
      }

      this.providers.set(model.provider, provider);
    }

    return provider;
  }

  /**
   * Gets a language model for a model ID
   *
   * @param modelId - Model ID
   * @returns The language model or undefined if not found
   */
  public getLanguageModel(modelId: string): any {
    const model = this.getModel(modelId);

    if (!model) {
      return undefined;
    }

    const provider = this.getProvider(modelId);

    if (!provider) {
      return undefined;
    }

    // Get language model
    const languageModel = provider(model.model_id);

    // Apply middlewares if any
    const middlewares = this.middlewares.get(modelId);

    if (middlewares && middlewares.length > 0) {
      return wrapLanguageModel({
        model: languageModel,
        middleware: middlewares
      });
    }

    return languageModel;
  }

  /**
   * Creates a custom provider with specified language models
   *
   * @param models - Map of model IDs to language models
   * @param fallbackProvider - Optional fallback provider
   * @returns Custom provider
   */
  public createCustomProvider(models: Record<string, any>, fallbackProvider?: any): any {
    return customProvider({
      languageModels: models,
      fallbackProvider
    });
  }

  /**
   * Registers a middleware for a model
   *
   * @param modelId - Model ID
   * @param middleware - Middleware to register
   */
  public registerMiddleware(modelId: string, middleware: LanguageModelV1Middleware): void {
    const middlewares = this.middlewares.get(modelId) || [];
    middlewares.push(middleware);
    this.middlewares.set(modelId, middlewares);
  }
}

// Export singleton instance
export const modelRegistry = ModelRegistry.getInstance();

export default modelRegistry;

/**
 * Model Service
 *
 * This module provides services for managing AI models with Supabase and Upstash integration.
 * It includes functions for CRUD operations on models and model configurations.
 *
 * @module model-service
 */

import {
  getData,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} from '../memory/upstash/supabase-adapter';
import { upstashLogger } from '../memory/upstash/upstash-logger';
import {
  ModelSettings,
  ModelSettingsInput,
  ModelSettingsUpdate,
} from '../../types/model-settings';
import { ModelSettingsSchema } from './model-registry';
import { generateId } from 'ai';
import { modelRegistry } from './model-registry';
import { z } from 'zod';

// Define Zod schema for database options
export const DatabaseOptionsSchema = z.object({
  filters: z.record(z.any()).optional(),
  orderBy: z
    .object({
      column: z.string(),
      ascending: z.boolean().default(true),
    })
    .optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

// Define Zod schema for Supabase model
export const SupabaseModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  model_id: z.string(),
  max_tokens: z.number(),
  input_cost_per_token: z.number(),
  output_cost_per_token: z.number(),
  supports_vision: z.boolean().default(false),
  supports_functions: z.boolean().default(false),
  supports_streaming: z.boolean().default(true),
  default_temperature: z.number(),
  default_top_p: z.number(),
  default_frequency_penalty: z.number(),
  default_presence_penalty: z.number(),
  context_window: z.number(),
  description: z.string().optional().nullable(),
  category: z.string(),
  capabilities: z.record(z.any()).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  base_url: z.string().optional().nullable(),
  api_key: z.string().optional(),
  status: z.string().default('active'),
  created_at: z.string(),
  updated_at: z.string(),
});

// Helper to convert filters from Record<string, any> to FilterOptions[]
function convertFilters(
  filters?: Record<string, unknown>
): Array<{ field: string; operator: string; value: unknown }> | undefined {
  if (!filters) return undefined;
  return Object.entries(filters).map(([field, value]) => ({
    field,
    operator: 'eq',
    value,
  }));
}

// Helper to wrap errors for logger
function toLoggerError(err: unknown): Error | { error: string } {
  if (err instanceof Error) return err;
  return { error: String(err) };
}

// Helper to normalize provider field to valid ModelProvider
function normalizeProvider(model: Record<string, unknown>): void {
  if (model && typeof model === 'object' && 'provider' in model) {
    if (model.provider === 'vertex' || model.provider === 'custom') {
      model.provider = 'google';
    }
  }
}

// Type guard to validate provider
function isValidProvider(
  provider: unknown
): provider is 'google' | 'openai' | 'anthropic' {
  return (
    provider === 'google' || provider === 'openai' || provider === 'anthropic'
  );
}

// --- Error Handling ---

/**
 * Error class for model service operations
 */
export class ModelServiceError extends Error {
  /**
   * Creates a new ModelServiceError
   *
   * @param message - Error message
   * @param cause - Optional cause of the error
   */
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'ModelServiceError';
    Object.setPrototypeOf(this, ModelServiceError.prototype);
  }
}

// --- Model Service Functions ---

/**
 * Gets all models from the database
 *
 * @param options - Optional filtering and sorting options
 * @returns Promise resolving to an array of models
 * @throws ModelServiceError if fetching fails
 */
export async function getAllModels(
  options?: z.infer<typeof DatabaseOptionsSchema>
): Promise<ModelSettings[]> {
  // Convert filters to correct format for QueryOptions
  const validatedOptions = options
    ? DatabaseOptionsSchema.parse(options)
    : undefined;
  const queryOptions = validatedOptions
    ? {
        ...validatedOptions,
        filters: convertFilters(validatedOptions.filters),
      }
    : undefined;
  try {
    let modelsData: unknown[] = [];
    modelsData = await getData('models', queryOptions);
    const models: ModelSettings[] = [];
    for (const model of modelsData) {
      try {
        const raw = model as Record<string, unknown>;
        const safeModel = {
          ...raw,
          provider: isValidProvider(raw.provider) ? raw.provider : 'google',
        };
        models.push(ModelSettingsSchema.parse(safeModel));
      } catch (validationError) {
        upstashLogger.error(
          'model-service',
          'Invalid model data',
          toLoggerError(validationError)
        );
      }
    }
    return models;
  } catch (error) {
    upstashLogger.error(
      'model-service',
      'Failed to get all models',
      toLoggerError(error)
    );
    throw new ModelServiceError(`Failed to get all models`, error);
  }
}

/**
 * Gets a model by ID
 *
 * @param id - Model ID
 * @returns Promise resolving to the model or null if not found
 * @throws ModelServiceError if fetching fails
 */
export async function getModelById(id: string): Promise<ModelSettings | null> {
  try {
    const registryModel = modelRegistry.getModel(id);
    if (registryModel) return registryModel as ModelSettings;
    let modelData: unknown = null;
    modelData = await getItemById('models', id);
    if (!modelData) return null;
    try {
      const raw = modelData as Record<string, unknown>;
      const safeModel = {
        ...raw,
        provider: isValidProvider(raw.provider) ? raw.provider : 'google',
      };
      const validatedModel = ModelSettingsSchema.parse(safeModel);
      modelRegistry.registerModel(validatedModel);
      return validatedModel;
    } catch (validationError) {
      upstashLogger.error(
        'model-service',
        `Invalid model data for ${id}`,
        toLoggerError(validationError)
      );
      throw new ModelServiceError(
        `Invalid model data for ${id}`,
        validationError
      );
    }
  } catch (error) {
    upstashLogger.error(
      'model-service',
      `Failed to get model by ID ${id}`,
      toLoggerError(error)
    );
    throw new ModelServiceError(`Failed to get model by ID ${id}`, error);
  }
}

/**
 * Gets a model by model_id (e.g., "gpt-4", "gemini-1.5-pro")
 *
 * @param modelId - Model ID string
 * @returns Promise resolving to the model or null if not found
 * @throws ModelServiceError if fetching fails
 */
export async function getModelByModelId(
  modelId: string
): Promise<ModelSettings | null> {
  try {
    const registryModels = Array.from(modelRegistry['models'].values());
    const registryModel = registryModels.find((model: unknown) => {
      if (typeof model === 'object' && model !== null && 'model_id' in model) {
        return (model as Record<string, unknown>).model_id === modelId;
      }
      return false;
    });
    if (registryModel) return registryModel as ModelSettings;
    let modelData: unknown = null;
    const allModels = await getData('models');
    modelData = allModels.find((m: unknown) => {
      if (typeof m === 'object' && m !== null && 'model_id' in m) {
        return (m as Record<string, unknown>).model_id === modelId;
      }
      return false;
    });
    if (!modelData) return null;
    try {
      const raw = modelData as Record<string, unknown>;
      const safeModel = {
        ...raw,
        provider: isValidProvider(raw.provider) ? raw.provider : 'google',
      };
      const validatedModel = ModelSettingsSchema.parse(safeModel);
      modelRegistry.registerModel(validatedModel);
      return validatedModel;
    } catch (validationError) {
      upstashLogger.error(
        'model-service',
        `Invalid model data for model_id ${modelId}`,
        toLoggerError(validationError)
      );
      throw new ModelServiceError(
        `Invalid model data for model_id ${modelId}`,
        validationError
      );
    }
  } catch (error) {
    upstashLogger.error(
      'model-service',
      `Failed to get model by model_id ${modelId}`,
      toLoggerError(error)
    );
    throw new ModelServiceError(
      `Failed to get model by model_id ${modelId}`,
      error
    );
  }
}

/**
 * Creates a new model
 *
 * @param model - Model data
 * @returns Promise resolving to the created model
 * @throws ModelServiceError if creation fails
 */
export async function createModel(
  model: ModelSettingsInput
): Promise<ModelSettings> {
  try {
    const modelData = {
      id: generateId(),
      ...model,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const raw = modelData as Record<string, unknown>;
    const safeModel = {
      ...raw,
      provider: isValidProvider(raw.provider) ? raw.provider : 'google',
    };
    const validatedModel = ModelSettingsSchema.parse(safeModel);
    // Patch: convert only DB string fields to string
    const supabaseModelData = {
      ...validatedModel,
      input_cost_per_token: String(validatedModel.input_cost_per_token),
      output_cost_per_token: String(validatedModel.output_cost_per_token),
    };
    SupabaseModelSchema.parse(supabaseModelData);
    await createItem('models', supabaseModelData);
    modelRegistry.registerModel(validatedModel);
    return validatedModel;
  } catch (error) {
    upstashLogger.error(
      'model-service',
      'Failed to create model',
      toLoggerError(error)
    );
    throw new ModelServiceError(`Failed to create model`, error);
  }
}

/**
 * Updates a model
 *
 * @param id - Model ID
 * @param updates - Model updates
 * @returns Promise resolving to the updated model
 * @throws ModelServiceError if update fails
 */
export async function updateModel(
  id: string,
  updates: ModelSettingsUpdate
): Promise<ModelSettings> {
  try {
    const existingModel = await getModelById(id);
    if (!existingModel) throw new ModelServiceError(`Model not found: ${id}`);
    const ModelUpdatesSchema = z.object({
      name: z.string().optional(),
      provider: z.string().optional(),
      model_id: z.string().optional(),
      max_tokens: z.number().optional(),
      input_cost_per_token: z.number().optional(),
      output_cost_per_token: z.number().optional(),
      supports_vision: z.boolean().optional(),
      supports_functions: z.boolean().optional(),
      supports_streaming: z.boolean().optional(),
      default_temperature: z.number().optional(),
      default_top_p: z.number().optional(),
      default_frequency_penalty: z.number().optional(),
      default_presence_penalty: z.number().optional(),
      context_window: z.number().optional(),
      description: z.string().optional().nullable(),
      category: z.string().optional(),
      capabilities: z.record(z.any()).optional().nullable(),
      metadata: z.record(z.any()).optional().nullable(),
      base_url: z.string().optional().nullable(),
      api_key: z.string().optional(),
      status: z.string().optional(),
      updated_at: z.string(),
    });
    // Patch: Only allow valid ModelProvider values
    if (updates && typeof updates === 'object' && 'provider' in updates) {
      normalizeProvider(updates as Record<string, unknown>);
    }
    const supabaseUpdatesData: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.input_cost_per_token !== undefined)
      supabaseUpdatesData.input_cost_per_token = Number(
        updates.input_cost_per_token
      );
    if (updates.output_cost_per_token !== undefined)
      supabaseUpdatesData.output_cost_per_token = Number(
        updates.output_cost_per_token
      );
    if (updates.default_temperature !== undefined)
      supabaseUpdatesData.default_temperature = Number(
        updates.default_temperature
      );
    if (updates.default_top_p !== undefined)
      supabaseUpdatesData.default_top_p = Number(updates.default_top_p);
    if (updates.default_frequency_penalty !== undefined)
      supabaseUpdatesData.default_frequency_penalty = Number(
        updates.default_frequency_penalty
      );
    if (updates.default_presence_penalty !== undefined)
      supabaseUpdatesData.default_presence_penalty = Number(
        updates.default_presence_penalty
      );
    if (updates.max_tokens !== undefined)
      supabaseUpdatesData.max_tokens = Number(updates.max_tokens);
    if (updates.context_window !== undefined)
      supabaseUpdatesData.context_window = Number(updates.context_window);
    ModelUpdatesSchema.parse(supabaseUpdatesData);
    await updateItem('models', id, supabaseUpdatesData);
    const updatedModel = {
      ...existingModel,
      ...updates,
      updated_at: supabaseUpdatesData.updated_at,
    };
    modelRegistry.registerModel(updatedModel as ModelSettings);
    return updatedModel as ModelSettings;
  } catch (error) {
    upstashLogger.error(
      'model-service',
      `Failed to update model ${id}`,
      toLoggerError(error)
    );
    throw new ModelServiceError(`Failed to update model ${id}`, error);
  }
}

/**
 * Deletes a model
 *
 * @param id - Model ID
 * @returns Promise resolving to true if successful
 * @throws ModelServiceError if deletion fails
 */
export async function deleteModel(id: string): Promise<boolean> {
  try {
    await deleteItem('models', id);
    return true;
  } catch (error) {
    upstashLogger.error(
      'model-service',
      `Failed to delete model ${id}`,
      toLoggerError(error)
    );
    throw new ModelServiceError(`Failed to delete model ${id}`, error);
  }
}

/**
 * Gets a language model for a model ID
 *
 * @param modelId - Model ID
 * @returns Promise resolving to the language model
 * @throws ModelServiceError if model not found
 */
export async function getLanguageModel(modelId: string): Promise<any> {
  try {
    const registryModel = modelRegistry.getModel(modelId);
    if (registryModel) return modelRegistry.getLanguageModel(modelId);
    let dbModel = await getModelById(modelId);
    if (!dbModel) dbModel = await getModelByModelId(modelId);
    if (!dbModel) throw new ModelServiceError(`Model not found: ${modelId}`);
    const languageModel = modelRegistry.getLanguageModel(dbModel.id);
    if (!languageModel)
      throw new ModelServiceError(`Language model not found for ${modelId}`);
    return languageModel;
  } catch (error) {
    upstashLogger.error(
      'model-service',
      `Failed to get language model for ${modelId}`,
      toLoggerError(error)
    );
    throw new ModelServiceError(
      `Failed to get language model for ${modelId}`,
      error
    );
  }
}

export default {
  getAllModels,
  getModelById,
  getModelByModelId,
  createModel,
  updateModel,
  deleteModel,
  getLanguageModel,
};

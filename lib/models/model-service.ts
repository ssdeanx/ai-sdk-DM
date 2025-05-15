/**
 * Model Service
 *
 * This module provides services for managing AI models with Supabase and Upstash integration.
 * It includes functions for CRUD operations on models and model configurations.
 *
 * @module model-service
 */

import { z } from 'zod';
import { createSupabaseClient, isUpstashClient, isSupabaseClient, getData, getItemById, createItem, updateItem, deleteItem } from '../memory/upstash/supabase-adapter-factory';
import { shouldUseUpstash } from '../memory/supabase';
import { upstashLogger } from '../memory/upstash/upstash-logger';
import { ModelSettings, ModelSettingsInput, ModelSettingsUpdate } from '../../types/model-settings';
import { ModelSettingsSchema } from './model-registry';
import { v4 as uuidv4 } from 'uuid';
import { modelRegistry } from './model-registry';

// Define Zod schema for database options
export const DatabaseOptionsSchema = z.object({
  filters: z.record(z.any()).optional(),
  orderBy: z.object({
    column: z.string(),
    ascending: z.boolean().default(true)
  }).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

// Define Zod schema for Supabase model
export const SupabaseModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  model_id: z.string(),
  max_tokens: z.string(),
  input_cost_per_token: z.string(),
  output_cost_per_token: z.string(),
  supports_vision: z.boolean().default(false),
  supports_functions: z.boolean().default(false),
  supports_streaming: z.boolean().default(true),
  default_temperature: z.string(),
  default_top_p: z.string(),
  default_frequency_penalty: z.string(),
  default_presence_penalty: z.string(),
  context_window: z.string(),
  description: z.string().optional().nullable(),
  category: z.string(),
  capabilities: z.record(z.any()).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  base_url: z.string().optional().nullable(),
  api_key: z.string().optional(),
  status: z.string().default('active'),
  created_at: z.string(),
  updated_at: z.string()
});

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
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "ModelServiceError";
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
export async function getAllModels(options?: z.infer<typeof DatabaseOptionsSchema>): Promise<ModelSettings[]> {
  const validatedOptions = options ? DatabaseOptionsSchema.parse(options) : undefined;
  try {
    let modelsData: any[] = [];
    if (shouldUseUpstash()) {
      const supabaseClient = createSupabaseClient();
      if (isUpstashClient(supabaseClient)) {
        modelsData = await supabaseClient.from('models').getAll(validatedOptions);
      } else {
        modelsData = await getData('models', validatedOptions);
      }
    } else {
      modelsData = await getData('models', validatedOptions);
    }
    const models: ModelSettings[] = [];
    for (const model of modelsData) {
      try {
        models.push(ModelSettingsSchema.parse(model));
      } catch (validationError) {
        upstashLogger.error('model-service', 'Invalid model data', validationError);
      }
    }
    return models;
  } catch (error) {
    upstashLogger.error('model-service', 'Failed to get all models', error);
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
    if (registryModel) return registryModel;
    let modelData: any = null;
    if (shouldUseUpstash()) {
      const supabaseClient = createSupabaseClient();
      if (isUpstashClient(supabaseClient)) {
        modelData = await supabaseClient.from('models').getById(id);
      } else {
        modelData = await getItemById('models', id);
      }
    } else {
      modelData = await getItemById('models', id);
    }
    if (!modelData) return null;
    try {
      const validatedModel = ModelSettingsSchema.parse(modelData);
      modelRegistry.registerModel(validatedModel);
      return validatedModel;
    } catch (validationError) {
      upstashLogger.error('model-service', `Invalid model data for ${id}`, validationError);
      throw new ModelServiceError(`Invalid model data for ${id}`, validationError);
    }
  } catch (error) {
    upstashLogger.error('model-service', `Failed to get model by ID ${id}`, error);
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
export async function getModelByModelId(modelId: string): Promise<ModelSettings | null> {
  try {
    const registryModels = Array.from(modelRegistry['models'].values());
    const registryModel = registryModels.find(model => model.model_id === modelId);
    if (registryModel) return registryModel;
    let modelData: any = null;
    if (shouldUseUpstash()) {
      const supabaseClient = createSupabaseClient();
      if (isUpstashClient(supabaseClient)) {
        const allModels = await supabaseClient.from('models').getAll();
        modelData = allModels.find((m: any) => m.model_id === modelId);
      } else {
        const allModels = await getData('models');
        modelData = allModels.find((m: any) => m.model_id === modelId);
      }
    } else {
      const allModels = await getData('models');
      modelData = allModels.find((m: any) => m.model_id === modelId);
    }
    if (!modelData) return null;
    try {
      const validatedModel = ModelSettingsSchema.parse(modelData);
      modelRegistry.registerModel(validatedModel);
      return validatedModel;
    } catch (validationError) {
      upstashLogger.error('model-service', `Invalid model data for model_id ${modelId}`, validationError);
      throw new ModelServiceError(`Invalid model data for model_id ${modelId}`, validationError);
    }
  } catch (error) {
    upstashLogger.error('model-service', `Failed to get model by model_id ${modelId}`, error);
    throw new ModelServiceError(`Failed to get model by model_id ${modelId}`, error);
  }
}

/**
 * Creates a new model
 *
 * @param model - Model data
 * @returns Promise resolving to the created model
 * @throws ModelServiceError if creation fails
 */
export async function createModel(model: ModelSettingsInput): Promise<ModelSettings> {
  try {
    const modelData = {
      id: uuidv4(),
      ...model,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const validatedModel = ModelSettingsSchema.parse(modelData);
    const supabaseModelData = {
      ...validatedModel,
      max_tokens: validatedModel.max_tokens.toString(),
      default_temperature: validatedModel.default_temperature.toString(),
      default_top_p: validatedModel.default_top_p.toString(),
      default_frequency_penalty: validatedModel.default_frequency_penalty.toString(),
      default_presence_penalty: validatedModel.default_presence_penalty.toString(),
      context_window: validatedModel.context_window.toString(),
      input_cost_per_token: validatedModel.input_cost_per_token.toString(),
      output_cost_per_token: validatedModel.output_cost_per_token.toString()
    };
    SupabaseModelSchema.parse(supabaseModelData);
    if (shouldUseUpstash()) {
      const supabaseClient = createSupabaseClient();
      if (isUpstashClient(supabaseClient)) {
        await supabaseClient.from('models').create(validatedModel);
      } else {
        await createItem('models', validatedModel);
      }
    } else {
      await createItem('models', validatedModel);
    }
    modelRegistry.registerModel(validatedModel);
    return validatedModel;
  } catch (error) {
    upstashLogger.error('model-service', 'Failed to create model', error);
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
export async function updateModel(id: string, updates: ModelSettingsUpdate): Promise<ModelSettings> {
  try {
    const existingModel = await getModelById(id);
    if (!existingModel) throw new ModelServiceError(`Model not found: ${id}`);
    const ModelUpdatesSchema = z.object({
      name: z.string().optional(),
      provider: z.string().optional(),
      model_id: z.string().optional(),
      max_tokens: z.string().optional(),
      input_cost_per_token: z.string().optional(),
      output_cost_per_token: z.string().optional(),
      supports_vision: z.boolean().optional(),
      supports_functions: z.boolean().optional(),
      supports_streaming: z.boolean().optional(),
      default_temperature: z.string().optional(),
      default_top_p: z.string().optional(),
      default_frequency_penalty: z.string().optional(),
      default_presence_penalty: z.string().optional(),
      context_window: z.string().optional(),
      description: z.string().optional().nullable(),
      category: z.string().optional(),
      capabilities: z.record(z.any()).optional().nullable(),
      metadata: z.record(z.any()).optional().nullable(),
      base_url: z.string().optional().nullable(),
      api_key: z.string().optional(),
      status: z.string().optional(),
      updated_at: z.string()
    });
    const supabaseUpdatesData: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.input_cost_per_token !== undefined) supabaseUpdatesData.input_cost_per_token = updates.input_cost_per_token.toString();
    if (updates.output_cost_per_token !== undefined) supabaseUpdatesData.output_cost_per_token = updates.output_cost_per_token.toString();
    if (updates.default_temperature !== undefined) supabaseUpdatesData.default_temperature = updates.default_temperature.toString();
    if (updates.default_top_p !== undefined) supabaseUpdatesData.default_top_p = updates.default_top_p.toString();
    if (updates.default_frequency_penalty !== undefined) supabaseUpdatesData.default_frequency_penalty = updates.default_frequency_penalty.toString();
    if (updates.default_presence_penalty !== undefined) supabaseUpdatesData.default_presence_penalty = updates.default_presence_penalty.toString();
    if (updates.max_tokens !== undefined) supabaseUpdatesData.max_tokens = updates.max_tokens.toString();
    if (updates.context_window !== undefined) supabaseUpdatesData.context_window = updates.context_window.toString();
    ModelUpdatesSchema.parse(supabaseUpdatesData);
    if (shouldUseUpstash()) {
      const supabaseClient = createSupabaseClient();
      if (isUpstashClient(supabaseClient)) {
        await supabaseClient.from('models').update(id, updates);
      } else {
        await updateItem('models', id, updates);
      }
    } else {
      await updateItem('models', id, updates);
    }
    const updatedModel = { ...existingModel, ...updates, updated_at: supabaseUpdatesData.updated_at };
    modelRegistry.registerModel(updatedModel as ModelSettings);
    return updatedModel as ModelSettings;
  } catch (error) {
    upstashLogger.error('model-service', `Failed to update model ${id}`, error);
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
    if (shouldUseUpstash()) {
      const supabaseClient = createSupabaseClient();
      if (isUpstashClient(supabaseClient)) {
        await supabaseClient.from('models').delete(id);
      } else {
        await deleteItem('models', id);
      }
    } else {
      await deleteItem('models', id);
    }
    return true;
  } catch (error) {
    upstashLogger.error('model-service', `Failed to delete model ${id}`, error);
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
    if (!languageModel) throw new ModelServiceError(`Language model not found for ${modelId}`);
    return languageModel;
  } catch (error) {
    upstashLogger.error('model-service', `Failed to get language model for ${modelId}`, error);
    throw new ModelServiceError(`Failed to get language model for ${modelId}`, error);
  }
}

export default {
  getAllModels,
  getModelById,
  getModelByModelId,
  createModel,
  updateModel,
  deleteModel,
  getLanguageModel
};

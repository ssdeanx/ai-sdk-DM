/**
 * Model Service
 *
 * This module provides services for managing AI models with Supabase and Upstash integration.
 * It includes functions for CRUD operations on models and model configurations.
 *
 * @module model-service
 */

import { z } from 'zod';
import { getData, getItemById, createItem, updateItem, deleteItem, shouldUseUpstash, isSupabaseClient, isUpstashClient, getSupabaseClient } from '../memory/supabase';
import { modelRegistry, ModelSettings, ModelSettingsInput, ModelSettingsUpdate, ModelSettingsSchema } from './model-registry';
import { v4 as uuidv4 } from 'uuid';
import { createSupabaseClient } from '../memory/upstash/supabase-adapter-factory';

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
  // Validate options with Zod if provided
  const validatedOptions = options ? DatabaseOptionsSchema.parse(options) : undefined;
  try {
    // Get models from Supabase or Upstash
    let modelsData: any[] = [];

    if (shouldUseUpstash()) {
      // Use Upstash adapter
      const supabaseClient = createSupabaseClient();

      // Verify client type for type safety
      if (isUpstashClient(supabaseClient)) {
        console.log("Using Upstash Supabase client for models");

        let query = supabaseClient.from('models');

        // Apply filters if provided
        if (validatedOptions?.filters) {
          for (const [key, value] of Object.entries(validatedOptions.filters)) {
            query = query.filter(key, 'eq', value);
          }
        }

        // Apply ordering if provided
        if (validatedOptions?.orderBy) {
          query = query.order(validatedOptions.orderBy.column, validatedOptions.orderBy.ascending);
        } else {
          query = query.order('name', true);
        }

        // Apply pagination if provided
        if (validatedOptions?.limit) {
          query = query.limit(validatedOptions.limit);
        }

        if (validatedOptions?.offset) {
          query = query.offset(validatedOptions.offset);
        }

        modelsData = await query.getAll();
      } else {
        throw new Error("Expected Upstash client but got different client type");
      }
    } else {
      // Use regular Supabase with getData function
      console.log("Using standard Supabase client with getData for models");

      // Create options for getData
      const getDataOptions: any = {};

      if (validatedOptions?.orderBy) {
        getDataOptions.orderBy = {
          column: validatedOptions.orderBy.column,
          ascending: validatedOptions.orderBy.ascending
        };
      }

      if (validatedOptions?.limit) {
        getDataOptions.limit = validatedOptions.limit;
      }

      if (validatedOptions?.offset) {
        getDataOptions.offset = validatedOptions.offset;
      }

      if (validatedOptions?.filters) {
        getDataOptions.match = validatedOptions.filters;
      }

      // Use getData function with validated options
      modelsData = await getData('models', getDataOptions as any);
    }

    // Validate models
    const models: ModelSettings[] = [];

    for (const model of modelsData) {
      try {
        const validatedModel = ModelSettingsSchema.parse(model);
        models.push(validatedModel);

        // Register model with registry
        modelRegistry.registerModel(validatedModel);
      } catch (validationError) {
        console.warn(`Invalid model data for ${model.id || 'unknown model'}:`, validationError);
      }
    }

    return models;
  } catch (error) {
    if (error instanceof ModelServiceError) {
      throw error;
    }
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
    // Check registry first
    const registryModel = modelRegistry.getModel(id);

    if (registryModel) {
      return registryModel;
    }

    // Get model from Supabase or Upstash
    let modelData: any = null;

    if (shouldUseUpstash()) {
      // Use Upstash adapter
      const supabaseClient = createSupabaseClient();

      // Verify client type for type safety
      if (isUpstashClient(supabaseClient)) {
        console.log("Using Upstash Supabase client for model by ID");
        modelData = await supabaseClient.from('models').getById(id);
      } else {
        throw new Error("Expected Upstash client but got different client type");
      }
    } else {
      // Use regular Supabase with getItemById
      console.log("Using standard Supabase client with getItemById for model by ID");

      try {
        // Use getItemById function
        modelData = await getItemById('models', id);
      } catch (error) {
        throw new ModelServiceError(`Error fetching model by ID: ${error instanceof Error ? error.message : String(error)}`, error);
      }
    }

    if (!modelData) {
      return null;
    }

    // Validate model
    try {
      const validatedModel = ModelSettingsSchema.parse(modelData);

      // Register model with registry
      modelRegistry.registerModel(validatedModel);

      return validatedModel;
    } catch (validationError) {
      throw new ModelServiceError(`Invalid model data for ${id}`, validationError);
    }
  } catch (error) {
    if (error instanceof ModelServiceError) {
      throw error;
    }
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
    // Check registry first
    const registryModels = Array.from(modelRegistry['models'].values());
    const registryModel = registryModels.find(model => model.model_id === modelId);

    if (registryModel) {
      return registryModel;
    }

    // Get model from Supabase or Upstash
    let modelData: any = null;

    if (shouldUseUpstash()) {
      // Use Upstash adapter
      const supabaseClient = createSupabaseClient();

      // Verify client type for type safety
      if (isUpstashClient(supabaseClient)) {
        console.log("Using Upstash Supabase client for model by model_id");

        // Get all models and filter by model_id
        const models = await supabaseClient.from('models').getAll();
        modelData = models.find(model => model.model_id === modelId) || null;
      } else {
        throw new Error("Expected Upstash client but got different client type");
      }
    } else {
      // Use regular Supabase
      const supabaseClient = getSupabaseClient();

      // Verify client type for type safety
      if (isSupabaseClient(supabaseClient)) {
        console.log("Using standard Supabase client for model by model_id");

        const { data, error } = await supabaseClient
          .from('models')
          .select('*')
          .eq('model_id', modelId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Record not found
            return null;
          }
          throw new ModelServiceError(`Error fetching model by model_id: ${error.message}`, error);
        }

        modelData = data;
      } else {
        throw new Error("Expected Supabase client but got different client type");
      }
    }

    if (!modelData) {
      return null;
    }

    // Validate model
    try {
      const validatedModel = ModelSettingsSchema.parse(modelData);

      // Register model with registry
      modelRegistry.registerModel(validatedModel);

      return validatedModel;
    } catch (validationError) {
      throw new ModelServiceError(`Invalid model data for model_id ${modelId}`, validationError);
    }
  } catch (error) {
    if (error instanceof ModelServiceError) {
      throw error;
    }
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

    // Validate model
    const validatedModel = ModelSettingsSchema.parse(modelData);

    // Convert number values to strings for Supabase compatibility
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

    // Validate with Supabase model schema
    const supabaseModel = SupabaseModelSchema.parse(supabaseModelData);

    if (shouldUseUpstash()) {
      // Use Upstash adapter
      const supabaseClient = createSupabaseClient();

      // Verify client type for type safety
      if (isUpstashClient(supabaseClient)) {
        console.log("Using Upstash Supabase client for creating model");

        const result = await supabaseClient.from('models').create(supabaseModel);

        if (!result) {
          throw new ModelServiceError("Failed to create model with Upstash");
        }

        // Register model with registry
        modelRegistry.registerModel(validatedModel);

        return validatedModel;
      } else {
        throw new Error("Expected Upstash client but got different client type");
      }
    } else {
      // Use regular Supabase with createItem
      console.log("Using standard Supabase client with createItem for creating model");

      try {
        // Use createItem function
        await createItem('models', supabaseModel as any);

        // Register model with registry
        modelRegistry.registerModel(validatedModel);

        return validatedModel;
      } catch (error) {
        throw new ModelServiceError(`Error creating model: ${error instanceof Error ? error.message : String(error)}`, error);
      }
    }
  } catch (error) {
    if (error instanceof ModelServiceError) {
      throw error;
    }
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
    // Get existing model
    const existingModel = await getModelById(id);

    if (!existingModel) {
      throw new ModelServiceError(`Model with ID ${id} not found`);
    }

    // Create a schema for model updates
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

    // Convert number values to strings for Supabase compatibility
    const supabaseUpdatesData: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Convert number fields to strings if they exist in the updates
    if (updates.input_cost_per_token !== undefined) {
      supabaseUpdatesData.input_cost_per_token = updates.input_cost_per_token.toString();
    }

    if (updates.output_cost_per_token !== undefined) {
      supabaseUpdatesData.output_cost_per_token = updates.output_cost_per_token.toString();
    }

    if (updates.default_temperature !== undefined) {
      supabaseUpdatesData.default_temperature = updates.default_temperature.toString();
    }

    if (updates.default_top_p !== undefined) {
      supabaseUpdatesData.default_top_p = updates.default_top_p.toString();
    }

    if (updates.default_frequency_penalty !== undefined) {
      supabaseUpdatesData.default_frequency_penalty = updates.default_frequency_penalty.toString();
    }

    if (updates.default_presence_penalty !== undefined) {
      supabaseUpdatesData.default_presence_penalty = updates.default_presence_penalty.toString();
    }

    if (updates.max_tokens !== undefined) {
      supabaseUpdatesData.max_tokens = updates.max_tokens.toString();
    }

    if (updates.context_window !== undefined) {
      supabaseUpdatesData.context_window = updates.context_window.toString();
    }

    // Validate with Zod schema
    const supabaseUpdates = ModelUpdatesSchema.parse(supabaseUpdatesData);

    if (shouldUseUpstash()) {
      // Use Upstash adapter
      const supabaseClient = createSupabaseClient();

      // Verify client type for type safety
      if (isUpstashClient(supabaseClient)) {
        console.log("Using Upstash Supabase client for updating model");

        const result = await supabaseClient.from('models').update(id, supabaseUpdates);

        if (!result) {
          throw new ModelServiceError("Failed to update model with Upstash");
        }

        // Get updated model
        const updatedModel = await getModelById(id);

        if (!updatedModel) {
          throw new ModelServiceError(`Failed to retrieve updated model ${id}`);
        }

        // Update model in registry
        modelRegistry.registerModel(updatedModel);

        return updatedModel;
      } else {
        throw new Error("Expected Upstash client but got different client type");
      }
    } else {
      // Use regular Supabase with updateItem
      console.log("Using standard Supabase client with updateItem for updating model");

      try {
        // Use updateItem function
        await updateItem('models', id, supabaseUpdates as any);

        // Get updated model
        const updatedModel = await getModelById(id);

        if (!updatedModel) {
          throw new ModelServiceError(`Failed to retrieve updated model ${id}`);
        }

        // Update model in registry
        modelRegistry.registerModel(updatedModel);

        return updatedModel;
      } catch (error) {
        throw new ModelServiceError(`Error updating model: ${error instanceof Error ? error.message : String(error)}`, error);
      }
    }
  } catch (error) {
    if (error instanceof ModelServiceError) {
      throw error;
    }
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
      // Use Upstash adapter
      const supabaseClient = createSupabaseClient();

      // Verify client type for type safety
      if (isUpstashClient(supabaseClient)) {
        console.log("Using Upstash Supabase client for deleting model");

        const result = await supabaseClient.from('models').delete(id);

        if (!result) {
          throw new ModelServiceError("Failed to delete model with Upstash");
        }

        // Remove from registry if it exists
        if (modelRegistry.getModel(id)) {
          // The model registry doesn't have an unregister method, so we can't remove it
          console.log(`Model ${id} deleted but cannot be removed from registry`);
        }

        return true;
      } else {
        throw new Error("Expected Upstash client but got different client type");
      }
    } else {
      // Use regular Supabase with deleteItem
      console.log("Using standard Supabase client with deleteItem for deleting model");

      try {
        // Use deleteItem function
        await deleteItem('models', id);

        // Remove from registry if it exists
        if (modelRegistry.getModel(id)) {
          // The model registry doesn't have an unregister method, so we can't remove it
          console.log(`Model ${id} deleted but cannot be removed from registry`);
        }

        return true;
      } catch (error) {
        throw new ModelServiceError(`Error deleting model: ${error instanceof Error ? error.message : String(error)}`, error);
      }
    }
  } catch (error) {
    if (error instanceof ModelServiceError) {
      throw error;
    }
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
    // Check registry first
    const registryModel = modelRegistry.getModel(modelId);

    if (registryModel) {
      // Get language model from registry
      const languageModel = modelRegistry.getLanguageModel(registryModel.id);

      if (languageModel) {
        return languageModel;
      }
    }

    // Try to fetch from database
    let dbModel = await getModelById(modelId);

    if (!dbModel) {
      // Try to fetch by model_id
      dbModel = await getModelByModelId(modelId);
    }

    if (!dbModel) {
      throw new ModelServiceError(`Model ${modelId} not found`);
    }

    // Get language model from registry
    const languageModel = modelRegistry.getLanguageModel(dbModel.id);

    if (!languageModel) {
      throw new ModelServiceError(`Failed to get language model for ${modelId}`);
    }

    return languageModel;
  } catch (error) {
    if (error instanceof ModelServiceError) {
      throw error;
    }
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

/**
 * Model Service
 *
 * This module provides services for managing AI models with Supabase integration.
 * It includes functions for CRUD operations on models and model configurations.
 *
 * @module model-service
 */

import { z } from 'zod';
import { getSupabaseClient } from '../memory/supabase';
import { modelRegistry, ModelSettings, ModelSettingsInput, ModelSettingsUpdate, ModelSettingsSchema } from './model-registry';
import { v4 as uuidv4 } from 'uuid';

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
 * @returns Promise resolving to an array of models
 * @throws ModelServiceError if fetching fails
 */
export async function getAllModels(): Promise<ModelSettings[]> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('models')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new ModelServiceError(`Error fetching models: ${error.message}`, error);
    }

    // Validate models
    const models: ModelSettings[] = [];

    for (const model of data) {
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

    // Fetch from database
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found
        return null;
      }
      throw new ModelServiceError(`Error fetching model by ID: ${error.message}`, error);
    }

    // Validate model
    try {
      const validatedModel = ModelSettingsSchema.parse(data);

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

    // Fetch from database
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
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

    // Validate model
    try {
      const validatedModel = ModelSettingsSchema.parse(data);

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
    const supabase = getSupabaseClient();

    const modelData = {
      id: uuidv4(),
      ...model,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Validate model
    const validatedModel = ModelSettingsSchema.parse(modelData);

    // Convert number values to strings for Supabase compatibility
    const supabaseModel = {
      ...validatedModel,
      input_cost_per_token: validatedModel.input_cost_per_token.toString(),
      output_cost_per_token: validatedModel.output_cost_per_token.toString()
    };

    const { data, error } = await supabase
      .from('models')
      .insert(supabaseModel)
      .select()
      .single();

    if (error) {
      throw new ModelServiceError(`Error creating model: ${error.message}`, error);
    }

    // Register model with registry
    modelRegistry.registerModel(validatedModel);

    return validatedModel;
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
    const supabase = getSupabaseClient();

    // Get existing model
    const existingModel = await getModelById(id);

    if (!existingModel) {
      throw new ModelServiceError(`Model with ID ${id} not found`);
    }

    // Convert number values to strings for Supabase compatibility
    const supabaseUpdates: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Convert number fields to strings if they exist in the updates
    if (updates.input_cost_per_token !== undefined) {
      supabaseUpdates.input_cost_per_token = updates.input_cost_per_token.toString();
    }

    if (updates.output_cost_per_token !== undefined) {
      supabaseUpdates.output_cost_per_token = updates.output_cost_per_token.toString();
    }

    if (updates.default_temperature !== undefined) {
      supabaseUpdates.default_temperature = updates.default_temperature.toString();
    }

    if (updates.default_top_p !== undefined) {
      supabaseUpdates.default_top_p = updates.default_top_p.toString();
    }

    if (updates.default_frequency_penalty !== undefined) {
      supabaseUpdates.default_frequency_penalty = updates.default_frequency_penalty.toString();
    }

    if (updates.default_presence_penalty !== undefined) {
      supabaseUpdates.default_presence_penalty = updates.default_presence_penalty.toString();
    }

    const { data, error } = await supabase
      .from('models')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ModelServiceError(`Error updating model: ${error.message}`, error);
    }

    // Validate model
    const validatedModel = ModelSettingsSchema.parse(data);

    // Register updated model with registry
    modelRegistry.registerModel(validatedModel);

    return validatedModel;
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
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', id);

    if (error) {
      throw new ModelServiceError(`Error deleting model: ${error.message}`, error);
    }

    return true;
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
    let model = modelRegistry.getModel(modelId);

    if (!model) {
      // Try to fetch from database
      model = await getModelById(modelId);

      if (!model) {
        // Try to fetch by model_id
        model = await getModelByModelId(modelId);

        if (!model) {
          throw new ModelServiceError(`Model ${modelId} not found`);
        }
      }
    }

    // Get language model from registry
    const languageModel = modelRegistry.getLanguageModel(model.id);

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

/**
 * Model service for managing model settings
 */
import { getSupabaseClient } from "../memory/supabase";
import { Model } from "@/types/models";
import { ModelSettings, ModelSettingsInput, ModelSettingsUpdate } from "@/types/model-settings";
import { v4 as uuidv4 } from "uuid";

/**
 * Get all models from the database
 * @returns Array of models
 */
export async function getAllModels(): Promise<Model[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("models")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching models:", error);
    throw error;
  }

  return data as Model[];
}

/**
 * Get a model by ID
 * @param id Model ID
 * @returns Model or null if not found
 */
export async function getModelById(id: string): Promise<Model | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("models")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Record not found
      return null;
    }
    console.error("Error fetching model:", error);
    throw error;
  }

  return data as Model;
}

/**
 * Get a model by model_id (e.g., "gpt-4", "gemini-1.5-pro")
 * @param modelId Model ID string
 * @returns Model or null if not found
 */
export async function getModelByModelId(modelId: string): Promise<Model | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("models")
    .select("*")
    .eq("model_id", modelId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Record not found
      return null;
    }
    console.error("Error fetching model by model_id:", error);
    throw error;
  }

  return data as Model;
}

/**
 * Create a new model
 * @param model Model data
 * @returns Created model
 */
export async function createModel(model: ModelSettingsInput): Promise<Model> {
  const supabase = getSupabaseClient();

  const modelData = {
    id: uuidv4(),
    ...model,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("models")
    .insert(modelData)
    .select()
    .single();

  if (error) {
    console.error("Error creating model:", error);
    throw error;
  }

  return data as Model;
}

/**
 * Update a model
 * @param id Model ID
 * @param updates Model updates
 * @returns Updated model
 */
export async function updateModel(id: string, updates: ModelSettingsUpdate): Promise<Model> {
  const supabase = getSupabaseClient();

  const modelData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("models")
    .update(modelData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating model:", error);
    throw error;
  }

  return data as Model;
}

/**
 * Delete a model
 * @param id Model ID
 * @returns Success status
 */
export async function deleteModel(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("models")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting model:", error);
    throw error;
  }

  return true;
}

/**
 * Get models by provider
 * @param provider Provider name
 * @returns Array of models
 */
export async function getModelsByProvider(provider: string): Promise<Model[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("models")
    .select("*")
    .eq("provider", provider)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching models by provider:", error);
    throw error;
  }

  return data as Model[];
}

/**
 * Seed default models from the model registry
 * @param provider Optional provider to seed models for
 * @returns Number of models seeded
 */
export async function seedDefaultModels(provider?: string): Promise<number> {
  try {
    // Import model registry
    const { MODEL_REGISTRY } = await import('../model-registry');

    let modelsToSeed: any[] = [];

    // If provider is specified, only seed models for that provider
    if (provider && MODEL_REGISTRY[provider]) {
      const providerModels = MODEL_REGISTRY[provider];
      modelsToSeed = Object.entries(providerModels).map(([modelId, settings]) => ({
        id: `${provider}-${modelId}`,
        name: settings.name || modelId,
        provider,
        model_id: modelId,
        max_tokens: settings.max_tokens || 4096,
        input_cost_per_token: settings.input_cost_per_token || 0,
        output_cost_per_token: settings.output_cost_per_token || 0,
        supports_vision: settings.supports_vision || false,
        supports_functions: settings.supports_functions || false,
        supports_streaming: settings.supports_streaming || true,
        default_temperature: settings.default_temperature || 0.7,
        default_top_p: settings.default_top_p || 1.0,
        default_frequency_penalty: settings.default_frequency_penalty || 0,
        default_presence_penalty: settings.default_presence_penalty || 0,
        context_window: settings.context_window || 8192,
        description: settings.description || '',
        category: settings.category || 'text',
        capabilities: settings.capabilities || {
          text: true,
          vision: false,
          audio: false,
          functions: false,
          streaming: true,
          json_mode: false,
          fine_tuning: false
        },
        api_key: process.env[`${provider.toUpperCase()}_API_KEY`] || '',
        status: 'active',
      }));
    } else {
      // Seed all models from all providers
      for (const [provider, models] of Object.entries(MODEL_REGISTRY)) {
        const providerModels = Object.entries(models).map(([modelId, settings]) => ({
          id: `${provider}-${modelId}`,
          name: settings.name || modelId,
          provider,
          model_id: modelId,
          max_tokens: settings.max_tokens || 4096,
          input_cost_per_token: settings.input_cost_per_token || 0,
          output_cost_per_token: settings.output_cost_per_token || 0,
          supports_vision: settings.supports_vision || false,
          supports_functions: settings.supports_functions || false,
          supports_streaming: settings.supports_streaming || true,
          default_temperature: settings.default_temperature || 0.7,
          default_top_p: settings.default_top_p || 1.0,
          default_frequency_penalty: settings.default_frequency_penalty || 0,
          default_presence_penalty: settings.default_presence_penalty || 0,
          context_window: settings.context_window || 8192,
          description: settings.description || '',
          category: settings.category || 'text',
          capabilities: settings.capabilities || {
            text: true,
            vision: false,
            audio: false,
            functions: false,
            streaming: true,
            json_mode: false,
            fine_tuning: false
          },
          api_key: process.env[`${provider.toUpperCase()}_API_KEY`] || '',
          status: 'active',
        }));

        modelsToSeed = [...modelsToSeed, ...providerModels];
      }
    }

    // Insert models into database
    const supabase = getSupabaseClient();

    // Use upsert to avoid duplicates
    const { data, error } = await supabase
      .from("models")
      .upsert(modelsToSeed, { onConflict: 'id' });

    if (error) {
      console.error("Error seeding default models:", error);
      throw error;
    }

    return modelsToSeed.length;
  } catch (error) {
    console.error("Error seeding default models:", error);
    throw error;
  }
}

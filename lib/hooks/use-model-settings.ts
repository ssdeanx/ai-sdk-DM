/**
 * Hook for fetching and managing model settings
 */
import { useState, useEffect, useCallback } from 'react';
import { Model } from '@/types/models';
import { ModelSettings, ModelProvider } from '@/types/model-settings';
import { MODEL_REGISTRY } from '../model-registry';
import { getModelById, getModelByModelId, getAllModels } from '../services/model-service';

/**
 * Hook for fetching model settings
 * @returns Model settings hook
 */
export function useModelSettings() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all models from the database
   */
  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllModels();
      setModels(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch models'));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get model settings by ID with fallback to registry
   * @param modelId Model ID
   * @returns Model settings or null
   */
  const getModelSettings = useCallback(async (modelId: string): Promise<Model | null> => {
    try {
      // Try to get from database first
      const model = await getModelById(modelId);
      if (model) return model;

      // If not found, try to get by model_id
      const modelByModelId = await getModelByModelId(modelId);
      if (modelByModelId) return modelByModelId;

      // If still not found, try to get from registry
      // First, determine if this is a model ID or a model name
      for (const provider in MODEL_REGISTRY) {
        const providerModels = MODEL_REGISTRY[provider as ModelProvider];
        if (providerModels[modelId]) {
          const registryModel = providerModels[modelId];
          // Return a default model with registry settings
          return {
            id: modelId,
            name: registryModel.name || modelId,
            provider: registryModel.provider || 'custom',
            model_id: registryModel.model_id || modelId,
            max_tokens: registryModel.max_tokens || 4096,
            input_cost_per_token: registryModel.input_cost_per_token || 0,
            output_cost_per_token: registryModel.output_cost_per_token || 0,
            supports_vision: registryModel.supports_vision || false,
            supports_functions: registryModel.supports_functions || false,
            supports_streaming: registryModel.supports_streaming || true,
            default_temperature: registryModel.default_temperature || 0.7,
            default_top_p: registryModel.default_top_p || 1.0,
            default_frequency_penalty: registryModel.default_frequency_penalty || 0,
            default_presence_penalty: registryModel.default_presence_penalty || 0,
            context_window: registryModel.context_window || 8192,
            description: registryModel.description || '',
            category: registryModel.category || 'text',
            capabilities: registryModel.capabilities || {
              text: true,
              vision: false,
              audio: false,
              functions: false,
              streaming: true,
              json_mode: false,
              fine_tuning: false
            },
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }

      return null;
    } catch (err) {
      console.error('Error getting model settings:', err);
      return null;
    }
  }, []);

  /**
   * Get models by provider
   * @param provider Provider name
   * @returns Models for the provider
   */
  const getModelsByProvider = useCallback((provider: ModelProvider): Model[] => {
    return models.filter(model => model.provider === provider);
  }, [models]);

  /**
   * Get all available providers
   * @returns Array of providers
   */
  const getProviders = useCallback((): ModelProvider[] => {
    const providers = new Set<ModelProvider>();
    models.forEach(model => providers.add(model.provider as ModelProvider));
    
    // Add providers from registry if they don't exist in the database
    Object.keys(MODEL_REGISTRY).forEach(provider => {
      providers.add(provider as ModelProvider);
    });
    
    return Array.from(providers);
  }, [models]);

  // Fetch models on mount
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models,
    loading,
    error,
    fetchModels,
    getModelSettings,
    getModelsByProvider,
    getProviders,
  };
}

export default useModelSettings;

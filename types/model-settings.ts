/**
 * Model settings types for AI models
 */

/**
 * Base model settings interface
 */
export interface ModelSettings {
  id: string;
  name: string;
  provider: ModelProvider;
  model_id: string;
  max_tokens: number;
  input_cost_per_token: number;
  output_cost_per_token: number;
  supports_vision: boolean;
  supports_functions: boolean;
  supports_streaming: boolean;
  default_temperature: number;
  default_top_p: number;
  default_frequency_penalty: number;
  default_presence_penalty: number;
  context_window: number;
  status: 'active' | 'inactive';
  base_url?: string | null;
  api_key?: string;
  description?: string;
  category?: ModelCategory;
  capabilities?: ModelCapabilities;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Model provider enum
 */
export type ModelProvider =
  | 'google'
  | 'openai'
  | 'anthropic'
  | 'google-vertex'
  | 'meta'
  | 'mistral'
  | 'ollama'
  | 'custom';

/**
 * Model category enum
 */
export type ModelCategory =
  | 'text'
  | 'vision'
  | 'embedding'
  | 'audio'
  | 'image'
  | 'multimodal';

/**
 * Model capability flags
 */
export interface ModelCapabilities {
  text: boolean;
  vision: boolean;
  audio: boolean;
  video: boolean;
  functions: boolean;
  streaming: boolean;
  json_mode: boolean;
  fine_tuning: boolean;
  thinking: boolean;
  search_grounding: boolean;
  dynamic_retrieval: boolean;
  hybrid_grounding: boolean;
  cached_content: boolean;
  code_execution: boolean;
  structured_output: boolean;
  image_generation: boolean;
  video_generation: boolean;
  audio_generation: boolean;
  response_modalities: boolean;
  file_inputs: boolean;
}

/**
 * Extended model settings with additional metadata
 */
export interface ExtendedModelSettings extends ModelSettings {
  description?: string;
  capabilities: ModelCapabilities;
  category: ModelCategory;
  release_date?: string;
  version?: string;
  metadata?: Record<string, any>;
}

/**
 * Model settings creation input
 */
export type ModelSettingsInput = Omit<
  ModelSettings,
  'id' | 'created_at' | 'updated_at'
>;

/**
 * Model settings update input
 */
export type ModelSettingsUpdate = Partial<
  Omit<ModelSettings, 'id' | 'created_at' | 'updated_at'>
>;

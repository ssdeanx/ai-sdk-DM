import { ModelCapabilities, ModelCategory, ModelProvider } from "./model-settings";

export interface Model {
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
  description?: string;
  category: ModelCategory;
  capabilities: ModelCapabilities;
  metadata?: Record<string, any>;
  base_url?: string | null;
  api_key?: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

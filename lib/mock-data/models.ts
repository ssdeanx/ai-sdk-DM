export interface Model {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  base_url?: string;
  api_key?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export const mockModels: Model[] = [
  {
    id: '1',
    name: 'Google Gemini Pro',
    provider: 'google',
    model_id: 'gemini-pro',
    base_url: '',
    api_key: '••••••••••••••••',
    status: 'active',
    created_at: '2023-12-01T00:00:00.000Z',
    updated_at: '2023-12-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    model_id: 'gpt-4o',
    base_url: '',
    api_key: '••••••••••••••••',
    status: 'active',
    created_at: '2023-12-01T00:00:00.000Z',
    updated_at: '2023-12-01T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'Anthropic Claude 3',
    provider: 'anthropic',
    model_id: 'claude-3-sonnet-20240229',
    base_url: '',
    api_key: '••••••••••••••••',
    status: 'inactive',
    created_at: '2023-12-01T00:00:00.000Z',
    updated_at: '2023-12-01T00:00:00.000Z',
  },
];

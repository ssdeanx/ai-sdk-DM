export interface Agent {
  id: string;
  name: string;
  description: string;
  model_id: string;
  tool_ids: string[];
  system_prompt?: string;
  created_at: string;
  updated_at: string;
}

export const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Research Assistant',
    description: 'Helps with research tasks and information gathering',
    model_id: '1', // Gemini Pro
    tool_ids: ['1', '3'], // Web Search, Weather
    system_prompt:
      'You are a helpful research assistant. Your goal is to provide accurate information and assist with research tasks.',
    created_at: '2023-12-01T00:00:00.000Z',
    updated_at: '2023-12-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Math Tutor',
    description: 'Helps with mathematical problems and explanations',
    model_id: '2', // GPT-4o
    tool_ids: ['2'], // Calculator
    system_prompt:
      'You are a math tutor. Your goal is to help students understand mathematical concepts and solve problems.',
    created_at: '2023-12-01T00:00:00.000Z',
    updated_at: '2023-12-01T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'Travel Planner',
    description: 'Helps plan trips and provides travel recommendations',
    model_id: '3', // Claude 3
    tool_ids: ['1', '3'], // Web Search, Weather
    system_prompt:
      'You are a travel planning assistant. Your goal is to help users plan trips and provide travel recommendations.',
    created_at: '2023-12-01T00:00:00.000Z',
    updated_at: '2023-12-01T00:00:00.000Z',
  },
];

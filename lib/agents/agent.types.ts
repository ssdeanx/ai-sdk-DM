/**
 * TypeScript interfaces for Agent configuration rows in Supabase
 */

/**
 * Agent interface matching Supabase 'agents' table
 */
export interface Agent {
    id: string
    name: string
    description: string
    model_id: string
    provider: string
    api_key?: string
    base_url?: string
    tool_ids: string[]
    system_prompt?: string | null
    persona_id?: string | null
    created_at: string
    updated_at: string
  }


/**
 * Tool configuration interface matching Supabase 'tools' table
 */
export interface ToolConfig {
  id: string
  name: string
  description: string
  parameters_schema: string
  created_at: string
  updated_at: string
}

/**
 * Agent state interface for persistent memory
 */
export interface AgentState {
  lastRun?: string
  runCount?: number
  memory?: Record<string, any>
  [key: string]: any
}

/**
 * Result of an agent run
 */
export interface RunResult {
  output: string
  memoryThreadId: string
}

/**
 * Agent lifecycle hooks
 */
export interface AgentHooks {
  onStart?: (input: string, threadId: string) => Promise<void>
  onToolCall?: (toolName: string, params: any) => Promise<void>
  onFinish?: (result: RunResult) => Promise<void>
}

/**
 * Agent persona configuration
 */
export interface AgentPersona {
  id: string
  name: string
  description: string
  systemPromptTemplate: string
  modelSettings?: Record<string, any>
  capabilities?: {
    text?: boolean
    vision?: boolean
    audio?: boolean
    video?: boolean
    functions?: boolean
    streaming?: boolean
    json_mode?: boolean
    fine_tuning?: boolean
    thinking?: boolean
    search_grounding?: boolean
    dynamic_retrieval?: boolean
    hybrid_grounding?: boolean
    cached_content?: boolean
    code_execution?: boolean
    structured_output?: boolean
    image_generation?: boolean
    video_generation?: boolean
    audio_generation?: boolean
    response_modalities?: boolean
    file_inputs?: boolean
  }
}
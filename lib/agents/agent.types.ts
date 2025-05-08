import { StreamTextResult } from 'ai';
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
  output?: string; // Make optional
  streamResult?: StreamTextResult<any, any>; // Add this
  memoryThreadId: string;
}
/**
 * Options for running an agent
 */

export type AgentRunTokenUsage = {
  /** Number of tokens in the prompt. */
  promptTokens: number;
  /** Number of tokens in the completion. */
  completionTokens: number;
  /** Total number of tokens. */
  totalTokens: number;
};

export type AgentRunFinishReason =
  | 'stop'
  | 'length'
  | 'tool-calls'
  | 'content-filter'
  | 'error'
  | 'unknown';

export type AgentRunToolInvocation = {
  /** The ID of the tool call. */
  toolCallId: string;
  /** The name of the tool being called. */
  toolName: string;
  /** The arguments for the tool call. */
  args: any;
};

/**
 * Data structure for the `onFinish` callback in `AgentRunOptions`,
 * providing details about the completed generation step, based on AI SDK patterns.
 */
export interface AgentRunFinishData {
  /**
   * The final assistant message generated.
   */
  message: {
    /** Unique identifier for the message. */
    id: string;
    /** Role of the message sender, typically 'assistant'. */
    role: 'assistant';
    /** The textual content of the message. */
    content: string;
    /** Tool invocations requested by the assistant in this message, if any. */
    toolInvocations?: AgentRunToolInvocation[];
    /** Optional: timestamp of when the message was created. */
    createdAt?: Date;
  };
  /** Optional: Token usage statistics for the generation. */
  usage?: AgentRunTokenUsage;
  /** Optional: The reason why the generation concluded. */
  finishReason?: AgentRunFinishReason;
}

export interface AgentRunOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  toolChoice?: any; // Based on Vercel SDK, this can be complex, but we don't use it
  traceId?: string; // Optional, as per integration notes above
  streamOutput?: boolean;
  onFinish?: (data: AgentRunFinishData) => Promise<void>; // Updated onFinish as per integration notes above, traceId is optional
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
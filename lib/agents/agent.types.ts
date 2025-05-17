import { StreamTextResult } from 'ai';
import { z } from 'zod';
/**
 * TypeScript interfaces and Zod schemas for Agent configuration rows in Supabase
 */

/**
 * Agent interface matching Supabase 'agents' table
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  model_id: string;
  provider: string;
  api_key?: string;
  base_url?: string;
  tool_ids: string[];
  system_prompt?: string | null;
  persona_id?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Zod schema for Agent
 */
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  model_id: z.string(),
  provider: z.string(),
  api_key: z.string().optional(),
  base_url: z.string().optional(),
  tool_ids: z.array(z.string()),
  system_prompt: z.string().nullable().optional(),
  persona_id: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Tool configuration interface matching Supabase 'tools' table
 */
export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  parameters_schema: string;
  created_at: string;
  updated_at: string;
}

/**
 * Zod schema for ToolConfig
 */
export const ToolConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  parameters_schema: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Agent state interface for persistent memory
 */
export interface AgentState {
  lastRun?: string;
  runCount?: number;
  memory?: Record<string, any>;
  [key: string]: any;
}

/**
 * Zod schema for AgentState
 */
export const AgentStateSchema = z
  .object({
    lastRun: z.string().optional(),
    runCount: z.number().optional(),
    memory: z.record(z.any()).optional(),
  })
  .catchall(z.any());

/**
 * Result of an agent run
 */
export interface RunResult {
  output?: string; // Make optional
  streamResult?: StreamTextResult<any, any>; // Add this
  memoryThreadId: string;
}

/**
 * Zod schema for RunResult
 */
export const RunResultSchema = z.object({
  output: z.string().optional(),
  streamResult: z.any().optional(), // StreamTextResult is complex, using any for now
  memoryThreadId: z.string(),
});
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

/**
 * Zod schema for AgentRunTokenUsage
 */
export const AgentRunTokenUsageSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
});

export type AgentRunFinishReason =
  | 'stop'
  | 'length'
  | 'tool-calls'
  | 'content-filter'
  | 'error'
  | 'unknown';

/**
 * Zod schema for AgentRunFinishReason
 */
export const AgentRunFinishReasonSchema = z.enum([
  'stop',
  'length',
  'tool-calls',
  'content-filter',
  'error',
  'unknown',
]);

export type AgentRunToolInvocation = {
  /** The ID of the tool call. */
  toolCallId: string;
  /** The name of the tool being called. */
  toolName: string;
  /** The arguments for the tool call. */
  args: any;
};

/**
 * Zod schema for AgentRunToolInvocation
 */
export const AgentRunToolInvocationSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.any(),
});

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

/**
 * Zod schema for AgentRunFinishData
 */
export const AgentRunFinishDataSchema = z.object({
  message: z.object({
    id: z.string(),
    role: z.literal('assistant'),
    content: z.string(),
    toolInvocations: z.array(AgentRunToolInvocationSchema).optional(),
    createdAt: z.date().optional(),
  }),
  usage: AgentRunTokenUsageSchema.optional(),
  finishReason: AgentRunFinishReasonSchema.optional(),
});

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
 * Zod schema for AgentRunOptions
 */
export const AgentRunOptionsSchema = z.object({
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  systemPrompt: z.string().optional(),
  toolChoice: z.any().optional(),
  traceId: z.string().optional(),
  streamOutput: z.boolean().optional(),
  onFinish: z
    .function()
    .args(AgentRunFinishDataSchema)
    .returns(z.promise(z.void()))
    .optional(),
});

/**
 * Agent lifecycle hooks
 */
export interface AgentHooks {
  onStart?: (input: string, threadId: string) => Promise<void>;
  onToolCall?: (toolName: string, params: any) => Promise<void>;
  onFinish?: (result: RunResult) => Promise<void>;
}

/**
 * Zod schema for AgentHooks
 */
export const AgentHooksSchema = z.object({
  onStart: z
    .function()
    .args(z.string(), z.string())
    .returns(z.promise(z.void()))
    .optional(),
  onToolCall: z
    .function()
    .args(z.string(), z.any())
    .returns(z.promise(z.void()))
    .optional(),
  onFinish: z
    .function()
    .args(RunResultSchema)
    .returns(z.promise(z.void()))
    .optional(),
});

/**
 * Agent persona configuration
 */
export interface AgentPersona {
  id: string;
  name: string;
  description: string;
  systemPromptTemplate: string;
  modelSettings?: Record<string, any>;
  capabilities?: {
    text?: boolean;
    vision?: boolean;
    audio?: boolean;
    video?: boolean;
    functions?: boolean;
    streaming?: boolean;
    json_mode?: boolean;
    fine_tuning?: boolean;
    thinking?: boolean;
    search_grounding?: boolean;
    dynamic_retrieval?: boolean;
    hybrid_grounding?: boolean;
    cached_content?: boolean;
    code_execution?: boolean;
    structured_output?: boolean;
    image_generation?: boolean;
    video_generation?: boolean;
    audio_generation?: boolean;
    response_modalities?: boolean;
    file_inputs?: boolean;
  };
}

/**
 * Zod schema for AgentPersona
 */
export const AgentPersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  systemPromptTemplate: z.string(),
  modelSettings: z.record(z.any()).optional(),
  capabilities: z
    .object({
      text: z.boolean().optional(),
      vision: z.boolean().optional(),
      audio: z.boolean().optional(),
      video: z.boolean().optional(),
      functions: z.boolean().optional(),
      streaming: z.boolean().optional(),
      json_mode: z.boolean().optional(),
      fine_tuning: z.boolean().optional(),
      thinking: z.boolean().optional(),
      search_grounding: z.boolean().optional(),
      dynamic_retrieval: z.boolean().optional(),
      hybrid_grounding: z.boolean().optional(),
      cached_content: z.boolean().optional(),
      code_execution: z.boolean().optional(),
      structured_output: z.boolean().optional(),
      image_generation: z.boolean().optional(),
      video_generation: z.boolean().optional(),
      audio_generation: z.boolean().optional(),
      response_modalities: z.boolean().optional(),
      file_inputs: z.boolean().optional(),
    })
    .optional(),
});

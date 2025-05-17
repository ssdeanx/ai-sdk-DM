import { createAnthropic } from '@ai-sdk/anthropic';
import {
  streamText as streamTextFn,
  generateText as generateTextFn,
  convertToCoreMessages,
  generateId,
} from 'ai';
import { getItemById } from './memory/upstash/supabase-adapter';
import {
  ModelSettings,
  ModelProvider,
  ModelCategory,
  ModelCapabilities,
} from '../types/model-settings';
import type { ToolSet, ToolExecutionOptions } from 'ai';
import { z } from 'zod';

// Local type definitions based on AI SDK UI documentation and project types
export type ChatMessage = {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt?: Date | string;
  name?: string; // for tool messages
  toolCallId?: string;
  metadata?: Record<string, unknown>;
};

export type ToolDefinition = {
  description: string;
  parameters: z.ZodTypeAny;
  execute?: (
    args: unknown,
    options?: { abortSignal?: AbortSignal }
  ) => Promise<unknown> | unknown;
};

export function getAnthropic(apiKey?: string, baseURL?: string) {
  return createAnthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    ...(baseURL ? { baseURL } : {}),
  });
}

// Fix isPlainObject to avoid 'any' and use a safe type
type PlainObject = Record<string, unknown>;
function isPlainObject(obj: unknown): obj is PlainObject {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

export async function getModelConfig(
  modelId: string
): Promise<ModelSettings | undefined> {
  // Use Upstash/Supabase adapter for unified model config access
  const model = await getItemById('models', modelId);
  if (!model) return undefined;
  // Normalize provider (type-safe)
  let provider = model.provider;
  if (provider === 'google-vertex') provider = 'vertex';
  // Coerce/parse fields if needed (e.g., ensure numbers, booleans)
  const parsedModel: ModelSettings = {
    ...model,
    provider: provider as ModelProvider,
    input_cost_per_token:
      typeof model.input_cost_per_token === 'string'
        ? parseFloat(model.input_cost_per_token)
        : model.input_cost_per_token,
    output_cost_per_token:
      typeof model.output_cost_per_token === 'string'
        ? parseFloat(model.output_cost_per_token)
        : model.output_cost_per_token,
    max_tokens:
      typeof model.max_tokens === 'string'
        ? parseInt(model.max_tokens, 10)
        : model.max_tokens,
    supports_vision: Boolean(model.supports_vision),
    supports_functions: Boolean(model.supports_functions),
    supports_streaming: Boolean(model.supports_streaming),
    default_temperature:
      typeof model.default_temperature === 'string'
        ? parseFloat(model.default_temperature)
        : model.default_temperature,
    default_top_p:
      typeof model.default_top_p === 'string'
        ? parseFloat(model.default_top_p)
        : model.default_top_p,
    default_frequency_penalty:
      typeof model.default_frequency_penalty === 'string'
        ? parseFloat(model.default_frequency_penalty)
        : model.default_frequency_penalty,
    default_presence_penalty:
      typeof model.default_presence_penalty === 'string'
        ? parseFloat(model.default_presence_penalty)
        : model.default_presence_penalty,
    context_window:
      typeof model.context_window === 'string'
        ? parseInt(model.context_window, 10)
        : model.context_window,
    status: model.status === 'inactive' ? 'inactive' : 'active',
    api_key: model.api_key ?? undefined,
    description: model.description ?? undefined,
    category:
      typeof model.category === 'string'
        ? (model.category as ModelCategory)
        : undefined,
    capabilities: isPlainObject(model.capabilities)
      ? (model.capabilities as unknown as ModelCapabilities)
      : undefined,
    metadata: isPlainObject(model.metadata) ? model.metadata : undefined,
  };
  return parsedModel;
}

// Helper to ensure createdAt is a Date and type-safe for convertToCoreMessages
// Only allow roles: 'system', 'user', 'assistant', 'data'
type SDKMessageRole = 'system' | 'user' | 'assistant' | 'data';
function normalizeMessages(messages: ChatMessage[]): Array<
  Omit<ChatMessage, 'createdAt' | 'role'> & {
    createdAt?: Date;
    role: SDKMessageRole;
    id: string;
  }
> {
  return messages
    .filter((msg) => msg.role !== 'tool')
    .map((msg) => {
      let createdAt: Date | undefined = undefined;
      if (msg.createdAt instanceof Date) createdAt = msg.createdAt;
      else if (typeof msg.createdAt === 'string') {
        const d = new Date(msg.createdAt);
        createdAt = isNaN(d.getTime()) ? undefined : d;
      }
      // If role is not allowed, default to 'user'
      const allowedRoles: SDKMessageRole[] = [
        'system',
        'user',
        'assistant',
        'data',
      ];
      const role: SDKMessageRole = allowedRoles.includes(
        msg.role as SDKMessageRole
      )
        ? (msg.role as SDKMessageRole)
        : 'user';
      // Use generateId if id is missing
      const id = msg.id || generateId();
      return {
        ...msg,
        createdAt,
        role,
        id,
      };
    });
}

// Helper to wrap tools to match ToolSet signature
function normalizeTools(tools: Record<string, ToolDefinition>): ToolSet {
  const normalized: ToolSet = {};
  for (const [name, tool] of Object.entries(tools)) {
    normalized[name] = {
      ...tool,
      execute: (args: unknown, options: ToolExecutionOptions) => {
        const result = tool.execute ? tool.execute(args, options) : undefined;
        return result instanceof Promise ? result : Promise.resolve(result);
      },
    };
  }
  return normalized;
}

export async function streamAnthropic({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  apiKey,
  baseURL,
}: {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: Record<string, ToolDefinition>;
  apiKey?: string;
  baseURL?: string;
}) {
  const modelConfig = await getModelConfig(modelId);
  if (!modelConfig) throw new Error('Model config not found');
  const anthropic = getAnthropic(apiKey, baseURL);
  const model = anthropic(modelConfig.model_id);
  return streamTextFn({
    model,
    messages: convertToCoreMessages(normalizeMessages(messages)),
    temperature,
    maxTokens,
    ...(Object.keys(tools).length > 0 ? { tools: normalizeTools(tools) } : {}),
  });
}

export async function generateAnthropic({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  apiKey,
  baseURL,
}: {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: Record<string, ToolDefinition>;
  apiKey?: string;
  baseURL?: string;
}) {
  const modelConfig = await getModelConfig(modelId);
  if (!modelConfig) throw new Error('Model config not found');
  const anthropic = getAnthropic(apiKey, baseURL);
  const model = anthropic(modelConfig.model_id);
  return generateTextFn({
    model,
    messages: convertToCoreMessages(normalizeMessages(messages)),
    temperature,
    maxTokens,
    ...(Object.keys(tools).length > 0 ? { tools: normalizeTools(tools) } : {}),
  });
}

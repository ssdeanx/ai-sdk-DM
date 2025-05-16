import { createVertex } from "@ai-sdk/google-vertex"
import { streamText, generateText, convertToCoreMessages } from "ai"
import type { ModelSettings } from "@/types/model-settings"

// Local type definitions based on AI SDK UI documentation and project types
export type ChatMessage = {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt?: Date | string;
  name?: string; // for tool messages
  toolCallId?: string;
  metadata?: Record<string, unknown>;
};

export type ToolDefinition = {
  description: string;
  parameters: import("zod").ZodTypeAny;
  execute?: (args: unknown, options?: { abortSignal?: AbortSignal }) => Promise<unknown> | unknown;
};

import { getItemById } from "./memory/upstash/supabase-adapter";

export function getVertex(project?: string, location?: string) {
  const effectiveProject = project || process.env.GOOGLE_VERTEX_PROJECT_ID
  const effectiveLocation = location || process.env.GOOGLE_VERTEX_LOCATION || "us-central1"
  if (!effectiveProject) throw new Error("Project ID is required for Vertex AI")
  return createVertex({ project: effectiveProject, location: effectiveLocation })
}

export async function getModelConfig(modelId: string): Promise<ModelSettings | undefined> {
  const model = await getItemById("models", modelId);
  if (!model) return undefined;
  // Coerce/parse fields to match ModelSettings (numbers, booleans, enums)
  return {
    ...model,
    provider: "vertex" as import("../types/model-settings").ModelProvider,
    input_cost_per_token: typeof model.input_cost_per_token === 'string' ? parseFloat(model.input_cost_per_token) : model.input_cost_per_token,
    output_cost_per_token: typeof model.output_cost_per_token === 'string' ? parseFloat(model.output_cost_per_token) : model.output_cost_per_token,
    max_tokens: typeof model.max_tokens === 'string' ? parseInt(model.max_tokens, 10) : model.max_tokens,
    supports_vision: Boolean(model.supports_vision),
    supports_functions: Boolean(model.supports_functions),
    supports_streaming: Boolean(model.supports_streaming),
    default_temperature: typeof model.default_temperature === 'string' ? parseFloat(model.default_temperature) : model.default_temperature,
    default_top_p: typeof model.default_top_p === 'string' ? parseFloat(model.default_top_p) : model.default_top_p,
    default_frequency_penalty: typeof model.default_frequency_penalty === 'string' ? parseFloat(model.default_frequency_penalty) : model.default_frequency_penalty,
    default_presence_penalty: typeof model.default_presence_penalty === 'string' ? parseFloat(model.default_presence_penalty) : model.default_presence_penalty,
    context_window: typeof model.context_window === 'string' ? parseInt(model.context_window, 10) : model.context_window,
    status: model.status === 'inactive' ? 'inactive' : 'active',
    api_key: model.api_key ?? undefined,
    description: model.description ?? undefined,
    category: typeof model.category === 'string' ? (model.category as import("../types/model-settings").ModelCategory) : undefined,
    capabilities: model.capabilities && typeof model.capabilities === 'object' && !Array.isArray(model.capabilities) ? (model.capabilities as import("../types/model-settings").ModelCapabilities) : undefined,
    metadata: model.metadata && typeof model.metadata === 'object' && !Array.isArray(model.metadata) ? model.metadata as Record<string, unknown> : undefined,
  };
}

// Fix normalizeMessages to filter out 'tool' role and ensure allowed roles only
// Only allow roles: 'system', 'user', 'assistant', 'data'
type SDKMessageRole = 'system' | 'user' | 'assistant' | 'data';
function normalizeMessages(messages: ChatMessage[]): Array<Omit<ChatMessage, "createdAt" | "role"> & { createdAt?: Date; role: SDKMessageRole }> {
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
      const allowedRoles: SDKMessageRole[] = ['system', 'user', 'assistant', 'data'];
      const role: SDKMessageRole = allowedRoles.includes(msg.role as SDKMessageRole) ? (msg.role as SDKMessageRole) : 'user';
      return {
        ...msg,
        createdAt,
        role,
      };
    });
}

function normalizeTools(tools: Record<string, ToolDefinition>): Record<string, ToolDefinition> {
  // Optionally wrap/normalize tool execute if needed
  return tools;
}

export async function streamVertex({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  project,
  location,
}: {
  modelId: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, ToolDefinition>
  project?: string
  location?: string
}) {
  const modelConfig = await getModelConfig(modelId);
  if (!modelConfig) throw new Error("Model config not found");
  const vertex = getVertex(project, location);
  const model = vertex(modelConfig.model_id);
  return streamText({
    model,
    messages: convertToCoreMessages(normalizeMessages(messages)),
    temperature,
    maxTokens,
    ...(Object.keys(tools).length > 0 ? { tools: normalizeTools(tools) } : {}),
  });
}

export async function generateVertex({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  project,
  location,
}: {
  modelId: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, ToolDefinition>
  project?: string
  location?: string
}) {
  const modelConfig = await getModelConfig(modelId);
  if (!modelConfig) throw new Error("Model config not found");
  const vertex = getVertex(project, location);
  const model = vertex(modelConfig.model_id);
  return generateText({
    model,
    messages: convertToCoreMessages(normalizeMessages(messages)),
    temperature,
    maxTokens,
    ...(Object.keys(tools).length > 0 ? { tools: normalizeTools(tools) } : {}),
  });
}

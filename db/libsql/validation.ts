import { z } from 'zod';

/**
 * Zod schemas for LibSQL DB entities. Use these for validation in routes and services.
 * @module libsql/validation
 */

export const MemoryThreadSchema = z.object({
  id: z.string(),
  agent_id: z.string().optional().nullable(),
  network_id: z.string().optional().nullable(),
  name: z.string(),
  summary: z.string().optional().nullable(),
  metadata: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MemoryThread = z.infer<typeof MemoryThreadSchema>;
export type NewMemoryThread = z.infer<typeof MemoryThreadSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  memory_thread_id: z.string(),
  role: z.string(),
  content: z.string(),
  tool_call_id: z.string().optional().nullable(),
  tool_name: z.string().optional().nullable(),
  token_count: z.number().optional().nullable(),
  embedding_id: z.string().optional().nullable(),
  metadata: z.string().optional().nullable(),
  created_at: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;
export type NewMessage = z.infer<typeof MessageSchema>;

export const EmbeddingSchema = z.object({
  id: z.string(),
  vector: z.instanceof(Uint8Array),
  model: z.string().optional().nullable(),
  dimensions: z.number().optional().nullable(),
  created_at: z.string(),
});
export type Embedding = z.infer<typeof EmbeddingSchema>;
export type NewEmbedding = z.infer<typeof EmbeddingSchema>;

export const AgentStateSchema = z.object({
  memory_thread_id: z.string(),
  agent_id: z.string(),
  state_data: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AgentState = z.infer<typeof AgentStateSchema>;
export type NewAgentState = z.infer<typeof AgentStateSchema>;

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  current_step_index: z.number(),
  status: z.string(),
  metadata: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Workflow = z.infer<typeof WorkflowSchema>;
export type NewWorkflow = z.infer<typeof WorkflowSchema>;

export const WorkflowStepSchema = z.object({
  id: z.string(),
  workflow_id: z.string(),
  agent_id: z.string(),
  input: z.string().optional().nullable(),
  thread_id: z.string(),
  status: z.string(),
  result: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
  metadata: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type NewWorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const GqlCacheSchema = z.object({
  id: z.string(),
  query: z.string(),
  variables: z.string().optional().nullable(),
  response: z.string(),
  createdAt: z.string(),
});
export type GqlCache = z.infer<typeof GqlCacheSchema>;
export type NewGqlCache = z.infer<typeof GqlCacheSchema>;

export const AppSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  type: z.string(),
  code: z.string(),
  parameters_schema: z.string().optional().nullable(),
  metadata: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type App = z.infer<typeof AppSchema>;
export type NewApp = z.infer<typeof AppSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  role: z.string(),
  password_hash: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type User = z.infer<typeof UserSchema>;
export type NewUser = z.infer<typeof UserSchema>;

export const IntegrationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  provider: z.string(),
  name: z.string().optional().nullable(),
  config: z.string().optional().nullable(),
  credentials: z.string().optional().nullable(),
  status: z.string(),
  last_synced_at: z.string().optional().nullable(),
  metadata: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Integration = z.infer<typeof IntegrationSchema>;
export type NewIntegration = z.infer<typeof IntegrationSchema>;

export const AppCodeBlockSchema = z.object({
  id: z.string(),
  app_id: z.string(),
  language: z.string(),
  code: z.string(),
  description: z.string().optional().nullable(),
  order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AppCodeBlock = z.infer<typeof AppCodeBlockSchema>;
export type NewAppCodeBlock = z.infer<typeof AppCodeBlockSchema>;

export const FileSchema = z.object({
  id: z.string(),
  app_id: z.string(),
  parent_id: z.string().optional().nullable(),
  name: z.string(),
  type: z.string(),
  content: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type File = z.infer<typeof FileSchema>;
export type NewFile = z.infer<typeof FileSchema>;

export const TerminalSessionSchema = z.object({
  id: z.string(),
  app_id: z.string(),
  user_id: z.string(),
  command: z.string(),
  output: z.string().optional().nullable(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type TerminalSession = z.infer<typeof TerminalSessionSchema>;
export type NewTerminalSession = z.infer<typeof TerminalSessionSchema>;

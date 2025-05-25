/*
 * This file re-exports all TypeScript types from the types folder.
 * The unified type definitions derived from our Zod validation schemas are re-exported
 * for consistent use across the project.
 * 
 * Legacy manual types are also included for backward compatibility (deprecated).
 */

export * from './agents';
export * from './blog';
export * from './app_code_blocks';
export * from './file';
export * from './integrations';
export * from './mdx';
export * from './model-settings';
export * from './models';
export * from './nlpjs__nlp';
export * from './personas';
export * from './providers';
export * from './schema';
export * from './settings';
export * from './terminal';
export * from './tools';

/* Legacy manually maintained interfaces (deprecated) */
export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  baseUrl?: string;
  apiKey: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  parametersSchema: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  modelId: string;
  model?: string;
  toolIds?: string[];
  tools?: string[];
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkConfig {
  id: string;
  name: string;
  description: string;
  agentIds?: string[];
  agents?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolCallId?: string;
  createdAt: string;
}

export interface Thread {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCall {
  id: string;
  threadId: string;
  messageId: string;
  toolName: string;
  parameters: string;
  result?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

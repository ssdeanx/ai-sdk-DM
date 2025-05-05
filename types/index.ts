// Model types
export interface ModelConfig {
  id: string
  name: string
  provider: string
  modelId: string
  baseUrl?: string
  apiKey: string
  status: "Active" | "Inactive"
  createdAt: string
  updatedAt: string
}

// Tool types
export interface ToolDefinition {
  id: string
  name: string
  description: string
  parametersSchema: string
  createdAt: string
  updatedAt: string
}

// Agent types
export interface AgentConfig {
  id: string
  name: string
  description: string
  modelId: string
  model?: string
  toolIds?: string[]
  tools?: string[]
  systemPrompt?: string
  createdAt: string
  updatedAt: string
}

// Network types
export interface NetworkConfig {
  id: string
  name: string
  description: string
  agentIds?: string[]
  agents?: string[]
  createdAt: string
  updatedAt: string
}

// Message types
export interface Message {
  id: string
  threadId: string
  role: "system" | "user" | "assistant" | "tool"
  content: string
  toolName?: string
  toolCallId?: string
  createdAt: string
}

// Thread types
export interface Thread {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

// Tool call types
export interface ToolCall {
  id: string
  threadId: string
  messageId: string
  toolName: string
  parameters: string
  result?: string
  status: "pending" | "completed" | "failed"
  createdAt: string
  updatedAt: string
}

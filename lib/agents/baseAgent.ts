import { streamText, CoreMessage } from "ai"
import { getProviderByName } from "../ai"
import { loadMessages, saveMessage, loadAgentState, saveAgentState } from "../memory/memory"
import { jsonSchemaToZod } from "../tools"
import { toolRegistry } from "../tools/toolRegistry"
import { initializeTools } from "../tools/toolInitializer"
import * as supabaseMemory from "../memory/supabase"
import { getLibSQLClient } from "../memory/db"
import { v4 as uuidv4 } from "uuid"
import * as aiSdkIntegration from "../ai-sdk-integration"
import * as aiSdkTracing from "../ai-sdk-tracing"
import { personaManager } from "./personas/persona-manager"
import {
  Agent,
  ToolConfig,
  RunResult,
  AgentHooks,
  AgentState,
  AgentRunTokenUsage,
  AgentRunFinishReason,
  AgentRunToolInvocation,
  AgentRunFinishData,
  AgentRunOptions,
  AgentPersona
} from "./agent.types"

export class BaseAgent {
  id: string
  name: string
  description: string
  providerName: string
  modelId: string
  apiKey: string
  baseUrl?: string
  toolConfigs: ToolConfig[]
  hooks: AgentHooks

  constructor(config: Agent, toolConfigs: ToolConfig[], hooks: AgentHooks = {}) {
    this.id = config.id
    this.name = config.name
    this.description = config.description
    this.providerName = config.provider
    this.modelId = config.model_id
    this.apiKey = config.api_key || ""
    this.baseUrl = config.base_url
    this.toolConfigs = toolConfigs
    this.hooks = hooks

    // Ensure tools are initialized once for the whole app (idempotent)
    initializeTools()
    // Optionally, prefetch all AI SDK tools for this agent (ensures ai-sdk-integration is used)
    aiSdkIntegration.getAllAISDKTools({ includeBuiltIn: true, includeCustom: true, includeAgentic: true })
  }

  private async initializeToolsForAgent(): Promise<Record<string, any>> {
    // Only fetch tools for this agent, do not re-initialize global registry
    const aiTools: Record<string, any> = {}
    for (const toolConfig of this.toolConfigs) {
      const toolName = toolConfig.name
      if (await toolRegistry.hasTool(toolName)) {
        const registryTool = await toolRegistry.getTool(toolName)
        aiTools[toolName] = {
          ...registryTool,
          execute: async (params: any) => {
            if (this.hooks.onToolCall) {
              await this.hooks.onToolCall(toolName, params)
            }
            return await toolRegistry.executeTool(toolName, params)
          }
        }
      } else {
        // Register custom tool if not present
        const schema = JSON.parse(toolConfig.parameters_schema)
        const zodSchema = jsonSchemaToZod(schema)
        toolRegistry.register(
          toolName,
          toolConfig.description,
          zodSchema,
          async (params: any) => {
            return { result: `Executed ${toolName} with params: ${JSON.stringify(params)}` }
          }
        )
        aiTools[toolName] = {
          execute: async (params: any) => {
            if (this.hooks.onToolCall) {
              await this.hooks.onToolCall(toolName, params)
            }
            return await toolRegistry.executeTool(toolName, params)
          }
        }
      }
    }
    return aiTools
  }

  public async run(input?: string, threadId?: string, options?: AgentRunOptions): Promise<RunResult> {
    const memoryThreadId = threadId || uuidv4()
    if (input && this.hooks.onStart) {
      await this.hooks.onStart(input, memoryThreadId)
    }
    try {
      const db = getLibSQLClient()
      let messages = await loadMessages(memoryThreadId)
      if (messages.length === 0) {
        await db.execute({
          sql: `INSERT INTO memory_threads (id, agent_id, name, created_at, updated_at)
                VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
          args: [memoryThreadId, this.id, `${this.name} Thread`],
        })
        let systemMsg = this.getSystemPrompt()
        // Persona support
        const agentConfig = await supabaseMemory.getAgentConfig(this.id)
        if (agentConfig?.persona_id) {
          await personaManager.init()
          const persona = await personaManager.getPersona(agentConfig.persona_id)
          if (persona?.systemPromptTemplate) {
            systemMsg = persona.systemPromptTemplate.replace(/\{\{\s*agentName\s*\}\}/g, this.name)
          }
        }
        await saveMessage(memoryThreadId, "system", systemMsg)
        messages = [{ role: "system", content: systemMsg }]
      }
      if (input) {
        await saveMessage(memoryThreadId, "user", input)
        messages.push({ role: "user", content: input })
      }
      const agentState: AgentState = await loadAgentState(memoryThreadId, this.id)
      const provider = await getProviderByName(this.providerName, this.apiKey, this.baseUrl)
      if (!provider) throw new Error(`Failed to initialize provider: ${this.providerName}`)
      // Use Supabase for latest config and tools
      const agentConfig = await supabaseMemory.getAgentConfig(this.id)
      if (!agentConfig) throw new Error("Agent config not found in Supabase")
      // Persona support (again, for dynamic system prompt)
      let persona: AgentPersona | null = null
      if (agentConfig.persona_id) {
        await personaManager.init()
        persona = (await personaManager.getPersona(agentConfig.persona_id)) ?? null
      }
      // Get tools for this agent from Supabase
      const toolConfigs = await supabaseMemory.getAgentTools(this.id)
      this.toolConfigs = toolConfigs
      await toolRegistry.initialize()
      const tools = await this.initializeToolsForAgent()
      // Map messages to CoreMessages
      const coreMessages = messages.map(msg => ({
        id: uuidv4(),
        role: msg.role as CoreMessage['role'],
        content: msg.content
      })) as CoreMessage[]
      // Streaming with advanced options
      let result, text
      const maxSteps = 8 // Allow multi-step/parallel tool calls

      // Resolve stream options, prioritizing AgentRunOptions over agentConfig
      const temperature = options?.temperature ?? agentConfig.temperature
      const maxTokens = options?.maxTokens ?? agentConfig.max_tokens
      const systemPrompt = options?.systemPrompt // System prompt from options can override default
      const onFinishCallback = options?.onFinish // AI SDK specific onFinish

      // Update system message if overridden by options
      if (systemPrompt && messages.length > 0 && messages[0].role === 'system') {
        messages[0].content = systemPrompt
        // Potentially re-save if system message is dynamically changed and needs persistence
        // await saveMessage(memoryThreadId, "system", systemPrompt); 
      } else if (systemPrompt && messages.length === 0) {
        // If no messages yet, and system prompt is provided via options, use it
        await saveMessage(memoryThreadId, "system", systemPrompt)
        messages.push({ role: "system", content: systemPrompt })
      }

      const streamOptions: any = { // Use 'any' for broader compatibility with potential provider-specific options
        model: provider(this.modelId),
        messages: coreMessages,
        tools,
        maxSteps,
        toolCallStreaming: true, // Assuming this is a desired default
        temperature: temperature,
        maxTokens: maxTokens,
        // Pass the onFinish from AgentRunOptions if available
        onFinish: onFinishCallback, 
        // Pass toolChoice from AgentRunOptions if available
        toolChoice: options?.toolChoice,
        // Pass traceId from AgentRunOptions if available
        traceId: options?.traceId,
        // Note: this.hooks.onToolCall is already used by initializeToolsForAgent wrapper
        // onToolCall: this.hooks.onToolCall // This was here, but seems redundant if tools are wrapped
      }

      if (aiSdkTracing && aiSdkTracing.streamTextWithTracing) {
        result = await aiSdkTracing.streamTextWithTracing(streamOptions)
        text = await result.text
      } else {
        result = streamText(streamOptions)
        text = await result.text
      }
      await saveMessage(memoryThreadId, "assistant", text)
      const newState: AgentState = {
        ...agentState,
        lastRun: new Date().toISOString(),
        runCount: (agentState.runCount || 0) + 1
      }
      await saveAgentState(memoryThreadId, this.id, newState)
      const runResult: RunResult = { output: text, memoryThreadId, streamResult: result }
      if (this.hooks.onFinish && !onFinishCallback) { // Only call agent's hook if no specific onFinish was provided in options
        await this.hooks.onFinish(runResult)
      }
      return runResult
    } catch (error) {
      console.error(`Agent run error:`, error)
      throw error
    }
  }

  private getSystemPrompt(): string {
    if (this.toolConfigs.length > 0) {
      const toolNames = this.toolConfigs.map(t => t.name).join(", ")
      return `You are ${this.name}. ${this.description}\n\nYou have access to the following tools: ${toolNames}.`
    }

    return `You are ${this.name}. ${this.description}`
  }
}
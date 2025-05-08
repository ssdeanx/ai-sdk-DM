import { streamText, CoreMessage } from "ai"
import { getProviderByName } from "../ai"
import { loadMessages, saveMessage, loadAgentState, saveAgentState } from "../memory/memory"
import { jsonSchemaToZod } from "../tools"
import { toolRegistry } from "../tools/toolRegistry"
import { getLibSQLClient } from "../memory/db"
import { v4 as uuidv4 } from "uuid"
import { Agent, ToolConfig, RunResult, AgentHooks, AgentState } from "./agent.types"

/**
 * Base Agent class that handles configuration, tool initialization, and execution
 */
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

  /**
   * Create a new BaseAgent instance
   *
   * @param config - Agent configuration from Supabase
   * @param toolConfigs - Tool configurations from Supabase
   * @param hooks - Optional lifecycle hooks
   */
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
  }

  /**
   * Initialize tools from tool configurations
   *
   * @returns Record of AI SDK compatible tools
   */
  private async initializeTools() {
    // Ensure tool registry is initialized
    await toolRegistry.initialize()

    // Get all available tools
    const allTools = await toolRegistry.getAllTools()
    const aiTools: Record<string, any> = {}

    // Process tool configurations from Supabase
    for (const toolConfig of this.toolConfigs) {
      try {
        const toolName = toolConfig.name

        // Check if this tool exists in the registry
        if (await toolRegistry.hasTool(toolName)) {
          // Get the tool from registry
          const registryTool = await toolRegistry.getTool(toolName)

          // Use the tool from registry with a wrapped execute function
          aiTools[toolName] = {
            ...registryTool,
            // Wrap the execute function to add hook
            execute: async (params: any) => {
              // Call onToolCall hook if defined
              if (this.hooks.onToolCall) {
                await this.hooks.onToolCall(toolName, params)
              }

              // Execute the tool via registry
              return await toolRegistry.executeTool(toolName, params)
            }
          }
        } else {
          // Create a custom tool from the configuration
          const schema = JSON.parse(toolConfig.parameters_schema)
          const zodSchema = jsonSchemaToZod(schema)

          // Register the tool in the registry
          const customTool = toolRegistry.register(
            toolName,
            toolConfig.description,
            zodSchema,
            async (params: any) => {
              // This is a fallback for tools not in the registry
              console.log(`Executing custom tool ${toolName} with params:`, params)
              return { result: `Executed ${toolName} with params: ${JSON.stringify(params)}` }
            }
          )

          // Add the tool with hook
          aiTools[toolName] = {
            ...customTool,
            execute: async (params: any) => {
              // Call onToolCall hook if defined
              if (this.hooks.onToolCall) {
                await this.hooks.onToolCall(toolName, params)
              }

              // Execute the tool via registry
              return await toolRegistry.executeTool(toolName, params)
            }
          }
        }
      } catch (error) {
        console.error(`Failed to initialize tool ${toolConfig.name}:`, error)
      }
    }

    return aiTools
  }

  /**
   * Run the agent with optional input and thread ID
   *
   * @param input - Optional user input
   * @param threadId - Optional memory thread ID
   * @returns RunResult with output and memory thread ID
   */
  public async run(input?: string, threadId?: string): Promise<RunResult> {
    // Generate thread ID if not provided
    const memoryThreadId = threadId || uuidv4()

    // Call onStart hook if defined and input is provided
    if (input && this.hooks.onStart) {
      await this.hooks.onStart(input, memoryThreadId)
    }

    try {
      const db = getLibSQLClient()
      let messages = await loadMessages(memoryThreadId)

      // Initialize thread if it doesn't exist
      if (messages.length === 0) {
        await db.execute({
          sql: `INSERT INTO memory_threads (id, agent_id, name, created_at, updated_at)
                VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
          args: [memoryThreadId, this.id, `${this.name} Thread`],
        })

        // Use system prompt from config or generate a default one
        const systemMsg = this.getSystemPrompt()
        await saveMessage(memoryThreadId, "system", systemMsg)
        messages = [{ role: "system", content: systemMsg }]
      }

      // Add user input to thread if provided
      if (input) {
        await saveMessage(memoryThreadId, "user", input)
        messages.push({ role: "user", content: input })
      }

      // Load agent state and initialize provider
      const agentState = await loadAgentState(memoryThreadId, this.id)
      const provider = await getProviderByName(this.providerName, this.apiKey, this.baseUrl)

      if (!provider) {
        throw new Error(`Failed to initialize provider: ${this.providerName}`)
      }

      // Initialize model and tools
      const model = provider(this.modelId)
      const tools = await this.initializeTools()

      // Map local messages to CoreMessages expected by the AI SDK
      const coreMessages = messages.map(msg => ({
        id: uuidv4(),
        role: msg.role as CoreMessage['role'],
        content: msg.content
      })) as CoreMessage[];

      // Stream text from the model
      const result = streamText({ model, messages: coreMessages, tools, maxSteps: 5 })
      const text = await result.text

      // Save assistant response
      await saveMessage(memoryThreadId, "assistant", text)

      // Update agent state
      const newState = {
        ...agentState,
        lastRun: new Date().toISOString(),
        runCount: (agentState.runCount || 0) + 1
      }
      await saveAgentState(memoryThreadId, this.id, newState)

      // Create result
      const runResult: RunResult = { output: text, memoryThreadId }

      // Call onFinish hook if defined
      if (this.hooks.onFinish) {
        await this.hooks.onFinish(runResult)
      }

      return runResult
    } catch (error) {
      console.error(`Agent run error:`, error)
      throw error
    }
  }

  /**
   * Get the system prompt for the agent
   *
   * @returns System prompt string
   */
  private getSystemPrompt(): string {
    if (this.toolConfigs.length > 0) {
      const toolNames = this.toolConfigs.map(t => t.name).join(", ")
      return `You are ${this.name}. ${this.description}\n\nYou have access to the following tools: ${toolNames}.`
    }

    return `You are ${this.name}. ${this.description}`
  }
}
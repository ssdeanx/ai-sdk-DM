import { streamText, CoreMessage } from "ai"
import { getProviderByName } from "../ai"
import { loadMessages, saveMessage, loadAgentState, saveAgentState } from "../memory/memory"
import { jsonSchemaToZod } from "../tools"
import * as toolExecutors from "../tool-execution"
import { getLibSQLClient } from "../memory/db"
import { v4 as uuidv4 } from "uuid"

export interface RunResult {
  output: string
  memoryThreadId: string
}

export class BaseAgent {
  id: string
  name: string
  description: string
  providerName: string
  modelId: string
  apiKey: string
  baseUrl?: string
  toolConfigs: any[]

  constructor(config: any, toolConfigs: any[]) {
    this.id = config.id
    this.name = config.name
    this.description = config.description
    this.providerName = config.provider
    this.modelId = config.model_id
    this.apiKey = config.api_key
    this.baseUrl = config.base_url || undefined
    this.toolConfigs = toolConfigs
  }

  private async initializeTools() {
    const aiTools: Record<string, any> = {}
    for (const toolConfig of this.toolConfigs) {
      const schema = JSON.parse(toolConfig.parameters_schema)
      const zodSchema = jsonSchemaToZod(schema)
      aiTools[toolConfig.name] = {
        ...toolConfig,
        parameters: zodSchema,
        execute: async (params: any) => {
          const executor = toolExecutors[toolConfig.name as keyof typeof toolExecutors]
          if (!executor) throw new Error(`No executor for tool ${toolConfig.name}`)
          // Cast executor to any to allow spreading arguments of type any[]
          return (executor as any)(...(Object.values(params) as any[]))
        },
      }
    }
    return aiTools
  }

  public async run(input?: string, threadId?: string): Promise<RunResult> {
    const db = getLibSQLClient()
    const memoryThreadId = threadId || uuidv4()
    let messages = await loadMessages(memoryThreadId)

    if (messages.length === 0) {
      await db.execute({
        sql: `INSERT INTO memory_threads (id, agent_id, name, created_at, updated_at)
              VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
        args: [memoryThreadId, this.id, `${this.name} Thread`],
      })
      const systemMsg = `You are ${this.name}. ${this.description}`
      await saveMessage(memoryThreadId, "system", systemMsg)
      messages = [{ role: "system", content: systemMsg }]
    }

    if (input) {
      await saveMessage(memoryThreadId, "user", input)
      messages.push({ role: "user", content: input })
    }

    const agentState = await loadAgentState(memoryThreadId, this.id)
    const provider = await getProviderByName(this.providerName, this.apiKey, this.baseUrl)

    if (!provider) {
      throw new Error(`Failed to initialize provider: ${this.providerName}`)
    }

    const model = provider(this.modelId)
    const tools = await this.initializeTools()

    // Map local messages to CoreMessages expected by the AI SDK
    // Cast the result to CoreMessage[] assuming the structure is compatible or handled by the library
    const coreMessages = messages.map(msg => ({
      role: msg.role as CoreMessage['role'],
      content: msg.content
    })) as CoreMessage[];

    const result = await streamText({ model, messages: coreMessages, tools, maxSteps: 5 })
    const text = await result.text
    await saveMessage(memoryThreadId, "assistant", text)

    const newState = { ...agentState, lastRun: new Date().toISOString(), runCount: (agentState.runCount || 0) + 1 }
    await saveAgentState(memoryThreadId, this.id, newState)

    return { output: text, memoryThreadId }
  }
}
import { streamText, tool, CoreMessage } from "ai"
import { getProviderByName } from "../ai"
import { loadMessages, saveMessage, loadAgentState, saveAgentState } from "../memory/memory"
import { jsonSchemaToZod } from "../tools"
import * as toolExecutors from "../tool-execution"
import { getLibSQLClient } from "../memory/db"
import { getItemById, getData } from "../memory/supabase"

// Run an agent with a specific memory thread
export async function runAgent(agentId: string, memoryThreadId: string, initialInput?: string) {
  // Load agent configuration from Supabase
  const agent = await getItemById<any>("agents", agentId)
  if (!agent) throw new Error("Agent not found")

  // Load model config from Supabase
  const model = await getItemById<any>("models", agent.model_id)
  if (!model) throw new Error("Model not found for agent")

  // Load agent's tools from Supabase
  let tools: any[] = []
  if (Array.isArray(agent.tool_ids) && agent.tool_ids.length > 0) {
    tools = await getData<any>("tools", { filters: { id: agent.tool_ids } })
  }

  // Use LibSQL for memory/thread
  const db = getLibSQLClient()
  const messages = await loadMessages(memoryThreadId)

  if (messages.length === 0) {
    // This is a new thread, create it
    await db.execute({
      sql: `INSERT INTO memory_threads (id, agent_id, name, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      args: [memoryThreadId, agentId, `${agent.name} Thread`],
    })
    // Add system message
    const systemMessage = agent.system_prompt || `You are ${agent.name}. ${agent.description}`
    await saveMessage(memoryThreadId, "system", systemMessage)
    messages.push({ role: "system", content: systemMessage })
  }

  // Add initial user input if provided
  if (initialInput) {
    await saveMessage(memoryThreadId, "user", initialInput)
    messages.push({ role: "user", content: initialInput })
  }

  // Load agent state
  const agentState = await loadAgentState(memoryThreadId, agentId)

  // Initialize AI provider
  const provider = await getProviderByName(model.provider, model.api_key, model.base_url)
  if (!provider) throw new Error(`Failed to initialize provider: ${model.provider}`)
  const aiModel = provider(model.model_id)

  // Prepare tools for AI SDK
  const aiTools: Record<string, any> = {}
  for (const toolConfig of tools) {
    try {
      const schema = JSON.parse(toolConfig.parameters_schema)
      const zodSchema = jsonSchemaToZod(schema)
      aiTools[toolConfig.name] = tool({
        description: toolConfig.description,
        parameters: zodSchema,
        execute: async (params: any) => {
          const executor = (toolExecutors as Record<string, (...args: any[]) => Promise<any>>)[toolConfig.name]
          if (executor) {
            return await executor(...Object.values(params))
          } else {
            throw new Error(`No executor found for tool: ${toolConfig.name}`)
          }
        },
      })
    } catch (e) {
      console.error(`Error setting up tool ${toolConfig.name}:`, e)
    }
  }

  // Make AI SDK call
  const result = await streamText({
    model: aiModel,
    messages: messages as CoreMessage[],
    tools: aiTools,
    maxSteps: 5, // Allow multiple tool calls in a single request
  })

  // Save the assistant's response
  await saveMessage(memoryThreadId, "assistant", await result.text)

  // Update agent state
  const newState = {
    ...agentState,
    lastRun: new Date().toISOString(),
    runCount: (agentState.runCount || 0) + 1,
  }
  await saveAgentState(memoryThreadId, agentId, newState)

  return {
    output: await result.text,
    memoryThreadId,
  }
}

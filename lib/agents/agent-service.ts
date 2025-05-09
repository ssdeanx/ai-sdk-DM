import { streamText, CoreMessage, StreamTextResult } from "ai";
import { getProviderByName } from "../ai"
import { loadMessages, saveMessage, loadAgentState, saveAgentState } from "../memory/memory"
import { jsonSchemaToZod } from "../tools"
import { initializeTools } from "../tools/toolInitializer"
import { getLibSQLClient } from "../memory/db"
import { getItemById, getData, shouldUseUpstash } from "../memory/supabase"
import { createSupabaseClient } from "../memory/upstash/supabase-adapter-factory"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"
import {
  Agent,
  AgentSchema,
  ToolConfig,
  ToolConfigSchema,
  RunResult,
  RunResultSchema,
  AgentRunOptions,
  AgentRunOptionsSchema,
  AgentRunFinishData,
  AgentRunFinishDataSchema,
  AgentRunFinishReason
} from "./agent.types"
import { personaManager } from "./personas/persona-manager"

interface ProviderOptions {
  traceId?: string;
  // other provider options
}

/**
 * Run an agent with a specific memory thread
 *
 * @param agentId - Agent ID from Supabase
 * @param memoryThreadId - Memory thread ID (optional, will be generated if not provided)
 * @param initialInput - Initial user input (optional)
 * @returns RunResult with output and memory thread ID
 */
export async function runAgent(
  agentId: string,
  memoryThreadId?: string,
  initialInput?: string,
  options?: AgentRunOptions
): Promise<RunResult> {
  // Validate inputs with Zod schemas
  const validatedAgentId = z.string().parse(agentId);
  const validatedThreadId = memoryThreadId ? z.string().parse(memoryThreadId) : undefined;
  const validatedInput = initialInput ? z.string().parse(initialInput) : undefined;
  const validatedOptions = options ? AgentRunOptionsSchema.parse(options) : undefined;

  // Generate thread ID if not provided
  const threadId = validatedThreadId || uuidv4()

  try {
    // Load agent configuration from Supabase or Upstash
    let agent: Agent | null = null;
    let model: any = null;
    let tools: ToolConfig[] = [];

    if (shouldUseUpstash()) {
      // Use Upstash adapter
      const supabaseClient = createSupabaseClient();

      // Get agent
      agent = await supabaseClient.from("agents").getById(agentId) as unknown as Agent;
      if (!agent) throw new Error("Agent not found");

      // Get model
      model = await supabaseClient.from("models").getById(agent.model_id) as any;
      if (!model) throw new Error("Model not found for agent");

      // Get tools
      if (Array.isArray(agent.tool_ids) && agent.tool_ids.length > 0) {
        const toolPromises = agent.tool_ids.map(id =>
          supabaseClient.from("tools").getById(id)
        );
        const toolResults = await Promise.all(toolPromises);
        tools = toolResults.filter(Boolean) as unknown as ToolConfig[];
      }
    } else {
      // Use regular Supabase
      agent = await getItemById("agents", agentId) as unknown as Agent;
      if (!agent) throw new Error("Agent not found");

      // Load model config from Supabase
      model = await getItemById("models", agent.model_id);
      if (!model) throw new Error("Model not found for agent");

      // Load agent's tools from Supabase
      if (agent && Array.isArray(agent.tool_ids) && agent.tool_ids.length > 0) {
        const toolData = await getData("tools", {
          filters: (query) => query.in('id', agent.tool_ids)
        }) as unknown as ToolConfig[];
        tools = toolData || [];
      }
    }

    // Use LibSQL for memory/thread
    const db = getLibSQLClient()
    const messages = await loadMessages(threadId)

    if (messages.length === 0) {
      // This is a new thread, create it
      await db.execute({
        sql: `INSERT INTO memory_threads (id, agent_id, name, created_at, updated_at)
              VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
        args: [threadId, agentId, `${agent.name} Thread`],
      })

      // Generate system message
      let systemMessage = agent.system_prompt || `You are ${agent.name}. ${agent.description}`

      // If agent has a persona, use it to generate system prompt
      if (agent.persona_id) {
        try {
          // First get the persona by ID
          const persona = await personaManager.getPersonaById(agent.persona_id);
          if (persona) {
            // Then generate the system prompt using the persona
            systemMessage = personaManager.generateSystemPrompt(
              persona,
              undefined,
              {
                name: agent.name || '',
                description: agent.description || '',
                toolNames: tools.map(t => t.name || '').join(", ")
              }
            );
          }
        } catch (error) {
          console.error("Failed to generate persona system prompt:", error)
        }
      }

      await saveMessage(threadId, "system", systemMessage)
      messages.push({ role: "system", content: systemMessage })
    }

    // Add initial user input if provided
    if (initialInput) {
      await saveMessage(threadId, "user", initialInput)
      messages.push({ role: "user", content: initialInput })
    }

    // Load agent state
    const agentState = await loadAgentState(threadId, agentId)

    // Initialize AI provider
    const provider = await getProviderByName(model.provider, model.api_key, model.base_url)
    if (!provider) throw new Error(`Failed to initialize provider: ${model.provider}`)
    const aiModel = provider(model.model_id)

    // Initialize tools
    await initializeTools()

    // Prepare tools for AI SDK
    const aiTools: Record<string, any> = {}
    for (const toolConfig of tools) {
      try {
        const toolName = toolConfig.name

        // Create a custom tool from the configuration
        const schema = JSON.parse(toolConfig.parameters_schema)
        const zodSchema = jsonSchemaToZod(schema)

        // Create the tool directly
        aiTools[toolName] = {
          description: toolConfig.description,
          parameters: zodSchema,
          execute: async (params: any) => {
            // Log tool execution
            console.log(`Agent ${agent.name} executing tool: ${toolName}`, params)

            try {
              // This is a fallback implementation
              return { result: `Executed ${toolName} with params: ${JSON.stringify(params)}` }
            } catch (error) {
              console.error(`Error executing tool ${toolName}:`, error)
              return { error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }
            }
          }
        }
      } catch (error) {
        console.error(`Error setting up tool ${toolConfig.name}:`, error)
      }
    }

    // Make AI SDK call
    const result = streamText({
      model: aiModel,
      messages: messages as CoreMessage[],
      tools: aiTools,
      maxSteps: 5, // Allow multiple tool calls in a single request
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      toolChoice: options?.toolChoice,
      onFinish: options?.onFinish
        ? async (event) => {
          // Adapt the event data to AgentRunFinishData
          const assistantMessage = event.response.messages.find(
            (m): m is CoreMessage & { id: string; role: 'assistant'; toolCalls?: Array<{ toolCallId: string; toolName: string; args: any; }>; } => m.role === 'assistant'
          );

          if (assistantMessage) {
            // Extract text content from CoreMessage content parts
            let content = "";
            if (Array.isArray(assistantMessage.content)) {
              content = assistantMessage.content
                .filter(part => part.type === 'text')
                .map(part => (part as { type: 'text'; text: string; }).text)
                .join('');
            } else if (typeof assistantMessage.content === 'string') {
              content = assistantMessage.content;
            }

            const finishData: AgentRunFinishData = {
              message: {
                id: assistantMessage.id || uuidv4(), // Ensure id is present
                role: 'assistant',
                content: content,
                toolInvocations: assistantMessage.toolCalls?.map(tc => ({
                  toolCallId: tc.toolCallId,
                  toolName: tc.toolName,
                  args: tc.args,
                })),
                createdAt: new Date(),
              },
              usage: event.usage,
              finishReason: event.finishReason === 'unknown' ? undefined : (event.finishReason as AgentRunFinishReason),
            };
            await options.onFinish!(finishData);
          }
        }
        : undefined,
      providerOptions: options?.traceId ? { traceId: { value: options.traceId } } : undefined, // Optional, as per integration notes above
    })

    // streamOutput handling
    const streamOutput = options?.streamOutput ?? false;

    if (streamOutput) {
      // Caller is responsible for consuming the stream.
      // If message saving and state updates are needed, caller should use onFinish or similar.
      return {
        streamResult: result, // The raw StreamTextResult object
        memoryThreadId: threadId,
      };
    } else {
      // Original behavior: resolve text, save messages and state.
      const responseText = await result.text;
      await saveMessage(threadId, "assistant", responseText);

      // Update agent state (agentState was loaded earlier)
      const newState = {
        ...agentState, // agentState was loaded around line 83
        lastRun: new Date().toISOString(),
        runCount: (agentState?.runCount || 0) + 1,
      };
      await saveAgentState(threadId, agentId, newState);

      // TODO: Consider Langfuse logEvent if traceId is in options

      return {
        output: responseText,
        streamResult: result,
        memoryThreadId: threadId,
      };
    }
  } catch (error) {
    console.error(`Error running agent ${agentId}:`, error)
    throw error
  }
}

/**
 * List all available agents
 *
 * @returns Array of Agent objects
 */
export async function listAgents(): Promise<Agent[]> {
  try {
    if (shouldUseUpstash()) {
      // Use Upstash adapter
      const supabaseClient = createSupabaseClient();
      const agents = await supabaseClient.from("agents").getAll();
      return agents as unknown as Agent[];
    } else {
      // Use regular Supabase
      const agents = await getData("agents", {});
      return agents as unknown as Agent[];
    }
  } catch (error) {
    console.error("Error listing agents:", error);
    throw error;
  }
}

/**
 * Get agent by ID
 *
 * @param agentId - Agent ID
 * @returns Agent object or null if not found
 */
export async function getAgent(agentId: string): Promise<Agent | null> {
  try {
    if (shouldUseUpstash()) {
      // Use Upstash adapter
      const supabaseClient = createSupabaseClient();
      const agent = await supabaseClient.from("agents").getById(agentId);
      return agent as unknown as Agent | null;
    } else {
      // Use regular Supabase
      const agent = await getItemById("agents", agentId);
      return agent as unknown as Agent | null;
    }
  } catch (error) {
    console.error(`Error getting agent ${agentId}:`, error);
    throw error;
  }
}
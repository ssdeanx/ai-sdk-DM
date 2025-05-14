import { NextResponse } from "next/server";
import { createDataStreamResponse } from 'ai';
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { v4 as uuidv4 } from "uuid";
import { agentRegistry } from "@/lib/agents/registry";
import { runAgent } from "@/lib/agents/agent-service";
import { AgentRunOptions } from "@/lib/agents/agent.types";
import { personaManager } from "@/lib/agents/personas/persona-manager";
import { createMemoryThread, saveMessage, loadMessages, loadAgentState, saveAgentState } from "@/lib/memory/memory";
import { getSupabaseClient, isSupabaseClient, isUpstashClient } from "@/lib/memory/supabase";

/**
 * POST /api/ai-sdk/agents/[id]/run
 *
 * Run an agent with the AI SDK
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      input,
      threadId: providedThreadId,
      stream = true,
      temperature,
      maxTokens,
      systemPrompt,
      toolChoice
    } = body;

    // Generate thread ID if not provided
    const threadId = providedThreadId || uuidv4();

    // Health check: ensure Supabase/Upstash is available
    const supabaseHealth = await (async () => {
      try {
        const supabase = getSupabaseClient();
        if (isSupabaseClient(supabase)) {
          const { error } = await supabase.from('agents').select('id').limit(1);
          return !error;
        } else if (isUpstashClient(supabase)) {
          // Upstash: try a simple getAll
          await supabase.from('agents').limit(1).getAll();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    })();
    if (!supabaseHealth) {
      return NextResponse.json({ error: "Supabase/Upstash is not available" }, { status: 503 });
    }

    // Initialize agent registry
    await agentRegistry.init();

    // Get agent config using agentRegistry (loads from Upstash/Supabase as needed)
    const agent = await agentRegistry.getAgent(id);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Optionally, get persona if present (uses personaManager)
    let persona = null;
    // BaseAgent does not expose persona_id directly, but its config does.
    // @ts-expect-error: Accessing private property for persona_id
    const personaId = agent.config?.persona_id;
    if (personaId) {
      await personaManager.init();
      persona = await personaManager.getPersonaById(personaId);
    }

    // Create a memory thread if it doesn't exist
    let threadExists = false;
    try {
      const messages = await loadMessages(threadId);
      threadExists = messages && messages.length > 0;
    } catch {
      threadExists = false;
    }
    if (!threadExists) {
      await createMemoryThread(`Thread for agent ${id}`);
    }

    // Save user message if input is provided
    if (input) {
      await saveMessage(
        threadId,
        "user",
        input,
        {
          count_tokens: true,
          generate_embeddings: false,
          metadata: {},
          model_name: agent.modelId
        }
      );
    }

    // Load previous messages
    const previousMessages = await loadMessages(threadId);

    // Load agent state
    // (agentState is not used directly, but triggers any stateful logic)
    await loadAgentState(threadId, id);

    // Create trace for this run
    const trace = await createTrace({
      name: "agent_run",
      userId: threadId,
      metadata: {
        agentId: id,
        agentName: agent.name,
        threadId,
        modelId: agent.modelId,
        messageCount: previousMessages.length + (input ? 1 : 0),
        hasPersona: !!persona
      }
    });

    // Run options with onFinish to persist assistant message
    const options: AgentRunOptions = {
      temperature,
      maxTokens,
      systemPrompt,
      toolChoice,
      traceId: trace!.id,
      streamOutput: stream,
      onFinish: async (data) => {
        // Save assistant message to memory after completion
        if (data?.message?.content) {
          await saveMessage(
            threadId,
            "assistant",
            data.message.content,
            {
              count_tokens: true,
              generate_embeddings: false,
              metadata: {},
              model_name: agent.modelId
            }
          );
        }
        // Save agent state if needed
        if (data?.message) {
          await saveAgentState(threadId, id, { lastRun: new Date().toISOString() });
        }
        // Log event
        await logEvent({
          traceId: trace!.id,
          name: "agent_run_finish",
          metadata: {
            agentId: id,
            threadId,
            finishReason: data?.finishReason
          }
        });
      }
    };

    // Run the agent (Upstash/Supabase logic handled in runAgent)
    const response = await runAgent(id, threadId, input, options);

    // Use streamResult if available
    if (response.streamResult) {
      return response.streamResult.toDataStreamResponse({
        headers: {
          'x-thread-id': threadId,
          'x-agent-id': id
        }
      });
    } else {
      // Fallback: use createDataStreamResponse with execute function
      return createDataStreamResponse({
        execute: async (dataStream) => {
          // send only JSON-safe fields
          const { output, memoryThreadId } = response;
          dataStream.writeData({
            status: 'completed',
            output: output ?? null,
            memoryThreadId
          });
        }
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

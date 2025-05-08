import { NextResponse } from "next/server";
import { StreamingTextResponse } from 'ai';
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { v4 as uuidv4 } from "uuid";
import { agentRegistry } from "@/lib/agents/registry";
import { runAgent } from "@/lib/agents/agent-service";
import { personaManager } from "@/lib/agents/personas/persona-manager";
import { createMemoryThread, saveMessage, loadMessages } from "@/lib/memory/memory";

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

    // Initialize agent registry
    await agentRegistry.init();

    // Get agent from registry
    const agent = await agentRegistry.getAgent(id);
    
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Initialize persona manager if agent has a persona
    if (agent.config.persona_id) {
      await personaManager.init();
    }

    // Create trace for this run
    const trace = await createTrace({
      name: "agent_run",
      userId: threadId,
      metadata: {
        agentId: id,
        agentName: agent.config.name,
        threadId,
        modelId: agent.config.model_id,
        messageCount: input ? 1 : 0,
        hasPersona: !!agent.config.persona_id
      }
    });

    // Run options
    const options = {
      temperature: temperature,
      maxTokens: maxTokens,
      systemPrompt: systemPrompt,
      toolChoice: toolChoice,
      traceId: trace?.id
    };

    // Run the agent
    const response = await runAgent(id, threadId, input, options);

    // Return the stream as a streaming text response
    return new StreamingTextResponse(response, {
      headers: {
        'x-thread-id': threadId,
        'x-agent-id': id
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

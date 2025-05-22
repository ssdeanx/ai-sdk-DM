import { NextResponse } from 'next/server';
import { createDataStreamResponse, generateId } from 'ai';
import { handleApiError } from '@/lib/api-error-handler';
import { createTrace, logEvent } from '@/lib/langfuse-integration';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { agentRegistry } from '@/lib/agents/registry';
import { runAgent } from '@/lib/agents/agent-service';
import {
  AgentRunOptions,
  AgentRunOptionsSchema,
} from '@/lib/agents/agent.types';
import { personaManager } from '@/lib/agents/personas/persona-manager';
import {
  createMemoryThread,
  saveMessage,
  loadMessages,
  loadAgentState,
  saveAgentState,
} from '@/lib/memory/memory';

/**
 * POST /api/ai-sdk/agents/[id]/run
 *
 * Run an agent with the AI SDK. Validates input using canonical Zod schema.
 * @param request - The Next.js request object
 * @param params - Route params (must include agent id)
 * @returns {Promise<NextResponse>} Streamed or JSON agent run result
 * @throws 400 if input is invalid, 404 if agent not found, 503 if memory unavailable
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate input using canonical AgentRunOptionsSchema
    const inputResult = AgentRunOptionsSchema.safeParse(body);
    if (!inputResult.success) {
      await upstashLogger.error(
        'agents',
        'Invalid agent run input',
        inputResult.error,
        { agentId: id }
      );
      return NextResponse.json(
        { error: 'Invalid input', details: inputResult.error.format() },
        { status: 400 }
      );
    }
    // Extract input and threadId from the original body, as AgentRunOptionsSchema does not include them
    const input = body.input;
    const providedThreadId = body.threadId;
    // Map streamOutput to stream for backward compatibility
    const stream = inputResult.data.streamOutput ?? true;
    const { temperature, maxTokens, systemPrompt, toolChoice } =
      inputResult.data;

    // Generate thread ID if not provided
    const threadId: string = providedThreadId || generateId();

    // Log agent run start
    await upstashLogger.info('agents', 'Agent run started', {
      agentId: id,
      threadId,
      input: typeof input === 'string' ? input.slice(0, 100) : undefined,
    });

    // Initialize agent registry
    await agentRegistry.init();

    // Get agent config using agentRegistry (loads from Upstash/Supabase as needed)
    const agent = await agentRegistry.getAgent(id);
    if (!agent) {
      await upstashLogger.error(
        'agents',
        'Agent not found',
        {},
        { agentId: id }
      );
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
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
      threadExists = Array.isArray(messages) && messages.length > 0;
    } catch {
      threadExists = false;
    }
    if (!threadExists) {
      await createMemoryThread(`Thread for agent ${id}`);
    }

    // Save user message if input is provided
    if (input) {
      await saveMessage(threadId, 'user', input, {
        count_tokens: true,
        generate_embeddings: false,
        metadata: {},
        model_name: agent.modelId,
      });
    }

    // Load previous messages
    const previousMessages = await loadMessages(threadId);

    // Load agent state
    await loadAgentState(threadId, id);

    // Create trace for this run
    const trace = await createTrace({
      name: 'agent_run',
      userId: threadId,
      metadata: {
        agentId: id,
        agentName: agent.name,
        threadId,
        modelId: agent.modelId,
        messageCount: previousMessages.length + (input ? 1 : 0),
        hasPersona: !!persona,
      },
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
          await saveMessage(threadId, 'assistant', data.message.content, {
            count_tokens: true,
            generate_embeddings: false,
            metadata: {},
            model_name: agent.modelId,
          });
        }
        // Save agent state: only known fields
        if (data?.message) {
          await saveAgentState(threadId, id, {
            memory_thread_id: threadId,
            agent_id: id,
            state_data: JSON.stringify({ lastRun: new Date().toISOString() }),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        // Log event
        await logEvent({
          traceId: trace!.id,
          name: 'agent_run_finish',
          metadata: {
            agentId: id,
            threadId,
            finishReason: data?.finishReason,
          },
        });
      },
    };

    // Run the agent (Upstash/Supabase logic handled in runAgent)
    const response = await runAgent(id, threadId, input, options);

    // Log agent run completion
    await upstashLogger.info('agents', 'Agent run completed', {
      agentId: id,
      threadId,
      output: response?.output
        ? String(response.output).slice(0, 100)
        : undefined,
    });

    // Use streamResult if available
    if (response.streamResult) {
      return response.streamResult.toDataStreamResponse({
        headers: {
          'x-thread-id': threadId,
          'x-agent-id': id,
        },
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
            memoryThreadId,
          });
        },
      });
    }
  } catch (error) {
    await upstashLogger.error(
      'agents',
      'Agent run error',
      error instanceof Error ? error : new Error(String(error)),
      { agentId: params?.id }
    );
    return handleApiError(error);
  }
}

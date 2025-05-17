import { NextResponse } from 'next/server';
import { streamGoogleAI, generateGoogleAI } from '@/lib/google-ai';
import { getSupabaseClient } from '@/lib/memory/supabase';
import { getLibSQLClient } from '@/lib/memory/libsql';
import { handleApiError } from '@/lib/api-error-handler';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const {
      message,
      threadId: providedThreadId,
      stream = true,
    } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Generate a thread ID if not provided
    const threadId = providedThreadId || crypto.randomUUID();

    // Get agent configuration from Supabase
    const supabase = getSupabaseClient();
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*, models(*)')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      console.error('Error fetching agent:', agentError);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get agent's tools
    const { data: agentTools, error: toolsError } = await supabase
      .from('agent_tools')
      .select('tools(*)')
      .eq('agent_id', id);

    if (toolsError) {
      console.error('Error fetching agent tools:', toolsError);
    }

    // Format tools for AI SDK
    const tools = {};
    if (agentTools && agentTools.length > 0) {
      for (const { tools: tool } of agentTools) {
        if (tool && tool.name && tool.parameters_schema) {
          tools[tool.name] = {
            description: tool.description,
            parameters: JSON.parse(tool.parameters_schema),
          };
        }
      }
    }

    // Get conversation history from LibSQL
    const db = getLibSQLClient();
    const messagesResult = await db.execute({
      sql: `
        SELECT role, content, created_at
        FROM messages
        WHERE thread_id = ?
        ORDER BY created_at ASC
      `,
      args: [threadId],
    });

    // Format messages for AI SDK
    const messages = messagesResult.rows.map((row) => ({
      role: row.role,
      content: row.content,
    }));

    // Add system message if not present
    if (!messages.some((m) => m.role === 'system')) {
      const systemPrompt =
        agent.system_prompt ||
        `You are ${agent.name}, an AI assistant. ${agent.description || ''}`;

      messages.unshift({
        role: 'system',
        content: systemPrompt,
      });

      // Store system message in LibSQL
      await db.execute({
        sql: `
          INSERT INTO messages (thread_id, role, content, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `,
        args: [threadId, 'system', systemPrompt],
      });
    }

    // Add user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Store user message in LibSQL
    await db.execute({
      sql: `
        INSERT INTO messages (thread_id, role, content, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `,
      args: [threadId, 'user', message],
    });

    if (stream) {
      // Stream the response
      const result = await streamGoogleAI({
        modelId: agent.models.model_id,
        messages,
        temperature: agent.temperature || 0.7,
        maxTokens: agent.max_tokens,
        tools,
        apiKey: agent.models.api_key,
        baseURL: agent.models.base_url,
      });

      // Store the assistant's response in LibSQL when complete
      result.text.then(async (text) => {
        await db.execute({
          sql: `
            INSERT INTO messages (thread_id, role, content, created_at)
            VALUES (?, ?, ?, datetime('now'))
          `,
          args: [threadId, 'assistant', text],
        });
      });

      return result.toDataStreamResponse({
        threadId,
        agentId: id,
      });
    } else {
      // Generate non-streaming response
      const result = await generateGoogleAI({
        modelId: agent.models.model_id,
        messages,
        temperature: agent.temperature || 0.7,
        maxTokens: agent.max_tokens,
        tools,
        apiKey: agent.models.api_key,
        baseURL: agent.models.base_url,
      });

      // Store the assistant's response in LibSQL
      await db.execute({
        sql: `
          INSERT INTO messages (thread_id, role, content, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `,
        args: [threadId, 'assistant', result.text],
      });

      return NextResponse.json({
        threadId,
        agentId: id,
        response: result.text,
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

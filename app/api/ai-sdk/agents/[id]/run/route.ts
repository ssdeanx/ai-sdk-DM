import { NextResponse } from "next/server";
import { StreamingTextResponse } from '@ai-sdk/core';
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { v4 as uuidv4 } from "uuid";
import { getAllBuiltInTools, loadCustomTools } from "@/lib/tools";
import { streamWithAISDK } from "@/lib/ai-sdk-integration";
import { jsonSchemaToZod } from "@/lib/tools";
import * as toolExecutors from "@/lib/tools/tool-execution";
import { z } from "zod";

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
    const { input, threadId = uuidv4(), stream = true } = body;

    const db = getLibSQLClient();

    // Get agent with model
    const agentResult = await db.execute({
      sql: `
        SELECT
          a.*,
          m.id as model_id, m.name as model_name, m.provider as model_provider,
          m.model_id as model_identifier, m.api_key, m.base_url
        FROM agents a
        JOIN models m ON a.model_id = m.id
        WHERE a.id = ?
      `,
      args: [id]
    });

    if (agentResult.rows.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agent = agentResult.rows[0];

    // Get tools for this agent
    const toolsResult = await db.execute({
      sql: `
        SELECT t.*
        FROM tools t
        JOIN agent_tools at ON t.id = at.tool_id
        WHERE at.agent_id = ?
      `,
      args: [id]
    });

    // Create or get thread
    let existingThread = false;

    const threadResult = await db.execute({
      sql: `SELECT id FROM memory_threads WHERE id = ?`,
      args: [threadId]
    });

    if (threadResult.rows.length === 0) {
      // Create new thread
      await db.execute({
        sql: `
          INSERT INTO memory_threads (id, name, metadata, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `,
        args: [threadId, `Agent: ${agent.name}`, JSON.stringify({ agentId: id, source: 'ai-sdk-ui' })]
      });
    } else {
      existingThread = true;
    }

    // Get previous messages if thread exists
    let messages = [];

    if (existingThread) {
      const messagesResult = await db.execute({
        sql: `
          SELECT * FROM messages
          WHERE memory_thread_id = ?
          ORDER BY created_at ASC
        `,
        args: [threadId]
      });

      messages = messagesResult.rows.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }));
    }

    // Add system message if not already present
    if (messages.length === 0 || messages[0].role !== 'system') {
      messages.unshift({
        role: 'system',
        content: agent.system_prompt || `You are ${agent.name}, a helpful AI assistant.`
      });
    }

    // Add user message
    if (input) {
      messages.push({
        role: 'user',
        content: input
      });

      // Save user message to database
      await db.execute({
        sql: `
          INSERT INTO messages (id, memory_thread_id, role, content, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `,
        args: [uuidv4(), threadId, 'user', input]
      });
    }

    // Create trace for this run
    const trace = await createTrace({
      name: "agent_run",
      userId: threadId,
      metadata: {
        agentId: id,
        agentName: agent.name,
        threadId,
        modelId: agent.model_id,
        modelName: agent.model_name,
        provider: agent.model_provider,
        messageCount: messages.length
      }
    });

    // Prepare tools
    const builtInTools = getAllBuiltInTools();
    const customTools = await loadCustomTools();
    const allTools = { ...builtInTools, ...customTools };

    // Format tools for AI SDK
    const toolConfigs = {};

    for (const tool of toolsResult.rows) {
      const toolName = tool.name;

      // Check if tool exists in built-in or custom tools
      if (allTools[toolName]) {
        // Use the tool from the registry
        toolConfigs[toolName] = allTools[toolName];
      } else if (tool.parameters_schema) {
        // Create a tool from the schema
        try {
          const schema = JSON.parse(tool.parameters_schema);
          const zodSchema = jsonSchemaToZod(schema);

          toolConfigs[toolName] = {
            description: tool.description,
            parameters: zodSchema,
            execute: async (params: any) => {
              // Log tool execution
              await logEvent({
                traceId: trace?.id,
                name: "tool_execution",
                metadata: {
                  toolName,
                  params,
                  timestamp: new Date().toISOString()
                }
              });

              // Execute the tool
              return await toolExecutors.executeTool(toolName, params);
            }
          };
        } catch (error) {
          console.error(`Error creating tool ${toolName}:`, error);
        }
      }
    }

    // Use the AI SDK integration module for streaming
    const response = await streamWithAISDK({
      provider: agent.model_provider.toLowerCase() as any,
      modelId: agent.model_identifier,
      messages,
      temperature: 0.7,
      maxTokens: 2048,
      tools: toolConfigs,
      apiKey: agent.api_key,
      baseURL: agent.base_url,
      traceName: "agent_run_stream",
      userId: threadId,
      metadata: {
        parentTraceId: trace?.id,
        agentId: id,
        threadId
      }
    });

    // Save the assistant's response to memory after streaming
    response.then(async (result) => {
      try {
        const assistantMessage = result.response.text();

        // Save to LibSQL
        await db.execute({
          sql: `
            INSERT INTO messages (id, memory_thread_id, role, content, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
          `,
          args: [uuidv4(), threadId, 'assistant', assistantMessage]
        });

        // Log the assistant message event
        if (trace?.id) {
          await logEvent({
            traceId: trace.id,
            name: "assistant_message",
            metadata: {
              role: "assistant",
              content: assistantMessage,
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (error) {
        console.error('Error saving assistant message:', error);
      }
    }).catch(error => {
      console.error('Error processing assistant response:', error);
    });

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

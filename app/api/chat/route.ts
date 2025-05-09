/**
 * Handles the POST request for chat interactions, supporting both AI SDK UI and regular chat requests.
 * 
 * @param {Request} request - The incoming HTTP request containing chat parameters
 * @returns {Promise<NextResponse>} A response with chat completion or error details
 * 
 * @description
 * This route handler manages two types of chat request flows:
 * 1. AI SDK UI requests (identified by specific headers)
 * 2. Regular chat requests with messages, model configuration, and optional parameters
 * 
 * Key features:
 * - Validates request content and required parameters
 * - Retrieves model configuration from Supabase
 * - Supports dynamic model selection and configuration
 * - Handles potential errors in model retrieval
 */
import { NextResponse } from "next/server";
// Remove StreamingTextResponse, import streamText and CoreMessage
import { streamText, type CoreMessage } from 'ai';
import { streamGoogleAIWithTracing } from "@/lib/ai-sdk-tracing";
import { getSupabaseClient } from "@/lib/memory/supabase";
import { getLibSQLClient } from "@/lib/memory/libsql";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { getGoogleAI } from "@/lib/ai"; // getGoogleAI from lib/ai.ts returns a LanguageModelProvider
import type { Database } from '@/types/supabase'

export async function POST(request: Request) {
  try {
    // Check if the request is from AI SDK UI
    const contentType = request.headers.get('content-type') || '';
    const isAiSdkRequest = contentType.includes('application/json') &&
      request.headers.get('x-ai-sdk') === 'true';

    const body = await request.json();

    // Handle AI SDK UI requests
    if (isAiSdkRequest || body.api === '/api/chat') {
      return handleAiSdkRequest(body);
    }

    // Handle regular chat requests
    const {
      messages,
      modelId,
      threadId,
      temperature = 0.7,
      maxTokens,
      tools = [],
      attachments = []
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    // Get model configuration from Supabase
    const supabase = getSupabaseClient();
    const { data: modelConfig, error: modelError } = await supabase
      .from<{ id: string; model_id: string; name: string; provider?: string; api_key?: string; base_url?: string }>("models")
      .select("*")
      .eq("id", modelId || process.env.DEFAULT_MODEL_ID)
      .single();
    if (modelError || !modelConfig) {
      console.error("Error fetching model:", modelError);
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Get tool configurations if tools are specified
    const toolConfigs: Record<string, any> = {};
    if (tools && tools.length > 0) {
      const { data: toolData, error: toolError } = await supabase.from("tools").select("*").in("id", tools);

      if (!toolError && toolData) {
        for (const tool of toolData) {
          try {
            toolConfigs[tool.name] = {
              description: tool.description,
              parameters: typeof tool.parameters_schema === 'string'
                ? JSON.parse(tool.parameters_schema)
                : tool.parameters_schema || {},
            };
          } catch (e) {
            console.error(`Error parsing tool schema for ${tool.name}:`, e);
          }
        }
      }
    }

    const processedMessages: CoreMessage[] = messages.map((msg: any) => ({
      role: msg.role === 'model' ? 'assistant' : msg.role, // Ensure 'model' maps to 'assistant'
      content: msg.content,
      // tool_calls and tool_responses would go here if applicable
    }));

    if (attachments && attachments.length > 0 && processedMessages.length > 0) {
      const lastMessage = processedMessages[processedMessages.length - 1];
      if (lastMessage.role === 'user' && typeof lastMessage.content === 'string') {
        const attachmentDescriptions = attachments
          .map((att: { type: string; name: string }) => `[${att.type === 'image' ? 'Image' : 'File'}: ${att.name}]`)
          .join('\n');
        lastMessage.content = `${lastMessage.content}\n\n${attachmentDescriptions}`;
      }
    }

    if (threadId) {
      const db = getLibSQLClient();
      const userMessage = processedMessages.find((m) => m.role === "user");
      if (userMessage && typeof userMessage.content === 'string') {
        await db.execute({
          sql: `
            INSERT INTO messages (thread_id, role, content, created_at)
            VALUES (?, ?, ?, datetime('now'))
          `,
          args: [threadId, "user", userMessage.content],
        });
      }
    }

    const trace = await createTrace({
      name: "chat_interaction",
      userId: threadId || undefined,
      metadata: {
        modelId: modelConfig.model_id,
        modelName: modelConfig.name,
        provider: modelConfig.provider || "google",
        messageCount: processedMessages.length,
        hasTools: Object.keys(toolConfigs).length > 0,
        threadId: threadId || undefined
      }
    });

    if (trace?.id) {
      const userMessageContent = processedMessages.find(m => m.role === "user")?.content;
      await logEvent({
        traceId: trace.id,
        name: "user_message",
        metadata: {
          role: "user",
          content: typeof userMessageContent === 'string' ? userMessageContent : JSON.stringify(userMessageContent),
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await streamGoogleAIWithTracing({
      modelId: modelConfig.model_id,
      messages: processedMessages,
      temperature,
      maxTokens,
      tools: Object.keys(toolConfigs).length > 0 ? toolConfigs : undefined,
      apiKey: modelConfig.api_key || process.env.GOOGLE_API_KEY,
      baseURL: modelConfig.base_url,
      traceName: "chat_completion",
      userId: threadId || undefined,
      metadata: {
        parentTraceId: trace?.id,
        threadId: threadId || undefined
      }
    });

    if (threadId) {
      result.text.then(async (text) => {
        try {
          const db = getLibSQLClient();
          await db.execute({
            sql: `
              INSERT INTO messages (thread_id, role, content, created_at)
              VALUES (?, ?, ?, datetime('now'))
            `,
            args: [threadId, "assistant", text],
          });

          if (trace?.id) {
            await logEvent({
              traceId: trace.id,
              name: "assistant_message",
              metadata: {
                role: "assistant",
                content: text,
                timestamp: new Date().toISOString(),
                threadId
              }
            });
          }
        } catch (error) {
          console.error("Error storing assistant message:", error);
        }
      }).catch(error => {
        console.error("Error processing assistant response:", error);
        if (trace?.id) {
          logEvent({
            traceId: trace.id,
            name: "assistant_message_error",
            metadata: {
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString()
            }
          }).catch(console.error);
        }
      });
    }

    // Use toDataStreamResponse if you plan to send structured data,
    // or toTextStreamResponse for simple text.
    // Given the main flow uses streamGoogleAIWithTracing which likely returns a StreamTextResult compatible object,
    // and that it might be using data streams, toDataStreamResponse is safer.
    // If streamGoogleAIWithTracing is guaranteed to only produce text streams, toTextStreamResponse() is also fine.
    return result.toDataStreamResponse();
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Handle requests from the AI SDK UI (Simplified flow)
 */
async function handleAiSdkRequest(body: any) {
  try {
    const { messages, model = 'gemini-1.5-pro', temperature = 0.7, maxTokens = 2048 } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    // Get the Google AI provider factory from lib/ai.ts
    const googleAIProvider = getGoogleAI();
    // Get the specific model instance from the provider
    const googleModel = googleAIProvider(model); // e.g., googleAIProvider('gemini-1.5-pro')

    // Format messages to CoreMessage[]
    const formattedMessages: CoreMessage[] = messages.map((message: any) => ({
      role: message.role === 'user' ? 'user' : 'assistant', // Map 'model' or other to 'assistant'
      content: message.content,
    }));

    // Generate response using streamText
    const result = await streamText({
      model: googleModel,
      messages: formattedMessages,
      temperature,
      maxTokens,
      // generationConfig: { // This is specific to older Google SDK, use top-level params for streamText
      //   temperature,
      //   maxOutputTokens: maxTokens,
      // },
    });

    // Return the stream using toTextStreamResponse()
    return result.toTextStreamResponse();

  } catch (error) {
    console.error('Error in AI SDK chat handler:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Ensure a Response object is returned for errors too
    return NextResponse.json(
      { error: 'Failed to generate response', details: errorMessage },
      { status: 500 }
    );
  }
}

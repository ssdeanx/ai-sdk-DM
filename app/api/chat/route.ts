import { NextResponse } from "next/server"
import { StreamingTextResponse } from '@ai-sdk/core'
import { GoogleAIStream } from '@ai-sdk/google'
import { streamGoogleAI } from "@/lib/google-ai"
import { streamGoogleAIWithTracing } from "@/lib/ai-sdk-tracing"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { getLibSQLClient } from "@/lib/memory/libsql"
import { handleApiError } from "@/lib/api-error-handler"
import { createTrace, logEvent } from "@/lib/langfuse-integration"
import { getGoogleAI } from "@/lib/ai"

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
    } = body

    if (!messages || !messages.length) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 })
    }

    // Get model configuration from Supabase
    const supabase = getSupabaseClient()
    const { data: model, error: modelError } = await supabase
      .from("models")
      .select("*")
      .eq("id", modelId || process.env.DEFAULT_MODEL_ID)
      .single()

    if (modelError || !model) {
      console.error("Error fetching model:", modelError)
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    // Get tool configurations if tools are specified
    const toolConfigs = {}
    if (tools && tools.length > 0) {
      const { data: toolData, error: toolError } = await supabase.from("tools").select("*").in("id", tools)

      if (!toolError && toolData) {
        for (const tool of toolData) {
          try {
            toolConfigs[tool.name] = {
              description: tool.description,
              parameters: typeof tool.parameters_schema === 'string'
                ? JSON.parse(tool.parameters_schema)
                : tool.parameters_schema || {},
            }
          } catch (e) {
            console.error(`Error parsing tool schema for ${tool.name}:`, e)
            // Continue with other tools even if one fails
          }
        }
      }
    }

    // Process messages to include attachments if any
    const processedMessages = [...messages]

    // If the last message has attachments, modify it to include them
    if (attachments && attachments.length > 0 && processedMessages.length > 0) {
      const lastMessage = processedMessages[processedMessages.length - 1]
      if (lastMessage.role === 'user') {
        // Add attachment information to the message content
        const attachmentDescriptions = attachments
          .map(att => `[${att.type === 'image' ? 'Image' : 'File'}: ${att.name}]`)
          .join('\n')

        lastMessage.content = `${lastMessage.content}\n\n${attachmentDescriptions}`
      }
    }

    // Store messages in LibSQL if threadId is provided
    if (threadId) {
      const db = getLibSQLClient()

      // Store the latest user message
      const userMessage = processedMessages.find((m) => m.role === "user")
      if (userMessage) {
        await db.execute({
          sql: `
            INSERT INTO messages (thread_id, role, content, created_at)
            VALUES (?, ?, ?, datetime('now'))
          `,
          args: [threadId, "user", userMessage.content],
        })
      }
    }

    // Create a trace for this chat interaction
    const trace = await createTrace({
      name: "chat_interaction",
      userId: threadId || undefined,
      metadata: {
        modelId: model.model_id,
        modelName: model.name,
        provider: model.provider || "google",
        messageCount: processedMessages.length,
        hasTools: Object.keys(toolConfigs).length > 0,
        threadId: threadId || undefined
      }
    })

    // Log the user message event
    if (trace?.id) {
      await logEvent({
        traceId: trace.id,
        name: "user_message",
        metadata: {
          role: "user",
          content: processedMessages.find(m => m.role === "user")?.content || "",
          timestamp: new Date().toISOString()
        }
      })
    }

    // Stream the response using Google AI with tracing
    const result = await streamGoogleAIWithTracing({
      modelId: model.model_id,
      messages: processedMessages,
      temperature,
      maxTokens,
      tools: toolConfigs,
      apiKey: model.api_key || process.env.GOOGLE_API_KEY,
      baseURL: model.base_url,
      traceName: "chat_completion",
      userId: threadId || undefined,
      metadata: {
        parentTraceId: trace?.id,
        threadId: threadId || undefined
      }
    })

    // Store the assistant's response in LibSQL when complete and log to Langfuse
    if (threadId) {
      result.text.then(async (text) => {
        try {
          const db = getLibSQLClient()
          await db.execute({
            sql: `
              INSERT INTO messages (thread_id, role, content, created_at)
              VALUES (?, ?, ?, datetime('now'))
            `,
            args: [threadId, "assistant", text],
          })

          // Log the assistant response event
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
            })
          }
        } catch (error) {
          console.error("Error storing assistant message:", error)
          // Don't throw here as we still want to return the response
        }
      }).catch(error => {
        console.error("Error processing assistant response:", error)

        // Log error event
        if (trace?.id) {
          logEvent({
            traceId: trace.id,
            name: "assistant_message_error",
            metadata: {
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString()
            }
          }).catch(console.error)
        }
      })
    }

    return result.toDataStreamResponse()
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * Handle requests from the AI SDK UI
 */
async function handleAiSdkRequest(body: any) {
  try {
    const { messages, model = 'gemini-1.5-pro', temperature = 0.7, maxTokens = 2048 } = body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    // Get the Google AI client
    const googleAI = getGoogleAI();
    const googleModel = googleAI(model);

    // Format messages for Google AI
    const formattedMessages = messages.map((message: any) => ({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.content }],
    }));

    // Generate response
    const response = await googleModel.generateContentStream({
      contents: formattedMessages,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    // Create a stream from the Google AI response
    const stream = GoogleAIStream(response);

    // Return the stream as a streaming text response
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error in AI SDK chat handler:', error);
    return NextResponse.json(
      { error: 'Failed to generate response', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

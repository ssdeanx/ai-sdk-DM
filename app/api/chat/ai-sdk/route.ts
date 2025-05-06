import { NextResponse } from "next/server";
import { StreamingTextResponse } from '@ai-sdk/core';
import { GoogleAIStream } from '@ai-sdk/google';
import { getGoogleAI } from "@/lib/ai";
import { getLibSQLClient } from "@/lib/memory/db";
import { memory } from "@/lib/memory/factory";
import { createMemoryThread, saveMessage, loadMessages } from "@/lib/memory/memory";
import { streamGoogleAIWithTracing } from "@/lib/ai-sdk-tracing";
import { v4 as uuidv4 } from "uuid";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { getModelConfig } from "@/lib/openai-ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      messages,
      threadId,
      model = 'gemini-1.5-pro',
      temperature = 0.7,
      maxTokens = 2048,
      tools = [],
      attachments = []
    } = body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    // Get or create thread ID
    const chatThreadId = threadId || uuidv4();

    // Check if thread exists, if not create it
    if (!threadId) {
      try {
        // Use the memory module to create a new thread
        await createMemoryThread('AI SDK Chat', {
          metadata: {
            source: 'ai-sdk-ui',
            created_at: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Error creating memory thread:', error);
        // Fall back to memory factory
        await memory.createMemoryThread('AI SDK Chat', {
          metadata: { source: 'ai-sdk-ui' }
        });
      }
    }

    // Save user message to memory
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      try {
        // Use the memory module to save the message with token counting and metadata
        await saveMessage(
          chatThreadId,
          'user',
          lastMessage.content,
          {
            count_tokens: true,
            metadata: {
              source: 'ai-sdk-ui',
              timestamp: new Date().toISOString()
            }
          }
        );
      } catch (error) {
        console.error('Error saving message:', error);
        // Fall back to memory factory
        await memory.saveMessage(chatThreadId, 'user', lastMessage.content);
      }
    }

    // Try to get model configuration from Supabase
    let modelConfig;
    try {
      modelConfig = await getModelConfig(model);
    } catch (error) {
      console.warn('Could not fetch model config from Supabase, using default:', error);
      // Use default model configuration
      modelConfig = {
        model_id: model,
        provider: 'google',
        api_key: process.env.GOOGLE_API_KEY,
      };
    }

    // Create a trace for this chat interaction
    const trace = await createTrace({
      name: "ai_sdk_chat_interaction",
      userId: chatThreadId,
      metadata: {
        model: modelConfig.model_id,
        provider: modelConfig.provider || 'google',
        temperature,
        maxTokens,
        messageCount: messages.length,
        hasTools: tools.length > 0,
        threadId: chatThreadId
      }
    });

    // Log the user message event
    if (trace?.id) {
      await logEvent({
        traceId: trace.id,
        name: "user_message",
        metadata: {
          role: "user",
          content: lastMessage.role === 'user' ? lastMessage.content : '',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Format tools for AI SDK
    const toolConfigs = {};
    if (tools && tools.length > 0) {
      tools.forEach((tool: any) => {
        toolConfigs[tool.name] = {
          description: tool.description,
          parameters: tool.parameters
        };
      });
    }

    // Use the AI SDK tracing module for enhanced observability
    const response = await streamGoogleAIWithTracing({
      modelId: modelConfig.model_id,
      messages: messages,
      temperature,
      maxTokens,
      tools: toolConfigs,
      apiKey: modelConfig.api_key,
      baseURL: modelConfig.base_url,
      traceName: "ai_sdk_chat_stream",
      userId: chatThreadId,
      metadata: {
        parentTraceId: trace?.id,
        threadId: chatThreadId,
        source: 'ai-sdk-ui'
      }
    });

    // Create a stream from the Google AI response
    const stream = response;

    // Save the assistant's response to memory after streaming
    response.then(async (result) => {
      try {
        const assistantMessage = result.response.text();

        // Use the memory module to save the assistant message with token counting and metadata
        await saveMessage(
          chatThreadId,
          'assistant',
          assistantMessage,
          {
            count_tokens: true,
            generate_embeddings: true, // Generate embeddings for semantic search
            metadata: {
              source: 'ai-sdk-ui',
              timestamp: new Date().toISOString(),
              model: modelConfig.model_id,
              provider: modelConfig.provider
            }
          }
        );

        // Log the assistant message event
        if (trace?.id) {
          await logEvent({
            traceId: trace.id,
            name: "assistant_message",
            metadata: {
              role: "assistant",
              content: assistantMessage,
              timestamp: new Date().toISOString(),
              model: modelConfig.model_id,
              provider: modelConfig.provider
            }
          });
        }
      } catch (error) {
        console.error('Error saving assistant message:', error);
        // Fall back to memory factory
        try {
          await memory.saveMessage(chatThreadId, 'assistant', result.response.text(), {
            metadata: {
              source: 'ai-sdk-ui',
              timestamp: new Date().toISOString()
            }
          });
        } catch (memoryError) {
          console.error('Error saving assistant message to memory factory:', memoryError);
        }
      }
    }).catch(error => {
      console.error('Error processing assistant response:', error);
    });

    // Return the stream as a streaming text response
    return new StreamingTextResponse(stream, {
      headers: {
        'x-thread-id': chatThreadId
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { StreamingTextResponse, createDataStreamResponse } from '@ai-sdk/core';
import { streamWithAISDK, getAllAISDKTools } from "@/lib/ai-sdk-integration";
import { getLibSQLClient } from "@/lib/memory/db";
import { memory } from "@/lib/memory/factory";
import { createMemoryThread, saveMessage, loadMessages } from "@/lib/memory/memory";
import { v4 as uuidv4 } from "uuid";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { getModelConfig } from "@/lib/openai-ai";
import { generateId } from "ai";

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
      attachments = [],
      images = [],
      provider,
      systemPrompt,
      streamProtocol = 'data',
      toolChoice = 'auto',
      maxSteps = 5
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
        provider: provider || 'google',
        api_key: provider === 'openai'
          ? process.env.OPENAI_API_KEY
          : provider === 'anthropic'
            ? process.env.ANTHROPIC_API_KEY
            : process.env.GOOGLE_API_KEY,
      };
    }

    // Determine provider from model config or model name
    const modelProvider = modelConfig.provider || provider ||
      (model.startsWith('gpt') ? 'openai' :
       model.startsWith('claude') ? 'anthropic' : 'google');

    // Create a trace for this chat interaction
    const trace = await createTrace({
      name: "ai_sdk_chat_interaction",
      userId: chatThreadId,
      metadata: {
        model: modelConfig.model_id,
        provider: modelProvider,
        temperature,
        maxTokens,
        messageCount: messages.length,
        hasTools: tools.length > 0,
        hasImages: images.length > 0,
        hasAttachments: attachments.length > 0,
        threadId: chatThreadId,
        systemPrompt: systemPrompt ? true : false,
        toolChoice,
        maxSteps
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
    let toolConfigs = {};

    // Load built-in tools if needed
    if (tools && tools.length > 0) {
      // Get all available tools
      const allTools = await getAllAISDKTools({
        includeBuiltIn: true,
        includeCustom: true,
        includeAgentic: true
      });

      // Add requested tools to the config
      toolConfigs = tools.reduce((acc: Record<string, any>, tool: any) => {
        if (typeof tool === 'string') {
          // If tool is a string, look it up in allTools
          if (allTools[tool]) {
            acc[tool] = allTools[tool];
          }
        } else if (tool.type === 'function') {
          // If tool is a function definition
          acc[tool.function.name] = {
            description: tool.function.description,
            parameters: tool.function.parameters
          };
        }
        return acc;
      }, {});
    }

    // Get model settings
    const modelSettings = {
      max_tokens: modelConfig.max_tokens || 4096,
      context_window: modelConfig.context_window || 8192,
      supports_vision: modelConfig.supports_vision ||
        model.includes('vision') ||
        model.includes('gemini') ||
        model.includes('claude-3') ||
        model.includes('gpt-4') ||
        false,
      supports_functions: modelConfig.supports_functions || true,
      supports_streaming: modelConfig.supports_streaming || true,
      default_temperature: modelConfig.default_temperature || 0.7,
      default_top_p: modelConfig.default_top_p || 1.0,
      default_frequency_penalty: modelConfig.default_frequency_penalty || 0,
      default_presence_penalty: modelConfig.default_presence_penalty || 0,
    };

    // Validate and adjust maxTokens if needed
    const effectiveMaxTokens = maxTokens && maxTokens > 0
      ? Math.min(maxTokens, modelSettings.max_tokens)
      : modelSettings.max_tokens;

    // Process multimodal content
    const processedMessages = [...messages];

    // Add system prompt if provided and not already in messages
    if (systemPrompt && !messages.some(msg => msg.role === 'system')) {
      processedMessages.unshift({ role: 'system', content: systemPrompt });
    }

    // Process images if any
    if (images && images.length > 0 && modelSettings.supports_vision) {
      // Find the last user message to attach images to
      const lastUserMessageIndex = processedMessages.findIndex(
        msg => msg.role === 'user'
      );

      if (lastUserMessageIndex !== -1) {
        const lastUserMessage = processedMessages[lastUserMessageIndex];
        // Convert to multimodal format if needed
        if (typeof lastUserMessage.content === 'string') {
          processedMessages[lastUserMessageIndex] = {
            role: 'user',
            content: [
              { type: 'text', text: lastUserMessage.content },
              ...images.map((img: any) => ({
                type: 'image',
                image: img.url || img.data || img
              }))
            ]
          };
        }
      }
    }

    // Use the AI SDK integration for enhanced capabilities
    const streamOptions = {
      provider: modelProvider as "google" | "openai" | "anthropic",
      modelId: modelConfig.model_id,
      messages: processedMessages,
      temperature: temperature || modelSettings.default_temperature,
      maxTokens: effectiveMaxTokens,
      tools: Object.keys(toolConfigs).length > 0 ? toolConfigs : undefined,
      apiKey: modelConfig.api_key,
      baseURL: modelConfig.base_url,
      traceName: "ai_sdk_chat_stream",
      userId: chatThreadId,
      metadata: {
        parentTraceId: trace?.id,
        threadId: chatThreadId,
        source: 'ai-sdk-ui',
        modelSettings
      }
    };

    // Use Data Stream Protocol for enhanced features
    if (streamProtocol === 'data') {
      return createDataStreamResponse({
        execute: async (dataStream) => {
          // Send initial status
          dataStream.writeData({ status: 'initialized', threadId: chatThreadId });

          try {
            // Stream with AI SDK
            const result = await streamWithAISDK(streamOptions);

            // Merge the stream into the data stream
            result.mergeIntoDataStream(dataStream);

            // Handle completion
            result.then(async (completedResult) => {
              try {
                const assistantMessage = completedResult.response.text();

                // Save the assistant message
                const messageId = await saveMessage(
                  chatThreadId,
                  'assistant',
                  assistantMessage,
                  {
                    count_tokens: true,
                    generate_embeddings: true,
                    metadata: {
                      source: 'ai-sdk-ui',
                      timestamp: new Date().toISOString(),
                      model: modelConfig.model_id,
                      provider: modelProvider,
                      toolCalls: completedResult.toolCalls?.length > 0 ? completedResult.toolCalls : undefined
                    }
                  }
                );

                // Add message annotation with the saved ID
                dataStream.writeMessageAnnotation({
                  id: messageId,
                  threadId: chatThreadId,
                  createdAt: new Date().toISOString()
                });

                // Add call completion annotation
                dataStream.writeData({
                  status: 'completed',
                  threadId: chatThreadId,
                  messageId
                });

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
                      provider: modelProvider,
                      hasToolCalls: completedResult.toolCalls?.length > 0
                    }
                  });
                }
              } catch (error) {
                console.error('Error saving assistant message:', error);
                dataStream.writeData({
                  status: 'error',
                  error: 'Failed to save assistant message',
                  threadId: chatThreadId
                });
              }
            }).catch(error => {
              console.error('Error processing assistant response:', error);
              dataStream.writeData({
                status: 'error',
                error: 'Failed to process assistant response',
                threadId: chatThreadId
              });
            });
          } catch (error) {
            console.error('Error streaming AI response:', error);
            dataStream.writeData({
              status: 'error',
              error: 'Failed to stream AI response',
              threadId: chatThreadId
            });
          }
        }
      });
    } else {
      // Use Text Stream Protocol (simpler)
      const response = await streamWithAISDK(streamOptions);

      // Save the assistant's response to memory after streaming
      response.then(async (result) => {
        try {
          const assistantMessage = result.response.text();

          // Save the assistant message
          await saveMessage(
            chatThreadId,
            'assistant',
            assistantMessage,
            {
              count_tokens: true,
              generate_embeddings: true,
              metadata: {
                source: 'ai-sdk-ui',
                timestamp: new Date().toISOString(),
                model: modelConfig.model_id,
                provider: modelProvider,
                toolCalls: result.toolCalls?.length > 0 ? result.toolCalls : undefined
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
                provider: modelProvider,
                hasToolCalls: result.toolCalls?.length > 0
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
          'x-thread-id': chatThreadId
        }
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

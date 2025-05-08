/**
 * AI SDK Chat API Route
 * 
 * This route handles chat requests using the AI SDK integration.
 * It supports multiple providers (Google, OpenAI, Anthropic) and
 * includes features like tool execution, middleware, and tracing.
 */

import { NextResponse } from "next/server";
import { generateId } from 'ai';
import { streamWithAISDK, getAllAISDKTools } from "@/lib/ai-sdk-integration";
import { memory } from "@/lib/memory/factory";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { getModelConfig, getAgentConfig } from "@/lib/memory/supabase";
import { createCompleteMiddleware } from "@/lib/middleware";
import { personaManager } from "@/lib/agents/personas/persona-manager";
import { agentManager } from "@/lib/agents/agent-manager";
import { toolRegistry } from "@/lib/tools/toolRegistry";
import { agentRegistry } from "@/lib/agents/registry";
import { DataStreamWriter } from "ai";

/**
 * POST /api/ai-sdk/chat
 * 
 * Process a chat request using the AI SDK
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      messages,
      threadId,
      model = 'gemini-2.0-flash',
      temperature = 0.7,
      maxTokens = 2048,
      tools = [],
      attachments = [],
      images = [],
      provider = 'google',
      systemPrompt,
      streamProtocol = 'data',
      toolChoice = 'auto',
      maxSteps = 5,
      middleware = {}
    } = body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    // Generate thread ID if not provided
    const chatThreadId = threadId || generateId();

    // Create trace for observability
    const trace = await createTrace({
      name: "ai_sdk_chat",
      userId: chatThreadId,
      metadata: {
        threadId: chatThreadId,
        model,
        temperature,
        maxTokens,
        toolCount: tools.length,
        messageCount: messages.length,
        hasAttachments: attachments.length > 0,
        hasImages: images.length > 0
      }
    });

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

    // Get model settings
    const modelSettings = modelConfig.settings || {
      default_temperature: 0.7,
      default_max_tokens: 2048,
      supports_tools: true,
      supports_images: modelProvider === 'google' || (modelProvider === 'openai' && model.includes('vision')),
      supports_system_prompt: true,
      context_window: 1000000,
      model_id: modelConfig.model_id || model,
      api_key: modelConfig.api_key || process.env[`${modelProvider.toUpperCase()}_API_KEY`],
    };

    // Process messages and handle attachments/images
    let processedMessages = [...messages];

    // Add system prompt if provided
    let personaId = null;
    let personaSystemPrompt = null;

    if (systemPrompt) {
      // Add system prompt to the beginning of messages
      processedMessages.unshift({
        role: 'system',
        content: systemPrompt
      });
    } else {
      // Try to get persona from the first message metadata
      const firstMessage = messages[0];
      if (firstMessage?.metadata?.personaId) {
        personaId = firstMessage.metadata.personaId;
        try {
          const persona = await personaManager.getPersona(personaId);
          if (persona?.systemPromptTemplate) {
            personaSystemPrompt = persona.systemPromptTemplate;
            processedMessages.unshift({
              role: 'system',
              content: personaSystemPrompt
            });
          }
        } catch (error) {
          console.warn(`Could not load persona ${personaId}:`, error);
        }
      }
    }

    // Process images if supported
    if (images && images.length > 0 && modelSettings.supports_images) {
      // Add images to the last user message
      const lastUserMessageIndex = processedMessages.findIndex(m => m.role === 'user');
      if (lastUserMessageIndex !== -1) {
        const lastUserMessage = processedMessages[lastUserMessageIndex];
        processedMessages[lastUserMessageIndex] = {
          ...lastUserMessage,
          content: [
            { type: 'text', text: lastUserMessage.content },
            ...images.map((image: string) => ({
              type: 'image',
              image: Buffer.from(image.split(',')[1], 'base64')
            }))
          ]
        };
      }
    }

    // Get effective max tokens
    const effectiveMaxTokens = maxTokens || modelSettings.default_max_tokens;

    // Process tools
    let toolConfigs = {};
    if (tools && tools.length > 0 && modelSettings.supports_tools) {
      try {
        // Get all available tools
        const allTools: { [key: string]: any } = await getAllAISDKTools();
        
        // Filter tools based on provided tool IDs or names
        toolConfigs = tools.reduce((acc: Record<string, any>, tool: string) => {
          if (allTools[tool]) {
            acc[tool] = allTools[tool];
          }
          return acc;
        }, {});
      } catch (error) {
        console.error('Error loading tools:', error);
      }
    }

    // Create middleware
    const middlewareConfig = createCompleteMiddleware({
      ...middleware,
      languageModel: {
        ...middleware.languageModel,
        caching: {
          enabled: true,
          ttl: 1000 * 60 * 60, // 1 hour
          ...middleware.languageModel?.caching
        },
        logging: {
          enabled: true,
          ...middleware.languageModel?.logging
        }
      },
      requestResponse: {
        ...middleware.requestResponse,
        errorHandling: {
          enabled: true,
          retryOnRateLimit: true,
          maxRetries: 3,
          ...middleware.requestResponse?.errorHandling
        }
      }
    });

    // Use the AI SDK integration for enhanced capabilities
    const streamOptions = {
      provider: modelProvider as "google" | "openai" | "anthropic",
      modelId: modelSettings.model_id,
      messages: processedMessages,
      temperature: temperature || modelSettings.default_temperature,
      maxTokens: effectiveMaxTokens,
      contextWindow: modelSettings.context_window,
      tools: Object.keys(toolConfigs).length > 0 ? toolConfigs : undefined,
      apiKey: modelSettings.api_key,
      baseURL: modelSettings.base_url,
      traceName: "ai_sdk_chat_stream",
      userId: chatThreadId,
      metadata: {
        parentTraceId: trace?.id,
        threadId: chatThreadId,
        source: 'ai-sdk-ui',
        modelSettings,
        personaId: personaId || undefined,
        hasSystemPrompt: !!systemPrompt || !!personaSystemPrompt,
        toolCount: Object.keys(toolConfigs).length,
        messageCount: processedMessages.length,
        hasImages: images && images.length > 0,
        hasAttachments: attachments && attachments.length > 0,
        toolChoice
      },
      middleware: middlewareConfig.languageModel // Pass only the language model middleware
    };

    // Save user message to memory
    const userMessage = messages[messages.length - 1];
    if (userMessage && userMessage.role === 'user') {
      await memory.saveMessage(
        chatThreadId,
        'user',
        typeof userMessage.content === 'string' 
          ? userMessage.content 
          : JSON.stringify(userMessage.content),
        {
          count_tokens: true,
          metadata: {
            ...userMessage.metadata,
            source: 'ai-sdk-ui',
            timestamp: new Date().toISOString()
          }
        }
      );
    }

    // Stream the response
    const result = await streamWithAISDK(streamOptions);

    // Return the appropriate response based on the stream protocol
    if (streamProtocol === 'text') {
      return result.toTextStreamResponse();
    } else {
      return result.toDataStreamResponse({
        onCompletion: async (completion: string) => {
          // Save assistant message to memory
          await memory.saveMessage(
            chatThreadId,
            'assistant',
            completion,
            {
              count_tokens: true,
              generate_embeddings: true,
              metadata: {
                source: 'ai-sdk-ui',
                model: model,
                timestamp: new Date().toISOString()
              }
            }
          );

          // Log completion event
          await logEvent({
            name: "message_completion",
            traceId: trace?.id ?? "",
            metadata: {
              threadId: chatThreadId,
              model,
              completion,
              timestamp: new Date().toISOString()
            }
          });
        }
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { StreamingTextResponse, createDataStreamResponse, generateId, type LanguageModelV1Middleware } from 'ai';
import { streamWithAISDK, getAllAISDKTools, generateWithAISDK } from "@/lib/ai-sdk-integration";
import { memory } from "@/lib/memory/factory";
import { createMemoryThread, saveMessage, loadMessages } from "@/lib/memory/memory";
import { v4 as uuidv4 } from "uuid";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { getModelConfig, getAgentConfig } from "@/lib/memory/supabase";
import { createMiddlewareFromOptions, createRequestResponseMiddlewareFromOptions, createCompleteMiddleware } from "@/lib/middleware";
import { personaManager } from "@/lib/agents/personas/persona-manager";
import { toolRegistry } from "@/lib/tools/toolRegistry";
import { agentRegistry } from "@/lib/agents/registry";
import { RequestMiddleware, ResponseMiddleware } from "@/lib/middleware";


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      messages,
      threadId,
      model = 'models/gemini-2.0-flash',
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
      const allTools: Record<string, any> = await getAllAISDKTools({
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
        } else if (typeof tool === 'object' && tool.name) {
          // Handle tool objects with name property
          acc[tool.name] = {
            description: tool.description || '',
            parameters: tool.parameters || {}
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

    // Configure middleware
    let languageModelMiddleware: LanguageModelV1Middleware[] = [];
    let requestResponseMiddleware: (RequestMiddleware | ResponseMiddleware)[] = [];

    if (middleware) {
      // Handle language model middleware
      if (typeof middleware === 'object') {
        // Check if it's a middleware options object
        if ('caching' in middleware || 'reasoning' in middleware ||
            'simulation' in middleware || 'logging' in middleware ||
            'defaultSettings' in middleware) {
          // It's middleware options
          const middlewareOptions = {
            caching: middleware.caching || { enabled: false },
            reasoning: middleware.reasoning || { enabled: false },
            simulation: middleware.simulation || { enabled: false },
            logging: middleware.logging || { enabled: false },
            defaultSettings: middleware.defaultSettings
          };

          // Create middleware array using our middleware module
          languageModelMiddleware = createMiddlewareFromOptions(middlewareOptions);

          // Log middleware creation
          console.log(`Created ${languageModelMiddleware.length} language model middleware from options`);
        } else if (middleware.languageModel || middleware.request || middleware.response) {
          // It's a structured middleware object with separate types
          if (middleware.languageModel) {
            languageModelMiddleware = Array.isArray(middleware.languageModel)
              ? middleware.languageModel
              : [middleware.languageModel];

            console.log(`Using ${languageModelMiddleware.length} provided language model middleware`);
          }

          // Store request/response middleware for future use
          if (middleware.request || middleware.response) {
            requestResponseMiddleware = [
              ...(Array.isArray(middleware.request) ? middleware.request :
                middleware.request ? [middleware.request] : []),
              ...(Array.isArray(middleware.response) ? middleware.response :
                middleware.response ? [middleware.response] : [])
            ];

            console.log(`Using ${requestResponseMiddleware.length} provided request/response middleware`);
          }
        }
      } else if (Array.isArray(middleware)) {
        // It's an array of middleware
        languageModelMiddleware = middleware;
        console.log(`Using ${languageModelMiddleware.length} middleware from array`);
      }
    }

    // Initialize tool registry if needed
    await toolRegistry.initialize();

    // Check if any persona is specified
    const personaId = body.personaId || body.persona_id;
    let personaSystemPrompt: string | undefined;

    if (personaId) {
      try {
        const persona = await personaManager.getPersona(personaId);
        if (persona && persona.systemPromptTemplate) {
          // Extract system prompt from persona
          personaSystemPrompt = persona.systemPromptTemplate;
          console.log(`Using persona ${persona.name} with system prompt template`);

          // Generate system prompt with context if needed
          try {
            personaSystemPrompt = await personaManager.generateSystemPrompt(personaId, {
              model: modelConfig.model_id,
              provider: modelProvider,
              temperature,
              maxTokens
            });
          } catch (promptError) {
            console.warn(`Error generating system prompt from template:`, promptError);
            // Fall back to template
          }

          // If no system prompt was provided but we have a persona, use it
          if (!systemPrompt && personaSystemPrompt) {
            // Add persona system prompt to the beginning of messages
            processedMessages.unshift({ role: 'system', content: personaSystemPrompt });
          }
        }
      } catch (error) {
        console.warn(`Error loading persona ${personaId}:`, error);
      }
    }

    // Use the AI SDK integration for enhanced capabilities
    const streamOptions = {
      provider: modelProvider as "google" | "openai" | "anthropic",
      modelId: modelConfig.model_id || model,
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
        modelSettings,
        personaId: personaId || undefined,
        hasSystemPrompt: !!systemPrompt || !!personaSystemPrompt,
        toolCount: Object.keys(toolConfigs).length,
        messageCount: processedMessages.length,
        hasImages: images && images.length > 0,
        hasAttachments: attachments && attachments.length > 0,
        toolChoice
      },
      middleware: languageModelMiddleware.length > 0 ? languageModelMiddleware : undefined,
      toolChoice,
      useSearchGrounding: body.useSearchGrounding,
      dynamicRetrievalConfig: body.dynamicRetrievalConfig,
      responseModalities: body.responseModalities,
      cachedContent: body.cachedContent
    };

    // Use Data Stream Protocol for enhanced features
    if (streamProtocol === 'data') {
      return createDataStreamResponse({
        execute: async (dataStream) => {
          // Send initial status
          dataStream.writeData({
            status: 'initialized',
            threadId: chatThreadId,
            timestamp: new Date().toISOString()
          });

          try {
            // Ensure tool registry is initialized
            if (Object.keys(toolConfigs).length > 0) {
              try {
                await toolRegistry.initialize();
                dataStream.writeData({
                  status: 'tools_initialized',
                  toolCount: Object.keys(toolConfigs).length,
                  timestamp: new Date().toISOString()
                });
              } catch (toolError) {
                console.error('Error initializing tool registry:', toolError);
                dataStream.writeData({
                  status: 'tools_initialization_error',
                  error: toolError instanceof Error ? toolError.message : String(toolError),
                  timestamp: new Date().toISOString()
                });
              }
            }

            // Add middleware information to data stream
            if (languageModelMiddleware.length > 0) {
              dataStream.writeData({
                status: 'middleware_applied',
                middlewareCount: languageModelMiddleware.length,
                middlewareTypes: 'language_model_middleware',
                timestamp: new Date().toISOString()
              });
            }

            if (requestResponseMiddleware.length > 0) {
              dataStream.writeData({
                status: 'request_response_middleware_applied',
                middlewareCount: requestResponseMiddleware.length,
                timestamp: new Date().toISOString()
              });
            }

            // Stream with AI SDK
            const result = await streamWithAISDK(streamOptions);

            // Merge the stream into the data stream
            result.mergeIntoDataStream(dataStream);

            // Save the assistant message asynchronously
            const assistantMessageId = generateId();

            // Add message annotation with the ID
            dataStream.writeMessageAnnotation({
              id: assistantMessageId,
              threadId: chatThreadId,
              createdAt: new Date().toISOString()
            });

            // Add call completion annotation
            dataStream.writeData({
              status: 'message_started',
              threadId: chatThreadId,
              messageId: assistantMessageId,
              timestamp: new Date().toISOString()
            });

            // Set up a listener to save the message when the stream completes
            setTimeout(async () => {
              try {
                // Save the message with a placeholder
                // The actual content will be captured by the client
                await saveMessage(
                  chatThreadId,
                  'assistant',
                  '[Response from AI model - saved asynchronously]',
                  {
                    count_tokens: true,
                    generate_embeddings: true, // Enable embeddings for assistant messages
                    metadata: {
                      id: assistantMessageId,
                      source: 'ai-sdk-ui',
                      timestamp: new Date().toISOString(),
                      model: modelConfig.model_id,
                      provider: modelProvider,
                      personaId: personaId || undefined,
                      temperature,
                      maxTokens: effectiveMaxTokens,
                      toolChoice
                    }
                  }
                );

                // Log the assistant message event
                if (trace?.id) {
                  await logEvent({
                    traceId: trace.id,
                    name: "assistant_message_saved",
                    metadata: {
                      role: "assistant",
                      messageId: assistantMessageId,
                      timestamp: new Date().toISOString(),
                      model: modelConfig.model_id,
                      provider: modelProvider,
                      personaId: personaId || undefined
                    }
                  });
                }

                // Add completion annotation
                dataStream.writeData({
                  status: 'message_saved',
                  threadId: chatThreadId,
                  messageId: assistantMessageId,
                  timestamp: new Date().toISOString()
                });
              } catch (error) {
                console.error('Error saving assistant message:', error);
                dataStream.writeData({
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Failed to save assistant message',
                  threadId: chatThreadId,
                  timestamp: new Date().toISOString()
                });
              }
            }, 100);
          } catch (error) {
            console.error('Error streaming AI response:', error);

            // Log the error to trace
            if (trace?.id) {
              await logEvent({
                traceId: trace.id,
                name: "stream_error",
                metadata: {
                  error: error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : undefined,
                  timestamp: new Date().toISOString()
                }
              });
            }

            dataStream.writeData({
              status: 'error',
              error: error instanceof Error ? error.message : 'Failed to stream AI response',
              threadId: chatThreadId,
              timestamp: new Date().toISOString()
            });
          }
        }
      });
    } else {
      // Use Text Stream Protocol (simpler)
      // Add middleware information to response headers
      const headers: Record<string, string> = {
        'x-thread-id': chatThreadId,
        'x-timestamp': new Date().toISOString()
      };

      // Ensure tool registry is initialized if tools are used
      if (Object.keys(toolConfigs).length > 0) {
        try {
          await toolRegistry.initialize();
          headers['x-tools-initialized'] = 'true';
          headers['x-tool-count'] = Object.keys(toolConfigs).length.toString();
        } catch (toolError) {
          console.error('Error initializing tool registry:', toolError);
          headers['x-tools-initialized'] = 'false';
          headers['x-tools-error'] = toolError instanceof Error ? toolError.message : String(toolError);
        }
      }

      if (languageModelMiddleware.length > 0) {
        headers['x-middleware-count'] = languageModelMiddleware.length.toString();
        headers['x-middleware-types'] = 'language_model_middleware';
      }

      if (requestResponseMiddleware.length > 0) {
        headers['x-request-response-middleware-count'] = requestResponseMiddleware.length.toString();
      }

      // Add persona information if available
      if (personaId) {
        headers['x-persona-id'] = personaId;
      }

      try {
        const response = await streamWithAISDK(streamOptions);

        // Set up a listener for when the response is complete
        // This is handled asynchronously to not block the response
        setTimeout(async () => {
          try {
            // We can't directly await the response, so we'll save the message after a delay
            // This is a workaround since we can't easily get the final text from the stream
            const assistantMessageId = generateId();

            // Save a placeholder message that will be updated later if needed
            await saveMessage(
              chatThreadId,
              'assistant',
              '[Response from AI model - saved asynchronously]',
              {
                count_tokens: true,
                generate_embeddings: true, // Enable embeddings for assistant messages
                metadata: {
                  id: assistantMessageId,
                  source: 'ai-sdk-ui',
                  timestamp: new Date().toISOString(),
                  model: modelConfig.model_id,
                  provider: modelProvider,
                  personaId: personaId || undefined,
                  temperature,
                  maxTokens: effectiveMaxTokens,
                  toolChoice
                }
              }
            );

            // Log the assistant message event
            if (trace?.id) {
              await logEvent({
                traceId: trace.id,
                name: "assistant_message_saved",
                metadata: {
                  role: "assistant",
                  messageId: assistantMessageId,
                  timestamp: new Date().toISOString(),
                  model: modelConfig.model_id,
                  provider: modelProvider,
                  personaId: personaId || undefined
                }
              });
            }
          } catch (error) {
            console.error('Error saving assistant message:', error);

            // Log the error to trace
            if (trace?.id) {
              await logEvent({
                traceId: trace.id,
                name: "message_save_error",
                metadata: {
                  error: error instanceof Error ? error.message : String(error),
                  timestamp: new Date().toISOString()
                }
              });
            }
          }
        }, 100);

        // Return the stream as a streaming text response
        return new StreamingTextResponse(response, { headers });
      } catch (error) {
        console.error('Error streaming AI response:', error);

        // Log the error to trace
        if (trace?.id) {
          await logEvent({
            traceId: trace.id,
            name: "stream_error",
            metadata: {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              timestamp: new Date().toISOString()
            }
          });
        }

        // Return error response
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : 'Failed to stream AI response',
            timestamp: new Date().toISOString(),
            threadId: chatThreadId
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    return handleApiError(error);
  }
}

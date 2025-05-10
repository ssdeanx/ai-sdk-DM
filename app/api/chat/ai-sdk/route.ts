import { NextResponse } from "next/server";
/**
 * Checks if a thread exists, and creates a new thread if not.
 *
 * This method is part of the chat thread management process, ensuring
 * that a valid thread ID is available for tracking conversation context.
 * If no thread ID is provided, a new unique thread will be generated.
 *
 * @remarks
 * Used in the AI SDK chat route to manage conversation state and persistence.
 */
import { createDataStreamResponse, generateId, type LanguageModelV1Middleware, type Tool } from 'ai';
import { streamWithAISDK } from "@/lib/ai-sdk-integration";
import { createMemory } from "@/lib/memory/factory";
import { v4 as uuidv4 } from "uuid";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
// Import model config utilities
import { getSupabaseClient } from "@/lib/memory/supabase";
import { createMiddlewareFromOptions, createCompleteMiddleware } from "@/lib/middleware";
import { personaManager } from "@/lib/agents/personas/persona-manager";
import { toolRegistry } from "@/lib/tools/toolRegistry";
import { RequestMiddleware, ResponseMiddleware } from "@/lib/middleware";
import { DataStreamWriter } from "ai";

// Create memory instance
const memory = createMemory();

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

    // Build language model middleware from options
    const { languageModel } = createCompleteMiddleware({ languageModel: middleware });

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
        // Use the memory factory to create a new thread
        await memory.createMemoryThread('AI SDK Chat', {
          metadata: {
            source: 'ai-sdk-ui',
            created_at: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Error creating memory thread:', error);
        throw new Error(`Failed to create memory thread: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Save user message to memory
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      try {
        // Use the memory factory to save the message with token counting and metadata
        await memory.saveMessage(
          chatThreadId,
          'user',
          typeof lastMessage.content === 'string'
            ? lastMessage.content
            : JSON.stringify(lastMessage.content),
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
        throw new Error(`Failed to save user message: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Helper function to save assistant messages
    const saveAssistantMessage = async (
      threadId: string,
      content: string,
      metadata?: Record<string, any>
    ) => {
      return await memory.saveMessage(
        threadId,
        'assistant',
        content,
        {
          count_tokens: true,
          metadata: {
            source: 'ai-sdk-ui',
            timestamp: new Date().toISOString(),
            ...metadata
          }
        }
      );
    };

    // Set up model configuration
    let modelConfig;
    try {
      // Get model configuration from database
      // This is a simplified implementation - in a real app, you would query your database
      // For now, we'll use a mock implementation
      const data = {
        model_id: model,
        provider: provider || 'google',
        api_key: process.env.GOOGLE_API_KEY,
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 8192,
        context_window: 8192,
        supports_vision: model.includes('vision') || model.includes('gemini') || model.includes('claude-3') || model.includes('gpt-4'),
        supports_functions: true,
        supports_streaming: true,
        default_temperature: 0.7,
        default_top_p: 1.0,
        default_frequency_penalty: 0,
        default_presence_penalty: 0,
        base_url: undefined
      };
      const error = null;

      if (error) throw error;

      modelConfig = data;
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
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 8192,
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

    // Ensure tool registry is initialized
    await toolRegistry.initialize();

    // Format tools for AI SDK
    let toolConfigs: Record<string, Tool<any, any>> = {};

    // Process tools requested in the body
    if (body.tools && Array.isArray(body.tools) && body.tools.length > 0) {
      for (const toolRequest of body.tools) {
        if (typeof toolRequest === 'string') {
          // If toolRequest is a string, it's a tool name. Fetch it from the registry.
          const toolInstance = await toolRegistry.getTool(toolRequest);
          if (toolInstance) {
            toolConfigs[toolRequest] = toolInstance;
          } else {
            console.warn(`[Chat API] Tool "${toolRequest}" requested by client but not found in registry.`);
            // Optionally, handle this case more strictly, e.g., by returning an error
            // or by not proceeding if a critical tool is missing.
          }
        } else if (toolRequest && typeof toolRequest === 'object') {
          // If toolRequest is an object, it's an ad-hoc tool definition.
          // For now, these are logged and not made executable on the server-side,
          // as they lack a server-side execute method from the registry.
          // The AI SDK might use these definitions for LLM awareness if passed,
          // but that's a separate concern from backend execution.
          const toolName = toolRequest.function?.name || toolRequest.name;
          if (toolName) {
            console.warn(`[Chat API] Received ad-hoc tool definition for "${toolName}". These are not automatically made executable by the backend. Only named, registered tools are used for server-side execution.`);
          } else {
            console.warn('[Chat API] Received an invalid or unnamed ad-hoc tool definition in the request body.', toolRequest);
          }
        }
      }
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
        // Get persona from persona manager
        // Note: This is a simplified implementation - in a real app, you would use the actual persona manager
        const persona = {
          id: personaId,
          name: 'Default Persona',
          systemPromptTemplate: 'You are a helpful AI assistant.'
        };

        if (persona && persona.systemPromptTemplate) {
          // Extract system prompt from persona
          personaSystemPrompt = persona.systemPromptTemplate;
          console.log(`Using persona ${persona.name} with system prompt template`);

          // In a real implementation, you would generate the system prompt dynamically
          // For now, we'll just use the template
        }

          // If no system prompt was provided but we have a persona, use it
          if (!systemPrompt && personaSystemPrompt) {
            // Add persona system prompt to the beginning of messages
            processedMessages.unshift({ role: 'system', content: personaSystemPrompt });
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
      contextWindow: modelSettings.context_window,
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
      middleware: languageModelMiddleware,
      toolChoice,
      useSearchGrounding: body.useSearchGrounding,
      dynamicRetrievalConfig: body.dynamicRetrievalConfig,
      responseModalities: body.responseModalities,
      cachedContent: body.cachedContent
    };

    // Use Data Stream Protocol for enhanced features
    if (streamProtocol === 'data') {
      return createDataStreamResponse({
        execute: async (dataStream: DataStreamWriter) => {
          // Send initial status
          dataStream.writeData({
            status: 'initialized',
            threadId: chatThreadId,
            timestamp: new Date().toISOString()
          });

          try {
            // Tool registry is already initialized earlier in the POST handler.
            // We just confirm if tools were actually configured to be used for this call.
            if (Object.keys(toolConfigs).length > 0) {
              dataStream.writeData({
                status: 'tools_configured_for_stream', // Renamed for clarity
                toolCount: Object.keys(toolConfigs).length,
                timestamp: new Date().toISOString()
              });
            }

            const result    return handleApiError(error);
  }
}

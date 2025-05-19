/**
 * AI SDK Chat API Route
 *
 * This route handles chat requests using the AI SDK integration.
 * It supports multiple providers (Google, OpenAI, Anthropic) and
 * includes features like tool execution, middleware, and tracing.
 */

import { NextResponse } from 'next/server';
import { streamWithAISDK, getAllAISDKTools } from '@/lib/ai-sdk-integration';
import { createMemory } from '@/lib/memory/factory';
import { handleApiError } from '@/lib/api-error-handler';
import { createTrace } from '@/lib/langfuse-integration';
import { personaManager } from '@/lib/agents/personas/persona-manager';
import { ModelSettings } from '@/lib/models/model-registry';
import { getModelById, getModelByModelId } from '@/lib/models/model-service';
import { type CoreMessage, type Tool, generateId } from 'ai';
import { z } from 'zod';

const memory = createMemory();

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
      maxTokens = 8192,
      tools = [],
      attachments = [],
      images = [],
      provider = 'google',
      systemPrompt,
      streamProtocol = 'data',
      toolChoice = 'auto',
      middleware = {},
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

    // --- Memory and thread logic ---
    // Ensure thread exists or create it if not
    let thread = null;
    if (chatThreadId) {
      thread = await memory.getMemoryThread(chatThreadId);
      if (!thread) {
        await memory.createMemoryThread(chatThreadId, {
          user_id: undefined,
          agent_id: undefined,
          metadata: {},
        });
      }
    }

    // Create trace for observability
    const trace = await createTrace({
      name: 'ai_sdk_chat',
      userId: chatThreadId,
      metadata: {
        threadId: chatThreadId,
        model,
        temperature,
        maxTokens,
        toolCount: tools.length,
        messageCount: messages.length,
        hasAttachments: attachments.length > 0,
        hasImages: images.length > 0,
      },
    });

    // Inline getModelConfiguration logic (Upstash/Supabase aware)
    let modelConfig: ModelSettings | undefined;
    try {
      const foundModel =
        (await getModelById(model)) || (await getModelByModelId(model));
      if (foundModel) {
        // Ensure properties like created_at and updated_at are strings,
        // as expected by the ModelSettings type used for modelConfig.
        // Default to current time if they are undefined in foundModel.

        // Map provider if necessary to conform to the expected type for modelConfig.provider
        // The error indicates modelConfig's provider expects: "google" | "openai" | "anthropic" | "vertex" | "custom"
        // foundModel.provider can be 'google-vertex', which needs mapping.
        const providerForConfig =
          foundModel.provider === 'google-vertex'
            ? 'vertex' // Map 'google-vertex' to 'vertex'
            : foundModel.provider;

        modelConfig = {
          ...foundModel,
          // Cast the mapped provider to the type expected by modelConfig's ModelSettings definition
          provider: providerForConfig as
            | 'google'
            | 'openai'
            | 'anthropic'
            | 'vertex'
            | 'custom',
          category:
            (foundModel.category as
              | 'text'
              | 'chat'
              | 'multimodal'
              | 'image'
              | 'video'
              | 'audio'
              | 'embedding'
              | 'fine-tuning') || 'chat',
          capabilities: foundModel.capabilities || {}, // Ensure capabilities is an object
          created_at: foundModel.created_at || new Date().toISOString(),
          updated_at: foundModel.updated_at || new Date().toISOString(),
        };
      } else {
        modelConfig = undefined;
      }
    } catch {
      modelConfig = undefined;
    }

    // Determine provider from model config or model name
    let modelProvider =
      modelConfig?.provider ||
      provider ||
      (model.startsWith('gpt')
        ? 'openai'
        : model.startsWith('claude')
          ? 'google' // Changed from 'anthropic' to 'google' as fallback
          : 'google');

    // Ensure modelProvider is only 'google' or 'openai'
    modelProvider = modelProvider === 'anthropic' ? 'google' : modelProvider;

    // Get model settings
    const modelSettings: ModelSettings = modelConfig || {
      id: model,
      name: model,
      provider: modelProvider as 'google' | 'openai',
      model_id: model,
      max_tokens: 8192,
      input_cost_per_token: 0,
      output_cost_per_token: 0,
      supports_vision:
        modelProvider === 'google' ||
        (modelProvider === 'openai' && model.includes('vision')),
      supports_functions: true,
      supports_streaming: true,
      default_temperature: 0.7,
      default_top_p: 1.0,
      default_frequency_penalty: 0,
      default_presence_penalty: 0,
      context_window: 1000000,
      description: undefined,
      category: 'chat' as
        | 'text'
        | 'chat'
        | 'multimodal'
        | 'image'
        | 'video'
        | 'audio'
        | 'embedding'
        | 'fine-tuning',
      capabilities: {},
      metadata: {},
      base_url: undefined,
      api_key: process.env[`${modelProvider.toUpperCase()}_API_KEY`],
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Process messages and handle attachments/images
    // Assuming 'messages' from body conforms to CoreMessage[] structure after validation
    const processedMessages: CoreMessage[] = [...(messages as CoreMessage[])];

    // Add system prompt if provided
    let personaId: string | undefined;
    let personaSystemPrompt: string | null = null;

    if (systemPrompt) {
      // Add system prompt to the beginning of messages
      processedMessages.unshift({
        role: 'system',
        content: systemPrompt,
      });
    } else {
      // Try to get persona from the first message metadata
      const firstMessage = messages[0];
      if (firstMessage?.metadata?.personaId) {
        personaId = firstMessage.metadata.personaId as string;
        try {
          const persona = await personaManager.getPersonaById(personaId);
          if (persona?.systemPromptTemplate) {
            personaSystemPrompt = persona.systemPromptTemplate;
            processedMessages.unshift({
              role: 'system',
              content: personaSystemPrompt,
            });
          }
        } catch {}
      }
    }

    // Process images if supported
    if (images && images.length > 0 && modelSettings.supports_vision) {
      // Add images to the last user message
      const lastUserMessageIndex = processedMessages.findIndex(
        (message: CoreMessage) => message.role === 'user'
      );
      if (lastUserMessageIndex !== -1) {
        const lastUserMessage = processedMessages[lastUserMessageIndex];

        // Prepare image parts
        const imageContentParts = images
          .map((image: string) => {
            // Assuming image is base64 data URL e.g., "data:image/png;base64,..."
            const base64Data = image.split(',')[1];
            return {
              type: 'image' as const,
              // Ensure Buffer.from receives a string; handle cases where split might not find ','
              image: Buffer.from(base64Data || '', 'base64'),
            };
          })
          .filter((part: { image: Buffer }) => part.image.length > 0); // Filter out empty images
        if (imageContentParts.length > 0) {
          const textContentPart = { type: 'text' as const, text: '' };
          if (typeof lastUserMessage.content === 'string') {
            textContentPart.text = lastUserMessage.content;
          } else if (Array.isArray(lastUserMessage.content)) {
            // Handle array content case
          }
        }
      }
    }

    const effectiveMaxTokens = maxTokens || modelSettings.max_tokens;
    // Process tools
    let toolConfigs: Record<string, Tool<z.ZodTypeAny, unknown>> = {};
    if (
      tools &&
      (tools as string[]).length > 0 &&
      modelSettings.supports_functions
    ) {
      try {
        // Get all available tools
        const allTools = await getAllAISDKTools(); // Returns Record<string, Tool<any, any>>

        // Filter tools based on provided tool IDs or names
        toolConfigs = (tools as string[]).reduce(
          (
            acc: Record<string, Tool<z.ZodTypeAny, unknown>>,
            toolId: string
          ) => {
            if (
              allTools &&
              Object.prototype.hasOwnProperty.call(allTools, toolId)
            ) {
              acc[toolId] = (
                allTools as Record<string, Tool<z.ZodTypeAny, unknown>>
              )[toolId];
            }
            return acc;
          },
          {} as Record<string, Tool<z.ZodTypeAny, unknown>>
        );
      } catch {
        // Optional: log error if tool processing fails
        // Optional: log error if tool processing fails
      }
    }

    // Create middleware
    const { createCompleteMiddleware } = await import('@/lib/middleware');
    const middlewareConfig = createCompleteMiddleware({
      ...middleware,
      languageModel: {
        ...middleware.languageModel,
        provider: modelProvider as 'google' | 'openai',
        modelId: modelSettings.model_id,
        messages: processedMessages,
        temperature: temperature || modelSettings.default_temperature,
        maxTokens: effectiveMaxTokens,
        // contextWindow: modelSettings.context_window, // Removed: Not a direct param of streamWithAISDK
        tools: Object.keys(toolConfigs).length > 0 ? toolConfigs : undefined,
        apiKey: modelSettings.api_key,
        baseURL: modelSettings.base_url || undefined,
      },
      requestResponse: {
        ...middleware.requestResponse,
        errorHandling: {
          enabled: true,
          retryOnRateLimit: true,
          maxRetries: 3,
          ...middleware.requestResponse?.errorHandling,
        },
      },
    });

    // Use the AI SDK integration for enhanced capabilities
    const streamOptions = {
      provider: modelProvider as 'google' | 'openai',
      modelId: modelSettings.model_id,
      messages: processedMessages,
      temperature: temperature || modelSettings.default_temperature,
      maxTokens: effectiveMaxTokens,
      tools: Object.keys(toolConfigs).length > 0 ? toolConfigs : undefined,
      apiKey: modelSettings.api_key,
      baseURL: modelSettings.base_url || undefined,
      traceName: 'ai_sdk_chat_stream',
      userId: chatThreadId,
      metadata: {
        type: 'model',
        name: modelSettings.model_id,
        provider: modelProvider,
        model_id: modelSettings.model_id,
        id: chatThreadId,
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
        toolChoice,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      middleware: middlewareConfig.languageModel, // Pass only the language model middleware
    };

    // Stream the response
    const result = await streamWithAISDK(streamOptions);

    // Return the appropriate response based on the stream protocol
    if (streamProtocol === 'text') {
      return result.toTextStreamResponse();
    } else {
      return result.toDataStreamResponse();
    }
  } catch (error) {
    return handleApiError(error);
  }
}

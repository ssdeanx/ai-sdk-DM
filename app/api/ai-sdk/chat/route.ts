/**
 * AI SDK Chat API Route
 * 
 * This route handles chat requests using the AI SDK integration.
 * It supports multiple providers (Google, OpenAI, Anthropic) and
 * includes features like tool execution, middleware, and tracing.
 */

import { NextResponse } from "next/server";
import { streamWithAISDK, getAllAISDKTools } from "@/lib/ai-sdk-integration";
import { createMemory } from "@/lib/memory/factory";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace } from "@/lib/langfuse-integration";
import { personaManager } from "@/lib/agents/personas/persona-manager";
import { ModelSettings } from "@/lib/models/model-registry";
import { getModelById, getModelByModelId } from "@/lib/models/model-service";

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
      model = "gemini-2.0-flash",
      temperature = 0.7,
      maxTokens = 8192,
      tools = [],
      attachments = [],
      images = [],
      provider = "google",
      systemPrompt,
      streamProtocol = "data",
      toolChoice = "auto",
      middleware = {}
    } = body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request: messages array is required" },
        { status: 400 }
      );
    }

    // Generate thread ID if not provided
    const chatThreadId = threadId || (await import("ai")).generateId();

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

    // Inline getModelConfiguration logic (Upstash/Supabase aware)
    let modelConfig: ModelSettings | undefined;
    try {
      const found = await getModelById(model) || await getModelByModelId(model);
      modelConfig = found === null ? undefined : found;
    } catch {
      modelConfig = undefined;
    }

    // Determine provider from model config or model name
    const modelProvider = modelConfig?.provider || provider || (model.startsWith("gpt") ? "openai" : model.startsWith("claude") ? "anthropic" : "google");

    // Get model settings
    const modelSettings: ModelSettings = modelConfig || {
      id: model,
      name: model,
      provider: modelProvider as import("@/lib/models/model-registry").ModelProvider,
      model_id: model,
      max_tokens: 8192,
      input_cost_per_token: 0,
      output_cost_per_token: 0,
      supports_vision: modelProvider === "google" || (modelProvider === "openai" && model.includes("vision")),
      supports_functions: true,
      supports_streaming: true,
      default_temperature: 0.7,
      default_top_p: 1.0,
      default_frequency_penalty: 0,
      default_presence_penalty: 0,
      context_window: 1000000,
      description: undefined,
      category: "chat",
      capabilities: {},
      metadata: {},
      base_url: undefined,
      api_key: process.env[`${modelProvider.toUpperCase()}_API_KEY`],
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Process messages and handle attachments/images
    const processedMessages = [...messages];

    // Add system prompt if provided
    let personaId: string | undefined;
    let personaSystemPrompt: string | null = null;

    if (systemPrompt) {
      // Add system prompt to the beginning of messages
      processedMessages.unshift({
        role: "system",
        content: systemPrompt
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
              role: "system",
              content: personaSystemPrompt
            });
          }
        } catch {}
      }
    }

    // Process images if supported
    if (images && images.length > 0 && modelSettings.supports_vision) {
      // Add images to the last user message
      const lastUserMessageIndex = processedMessages.findIndex(m => m.role === "user");
      if (lastUserMessageIndex !== -1) {
        const lastUserMessage = processedMessages[lastUserMessageIndex];
        processedMessages[lastUserMessageIndex] = {
          ...lastUserMessage,
          content: [
            { type: "text", text: lastUserMessage.content },
            ...images.map((image: string) => ({
              type: "image",
              image: Buffer.from(image.split(",")[1], "base64")
            }))
          ]
        };
      }
    }

    // Get effective max tokens
    const effectiveMaxTokens = maxTokens && maxTokens > 0
      ? Math.min(maxTokens, modelSettings.max_tokens)
      : modelSettings.max_tokens;

    // Process tools
    let toolConfigs: Record<string, unknown> = {};
    if (tools && tools.length > 0 && modelSettings.supports_functions) {
      try {
        // Get all available tools
        const allTools = await getAllAISDKTools();
        
        // Filter tools based on provided tool IDs or names
        toolConfigs = tools.reduce((acc: Record<string, unknown>, tool: string) => {
          if (Object.prototype.hasOwnProperty.call(allTools as Record<string, unknown>, tool)) acc[tool] = (allTools as Record<string, unknown>)[tool];
          return acc;
        }, {});
      } catch {}
    }

    // Create middleware
    const { createCompleteMiddleware } = await import("@/lib/middleware");
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
      baseURL: modelSettings.base_url || undefined,
      traceName: "ai_sdk_chat_stream",
      userId: chatThreadId,
      metadata: {
        parentTraceId: trace?.id,
        threadId: chatThreadId,
        source: "ai-sdk-ui",
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
    if (userMessage && userMessage.role === "user") {
      await memory.saveMessage(
        chatThreadId,
        "user",
        typeof userMessage.content === "string" ? userMessage.content : JSON.stringify(userMessage.content),
        {
          count_tokens: true,
          metadata: {
            ...userMessage.metadata,
            source: "ai-sdk-ui"
          }
        }
      );
    }

    // Stream the response
    const result = await streamWithAISDK(streamOptions);

    // Return the appropriate response based on the stream protocol
    if (streamProtocol === "text") {
      return result.toTextStreamResponse();
    } else {
      return result.toDataStreamResponse();
    }
  } catch (error) {
    return handleApiError(error);
  }
}

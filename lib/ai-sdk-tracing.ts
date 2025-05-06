/**
 * AI SDK Tracing Module
 *
 * This module provides enhanced versions of AI SDK functions with comprehensive tracing integration.
 * It wraps the standard AI SDK functions to add tracing capabilities using both Langfuse and OpenTelemetry,
 * allowing for better observability and monitoring of AI interactions.
 */

import { streamText, generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import {
  trace,
  span,
  generation,
  event,
  score,
  prompt,
  dataset,
  evaluationRun,
  userFeedback,
  initializeTracing,
  shutdown
} from "./tracing"
import { SpanKind, SpanStatusCode } from "./otel-tracing"

// Initialize tracing when this module is imported
initializeTracing({
  serviceName: 'ai-sdk-chat',
  serviceVersion: '1.0.0'
})

/**
 * Get an AI provider with tracing based on provider name
 *
 * @param providerName - The name of the provider (google, openai, anthropic)
 * @param apiKey - The API key for the provider
 * @param baseURL - Optional custom base URL for the provider
 * @param traceName - Optional name for the trace
 * @returns The provider instance with tracing
 */
export function getProviderWithTracing(
  providerName: string,
  apiKey?: string,
  baseURL?: string,
  traceName?: string
) {
  switch (providerName.toLowerCase()) {
    case 'google':
      return getGoogleAIWithTracing(apiKey, baseURL, traceName || `google_ai_provider`);
    case 'openai':
      if (!apiKey) {
        throw new Error('API key is required for OpenAI');
      }
      return getOpenAIWithTracing(apiKey, baseURL, traceName || `openai_provider`);
    case 'anthropic':
      if (!apiKey) {
        throw new Error('API key is required for Anthropic');
      }
      return getAnthropicWithTracing(apiKey, baseURL, traceName || `anthropic_provider`);
    default:
      throw new Error(`Unsupported provider: ${providerName}`);
  }
}

/**
 * Stream text with any AI provider and comprehensive tracing
 *
 * @param options - Configuration options
 * @param options.provider - The provider name (google, openai, anthropic)
 * @param options.modelId - The model ID to use
 * @param options.messages - Array of messages for the model
 * @param options.temperature - Optional temperature setting (default: 0.7)
 * @param options.maxTokens - Optional maximum number of tokens to generate
 * @param options.tools - Optional tools configuration
 * @param options.apiKey - API key for the provider
 * @param options.baseURL - Optional custom base URL for the provider
 * @param options.traceName - Optional custom name for the trace
 * @param options.userId - Optional user ID for the trace
 * @param options.metadata - Optional additional metadata for the trace
 * @returns The streaming result from the AI SDK
 */
export async function streamAIWithTracing({
  provider,
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  apiKey,
  baseURL,
  traceName,
  userId,
  metadata,
}: {
  provider: string
  modelId: string
  messages: any[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>
  apiKey?: string
  baseURL?: string
  traceName?: string
  userId?: string
  metadata?: any
}) {
  // Determine which provider-specific function to use
  switch (provider.toLowerCase()) {
    case 'google':
      return streamGoogleAIWithTracing({
        modelId,
        messages,
        temperature,
        maxTokens,
        tools,
        apiKey,
        baseURL,
        traceName,
        userId,
        metadata
      });
    case 'openai':
      if (!apiKey) {
        throw new Error('API key is required for OpenAI');
      }
      return streamOpenAIWithTracing({
        modelId,
        messages,
        temperature,
        maxTokens,
        tools,
        apiKey,
        baseURL,
        traceName,
        userId,
        metadata
      });
    case 'anthropic':
      if (!apiKey) {
        throw new Error('API key is required for Anthropic');
      }
      return streamAnthropicWithTracing({
        modelId,
        messages,
        temperature,
        maxTokens,
        tools,
        apiKey,
        baseURL,
        traceName,
        userId,
        metadata
      });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Generate text with any AI provider and comprehensive tracing
 *
 * @param options - Configuration options
 * @param options.provider - The provider name (google, openai, anthropic)
 * @param options.modelId - The model ID to use
 * @param options.messages - Array of messages for the model
 * @param options.temperature - Optional temperature setting (default: 0.7)
 * @param options.maxTokens - Optional maximum number of tokens to generate
 * @param options.tools - Optional tools configuration
 * @param options.apiKey - API key for the provider
 * @param options.baseURL - Optional custom base URL for the provider
 * @param options.traceName - Optional custom name for the trace
 * @param options.userId - Optional user ID for the trace
 * @param options.metadata - Optional additional metadata for the trace
 * @returns The generation result from the AI SDK
 */
export async function generateAIWithTracing({
  provider,
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  apiKey,
  baseURL,
  traceName,
  userId,
  metadata,
}: {
  provider: string
  modelId: string
  messages: any[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>
  apiKey?: string
  baseURL?: string
  traceName?: string
  userId?: string
  metadata?: any
}) {
  // Determine which provider-specific function to use
  switch (provider.toLowerCase()) {
    case 'google':
      return generateGoogleAIWithTracing({
        modelId,
        messages,
        temperature,
        maxTokens,
        tools,
        apiKey,
        baseURL,
        traceName,
        userId,
        metadata
      });
    case 'openai':
      if (!apiKey) {
        throw new Error('API key is required for OpenAI');
      }
      return generateOpenAIWithTracing({
        modelId,
        messages,
        temperature,
        maxTokens,
        tools,
        apiKey,
        baseURL,
        traceName,
        userId,
        metadata
      });
    case 'anthropic':
      if (!apiKey) {
        throw new Error('API key is required for Anthropic');
      }
      return generateAnthropicWithTracing({
        modelId,
        messages,
        temperature,
        maxTokens,
        tools,
        apiKey,
        baseURL,
        traceName,
        userId,
        metadata
      });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Enhanced version of streamText with Langfuse tracing
 *
 * @param options - Configuration options for streaming text
 * @param options.model - The AI model to use
 * @param options.messages - Optional array of messages for chat models
 * @param options.prompt - Optional prompt string for completion models
 * @param options.temperature - Optional temperature setting for response randomness
 * @param options.maxTokens - Optional maximum number of tokens to generate
 * @param options.topP - Optional top-p sampling parameter
 * @param options.tools - Optional tools configuration
 * @param options.traceName - Optional custom name for the trace
 * @param options.userId - Optional user ID for the trace
 * @param options.metadata - Optional additional metadata for the trace
 * @returns The streaming result from the AI SDK
 */
export async function streamTextWithTracing(options: {
  model: any;
  messages?: any[];
  prompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  tools?: Record<string, any>;
  traceName?: string;
  userId?: string;
  metadata?: any;
  [key: string]: any;
}) {
  const { traceName, userId, metadata, ...streamOptions } = options

  // Create a trace for this operation
  const traceObj = await trace({
    name: traceName || "stream_text",
    userId,
    metadata: {
      ...metadata,
      model: options.model ? String(options.model) : undefined,
      messages: options.messages ? JSON.stringify(options.messages) : undefined,
    }
  })

  const traceId = traceObj?.id
  const startTime = new Date()

  // Create a span for the streaming operation
  const streamSpan = span({
    traceId: traceId || "",
    name: "stream_text_operation",
    metadata: {
      model: options.model ? String(options.model) : "unknown",
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      startTime: startTime.toISOString()
    }
  })

  try {
    // Log the start of the streaming operation
    if (traceId) {
      await event({
        traceId,
        name: "stream_start",
        metadata: {
          timestamp: startTime.toISOString()
        }
      })
    }

    // Call the original streamText function
    const result = await streamText({
      ...streamOptions,
      model: options.model
    })

    // When the stream completes, log the generation
    result.text.then(async (text) => {
      const endTime = new Date()

      if (traceId) {
        await generation({
          traceId,
          name: "stream_completion",
          model: options.model ? String(options.model) : "unknown",
          modelParameters: {
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            topP: options.topP,
          },
          input: options.messages || options.prompt || "",
          output: text,
          startTime,
          endTime,
          metadata: {
            completionTokens: text.length / 4, // Rough estimate
            totalTokens: (JSON.stringify(options.messages || options.prompt || "").length + text.length) / 4,
          }
        })

        // End the span
        await streamSpan.end({
          success: true,
          textLength: text.length,
          durationMs: endTime.getTime() - startTime.getTime()
        })
      }
    }).catch(error => {
      console.error("Error logging stream completion:", error)

      // End the span with error
      streamSpan.end({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    })

    return result
  } catch (error) {
    // Log any errors that occur
    if (traceId) {
      const endTime = new Date()

      await event({
        traceId,
        name: "stream_error",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: endTime.toISOString(),
          duration: endTime.getTime() - startTime.getTime()
        }
      })

      // End the span with error
      streamSpan.end({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: endTime.getTime() - startTime.getTime()
      })
    }

    throw error
  }
}

/**
 * Enhanced version of generateText with Langfuse tracing
 *
 * @param options - Configuration options for generating text
 * @param options.model - The AI model to use
 * @param options.messages - Optional array of messages for chat models
 * @param options.prompt - Optional prompt string for completion models
 * @param options.temperature - Optional temperature setting for response randomness
 * @param options.maxTokens - Optional maximum number of tokens to generate
 * @param options.topP - Optional top-p sampling parameter
 * @param options.tools - Optional tools configuration
 * @param options.traceName - Optional custom name for the trace
 * @param options.userId - Optional user ID for the trace
 * @param options.metadata - Optional additional metadata for the trace
 * @returns The generation result from the AI SDK
 */
export async function generateTextWithTracing(options: {
  model: any;
  messages?: any[];
  prompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  tools?: Record<string, any>;
  traceName?: string;
  userId?: string;
  metadata?: any;
  [key: string]: any;
}) {
  const { traceName, userId, metadata, ...generateOptions } = options

  // Create a trace for this operation
  const traceObj = await trace({
    name: traceName || "generate_text",
    userId,
    metadata: {
      ...metadata,
      model: options.model ? String(options.model) : undefined,
      messages: options.messages ? JSON.stringify(options.messages) : undefined,
    }
  })

  const traceId = traceObj?.id
  const startTime = new Date()

  // Create a span for the generation operation
  const generateSpan = span({
    traceId: traceId || "",
    name: "generate_text_operation",
    metadata: {
      model: options.model ? String(options.model) : "unknown",
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      startTime: startTime.toISOString()
    }
  })

  try {
    // Log the start of the generation operation
    if (traceId) {
      await event({
        traceId,
        name: "generation_start",
        metadata: {
          timestamp: startTime.toISOString()
        }
      })
    }

    // Call the original generateText function
    const result = await generateText({
      ...generateOptions,
      model: options.model
    })

    // Log the completed generation
    const endTime = new Date()

    if (traceId) {
      await generation({
        traceId,
        name: "text_generation",
        model: options.model ? String(options.model) : "unknown",
        modelParameters: {
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          topP: options.topP,
        },
        input: options.messages || options.prompt || "",
        output: result.text,
        startTime,
        endTime,
        metadata: {
          completionTokens: result.text.length / 4, // Rough estimate
          totalTokens: (JSON.stringify(options.messages || options.prompt || "").length + result.text.length) / 4,
        }
      })

      // End the span
      await generateSpan.end({
        success: true,
        textLength: result.text.length,
        durationMs: endTime.getTime() - startTime.getTime()
      })
    }

    return result
  } catch (error) {
    // Log any errors that occur
    if (traceId) {
      const endTime = new Date()

      await event({
        traceId,
        name: "generation_error",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: endTime.toISOString(),
          duration: endTime.getTime() - startTime.getTime()
        }
      })

      // End the span with error
      generateSpan.end({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: endTime.getTime() - startTime.getTime()
      })
    }

    throw error
  }
}

/**
 * Enhanced version of getGoogleAI with comprehensive tracing
 *
 * @param apiKey - Optional Google API key (falls back to environment variable)
 * @param baseURL - Optional custom base URL for the Google AI API
 * @param traceName - Optional name for the trace
 * @returns A Google AI provider instance that can be used to create models
 */
export function getGoogleAIWithTracing(apiKey?: string, baseURL?: string, traceName?: string) {
  // Use the provided API key or fall back to environment variable
  const effectiveApiKey = apiKey || process.env.GOOGLE_API_KEY || "";

  if (!effectiveApiKey) {
    console.warn("No Google API key provided for getGoogleAIWithTracing");
  }

  // Create a trace for the Google AI provider
  trace({
    name: traceName || "google_ai_provider",
    metadata: {
      provider: "google",
      baseURL: baseURL || "default",
      timestamp: new Date().toISOString()
    }
  }).catch(error => {
    console.error("Error creating trace for Google AI provider:", error);
  });

  // Create the Google AI provider
  const googleAI = createGoogleGenerativeAI({
    apiKey: effectiveApiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  return googleAI;
}

/**
 * Enhanced version of getOpenAI with comprehensive tracing
 *
 * @param apiKey - OpenAI API key
 * @param baseURL - Optional custom base URL for the OpenAI API
 * @param traceName - Optional name for the trace
 * @returns An OpenAI provider instance that can be used to create models
 */
export function getOpenAIWithTracing(apiKey?: string, baseURL?: string, traceName?: string) {
  if (!apiKey) {
    apiKey = process.env.OPENAI_API_KEY || "";
    console.warn("No OpenAI API key provided for getOpenAIWithTracing, using environment variable");
  }

  // Create a trace for the OpenAI provider
  trace({
    name: traceName || "openai_provider",
    metadata: {
      provider: "openai",
      baseURL: baseURL || "default",
      timestamp: new Date().toISOString()
    }
  }).catch(error => {
    console.error("Error creating trace for OpenAI provider:", error);
  });

  // Create the OpenAI provider
  const openAI = createOpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  return openAI;
}

/**
 * Enhanced version of getAnthropic with comprehensive tracing
 *
 * @param apiKey - Anthropic API key
 * @param baseURL - Optional custom base URL for the Anthropic API
 * @param traceName - Optional name for the trace
 * @returns An Anthropic provider instance that can be used to create models
 */
export function getAnthropicWithTracing(apiKey?: string, baseURL?: string, traceName?: string) {
  if (!apiKey) {
    apiKey = process.env.ANTHROPIC_API_KEY || "";
    console.warn("No Anthropic API key provided for getAnthropicWithTracing, using environment variable");
  }

  // Create a trace for the Anthropic provider
  trace({
    name: traceName || "anthropic_provider",
    metadata: {
      provider: "anthropic",
      baseURL: baseURL || "default",
      timestamp: new Date().toISOString()
    }
  }).catch(error => {
    console.error("Error creating trace for Anthropic provider:", error);
  });

  // Create the Anthropic provider
  const anthropic = createAnthropic({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  return anthropic;
}

/**
 * Stream text with Google AI and comprehensive tracing
 *
 * @param options - Configuration options
 * @param options.modelId - The Google AI model ID to use
 * @param options.messages - Array of messages for the model
 * @param options.temperature - Optional temperature setting (default: 0.7)
 * @param options.maxTokens - Optional maximum number of tokens to generate
 * @param options.tools - Optional tools configuration
 * @param options.apiKey - Optional Google API key (falls back to environment variable)
 * @param options.baseURL - Optional custom base URL for the Google AI API
 * @param options.traceName - Optional custom name for the trace
 * @param options.userId - Optional user ID for the trace
 * @param options.metadata - Optional additional metadata for the trace
 * @returns The streaming result from the AI SDK
 */
export async function streamGoogleAIWithTracing({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  apiKey,
  baseURL,
  traceName,
  userId,
  metadata,
}: {
  modelId: string
  messages: any[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>
  apiKey?: string
  baseURL?: string
  traceName?: string
  userId?: string
  metadata?: any
}) {
  // Create a trace for this operation
  const traceObj = await trace({
    name: traceName || "google_ai_stream",
    userId,
    metadata: {
      ...metadata,
      modelId,
      provider: "google",
      temperature,
      maxTokens,
      hasTools: Object.keys(tools).length > 0,
      messageCount: messages.length
    }
  });

  const traceId = traceObj?.id;

  // Create a span for the Google AI operation
  const googleAiSpan = span({
    traceId: traceId || "",
    name: "google_ai_stream_operation",
    metadata: {
      modelId,
      temperature,
      maxTokens,
      toolCount: Object.keys(tools).length,
      startTime: new Date().toISOString()
    }
  });

  try {
    // Initialize Google AI
    const googleAI = getGoogleAIWithTracing(apiKey, baseURL, `google_ai_provider_${modelId}`)
    const model = googleAI(modelId)

    // Add event for model initialization
    if (traceId) {
      await event({
        traceId,
        name: "google_ai_model_initialized",
        metadata: {
          modelId,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Stream with tracing
    const result = await streamTextWithTracing({
      model,
      messages,
      temperature,
      maxTokens,
      ...(Object.keys(tools).length > 0 ? { tools } : {}),
      traceName: `${traceName || "google_ai_stream"}_inner`,
      userId,
      metadata: {
        ...metadata,
        modelId,
        provider: "google",
        parentTraceId: traceId
      }
    })

    // End the span successfully
    googleAiSpan.end({
      success: true,
      durationMs: new Date().getTime() - new Date(googleAiSpan.id).getTime()
    });

    return result
  } catch (error) {
    console.error("Error streaming Google AI response with tracing:", error)

    // End the span with error
    googleAiSpan.end({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });

    throw error
  }
}

/**
 * Stream text with OpenAI and comprehensive tracing
 *
 * @param options - Configuration options
 * @param options.modelId - The OpenAI model ID to use
 * @param options.messages - Array of messages for the model
 * @param options.temperature - Optional temperature setting (default: 0.7)
 * @param options.maxTokens - Optional maximum number of tokens to generate
 * @param options.tools - Optional tools configuration
 * @param options.apiKey - OpenAI API key
 * @param options.baseURL - Optional custom base URL for the OpenAI API
 * @param options.traceName - Optional custom name for the trace
 * @param options.userId - Optional user ID for the trace
 * @param options.metadata - Optional additional metadata for the trace
 * @returns The streaming result from the AI SDK
 */
export async function streamOpenAIWithTracing({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  apiKey,
  baseURL,
  traceName,
  userId,
  metadata,
}: {
  modelId: string
  messages: any[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>
  apiKey?: string
  baseURL?: string
  traceName?: string
  userId?: string
  metadata?: any
}) {
  // Create a trace for this operation
  const traceObj = await trace({
    name: traceName || "openai_stream",
    userId,
    metadata: {
      ...metadata,
      modelId,
      provider: "openai",
      temperature,
      maxTokens,
      hasTools: Object.keys(tools).length > 0,
      messageCount: messages.length
    }
  });

  const traceId = traceObj?.id;

  // Create a span for the OpenAI operation
  const openAiSpan = span({
    traceId: traceId || "",
    name: "openai_stream_operation",
    metadata: {
      modelId,
      temperature,
      maxTokens,
      toolCount: Object.keys(tools).length,
      startTime: new Date().toISOString()
    }
  });

  try {
    // Initialize OpenAI
    const openAI = getOpenAIWithTracing(apiKey, baseURL, `openai_provider_${modelId}`)
    const model = openAI(modelId)

    // Add event for model initialization
    if (traceId) {
      await event({
        traceId,
        name: "openai_model_initialized",
        metadata: {
          modelId,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Stream with tracing
    const result = await streamTextWithTracing({
      model,
      messages,
      temperature,
      maxTokens,
      ...(Object.keys(tools).length > 0 ? { tools } : {}),
      traceName: `${traceName || "openai_stream"}_inner`,
      userId,
      metadata: {
        ...metadata,
        modelId,
        provider: "openai",
        parentTraceId: traceId
      }
    })

    // End the span successfully
    openAiSpan.end({
      success: true,
      durationMs: new Date().getTime() - new Date(openAiSpan.id).getTime()
    });

    return result
  } catch (error) {
    console.error("Error streaming OpenAI response with tracing:", error)

    // End the span with error
    openAiSpan.end({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });

    throw error
  }
}

/**
 * Stream text with Anthropic and comprehensive tracing
 *
 * @param options - Configuration options
 * @param options.modelId - The Anthropic model ID to use
 * @param options.messages - Array of messages for the model
 * @param options.temperature - Optional temperature setting (default: 0.7)
 * @param options.maxTokens - Optional maximum number of tokens to generate
 * @param options.tools - Optional tools configuration
 * @param options.apiKey - Anthropic API key
 * @param options.baseURL - Optional custom base URL for the Anthropic API
 * @param options.traceName - Optional custom name for the trace
 * @param options.userId - Optional user ID for the trace
 * @param options.metadata - Optional additional metadata for the trace
 * @returns The streaming result from the AI SDK
 */
export async function streamAnthropicWithTracing({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  apiKey,
  baseURL,
  traceName,
  userId,
  metadata,
}: {
  modelId: string
  messages: any[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>
  apiKey?: string
  baseURL?: string
  traceName?: string
  userId?: string
  metadata?: any
}) {
  // Create a trace for this operation
  const traceObj = await trace({
    name: traceName || "anthropic_stream",
    userId,
    metadata: {
      ...metadata,
      modelId,
      provider: "anthropic",
      temperature,
      maxTokens,
      hasTools: Object.keys(tools).length > 0,
      messageCount: messages.length
    }
  });

  const traceId = traceObj?.id;

  // Create a span for the Anthropic operation
  const anthropicSpan = span({
    traceId: traceId || "",
    name: "anthropic_stream_operation",
    metadata: {
      modelId,
      temperature,
      maxTokens,
      toolCount: Object.keys(tools).length,
      startTime: new Date().toISOString()
    }
  });

  try {
    // Initialize Anthropic
    const anthropic = getAnthropicWithTracing(apiKey, baseURL, `anthropic_provider_${modelId}`)
    const model = anthropic(modelId)

    // Add event for model initialization
    if (traceId) {
      await event({
        traceId,
        name: "anthropic_model_initialized",
        metadata: {
          modelId,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Stream with tracing
    const result = await streamTextWithTracing({
      model,
      messages,
      temperature,
      maxTokens,
      ...(Object.keys(tools).length > 0 ? { tools } : {}),
      traceName: `${traceName || "anthropic_stream"}_inner`,
      userId,
      metadata: {
        ...metadata,
        modelId,
        provider: "anthropic",
        parentTraceId: traceId
      }
    })

    // End the span successfully
    anthropicSpan.end({
      success: true,
      durationMs: new Date().getTime() - new Date(anthropicSpan.id).getTime()
    });

    return result
  } catch (error) {
    console.error("Error streaming Anthropic response with tracing:", error)

    // End the span with error
    anthropicSpan.end({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });

    throw error
  }
}

/**
 * Generate text with Google AI and comprehensive tracing
 *
 * @param options - Configuration options
 * @param options.modelId - The Google AI model ID to use
 * @param options.messages - Array of messages for the model
 * @param options.temperature - Optional temperature setting (default: 0.7)
 * @param options.maxTokens - Optional maximum number of tokens to generate
 * @param options.tools - Optional tools configuration
 * @param options.apiKey - Optional Google API key (falls back to environment variable)
 * @param options.baseURL - Optional custom base URL for the Google AI API
 * @param options.traceName - Optional custom name for the trace
 * @param options.userId - Optional user ID for the trace
 * @param options.metadata - Optional additional metadata for the trace
 * @returns The generation result from the AI SDK
 */
export async function generateGoogleAIWithTracing({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  apiKey,
  baseURL,
  traceName,
  userId,
  metadata,
}: {
  modelId: string
  messages: any[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>
  apiKey?: string
  baseURL?: string
  traceName?: string
  userId?: string
  metadata?: any
}) {
  // Create a trace for this operation
  const traceObj = await trace({
    name: traceName || "google_ai_generate",
    userId,
    metadata: {
      ...metadata,
      modelId,
      provider: "google",
      temperature,
      maxTokens,
      hasTools: Object.keys(tools).length > 0,
      messageCount: messages.length
    }
  });

  const traceId = traceObj?.id;

  // Create a span for the Google AI operation
  const googleAiSpan = span({
    traceId: traceId || "",
    name: "google_ai_generate_operation",
    metadata: {
      modelId,
      temperature,
      maxTokens,
      toolCount: Object.keys(tools).length,
      startTime: new Date().toISOString()
    }
  });

  try {
    // Initialize Google AI
    const googleAI = getGoogleAIWithTracing(apiKey, baseURL, `google_ai_provider_${modelId}`)
    const model = googleAI(modelId)

    // Add event for model initialization
    if (traceId) {
      await event({
        traceId,
        name: "google_ai_model_initialized",
        metadata: {
          modelId,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate with tracing
    const result = await generateTextWithTracing({
      model,
      messages,
      temperature,
      maxTokens,
      ...(Object.keys(tools).length > 0 ? { tools } : {}),
      traceName: `${traceName || "google_ai_generate"}_inner`,
      userId,
      metadata: {
        ...metadata,
        modelId,
        provider: "google",
        parentTraceId: traceId
      }
    })

    // End the span successfully
    googleAiSpan.end({
      success: true,
      durationMs: new Date().getTime() - new Date(googleAiSpan.id).getTime()
    });

    return result
  } catch (error) {
    console.error("Error generating Google AI response with tracing:", error)

    // End the span with error
    googleAiSpan.end({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });

    throw error
  }
}

/**
 * Generate text with OpenAI and comprehensive tracing
 *
 * @param options - Configuration options
 * @param options.modelId - The OpenAI model ID to use
 * @param options.messages - Array of messages for the model
 * @param options.temperature - Optional temperature setting (default: 0.7)
 * @param options.maxTokens - Optional maximum number of tokens to generate
 * @param options.tools - Optional tools configuration
 * @param options.apiKey - OpenAI API key
 * @param options.baseURL - Optional custom base URL for the OpenAI API
 * @param options.traceName - Optional custom name for the trace
 * @param options.userId - Optional user ID for the trace
 * @param options.metadata - Optional additional metadata for the trace
 * @returns The generation result from the AI SDK
 */
export async function generateOpenAIWithTracing({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  apiKey,
  baseURL,
  traceName,
  userId,
  metadata,
}: {
  modelId: string
  messages: any[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>
  apiKey?: string
  baseURL?: string
  traceName?: string
  userId?: string
  metadata?: any
}) {
  // Create a trace for this operation
  const traceObj = await trace({
    name: traceName || "openai_generate",
    userId,
    metadata: {
      ...metadata,
      modelId,
      provider: "openai",
      temperature,
      maxTokens,
      hasTools: Object.keys(tools).length > 0,
      messageCount: messages.length
    }
  });

  const traceId = traceObj?.id;

  // Create a span for the OpenAI operation
  const openAiSpan = span({
    traceId: traceId || "",
    name: "openai_generate_operation",
    metadata: {
      modelId,
      temperature,
      maxTokens,
      toolCount: Object.keys(tools).length,
      startTime: new Date().toISOString()
    }
  });

  try {
    // Initialize OpenAI
    const openAI = getOpenAIWithTracing(apiKey, baseURL, `openai_provider_${modelId}`)
    const model = openAI(modelId)

    // Add event for model initialization
    if (traceId) {
      await event({
        traceId,
        name: "openai_model_initialized",
        metadata: {
          modelId,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate with tracing
    const result = await generateTextWithTracing({
      model,
      messages,
      temperature,
      maxTokens,
      ...(Object.keys(tools).length > 0 ? { tools } : {}),
      traceName: `${traceName || "openai_generate"}_inner`,
      userId,
      metadata: {
        ...metadata,
        modelId,
        provider: "openai",
        parentTraceId: traceId
      }
    })

    // End the span successfully
    openAiSpan.end({
      success: true,
      durationMs: new Date().getTime() - new Date(openAiSpan.id).getTime()
    });

    return result
  } catch (error) {
    console.error("Error generating OpenAI response with tracing:", error)

    // End the span with error
    openAiSpan.end({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });

    throw error
  }
}

/**
 * Generate text with Anthropic and comprehensive tracing
 *
 * @param options - Configuration options
 * @param options.modelId - The Anthropic model ID to use
 * @param options.messages - Array of messages for the model
 * @param options.temperature - Optional temperature setting (default: 0.7)
 * @param options.maxTokens - Optional maximum number of tokens to generate
 * @param options.tools - Optional tools configuration
 * @param options.apiKey - Anthropic API key
 * @param options.baseURL - Optional custom base URL for the Anthropic API
 * @param options.traceName - Optional custom name for the trace
 * @param options.userId - Optional user ID for the trace
 * @param options.metadata - Optional additional metadata for the trace
 * @returns The generation result from the AI SDK
 */
export async function generateAnthropicWithTracing({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  apiKey,
  baseURL,
  traceName,
  userId,
  metadata,
}: {
  modelId: string
  messages: any[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>
  apiKey?: string
  baseURL?: string
  traceName?: string
  userId?: string
  metadata?: any
}) {
  // Create a trace for this operation
  const traceObj = await trace({
    name: traceName || "anthropic_generate",
    userId,
    metadata: {
      ...metadata,
      modelId,
      provider: "anthropic",
      temperature,
      maxTokens,
      hasTools: Object.keys(tools).length > 0,
      messageCount: messages.length
    }
  });

  const traceId = traceObj?.id;

  // Create a span for the Anthropic operation
  const anthropicSpan = span({
    traceId: traceId || "",
    name: "anthropic_generate_operation",
    metadata: {
      modelId,
      temperature,
      maxTokens,
      toolCount: Object.keys(tools).length,
      startTime: new Date().toISOString()
    }
  });

  try {
    // Initialize Anthropic
    const anthropic = getAnthropicWithTracing(apiKey, baseURL, `anthropic_provider_${modelId}`)
    const model = anthropic(modelId)

    // Add event for model initialization
    if (traceId) {
      await event({
        traceId,
        name: "anthropic_model_initialized",
        metadata: {
          modelId,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate with tracing
    const result = await generateTextWithTracing({
      model,
      messages,
      temperature,
      maxTokens,
      ...(Object.keys(tools).length > 0 ? { tools } : {}),
      traceName: `${traceName || "anthropic_generate"}_inner`,
      userId,
      metadata: {
        ...metadata,
        modelId,
        provider: "anthropic",
        parentTraceId: traceId
      }
    })

    // End the span successfully
    anthropicSpan.end({
      success: true,
      durationMs: new Date().getTime() - new Date(anthropicSpan.id).getTime()
    });

    return result
  } catch (error) {
    console.error("Error generating Anthropic response with tracing:", error)

    // End the span with error
    anthropicSpan.end({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });

    throw error
  }
}

/**
 * Evaluate a model generation with a score
 *
 * @param options - Configuration options
 * @param options.traceId - The ID of the trace to score
 * @param options.name - The name of the score (e.g., "relevance", "accuracy")
 * @param options.value - The score value (typically between 0 and 1)
 * @param options.generationId - Optional ID of the specific generation to score
 * @param options.comment - Optional comment explaining the score
 * @returns The created score object or null if there was an error
 */
export async function evaluateGeneration({
  traceId,
  name,
  value,
  generationId,
  comment,
}: {
  traceId: string
  name: string
  value: number
  generationId?: string
  comment?: string
}) {
  return await score({
    traceId,
    name,
    value,
    generationId,
    comment,
  })
}

/**
 * Log a prompt template for versioning and reuse
 *
 * @param options - Configuration options
 * @param options.name - The name of the prompt template
 * @param options.prompt - The prompt template string or object
 * @param options.version - Optional version identifier
 * @param options.tags - Optional tags for categorizing the prompt
 * @returns The created prompt object or null if there was an error
 */
export async function trackPromptTemplate({
  name,
  promptContent,
  version,
  tags,
}: {
  name: string
  promptContent: string | object
  version?: string
  tags?: string[]
}) {
  return await prompt({
    name,
    prompt: promptContent,
    version,
    tags,
  })
}

/**
 * Create a model evaluation dataset
 *
 * @param options - Configuration options
 * @param options.name - The name of the dataset
 * @param options.description - Optional description of the dataset
 * @returns The created dataset ID or null if there was an error
 */
export async function createEvaluationDataset({
  name,
  description,
}: {
  name: string
  description?: string
}) {
  return await dataset({
    name,
    description,
  })
}

/**
 * Run a model evaluation against a dataset
 *
 * @param options - Configuration options
 * @param options.name - The name of the evaluation run
 * @param options.modelId - The ID of the model being evaluated
 * @param options.datasetId - The ID of the dataset used for evaluation
 * @param options.metrics - The evaluation metrics
 * @returns The created evaluation run ID or null if there was an error
 */
export async function runModelEvaluation({
  name,
  modelId,
  datasetId,
  metrics,
}: {
  name: string
  modelId: string
  datasetId: string
  metrics: Record<string, number>
}) {
  return await evaluationRun({
    name,
    modelId,
    datasetId,
    metrics,
  })
}

/**
 * Log user feedback for a generation or trace
 *
 * @param options - Configuration options for the feedback
 * @param options.traceId - The ID of the trace to score
 * @param options.rating - The user rating (typically 1-5 or true/false for thumbs up/down)
 * @param options.generationId - Optional ID of the specific generation to rate
 * @param options.comment - Optional user comment
 * @param options.userId - Optional ID of the user providing feedback
 * @returns The created feedback object or null if there was an error
 */
export async function recordUserFeedback({
  traceId,
  rating,
  generationId,
  comment,
  userId,
}: {
  traceId: string
  rating: number | boolean
  generationId?: string
  comment?: string
  userId?: string
}) {
  return await userFeedback({
    traceId,
    rating,
    generationId,
    comment,
    userId,
  })
}

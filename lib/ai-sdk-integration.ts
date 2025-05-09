/**
 * AI SDK Integration Module
 *
 * This module provides a unified interface for working with the AI SDK,
 * integrating with various AI providers, tools, and tracing systems.
 * It includes support for streaming, generation, and tool execution with
 * comprehensive error handling and graceful fallbacks.
 *
 * @module ai-sdk-integration
 */

import {
  streamText,
  generateText,
  wrapLanguageModel,
  type LanguageModelV1Middleware,
  type StreamTextResult,
  type GenerateTextResult,
  type AIResponse
} from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  streamGoogleAIWithTracing,
  streamOpenAIWithTracing,
  streamAnthropicWithTracing,
  generateGoogleAIWithTracing,
  generateOpenAIWithTracing,
  generateAnthropicWithTracing
} from "./ai-sdk-tracing";
import { createTrace, logEvent } from "./langfuse-integration";
import { getAllBuiltInTools, loadCustomTools } from "./tools";
import { agenticTools } from "./tools/agentic";
import { personaManager } from "./agents/personas/persona-manager";
import { modelRegistry, ModelSettings } from "./models/model-registry";
import { getModelById, getModelByModelId } from "./models/model-service";
import { z } from "zod";

// --- Zod Schemas ---

/**
 * Schema for AI SDK integration options
 */
export const AISDKOptionsSchema = z.object({
  provider: z.enum(['google', 'openai', 'anthropic']),
  modelId: z.string().min(1),
  messages: z.array(z.any()),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().int().positive().optional(),
  tools: z.record(z.any()).optional().default({}),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  traceName: z.string().optional(),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional().default({}),
  middleware: z.union([
    z.custom<LanguageModelV1Middleware>(),
    z.array(z.custom<LanguageModelV1Middleware>())
  ]).optional(),
  useSearchGrounding: z.boolean().optional(),
  dynamicRetrievalConfig: z.object({
    mode: z.enum(['MODE_AUTOMATIC', 'MODE_DYNAMIC', 'MODE_MANUAL']),
    dynamicThreshold: z.number().optional()
  }).optional(),
  responseModalities: z.array(z.enum(['TEXT', 'IMAGE'])).optional(),
  cachedContent: z.string().optional()
});

export type AISDKOptions = z.infer<typeof AISDKOptionsSchema>;

// --- Error Handling ---

/**
 * Error class for AI SDK integration operations
 */
export class AISDKIntegrationError extends Error {
  /**
   * Creates a new AISDKIntegrationError
   *
   * @param message - Error message
   * @param cause - Optional cause of the error
   */
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "AISDKIntegrationError";
    Object.setPrototypeOf(this, AISDKIntegrationError.prototype);
  }
}

// --- Helper Functions ---

/**
 * Gets model configuration with fallback
 *
 * @param modelId - Model ID
 * @returns Model configuration or undefined
 */
async function getModelConfiguration(modelId: string): Promise<ModelSettings | undefined> {
  try {
    // Check registry first
    let model = modelRegistry.getModel(modelId);

    if (!model) {
      // Try to fetch from database
      model = await getModelById(modelId);

      if (!model) {
        // Try to fetch by model_id
        model = await getModelByModelId(modelId);
      }
    }

    return model;
  } catch (error) {
    console.warn(`Error getting model configuration for ${modelId}:`, error);
    return undefined;
  }
}

/**
 * Get all available tools for AI SDK
 *
 * @param options - Configuration options
 * @param options.includeBuiltIn - Whether to include built-in tools
 * @param options.includeCustom - Whether to include custom tools
 * @param options.includeAgentic - Whether to include agentic tools
 * @returns Object containing all available tools
 */
export async function getAllAISDKTools({
  includeBuiltIn = true,
  includeCustom = true,
  includeAgentic = true
}: {
  includeBuiltIn?: boolean
  includeCustom?: boolean
  includeAgentic?: boolean
} = {}) {
  // Get built-in tools
  const builtInTools = includeBuiltIn ? getAllBuiltInTools() : {};

  // Get custom tools
  const customTools = includeCustom ? await loadCustomTools() : {};

  // Get agentic tools
  const agTools = includeAgentic ? agenticTools : {};

  // Combine all tools
  return {
    ...builtInTools,
    ...customTools,
    ...agTools
  };
}

/**
 * Stream text with AI SDK
 *
 * @param options - Configuration options
 * @param options.provider - AI provider (google, openai, anthropic)
 * @param options.modelId - Model ID
 * @param options.messages - Messages to send to the model
 * @param options.temperature - Optional temperature parameter
 * @param options.maxTokens - Optional max tokens parameter
 * @param options.tools - Optional tools to use
 * @param options.apiKey - Optional API key
 * @param options.baseURL - Optional base URL
 * @param options.traceName - Optional trace name
 * @param options.userId - Optional user ID
 * @param options.metadata - Optional additional metadata
 * @param options.useSearchGrounding - Optional flag to enable search grounding (Google only)
 * @param options.dynamicRetrievalConfig - Optional configuration for dynamic retrieval (Google only)
 * @param options.responseModalities - Optional response modalities (Google only)
 * @param options.cachedContent - Optional cached content name (Google only)
 * @returns The streaming result
 */
export async function streamWithAISDK({
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
  metadata = {},
  useSearchGrounding,
  dynamicRetrievalConfig,
  responseModalities,
  cachedContent,
  middleware
}: {
  provider: "google" | "openai" | "anthropic";
  modelId: string;
  messages: any[];
  temperature?: number;
  maxTokens?: number;
  tools?: Record<string, any>;
  apiKey?: string;
  baseURL?: string;
  traceName?: string;
  userId?: string;
  metadata?: any;
  middleware?: LanguageModelV1Middleware | LanguageModelV1Middleware[];
  useSearchGrounding?: boolean;
  dynamicRetrievalConfig?: {
    mode: "MODE_AUTOMATIC" | "MODE_DYNAMIC" | "MODE_MANUAL";
    dynamicThreshold?: number;
  };
  responseModalities?: Array<"TEXT" | "IMAGE">;
  cachedContent?: string;
}): Promise<StreamTextResult<Record<string, any>, never>> {
  // Create a trace for this operation
  const traceObj = await createTrace({
    name: traceName || `${provider}_stream`,
    userId,
    metadata: {
      ...metadata,
      provider,
      modelId,
      temperature,
      maxTokens,
      hasTools: tools && Object.keys(tools).length > 0,
      messageCount: messages.length
    }
  });

  const traceId = traceObj?.id;

  try {
    // Extract persona ID from metadata if available
    const personaId = metadata?.personaId || metadata?.persona_id;
    let startTime = Date.now();

    // Stream based on provider
    let result;
    switch (provider) {
      case "google":
        result = await streamGoogleAIWithTracing({
          modelId,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: apiKey || getModelConfig(modelId)?.api_key,
          baseURL,
          traceName,
          userId,
          metadata: {
            ...metadata,
            parentTraceId: traceId,
            middlewareApplied: !!middleware
          },
          useSearchGrounding,
          dynamicRetrievalConfig,
          responseModalities,
          cachedContent,
          middleware
        });
        break;

      case "openai":
        result = await streamOpenAIWithTracing({
          modelId,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: apiKey || getOpenAIConfig(modelId)?.api_key,
          baseURL,
          traceName,
          userId,
          metadata: {
            ...metadata,
            parentTraceId: traceId,
            middlewareApplied: !!middleware
          },
          middleware
        });
        break;

      case "anthropic":
        result = await streamAnthropicWithTracing({
          modelId,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: apiKey || getAnthropicConfig(modelId)?.api_key,
          baseURL,
          traceName,
          userId,
          metadata: {
            ...metadata,
            parentTraceId: traceId,
            middlewareApplied: !!middleware
          },
          middleware
        });
        break;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Update persona score if a persona ID was provided
    if (personaId) {
      try {
        const endTime = Date.now();
        const latency = endTime - startTime;

        // Update persona score asynchronously (don't await)
        personaManager.recordPersonaUsage(personaId, {
          success: true,
          latency,
          metadata: {
            provider,
            modelId,
            traceId,
            operation: 'stream'
          }
        }).catch(error => {
          console.error(`Error updating persona score for ${personaId}:`, error);
        });
      } catch (scoreError) {
        // Log but don't throw - we don't want to fail the main operation
        console.error(`Error updating persona score:`, scoreError);
      }
    }

    return result;
  } catch (error) {
    // Log the error
    if (traceId) {
      await logEvent({
        traceId,
        name: "stream_error",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      });
    }

    throw error;
  }
}

/**
 * Generate text with AI SDK
 *
 * @param options - Configuration options
 * @param options.provider - AI provider (google, openai, anthropic)
 * @param options.modelId - Model ID
 * @param options.messages - Messages to send to the model
 * @param options.temperature - Optional temperature parameter
 * @param options.maxTokens - Optional max tokens parameter
 * @param options.tools - Optional tools to use
 * @param options.apiKey - Optional API key
 * @param options.baseURL - Optional base URL
 * @param options.traceName - Optional trace name
 * @param options.userId - Optional user ID
 * @param options.metadata - Optional additional metadata
 * @returns The generation result
 */
export async function generateWithAISDK({
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
  metadata = {},
  middleware
}: {
  provider: "google" | "openai" | "anthropic"
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
  middleware?: LanguageModelV1Middleware | LanguageModelV1Middleware[]
}): Promise<GenerateTextResult<Record<string, any>, never>> {
  // Create a trace for this operation
  const traceObj = await createTrace({
    name: traceName || `${provider}_generate`,
    userId,
    metadata: {
      ...metadata,
      provider,
      modelId,
      temperature,
      maxTokens,
      hasTools: tools && Object.keys(tools).length > 0,
      messageCount: messages.length
    }
  });

  const traceId = traceObj?.id;

  try {
    // Extract persona ID from metadata if available
    const personaId = metadata?.personaId || metadata?.persona_id;
    let startTime = Date.now();

    // Generate based on provider
    let result;
    switch (provider) {
      case "google":
        result = await generateGoogleAIWithTracing({
          modelId,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: apiKey || getModelConfig(modelId)?.api_key,
          baseURL,
          traceName,
          userId,
          metadata: {
            ...metadata,
            parentTraceId: traceId,
            middlewareApplied: !!middleware
          },
          middleware
        });
        break;

      case "openai":
        result = await generateOpenAIWithTracing({
          modelId,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: apiKey || getOpenAIConfig(modelId)?.api_key,
          baseURL,
          traceName,
          userId,
          metadata: {
            ...metadata,
            parentTraceId: traceId
          }
        });
        break;

      case "anthropic":
        result = await generateAnthropicWithTracing({
          modelId,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: apiKey || getAnthropicConfig(modelId)?.api_key,
          baseURL,
          traceName,
          userId,
          metadata: {
            ...metadata,
            parentTraceId: traceId
          }
        });
        break;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Update persona score if a persona ID was provided
    if (personaId) {
      try {
        const endTime = Date.now();
        const latency = endTime - startTime;

        // Update persona score asynchronously (don't await)
        personaManager.recordPersonaUsage(personaId, {
          success: true,
          latency,
          metadata: {
            provider,
            modelId,
            traceId,
            operation: 'generate'
          }
        }).catch(error => {
          console.error(`Error updating persona score for ${personaId}:`, error);
        });
      } catch (scoreError) {
        // Log but don't throw - we don't want to fail the main operation
        console.error(`Error updating persona score:`, scoreError);
      }
    }

    return result;
  } catch (error) {
    // Log the error
    if (traceId) {
      await logEvent({
        traceId,
        name: "generate_error",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      });
    }

    throw error;
  }
}

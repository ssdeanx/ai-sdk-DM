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
  customProvider,
  type LanguageModelV1Middleware,
  type StreamTextResult,
  type GenerateTextResult,
  type Provider,
  LanguageModel
} from "ai";
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
import { upstashLogger } from "./memory/upstash/upstash-logger";
import type { Message as ChatMessage } from "./memory/upstash/upstashTypes";
import type { ToolExecutionEntity as ToolDefinition } from "./memory/upstash/upstashTypes";
import type { ModelEntity as MetadataRecord } from "./memory/upstash/upstashTypes";
import { streamText, generateText, wrapLanguageModel } from "ai";

// --- Zod Schemas ---

/**
 * Schema for AI SDK integration options
 */
export const AISDKOptionsSchema = z.object({
  provider: z.enum(['google', 'openai', 'anthropic']),
  modelId: z.string().min(1),
  messages: z.array(z.custom<ChatMessage>()),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().int().positive().optional(),
  tools: z.record(z.custom<ToolDefinition>()).optional().default({}),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  traceName: z.string().optional(),
  userId: z.string().optional(),
  metadata: z.record(z.custom<MetadataRecord>()).optional().default({}),
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
  constructor(message: string, public cause?: unknown) {
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
    let model: ModelSettings | undefined;
    const regModel = modelRegistry.getModel(modelId);
    if (regModel) {
      model = regModel;
    } else {
      const dbModel = await getModelById(modelId);
      if (dbModel && (dbModel as any).provider === "google-vertex") {
        model = { ...dbModel, provider: "vertex" } as ModelSettings;
      } else if (dbModel) {
        model = dbModel;
      } else {
        const modelIdModel = await getModelByModelId(modelId);
        if (modelIdModel && (modelIdModel as any).provider === "google-vertex") {
          model = { ...modelIdModel, provider: "vertex" } as ModelSettings;
        } else if (modelIdModel) {
          model = modelIdModel;
        }
      }
    }
    return model;
  } catch (error) {
    upstashLogger.warn("Error getting model configuration for " + modelId, String(error));
    return undefined;
  }
}

/**
 * Extract persona ID from metadata
 *
 * @param metadata - Metadata object
 * @returns Persona ID or undefined
 */
function extractPersonaId(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  if ('personaId' in metadata && typeof (metadata as any).personaId === 'string') {
    return (metadata as any).personaId;
  }
  if ('persona_id' in metadata && typeof (metadata as any).persona_id === 'string') {
    return (metadata as any).persona_id;
  }
  return undefined;
}

/**
 * Gets Google AI model configuration
 *
 * @param modelId - Model ID
 * @returns API key or undefined
 */
async function getModelConfig(modelId: string): Promise<{ api_key?: string } | undefined> {
  const model = await getModelConfiguration(modelId);
  if (model && model.api_key) return { api_key: model.api_key };
  return {};
}

/**
 * Gets OpenAI model configuration
 *
 * @param modelId - Model ID
 * @returns API key or undefined
 */
async function getOpenAIConfig(modelId: string): Promise<{ api_key?: string } | undefined> {
  return getModelConfig(modelId);
}

/**
 * Gets Anthropic model configuration
 *
 * @param modelId - Model ID
 * @returns API key or undefined
 */
async function getAnthropicConfig(modelId: string): Promise<{ api_key?: string } | undefined> {
  return getModelConfig(modelId);
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
  const builtInTools = includeBuiltIn ? getAllBuiltInTools() : {};
  const customTools = includeCustom ? await loadCustomTools() : {};
  const agTools = includeAgentic ? agenticTools : {};
  return {
    ...builtInTools,
    ...customTools,
    ...agTools
  };
}

/**
 * Create a custom provider with pre-configured language models
 *
 * @param options - Configuration options
 * @param options.languageModels - Map of model IDs to language models
 * @param options.fallbackProvider - Optional fallback provider
 * @returns Custom provider
 */
export function createCustomAISDKProvider({
  languageModels = {},
  fallbackProvider
}: {
  languageModels?: Record<string, LanguageModel>;
  fallbackProvider?: Provider;
} = {}): Provider {
  return customProvider({
    languageModels,
    fallbackProvider
  });
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
  metadata = undefined,
  useSearchGrounding,
  dynamicRetrievalConfig,
  responseModalities,
  cachedContent,
  middleware
}: {
  provider: "google" | "openai" | "anthropic";
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: Record<string, ToolDefinition>;
  apiKey?: string;
  baseURL?: string;
  traceName?: string;
  userId?: string;
  metadata?: MetadataRecord;
  middleware?: LanguageModelV1Middleware | LanguageModelV1Middleware[];
  useSearchGrounding?: boolean;
  dynamicRetrievalConfig?: {
    mode: "MODE_AUTOMATIC" | "MODE_DYNAMIC" | "MODE_MANUAL";
    dynamicThreshold?: number;
  };
  responseModalities?: Array<"TEXT" | "IMAGE">;
  cachedContent?: string;
}): Promise<StreamTextResult<Record<string, never>, never>> {
  const traceObj = await createTrace({
    name: traceName || `${provider}_stream`,
    userId,
    metadata: {
      ...(metadata || {}),
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
    const personaId = extractPersonaId(metadata);
    const startTime = Date.now();
    let result;
    switch (provider) {
      case "google":
        result = await streamGoogleAIWithTracing({
          modelId,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: apiKey || (await getModelConfig(modelId))?.api_key,
          baseURL,
          traceName,
          userId,
          metadata: {
            ...(metadata || {}),
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
          apiKey: apiKey || (await getOpenAIConfig(modelId))?.api_key,
          baseURL,
          traceName,
          userId,
          metadata: {
            ...(metadata || {}),
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
          apiKey: apiKey || (await getAnthropicConfig(modelId))?.api_key,
          baseURL,
          traceName,
          userId,
          metadata: {
            ...(metadata || {}),
            parentTraceId: traceId,
            middlewareApplied: !!middleware
          },
          middleware
        });
        break;
      default:
        throw new AISDKIntegrationError(`Unsupported provider: ${provider}`);
    }
    if (personaId) {
      try {
        const endTime = Date.now();
        const latency = endTime - startTime;
        personaManager.recordPersonaUsage(personaId, {
          success: true,
          latency,
          adaptabilityFactor: 1.0,
          metadata: {
            taskType: 'stream',
            executionTime: latency.toString()
          }
        }).catch(error => {
          upstashLogger.warn(`Error updating persona score for ${personaId}`, error instanceof Error ? error.message : String(error));
        });
      } catch (scoreError) {
        upstashLogger.warn(`Error updating persona score`, scoreError instanceof Error ? scoreError.message : String(scoreError));
      }
    }
    return result;
  } catch (error) {
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
    upstashLogger.error("Error in streamWithAISDK", error instanceof Error ? error.message : String(error));
    throw new AISDKIntegrationError("Error in streamWithAISDK", error);
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
  metadata = undefined,
  middleware
}: {
  provider: "google" | "openai" | "anthropic"
  modelId: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, ToolDefinition>
  apiKey?: string
  baseURL?: string
  traceName?: string
  userId?: string
  metadata?: MetadataRecord
  middleware?: LanguageModelV1Middleware | LanguageModelV1Middleware[]
}): Promise<GenerateTextResult<Record<string, never>, never>> {
  const traceObj = await createTrace({
    name: traceName || `${provider}_generate`,
    userId,
    metadata: {
      ...(metadata || {}),
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
    const personaId = extractPersonaId(metadata);
    const startTime = Date.now();
    let result;
    switch (provider) {
      case "google":
        result = await generateGoogleAIWithTracing({
          modelId,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: apiKey || (await getModelConfig(modelId))?.api_key,
          baseURL,
          traceName,
          userId,
          metadata: {
            ...(metadata || {}),
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
          apiKey: apiKey || (await getOpenAIConfig(modelId))?.api_key,
          baseURL,
          traceName,
          userId,
          metadata: {
            ...(metadata || {}),
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
          apiKey: apiKey || (await getAnthropicConfig(modelId))?.api_key,
          baseURL,
          traceName,
          userId,
          metadata: {
            ...(metadata || {}),
            parentTraceId: traceId
          }
        });
        break;
      default:
        throw new AISDKIntegrationError(`Unsupported provider: ${provider}`);
    }
    if (personaId) {
      try {
        const endTime = Date.now();
        const latency = endTime - startTime;
        personaManager.recordPersonaUsage(personaId, {
          success: true,
          latency,
          adaptabilityFactor: 1.0,
          metadata: {
            taskType: 'generate',
            executionTime: latency.toString()
          }
        }).catch(error => {
          upstashLogger.warn(`Error updating persona score for ${personaId}`, error instanceof Error ? error.message : String(error));
        });
      } catch (scoreError) {
        upstashLogger.warn(`Error updating persona score`, scoreError instanceof Error ? scoreError.message : String(scoreError));
      }
    }
    return result;
  } catch (error) {
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
    upstashLogger.error("Error in generateWithAISDK", error instanceof Error ? error.message : String(error));
    throw new AISDKIntegrationError("Error in generateWithAISDK", error);
  }
}

// Example usage for streamText, generateText, wrapLanguageModel (to avoid unused import errors)
// These are utility exports for advanced consumers
export { streamText, generateText, wrapLanguageModel };

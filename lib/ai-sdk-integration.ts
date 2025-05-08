/**
 * AI SDK Integration Module
 *
 * This module provides a unified interface for working with the AI SDK,
 * integrating with various AI providers, tools, and tracing systems.
 */

import {
  streamText,
  generateText,
  wrapLanguageModel,
  type LanguageModelV1Middleware,
  type StreamTextResult,
  type GenerateTextResult
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
// Import model configs with fallbacks
let getModelConfig: (modelId: string) => { api_key?: string; base_url?: string } | undefined;
let getOpenAIConfig: (modelId: string) => { api_key?: string; base_url?: string } | undefined;
let getAnthropicConfig: (modelId: string) => { api_key?: string; base_url?: string } | undefined;

try {
  getModelConfig = require("./google-ai").getModelConfig;
} catch (e) {
  getModelConfig = () => ({ api_key: process.env.GOOGLE_API_KEY });
  console.warn("Failed to import getModelConfig from ./google-ai, using fallback");
}

try {
  getOpenAIConfig = require("./openai-ai").getModelConfig;
} catch (e) {
  getOpenAIConfig = () => ({ api_key: process.env.OPENAI_API_KEY });
  console.warn("Failed to import getOpenAIConfig from ./openai-ai, using fallback");
}

try {
  getAnthropicConfig = require("./anthropic-ai").getModelConfig;
} catch (e) {
  getAnthropicConfig = () => ({ api_key: process.env.ANTHROPIC_API_KEY });
  console.warn("Failed to import getAnthropicConfig from ./anthropic-ai, using fallback");
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

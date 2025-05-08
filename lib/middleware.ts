/**
 * AI SDK Middleware Module
 *
 * This module provides middleware implementations for enhancing AI SDK functionality.
 * Middleware can intercept and modify calls to language models, adding features like
 * caching, logging, reasoning extraction, and more.
 */

import {
  type LanguageModelV1Middleware,
  type LanguageModelV1StreamPart,
  extractReasoningMiddleware as aiSdkExtractReasoningMiddleware,
  simulateStreamingMiddleware as aiSdkSimulateStreamingMiddleware,
  defaultSettingsMiddleware as aiSdkDefaultSettingsMiddleware
} from 'ai';
import { LRUCache } from 'lru-cache';

// Define request-response middleware types
export interface RequestMiddleware {
  name: string;
  beforeRequest?: (params: { messages: any[] }) => Promise<{ messages: any[] }>;
  onError?: (params: {
    error: Error;
    runAgain: (options?: { metadata?: Record<string, any> }) => Promise<any>;
    metadata?: Record<string, any>;
  }) => Promise<{ error: Error } | any>;
}

export interface ResponseMiddleware {
  name: string;
  afterResponse?: (params: { response: any }) => Promise<{ response: any }>;
}

// Helper function to create middleware
export function createMiddleware(middleware: RequestMiddleware | ResponseMiddleware): RequestMiddleware | ResponseMiddleware {
  return middleware;
}

// Create a function to get or create the response cache
function getResponseCache(options?: { maxSize?: number; ttl?: number }) {
  // Use a module-level variable to store the cache instance
  const cacheOptions = {
    max: options?.maxSize || 100, // Maximum number of items to store
    ttl: options?.ttl || 1000 * 60 * 60, // 1 hour TTL by default
    updateAgeOnGet: true, // Reset TTL when item is accessed
  };

  return new LRUCache<string, any>(cacheOptions);
}

// Default response cache instance
const responseCache = getResponseCache();

/**
 * Helper function to simulate a readable stream
 */
function simulateReadableStream({
  initialDelayInMs = 0,
  chunkDelayInMs = 10,
  chunks = []
}: {
  initialDelayInMs?: number;
  chunkDelayInMs?: number;
  chunks: any[];
}) {
  return new ReadableStream({
    async start(controller) {
      if (initialDelayInMs > 0) {
        await new Promise(resolve => setTimeout(resolve, initialDelayInMs));
      }

      for (const chunk of chunks) {
        controller.enqueue(chunk);
        if (chunkDelayInMs > 0) {
          await new Promise(resolve => setTimeout(resolve, chunkDelayInMs));
        }
      }

      controller.close();
    },
  });
}

// =============================================
// Language Model Middleware Implementations
// =============================================

/**
 * Create a caching middleware
 *
 * @param options - Configuration options
 * @param options.enabled - Whether caching is enabled
 * @param options.ttl - Optional TTL in milliseconds
 * @param options.maxSize - Optional maximum cache size
 * @returns The caching middleware or null if disabled
 */
export function createCachingMiddleware(options: {
  enabled: boolean;
  ttl?: number;
  maxSize?: number;
}): LanguageModelV1Middleware | null {
  if (!options.enabled) return null;

  // Create a new cache with the updated settings if needed
  const cache = options.ttl || options.maxSize
    ? getResponseCache({
        maxSize: options.maxSize,
        ttl: options.ttl
      })
    : responseCache;

  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const cacheKey = JSON.stringify(params);
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }
      const result = await doGenerate();
      cache.set(cacheKey, result);
      return result;
    },
    wrapStream: async ({ doStream, params }) => {
      const cacheKey = JSON.stringify(params);
      const cached = cache.get(cacheKey);

      if (cached) {
        // Return a simulated stream from cached data
        return {
          stream: simulateReadableStream({
            initialDelayInMs: 0,
            chunkDelayInMs: 10,
            chunks: cached.chunks || [],
          }),
          rawCall: { rawPrompt: null, rawSettings: {} },
        };
      }

      const { stream, ...rest } = await doStream();
      const chunks: LanguageModelV1StreamPart[] = [];

      const transformStream = new TransformStream<
        LanguageModelV1StreamPart,
        LanguageModelV1StreamPart
      >({
        transform(chunk, controller) {
          chunks.push(chunk);
          controller.enqueue(chunk);
        },
        flush() {
          cache.set(cacheKey, { chunks });
        },
      });

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      };
    },
  };
}

/**
 * Create a logging middleware
 *
 * @param options - Configuration options
 * @param options.enabled - Whether logging is enabled
 * @param options.logParams - Whether to log parameters
 * @param options.logResults - Whether to log results
 * @returns The logging middleware or null if disabled
 */
export function createLoggingMiddleware(options: {
  enabled: boolean;
  logParams?: boolean;
  logResults?: boolean;
}): LanguageModelV1Middleware | null {
  if (!options.enabled) return null;

  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      if (options.logParams) {
        console.log('Generate params:', JSON.stringify(params, null, 2));
      }
      const result = await doGenerate();
      if (options.logResults) {
        console.log('Generate result:', result.text);
      }
      return result;
    },
    wrapStream: async ({ doStream, params }) => {
      if (options.logParams) {
        console.log('Stream params:', JSON.stringify(params, null, 2));
      }

      const { stream, ...rest } = await doStream();

      if (!options.logResults) {
        return { stream, ...rest };
      }

      let generatedText = '';
      const transformStream = new TransformStream<
        LanguageModelV1StreamPart,
        LanguageModelV1StreamPart
      >({
        transform(chunk, controller) {
          if (chunk.type === 'text-delta') {
            generatedText += chunk.textDelta;
          }
          controller.enqueue(chunk);
        },
        flush() {
          console.log('Stream result:', generatedText);
        },
      });

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      };
    },
  };
}

/**
 * Create a reasoning extraction middleware
 *
 * @param options - Configuration options
 * @param options.enabled - Whether reasoning extraction is enabled
 * @param options.tagName - The tag name to extract (default: 'think')
 * @param options.startWithReasoning - Whether to start with reasoning (default: false)
 * @returns The reasoning extraction middleware or null if disabled
 */
export function createReasoningMiddleware(options: {
  enabled: boolean;
  tagName?: string;
  startWithReasoning?: boolean;
}): LanguageModelV1Middleware | null {
  if (!options.enabled) return null;

  return aiSdkExtractReasoningMiddleware({
    tagName: options.tagName || 'think',
    startWithReasoning: options.startWithReasoning || false
  });
}

/**
 * Create a simulation middleware
 *
 * @param options - Configuration options
 * @param options.enabled - Whether simulation is enabled
 * @returns The simulation middleware or null if disabled
 */
export function createSimulationMiddleware(options: {
  enabled: boolean;
}): LanguageModelV1Middleware | null {
  if (!options.enabled) return null;

  return aiSdkSimulateStreamingMiddleware();
}

/**
 * Create a default settings middleware
 *
 * @param options - Configuration options
 * @param options.settings - The default settings
 * @returns The default settings middleware or null if no settings provided
 */
export function createDefaultSettingsMiddleware(options?: {
  settings?: {
    temperature?: number;
    maxTokens?: number;
    providerMetadata?: Record<string, any>;
  };
}): LanguageModelV1Middleware | null {
  if (!options?.settings) return null;

  return aiSdkDefaultSettingsMiddleware({
    settings: options.settings
  });
}

/**
 * Create middleware array from options
 *
 * @param options - Middleware options
 * @returns Array of middleware
 */
export function createMiddlewareFromOptions(options: {
  caching?: {
    enabled: boolean;
    ttl?: number;
    maxSize?: number;
  };
  logging?: {
    enabled: boolean;
    logParams?: boolean;
    logResults?: boolean;
  };
  reasoning?: {
    enabled: boolean;
    tagName?: string;
    startWithReasoning?: boolean;
  };
  simulation?: {
    enabled: boolean;
  };
  defaultSettings?: {
    temperature?: number;
    maxTokens?: number;
    providerMetadata?: Record<string, any>;
  };
}): LanguageModelV1Middleware[] {
  const middlewares: LanguageModelV1Middleware[] = [];

  // Add caching middleware if enabled
  const cachingMiddleware = createCachingMiddleware(options.caching || { enabled: false });
  if (cachingMiddleware) middlewares.push(cachingMiddleware);

  // Add reasoning extraction middleware if enabled
  const reasoningMiddleware = createReasoningMiddleware(options.reasoning || { enabled: false });
  if (reasoningMiddleware) middlewares.push(reasoningMiddleware);

  // Add simulation middleware if enabled
  const simulationMiddleware = createSimulationMiddleware(options.simulation || { enabled: false });
  if (simulationMiddleware) middlewares.push(simulationMiddleware);

  // Add default settings middleware if provided
  const defaultSettingsMiddleware = createDefaultSettingsMiddleware({
    settings: options.defaultSettings
  });
  if (defaultSettingsMiddleware) middlewares.push(defaultSettingsMiddleware);

  // Add logging middleware if enabled (add last to log the final result)
  const loggingMiddleware = createLoggingMiddleware(options.logging || { enabled: false });
  if (loggingMiddleware) middlewares.push(loggingMiddleware);

  return middlewares;
}

// =============================================
// Request-Response Middleware Implementations
// =============================================

/**
 * Create a context injection middleware
 *
 * @param options - Configuration options
 * @param options.enabled - Whether context injection is enabled
 * @param options.context - The context to inject
 * @returns The context injection middleware or null if disabled
 */
export function createContextInjectionMiddleware(options: {
  enabled: boolean;
  context: string;
}): RequestMiddleware | null {
  if (!options.enabled || !options.context) return null;

  return createMiddleware({
    name: 'context-injection',
    beforeRequest: async ({ messages }) => {
      // Add context to the first message if it's a system message
      // or add a new system message if there isn't one
      if (messages.length > 0 && messages[0].role === 'system') {
        return {
          messages: [
            {
              role: 'system',
              content: `${messages[0].content}\n\nAdditional context: ${options.context}`
            },
            ...messages.slice(1)
          ]
        };
      } else {
        return {
          messages: [
            { role: 'system', content: `Context: ${options.context}` },
            ...messages
          ]
        };
      }
    }
  });
}

/**
 * Create a content filtering middleware
 *
 * @param options - Configuration options
 * @param options.enabled - Whether content filtering is enabled
 * @param options.patterns - Array of patterns to filter (regex strings)
 * @param options.replacements - Array of replacements for each pattern
 * @returns The content filtering middleware or null if disabled
 */
export function createContentFilteringMiddleware(options: {
  enabled: boolean;
  patterns: string[];
  replacements: string[];
}): ResponseMiddleware | null {
  if (!options.enabled || !options.patterns || options.patterns.length === 0) return null;

  return createMiddleware({
    name: 'content-filtering',
    afterResponse: async ({ response }) => {
      let filteredText = response.text();

      // Apply each pattern and replacement
      options.patterns.forEach((pattern, index) => {
        const replacement = options.replacements[index] || '[FILTERED]';
        filteredText = filteredText.replace(new RegExp(pattern, 'g'), replacement);
      });

      // Return modified response
      return {
        response: {
          ...response,
          text: () => filteredText
        }
      };
    }
  });
}

/**
 * Create an error handling middleware
 *
 * @param options - Configuration options
 * @param options.enabled - Whether error handling is enabled
 * @param options.retryOnRateLimit - Whether to retry on rate limit errors
 * @param options.maxRetries - Maximum number of retries
 * @param options.retryDelay - Delay between retries in milliseconds
 * @returns The error handling middleware or null if disabled
 */
export function createErrorHandlingMiddleware(options: {
  enabled: boolean;
  retryOnRateLimit?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}): RequestMiddleware | null {
  if (!options.enabled) return null;

  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000;

  return createMiddleware({
    name: 'error-handler',
    onError: async ({ error, runAgain, metadata }) => {
      console.error('Model error:', error);

      // Get current retry count from metadata
      const retryCount = (metadata?.retryCount as number) || 0;

      // Check if we should retry
      if (options.retryOnRateLimit &&
          error.message.includes('rate limit') &&
          retryCount < maxRetries) {
        // Wait and retry with exponential backoff
        const delay = retryDelay * Math.pow(2, retryCount);
        console.log(`Rate limit hit. Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Run again with updated metadata
        return runAgain({
          metadata: {
            ...metadata,
            retryCount: retryCount + 1
          }
        });
      }

      // Let the error propagate
      return { error };
    }
  });
}

/**
 * Create request-response middleware array from options
 *
 * @param options - Middleware options
 * @returns Array of request-response middleware
 */
export function createRequestResponseMiddlewareFromOptions(options: {
  contextInjection?: {
    enabled: boolean;
    context: string;
  };
  contentFiltering?: {
    enabled: boolean;
    patterns: string[];
    replacements: string[];
  };
  errorHandling?: {
    enabled: boolean;
    retryOnRateLimit?: boolean;
    maxRetries?: number;
    retryDelay?: number;
  };
}): (RequestMiddleware | ResponseMiddleware)[] {
  const middlewares: (RequestMiddleware | ResponseMiddleware)[] = [];

  // Add context injection middleware if enabled
  const contextInjectionMiddleware = createContextInjectionMiddleware(
    options.contextInjection || { enabled: false, context: '' }
  );
  if (contextInjectionMiddleware) middlewares.push(contextInjectionMiddleware);

  // Add content filtering middleware if enabled
  const contentFilteringMiddleware = createContentFilteringMiddleware(
    options.contentFiltering || { enabled: false, patterns: [], replacements: [] }
  );
  if (contentFilteringMiddleware) middlewares.push(contentFilteringMiddleware);

  // Add error handling middleware if enabled
  const errorHandlingMiddleware = createErrorHandlingMiddleware(
    options.errorHandling || { enabled: false }
  );
  if (errorHandlingMiddleware) middlewares.push(errorHandlingMiddleware);

  return middlewares;
}

/**
 * Create a complete middleware configuration
 *
 * @param options - All middleware options
 * @returns Object containing language model and request-response middleware
 */
export function createCompleteMiddleware(options: {
  languageModel?: {
    caching?: {
      enabled: boolean;
      ttl?: number;
      maxSize?: number;
    };
    logging?: {
      enabled: boolean;
      logParams?: boolean;
      logResults?: boolean;
    };
    reasoning?: {
      enabled: boolean;
      tagName?: string;
      startWithReasoning?: boolean;
    };
    simulation?: {
      enabled: boolean;
    };
    defaultSettings?: {
      temperature?: number;
      maxTokens?: number;
      providerMetadata?: Record<string, any>;
    };
  };
  requestResponse?: {
    contextInjection?: {
      enabled: boolean;
      context: string;
    };
    contentFiltering?: {
      enabled: boolean;
      patterns: string[];
      replacements: string[];
    };
    errorHandling?: {
      enabled: boolean;
      retryOnRateLimit?: boolean;
      maxRetries?: number;
      retryDelay?: number;
    };
  };
}) {
  return {
    languageModel: options.languageModel
      ? createMiddlewareFromOptions(options.languageModel)
      : [],
    requestResponse: options.requestResponse
      ? createRequestResponseMiddlewareFromOptions(options.requestResponse)
      : []
  };
}

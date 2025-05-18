/**
 * OpenTelemetry Tracing Module
 *
 * This module provides OpenTelemetry tracing integration for the AI SDK.
 * It sets up a tracer provider and exports traces to the configured endpoint.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  trace,
  context,
  SpanStatusCode,
  Span,
  SpanKind,
  Tracer,
} from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import { shouldUseUpstash } from './memory/supabase';
import { getRedisClient } from './memory/upstash/upstashClients';

// Initialize OpenTelemetry SDK
let sdk: NodeSDK | null = null;
let tracer: Tracer | null = null;

/**
 * Store trace data in Upstash Redis if available
 *
 * @param traceId - The trace ID
 * @param spanId - The span ID
 * @param data - The trace data to store
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function storeTraceDataInUpstash(
  traceId: string,
  spanId: string,
  data: Record<string, unknown>
): Promise<boolean> {
  if (!shouldUseUpstash()) {
    return false;
  }

  try {
    const redis = getRedisClient();
    const key = `trace:${traceId}:span:${spanId}`;
    const timestamp = Date.now();

    // Store the trace data with timestamp
    await redis.hset(key, {
      ...data,
      timestamp,
      stored_at: new Date().toISOString(),
    });

    // Set expiration (30 days)
    await redis.expire(key, 60 * 60 * 24 * 30);

    return true;
  } catch {
    return false;
  }
}
/**
 * Retrieve trace data from Upstash Redis
 *
 * @param traceId - The trace ID
 * @param spanId - Optional span ID to retrieve specific span data
 * @returns Promise resolving to the trace data or null if not found
 */
export async function getTraceDataFromUpstash(
  traceId: string,
  spanId?: string
): Promise<Record<string, unknown> | null> {
  if (!shouldUseUpstash()) {
    return null;
  }

  try {
    const redis = getRedisClient();

    if (spanId) {
      // Get specific span data
      const key = `trace:${traceId}:span:${spanId}`;
      const data = await redis.hgetall(key);

      // Handle null or empty object
      if (
        !data ||
        typeof data !== 'object' ||
        Object.keys(data || {}).length === 0
      ) {
        return null;
      }

      return data;
    } else {
      // Get all spans for this trace
      const keys = await redis.keys(`trace:${traceId}:span:*`);

      if (keys.length === 0) {
        return null;
      }

      const result: Record<string, unknown> & {
        spans: Record<string, unknown>[];
      } = {
        traceId,
        spans: [],
      };

      // Get data for each span
      for (const key of keys) {
        const spanData = await redis.hgetall(key);

        // Handle null or empty object
        if (
          spanData &&
          typeof spanData === 'object' &&
          Object.keys(spanData || {}).length > 0
        ) {
          result.spans.push(spanData);
        }
      }

      return result;
    }
  } catch {
    return null;
  }
}

/**
 * Initialize the OpenTelemetry SDK
 *
 * @param serviceName - The name of the service
 * @param serviceVersion - The version of the service
 * @param endpoint - The OTLP endpoint to export traces to
 */
export function initializeOTel({
  serviceName = 'ai-sdk-chat',
  serviceVersion = '1.0.0',
  endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    'http://localhost:4318/v1/traces',
}: {
  serviceName?: string;
  serviceVersion?: string;
  endpoint?: string;
}) {
  if (sdk) {
    return;
  }

  try {
    // Create a resource that identifies your service
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
    });

    // Create an exporter for traces
    const traceExporter = new OTLPTraceExporter({
      url: endpoint,
    });

    // Create a context manager to maintain context across async operations
    const contextManager = new AsyncHooksContextManager();
    contextManager.enable();

    // Create the SDK
    sdk = new NodeSDK({
      resource,
      traceExporter,
      spanProcessor: new SimpleSpanProcessor(traceExporter),
      contextManager,
      textMapPropagator: new B3Propagator(),
    });

    // Start the SDK
    sdk.start();

    // Get a tracer
    tracer = trace.getTracer(serviceName, serviceVersion);
  } catch {}
}
/** * Create a span to measure the duration of an operation *
 * @param name - The name of the span
 * @param options - Configuration options for the span
 * @param options.kind - The kind of span (default: SpanKind.INTERNAL)
 * @param options.attributes - Optional attributes for the span
 * @param options.parentSpan - Optional parent span
 * @returns The created span
 */ export function createOTelSpan(
  name: string,
  options: {
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean | string[]>;
    parentSpan?: Span;
  } = {}
): Span {
  if (!tracer) {
    // Return a no-op span
    return trace.getTracer('noop').startSpan('noop');
  }

  const { kind = SpanKind.INTERNAL, attributes = {}, parentSpan } = options;

  // Create a span with the parent context if provided
  let span: Span;
  if (parentSpan) {
    const parentContext = trace.setSpan(context.active(), parentSpan);
    span = tracer.startSpan(name, { kind, attributes }, parentContext);
  } else {
    span = tracer.startSpan(name, { kind, attributes });
  }

  return span;
}

/**
 * Create and start a span, returning a function to end it
 *
 * @param name - The name of the span
 * @param options - Configuration options for the span
 * @param options.kind - The kind of span (default: SpanKind.INTERNAL)
 * @param options.attributes - Optional attributes for the span
 * @param options.parentSpan - Optional parent span
 * @returns An object with the span and functions to end it
 */
export function startOTelSpan(
  name: string,
  options: {
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean | string[]>;
    parentSpan?: Span;
  } = {}
) {
  const span = createOTelSpan(name, options);

  return {
    span,
    end: (
      endOptions: {
        status?: SpanStatusCode;
        attributes?: Record<string, string | number | boolean | string[]>;
        error?: Error;
      } = {}
    ) => {
      const { status, attributes, error } = endOptions;

      // Add any additional attributes
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
      }

      // Set status if provided
      if (status !== undefined) {
        span.setStatus({ code: status });
      }

      // Record error if provided
      if (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      }

      // End the span
      span.end();
    },
    addEvent: (
      name: string,
      attributes?: Record<string, string | number | boolean | string[]>
    ) => {
      span.addEvent(name, attributes);
    },
    setAttribute: (
      key: string,
      value: string | number | boolean | string[]
    ) => {
      span.setAttribute(key, value);
    },
    setAttributes: (
      attributes: Record<string, string | number | boolean | string[]>
    ) => {
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    },
    recordError: (error: Error) => {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    },
  };
}

/**
 * Shutdown the OpenTelemetry SDK
 */
export function shutdownOTel() {
  if (sdk) {
    sdk.shutdown().then(() => {});
  }
}
// Export SpanKind and SpanStatusCode for convenience
export { SpanKind, SpanStatusCode };

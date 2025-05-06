/**
 * OpenTelemetry Tracing Module
 * 
 * This module provides OpenTelemetry tracing integration for the AI SDK.
 * It sets up a tracer provider and exports traces to the configured endpoint.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { trace, context, SpanStatusCode, Span, SpanKind, Tracer } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { B3Propagator } from '@opentelemetry/propagator-b3';

// Initialize OpenTelemetry SDK
let sdk: NodeSDK | null = null;
let tracer: Tracer | null = null;

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
  endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
}: {
  serviceName?: string;
  serviceVersion?: string;
  endpoint?: string;
}) {
  if (sdk) {
    console.warn('OpenTelemetry SDK already initialized');
    return;
  }

  try {
    // Create a resource that identifies your service
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
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

    console.log('OpenTelemetry SDK initialized');
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry SDK:', error);
  }
}

/**
 * Create a span to measure the duration of an operation
 * 
 * @param name - The name of the span
 * @param options - Configuration options for the span
 * @param options.kind - The kind of span (default: SpanKind.INTERNAL)
 * @param options.attributes - Optional attributes for the span
 * @param options.parentSpan - Optional parent span
 * @returns The created span
 */
export function createOTelSpan(
  name: string,
  options: {
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean | string[]>;
    parentSpan?: Span;
  } = {}
): Span {
  if (!tracer) {
    console.warn('OpenTelemetry tracer not initialized');
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
    end: (endOptions: { status?: SpanStatusCode; attributes?: Record<string, string | number | boolean | string[]>; error?: Error } = {}) => {
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
    addEvent: (name: string, attributes?: Record<string, string | number | boolean | string[]>) => {
      span.addEvent(name, attributes);
    },
    setAttribute: (key: string, value: string | number | boolean | string[]) => {
      span.setAttribute(key, value);
    },
    setAttributes: (attributes: Record<string, string | number | boolean | string[]>) => {
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    },
    recordError: (error: Error) => {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    }
  };
}

/**
 * Shutdown the OpenTelemetry SDK
 */
export function shutdownOTel() {
  if (sdk) {
    sdk.shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down'))
      .catch(error => console.error('Error shutting down OpenTelemetry SDK:', error));
  }
}

// Export SpanKind and SpanStatusCode for convenience
export { SpanKind, SpanStatusCode };

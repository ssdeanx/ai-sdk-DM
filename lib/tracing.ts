/**
 * Combined Tracing Module
 *
 * This module provides a unified interface for tracing using both Langfuse and OpenTelemetry.
 * It allows for seamless integration of both tracing systems in the AI SDK.
 */

import {
  createTrace,
  createGeneration,
  startSpan as startLangfuseSpan,
  logEvent,
  scoreGeneration,
  logPrompt,
  createDataset,
  logEvaluationRun,
  logUserFeedback,
} from './langfuse-integration';

import {
  initializeOTel,
  startOTelSpan,
  shutdownOTel,
  SpanKind,
  SpanStatusCode,
} from './otel-tracing';

// Initialize OpenTelemetry
export function initializeTracing({
  serviceName = 'ai-sdk-chat',
  serviceVersion = '1.0.0',
  endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    'http://localhost:4318/v1/traces',
}: {
  serviceName?: string;
  serviceVersion?: string;
  endpoint?: string;
} = {}) {
  // Initialize OpenTelemetry
  initializeOTel({
    serviceName,
    serviceVersion,
    endpoint,
  });
}

/**
 * Create a trace in both Langfuse and OpenTelemetry
 *
 * @param options - Configuration options for the trace
 * @param options.name - The name of the trace
 * @param options.userId - Optional user ID for the trace
 * @param options.metadata - Optional additional metadata for the trace
 * @returns The created trace object with IDs for both systems
 */
export async function trace({
  name,
  userId,
  metadata,
}: {
  name: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  // Create Langfuse trace
  const langfuseTrace = await createTrace({
    name,
    userId,
    metadata,
  });

  // Create OpenTelemetry root span to represent the trace
  const otelSpan = startOTelSpan(name, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'trace.name': name,
      ...(userId ? { 'user.id': userId } : {}),
      ...(metadata ? { 'trace.metadata': JSON.stringify(metadata) } : {}),
      'trace.system': 'combined',
      'langfuse.trace_id': langfuseTrace?.id || 'unknown',
    },
  });

  return {
    id: langfuseTrace?.id,
    otelSpan: otelSpan.span,
    langfuseTraceId: langfuseTrace?.id,
    name,
    userId,
    metadata,
    // Function to end the OpenTelemetry trace
    end: (
      options: {
        status?: SpanStatusCode;
        attributes?: Record<string, string | number | boolean | string[]>;
        error?: Error;
      } = {}
    ) => {
      otelSpan.end(options);
    },
  };
}
/**
 * Create a span in both Langfuse and OpenTelemetry
 *
 * @param options - Configuration options for the span
 * @param options.traceId - The ID of the trace this span belongs to
 * @param options.name - The name of the span
 * @param options.metadata - Optional additional metadata for the span
 * @param options.parentSpanId - Optional ID of the parent span
 * @returns An object with functions to end the span and add events
 */
export function span({
  traceId,
  name,
  metadata,
  parentSpanId,
}: {
  traceId: string;
  name: string;
  metadata?: Record<string, unknown>;
  parentSpanId?: string;
}) {
  // Start Langfuse span (this returns an object with an end function)
  const langfuseSpan = startLangfuseSpan({
    traceId,
    name,
    metadata,
    parentObservationId: parentSpanId,
  });

  // Start OpenTelemetry span
  const otelSpan = startOTelSpan(name, {
    attributes: {
      'span.name': name,
      'trace.id': traceId,
      ...(metadata ? { 'span.metadata': JSON.stringify(metadata) } : {}),
      ...(parentSpanId ? { 'parent.span.id': parentSpanId } : {}),
      'langfuse.span_id': langfuseSpan.spanId,
    },
  });

  return {
    id: langfuseSpan.spanId,
    otelSpan: otelSpan.span,
    // Function to end both spans
    end: async (
      endMetadata?: Record<string, string | number | boolean | string[]>
    ) => {
      // End OpenTelemetry span
      otelSpan.end({
        attributes: endMetadata,
      });

      // End Langfuse span
      return await langfuseSpan.end(endMetadata);
    }, // Function to add an event to both spans
    addEvent: async (
      eventName: string,
      eventMetadata?: Record<string, string | number | boolean | string[]>
    ) => {
      // Add event to OpenTelemetry span
      otelSpan.addEvent(eventName, eventMetadata);

      // Add event to Langfuse trace
      return await logEvent({
        traceId,
        name: eventName,
        metadata: eventMetadata,
      });
    },
  };
}
/**
 * Log a generation in both Langfuse and OpenTelemetry
 *
 * @param options - Configuration options for the generation
 * @returns The created generation object
 */
export async function generation(options: {
  traceId: string;
  name: string;
  model: string;
  modelParameters?: {
    [key: string]: string | number | boolean | string[] | null;
  };
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  startTime: Date;
  endTime: Date;
  metadata?: Record<string, unknown>;
}) {
  const { traceId, name, model, startTime, endTime, metadata } = options;

  // Create Langfuse generation
  const langfuseGeneration = await createGeneration(options);

  // Create OpenTelemetry span for the generation
  const otelSpan = startOTelSpan(`generation:${name}`, {
    attributes: {
      'generation.name': name,
      'generation.model': model,
      'trace.id': traceId,
      'generation.duration_ms': endTime.getTime() - startTime.getTime(),
      ...(metadata ? { 'generation.metadata': JSON.stringify(metadata) } : {}),
    },
  });

  // End the OpenTelemetry span immediately since this is a completed generation
  otelSpan.end();

  return langfuseGeneration;
} /**
 * Log an event in both Langfuse and OpenTelemetry
 *
 * @param options - Configuration options for the event
 * @returns The created event object
 */
export async function event(options: {
  traceId: string;
  name: string;
  metadata?: Record<string, unknown>;
}) {
  const { traceId, name, metadata } = options;

  // Log event in Langfuse
  const langfuseEvent = await logEvent(options);

  // Create a brief span in OpenTelemetry to represent the event
  const otelSpan = startOTelSpan(`event:${name}`, {
    attributes: {
      'event.name': name,
      'trace.id': traceId,
      ...(metadata ? { 'event.metadata': JSON.stringify(metadata) } : {}),
    },
  });

  // End the OpenTelemetry span immediately
  otelSpan.end();

  return langfuseEvent;
}
// Re-export other Langfuse functions
export {
  scoreGeneration as score,
  logPrompt as prompt,
  createDataset as dataset,
  logEvaluationRun as evaluationRun,
  logUserFeedback as userFeedback,
  shutdownOTel as shutdown,
};

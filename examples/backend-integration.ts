/**
 * Backend Integration Example
 * 
 * This file demonstrates how to integrate the OpenTelemetry tracing with your backend API routes.
 * It shows how to use the tracing functions in API routes for different providers.
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  streamAIWithTracing, 
  generateAIWithTracing,
  initializeTracing,
  shutdown
} from "../lib/ai-sdk-tracing";
import { getModelConfig } from "../lib/memory/supabase";

// Initialize tracing at the application startup
// This should be done in a server initialization file
initializeTracing({
  serviceName: 'ai-backend-service',
  serviceVersion: '1.0.0',
  endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
});

// Shutdown tracing when the application is shutting down
// This should be done in a server shutdown hook
process.on('SIGTERM', () => {
  shutdown().catch(console.error);
});

/**
 * Example API route for streaming AI responses with tracing
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { 
      modelId, 
      messages, 
      temperature = 0.7, 
      maxTokens, 
      tools = {},
      threadId
    } = body;

    // Get model configuration from database
    const model = await getModelConfig(modelId);
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Stream the response with tracing
    const result = await streamAIWithTracing({
      provider: model.provider,
      modelId: model.model_id,
      messages,
      temperature,
      maxTokens,
      tools,
      apiKey: model.api_key || process.env[`${model.provider.toUpperCase()}_API_KEY`],
      baseURL: model.base_url,
      traceName: "api_stream_response",
      userId: threadId,
      metadata: {
        endpoint: "/api/stream",
        requestId: crypto.randomUUID(),
        messageCount: messages.length
      }
    });

    // Return the streaming response
    return new Response(result.toReadableStream());
  } catch (error) {
    console.error("Error in stream API route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Example API route for generating AI responses with tracing
 */
export async function generateHandler(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { 
      modelId, 
      messages, 
      temperature = 0.7, 
      maxTokens, 
      tools = {},
      threadId
    } = body;

    // Get model configuration from database
    const model = await getModelConfig(modelId);
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Generate the response with tracing
    const result = await generateAIWithTracing({
      provider: model.provider,
      modelId: model.model_id,
      messages,
      temperature,
      maxTokens,
      tools,
      apiKey: model.api_key || process.env[`${model.provider.toUpperCase()}_API_KEY`],
      baseURL: model.base_url,
      traceName: "api_generate_response",
      userId: threadId,
      metadata: {
        endpoint: "/api/generate",
        requestId: crypto.randomUUID(),
        messageCount: messages.length
      }
    });

    // Return the generated response
    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error("Error in generate API route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Example middleware for adding tracing to all API routes
 */
export function tracingMiddleware(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    // Create a trace for this request
    const traceId = crypto.randomUUID();
    const url = new URL(request.url);
    
    try {
      // Call the handler
      const response = await handler(request);
      
      // Add tracing headers to the response
      response.headers.set('X-Trace-ID', traceId);
      
      return response;
    } catch (error) {
      console.error(`Error handling request to ${url.pathname}:`, error);
      
      // Return an error response
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500, headers: { 'X-Trace-ID': traceId } }
      );
    }
  };
}

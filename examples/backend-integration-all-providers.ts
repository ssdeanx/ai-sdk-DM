/**
 * Backend Integration Example with All Providers
 * 
 * This file demonstrates how to integrate the OpenTelemetry tracing with your backend API routes
 * for all supported providers (Google, OpenAI, Anthropic, and Google Vertex).
 */

import { NextRequest, NextResponse } from "next/server";
import { initializeTracing, shutdown } from "../lib/tracing";
import { getModelConfig } from "../lib/memory/supabase";

// Import provider-specific functions
import { streamGoogleAI, generateGoogleAI } from "../lib/google-ai";
import { streamOpenAI, generateOpenAI } from "../lib/openai-ai";
import { streamAnthropic, generateAnthropic } from "../lib/anthropic-ai";
import { streamGoogleVertex, generateGoogleVertex } from "../lib/vertex-ai";

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

    // Stream the response based on the provider
    let result;
    
    switch (model.provider.toLowerCase()) {
      case "google":
        result = await streamGoogleAI({
          modelId: model.model_id,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: model.api_key || process.env.GOOGLE_API_KEY,
          baseURL: model.base_url
        });
        break;
        
      case "openai":
        result = await streamOpenAI({
          modelId: model.model_id,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: model.api_key || process.env.OPENAI_API_KEY,
          baseURL: model.base_url
        });
        break;
        
      case "anthropic":
        result = await streamAnthropic({
          modelId: model.model_id,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: model.api_key || process.env.ANTHROPIC_API_KEY,
          baseURL: model.base_url
        });
        break;
        
      case "google-vertex":
        result = await streamGoogleVertex({
          modelId: model.model_id,
          messages,
          temperature,
          maxTokens,
          tools,
          project: model.project_id || process.env.GOOGLE_VERTEX_PROJECT_ID,
          location: model.location || process.env.GOOGLE_VERTEX_LOCATION
        });
        break;
        
      default:
        return NextResponse.json({ error: `Provider ${model.provider} not supported` }, { status: 400 });
    }

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

    // Generate the response based on the provider
    let result;
    
    switch (model.provider.toLowerCase()) {
      case "google":
        result = await generateGoogleAI({
          modelId: model.model_id,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: model.api_key || process.env.GOOGLE_API_KEY,
          baseURL: model.base_url
        });
        break;
        
      case "openai":
        result = await generateOpenAI({
          modelId: model.model_id,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: model.api_key || process.env.OPENAI_API_KEY,
          baseURL: model.base_url
        });
        break;
        
      case "anthropic":
        result = await generateAnthropic({
          modelId: model.model_id,
          messages,
          temperature,
          maxTokens,
          tools,
          apiKey: model.api_key || process.env.ANTHROPIC_API_KEY,
          baseURL: model.base_url
        });
        break;
        
      case "google-vertex":
        result = await generateGoogleVertex({
          modelId: model.model_id,
          messages,
          temperature,
          maxTokens,
          tools,
          project: model.project_id || process.env.GOOGLE_VERTEX_PROJECT_ID,
          location: model.location || process.env.GOOGLE_VERTEX_LOCATION
        });
        break;
        
      default:
        return NextResponse.json({ error: `Provider ${model.provider} not supported` }, { status: 400 });
    }

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

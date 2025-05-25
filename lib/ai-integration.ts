import { streamText, generateText, generateId } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createVertex } from '@ai-sdk/google-vertex';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { getLibSQLClient } from './memory/db';
import { getVectorClient } from './memory/upstash/upstashClients';
import { shouldUseUpstash } from './memory/supabase';
import { getEncoding } from 'js-tiktoken';
import { pipeline } from '@xenova/transformers';
import { upstashLogger } from './memory/upstash/upstash-logger';
import type { Message as ChatMessage } from './shared/types/upstashTypes';
import type { CoreMessage, ToolSet } from 'ai';
import type { FeatureExtractionPipeline } from '@xenova/transformers';

// Initialize Google AI provider with enhanced capabilities
export function getGoogleAI(apiKey: string, baseURL?: string) {
  return createGoogleGenerativeAI({
    apiKey: apiKey || process.env.GOOGLE_API_KEY,
    ...(baseURL ? { baseURL } : {}),
  });
}

// Initialize OpenAI provider with enhanced capabilities
export function getOpenAI(apiKey: string, baseURL?: string) {
  return createOpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
    ...(baseURL ? { baseURL } : {}),
  });
}

// Initialize Anthropic provider with enhanced capabilities
export function getAnthropic(apiKey: string, baseURL?: string) {
  return createAnthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    ...(baseURL ? { baseURL } : {}),
  });
}

// Initialize Google Vertex AI provider with enhanced capabilities
export function getGoogleVertex(project?: string, location?: string) {
  const effectiveProject = project || process.env.GOOGLE_VERTEX_PROJECT_ID;
  const effectiveLocation =
    location || process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';

  if (!effectiveProject) {
    throw new Error('Project ID is required for Google Vertex AI');
  }

  return createVertex({
    project: effectiveProject,
    location: effectiveLocation,
  });
}

// Stream AI response with enhanced capabilities
export async function streamAIResponse(
  providerName: string,
  modelName: string,
  apiKey: string,
  messages: ChatMessage[],
  options: {
    tools?: ToolSet;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
    project?: string;
    location?: string;
  } = {},
  baseURL?: string
) {
  try {
    // Initialize AI provider
    let provider;
    let model;

    switch (providerName.toLowerCase()) {
      case 'google':
        provider = getGoogleAI(apiKey, baseURL);
        model = provider(modelName);
        break;
      case 'openai':
        provider = getOpenAI(apiKey, baseURL);
        model = provider(modelName);
        break;
      case 'anthropic':
        provider = getAnthropic(apiKey, baseURL);
        model = provider(modelName);
        break;
      case 'google-vertex':
        provider = getGoogleVertex(options.project, options.location);
        model = provider(modelName);
        break;
      default:
        throw new Error(`Provider ${providerName} not supported yet`);
    }

    // Prepare call options for Vercel AI SDK
    const { tools, ...restOptions } = options;
    const callOptions = tools ? { ...restOptions, tools } : restOptions;

    // Stream the response using AI SDK
    const result = streamText({
      model,
      messages: messages as CoreMessage[],
      ...callOptions,
    });

    return result;
  } catch (error) {
    upstashLogger.error(
      'ai-integration',
      'Error streaming AI response',
      error instanceof Error ? error : { error: String(error) }
    );
    throw error;
  }
}

// Generate AI response (non-streaming)
export async function generateAIResponse(
  providerName: string,
  modelName: string,
  apiKey: string,
  messages: ChatMessage[],
  options: {
    tools?: ToolSet;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
    project?: string;
    location?: string;
  } = {},
  baseURL?: string
) {
  try {
    // Initialize AI provider
    let provider;
    let model;

    switch (providerName.toLowerCase()) {
      case 'google':
        provider = getGoogleAI(apiKey, baseURL);
        model = provider(modelName);
        break;
      case 'openai':
        provider = getOpenAI(apiKey, baseURL);
        model = provider(modelName);
        break;
      case 'anthropic':
        provider = getAnthropic(apiKey, baseURL);
        model = provider(modelName);
        break;
      case 'google-vertex':
        provider = getGoogleVertex(options.project, options.location);
        model = provider(modelName);
        break;
      default:
        throw new Error(`Provider ${providerName} not supported yet`);
    }

    // Prepare call options for Vercel AI SDK
    const { tools, ...restOptions } = options;
    const callOptions = tools ? { ...restOptions, tools } : restOptions;

    // Generate the response using AI SDK
    const result = await generateText({
      model,
      messages: messages as CoreMessage[],
      ...callOptions,
    });

    return result;
  } catch (error) {
    upstashLogger.error(
      'ai-integration',
      'Error generating AI response',
      error instanceof Error ? error : { error: String(error) }
    );
    throw error;
  }
}

// Count tokens in a text using js-tiktoken
/**
 * Counts the number of tokens in a text using js-tiktoken.
 * Always uses the 'o200k_base' encoding for maximum compatibility with Gemini and modern models.
 * Falls back to an approximate count if encoding fails.
 *
 * @param text - The input text to tokenize.
 * @param _modelName - (Unused) Model name, kept for compatibility.
 * @returns The number of tokens in the text.
 */
export function countTokens(text: string, _modelName = 'gpt-4') {
  try {
    // Always use o200k_base for token counting (Gemini/modern models)
    const encoding = getEncoding('o200k_base');
    const tokens = encoding.encode(text);
    return tokens.length;
  } catch (error) {
    upstashLogger.error(
      'ai-integration',
      'Error counting tokens',
      error instanceof Error ? error : { error: String(error) }
    );
    // Fallback to approximate token count (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }
}

// Generate embeddings using @xenova/transformers
let embeddingModel: unknown = null;

export async function generateEmbedding(text: string) {
  try {
    if (!embeddingModel) {
      // Initialize the embedding model
      embeddingModel = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
    }

    // Type assertion for embeddingModel
    const model = embeddingModel as FeatureExtractionPipeline;

    const result = await model(text, {
      pooling: 'mean',
      normalize: true,
    });

    return result.data;
  } catch (error) {
    upstashLogger.error(
      'ai-integration',
      'Error generating embedding',
      error instanceof Error ? error : { error: String(error) }
    );
    throw error;
  }
}

// Save embedding to database
export async function saveEmbedding(
  vector: Float32Array,
  model = 'all-MiniLM-L6-v2'
) {
  try {
    const id = generateId();

    if (shouldUseUpstash()) {
      // Use Upstash Vector
      const vectorClient = getVectorClient();

      // Convert Float32Array to regular array
      const vectorArray = Array.from(vector);

      // Upsert to Upstash Vector
      await vectorClient.upsert([
        {
          id,
          vector: vectorArray,
          metadata: {
            model,
            dimensions: vector.length,
            created_at: new Date().toISOString(),
          },
        },
      ]);
    } else {
      // Use LibSQL
      const db = getLibSQLClient();

      // Convert Float32Array to Buffer
      const buffer = Buffer.from(vector.buffer);

      await db.execute({
        sql: `
          INSERT INTO embeddings (id, vector, model, dimensions)
          VALUES (?, ?, ?, ?)
        `,
        args: [id, buffer, model, vector.length],
      });
    }

    return id;
  } catch (error) {
    upstashLogger.error(
      'ai-integration',
      'Error saving embedding',
      error instanceof Error ? error : { error: String(error) }
    );
    throw error;
  }
}

// Define Upstash vector result type
interface UpstashVectorResult {
  id: string | number;
  score: number;
}

// Perform vector search
export async function performVectorSearch(vector: Float32Array, limit = 5) {
  try {
    if (shouldUseUpstash()) {
      // Use Upstash Vector
      const vectorClient = getVectorClient();

      // Convert Float32Array to regular array
      const vectorArray = Array.from(vector);

      // Perform similarity search using Upstash Vector API
      const results: UpstashVectorResult[] = await vectorClient.query({
        vector: vectorArray,
        topK: limit,
        includeMetadata: true,
      });

      // Format results to match the expected output
      return results.map((result) => ({
        id: String(result.id),
        similarity: typeof result.score === 'number' ? result.score : 0,
      }));
    } else {
      // Use LibSQL
      const db = getLibSQLClient();

      const result = await db.execute({
        sql: `SELECT id, vector FROM embeddings`,
        args: [],
      });

      const similarities = result.rows.map((row) => {
        // Assuming row.vector is returned as Uint8Array for BLOB data
        const storedVector = new Float32Array(
          (row.vector as unknown as Uint8Array).buffer
        );
        const similarity = cosineSimilarity(vector, storedVector);
        return {
          id: row.id as string,
          similarity,
        };
      });

      // Sort by similarity (descending)
      similarities.sort((a, b) => b.similarity - a.similarity);

      // Return top results
      return similarities.slice(0, limit);
    }
  } catch (error) {
    upstashLogger.error(
      'ai-integration',
      'Error performing vector search',
      error instanceof Error ? error : { error: String(error) }
    );
    throw error;
  }
}

// Helper function to compute cosine similarity
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

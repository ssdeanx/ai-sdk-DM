import { getLibSQLClient } from './db';
import { v4 as generateUUID } from 'uuid';
import { encodingForModel } from 'js-tiktoken';
import { pipeline } from '@xenova/transformers';
import { generateAIResponse } from '../ai';
import { LRUCache } from 'lru-cache';
import { getGoogleAI } from '../google-ai'; // for fallback embeddings
import { z } from 'zod';

// Zod schemas for memory management
export const MessageRoleSchema = z.enum([
  'user',
  'assistant',
  'system',
  'tool',
]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid().optional(),
  role: MessageRoleSchema,
  content: z.string(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(), // For tool messages
  metadata: z.record(z.unknown()).optional(),
  token_count: z.number().int().optional(),
  embedding_id: z.string().optional(),
  created_at: z.string().optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ThreadSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid().optional(),
  network_id: z.string().uuid().optional(),
  name: z.string(),
  summary: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Thread = z.infer<typeof ThreadSchema>;

export const AgentStateSchema = z.record(z.unknown());
export type AgentState = z.infer<typeof AgentStateSchema>;

export const ThreadOptionsSchema = z.object({
  agent_id: z.string().uuid().optional(),
  network_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type ThreadOptions = z.infer<typeof ThreadOptionsSchema>;

export const MessageOptionsSchema = z.object({
  tool_call_id: z.string().optional(),
  tool_name: z.string().optional(),
  generate_embeddings: z.boolean().optional(),
  count_tokens: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
  model_name: z.string().optional(),
});
export type MessageOptions = z.infer<typeof MessageOptionsSchema>;

// Initialize embedding model
let embeddingModel: any = null;

// Cache for thread messages: key = thread_id, value = Message[]
const messagesCache = new LRUCache<string, Message[]>({
  max: 100,
  ttl: 1000 * 60 * 10,
});

// Create a new memory thread
export async function createMemoryThread(
  name: string,
  options: {
    agent_id?: string;
    network_id?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<string> {
  const db = getLibSQLClient();
  const thread_id = generateUUID();
  const { agent_id, network_id, metadata } = options;

  await db.execute({
    sql: `
      INSERT INTO memory_threads (id, agent_id, network_id, name, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `,
    args: [
      thread_id,
      agent_id || null,
      network_id || null,
      name,
      JSON.stringify(metadata || {}),
    ],
  });

  return thread_id;
}

// Get memory thread by ID
export async function getMemoryThread(
  thread_id: string
): Promise<MemoryThread | null> {
  const db = getLibSQLClient();

  const result = await db.execute({
    sql: `
      SELECT * FROM memory_threads
      WHERE id = ?
    `,
    args: [thread_id],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const thread = result.rows[0];
  return {
    id: thread.id as string,
    agent_id: thread.agent_id as string,
    network_id: thread.network_id as string,
    name: thread.name as string,
    summary: thread.summary as string,
    metadata: JSON.parse((thread.metadata as string) || '{}'),
    created_at: thread.created_at as string,
    updated_at: thread.updated_at as string,
  };
}

// List memory threads
export async function listMemoryThreads(
  options: {
    agent_id?: string;
    network_id?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<MemoryThread[]> {
  const db = getLibSQLClient();
  const { agent_id, network_id, limit = 10, offset = 0 } = options;

  let sql = `
    SELECT * FROM memory_threads
    WHERE 1=1
  `;
  const args: any[] = [];

  if (agent_id) {
    sql += ` AND agent_id = ?`;
    args.push(agent_id);
  }

  if (network_id) {
    sql += ` AND network_id = ?`;
    args.push(network_id);
  }

  sql += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
  args.push(limit, offset);

  const result = await db.execute({ sql, args });

  return result.rows.map((thread) => ({
    id: thread.id as string,
    agent_id: thread.agent_id as string,
    network_id: thread.network_id as string,
    name: thread.name as string,
    summary: thread.summary as string,
    metadata: JSON.parse((thread.metadata as string) || '{}'),
    created_at: thread.created_at as string,
    updated_at: thread.updated_at as string,
  }));
}

// Delete memory thread
export async function deleteMemoryThread(thread_id: string): Promise<boolean> {
  const db = getLibSQLClient();

  try {
    // Delete all messages in the thread first (cascade should handle this, but being explicit)
    await db.execute({
      sql: `DELETE FROM messages WHERE memory_thread_id = ?`,
      args: [thread_id],
    });

    // Delete the thread
    await db.execute({
      sql: `DELETE FROM memory_threads WHERE id = ?`,
      args: [thread_id],
    });

    // Clear cache for this thread
    messagesCache.delete(thread_id);

    return true;
  } catch (error) {
    console.error(`Error deleting memory thread ${thread_id}:`, error);
    return false;
  }
}

// Load messages for a memory thread
export async function loadMessages(
  thread_id: string,
  limit?: number
): Promise<Message[]> {
  // Return cached messages if no limit is specified
  if (!limit) {
    const cached = messagesCache.get(thread_id);
    if (cached) {
      return cached;
    }
  }

  const db = getLibSQLClient();

  let sql = `
    SELECT * FROM messages
    WHERE memory_thread_id = ?
    ORDER BY created_at ASC
  `;
  const args: any[] = [thread_id];

  if (limit) {
    sql += ` LIMIT ?`;
    args.push(limit);
  }

  const result = await db.execute({ sql, args });

  const messages = result.rows.map((row) => ({
    id: row.id as string,
    role: row.role as 'user' | 'assistant' | 'system' | 'tool',
    content: row.content as string,
    tool_call_id: row.tool_call_id as string,
    name: row.tool_name as string,
    token_count: row.token_count as number,
    embedding_id: row.embedding_id as string,
    metadata: JSON.parse((row.metadata as string) || '{}'),
    created_at: row.created_at as string,
  }));

  // Cache full message list when no limit
  if (!limit) {
    messagesCache.set(thread_id, messages);
  }

  return messages;
}

// Count tokens in a text using js-tiktoken
export function countTokens(
  text: string,
  model: 'o200k_base' | 'cl100k_base' | string = 'o200k_base'
): number {
  let encoder;
  try {
    // Use encodingForModel, handle potential errors if model name is invalid
    try {
      // Cast to any to bypass strict type check; runtime errors are caught below.
      encoder = encodingForModel(model as any);
    } catch (e) {
      // Check if the error indicates an invalid model name
      // (The exact error message might vary depending on the js-tiktoken version)
      let isInvalidModelError = false;
      if (e instanceof Error) {
        // Common patterns for invalid model errors
        isInvalidModelError =
          e.message.includes('Invalid model name') ||
          e.message.includes('Unknown model');
      }

      if (isInvalidModelError) {
        console.warn(
          `Warning: Model '${model}' not found for token counting by js-tiktoken. Falling back to cl100k_base.`
        );
        encoder = encodingForModel('cl100k_base' as any); // Fallback to a known valid model, cast to any
      } else {
        // Re-throw unexpected errors
        throw e;
      }
    }
    const tokens = encoder.encode(text);
    return tokens.length;
  } catch (error) {
    console.error('Error counting tokens:', error);
    // Fallback to approximate token count (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }
}

// Generate embeddings using @xenova/transformers or fallback to Google text-embedding-004
export async function generateEmbedding(
  text: string,
  modelName?: string // optional: specify 'text-embedding-004' for Google
): Promise<Float32Array> {
  // Try local Xenova pipeline first unless explicit Google model requested
  if (!modelName || modelName !== 'text-embedding-004') {
    try {
      if (!embeddingModel) {
        embeddingModel = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2'
        );
      }
      const result = await embeddingModel(text, {
        pooling: 'mean',
        normalize: true,
      });
      return result.data;
    } catch (error) {
      console.warn(
        'Xenova embedding failed, falling back to Google text-embedding-004:',
        error
      );
    }
  }

  // Fallback: Google text-embedding-004 via AI SDK (second choice)
  try {
    const googleAI = getGoogleAI(); // uses process.env.GOOGLE_API_KEY
    // hypothetically support embed method; adjust per SDK
    if (typeof (googleAI as any).embed === 'function') {
      const res = await (googleAI as any).embed({
        model: 'text-embedding-004',
        input: text,
      });
      // assume response contains embeddings as number[][]
      const data = res.data[0].embedding;
      return new Float32Array(data);
    } else {
      throw new Error('Google AI SDK embedding method not available');
    }
  } catch (error) {
    console.error('Google embedding failed:', error);
    // final fallback: zero vector
    return new Float32Array(384);
  }
}

// Save embedding to database
export async function saveEmbedding(
  vector: Float32Array,
  model = 'all-MiniLM-L6-v2'
): Promise<string> {
  try {
    const db = getLibSQLClient();
    const id = generateUUID();

    // Convert Float32Array to Buffer
    const buffer = Buffer.from(vector.buffer);

    await db.execute({
      sql: `
        INSERT INTO embeddings (id, vector, model, dimensions)
        VALUES (?, ?, ?, ?)
      `,
      args: [id, buffer, model, vector.length],
    });

    return id;
  } catch (error) {
    console.error('Error saving embedding:', error);
    throw error;
  }
}

// Save a message to a memory thread with enhanced capabilities
export async function saveMessage(
  thread_id: string,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  options: {
    tool_call_id?: string;
    tool_name?: string;
    generate_embeddings?: boolean;
    count_tokens?: boolean;
    metadata?: Record<string, any>;
    model_name?: string;
  } = {}
): Promise<string> {
  const db = getLibSQLClient();
  const message_id = generateUUID();
  const {
    tool_call_id,
    tool_name,
    generate_embeddings = false,
    count_tokens = false,
    metadata = {},
    model_name,
  } = options;

  // Count tokens if requested
  let tokens = null;
  if (count_tokens) {
    tokens = countTokens(content, model_name);
  }

  // Generate embedding if requested
  let embedding_id = null;
  if (generate_embeddings) {
    try {
      const embedding = await generateEmbedding(content);
      embedding_id = await saveEmbedding(embedding);
    } catch (error) {
      console.error('Error generating embedding for message:', error);
    }
  }

  await db.execute({
    sql: `
      INSERT INTO messages (
        id, memory_thread_id, role, content, tool_call_id, tool_name,
        token_count, embedding_id, metadata, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    args: [
      message_id,
      thread_id,
      role,
      content,
      tool_call_id || null,
      tool_name || null,
      tokens,
      embedding_id,
      JSON.stringify(metadata),
    ],
  });

  // Update the thread's updated_at timestamp
  await db.execute({
    sql: `UPDATE memory_threads SET updated_at = datetime('now') WHERE id = ?`,
    args: [thread_id],
  });

  // Clear cache for this thread so next load fetches fresh
  messagesCache.delete(thread_id);

  return message_id;
}

// Load agent state for a memory thread
export async function loadAgentState(
  thread_id: string,
  agent_id: string
): Promise<AgentState> {
  const db = getLibSQLClient();

  const result = await db.execute({
    sql: `
      SELECT state_data FROM agent_states
      WHERE memory_thread_id = ? AND agent_id = ?
    `,
    args: [thread_id, agent_id],
  });

  if (result.rows.length === 0) {
    return {};
  }

  try {
    return JSON.parse(result.rows[0].state_data as string);
  } catch (e) {
    console.error('Error parsing agent state:', e);
    return {};
  }
}

// Save agent state for a memory thread
export async function saveAgentState(
  thread_id: string,
  agent_id: string,
  state: AgentState
): Promise<void> {
  const db = getLibSQLClient();

  const existingResult = await db.execute({
    sql: `
      SELECT 1 FROM agent_states
      WHERE memory_thread_id = ? AND agent_id = ?
    `,
    args: [thread_id, agent_id],
  });

  const stateJson = JSON.stringify(state);

  if (existingResult.rows.length > 0) {
    // Update existing state
    await db.execute({
      sql: `
        UPDATE agent_states
        SET state_data = ?, updated_at = datetime('now')
        WHERE memory_thread_id = ? AND agent_id = ?
      `,
      args: [stateJson, thread_id, agent_id],
    });
  } else {
    // Insert new state
    await db.execute({
      sql: `
        INSERT INTO agent_states (memory_thread_id, agent_id, state_data, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `,
      args: [thread_id, agent_id, stateJson],
    });
  }
}

// Generate a summary for a memory thread
export async function generateThreadSummary(
  thread_id: string
): Promise<string> {
  const db = getLibSQLClient();

  // Get the thread
  const threadResult = await db.execute({
    sql: `SELECT * FROM memory_threads WHERE id = ?`,
    args: [thread_id],
  });

  if (threadResult.rows.length === 0) {
    throw new Error(`Memory thread not found: ${thread_id}`);
  }

  const thread = threadResult.rows[0];
  const agent_id = thread.agent_id as string;

  // Get the agent's model if available
  let provider = 'google';
  let model_id = 'gemini-pro';
  let api_key = process.env.GOOGLE_API_KEY;

  if (agent_id) {
    const agentResult = await db.execute({
      sql: `
        SELECT m.provider, m.model_id, m.api_key, m.base_url
        FROM agents a
        JOIN models m ON a.model_id = m.id
        WHERE a.id = ?
      `,
      args: [agent_id],
    });

    if (agentResult.rows.length > 0) {
      const agent = agentResult.rows[0];
      provider = agent.provider as string;
      model_id = agent.model_id as string;
      api_key = agent.api_key as string;
    }
  }

  // Load the messages
  const messages = await loadMessages(thread_id);

  // Prepare the prompt for summarization
  const systemPrompt = {
    role: 'system',
    content:
      'You are a summarization assistant. Create a concise summary of the following conversation. Focus on the key points, decisions, and outcomes.',
  };

  // Format the conversation for the model
  const conversationText = messages
    .map((msg) => {
      const role =
        msg.role === 'tool'
          ? 'Tool'
          : msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
      return `${role}: ${msg.content}`;
    })
    .join('\n\n');

  const userPrompt = {
    role: 'user',
    content: `Please summarize this conversation:\n\n${conversationText}`,
  };

  // Generate the summary
  const result = await generateAIResponse(
    provider,
    model_id,
    [systemPrompt, userPrompt],
    {
      apiKey: api_key,
      temperature: 0.3,
    }
  );

  const summary = result.text;

  // Save the summary to the thread
  await db.execute({
    sql: `UPDATE memory_threads SET summary = ? WHERE id = ?`,
    args: [summary, thread_id],
  });

  return summary;
}

// Semantic search in memory
export async function semanticSearchMemory(
  query: string,
  options: {
    thread_id?: string;
    agent_id?: string;
    limit?: number;
  } = {}
): Promise<any[]> {
  try {
    const { thread_id, agent_id, limit = 5 } = options;

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    const db = getLibSQLClient();

    // Build the SQL query based on the provided filters
    let sql = `
      SELECT m.*, e.vector, mt.agent_id, mt.name as thread_name
      FROM messages m
      JOIN embeddings e ON m.embedding_id = e.id
      JOIN memory_threads mt ON m.memory_thread_id = mt.id
      WHERE m.embedding_id IS NOT NULL
    `;

    const args = [];

    if (thread_id) {
      sql += ` AND m.memory_thread_id = ?`;
      args.push(thread_id);
    }

    if (agent_id) {
      sql += ` AND mt.agent_id = ?`;
      args.push(agent_id);
    }

    const result = await db.execute({ sql, args });

    // Calculate similarities and rank results
    const similarities = result.rows.map((row) => {
      // Assuming row.vector is returned as ArrayBuffer for BLOBs by libsql
      const storedVector = new Float32Array(row.vector as ArrayBuffer);
      const similarity = cosineSimilarity(queryEmbedding, storedVector);

      return {
        message: {
          id: row.id,
          role: row.role,
          content: row.content,
          thread_id: row.memory_thread_id,
          thread_name: row.thread_name,
          created_at: row.created_at,
        },
        similarity,
      };
    });

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Return top results
    return similarities.slice(0, limit);
  } catch (error) {
    console.error('Error in semantic search:', error);
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

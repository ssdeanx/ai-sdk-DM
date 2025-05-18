import { createClient } from '@libsql/client';
import { z } from 'zod';
import { generateId } from 'ai'; // Standard ID generation

// Import Drizzle CRUD helpers
import { DrizzleCrud } from '../../db/libsql/crud';
import { eq, desc, and, sql } from 'drizzle-orm/libsql';
import { type Column, ColumnBaseConfig, ColumnDataType } from 'drizzle-orm';
import { type SQL } from 'drizzle-orm';

// Type helpers
export type MemoryThreadData = typeof schema.memory_threads.$inferInsert;
export type MemoryThreadResult = typeof schema.memory_threads.$inferSelect;
export type MessageData = typeof schema.messages.$inferInsert;
export type MessageResult = typeof schema.messages.$inferSelect;
export type EmbeddingData = typeof schema.embeddings.$inferInsert;
export type EmbeddingResult = typeof schema.embeddings.$inferSelect;
export type AgentStateData = typeof schema.agent_states.$inferInsert;
export type AgentStateResult = typeof schema.agent_states.$inferSelect;

// Type helpers for JSON fields
export type JsonField<T> = T | null;
export type JsonString = string | null;


// Import validation types
import {
  type MemoryThread,
  type Message,
  type Embedding,
  type AgentState,
  type App,
  type User,
  type Integration,
  type AppCodeBlock,
  type File,
  type TerminalSession,
  type NewMessage,
  type NewEmbedding,
  type NewAgentState,
  type NewApp,
  type NewUser,
  type NewIntegration,
  type NewAppCodeBlock,
  type NewFile,
  type NewTerminalSession,
  MessageSchema,
  EmbeddingSchema,
  AgentStateSchema,
  AppSchema,
  UserSchema,
  IntegrationSchema,
  AppCodeBlockSchema,
  FileSchema,
  TerminalSessionSchema,
} from '../../db/libsql/validation';

import type { Row } from '@libsql/client';

// Type assertion helper for Row type
function assertRow<T>(row: Row): asserts row is T {
  if (typeof row !== 'object') {
    throw new Error('Expected object');
  }
  Object.keys(row).forEach(key => {
    if (!(key in row)) {
      throw new Error(`Missing required field: ${key}`);
    }
  });
}

// Import schema types and tables
import {
  memory_threads,
  messages,
  embeddings,
  agent_states,
  apps,
  users,
  integrations,
  app_code_blocks,
  files,
  terminal_sessions,
} from '../../db/libsql/schema';

// Initialize database client and Drizzle CRUD
const dbClient = createClient({
  url: process.env.LIBSQL_URL!,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});

const db = drizzle(dbClient);
const crud = new DrizzleCrud(db);

/**
 * Helper to parse row and then parse specific JSON string fields into objects.
 * The Zod schema validates the DB representation (JSON fields as strings).
 * This function then transforms those string fields into objects for application use.
 * @param row The raw row from the database.
 * @param schema The Zod schema for the entity (expecting JSON fields as strings).
 * @param jsonFields Array of field names that are stored as JSON strings.
 * @returns The parsed and transformed entity.
 */
function parseRowAndTransformJsonFields<T extends Record<string, unknown>>(
  row: T,
  schema: z.ZodType<T>,
  jsonFields: (keyof T)[] = []
): T {
  // Create a copy of the row to avoid mutating the original
  const rawDataForZod: Record<string, unknown> = { ...row };

  // Transform JSON fields to strings before validation
  jsonFields.forEach((field) => {
    const key = field as string;
    const fieldValue = rawDataForZod[key];
    if (fieldValue && typeof fieldValue === 'object') {
      rawDataForZod[key] = JSON.stringify(fieldValue);
    }
  });

  // Validate the transformed data
  const parsed = schema.safeParse(rawDataForZod);
  if (!parsed.success) {
    throw new Error('Invalid database data');
  }

  // Create the final result object
  const result: T = { ...parsed.data };

  // Transform stringified JSON fields back to objects after validation
  jsonFields.forEach((field) => {
    const key = field as string;
    const fieldValue = result[key];
    if (fieldValue && typeof fieldValue === 'string') {
      try {
        result[key] = JSON.parse(fieldValue);
      } catch {
        throw new Error(`Invalid JSON data for field ${field}`);
      }
    }
  });

  return result;
}

/**
 * Initialize LibSQL client for agent memory and threads
 * @returns LibSQL client instance
 */
export const createLibSQLClient = () => {
  const url = process.env.LIBSQL_DATABASE_URL;
  const authToken = process.env.LIBSQL_AUTH_TOKEN;
  if (!url) {
    throw new Error('LIBSQL_DATABASE_URL environment variable is not set');
  }
  return createClient({ url, authToken });
};

/**
 * Check if LibSQL is available
 * @returns True if LibSQL is available, false otherwise
 */
export const isLibSQLAvailable = async (): Promise<boolean> => {
  const client = createLibSQLClient();
  try {
    await client.execute('SELECT 1');
    return true;
  } catch {
    return false;
  }
};

/**
 * Get all messages for a specific thread, validated and parsed.
 * Metadata is parsed from JSON string to object.
 * @param threadId - The ID of the memory thread.
 * @returns Array of Message objects.
 */
export async function getMemory(threadId: string): Promise<Message[]> {
  const client = createLibSQLClient();
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM messages WHERE memory_thread_id = ? ORDER BY created_at ASC',
      args: [threadId],
    });
    return result.rows.map((row) =>
      parseRowAndTransformJsonFields(row, MessageSchema, ['metadata'])
    );
  } catch (error) {
    throw error;
  }
}

/**
 * Add a memory entry (message) to a thread, enforcing schema.
 * Metadata is stringified before insertion.
 * @param memory_thread_id - The ID of the memory thread.
 * @param role - The role of the message sender (e.g., 'user', 'assistant').
 * @param content - The content of the message.
 * @param metadata - Optional metadata object for the message.
 * @returns The created Message object (with metadata as an object).
 */
export async function createMessage(
  memory_thread_id: string,
  role: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<Message> {
  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  const messageData: NewMessage = {
    id: generateId(),
    memory_thread_id,
    role,
    content,
    metadata: metadataJson,
    created_at: new Date().toISOString(),
  };

  return crud.createMessage(messageData);
}

/**
 * Get all threads, validated and parsed.
 * Metadata is parsed from JSON string to object.
 * @returns Array of MemoryThread objects.
 */
export async function getThreads(): Promise<MemoryThread[]> {
  return await crud.getMemoryThreads();
}

/**
 * Delete a thread and all its messages.
 * @param threadId - The ID of the thread to delete.
 * @returns True if deletion was successful, false otherwise.
 */
export async function deleteThread(threadId: string): Promise<boolean> {
  try {
    await crud.deleteMemoryThread(threadId);
    await crud.deleteMessagesByThreadId(threadId);
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Insert an embedding vector.
 * @param vector - The Float32Array vector.
 * @param model - The model used to generate the embedding.
 * @param dimensions - Optional dimensions of the vector (defaults to vector.length).
 * @returns The created Embedding object.
 */
export async function insertEmbedding(
  vector: Float32Array,
  model: string = 'all-MiniLM-L6-v2',
  dimensions?: number
): Promise<Embedding> {
  const embeddingData: NewEmbedding = {
    id: generateId(),
    vector: new Uint8Array(vector.buffer),
    model,
    dimensions: dimensions ?? vector.length,
    created_at: new Date().toISOString(),
  };

  return crud.createEmbedding(embeddingData);
}

/**
 * Perform vector similarity search against the embeddings table.
 * @param queryVector - The Float32Array query vector.
 * @param limit - The maximum number of results to return.
 * @returns Array of objects containing embedding ID and similarity score.
 */
export async function vectorSearch(
  queryVector: Float32Array,
  limit: number = 5
): Promise<Array<{ id: string; similarity: number }>> {
  const client = createLibSQLClient();
  const queryVectorBytes = new Uint8Array(queryVector.buffer);
  try {
    const result = await client.execute({
      sql: `SELECT id, vector <-> ? AS similarity FROM embeddings ORDER BY similarity ASC LIMIT ?`,
      args: [queryVectorBytes, limit],
    });
    return result.rows.map((row) => ({
      id: row.id as string,
      similarity: row.similarity as number,
    }));
  } catch (error) {
    throw error;
  }
}

/**
 * Save or update agent state for a given thread and agent.
 * State data is stored as a JSON string.
 * @param memory_thread_id - The ID of the memory thread.
 * @param agent_id - The ID of the agent.
 * @param state_data - The agent's state object.
 * @returns The saved AgentState object (with state_data as an object).
 */
export async function saveAgentState(
  memory_thread_id: string,
  agent_id: string,
  state_data: Record<string, unknown>
): Promise<AgentState> {
  const agentStateData: NewAgentState = {
    memory_thread_id,
    agent_id,
    state_data: JSON.stringify(state_data),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const existingState = await crud.getAgentState(memory_thread_id, agent_id);
  if (existingState) {
    const updateData: Partial<NewAgentState> = {
      state_data: agentStateData.state_data,
      updated_at: agentStateData.updated_at,
    };
    return crud.updateAgentState(memory_thread_id, agent_id, updateData);
  } else {
    return crud.createAgentState(agentStateData);
  }
}

/**
 * Load agent state for a given thread and agent.
 * State data is parsed from JSON string to object.
 * @param memory_thread_id - The ID of the memory thread.
 * @param agent_id - The ID of the agent.
 * @returns The AgentState object or null if not found.
 */
export async function getAgentState(memory_thread_id: string, agent_id: string): Promise<AgentState | null> {
  const result = await crud.getAgentState(memory_thread_id, agent_id);
  if (!result) return null;

  return parseRowAndTransformJsonFields(result, AgentStateSchema, ['state_data'] as const);
}

/**
 * Get messages for a specific thread, validated and parsed.
 * Metadata is parsed from JSON string to object.
 * @param memory_thread_id - The ID of the memory thread.
 * @returns Array of Message objects.
 */
export async function getMessages(memory_thread_id: string): Promise<Message[]> {
  const result = await crud.getMessages(memory_thread_id);
  return result.map((row) => parseRowAndTransformJsonFields(row, MessageSchema, ['metadata'] as const));
}

/**
 * Load agent state for a given thread and agent.
 * State data is parsed from JSON string to object.
 * @param memory_thread_id - The ID of the memory thread.
 * @param agent_id - The ID of the agent.
 * @returns The AgentState object or null if not found.
 */
export async function loadAgentState(
  memory_thread_id: string,
  agent_id: string
): Promise<AgentState | null> {
  const client = createLibSQLClient();
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM agent_states WHERE memory_thread_id = ? AND agent_id = ?',
      args: [memory_thread_id, agent_id],
    });
    if (result.rows.length === 0) {
      return null;
    }
    return parseRowAndTransformJsonFields(result.rows[0], validation.agent_states, ['state_data']);
    'state_data',
    ]);
  } catch (error) {
    throw error;
  }
}

export { createLibSQLClient as getLibSQLClient };

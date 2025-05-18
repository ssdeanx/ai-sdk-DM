import {
  createClient,
  type Row,
  type Value,
  type InStatement,
} from '@libsql/client';
import { generateId } from 'ai'; // Standard ID generation

// Import all Zod schemas and their corresponding TypeScript types
import {
  MemoryThreadSchema,
  MessageSchema,
  EmbeddingSchema,
  AgentStateSchema,
  AppSchema,
  UserSchema,
  IntegrationSchema,
  AppCodeBlockSchema,
  FileSchema,
  TerminalSessionSchema,
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
  type NewMemoryThread,
  type NewMessage,
  type NewEmbedding,
  type NewAgentState,
  type NewApp,
  type NewUser,
  type NewIntegration,
  type NewAppCodeBlock,
  type NewFile,
  type NewTerminalSession,
} from '../../db/libsql/validation';

// Drizzle imports - currently unused by the raw SQL functions in this file.
// Kept to avoid removing existing code.
import {
  type MemoryThread as DbMemoryThread,
  type Message as DbMessage,
  type Embedding as DbEmbedding,
  type AgentState as DbAgentState,
  memory_threads,
  messages,
  embeddings,
  agent_states,
  type App as DbApp,
  type User as DbUser,
  type Integration as DbIntegration,
  type AppCodeBlock as DbAppCodeBlock,
  type File as DbFile,
  type TerminalSession as DbTerminalSession,
  apps as appsTable,
  users as usersTable,
  integrations as integrationsTable,
  app_code_blocks as appCodeBlocksTable,
  files as filesTable,
  terminal_sessions as terminalSessionsTable,
} from '../../db/libsql/schema';

/**
 * Helper to parse row and then parse specific JSON string fields into objects.
 * The Zod schema validates the DB representation (JSON fields as strings).
 * This function then transforms those string fields into objects for application use.
 * @param row The raw row from the database.
 * @param schema The Zod schema for the entity (expecting JSON fields as strings).
 * @param jsonFields Array of field names that are stored as JSON strings.
 * @returns The parsed and transformed entity.
 */
function parseRowAndTransformJsonFields<T extends Record<string, any>>(
  row: Row,
  schema: z.ZodType<T>,
  jsonFields: (keyof T)[] = []
): T {
  const rawDataForZod: Record<string, any> = { ...row };

  jsonFields.forEach((field) => {
    if (
      rawDataForZod[field as string] &&
      typeof rawDataForZod[field as string] === 'object'
    ) {
      rawDataForZod[field as string] = JSON.stringify(
        rawDataForZod[field as string]
      );
    }
  });

  const parsed = schema.safeParse(rawDataForZod);
  if (!parsed.success) {
    console.error(
      `Invalid DB data for ${schema.description || 'entity'}:`,
      parsed.error.format()
    );
    throw new Error(
      `Invalid database data structure for ${schema.description || 'entity'}: ${JSON.stringify(parsed.error.format())}`
    );
  }

  const result = { ...parsed.data };
  jsonFields.forEach((field) => {
    const key = field as keyof T;
    if (result[key] && typeof result[key] === 'string') {
      try {
        result[key] = JSON.parse(result[key] as string);
      } catch (e) {
        console.warn(
          `Failed to parse JSON string for field ${String(key)}: ${result[key]}`,
          e
        );
        result[key] = {} as any;
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
 * @param threadId - The ID of the memory thread.
 * @param role - The role of the message sender (e.g., 'user', 'assistant').
 * @param content - The content of the message.
 * @param metadata - Optional metadata object for the message.
 * @returns The created Message object (with metadata as an object).
 */
export async function addMemory(
  threadId: string,
  role: Message['role'],
  content: string,
  metadata?: Record<string, unknown>
): Promise<Message> {
  const client = createLibSQLClient();
  const id = generateId();
  const created_at = new Date().toISOString();

  const messageData: NewMessage = {
    id,
    memory_thread_id: threadId,
    role,
    content,
    metadata: metadata ? JSON.stringify(metadata) : null,
    created_at,
  };

  const parsedInput = MessageSchema.safeParse(messageData);
  if (!parsedInput.success) {
    throw new Error(
      `Invalid message data for addMemory: ${JSON.stringify(parsedInput.error.format())}`
    );
  }

  try {
    await client.execute({
      sql: 'INSERT INTO messages (id, memory_thread_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        parsedInput.data.id,
        parsedInput.data.memory_thread_id,
        parsedInput.data.role,
        parsedInput.data.content,
        parsedInput.data.metadata,
        parsedInput.data.created_at,
      ],
    });
    return parseRowAndTransformJsonFields(
      parsedInput.data as unknown as Row,
      MessageSchema,
      ['metadata']
    );
  } catch (error) {
    throw error;
  }
}

/**
 * Get all threads, validated and parsed.
 * Metadata is parsed from JSON string to object.
 * @returns Array of MemoryThread objects.
 */
export async function getThreads(): Promise<MemoryThread[]> {
  const client = createLibSQLClient();
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM memory_threads ORDER BY updated_at DESC',
      args: [],
    });
    return result.rows.map((row) =>
      parseRowAndTransformJsonFields(row, MemoryThreadSchema, ['metadata'])
    );
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a thread and all its messages.
 * @param threadId - The ID of the thread to delete.
 * @returns True if deletion was successful, false otherwise.
 */
export async function deleteThread(threadId: string): Promise<boolean> {
  const client = createLibSQLClient();
  try {
    await client.batch([
      {
        sql: 'DELETE FROM messages WHERE memory_thread_id = ?',
        args: [threadId],
      },
      { sql: 'DELETE FROM memory_threads WHERE id = ?', args: [threadId] },
    ]);
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
  const client = createLibSQLClient();
  const id = generateId();
  const created_at = new Date().toISOString();

  const embeddingData: NewEmbedding = {
    id,
    vector: new Uint8Array(vector.buffer),
    model,
    dimensions: dimensions ?? vector.length,
    created_at,
  };

  const parsedInput = EmbeddingSchema.safeParse(embeddingData);
  if (!parsedInput.success) {
    throw new Error(
      `Invalid embedding data: ${JSON.stringify(parsedInput.error.format())}`
    );
  }

  try {
    await client.execute({
      sql: 'INSERT INTO embeddings (id, vector, model, dimensions, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [
        parsedInput.data.id,
        parsedInput.data.vector,
        parsedInput.data.model,
        parsedInput.data.dimensions,
        parsedInput.data.created_at,
      ],
    });
    return parsedInput.data;
  } catch (error) {
    throw error;
  }
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
  const client = createLibSQLClient();
  const now = new Date().toISOString();
  const stateJson = JSON.stringify(state_data);

  const agentStateData: NewAgentState = {
    memory_thread_id,
    agent_id,
    state_data: stateJson,
    created_at: now,
    updated_at: now,
  };

  const parsedInput = AgentStateSchema.safeParse(agentStateData);
  if (!parsedInput.success) {
    throw new Error(
      `Invalid agent state data: ${JSON.stringify(parsedInput.error.format())}`
    );
  }

  try {
    await client.execute({
      sql: `
        INSERT INTO agent_states (memory_thread_id, agent_id, state_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(memory_thread_id, agent_id)
        DO UPDATE SET state_data = excluded.state_data, updated_at = excluded.updated_at
      `,
      args: [
        parsedInput.data.memory_thread_id,
        parsedInput.data.agent_id,
        parsedInput.data.state_data,
        now,
        now,
      ],
    });
    return parseRowAndTransformJsonFields(
      parsedInput.data as unknown as Row,
      AgentStateSchema,
      ['state_data']
    );
  } catch (error) {
    throw error;
  }
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
    return parseRowAndTransformJsonFields(result.rows[0], AgentStateSchema, [
      'state_data',
    ]);
  } catch (error) {
    throw error;
  }
}

export { createLibSQLClient as getLibSQLClient };

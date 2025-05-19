import { createClient } from '@libsql/client';
import { generateId } from 'ai';
import { DrizzleCrud } from '../../db/libsql/crud';
import type {
  MemoryThread,
  Message,
  Embedding,
  AgentState,
  NewMessage,
  NewEmbedding,
  NewAgentState,
  App,
  NewApp,
  User,
  NewUser,
  Integration,
  NewIntegration,
  AppCodeBlock,
  NewAppCodeBlock,
  File,
  NewFile,
  TerminalSession,
  NewTerminalSession,
  Workflow,
  NewWorkflow,
  WorkflowStep,
  NewWorkflowStep,
  GqlCache,
  NewGqlCache,
} from '../../db/libsql/validation';
import { drizzle } from 'drizzle-orm/libsql';

// Initialize database client and Drizzle CRUD
const dbClient = createClient({
  url: process.env.LIBSQL_URL!,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});
const db = drizzle(dbClient);
const crud = new DrizzleCrud(db);

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
 * Get all messages for a specific thread
 * @param threadId - The ID of the memory thread.
 * @returns Array of Message objects.
 */
export async function getMemory(threadId: string): Promise<Message[]> {
  const messages = await crud.getMessages(threadId);
  return messages.map((row) => {
    if (row.metadata && typeof row.metadata === 'string') {
      try {
        row.metadata = JSON.parse(row.metadata);
      } catch {}
    }
    return row;
  });
}

/**
 * Add a memory entry (message) to a thread
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
 * Get all threads
 * @returns Array of MemoryThread objects.
 */
export async function getThreads(): Promise<MemoryThread[]> {
  return crud.getMemoryThreads();
}

/**
 * Delete a thread and all its messages
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
 * Insert an embedding vector
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
    vector: new Uint8Array(vector.buffer as ArrayBuffer),
    model,
    dimensions: dimensions ?? vector.length,
    created_at: new Date().toISOString(),
  };
  return crud.createEmbedding(embeddingData);
}

/**
 * Save or update agent state for a given thread and agent
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
    const updated = await crud.updateAgentState(
      memory_thread_id,
      agent_id,
      updateData
    );
    if (!updated) throw new Error('Failed to update agent state');
    return updated;
  } else {
    const created = await crud.createAgentState(agentStateData);
    if (!created || !Array.isArray(created) || !created[0])
      throw new Error('Failed to create agent state');
    return created[0];
  }
}

/**
 * Load agent state for a given thread and agent
 * @param memory_thread_id - The ID of the memory thread.
 * @param agent_id - The ID of the agent.
 * @returns The AgentState object or null if not found.
 */
export async function getAgentState(
  memory_thread_id: string,
  agent_id: string
): Promise<AgentState | null> {
  const result = await crud.getAgentState(memory_thread_id, agent_id);
  if (!result) return null;
  if (result.state_data && typeof result.state_data === 'string') {
    try {
      result.state_data = JSON.parse(result.state_data);
    } catch {}
  }
  return result;
}

/**
 * Get messages for a specific thread
 * @param memory_thread_id - The ID of the memory thread.
 * @returns Array of Message objects.
 */
export async function getMessages(
  memory_thread_id: string
): Promise<Message[]> {
  const result = await crud.getMessages(memory_thread_id);
  return result.map((row) => {
    if (row.metadata && typeof row.metadata === 'string') {
      try {
        row.metadata = JSON.parse(row.metadata);
      } catch {}
    }
    return row;
  });
}

// --- Apps ---
// This is a CRUD interface for managing apps in the database.
// It provides functions to create, read, update, and delete app records.
// Each function interacts with the database through the crud object, which is responsible for interacting with the database.
// The functions are asynchronous and return promises that resolve to the result of the database operation.
export async function createApp(data: NewApp): Promise<App> {
  // Validate data if needed (assuming validation is handled in crud)
  const result = await crud.createApp(data);
  if (!result) throw new Error('Failed to create app');
  return result;
}

export async function getApp(id: string): Promise<App | null> {
  const result = await crud.getApp(id);
  if (!result) return null;
  return result;
}

export async function listApps(): Promise<App[]> {
  const result = await crud.listApps();
  return result;
}

export async function updateApp(
  id: string,
  data: Partial<NewApp>
): Promise<App | null> {
  // Fetch current app to merge with update data
  const current = await crud.getApp(id);
  if (!current) return null;
  const updated = await crud.updateApp(id, data);
  return updated;
}

export async function deleteApp(id: string): Promise<boolean> {
  const result = await crud.deleteApp(id);
  return result;
}

// --- Users ---
// This is a CRUD interface for managing users in the database.
// It provides functions to create, read, update, and delete user records.
// Each function interacts with the database through the crud object, which is responsible for interacting with the database.
// The functions are asynchronous and return promises that resolve to the result of the database operation.
// The createUser function creates a new user in the database.
export async function createUser(data: NewUser): Promise<User> {
  const result = await crud.createUser(data);
  if (!result) throw new Error('Failed to create user');
  return result;
}
export async function getUser(id: string): Promise<User | null> {
  const result = await crud.getUser(id);
  if (!result) return null;
  return result;
}
export async function listUsers(): Promise<User[]> {
  const result = await crud.listUsers();
  return result;
}
export async function updateUser(
  id: string,
  data: Partial<NewUser>
): Promise<User | null> {
  const current = await crud.getUser(id);
  if (!current) return null;
  const updated = await crud.updateUser(id, data);
  return updated;
}
export async function deleteUser(id: string): Promise<boolean> {
  const result = await crud.deleteUser(id);
  return result;
}

// --- Integrations ---
// Create a new integration
// This function creates a new integration in the database
// and returns the created integration object.
// It takes a NewIntegration object as input and returns an Integration object.
// The function uses the crud.createIntegration method to perform the database operation.
// The function throws an error if the creation fails.
// The function is asynchronous and returns a Promise.
export async function createIntegration(
  data: NewIntegration
): Promise<Integration> {
  const result = await crud.createIntegration(data);
  if (!result) throw new Error('Failed to create integration');
  return result;
}

export async function getIntegration(id: string): Promise<Integration | null> {
  const result = await crud.getIntegration(id);
  if (!result) return null;
  return result;
}

export async function getIntegrationsByUserId(
  userId: string
): Promise<Integration[]> {
  const result = await crud.getIntegrationsByUserId(userId);
  return result;
}

export async function updateIntegration(
  id: string,
  data: Partial<NewIntegration>
): Promise<Integration | null> {
  const updated = await crud.updateIntegration(id, data);
  return updated;
}

export async function deleteIntegration(id: string): Promise<boolean> {
  try {
    await crud.deleteIntegration(id);
    return true; // If no error, deletion is considered successful.
  } catch {
    // Log error as per project standards (using console.error as placeholder)
    return false; // Indicate failure by returning false.
  }
}

// --- App Code Blocks ---
/**
 * Create a new app code block
 * @param data - The new app code block data
 * @returns The created AppCodeBlock object
 */
export async function createAppCodeBlock(
  data: NewAppCodeBlock
): Promise<AppCodeBlock> {
  const result = await crud.createAppCodeBlock(data);
  if (!result) throw new Error('Failed to create app code block');
  return result;
}

/**
 * Delete an app code block by ID
 * @param id - The code block ID
 * @returns True if deleted, false otherwise
 */
export async function deleteAppCodeBlock(id: string): Promise<boolean> {
  return crud.deleteAppCodeBlock(id);
}

/**
 * Get all app code blocks for a given app ID
 * @param appId - The app ID
 * @returns Array of AppCodeBlock
 */
export async function getAppCodeBlocksByAppId(
  appId: string
): Promise<AppCodeBlock[]> {
  return crud.getAppCodeBlocks(appId);
}

/**
 * Get an app code block by ID
 * @param id - The code block ID
 * @returns The AppCodeBlock or null if not found
 */
export async function getAppCodeBlock(
  id: string
): Promise<AppCodeBlock | null> {
  return crud.getAppCodeBlock(id);
}

/**
 * List all app code blocks for a given app ID
 * @param appId - The app ID
 * @returns Array of AppCodeBlock
 */
export async function listAppCodeBlocks(
  appId: string
): Promise<AppCodeBlock[]> {
  return crud.listAppCodeBlocks(appId);
}

/**
 * Update an app code block by ID
 * @param id - The code block ID
 * @param data - Partial update data for the code block
 * @returns The updated AppCodeBlock or null if not found
 */
export async function updateAppCodeBlock(
  id: string,
  data: Partial<NewAppCodeBlock>
): Promise<AppCodeBlock | null> {
  return crud.updateAppCodeBlock(id, data);
}

/**
 * Create a new file
 * @param data - The new file data
 * @returns The created File object
 */
export async function createFile(data: NewFile): Promise<File> {
  const result = await crud.createFile(data);
  if (!result) throw new Error('Failed to create file');
  return result;
}

/**
 * Get a file by ID
 * @param id - The file ID
 * @returns The File or null if not found
 */
export async function getFile(id: string): Promise<File | null> {
  return crud.getFile(id);
}

/**
 * Get all files for a given app ID
 * @param appId - The app ID
 * @returns Array of File
 */
export async function getFilesByAppId(appId: string): Promise<File[]> {
  return crud.getFilesByAppId(appId);
}

/**
 * Update a file by ID
 * @param id - The file ID
 * @param data - Partial update data for the file
 * @returns The updated File or null if not found
 */
export async function updateFile(
  id: string,
  data: Partial<NewFile>
): Promise<File | null> {
  return crud.updateFile(id, data);
}

/**
 * Delete a file by ID
 * @param id - The file ID
 * @returns True if deleted, false otherwise
 */
export async function deleteFile(id: string): Promise<boolean> {
  return crud.deleteFile(id);
}

// --- Terminal Sessions ---
/**
 * Create a new terminal session
 * @param data - The new terminal session data
 * @returns The created TerminalSession object
 */
export async function createTerminalSession(
  data: NewTerminalSession
): Promise<TerminalSession> {
  return crud.createTerminalSession(data);
}

/**
 * Get a terminal session by ID
 * @param id - The terminal session ID
 * @returns The TerminalSession or null if not found
 */
export async function getTerminalSession(
  id: string
): Promise<TerminalSession | null> {
  return crud.getTerminalSession(id);
}

/**
 * Get all terminal sessions for a given app ID
 * @param appId - The app ID
 * @returns Array of TerminalSession
 */
export async function getTerminalSessionsByAppId(
  appId: string
): Promise<TerminalSession[]> {
  return crud.getTerminalSessionsByAppId(appId);
}

/**
 * Update a terminal session by ID
 * @param id - The terminal session ID
 * @param data - Partial update data for the terminal session
 * @returns The updated TerminalSession or null if not found
 */
export async function updateTerminalSession(
  id: string,
  data: Partial<NewTerminalSession>
): Promise<TerminalSession | null> {
  return crud.updateTerminalSession(id, data);
}

/**
 * Delete a terminal session by ID
 * @param id - The terminal session ID
 * @returns True if deleted, false otherwise
 */
export async function deleteTerminalSession(id: string): Promise<boolean> {
  return crud.deleteTerminalSession(id);
}

// --- Workflows ---
/**
 * Create a new workflow
 * @param data - The new workflow data
 * @returns The created Workflow object
 */
export async function createWorkflow(data: NewWorkflow): Promise<Workflow> {
  const result = await crud.createWorkflow(data);
  if (!result) throw new Error('Failed to create workflow');
  return result;
}

/**
 * Get a workflow by ID
 * @param id - The workflow ID
 * @returns The Workflow or null if not found
 */
export async function getWorkflow(id: string): Promise<Workflow | null> {
  return crud.getWorkflow(id);
}

/**
 * List all workflows
 * @returns Array of Workflow
 */
export async function listWorkflows(): Promise<Workflow[]> {
  return crud.listWorkflows();
}

/**
 * Update a workflow by ID
 * @param id - The workflow ID
 * @param data - Partial update data for the workflow
 * @returns The updated Workflow or null if not found
 */
export async function updateWorkflow(
  id: string,
  data: Partial<NewWorkflow>
): Promise<Workflow | null> {
  return crud.updateWorkflow(id, data);
}

/**
 * Delete a workflow by ID
 * @param id - The workflow ID
 * @returns True if deleted, false otherwise
 */
export async function deleteWorkflow(id: string): Promise<boolean> {
  return crud.deleteWorkflow(id);
}

// --- Workflow Steps ---
/**
 * Create a new workflow step
 * @param data - The new workflow step data
 * @returns The created WorkflowStep object
 */
export async function createWorkflowStep(
  data: NewWorkflowStep
): Promise<WorkflowStep> {
  const result = await crud.createWorkflowStep(data);
  if (!result) throw new Error('Failed to create workflow step');
  return result;
}

/**
 * Get a workflow step by ID
 * @param id - The workflow step ID
 * @returns The WorkflowStep or null if not found
 */
export async function getWorkflowStep(
  id: string
): Promise<WorkflowStep | null> {
  return crud.getWorkflowStep(id);
}

/**
 * List all workflow steps for a workflow
 * @param workflowId - The workflow ID
 * @returns Array of WorkflowStep
 */
export async function listWorkflowSteps(
  workflowId: string
): Promise<WorkflowStep[]> {
  return crud.listWorkflowSteps(workflowId);
}

/**
 * Update a workflow step by ID
 * @param id - The workflow step ID
 * @param data - Partial update data for the workflow step
 * @returns The updated WorkflowStep or null if not found
 */
export async function updateWorkflowStep(
  id: string,
  data: Partial<NewWorkflowStep>
): Promise<WorkflowStep | null> {
  return crud.updateWorkflowStep(id, data);
}

/**
 * Delete a workflow step by ID
 * @param id - The workflow step ID
 * @returns True if deleted, false otherwise
 */
export async function deleteWorkflowStep(id: string): Promise<boolean> {
  return crud.deleteWorkflowStep(id);
}

// --- GqlCache ---
/**
 * Create a new GqlCache entry
 * @param data - The new GqlCache data
 * @returns The created GqlCache object
 */
export async function createGqlCache(data: NewGqlCache): Promise<GqlCache> {
  const result = await crud.createGqlCache(data);
  if (!result) throw new Error('Failed to create GqlCache');
  return result;
}

/**
 * Get a GqlCache entry by ID
 * @param id - The GqlCache ID
 * @returns The GqlCache or null if not found
 */
export async function getGqlCache(id: string): Promise<GqlCache | null> {
  return crud.getGqlCache(id);
}

/**
 * List all GqlCache entries
 * @returns Array of GqlCache
 */
export async function listGqlCache(): Promise<GqlCache[]> {
  return crud.listGqlCache();
}

/**
 * Update a GqlCache entry by ID
 * @param id - The GqlCache ID
 * @param data - Partial update data for the GqlCache
 * @returns The updated GqlCache or null if not found
 */
export async function updateGqlCache(
  id: string,
  data: Partial<NewGqlCache>
): Promise<GqlCache | null> {
  return crud.updateGqlCache(id, data);
}

/**
 * Delete a GqlCache entry by ID
 * @param id - The GqlCache ID
 * @returns True if deleted, false otherwise
 */
export async function deleteGqlCache(id: string): Promise<boolean> {
  return crud.deleteGqlCache(id);
}

export { createLibSQLClient as getLibSQLClient };
export { isLibSQLAvailable as checkLibSQLAvailability };

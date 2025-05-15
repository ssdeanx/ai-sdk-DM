import { getRedisClient } from './upstashClients';
import { generateId } from 'ai';
import { AgentState } from '../../agents/agent.types';
import { z } from 'zod'; // Add zod import
import { RediSearchHybridQuery, QStashTaskPayload, WorkflowNode } from './upstashTypes';
import { runRediSearchHybridQuery, enqueueQStashTask, trackWorkflowNode } from './upstashClients';

// --- Constants for Redis Keys ---
const AGENT_STATE_PREFIX = "agent:state:";
const AGENT_STATE_INDEX = "agent:states"; // Sorted set for all agent states, scored by last update timestamp
const THREAD_AGENT_STATES_PREFIX = "thread:"; // Prefix for thread-specific agent states
const THREAD_AGENT_STATES_SUFFIX = ":agent_states"; // Suffix for thread-specific agent states

// --- Zod Schemas ---

/**
 * Schema for agent state
 */
export const AgentStateSchema = z.object({
  // Define known fields explicitly
  _thread_id: z.string().optional(),
  _agent_id: z.string().optional(),
  _created_at: z.string().optional(),
  _updated_at: z.string().optional()
}).catchall(z.any()); // Allow any other fields

/**
 * Schema for agent state with required fields
 */
export const StoredAgentStateSchema = AgentStateSchema.extend({
  _thread_id: z.string(),
  _agent_id: z.string(),
  _updated_at: z.string()
});

// --- Error Handling ---
export class AgentStateStoreError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "AgentStateStoreError";
    Object.setPrototypeOf(this, AgentStateStoreError.prototype);
  }
}

/**
 * Validates agent state using Zod schema
 * 
 * @param state - Agent state to validate
 * @returns Validated agent state
 * @throws AgentStateStoreError if validation fails
 */
function validateAgentState(state: unknown): AgentState {
  try {
    // First ensure it's an object
    if (typeof state !== 'object' || state === null) {
      throw new AgentStateStoreError('Agent state must be an object');
    }
    
    // Then validate with Zod
    return AgentStateSchema.parse(state) as AgentState;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AgentStateStoreError(`Invalid agent state: ${error.message}`, error);
    }
    throw error;
  }
}

/**
 * Saves agent state for a memory thread
 * @param threadId The thread ID
 * @param agentId The agent ID
 * @param state The agent state to save
 * @param ttl Optional TTL in seconds for the state
 * @returns A promise that resolves when the state is saved
 * @throws AgentStateStoreError if saving fails
 */
export async function saveAgentState(
  threadId: string,
  agentId: string,
  state: AgentState,
  ttl?: number
): Promise<void> {
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  if (!agentId) throw new AgentStateStoreError('Agent ID is required');
  
  const redis = getRedisClient();
  const stateKey = `${AGENT_STATE_PREFIX}${threadId}:${agentId}`;
  const threadStatesKey = `${THREAD_AGENT_STATES_PREFIX}${threadId}${THREAD_AGENT_STATES_SUFFIX}`;
  const now = Date.now();
  
  try {
    // Validate the state
    validateAgentState(state);
    
    // Prepare state data with timestamps
    const stateData = {
      ...state,
      _thread_id: threadId,
      _agent_id: agentId,
      _updated_at: new Date().toISOString(),
      _created_at: (state as any)._created_at || new Date().toISOString()
    };
    
    // Serialize state
    const stateJson = JSON.stringify(stateData);
    
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Save state
    pipeline.set(stateKey, stateJson);
    
    // Set TTL if provided
    if (ttl && ttl > 0) {
      pipeline.expire(stateKey, ttl);
    }
    
    // Add to thread's agent states set
    pipeline.sadd(threadStatesKey, agentId);
    
    // Update global index with timestamp
    pipeline.zadd(AGENT_STATE_INDEX, { score: now, member: `${threadId}:${agentId}` });
    
    // Execute pipeline
    const results = await pipeline.exec();
    
    // Check for pipeline execution errors
    if (results.some(result => result instanceof Error)) {
      const errors = results.filter(result => result instanceof Error);
      throw new Error(`Pipeline execution failed: ${errors.map(e => e.message).join(', ')}`);
    }
  } catch (error) {
    console.error(`Error saving agent state for thread ${threadId}, agent ${agentId}:`, error);
    throw new AgentStateStoreError(`Failed to save agent state for thread ${threadId}, agent ${agentId}`, error);
  }
}
/**
 * Loads agent state for a memory thread
 * @param threadId The thread ID
 * @param agentId The agent ID
 * @returns A promise that resolves with the agent state, or an empty object if not found
 * @throws AgentStateStoreError if loading fails
 */
export async function loadAgentState(
  threadId: string,
  agentId: string
): Promise<AgentState> {
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  if (!agentId) throw new AgentStateStoreError('Agent ID is required');
  
  const redis = getRedisClient();
  const stateKey = `${AGENT_STATE_PREFIX}${threadId}:${agentId}`;
  
  try {
    const stateJson = await redis.get(stateKey);
    
    if (!stateJson) {
      return {};
    }
    
    // Parse state
    let state: AgentState;
    try {
      state = JSON.parse(stateJson as string) as AgentState;
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      throw new AgentStateStoreError(`Failed to parse agent state JSON: ${error.message}`, error);
    }
    
    // Validate the state
    validateAgentState(state);
    
    // Update access timestamp
    await redis.zadd(AGENT_STATE_INDEX, { score: Date.now(), member: `${threadId}:${agentId}` });
    
    return state;
  } catch (error) {
    console.error(`Error loading agent state for thread ${threadId}, agent ${agentId}:`, error);
    throw new AgentStateStoreError(`Failed to load agent state for thread ${threadId}, agent ${agentId}`, error);
  }
}
/**
 * Lists all agent states for a thread
 * @param threadId The thread ID
 * @returns A promise that resolves with an array of agent IDs with states for this thread
 * @throws AgentStateStoreError if listing fails
 */
export async function listThreadAgentStates(threadId: string): Promise<string[]> {
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  
  const redis = getRedisClient();
  const threadStatesKey = `${THREAD_AGENT_STATES_PREFIX}${threadId}${THREAD_AGENT_STATES_SUFFIX}`;
  
  try {
    const agentIds = await redis.smembers(threadStatesKey);
    return agentIds as string[];
  } catch (error) {
    console.error(`Error listing agent states for thread ${threadId}:`, error);
    throw new AgentStateStoreError(`Failed to list agent states for thread ${threadId}`, error);
  }
}

/**
 * Deletes agent state for a memory thread
 * @param threadId The thread ID
 * @param agentId The agent ID
 * @returns A promise that resolves with true if the state was deleted, false if it didn't exist
 * @throws AgentStateStoreError if deletion fails
 */
export async function deleteAgentState(
  threadId: string,
  agentId: string
): Promise<boolean> {
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  if (!agentId) throw new AgentStateStoreError('Agent ID is required');
  
  const redis = getRedisClient();
  const stateKey = `${AGENT_STATE_PREFIX}${threadId}:${agentId}`;
  const threadStatesKey = `${THREAD_AGENT_STATES_PREFIX}${threadId}${THREAD_AGENT_STATES_SUFFIX}`;
  
  try {
    // Check if state exists
    const exists = await redis.exists(stateKey);
    
    if (!exists) {
      return false;
    }
    
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Delete state
    pipeline.del(stateKey);
    
    // Remove from thread's agent states set
    pipeline.srem(threadStatesKey, agentId);
    
    // Remove from global index
    pipeline.zrem(AGENT_STATE_INDEX, `${threadId}:${agentId}`);
    
    // Execute pipeline
    const results = await pipeline.exec();
    
    // Check for pipeline execution errors
    if (results.some(result => result instanceof Error)) {
      const errors = results.filter(result => result instanceof Error);
      throw new Error(`Pipeline execution failed: ${errors.map(e => e.message).join(', ')}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting agent state for thread ${threadId}, agent ${agentId}:`, error);
    throw new AgentStateStoreError(`Failed to delete agent state for thread ${threadId}, agent ${agentId}`, error);
  }
}

/**
 * Deletes all agent states for a thread
 * @param threadId The thread ID
 * @returns A promise that resolves with the number of states deleted
 * @throws AgentStateStoreError if deletion fails
 */
export async function deleteThreadAgentStates(threadId: string): Promise<number> {
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  
  const redis = getRedisClient();
  const threadStatesKey = `${THREAD_AGENT_STATES_PREFIX}${threadId}${THREAD_AGENT_STATES_SUFFIX}`;
  
  try {
    // Get all agent IDs for this thread
    const agentIds = await redis.smembers(threadStatesKey) as string[];
    
    if (agentIds.length === 0) {
      return 0;
    }
    
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Delete each state
    for (const agentId of agentIds) {
      const stateKey = `${AGENT_STATE_PREFIX}${threadId}:${agentId}`;
      pipeline.del(stateKey);
      pipeline.zrem(AGENT_STATE_INDEX, `${threadId}:${agentId}`);
    }
    
    // Delete the thread's agent states set
    pipeline.del(threadStatesKey);
    
    // Execute pipeline
    const results = await pipeline.exec();
    
    // Check for pipeline execution errors
    if (results.some(result => result instanceof Error)) {
      const errors = results.filter(result => result instanceof Error);
      throw new Error(`Pipeline execution failed: ${errors.map(e => e.message).join(', ')}`);
    }
    
    return agentIds.length;
  } catch (error) {
    console.error(`Error deleting all agent states for thread ${threadId}:`, error);
    throw new AgentStateStoreError(`Failed to delete all agent states for thread ${threadId}`, error);
  }
}

/**
 * Creates a new agent state with a generated ID
 * @param threadId The thread ID
 * @param initialState Optional initial state
 * @param ttl Optional TTL in seconds for the state
 * @returns A promise that resolves with the agent ID and state
 * @throws AgentStateStoreError if creation fails
 */
export async function createAgentState(
  threadId: string,
  initialState: AgentState = {},
  ttl?: number
): Promise<{ agentId: string; state: AgentState }> {
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  
  try {
    // Generate a new agent ID
    const agentId = generateId();
    
    // Validate initial state if provided
    if (Object.keys(initialState).length > 0) {
      validateAgentState(initialState);
    }
    
    // Create the complete state
    const completeState: AgentState = {
      ...initialState,
      _thread_id: threadId,
      _agent_id: agentId,
      _created_at: new Date().toISOString(),
      _updated_at: new Date().toISOString()
    };
    
    // Save the state
    await saveAgentState(threadId, agentId, completeState, ttl);
    
    // Return the agent ID and state
    return {
      agentId,
      state: completeState
    };
  } catch (error) {
    console.error(`Error creating agent state for thread ${threadId}:`, error);
    throw new AgentStateStoreError(`Failed to create agent state for thread ${threadId}`, error);
  }
}

/**
 * Gets all agent states across all threads
 * @param limit Optional limit on the number of states to return
 * @param offset Optional offset for pagination
 * @returns A promise that resolves with an array of agent states
 * @throws AgentStateStoreError if fetching fails
 */
export async function getAllAgentStates(
  limit?: number,
  offset?: number
): Promise<Array<AgentState & { _thread_id: string; _agent_id: string }>> {
  const redis = getRedisClient();
  
  try {
    // Get all agent state keys from the index, sorted by last update time
    const stateKeys = await redis.zrange(AGENT_STATE_INDEX, 0, -1, { rev: true });
    
    // Apply pagination if specified
    const paginatedKeys = stateKeys.slice(offset || 0, limit ? (offset || 0) + limit : undefined);
    
    if (paginatedKeys.length === 0) {
      return [];
    }
    
    // Get all states
    const pipeline = redis.pipeline();
    for (const key of paginatedKeys as string[]) {
      const [threadId, agentId] = key.split(':');
      pipeline.get(`${AGENT_STATE_PREFIX}${threadId}:${agentId}`);
    }
    
    const stateJsons = await pipeline.exec();
    
    // Parse states
    const states = stateJsons
      .filter((json): json is string => json !== null && typeof json === 'string')
      .map(json => {
        try {
          return JSON.parse(json) as AgentState & { _thread_id: string; _agent_id: string };
        } catch (error) {
          console.error('Error parsing agent state JSON:', error);
          return null;
        }
      })
      .filter((state): state is AgentState & { _thread_id: string; _agent_id: string } => 
        state !== null && typeof state === 'object' && '_thread_id' in state && '_agent_id' in state
      );
    
    return states;
  } catch (error) {
    console.error('Error getting all agent states:', error);
    throw new AgentStateStoreError('Failed to get all agent states', error);
  }
}

// --- Advanced RediSearch/Hybrid Search ---
export async function advancedAgentStateHybridSearch(query: RediSearchHybridQuery) {
  return runRediSearchHybridQuery(query);
}

// --- QStash/Workflow Integration Example ---
export async function enqueueAgentStateWorkflow(type: string, data: Record<string, unknown>) {
  const payload: QStashTaskPayload = {
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    type,
    data,
    created_at: new Date().toISOString(),
    status: 'pending',
  };
  return enqueueQStashTask(payload);
}

export async function trackAgentStateWorkflowNode(node: WorkflowNode) {
  return trackWorkflowNode(node);
}
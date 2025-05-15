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
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "AgentStateStoreError";
    Object.setPrototypeOf(this, AgentStateStoreError.prototype);
  }
}

function toLoggerError(err: unknown): Error | { error: string } {
  if (err instanceof Error) return err;
  return { error: String(err) };
}

// --- Validate agent state using Zod schema ---
function validateAgentState(state: unknown): AgentState {
  try {
    if (typeof state !== 'object' || state === null) {
      throw new AgentStateStoreError('Agent state must be an object');
    }
    return AgentStateSchema.parse(state) as AgentState;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AgentStateStoreError(`Invalid agent state: ${error.message}`, error);
    }
    throw error;
  }
}

// --- Save agent state ---
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
    validateAgentState(state);
    const stateData = {
      ...state,
      _thread_id: threadId,
      _agent_id: agentId,
      _updated_at: new Date().toISOString(),
      _created_at: (state as Record<string, unknown>)._created_at || new Date().toISOString()
    };
    const stateJson = JSON.stringify(stateData);
    const pipeline = redis.pipeline();
    pipeline.set(stateKey, stateJson);
    if (ttl && ttl > 0) pipeline.expire(stateKey, ttl);
    pipeline.sadd(threadStatesKey, agentId);
    pipeline.zadd(AGENT_STATE_INDEX, { score: now, member: `${threadId}:${agentId}` });
    const results = await pipeline.exec();
    if (results.some((result: unknown) => result instanceof Error)) {
      const errors = results.filter((result: unknown) => result instanceof Error) as Error[];
      throw new AgentStateStoreError(`Pipeline execution failed: ${errors.map(e => e.message).join(', ')}`);
    }
  } catch (error) {
    throw new AgentStateStoreError(`Failed to save agent state for thread ${threadId}, agent ${agentId}`, toLoggerError(error));
  }
}

// --- Load agent state ---
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
    if (!stateJson) return {};
    let state: AgentState;
    try {
      state = JSON.parse(stateJson as string) as AgentState;
    } catch (e: unknown) {
      throw new AgentStateStoreError(`Failed to parse agent state JSON: ${toLoggerError(e)}`);
    }
    validateAgentState(state);
    await redis.zadd(AGENT_STATE_INDEX, { score: Date.now(), member: `${threadId}:${agentId}` });
    return state;
  } catch (error) {
    throw new AgentStateStoreError(`Failed to load agent state for thread ${threadId}, agent ${agentId}`, toLoggerError(error));
  }
}

// --- List all agent states for a thread ---
export async function listThreadAgentStates(threadId: string): Promise<string[]> {
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  const redis = getRedisClient();
  const threadStatesKey = `${THREAD_AGENT_STATES_PREFIX}${threadId}${THREAD_AGENT_STATES_SUFFIX}`;
  try {
    const agentIds = await redis.smembers(threadStatesKey);
    return agentIds as string[];
  } catch (error) {
    throw new AgentStateStoreError(`Failed to list agent states for thread ${threadId}`, toLoggerError(error));
  }
}

// --- Delete agent state for a thread ---
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
    const exists = await redis.exists(stateKey);
    if (!exists) return false;
    const pipeline = redis.pipeline();
    pipeline.del(stateKey);
    pipeline.srem(threadStatesKey, agentId);
    pipeline.zrem(AGENT_STATE_INDEX, `${threadId}:${agentId}`);
    const results = await pipeline.exec();
    if (results.some((result: unknown) => result instanceof Error)) {
      const errors = results.filter((result: unknown) => result instanceof Error) as Error[];
      throw new AgentStateStoreError(`Pipeline execution failed: ${errors.map(e => e.message).join(', ')}`);
    }
    return true;
  } catch (error) {
    throw new AgentStateStoreError(`Failed to delete agent state for thread ${threadId}, agent ${agentId}`, toLoggerError(error));
  }
}

// --- Delete all agent states for a thread ---
export async function deleteThreadAgentStates(threadId: string): Promise<number> {
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  const redis = getRedisClient();
  const threadStatesKey = `${THREAD_AGENT_STATES_PREFIX}${threadId}${THREAD_AGENT_STATES_SUFFIX}`;
  try {
    const agentIds = await redis.smembers(threadStatesKey) as string[];
    if (agentIds.length === 0) return 0;
    const pipeline = redis.pipeline();
    for (const agentId of agentIds) {
      const stateKey = `${AGENT_STATE_PREFIX}${threadId}:${agentId}`;
      pipeline.del(stateKey);
      pipeline.zrem(AGENT_STATE_INDEX, `${threadId}:${agentId}`);
    }
    pipeline.del(threadStatesKey);
    const results = await pipeline.exec();
    if (results.some((result: unknown) => result instanceof Error)) {
      const errors = results.filter((result: unknown) => result instanceof Error) as Error[];
      throw new AgentStateStoreError(`Pipeline execution failed: ${errors.map(e => e.message).join(', ')}`);
    }
    return agentIds.length;
  } catch (error) {
    throw new AgentStateStoreError(`Failed to delete all agent states for thread ${threadId}`, toLoggerError(error));
  }
}

// --- Create a new agent state with a generated ID ---
export async function createAgentState(
  threadId: string,
  initialState: AgentState = {},
  ttl?: number
): Promise<{ agentId: string; state: AgentState }> {
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  try {
    const agentId = generateId();
    if (Object.keys(initialState).length > 0) {
      validateAgentState(initialState);
    }
    const completeState: AgentState = {
      ...initialState,
      _thread_id: threadId,
      _agent_id: agentId,
      _created_at: new Date().toISOString(),
      _updated_at: new Date().toISOString()
    };
    await saveAgentState(threadId, agentId, completeState, ttl);
    return { agentId, state: completeState };
  } catch (error) {
    throw new AgentStateStoreError(`Failed to create agent state for thread ${threadId}`, toLoggerError(error));
  }
}

// --- Get all agent states across all threads ---
export async function getAllAgentStates(
  limit?: number,
  offset?: number
): Promise<Array<AgentState & { _thread_id: string; _agent_id: string }>> {
  const redis = getRedisClient();
  try {
    const stateKeys = await redis.zrange(AGENT_STATE_INDEX, 0, -1, { rev: true });
    const paginatedKeys = stateKeys.slice(offset || 0, limit ? (offset || 0) + limit : undefined);
    if (paginatedKeys.length === 0) return [];
    const pipeline = redis.pipeline();
    for (const key of paginatedKeys as string[]) {
      const [threadId, agentId] = key.split(':');
      pipeline.get(`${AGENT_STATE_PREFIX}${threadId}:${agentId}`);
    }
    const stateJsons = await pipeline.exec();
    const states = (stateJsons as Array<string | null>)
      .filter((json): json is string => json !== null && typeof json === 'string')
      .map(json => {
        try {
          return JSON.parse(json) as AgentState & { _thread_id: string; _agent_id: string };
        } catch {
          return null;
        }
      })
      .filter((state): state is AgentState & { _thread_id: string; _agent_id: string } =>
        state !== null && typeof state === 'object' && '_thread_id' in state && '_agent_id' in state
      );
    return states;
  } catch (error) {
    throw new AgentStateStoreError('Failed to get all agent states', toLoggerError(error));
  }
}

// --- Advanced RediSearch/Hybrid Search ---
export async function advancedAgentStateHybridSearch(query: RediSearchHybridQuery) {
  return runRediSearchHybridQuery(query);
}

// --- QStash/Workflow Integration Example ---
export async function enqueueAgentStateWorkflow(type: string, data: Record<string, unknown>) {
  const payload: QStashTaskPayload = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
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
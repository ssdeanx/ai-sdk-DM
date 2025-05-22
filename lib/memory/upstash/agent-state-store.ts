import { getRedisClient } from './upstashClients';
import { generateId } from 'ai';
import { AgentState } from '../../agents/agent.types'; // Public interface type
import { z } from 'zod';
import {
  AgentStateEntity, // Centralized type for Redis storage
  AgentStateEntitySchema, // Centralized Zod schema for validation
  RediSearchHybridQuery,
  QStashTaskPayload,
  WorkflowNode,
} from '../../../types/upstashTypes';
import {
  runRediSearchHybridQuery,
  enqueueQStashTask,
  trackWorkflowNode,
} from './upstashClients';

// --- Constants for Redis Keys ---
const AGENT_STATE_PREFIX = 'agent:state:';
const AGENT_STATE_INDEX = 'agent:states'; // Sorted set for all agent states, scored by last update timestamp
const THREAD_AGENT_STATES_PREFIX = 'thread:'; // Prefix for thread-specific agent states
const THREAD_AGENT_STATES_SUFFIX = ':agent_states'; // Suffix for thread-specific agent states

// --- Zod Schemas ---
// Local AgentStateSchema and StoredAgentStateSchema are removed.
// Using AgentStateEntitySchema from upstashTypes.ts for validation before storage.

// --- Error Handling ---
export class AgentStateStoreError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'AgentStateStoreError';
    Object.setPrototypeOf(this, AgentStateStoreError.prototype);
  }
}

function toLoggerError(err: unknown): Error | { error: string } {
  if (err instanceof Error) return err;
  return { error: String(err) };
}

// Local validateAgentState function is removed as validation will be done against AgentStateEntitySchema.

// --- Save agent state ---
export async function saveAgentState(
  threadId: string,
  agentId: string,
  state: AgentState, // Public interface uses AgentState
  ttl?: number
): Promise<void> {
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  if (!agentId) throw new AgentStateStoreError('Agent ID is required');
  const redis = getRedisClient();
  const stateKey = `${AGENT_STATE_PREFIX}${threadId}:${agentId}`;
  const threadStatesKey = `${THREAD_AGENT_STATES_PREFIX}${threadId}${THREAD_AGENT_STATES_SUFFIX}`;
  const now = new Date().toISOString();
  const recordId = generateId(); // ID for the AgentStateEntity record

  try {
    // Construct the AgentStateEntity
    const agentStateEntity: AgentStateEntity = {
      id: recordId,
      type: 'agent_state',
      thread_id: threadId,
      agent_id: agentId,
      state: state, // The AgentState object goes into the 'state' property
      created_at: now, // Assuming new save might imply new creation time or fetch existing to preserve
      updated_at: now,
      metadata: { source: 'saveAgentState' }, // Optional metadata
    };

    // Attempt to load existing to preserve created_at
    const existingJson = await redis.get(stateKey);
    if (existingJson) {
      try {
        const existingEntity = AgentStateEntitySchema.parse(JSON.parse(existingJson as string));
        agentStateEntity.created_at = existingEntity.created_at; // Preserve original creation time
        agentStateEntity.id = existingEntity.id; // Preserve original ID
      } catch (e) {
        // If parsing fails, it's a corrupted record or old format. Overwrite with new.
        console.warn(`Failed to parse existing agent state for ${stateKey}, overwriting. Error: ${e}`);
      }
    }
    
    // Validate the entity before saving
    const validatedEntity = AgentStateEntitySchema.parse(agentStateEntity);
    const stateJson = JSON.stringify(validatedEntity);

    const pipeline = redis.pipeline();
    pipeline.set(stateKey, stateJson);
    if (ttl && ttl > 0) pipeline.expire(stateKey, ttl);
    pipeline.sadd(threadStatesKey, agentId);
    pipeline.zadd(AGENT_STATE_INDEX, {
      score: now,
      member: `${threadId}:${agentId}`,
    });
    const results = await pipeline.exec();
    if (results.some((result: unknown) => result instanceof Error)) {
      const errors = results.filter(
        (result: unknown) => result instanceof Error
      ) as Error[];
      throw new AgentStateStoreError(
        `Pipeline execution failed: ${errors.map((e) => e.message).join(', ')}`
      );
    }
  } catch (error) {
    throw new AgentStateStoreError(
      `Failed to save agent state for thread ${threadId}, agent ${agentId}`,
      toLoggerError(error)
    );
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
    if (!stateJson) return {}; // Return empty AgentState if not found

    let entity: AgentStateEntity;
    try {
      entity = AgentStateEntitySchema.parse(JSON.parse(stateJson as string));
    } catch (e: unknown) {
      throw new AgentStateStoreError(
        `Failed to parse or validate stored agent state JSON: ${toLoggerError(e)}`
      );
    }
    
    // Update access score for AGENT_STATE_INDEX
    await redis.zadd(AGENT_STATE_INDEX, {
      score: Date.now(),
      member: `${threadId}:${agentId}`,
    });
    
    return entity.state as AgentState; // Return the 'state' property, which is AgentState
  } catch (error) {
    throw new AgentStateStoreError(
      `Failed to load agent state for thread ${threadId}, agent ${agentId}`,
      toLoggerError(error)
    );
  }
}

// --- List all agent states for a thread ---
export async function listThreadAgentStates(
  threadId: string
): Promise<string[]> {
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  const redis = getRedisClient();
  const threadStatesKey = `${THREAD_AGENT_STATES_PREFIX}${threadId}${THREAD_AGENT_STATES_SUFFIX}`;
  try {
    const agentIds = await redis.smembers(threadStatesKey);
    return agentIds as string[];
  } catch (error) {
    throw new AgentStateStoreError(
      `Failed to list agent states for thread ${threadId}`,
      toLoggerError(error)
    );
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
      const errors = results.filter(
        (result: unknown) => result instanceof Error
      ) as Error[];
      throw new AgentStateStoreError(
        `Pipeline execution failed: ${errors.map((e) => e.message).join(', ')}`
      );
    }
    return true;
  } catch (error) {
    throw new AgentStateStoreError(
      `Failed to delete agent state for thread ${threadId}, agent ${agentId}`,
      toLoggerError(error)
    );
  }
}

// --- Delete all agent states for a thread ---
export async function deleteThreadAgentStates(
  threadId: string
): Promise<number> {
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  const redis = getRedisClient();
  const threadStatesKey = `${THREAD_AGENT_STATES_PREFIX}${threadId}${THREAD_AGENT_STATES_SUFFIX}`;
  try {
    const agentIds = (await redis.smembers(threadStatesKey)) as string[];
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
      const errors = results.filter(
        (result: unknown) => result instanceof Error
      ) as Error[];
      throw new AgentStateStoreError(
        `Pipeline execution failed: ${errors.map((e) => e.message).join(', ')}`
      );
    }
    return agentIds.length;
  } catch (error) {
    throw new AgentStateStoreError(
      `Failed to delete all agent states for thread ${threadId}`,
      toLoggerError(error)
    );
  }
}

// --- Create a new agent state with a generated ID ---
export async function createAgentState(
  threadId: string,
  initialState: AgentState = {}, // Public interface uses AgentState
  ttl?: number
): Promise<{ agentId: string; state: AgentState }> { // Returns AgentState
  if (!threadId) throw new AgentStateStoreError('Thread ID is required');
  const agentId = generateId(); // This is the agentId for the new state being created
  const now = new Date().toISOString();
  const recordId = generateId(); // ID for the AgentStateEntity record

  try {
    const agentStateEntity: AgentStateEntity = {
      id: recordId,
      type: 'agent_state',
      thread_id: threadId,
      agent_id: agentId,
      state: initialState, // initialState is the AgentState
      created_at: now,
      updated_at: now,
      metadata: { source: 'createAgentState' },
    };

    const validatedEntity = AgentStateEntitySchema.parse(agentStateEntity);
    const stateJson = JSON.stringify(validatedEntity);

    const redis = getRedisClient();
    const stateKey = `${AGENT_STATE_PREFIX}${threadId}:${agentId}`;
    const threadStatesKey = `${THREAD_AGENT_STATES_PREFIX}${threadId}${THREAD_AGENT_STATES_SUFFIX}`;

    const pipeline = redis.pipeline();
    pipeline.set(stateKey, stateJson);
    if (ttl && ttl > 0) pipeline.expire(stateKey, ttl);
    pipeline.sadd(threadStatesKey, agentId);
    pipeline.zadd(AGENT_STATE_INDEX, {
      score: Date.now(), // Use numeric timestamp for score
      member: `${threadId}:${agentId}`,
    });
    await pipeline.exec();
    
    return { agentId, state: validatedEntity.state as AgentState };
  } catch (error) {
    throw new AgentStateStoreError(
      `Failed to create agent state for thread ${threadId}`,
      toLoggerError(error)
    );
  }
}

// --- Get all agent states across all threads ---
export async function getAllAgentStates(
  limit?: number,
  offset?: number
): Promise<AgentStateEntity[]> { // Returns array of AgentStateEntity
  const redis = getRedisClient();
  try {
    const stateCompositeKeys = await redis.zrange(AGENT_STATE_INDEX, 0, -1, {
      rev: true,
    }); // These are "threadId:agentId"
    
    const paginatedCompositeKeys = stateCompositeKeys.slice(
      offset || 0,
      limit ? (offset || 0) + limit : undefined
    );

    if (paginatedCompositeKeys.length === 0) return [];
    
    const pipeline = redis.pipeline();
    for (const compositeKey of paginatedCompositeKeys as string[]) {
      pipeline.get(`${AGENT_STATE_PREFIX}${compositeKey}`);
    }
    const stateJsons = await pipeline.exec();

    const states: AgentStateEntity[] = (stateJsons as Array<string | null>)
      .filter((json): json is string => json !== null && typeof json === 'string')
      .map((json) => {
        try {
          // Parse and validate each state against AgentStateEntitySchema
          return AgentStateEntitySchema.parse(JSON.parse(json));
        } catch (e) {
          console.error(`Failed to parse/validate an agent state: ${toLoggerError(e)}`, json);
          return null; 
        }
      })
      .filter((state): state is AgentStateEntity => state !== null);
      
    return states;
  } catch (error) {
    throw new AgentStateStoreError(
      'Failed to get all agent states',
      toLoggerError(error)
    );
  }
}

// --- Advanced RediSearch/Hybrid Search ---
export async function advancedAgentStateHybridSearch(
  query: RediSearchHybridQuery
) {
  return runRediSearchHybridQuery(query);
}

// --- QStash/Workflow Integration Example ---
export async function enqueueAgentStateWorkflow(
  type: string,
  data: Record<string, unknown>
) {
  const payload: QStashTaskPayload = {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
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

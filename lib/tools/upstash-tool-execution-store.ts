import { getRedisClient } from '../memory/upstash/upstashClients';
import { v4 as uuidv4 } from 'uuid';

// --- Constants for Redis Keys ---
const TOOL_EXECUTION_PREFIX = "tool:execution:";
const TOOL_EXECUTIONS_INDEX = "tool:executions"; // Sorted set for all tool executions, scored by timestamp
const TOOL_EXECUTIONS_BY_TOOL_PREFIX = "tool:executions:tool:"; // Sorted set of executions for a specific tool
const TOOL_EXECUTIONS_BY_THREAD_PREFIX = "tool:executions:thread:"; // Sorted set of executions for a specific thread
const TOOL_EXECUTIONS_BY_AGENT_PREFIX = "tool:executions:agent:"; // Sorted set of executions for a specific agent
const TOOL_STATS_PREFIX = "tool:stats:"; // Hash of statistics for a specific tool

// --- Types ---
export interface ToolExecutionData {
  id: string;
  tool_id: string;
  tool_name: string;
  parameters: Record<string, any>;
  result?: any;
  error_message?: string;
  status: 'success' | 'error' | 'in_progress';
  execution_time?: number;
  thread_id?: string;
  agent_id?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

// --- Error Handling ---
export class ToolExecutionStoreError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "ToolExecutionStoreError";
    Object.setPrototypeOf(this, ToolExecutionStoreError.prototype);
  }
}

/**
 * Logs a tool execution to Redis
 * @param executionData The tool execution data
 * @returns A promise that resolves with the execution ID
 * @throws ToolExecutionStoreError if logging fails
 */
export async function logToolExecution(executionData: Omit<ToolExecutionData, 'id' | 'created_at'>): Promise<string> {
  const redis = getRedisClient();
  const executionId = uuidv4();
  const now = new Date();
  const timestamp = now.getTime();
  
  // Complete the execution data
  const completeExecutionData: ToolExecutionData = {
    ...executionData,
    id: executionId,
    created_at: now.toISOString()
  };
  
  // Serialize execution data
  const executionJson = JSON.stringify(completeExecutionData);
  
  try {
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Save execution data
    pipeline.set(`${TOOL_EXECUTION_PREFIX}${executionId}`, executionJson);
    
    // Add to global index with timestamp
    pipeline.zadd(TOOL_EXECUTIONS_INDEX, { score: timestamp, member: executionId });
    
    // Add to tool-specific index
    pipeline.zadd(`${TOOL_EXECUTIONS_BY_TOOL_PREFIX}${executionData.tool_name}`, { score: timestamp, member: executionId });
    
    // Add to thread-specific index if thread_id is provided
    if (executionData.thread_id) {
      pipeline.zadd(`${TOOL_EXECUTIONS_BY_THREAD_PREFIX}${executionData.thread_id}`, { score: timestamp, member: executionId });
    }
    
    // Add to agent-specific index if agent_id is provided
    if (executionData.agent_id) {
      pipeline.zadd(`${TOOL_EXECUTIONS_BY_AGENT_PREFIX}${executionData.agent_id}`, { score: timestamp, member: executionId });
    }
    
    // Update tool statistics
    const statsKey = `${TOOL_STATS_PREFIX}${executionData.tool_name}`;
    
    // Increment total executions
    pipeline.hincrby(statsKey, 'total_executions', 1);
    
    // Increment success/error count
    if (executionData.status === 'success') {
      pipeline.hincrby(statsKey, 'successful_executions', 1);
    } else if (executionData.status === 'error') {
      pipeline.hincrby(statsKey, 'failed_executions', 1);
    }
    
    // Update average execution time if provided
    if (executionData.execution_time !== undefined) {
      // Get current average and count
      const currentAvg = await redis.hget(statsKey, 'avg_execution_time');
      const currentCount = await redis.hget(statsKey, 'execution_time_count');
      
      if (currentAvg !== null && currentCount !== null) {
        const avg = parseFloat(currentAvg);
        const count = parseInt(currentCount, 10);
        
        // Calculate new average
        const newAvg = (avg * count + executionData.execution_time) / (count + 1);
        
        pipeline.hset(statsKey, {
          'avg_execution_time': newAvg.toString(),
          'execution_time_count': (count + 1).toString()
        });
      } else {
        // First execution with time
        pipeline.hset(statsKey, {
          'avg_execution_time': executionData.execution_time.toString(),
          'execution_time_count': '1'
        });
      }
    }
    
    // Update last execution timestamp
    pipeline.hset(statsKey, 'last_execution', now.toISOString());
    
    // Execute pipeline
    await pipeline.exec();
    
    return executionId;
  } catch (error) {
    console.error(`Error logging tool execution for ${executionData.tool_name}:`, error);
    throw new ToolExecutionStoreError(`Failed to log tool execution for ${executionData.tool_name}`, error);
  }
}

/**
 * Gets a tool execution from Redis
 * @param executionId The execution ID
 * @returns A promise that resolves with the execution data, or null if not found
 * @throws ToolExecutionStoreError if retrieval fails
 */
export async function getToolExecution(executionId: string): Promise<ToolExecutionData | null> {
  const redis = getRedisClient();
  
  try {
    const executionJson = await redis.get(`${TOOL_EXECUTION_PREFIX}${executionId}`);
    
    if (!executionJson) {
      return null;
    }
    
    return JSON.parse(executionJson as string) as ToolExecutionData;
  } catch (error) {
    console.error(`Error getting tool execution ${executionId}:`, error);
    throw new ToolExecutionStoreError(`Failed to get tool execution ${executionId}`, error);
  }
}

/**
 * Lists tool executions for a specific tool
 * @param toolName The tool name
 * @param limit Maximum number of executions to return
 * @param offset Offset for pagination
 * @returns A promise that resolves with an array of execution data
 * @throws ToolExecutionStoreError if listing fails
 */
export async function listToolExecutions(
  toolName: string,
  limit: number = 10,
  offset: number = 0
): Promise<ToolExecutionData[]> {
  const redis = getRedisClient();
  
  try {
    // Get execution IDs from tool-specific index
    const executionIds = await redis.zrange(
      `${TOOL_EXECUTIONS_BY_TOOL_PREFIX}${toolName}`,
      offset,
      offset + limit - 1,
      { rev: true }
    );
    
    if (!executionIds || executionIds.length === 0) {
      return [];
    }
    
    // Get execution data for each ID
    const pipeline = redis.pipeline();
    for (const id of executionIds) {
      pipeline.get(`${TOOL_EXECUTION_PREFIX}${id}`);
    }
    
    const results = await pipeline.exec();
    
    // Parse results
    return results
      .filter((result): result is string => result !== null)
      .map(json => JSON.parse(json) as ToolExecutionData);
  } catch (error) {
    console.error(`Error listing tool executions for ${toolName}:`, error);
    throw new ToolExecutionStoreError(`Failed to list tool executions for ${toolName}`, error);
  }
}

/**
 * Gets statistics for a specific tool
 * @param toolName The tool name
 * @returns A promise that resolves with the tool statistics
 * @throws ToolExecutionStoreError if retrieval fails
 */
export async function getToolStats(toolName: string): Promise<Record<string, string | number>> {
  const redis = getRedisClient();
  
  try {
    const statsKey = `${TOOL_STATS_PREFIX}${toolName}`;
    const stats = await redis.hgetall(statsKey);
    
    if (!stats) {
      return {
        total_executions: 0,
        successful_executions: 0,
        failed_executions: 0
      };
    }
    
    // Convert numeric strings to numbers
    const result: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'string' && !isNaN(Number(value))) {
        result[key] = Number(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error getting tool stats for ${toolName}:`, error);
    throw new ToolExecutionStoreError(`Failed to get tool stats for ${toolName}`, error);
  }
}

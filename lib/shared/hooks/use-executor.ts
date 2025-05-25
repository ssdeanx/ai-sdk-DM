'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/lib/shared/hooks/use-toast';
import { LRUCache } from 'lru-cache';
import {
  AgentStateSchema as LibsqlAgentStateSchema,
  WorkflowSchema as LibsqlWorkflowSchema,
  WorkflowStepSchema as LibsqlWorkflowStepSchema,
  MessageSchema as LibsqlMessageSchema,
  MemoryThreadSchema as LibsqlMemoryThreadSchema,
  EmbeddingSchema as LibsqlEmbeddingSchema,
} from '@/db/libsql/validation';
import {
  WorkflowSchema as SupabaseWorkflowSchema,
  WorkflowStepSchema as SupabaseWorkflowStepSchema,
} from '@/db/supabase/validation';
import type { AgentState, WorkflowStep, Message } from '@/db/libsql/validation';

/**
 * Options for executing an agent.
 * @property agentId - The agent's unique identifier.
 * @property db - The database backend to use ('supabase' or 'libsql').
 * @property onSuccess - Callback for successful execution.
 * @property onError - Callback for error handling.
 */
export interface UseAgentExecutorOptions {
  agentId: string;
  db?: 'supabase' | 'libsql';
  onSuccess?: (data: AgentState | Message | WorkflowStep | object) => void;
  onError?: (error: Error) => void;
}

/**
 * Options for executing a tool.
 * @property toolId - The tool's unique identifier.
 * @property db - The database backend to use ('supabase' or 'libsql').
 * @property onSuccess - Callback for successful execution.
 * @property onError - Callback for error handling.
 */
export interface UseToolExecutorOptions {
  toolId: string;
  db?: 'supabase' | 'libsql';
  onSuccess?: (data: WorkflowStep | object) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for executing an agent by ID with type-safe response validation.
 * @param options - UseAgentExecutorOptions
 * @returns Agent execution API
 */
export function useAgentExecutor({
  agentId,
  db = 'libsql',
  onSuccess,
  onError,
}: UseAgentExecutorOptions) {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cache = useRef(
    new LRUCache<string, AgentState | Message | WorkflowStep | object>({
      max: 50,
      ttl: 300000,
    })
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  // Canonical schemas for validation
  const schemas =
    db === 'supabase'
      ? [SupabaseWorkflowSchema, SupabaseWorkflowStepSchema]
      : [
          LibsqlAgentStateSchema,
          LibsqlWorkflowSchema,
          LibsqlWorkflowStepSchema,
          LibsqlMessageSchema,
          LibsqlMemoryThreadSchema,
          LibsqlEmbeddingSchema,
        ];

  const executeAgent = async (
    message: string,
    history: Message[] = [],
    retryCount = 0
  ): Promise<AgentState | Message | WorkflowStep | object> => {
    setIsExecuting(true);
    setError(null);
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const cacheKey = `${agentId}_${message}_${JSON.stringify(history)}_${db}`;
      const cachedResult = cache.current.get(cacheKey);
      if (cachedResult) return cachedResult;
      const response = await fetch(`/api/ai-sdk/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, db }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) {
        let errorMsg = 'Failed to execute agent';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      let validated: AgentState | Message | WorkflowStep | object = data;
      let found = false;
      for (const schema of schemas) {
        try {
          validated = schema.parse(data);
          found = true;
          break;
        } catch {}
      }
      if (!found) {
        setError(new Error('Agent response did not match any known schema'));
        toast({
          title: 'Agent response validation error',
          description: 'Response did not match any known schema',
          variant: 'destructive',
        });
        throw new Error('Agent response did not match any known schema');
      }
      cache.current.set(cacheKey, validated);
      onSuccess?.(validated);
      return validated;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to execute agent');
      const isRetryable =
        error.message.includes('network') ||
        error.message.includes('5') ||
        error.message.includes('timeout');
      if (isRetryable && retryCount < 3) {
        const delay = 1000 * Math.pow(2, retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return executeAgent(message, history, retryCount + 1);
      }
      setError(error);
      toast({
        title: 'Error executing agent',
        description: error.message,
        variant: 'destructive',
      });
      onError?.(error);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  };

  const executeAgentWithStream = async (
    message: string,
    history: Message[] = [],
    onChunk: (chunk: string) => void
  ): Promise<AgentState | Message | WorkflowStep | object> => {
    setIsExecuting(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai-sdk/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, stream: true, db }),
      });
      if (!response.ok) {
        let errorMsg = 'Failed to execute agent';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');
      const decoder = new TextDecoder();
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        result += chunk;
        onChunk(chunk);
      }
      let validated: AgentState | Message | WorkflowStep | object = {};
      let found = false;
      try {
        const parsed = JSON.parse(result);
        for (const schema of schemas) {
          try {
            validated = schema.parse(parsed);
            found = true;
            break;
          } catch {}
        }
        if (!found) validated = parsed;
        onSuccess?.(validated);
        return validated;
      } catch {
        throw new Error('Failed to parse streamed agent result');
      }
    } catch (error) {
      setError(error as Error);
      toast({
        title: 'Error executing agent',
        description: (error as Error).message,
        variant: 'destructive',
      });
      onError?.(error as Error);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  };
  return {
    executeAgent,
    executeAgentWithStream,
    isExecuting,
    error,
    cancel: () => abortControllerRef.current?.abort(),
  };
}

/**
 * React hook for executing a tool by ID with type-safe response validation.
 * @param options - UseToolExecutorOptions
 * @returns Tool execution API
 */
export function useToolExecutor({
  toolId,
  db = 'libsql',
  onSuccess,
  onError,
}: UseToolExecutorOptions) {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const schemasTool =
    db === 'supabase'
      ? [SupabaseWorkflowStepSchema]
      : [LibsqlWorkflowStepSchema];

  const executeTool = async (
    parameters: Record<string, unknown>
  ): Promise<WorkflowStep | object> => {
    setIsExecuting(true);
    setError(null);
    try {
      const response = await fetch('/api/ai-sdk/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, parameters, db }),
      });
      if (!response.ok) {
        let errorMsg = 'Failed to execute tool';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      let validated: WorkflowStep | object = data;
      let found = false;
      for (const schema of schemasTool) {
        try {
          validated = schema.parse(data);
          found = true;
          break;
        } catch {}
      }
      if (!found) {
        setError(new Error('Tool response did not match any known schema'));
        toast({
          title: 'Tool response validation error',
          description: 'Response did not match any known schema',
          variant: 'destructive',
        });
        throw new Error('Tool response did not match any known schema');
      }
      onSuccess?.(validated);
      toast({
        title: 'Tool executed successfully',
        description: 'The tool completed execution',
      });
      return validated;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to execute tool');
      setError(error);
      toast({
        title: 'Error executing tool',
        description: error.message,
        variant: 'destructive',
      });
      onError?.(error);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    executeTool,
    isExecuting,
    error,
  };
}
// Generated on 2025-05-19 - Now supports both Supabase and LibSQL, with canonical schemas and runtime selection.

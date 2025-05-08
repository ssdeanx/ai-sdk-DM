
"use client"

import { useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { LRUCache } from 'lru-cache'

interface UseAgentExecutorOptions {
  agentId: string
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

interface UseToolExecutorOptions {
  toolId: string
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

export function useAgentExecutor<T = any>({ agentId, onSuccess, onError }: UseAgentExecutorOptions) {
  const { toast } = useToast()
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const cache = useRef(new LRUCache<string, any>({
    max: 50,
    ttl: 300000, // 5 minutes
  }))
  const abortControllerRef = useRef<AbortController | null>(null)

  const executeAgent = async (message: string, history: any[] = [], retryCount = 0) => {
    setIsExecuting(true);
    setError(null);
    
    try {
      // Cancel previous request if still in progress
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController()
      
      // Generate cache key based on agent ID, message, and history
      const cacheKey = `${agentId}_${message}_${JSON.stringify(history)}`
      
      // Check cache
      const cachedResult = cache.current.get(cacheKey)
      if (cachedResult) return cachedResult
      
      const response = await fetch(`/api/agents/${agentId}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history,
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to execute agent")
      }

      const data = await response.json()

      if (onSuccess) {
        onSuccess(data)
      }

      cache.current.set(cacheKey, data)
      return data
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to execute agent")
      
      // Check if error is retryable (network error, 5xx)
      const isRetryable = error.message.includes('network') || 
                          error.message.includes('5') || 
                          error.message.includes('timeout')
      
      if (isRetryable && retryCount < 3) {
        // Exponential backoff
        const delay = 1000 * Math.pow(2, retryCount)
        await new Promise(resolve => setTimeout(resolve, delay))
        return executeAgent(message, history, retryCount + 1)
      }
      
      // Handle non-retryable error
      setError(error)

      toast({
        title: "Error executing agent",
        description: error.message,
        variant: "destructive",
      })

      if (onError) {
        onError(error)
      }

      throw error
    } finally {
      setIsExecuting(false)
    }
  }

  const executeAgentWithStream = async (
    message: string, 
    history: any[] = [], 
    onChunk: (chunk: string) => void
  ) => {
    setIsExecuting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/agents/${agentId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, stream: true }),
      });
      
      if (!response.ok) {
        // Handle error
        // ...
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is null");
      
      const decoder = new TextDecoder();
      let result = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        result += chunk;
        onChunk(chunk);
      }
      
      if (onSuccess) {
        onSuccess(JSON.parse(result));
      }
      
      return JSON.parse(result);
    } catch (err) {
      // Handle error
      // ...
    } finally {
      setIsExecuting(false);
    }
  }

  return {
    executeAgent,
    executeAgentWithStream,
    isExecuting,
    error,
    cancel: () => abortControllerRef.current?.abort()
  }
}

export function useToolExecutor({ toolId, onSuccess, onError }: UseToolExecutorOptions) {
  const { toast } = useToast()
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const executeTool = async (parameters: Record<string, any>) => {
    setIsExecuting(true)
    setError(null)

    try {
      const response = await fetch("/api/tools/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolId,
          parameters,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to execute tool")
      }

      const data = await response.json()

      if (onSuccess) {
        onSuccess(data)
      }

      toast({
        title: "Tool executed successfully",
        description: "The tool completed execution",
      })

      return data
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to execute tool")
      setError(error)

      toast({
        title: "Error executing tool",
        description: error.message,
        variant: "destructive",
      })

      if (onError) {
        onError(error)
      }

      throw error
    } finally {
      setIsExecuting(false)
    }
  }

  return {
    executeTool,
    isExecuting,
    error,
  }
}






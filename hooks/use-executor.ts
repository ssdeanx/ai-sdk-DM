"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

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

export function useAgentExecutor({ agentId, onSuccess, onError }: UseAgentExecutorOptions) {
  const { toast } = useToast()
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const executeAgent = async (message: string, history: any[] = []) => {
    setIsExecuting(true)
    setError(null)

    try {
      const response = await fetch(`/api/agents/${agentId}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to execute agent")
      }

      const data = await response.json()

      if (onSuccess) {
        onSuccess(data)
      }

      return data
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to execute agent")
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

  return {
    executeAgent,
    isExecuting,
    error,
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

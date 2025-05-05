"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface UseSupabaseCrudOptions<T> {
  resourceName: string
  endpoint: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useSupabaseCrud<T>({ resourceName, endpoint, onSuccess, onError }: UseSupabaseCrudOptions<T>) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const create = async (data: Omit<T, "id" | "created_at" | "updated_at">) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to create ${resourceName.toLowerCase()}`)
      }

      const result = await response.json()

      toast({
        title: `${resourceName} created`,
        description: `The ${resourceName.toLowerCase()} was created successfully.`,
      })

      if (onSuccess) {
        onSuccess()
      }

      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to create ${resourceName.toLowerCase()}`)
      setError(error)

      toast({
        title: `Failed to create ${resourceName.toLowerCase()}`,
        description: error.message,
        variant: "destructive",
      })

      if (onError) {
        onError(error)
      }

      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const update = async (id: string, data: Partial<T>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${endpoint}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to update ${resourceName.toLowerCase()}`)
      }

      const result = await response.json()

      toast({
        title: `${resourceName} updated`,
        description: `The ${resourceName.toLowerCase()} was updated successfully.`,
      })

      if (onSuccess) {
        onSuccess()
      }

      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to update ${resourceName.toLowerCase()}`)
      setError(error)

      toast({
        title: `Failed to update ${resourceName.toLowerCase()}`,
        description: error.message,
        variant: "destructive",
      })

      if (onError) {
        onError(error)
      }

      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const remove = async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${endpoint}/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to delete ${resourceName.toLowerCase()}`)
      }

      toast({
        title: `${resourceName} deleted`,
        description: `The ${resourceName.toLowerCase()} was deleted successfully.`,
      })

      if (onSuccess) {
        onSuccess()
      }

      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to delete ${resourceName.toLowerCase()}`)
      setError(error)

      toast({
        title: `Failed to delete ${resourceName.toLowerCase()}`,
        description: error.message,
        variant: "destructive",
      })

      if (onError) {
        onError(error)
      }

      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    create,
    update,
    remove,
    isLoading,
    error,
  }
}

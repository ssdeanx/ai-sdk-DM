"use client"

/**
 * Enhanced hook for CRUD operations with Supabase via API routes
 * Supports optimistic updates, batch operations, and file uploads
 *
 * @module hooks/use-supabase-crud
 */

import { useState, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { z } from "zod"

/**
 * Options for the useSupabaseCrud hook
 */
interface UseSupabaseCrudOptions<T> {
  /** Name of the resource being managed (for error messages) */
  resourceName: string

  /** API endpoint for CRUD operations */
  endpoint: string

  /** Optional validation schema for data */
  validationSchema?: z.ZodType<T>

  /** Callback when an operation succeeds */
  onSuccess?: (operation: 'create' | 'update' | 'delete' | 'batch', data?: any) => void

  /** Callback when an operation fails */
  onError?: (error: Error, operation?: string) => void

  /** Whether to use optimistic updates */
  optimisticUpdates?: boolean

  /** Maximum number of retries for failed requests */
  maxRetries?: number

  /** Base delay between retries (will be multiplied by 2^retryCount) */
  retryDelay?: number
}

/**
 * Validation error class
 */
class ValidationError extends Error {
  errors: z.ZodError;

  constructor(errors: z.ZodError) {
    super("Validation failed");
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/**
 * Hook for CRUD operations with Supabase via API routes
 */
export function useSupabaseCrud<T extends { id?: string }>({
  resourceName,
  endpoint,
  validationSchema,
  onSuccess,
  onError,
  optimisticUpdates = true,
  maxRetries = 3,
  retryDelay = 1000
}: UseSupabaseCrudOptions<T>) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [items, setItems] = useState<T[]>([])
  const [optimisticIds, setOptimisticIds] = useState<string[]>([])

  /**
   * Validate data against schema
   */
  const validateData = useCallback((data: any): T => {
    if (!validationSchema) return data as T

    try {
      return validationSchema.parse(data)
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err)
      }
      throw err
    }
  }, [validationSchema])

  /**
   * Handle API errors with retry logic
   */
  const handleApiError = useCallback(async (
    operation: string,
    apiCall: () => Promise<any>,
    retryCount = 0
  ) => {
    try {
      return await apiCall()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to ${operation} ${resourceName.toLowerCase()}`)

      // Don't retry validation errors
      if (error instanceof ValidationError) {
        setError(error)

        // Show validation errors in toast
        const formattedErrors = error.errors.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')

        toast({
          title: `Validation failed`,
          description: formattedErrors,
          variant: "destructive",
        })

        if (onError) {
          onError(error, operation)
        }

        throw error
      }

      // Implement retry logic for network errors or server errors
      const isNetworkError = error.message.includes('fetch') ||
                           error.message.includes('network') ||
                           error.message.includes('HTTP error 5');

      if (retryCount < maxRetries && isNetworkError) {
        console.log(`Retrying ${operation} for ${resourceName} (${retryCount + 1}/${maxRetries})...`)
        // Exponential backoff: delay increases with each retry
        const delay = retryDelay * Math.pow(2, retryCount)
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(handleApiError(operation, apiCall, retryCount + 1))
          }, delay)
        })
      }

      setError(error)

      toast({
        title: `Failed to ${operation} ${resourceName.toLowerCase()}`,
        description: error.message,
        variant: "destructive",
      })

      if (onError) {
        onError(error, operation)
      }

      throw error
    }
  }, [resourceName, maxRetries, retryDelay, toast, onError])

  /**
   * Create a new item
   */
  const create = useCallback(async (data: Omit<T, "id" | "created_at" | "updated_at">) => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate data
      const validatedData = validateData(data)

      // Generate temporary ID for optimistic updates
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

      // Apply optimistic update
      if (optimisticUpdates) {
        const optimisticItem = {
          ...validatedData,
          id: tempId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as T

        setItems(prev => [optimisticItem, ...prev])
        setOptimisticIds(prev => [...prev, tempId])
      }

      // Make API call
      const result = await handleApiError('create', async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validatedData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to create ${resourceName.toLowerCase()}`)
        }

        return response.json()
      })

      // Remove optimistic item and add real item
      if (optimisticUpdates) {
        setItems(prev => {
          const filtered = prev.filter(item => item.id !== tempId)
          return [result, ...filtered]
        })
        setOptimisticIds(prev => prev.filter(id => id !== tempId))
      }

      toast({
        title: `${resourceName} created`,
        description: `The ${resourceName.toLowerCase()} was created successfully.`,
      })

      if (onSuccess) {
        onSuccess('create', result)
      }

      return result
    } catch (err) {
      // If there was an error, remove the optimistic item
      if (optimisticUpdates) {
        setItems(prev => prev.filter(item => !optimisticIds.includes(item.id as string)))
      }

      // Error is already handled by handleApiError
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [
    resourceName,
    endpoint,
    validateData,
    handleApiError,
    optimisticUpdates,
    optimisticIds,
    toast,
    onSuccess
  ])

  /**
   * Update an existing item
   */
  const update = useCallback(async (id: string, data: Partial<T>) => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate data
      const validatedData = validateData({ ...data, id })

      // Store original item for rollback
      let originalItem: T | undefined

      // Apply optimistic update
      if (optimisticUpdates) {
        setItems(prev => {
          const newItems = [...prev]
          const index = newItems.findIndex(item => item.id === id)

          if (index !== -1) {
            originalItem = newItems[index]
            newItems[index] = {
              ...newItems[index],
              ...validatedData,
              updated_at: new Date().toISOString(),
            }
          }

          return newItems
        })
      }

      // Make API call
      const result = await handleApiError('update', async () => {
        const response = await fetch(`${endpoint}/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validatedData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to update ${resourceName.toLowerCase()}`)
        }

        return response.json()
      })

      // Update with actual result
      setItems(prev => {
        const newItems = [...prev]
        const index = newItems.findIndex(item => item.id === id)

        if (index !== -1) {
          newItems[index] = result
        }

        return newItems
      })

      toast({
        title: `${resourceName} updated`,
        description: `The ${resourceName.toLowerCase()} was updated successfully.`,
      })

      if (onSuccess) {
        onSuccess('update', result)
      }

      return result
    } catch (err) {
      // If there was an error and we have the original item, roll back
      if (optimisticUpdates && originalItem) {
        setItems(prev => {
          const newItems = [...prev]
          const index = newItems.findIndex(item => item.id === id)

          if (index !== -1) {
            newItems[index] = originalItem as T
          }

          return newItems
        })
      }

      // Error is already handled by handleApiError
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [
    resourceName,
    endpoint,
    validateData,
    handleApiError,
    optimisticUpdates,
    toast,
    onSuccess
  ])

  /**
   * Delete an item
   */
  const remove = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Store original item for rollback
      let originalItem: T | undefined
      let originalIndex: number = -1

      // Apply optimistic update
      if (optimisticUpdates) {
        setItems(prev => {
          const newItems = [...prev]
          originalIndex = newItems.findIndex(item => item.id === id)

          if (originalIndex !== -1) {
            originalItem = newItems[originalIndex]
            return newItems.filter(item => item.id !== id)
          }

          return newItems
        })
      }

      // Make API call
      await handleApiError('delete', async () => {
        const response = await fetch(`${endpoint}/${id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to delete ${resourceName.toLowerCase()}`)
        }

        return true
      })

      toast({
        title: `${resourceName} deleted`,
        description: `The ${resourceName.toLowerCase()} was deleted successfully.`,
      })

      if (onSuccess) {
        onSuccess('delete')
      }

      return true
    } catch (err) {
      // If there was an error and we have the original item, roll back
      if (optimisticUpdates && originalItem && originalIndex !== -1) {
        setItems(prev => {
          const newItems = [...prev]
          newItems.splice(originalIndex, 0, originalItem as T)
          return newItems
        })
      }

      // Error is already handled by handleApiError
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [
    resourceName,
    endpoint,
    handleApiError,
    optimisticUpdates,
    toast,
    onSuccess
  ])

  /**
   * Batch create multiple items
   */
  const batchCreate = useCallback(async (dataArray: Array<Omit<T, "id" | "created_at" | "updated_at">>) => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate all items
      const validatedDataArray = dataArray.map(data => validateData(data))

      // Generate temporary IDs for optimistic updates
      const tempIds = validatedDataArray.map(() =>
        `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      )

      // Apply optimistic updates
      if (optimisticUpdates) {
        const optimisticItems = validatedDataArray.map((data, index) => ({
          ...data,
          id: tempIds[index],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as unknown as T[]

        setItems(prev => [...optimisticItems, ...prev])
        setOptimisticIds(prev => [...prev, ...tempIds])
      }

      // Make API call
      const result = await handleApiError('batch create', async () => {
        const response = await fetch(`${endpoint}/batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validatedDataArray),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to batch create ${resourceName.toLowerCase()}`)
        }

        return response.json()
      })

      // Remove optimistic items and add real items
      if (optimisticUpdates) {
        setItems(prev => {
          const filtered = prev.filter(item => !tempIds.includes(item.id as string))
          return [...result, ...filtered]
        })
        setOptimisticIds(prev => prev.filter(id => !tempIds.includes(id)))
      }

      toast({
        title: `${resourceName} batch created`,
        description: `${result.length} ${resourceName.toLowerCase()} items were created successfully.`,
      })

      if (onSuccess) {
        onSuccess('batch', result)
      }

      return result
    } catch (err) {
      // If there was an error, remove the optimistic items
      if (optimisticUpdates) {
        setItems(prev => prev.filter(item => !optimisticIds.includes(item.id as string)))
      }

      // Error is already handled by handleApiError
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [
    resourceName,
    endpoint,
    validateData,
    handleApiError,
    optimisticUpdates,
    optimisticIds,
    toast,
    onSuccess
  ])

  /**
   * Upload a file with form data
   */
  const uploadFile = useCallback(async (
    file: File,
    additionalData?: Record<string, any>
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)

      // Add additional data if provided
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, typeof value === 'string' ? value : JSON.stringify(value))
        })
      }

      // Make API call
      const result = await handleApiError('upload', async () => {
        const response = await fetch(`${endpoint}/upload`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to upload file`)
        }

        return response.json()
      })

      toast({
        title: `File uploaded`,
        description: `The file was uploaded successfully.`,
      })

      if (onSuccess) {
        onSuccess('create', result)
      }

      return result
    } catch (err) {
      // Error is already handled by handleApiError
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, handleApiError, toast, onSuccess])

  return {
    // State
    items,
    isLoading,
    error,

    // Basic CRUD operations
    create,
    update,
    remove,

    // Advanced operations
    batchCreate,
    uploadFile,

    // Helpers
    setItems,
    validateData,
  }
}

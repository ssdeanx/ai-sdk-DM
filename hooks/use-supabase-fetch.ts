"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

interface UseSupabaseFetchOptions {
  endpoint: string
  resourceName: string
  dataKey: string
  initialData?: any[]
  queryParams?: Record<string, string>
  enabled?: boolean
  maxRetries?: number
  retryDelay?: number
}

export function useSupabaseFetch<T>({
  endpoint,
  resourceName,
  dataKey,
  initialData = [],
  queryParams = {},
  enabled = true,
  maxRetries = 3,
  retryDelay = 1000,
}: UseSupabaseFetchOptions) {
  const { toast } = useToast()
  const [data, setData] = useState<T[]>(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [connectionError, setConnectionError] = useState<boolean>(false)

  const fetchData = async (retryCount = 0) => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setConnectionError(false)

    try {
      // Build URL with query parameters
      const url = new URL(endpoint, window.location.origin)
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }))
        throw new Error(errorData.error || `Failed to fetch ${resourceName.toLowerCase()}`)
      }

      const result = await response.json()

      // Check if we have the expected data structure
      if (result && dataKey in result) {
        setData(result[dataKey])
      } else {
        console.error(`Data key "${dataKey}" not found in response:`, result)
        setData([])
        throw new Error(`Invalid response format for ${resourceName.toLowerCase()}`)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to fetch ${resourceName.toLowerCase()}`)
      console.error(`Error fetching ${resourceName.toLowerCase()}:`, error)

      // Implement retry logic for network errors or server errors
      const isNetworkError = error.message.includes('fetch') ||
                             error.message.includes('network') ||
                             error.message.includes('HTTP error 5');

      if (retryCount < maxRetries && isNetworkError) {
        console.log(`Retrying fetch for ${resourceName} (${retryCount + 1}/${maxRetries})...`)
        // Exponential backoff: delay increases with each retry
        const delay = retryDelay * Math.pow(2, retryCount)
        setTimeout(() => fetchData(retryCount + 1), delay)
        return
      }

      setError(error)
      setConnectionError(true)

      // Show a more specific error message
      const errorMessage = isNetworkError
        ? `Could not connect to the backend. Please check your connection and ensure the backend is running.`
        : error.message;

      toast({
        title: `Failed to fetch ${resourceName.toLowerCase()}`,
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [JSON.stringify(queryParams), enabled])

  return {
    data,
    isLoading,
    error,
    connectionError,
    refresh: () => fetchData(0),
  }
}

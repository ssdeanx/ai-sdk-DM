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
}

export function useSupabaseFetch<T>({
  endpoint,
  resourceName,
  dataKey,
  initialData = [],
  queryParams = {},
  enabled = true,
}: UseSupabaseFetchOptions) {
  const { toast } = useToast()
  const [data, setData] = useState<T[]>(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isMockData, setIsMockData] = useState(false)

  const fetchData = async () => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Build URL with query parameters
      const url = new URL(endpoint, window.location.origin)
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to fetch ${resourceName.toLowerCase()}`)
      }

      const result = await response.json()

      // Check if we have the expected data structure
      if (result && dataKey in result) {
        setData(result[dataKey])
        setIsMockData(result.isMockData || false)

        if (result.isMockData) {
          toast({
            title: "Using mock data",
            description: `Database connection not available. Using mock data for ${resourceName.toLowerCase()}.`,
            variant: "warning",
          })
        }
      } else {
        console.error(`Data key "${dataKey}" not found in response:`, result)
        setData([])
        throw new Error(`Invalid response format for ${resourceName.toLowerCase()}`)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to fetch ${resourceName.toLowerCase()}`)
      setError(error)
      console.error(`Error fetching ${resourceName.toLowerCase()}:`, error)

      toast({
        title: `Failed to fetch ${resourceName.toLowerCase()}`,
        description: error.message,
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
    refresh: fetchData,
    isMockData,
  }
}

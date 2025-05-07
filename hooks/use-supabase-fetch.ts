"use client"

/**
 * Enhanced hook for fetching data from Supabase via API routes
 * Supports real-time subscriptions, pagination, sorting, and filtering
 *
 * @module hooks/use-supabase-fetch
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { LRUCache } from "lru-cache"

/**
 * Options for the useSupabaseFetch hook
 */
interface UseSupabaseFetchOptions<T> {
  /** API endpoint to fetch data from */
  endpoint: string

  /** Name of the resource being fetched (for error messages) */
  resourceName: string

  /** Key in the response object that contains the data array */
  dataKey: string

  /** Initial data to use before fetching */
  initialData?: T[]

  /** Query parameters to include in the request */
  queryParams?: Record<string, string>

  /** Whether the fetch is enabled */
  enabled?: boolean

  /** Maximum number of retries for failed requests */
  maxRetries?: number

  /** Base delay between retries (will be multiplied by 2^retryCount) */
  retryDelay?: number

  /** Whether to subscribe to real-time updates */
  realtime?: boolean

  /** Pagination options */
  pagination?: {
    /** Page size */
    pageSize?: number

    /** Whether to use cursor-based pagination */
    useCursor?: boolean

    /** Initial cursor value */
    initialCursor?: string
  }

  /** Sorting options */
  sort?: {
    /** Column to sort by */
    column: string

    /** Sort direction */
    ascending?: boolean
  }[]

  /** Cache options */
  cache?: {
    /** Whether to enable caching */
    enabled?: boolean

    /** Time to live for cache entries in milliseconds */
    ttl?: number

    /** Maximum number of items to store in the cache */
    maxSize?: number
  }

  /** Callback when data is successfully fetched */
  onSuccess?: (data: T[]) => void

  /** Callback when fetch fails */
  onError?: (error: Error) => void
}

/**
 * Hook for fetching data from Supabase via API routes with advanced features
 */
export function useSupabaseFetch<T>({
  endpoint,
  resourceName,
  dataKey,
  initialData = [],
  queryParams = {},
  enabled = true,
  maxRetries = 3,
  retryDelay = 1000,
  realtime = false,
  pagination = {
    pageSize: 20,
    useCursor: false,
  },
  sort,
  cache = {
    enabled: true,
    ttl: 60000, // 1 minute
    maxSize: 100,
  },
  onSuccess,
  onError,
}: UseSupabaseFetchOptions<T>) {
  const { toast } = useToast()
  const [data, setData] = useState<T[]>(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [connectionError, setConnectionError] = useState<boolean>(false)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [cursor, setCursor] = useState<string | null>(pagination.useCursor ? pagination.initialCursor || null : null)
  const [page, setPage] = useState<number>(1)

  // Initialize LRU cache
  const cacheRef = useRef<LRUCache<string, any>>(new LRUCache({
    max: cache.maxSize || 100,
    ttl: cache.ttl || 60000, // 1 minute default TTL
    updateAgeOnGet: true,
  }))

  // Track subscription
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

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

  /**
   * Fetch data with advanced options
   */
  const fetchData = useCallback(async (retryCount = 0, loadMore = false) => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    // Don't set loading state for loadMore to avoid UI flicker
    if (!loadMore) {
      setIsLoading(true)
    }

    setError(null)
    setConnectionError(false)

    try {
      // Build cache key
      const cacheKey = `${endpoint}_${JSON.stringify(queryParams)}_${page}_${cursor}`

      // Check cache first
      if (cache.enabled) {
        const cachedData = cacheRef.current.get(cacheKey)
        if (cachedData) {
          if (!loadMore) {
            setData(cachedData.data)
            setTotalCount(cachedData.totalCount)
            setHasMore(cachedData.hasMore)
            setCursor(cachedData.nextCursor)
          } else {
            setData(prev => [...prev, ...cachedData.data])
            setHasMore(cachedData.hasMore)
            setCursor(cachedData.nextCursor)
          }
          setIsLoading(false)
          return
        }
      }

      // Build URL with query parameters
      const url = new URL(endpoint, window.location.origin)

      // Add base query parameters
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })

      // Add pagination parameters
      if (pagination.pageSize) {
        url.searchParams.append('pageSize', pagination.pageSize.toString())
      }

      if (pagination.useCursor && cursor) {
        url.searchParams.append('cursor', cursor)
      } else if (!pagination.useCursor) {
        url.searchParams.append('page', page.toString())
      }

      // Add sorting parameters
      if (sort && sort.length > 0) {
        const sortParams = sort.map(s => `${s.column}:${s.ascending ? 'asc' : 'desc'}`).join(',')
        url.searchParams.append('sort', sortParams)
      }

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }))
        throw new Error(errorData.error || `Failed to fetch ${resourceName.toLowerCase()}`)
      }

      const result = await response.json()

      // Check if we have the expected data structure
      if (result && dataKey in result) {
        const newData = result[dataKey]
        const totalCount = result.totalCount || null
        const nextCursor = result.nextCursor || null
        const hasMore = result.hasMore || false

        // Update state based on whether we're loading more or not
        if (!loadMore) {
          setData(newData)
        } else {
          setData(prev => [...prev, ...newData])
        }

        setTotalCount(totalCount)
        setHasMore(hasMore)

        if (pagination.useCursor) {
          setCursor(nextCursor)
        }

        // Cache the result
        if (cache.enabled) {
          cacheRef.current.set(cacheKey, {
            data: newData,
            totalCount,
            hasMore,
            nextCursor
          })
        }

        // Call onSuccess callback
        if (onSuccess) {
          onSuccess(newData)
        }
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
        setTimeout(() => fetchData(retryCount + 1, loadMore), delay)
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

      // Call onError callback
      if (onError) {
        onError(error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    enabled,
    endpoint,
    resourceName,
    dataKey,
    queryParams,
    maxRetries,
    retryDelay,
    page,
    cursor,
    pagination.pageSize,
    pagination.useCursor,
    sort,
    cache.enabled,
    onSuccess,
    onError,
    toast
  ])

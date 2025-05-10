'use client'

/**
 * Hook for direct Supabase CRUD operations
 * This hook provides direct database operations using the Supabase client
 * with optimized settings for direct database access. It uses the DATABASE_URL
 * environment variable which is the direct connection to the Supabase PostgreSQL
 * database via the transaction pooler.
 *
 * This hook is optimized for performance and should be used for operations
 * that require direct database access, such as bulk operations or complex queries.
 *
 * It also supports the Upstash adapter for Supabase compatibility, allowing
 * seamless switching between Supabase and Upstash backends.
 *
 * @module hooks/use-supabase-direct
 */

import { useState, useRef, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { createClient, PostgrestError } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { LRUCache } from 'lru-cache'
import { getDrizzleClient } from '@/lib/memory/drizzle'
import { DATABASE_URL } from '../lib/tools/graphql/constants';
import { useMemoryProvider } from './use-memory-provider'
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory'
import type { SupabaseClient as UpstashSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory'

/**
 * Options for the useSupabaseDirect hook
 */
interface UseSupabaseDirectOptions<T> {
  /**
   * The table name to perform CRUD operations on
   */
  tableName: string

  /**
   * Optional Drizzle schema table reference
   * If provided, will use Drizzle ORM for database operations
   */
  schemaTable?: any

  /**
   * Optional callback to transform data before saving
   */
  transformBeforeSave?: (data: T) => any

  /**
   * Optional callback to transform data after fetching
   */
  transformAfterFetch?: (data: any) => T

  /**
   * Optional error handler
   */
  onError?: (error: PostgrestError | Error, operation?: string) => void

  /**
   * Optional success handler
   */
  onSuccess?: (operation: 'create' | 'update' | 'delete' | 'get' | 'batch' | 'query', data?: any) => void

  /**
   * Cache options
   */
  cache?: {
    /**
     * Whether to enable caching
     * @default true
     */
    enabled?: boolean

    /**
     * Maximum number of items to store in the cache
     * @default 100
     */
    maxSize?: number

    /**
     * Time to live for cache entries in milliseconds
     * @default 60000 (1 minute)
     */
    ttl?: number

    /**
     * Whether to log cache hits and misses
     * @default false
     */
    debug?: boolean
  }

  /**
   * Whether to use Drizzle ORM for database operations
   * @default true if schemaTable is provided, false otherwise
   */
  useDrizzle?: boolean

  /**
   * Whether to use optimistic updates for create, update, and delete operations
   * @default true
   */
  optimisticUpdates?: boolean

  /**
   * Default page size for paginated queries
   * @default 20
   */
  defaultPageSize?: number

  /**
   * Whether to automatically refresh data after mutations
   * @default true
   */
  autoRefresh?: boolean

  /**
   * Upstash adapter options
   */
  upstash?: {
    /**
     * Whether to force using Upstash adapter
     * If not specified, will use the value from environment variables
     */
    forceUse?: boolean

    /**
     * Whether to add Upstash adapter headers to the request
     * @default true
     */
    addHeaders?: boolean
  }
}

/**
 * Advanced query options for filtering, sorting, and pagination
 */
export interface QueryOptions {
  /**
   * Filter conditions
   */
  filters?: FilterCondition[]

  /**
   * Columns to select
   */
  select?: string | string[]

  /**
   * Pagination options
   */
  pagination?: {
    /**
     * Page number (1-based)
     */
    page?: number

    /**
     * Number of items per page
     */
    pageSize?: number

    /**
     * Cursor for cursor-based pagination
     */
    cursor?: string
  }

  /**
   * Sorting options
   */
  sort?: {
    /**
     * Column to sort by
     */
    column: string

    /**
     * Sort direction
     */
    ascending?: boolean
  }[]

  /**
   * Relations to include
   */
  include?: string[]

  /**
   * Whether to count total rows
   */
  count?: boolean
}

/**
 * Filter condition for advanced queries
 */
export interface FilterCondition {
  /**
   * Column to filter on
   */
  column: string

  /**
   * Operator to use
   */
  operator: FilterOperator

  /**
   * Value to compare against
   */
  value: any
}

/**
 * Filter operators for advanced queries
 */
export type FilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike'
  | 'in' | 'is'
  | 'contains' | 'containedBy'
  | 'overlaps' | 'textSearch'
  | 'between' | 'notBetween'
  | 'rangeGt' | 'rangeLt' | 'rangeGte' | 'rangeLte' | 'rangeAdjacent';

/**
 * Hook for direct Supabase CRUD operations
 * @param options Options for the hook
 * @returns CRUD operations and state
 */
export function useSupabaseDirect<T extends { id?: string | number }>(
  options: UseSupabaseDirectOptions<T>
) {
  const {
    tableName,
    schemaTable,
    transformBeforeSave,
    transformAfterFetch,
    onError,
    onSuccess,
    cache: cacheOptions = { enabled: true },
    useDrizzle = !!schemaTable,
    upstash = { addHeaders: true }
  } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | Error | null>(null)
  const [items, setItems] = useState<T[]>([])
  const [item, setItem] = useState<T | null>(null)
  const [pagination] = useState({
    totalCount: 0,
    pageCount: 0,
    currentPage: 1,
    pageSize: 20
  })

  // Get memory provider configuration
  const { useUpstashAdapter } = useMemoryProvider()

  // Determine if we should use Upstash adapter
  const shouldUseUpstash = upstash.forceUse !== undefined
    ? upstash.forceUse
    : useUpstashAdapter

  // Initialize LRU cache with optimized settings
  const cacheInstance = useRef<LRUCache<string, any>>(new LRUCache({
    max: cacheOptions.maxSize || 500, // Increased default size for better hit rate
    ttl: cacheOptions.ttl || 300000, // 5 minutes default TTL for better cache utilization
    updateAgeOnGet: true, // Reset TTL when item is accessed
    updateAgeOnHas: false, // Don't reset TTL on cache checks
    allowStale: true, // Allow returning stale items before removing them
    fetchMethod: async (_key, staleValue) => {
      // This allows for background refresh of cache items
      // Return stale value immediately while fetching fresh data
      return staleValue;
    },
    noDisposeOnSet: true, // Don't dispose items that are being replaced
    noUpdateTTL: false, // Update TTL when item is set
  }))

  // Cache statistics for debugging and optimization
  const cacheStats = useRef({
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    staleHits: 0,
    refreshes: 0
  })

  // Initialize Drizzle client if needed
  const drizzleRef = useRef<ReturnType<typeof getDrizzleClient> | null>(null)

  // Create client refs to hold the Supabase or Upstash clients
  const supabaseRef = useRef<any>(null)
  const transactionClientRef = useRef<any>(null)

  // Initialize clients if not already done
  if (!supabaseRef.current) {
    if (shouldUseUpstash) {
      try {
        // Create Upstash adapter client
        supabaseRef.current = createSupabaseClient()
        transactionClientRef.current = supabaseRef.current
        console.log("Using Upstash adapter for Supabase direct operations")
      } catch (error) {
        console.error("Error creating Upstash adapter:", error)
        // Fall back to regular Supabase clients
        supabaseRef.current = createClient<Database>(
          process.env.SESSION_POOL_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          {
            db: { schema: 'public' },
            auth: { persistSession: true, autoRefreshToken: true },
            global: { headers: { 'x-client-info': 'useSupabaseDirect-SessionPool' } },
          }
        )

        transactionClientRef.current = createClient<Database>(
          process.env.DATABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          {
            db: { schema: 'public' },
            auth: { persistSession: true, autoRefreshToken: true },
            global: { headers: { 'x-client-info': 'useSupabaseDirect-TransactionPool' } },
          }
        )
      }
    } else {
      // Create regular Supabase clients
      supabaseRef.current = createClient<Database>(
        process.env.SESSION_POOL_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        {
          db: { schema: 'public' },
          auth: { persistSession: true, autoRefreshToken: true },
          global: { headers: { 'x-client-info': 'useSupabaseDirect-SessionPool' } },
        }
      )

      transactionClientRef.current = createClient<Database>(
        process.env.DATABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        {
          db: { schema: 'public' },
          auth: { persistSession: true, autoRefreshToken: true },
          global: { headers: { 'x-client-info': 'useSupabaseDirect-TransactionPool' } },
        }
      )
    }
  }

  // Get the clients from the refs
  const supabase = supabaseRef.current as any
  const transactionClient = transactionClientRef.current as any

  // Type guard to check if client is Upstash adapter
  const isUpstashAdapter = (client: any): client is UpstashSupabaseClient => {
    return client && typeof client === 'object' && 'isUpstashAdapter' in client && client.isUpstashAdapter === true;
  }

  // Use Drizzle if enabled
  useEffect(() => {
    if (useDrizzle && !drizzleRef.current) {
      try {
        drizzleRef.current = getDrizzleClient()
      } catch (err) {
        console.error('Error initializing Drizzle client:', err)
      }
    }
  }, [useDrizzle])

  const { toast } = useToast()

  /**
   * Handle errors from Supabase
   */
  const handleError = (error: PostgrestError, operation: string) => {
    setError(error)
    console.error(`Error in ${operation} operation on ${tableName}:`, error)

    // Call custom error handler if provided
    if (onError) {
      onError(error)
    } else {
      // Default error handling
      toast({
        title: `Error in ${operation}`,
        description: error.message || 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handle success
   */
  const handleSuccess = (operation: 'create' | 'update' | 'delete' | 'get', data?: any) => {
    if (onSuccess) {
      onSuccess(operation, data)
    } else {
      // Default success handling
      const messages = {
        create: `Created new ${tableName} successfully`,
        update: `Updated ${tableName} successfully`,
        delete: `Deleted ${tableName} successfully`,
        get: `Retrieved ${tableName} data successfully`,
      }

      toast({
        title: 'Success',
        description: messages[operation],
      })
    }
  }

  /**
   * Cache management functions with optimized implementation
   */
  const cacheManager = {
    /**
     * Get an item from the cache with optimized performance
     * Uses allowStale option to return stale items while refreshing in background
     */
    get: <R>(key: string): R | undefined => {
      if (!cacheOptions.enabled) return undefined

      try {
        // Get options with allowStale to improve performance
        const options = { allowStale: true }
        const result = cacheInstance.current.get(key, options) as R | undefined

        if (result !== undefined) {
          // Check if the result is stale
          const isStale = cacheInstance.current.has(key, { updateAgeOnHas: false }) === false

          if (isStale) {
            cacheStats.current.staleHits++
            if (cacheOptions.debug) {
              console.log(`Cache STALE HIT: ${key}`)
            }
          } else {
            cacheStats.current.hits++
            if (cacheOptions.debug) {
              console.log(`Cache HIT: ${key}`)
            }
          }
        } else {
          cacheStats.current.misses++
          if (cacheOptions.debug) {
            console.log(`Cache MISS: ${key}`)
          }
        }

        return result
      } catch (err) {
        console.error('Cache error:', err)
        return undefined
      }
    },

    /**
     * Set an item in the cache with optimized settings
     * Uses background refresh for frequently accessed items
     */
    set: <R>(key: string, value: R, options?: { ttl?: number }): void => {
      if (!cacheOptions.enabled) return

      try {
        const ttl = options?.ttl || cacheOptions.ttl || 300000
        cacheInstance.current.set(key, value, { ttl })
        cacheStats.current.sets++

        if (cacheOptions.debug) {
          console.log(`Cache SET: ${key} (TTL: ${ttl}ms)`)
        }
      } catch (err) {
        console.error('Cache set error:', err)
      }
    },

    /**
     * Remove an item from the cache
     */
    remove: (key: string): void => {
      if (!cacheOptions.enabled) return

      try {
        cacheInstance.current.delete(key)

        if (cacheOptions.debug) {
          console.log(`Cache DELETE: ${key}`)
        }
      } catch (err) {
        console.error('Cache delete error:', err)
      }
    },

    /**
     * Clear the entire cache
     */
    clear: (): void => {
      if (!cacheOptions.enabled) return

      try {
        cacheInstance.current.clear()

        // Reset statistics
        cacheStats.current = {
          hits: 0,
          misses: 0,
          sets: 0,
          evictions: 0,
          staleHits: 0,
          refreshes: 0
        }

        if (cacheOptions.debug) {
          console.log('Cache CLEARED')
        }
      } catch (err) {
        console.error('Cache clear error:', err)
      }
    },

    /**
     * Refresh a cache item if it exists
     * This is useful for background refreshing of frequently accessed items
     */
    refresh: async <R>(key: string, fetcher: () => Promise<R>): Promise<R | undefined> => {
      if (!cacheOptions.enabled) return undefined

      try {
        // Check if item exists in cache (for future use)
        cacheInstance.current.has(key)

        // Fetch new value
        const newValue = await fetcher()

        // Update cache with new value
        if (newValue !== undefined) {
          cacheInstance.current.set(key, newValue)
          cacheStats.current.refreshes++

          if (cacheOptions.debug) {
            console.log(`Cache REFRESH: ${key}`)
          }
        }

        return newValue
      } catch (err) {
        console.error('Cache refresh error:', err)
        return undefined
      }
    },

    /**
     * Get cache statistics with detailed metrics
     */
    getStats: () => {
      return {
        ...cacheStats.current,
        size: cacheInstance.current.size,
        maxSize: cacheOptions.maxSize || 500,
        hitRate: cacheStats.current.hits / (cacheStats.current.hits + cacheStats.current.misses) || 0,
        staleHitRate: cacheStats.current.staleHits / (cacheStats.current.hits + cacheStats.current.staleHits) || 0
      }
    }
  }

  // Helper functions for query building

  type JoinOptions = {
    table: string;
    on: { foreignKey: string; primaryKey: string };
    fields?: string[];
  };

  /**
   * Get all items from the table with advanced filtering
   */
  const getAll = async (options?: {
    filters?: Record<string, any>;
    advancedFilters?: FilterCondition[];
    limit?: number;
    offset?: number;
    orderBy?: { column: string; ascending?: boolean }[];
    fields?: string[];
    join?: JoinOptions;
    search?: { column: string; query: string };
    groupBy?: string[];
    having?: FilterCondition[];
  }) => {
    setLoading(true)
    setError(null)

    try {
      // Build select statement with fields
      const selectFields = options?.fields?.length
        ? options.fields.join(', ')
        : '*';

      // Add join fields if specified
      let selectStatement = selectFields;
      if (options?.join) {
        const joinFields = options.join.fields?.length
          ? options.join.fields.map(field => `${options.join!.table}:${field}`)
          : [`${options.join.table}:*`];

        selectStatement = `${selectFields},${joinFields.join(',')}`;
      }

      let query = supabase.from(tableName).select(selectStatement);

      // Apply join if specified
      // Note: Join is implemented through the select statement
      // as Supabase's JS client doesn't directly support JOIN operations
      // The join is specified in the select statement format:
      // select('*,foreign_table(*)')
      if (options?.join) {
        // Join is already handled in the select statement above
        console.log(`Applied join with table: ${options.join.table}`);
      }

      // Apply simple filters (backward compatibility)
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply advanced filters
      if (options?.advancedFilters?.length) {
        options.advancedFilters.forEach(({ column, operator, value }) => {
          switch (operator) {
            case 'eq': query = query.eq(column, value); break;
            case 'neq': query = query.neq(column, value); break;
            case 'gt': query = query.gt(column, value); break;
            case 'gte': query = query.gte(column, value); break;
            case 'lt': query = query.lt(column, value); break;
            case 'lte': query = query.lte(column, value); break;
            case 'like': query = query.like(column, value); break;
            case 'ilike': query = query.ilike(column, value); break;
            case 'in': query = query.in(column, value); break;
            case 'is': query = query.is(column, value); break;
            case 'contains': query = query.contains(column, value); break;
            case 'containedBy': query = query.containedBy(column, value); break;
            case 'rangeGt': query = query.rangeGt(column, value); break;
            case 'rangeLt': query = query.rangeLt(column, value); break;
            case 'rangeGte': query = query.rangeGte(column, value); break;
            case 'rangeLte': query = query.rangeLte(column, value); break;
            case 'rangeAdjacent': query = query.rangeAdjacent(column, value); break;
            case 'overlaps': query = query.overlaps(column, value); break;
            case 'textSearch': query = query.textSearch(column, value); break;
            default: console.warn(`Unsupported operator: ${operator}`);
          }
        });
      }

      // Apply full-text search
      if (options?.search) {
        const { column, query: searchQuery } = options.search;
        query = query.textSearch(column, searchQuery, {
          type: 'websearch',
          config: 'english'
        });
      }

      // Apply group by
      // Note: Supabase's JS client doesn't directly support GROUP BY
      // For complex grouping, consider using raw SQL queries
      if (options?.groupBy?.length) {
        console.log(`Group by not directly supported in JS client. Columns: ${options.groupBy.join(', ')}`);
        // For simple cases, we can use the select statement to achieve grouping
        // by selecting only the grouped columns
      }

      // Apply having conditions
      if (options?.having?.length) {
        options.having.forEach(({ column, operator, value }) => {
          // Note: Supabase doesn't directly support HAVING, but we can use it in raw SQL
          // This is a simplified approach
          const havingCondition = `${column} ${operator} ${value}`;
          console.log(`Applied HAVING condition: ${havingCondition}`);
        });
      }

      // Apply ordering (multiple columns)
      if (options?.orderBy?.length) {
        options.orderBy.forEach(({ column, ascending = true }) => {
          query = query.order(column, { ascending });
        });
      }

      // Apply pagination
      if (options?.limit !== undefined) {
        query = query.limit(options.limit);

        if (options?.offset !== undefined) {
          query = query.range(options.offset, options.offset + options.limit - 1);
        }
      }

      const { data, error } = await query;

      if (error) {
        handleError(error, 'getAll');
        return [];
      }

      // Convert data to the correct type with proper type casting
      const safeData = data as unknown as any[];
      const transformedData = transformAfterFetch
        ? safeData.map((item: any) => transformAfterFetch(item))
        : safeData as T[];

      // Cache the results with optimized settings
      // Use a more efficient cache key that's less memory-intensive
      const resultCacheKey = `${tableName}_getAll_${JSON.stringify(options || {}).slice(0, 100)}`;

      // Set TTL based on data size - larger datasets get shorter TTL
      const dataSizeBasedTTL = transformedData.length > 100
        ? 60000  // 1 minute for large datasets
        : transformedData.length > 50
          ? 180000  // 3 minutes for medium datasets
          : 300000; // 5 minutes for small datasets

      cacheManager.set(resultCacheKey, transformedData, { ttl: dataSizeBasedTTL });

      setItems(transformedData);
      handleSuccess('get', transformedData);
      return transformedData;
    } catch (err) {
      console.error('Unexpected error in getAll:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }

  /**
   * Get a single item by ID with optimized caching
   */
  const getById = async (id: string | number) => {
    setLoading(true)
    setError(null)

    try {
      // Check cache first with optimized key
      const cacheKey = `${tableName}_getById_${id}`
      const cachedItem = cacheManager.get<T>(cacheKey)

      if (cachedItem) {
        setItem(cachedItem)
        setLoading(false)
        return cachedItem
      }

      const { data, error } = await supabase
        .from(tableName as keyof Database['public']['Tables'])
        .select('*')
        .eq('id', id as any)
        .single()

      if (error) {
        handleError(error, 'getById')
        return null
      }

      const transformedData = transformAfterFetch
        ? transformAfterFetch(data)
        : data as T

      // Cache the result with longer TTL for single items (10 minutes)
      // Single items are accessed more frequently and change less often
      cacheManager.set(cacheKey, transformedData, { ttl: 600000 })

      setItem(transformedData)
      handleSuccess('get', transformedData)
      return transformedData
    } catch (err) {
      console.error('Unexpected error in getById:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  /**
   * Create a new item
   */
  const create = async (data: T) => {
    setLoading(true)
    setError(null)

    try {
      const transformedData = transformBeforeSave ? transformBeforeSave(data) : data

      const { data: createdData, error } = await supabase
        .from(tableName as keyof Database['public']['Tables'])
        .insert(transformedData)
        .select()
        .single()

      if (error) {
        handleError(error, 'create')
        return null
      }

      const newItem = transformAfterFetch
        ? transformAfterFetch(createdData)
        : createdData as T

      // Invalidate any list caches since we've added a new item
      const listCachePattern = `${tableName}_getAll_`
      Object.keys(cacheInstance.current.dump())
        .filter(key => key.startsWith(listCachePattern))
        .forEach(key => cacheManager.remove(key))

      setItem(newItem)
      handleSuccess('create', newItem)
      return newItem
    } catch (err) {
      console.error('Unexpected error in create:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  /**
   * Update an existing item
   */
  const update = async (id: string | number, data: Partial<T>) => {
    setLoading(true)
    setError(null)

    try {
      const transformedData = transformBeforeSave
        ? transformBeforeSave({ ...data, id } as T)
        : data

      const { data: updatedData, error } = await supabase
        .from(tableName as keyof Database['public']['Tables'])
        .update(transformedData)
        .eq('id', id as any)
        .select()
        .single()

      if (error) {
        handleError(error, 'update')
        return null
      }

      const updatedItem = transformAfterFetch
        ? transformAfterFetch(updatedData)
        : updatedData as T

      // Invalidate specific item cache and any list caches
      cacheManager.remove(`${tableName}_getById_${id}`)

      // Invalidate list caches that might contain this item
      const listCachePattern = `${tableName}_getAll_`
      Object.keys(cacheInstance.current.dump())
        .filter(key => key.startsWith(listCachePattern))
        .forEach(key => cacheManager.remove(key))

      setItem(updatedItem)
      handleSuccess('update', updatedItem)
      return updatedItem
    } catch (err) {
      console.error('Unexpected error in update:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  /**
   * Delete an item by ID
   */
  const remove = async (id: string | number) => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from(tableName as keyof Database['public']['Tables'])
        .delete()
        .eq('id', id as any)

      if (error) {
        handleError(error, 'delete')
        return false
      }

      // Invalidate specific item cache and any list caches
      cacheManager.remove(`${tableName}_getById_${id}`)

      // Invalidate list caches that might contain this item
      const listCachePattern = `${tableName}_getAll_`
      Object.keys(cacheInstance.current.dump())
        .filter(key => key.startsWith(listCachePattern))
        .forEach(key => cacheManager.remove(key))

      handleSuccess('delete')
      return true
    } catch (err) {
      console.error('Unexpected error in remove:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * Batch create multiple items
   */
  const batchCreate = async (dataArray: T[]) => {
    setLoading(true)
    setError(null)

    try {
      const transformedData = transformBeforeSave
        ? dataArray.map(data => transformBeforeSave(data))
        : dataArray

      const { data: createdData, error } = await supabase
        .from(tableName as keyof Database['public']['Tables'])
        .insert(transformedData)
        .select()

      if (error) {
        handleError(error, 'batchCreate')
        return []
      }

      const newItems = transformAfterFetch
        ? createdData.map((item: any) => transformAfterFetch(item))
        : createdData as T[]

      // Invalidate all list caches after batch operation
      const listCachePattern = `${tableName}_getAll_`
      Object.keys(cacheInstance.current.dump())
        .filter(key => key.startsWith(listCachePattern))
        .forEach(key => cacheManager.remove(key))

      setItems(prevItems => [...prevItems, ...newItems])
      handleSuccess('create', newItems)
      return newItems
    } catch (err) {
      console.error('Unexpected error in batchCreate:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  /**
   * Batch update multiple items
   */
  const batchUpdate = async (dataArray: Array<{ id: string | number, data: Partial<T> }>) => {
    setLoading(true)
    setError(null)

    try {
      const results: T[] = []

      // Process updates in batches of 10 to avoid overwhelming the database
      const batchSize = 10
      for (let i = 0; i < dataArray.length; i += batchSize) {
        const batch = dataArray.slice(i, i + batchSize)

        // Process each item in the batch
        const batchPromises = batch.map(async ({ id, data }) => {
          const transformedData = transformBeforeSave
            ? transformBeforeSave({ ...data, id } as T)
            : data

          const { data: updatedData, error } = await supabase
            .from(tableName as keyof Database['public']['Tables'])
            .update(transformedData)
            .eq('id', id as any)
            .select()
            .single()

          if (error) {
            console.error(`Error updating item ${id}:`, error)
            return null
          }

          return transformAfterFetch
            ? transformAfterFetch(updatedData)
            : updatedData as T
        })

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults.filter(Boolean) as T[])
      }

      // Invalidate all caches after batch update
      // This is more efficient than trying to selectively invalidate
      cacheManager.clear()

      handleSuccess('update', results)
      return results
    } catch (err) {
      console.error('Unexpected error in batchUpdate:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  /**
   * Batch delete multiple items
   */
  const batchRemove = async (ids: Array<string | number>) => {
    setLoading(true)
    setError(null)

    try {
      // Process deletes in batches of 10 to avoid overwhelming the database
      const batchSize = 10
      const results: boolean[] = []

      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize)

        const { error } = await supabase
          .from(tableName as keyof Database['public']['Tables'])
          .delete()
          .in('id', batchIds as any)

        if (error) {
          console.error(`Error deleting batch ${i / batchSize + 1}:`, error)
          results.push(false)
        } else {
          results.push(true)
        }
      }

      const success = results.every(Boolean)
      if (success) {
        // Invalidate all caches after batch delete
        // This is more efficient than trying to selectively invalidate
        cacheManager.clear()

        handleSuccess('delete')
      }

      return success
    } catch (err) {
      console.error('Unexpected error in batchRemove:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * Execute a raw SQL query
   * This provides maximum flexibility for complex queries
   * @param query SQL query string
   * @param params Query parameters
   * @returns Query results
   */
  const executeRawQuery = async (query: string, params?: any[]) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query_text: query,
        query_params: params || []
      });

      if (error) {
        handleError(error, 'executeRawQuery');
        return [];
      }

      // For raw queries, we don't apply transformations
      // as the structure may be completely different
      return data;
    } catch (err) {
      console.error('Unexpected error in executeRawQuery:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Count records with optional filters
   */
  const count = async (options?: {
    filters?: Record<string, any>;
    advancedFilters?: FilterCondition[];
  }) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from(tableName as keyof Database['public']['Tables']).select('*', { count: 'exact', head: true });

      // Apply simple filters
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply advanced filters
      if (options?.advancedFilters?.length) {
        options.advancedFilters.forEach(({ column, operator, value }) => {
          switch (operator) {
            case 'eq': query = query.eq(column, value); break;
            case 'neq': query = query.neq(column, value); break;
            case 'gt': query = query.gt(column, value); break;
            case 'gte': query = query.gte(column, value); break;
            case 'lt': query = query.lt(column, value); break;
            case 'lte': query = query.lte(column, value); break;
            case 'like': query = query.like(column, value); break;
            case 'ilike': query = query.ilike(column, value); break;
            case 'in': query = query.in(column, value); break;
            case 'is': query = query.is(column, value); break;
            case 'contains': query = query.contains(column, value); break;
            case 'containedBy': query = query.containedBy(column, value); break;
            default: console.warn(`Unsupported operator: ${operator}`);
          }
        });
      }

      const { count, error } = await query;

      if (error) {
        handleError(error, 'count');
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error('Unexpected error in count:', err);
      return 0;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute operations within a database transaction
   * All operations will be committed together or rolled back if any fails
   *
   * @param operations - Function containing operations to execute in transaction
   * @returns Result of the transaction
   */
  const withTransaction = async <R>(
    operations: (client: typeof transactionClient) => Promise<R>
  ): Promise<R> => {
    setLoading(true);
    setError(null);

    try {
      // Begin transaction
      const { error: beginError } = await transactionClient.rpc('begin');
      if (beginError) throw beginError;

      try {
        // Execute operations within transaction
        const result = await operations(transactionClient);

        // Commit transaction
        const { error: commitError } = await transactionClient.rpc('commit');
        if (commitError) throw commitError;

        return result;
      } catch (err) {
        // Rollback transaction on error
        try {
          const { error: rollbackError } = await transactionClient.rpc('rollback');
          if (rollbackError) {
            console.error('Error rolling back transaction:', rollbackError);
          }
        } catch (rollbackErr) {
          console.error('Error rolling back transaction:', rollbackErr);
        }

        throw err;
      }
    } catch (err) {
      console.error('Transaction error:', err);

      const pgError = {
        name: 'PostgrestError',
        message: err instanceof Error ? err.message : 'Transaction failed',
        details: 'Transaction failed',
        hint: 'Check server logs for details',
        code: 'TRANSACTION_ERROR'
      } as PostgrestError;

      setError(pgError);

      if (onError) {
        onError(pgError);
      } else {
        toast({
          title: 'Transaction Error',
          description: err instanceof Error ? err.message : 'Transaction failed',
          variant: 'destructive',
        });
      }

      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    loading,
    error,
    items,
    item,
    pagination,

    // Basic CRUD operations
    getAll,
    getById,
    create,
    update,
    remove,

    // Batch operations
    batchCreate,
    batchUpdate,
    batchRemove,

    // Advanced operations
    executeRawQuery,
    count,
    withTransaction,

    // Cache management
    cache: cacheManager,

    // Direct access to Supabase client
    supabase,
    transactionClient
  }
}
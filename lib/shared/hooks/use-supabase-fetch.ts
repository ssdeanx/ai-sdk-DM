'use client';

/**
 * Enhanced hook for fetching data from a Next.js API route that, in turn,
 * talks to Supabase or Upstash (via the Upstash adapter).  Supports:
 * – cursor or page-based pagination
 * – retries with exponential back-off
 * – optional in-memory LRU caching
 * – automatic detection of Upstash adapter
 *
 * @module hooks/use-supabase-fetch
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/lib/shared/hooks/use-toast';
import { LRUCache } from 'lru-cache';
import { useMemoryProvider } from './use-memory-provider';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface UseSupabaseFetchOptions<T> {
  endpoint: string; // API route   (e.g. /api/content/hero)
  resourceName: string; // Human readable – used in toasts
  dataKey: string; // Key containing the array in the response JSON

  initialData?: T[];
  queryParams?: Record<string, string>;

  enabled?: boolean;

  /* retry behaviour */
  maxRetries?: number;
  retryDelay?: number; // base delay in ms (exponential back-off)

  /* realtime subscriptions – currently unused but reserved for future use */
  realtime?: boolean;

  pagination?: {
    pageSize?: number;
    useCursor?: boolean;
    initialCursor?: string;
  };

  sort?: {
    column: string;
    ascending?: boolean;
  }[];

  cache?: {
    enabled?: boolean;
    ttl?: number;
    maxSize?: number;
  };

  /* Upstash adapter options */
  upstash?: {
    /**
     * Whether to force using Upstash adapter
     * If not specified, will use the value from useMemoryProvider
     */
    forceUse?: boolean;

    /**
     * Whether to add Upstash adapter headers to the request
     * @default true
     */
    addHeaders?: boolean;
  };

  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                        */
/* -------------------------------------------------------------------------- */

export function useSupabaseFetch<T>({
  endpoint,
  resourceName,
  dataKey,
  initialData = [],
  queryParams = {},

  /* control */
  enabled = true,

  /* retry */
  maxRetries = 3,
  retryDelay = 1_000,

  /* pagination */
  pagination = { pageSize: 20, useCursor: false },
  sort,

  /* cache */
  cache = { enabled: true, ttl: 60_000, maxSize: 100 },

  /* upstash */
  upstash = { addHeaders: true },

  onSuccess,
  onError,
}: UseSupabaseFetchOptions<T>) {
  const { toast } = useToast();
  const { useUpstashAdapter } = useMemoryProvider();

  /* ---------------------------------------------------------------------- */
  /* State                                                                  */
  /* ---------------------------------------------------------------------- */

  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionError, setConnErr] = useState(false);

  /* pagination helpers */
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(
    pagination.useCursor ? (pagination.initialCursor ?? null) : null
  );
  const [page, setPage] = useState(1);

  /* LRU cache */
  const cacheRef = useRef(
    new LRUCache<
      string,
      {
        data: T[];
        totalCount: number | null;
        hasMore: boolean;
        nextCursor: string | null;
      }
    >({
      max: cache.maxSize ?? 100,
      ttl: cache.ttl ?? 60_000,
      updateAgeOnGet: true,
    })
  );

  /* ---------------------------------------------------------------------- */
  /* Main fetch function (memoised)                                         */
  /* ---------------------------------------------------------------------- */

  const fetchData = useCallback(
    async (retryCount = 0, loadMore = false): Promise<void> => {
      if (!enabled) {
        setIsLoading(false);
        return;
      }

      /* for infinite scroll we don’t want a global spinner */
      if (!loadMore) setIsLoading(true);

      setError(null);
      setConnErr(false);

      /* build cache key */
      const cacheKey = `${endpoint}_${JSON.stringify(queryParams)}_${page}_${cursor}`;

      try {
        /* ---------------------------- 1. cache hit ----------------------- */
        if (cache.enabled) {
          const cached = cacheRef.current.get(cacheKey);
          if (cached) {
            if (loadMore) {
              setData((prev) => [...prev, ...cached.data]);
            } else {
              setData(cached.data);
            }

            setTotalCount(cached.totalCount);
            setHasMore(cached.hasMore);
            setCursor(cached.nextCursor);
            setIsLoading(false);
            return;
          }
        }

        /* ------------------------- 2. build URL -------------------------- */
        const url = new URL(endpoint, window.location.origin);

        /* base params */
        Object.entries(queryParams).forEach(([k, v]) =>
          url.searchParams.append(k, v)
        );

        /* pagination */
        if (pagination.pageSize)
          url.searchParams.append('pageSize', String(pagination.pageSize));

        if (pagination.useCursor && cursor) {
          url.searchParams.append('cursor', cursor);
        } else if (!pagination.useCursor) {
          url.searchParams.append('page', String(page));
        }

        /* sorting */
        if (sort?.length) {
          const s = sort
            .map(
              ({ column, ascending = true }) =>
                `${column}:${ascending ? 'asc' : 'desc'}`
            )
            .join(',');
          url.searchParams.append('sort', s);
        }

        /* ---------------------- 3. perform request ----------------------- */
        // Add Upstash adapter headers if enabled
        const headers: HeadersInit = {};

        // Check if we should use Upstash adapter
        const shouldUseUpstash =
          upstash.forceUse !== undefined ? upstash.forceUse : useUpstashAdapter;

        if (shouldUseUpstash) {
          if (upstash.addHeaders) {
            headers['x-use-upstash-adapter'] = 'true';
            headers['x-upstash-adapter-version'] = '1.0.1';
            headers['x-upstash-cache-control'] = cache.enabled
              ? 'enabled'
              : 'disabled';
            if (cache.enabled && cache.ttl) {
              headers['x-upstash-cache-ttl'] = String(cache.ttl);
            }
          }
          // Optionally, use upstashLogger here if logging is required
          // upstashLogger.info('use-supabase-fetch', `Using Upstash adapter for fetch: ${endpoint}`);
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          const { error: msg } = await response.json().catch(() => ({}));
          throw new Error(
            msg ?? `Failed to fetch ${resourceName.toLowerCase()}`
          );
        }

        const result = await response.json();

        /* ---------------------- 4. parse / validate ---------------------- */
        if (!(dataKey in result)) {
          throw new Error(
            `Invalid response format: missing "${dataKey}" in ${resourceName}`
          );
        }

        const newData: T[] = result[dataKey];
        const total: number | null = result.totalCount ?? null;
        const nextCursor = result.nextCursor ?? null;
        const more = result.hasMore ?? false;

        /* update state */
        setData((prev) => (loadMore ? [...prev, ...newData] : newData));
        setTotalCount(total);
        setHasMore(more);
        if (pagination.useCursor) setCursor(nextCursor);

        /* cache */
        if (cache.enabled) {
          cacheRef.current.set(cacheKey, {
            data: newData,
            totalCount: total,
            hasMore: more,
            nextCursor,
          });
        }

        onSuccess?.(newData);
      } catch (err) {
        const e =
          err instanceof Error
            ? err
            : new Error(`Failed to fetch ${resourceName.toLowerCase()}`);

        const isNetworkErr =
          e.message.includes('fetch') ||
          e.message.includes('network') ||
          e.message.includes('HTTP error 5');

        /* retry with exponential back-off */
        if (isNetworkErr && retryCount < maxRetries) {
          const delay = retryDelay * 2 ** retryCount;
          setTimeout(() => fetchData(retryCount + 1, loadMore), delay);
          return;
        }

        setError(e);
        setConnErr(true);
        toast({
          title: `Failed to fetch ${resourceName.toLowerCase()}`,
          description: isNetworkErr
            ? 'Could not connect to the backend. Check your connection.'
            : e.message,
          variant: 'destructive',
        });

        onError?.(e);
      } finally {
        setIsLoading(false);
      }
    },
    [
      enabled,
      endpoint,
      queryParams,
      page,
      cursor,
      cache.enabled,
      cache.ttl,
      pagination.pageSize,
      pagination.useCursor,
      sort,
      upstash.forceUse,
      upstash.addHeaders,
      useUpstashAdapter,
      dataKey,
      onSuccess,
      resourceName,
      maxRetries,
      toast,
      onError,
      retryDelay,
    ]
  );

  /* -------------------------------------------------------------- */
  /* Effects                                                        */
  /* -------------------------------------------------------------- */

  /* initial + reactive fetch */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* -------------------------------------------------------------- */
  /* Public API                                                     */
  /* -------------------------------------------------------------- */

  const fetchMore = () => {
    if (pagination.useCursor) {
      fetchData(0, true);
    } else {
      setPage((p) => p + 1);
      fetchData(0, true);
    }
  };

  const refetch = () => fetchData();

  return {
    data,
    isLoading,
    error,
    connectionError,
    totalCount,
    hasMore,
    fetchMore,
    refetch,
  };
}

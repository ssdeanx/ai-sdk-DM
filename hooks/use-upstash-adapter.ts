'use client';

/**
 * Hook for accessing Upstash adapter configuration
 *
 * This hook provides access to Upstash adapter configuration and utilities
 * for interacting with Upstash Redis and Vector services as a drop-in
 * replacement for Supabase.
 *
 * @module hooks/use-upstash-adapter
 */

import { useState, useEffect } from 'react';
import { useMemoryProvider } from './use-memory-provider';

/**
 * Upstash adapter configuration
 */
export interface UpstashAdapterConfig {
  /**
   * Whether Upstash adapter is enabled
   */
  enabled: boolean;

  /**
   * Whether Upstash Redis is available
   */
  redisAvailable: boolean;

  /**
   * Whether Upstash Vector is available
   */
  vectorAvailable: boolean;

  /**
   * Whether the adapter is ready to use
   */
  isReady: boolean;

  /**
   * Error message if any
   */
  error?: string;

  /**
   * Upstash Redis URL
   */
  redisUrl?: string;

  /**
   * Upstash Vector URL
   */
  vectorUrl?: string;
}

/**
 * Hook for accessing Upstash adapter configuration
 * @returns Upstash adapter configuration
 */
export function useUpstashAdapter(): UpstashAdapterConfig {
  const memoryProvider = useMemoryProvider();
  const [config, setConfig] = useState<UpstashAdapterConfig>({
    enabled: memoryProvider.useUpstashAdapter,
    redisAvailable: memoryProvider.isRedisAvailable,
    vectorAvailable: memoryProvider.isVectorAvailable,
    isReady: memoryProvider.isReady,
  });

  useEffect(() => {
    // Update config when memory provider changes
    setConfig({
      enabled: memoryProvider.useUpstashAdapter,
      redisAvailable: memoryProvider.isRedisAvailable,
      vectorAvailable: memoryProvider.isVectorAvailable,
      isReady: memoryProvider.isReady,
      error: memoryProvider.error,
    });

    // Fetch additional Upstash adapter configuration if enabled
    if (memoryProvider.useUpstashAdapter && memoryProvider.isReady) {
      async function fetchAdapterConfig() {
        try {
          const response = await fetch('/api/ai-sdk/memory/upstash-config', {
            // Add cache control headers to prevent caching
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
              Expires: '0',
            },
          });

          if (!response.ok) {
            throw new Error(
              `Failed to fetch Upstash adapter configuration: ${response.statusText}`
            );
          }

          const data = await response.json();

          if (!data.enabled) {
            throw new Error('Upstash adapter is not enabled on the server');
          }

          setConfig((prev) => ({
            ...prev,
            redisUrl: data.redisUrl,
            vectorUrl: data.vectorUrl,
            qstashEnabled: data.qstashEnabled,
            isReady: true,
          }));
        } catch (error) {
          setConfig((prev) => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Unknown error',
          }));
        }
      }

      fetchAdapterConfig();
    }
  }, [memoryProvider]);

  return config;
}

/**
 * Custom hook to determine if Upstash adapter should be used
 */
export function useShouldUseUpstashAdapter(): boolean {
  return useMemoryProvider().useUpstashAdapter;
}

/**
 * Custom hook to check if Upstash Redis is available
 */
export function useIsUpstashRedisAvailable(): boolean {
  return useMemoryProvider().isRedisAvailable;
}

/**
 * Custom hook to check if Upstash Vector is available
 */
export function useIsUpstashVectorAvailable(): boolean {
  return useMemoryProvider().isVectorAvailable;
}

/**
 * Upstash CRUD Client - provides a Supabase-like CRUD interface using Upstash via the /api/ai-sdk/crud/[table] API
 */
export function useUpstashCrudClient() {
  const config = useUpstashAdapter();

  // Generic CRUD methods using the API route
  async function getAll(table: string) {
    const res = await fetch(`/api/ai-sdk/crud/${table}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data[table];
  }
  async function create(table: string, item: unknown) {
    const res = await fetch(`/api/ai-sdk/crud/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }
  async function update(table: string, id: string, updates: unknown) {
    const res = await fetch(`/api/ai-sdk/crud/${table}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }
  async function remove(table: string, id: string) {
    const res = await fetch(`/api/ai-sdk/crud/${table}/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }

  return {
    enabled: config.enabled,
    isReady: config.isReady,
    getAll,
    create,
    update,
    remove,
    config,
  };
}

export default useUpstashAdapter;

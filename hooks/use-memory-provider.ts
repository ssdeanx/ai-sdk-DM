'use client';

/**
 * Hook for determining the current memory provider
 *
 * This hook provides information about the current memory provider configuration
 * based on environment variables. It helps components and other hooks determine
 * whether to use Supabase or Upstash for data storage.
 *
 * @module hooks/use-memory-provider
 */

import { useState, useEffect } from 'react';

/**
 * Memory provider types
 */
export type MemoryProvider = 'libsql' | 'upstash' | 'supabase';

/**
 * Memory provider configuration
 */
export interface MemoryProviderConfig {
  /**
   * The current memory provider
   */
  provider: MemoryProvider;

  /**
   * Whether Upstash adapter is enabled for Supabase compatibility
   */
  useUpstashAdapter: boolean;

  /**
   * Whether Upstash Redis is available
   */
  isRedisAvailable: boolean;

  /**
   * Whether Upstash Vector is available
   */
  isVectorAvailable: boolean;

  /**
   * Whether the memory provider is ready to use
   */
  isReady: boolean;

  /**
   * Error message if any
   */
  error?: string;
}

/**
 * Hook for determining the current memory provider
 * @returns Memory provider configuration
 */
export function useMemoryProvider(): MemoryProviderConfig {
  const [config, setConfig] = useState<MemoryProviderConfig>({
    provider: 'libsql',
    useUpstashAdapter: false,
    isRedisAvailable: false,
    isVectorAvailable: false,
    isReady: false,
  });

  useEffect(() => {
    // Fetch memory provider configuration from the server
    async function fetchConfig() {
      try {
        const response = await fetch('/api/ai-sdk/memory/config', {
          // Add cache control headers to prevent caching
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch memory provider configuration: ${response.statusText}`
          );
        }

        const data = await response.json();
        setConfig({
          provider: data.provider || 'libsql',
          useUpstashAdapter: data.useUpstashAdapter || false,
          isRedisAvailable: data.isRedisAvailable || false,
          isVectorAvailable: data.isVectorAvailable || false,
          isReady: data.isReady || false,
          error: data.error,
        });
      } catch (error) {
        setConfig((prev) => ({
          ...prev,
          isReady: true,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }
    fetchConfig();

    // Refresh configuration every 5 minutes to detect changes
    const intervalId = setInterval(fetchConfig, 5 * 60 * 1000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  return config;
}

/**
 * Utility function to determine if Upstash should be used
 * @returns Whether Upstash should be used
 */
export function shouldUseUpstash(): boolean {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // In browser, we need to rely on the API to tell us
    return false; // Default to false, will be updated by the hook
  }

  // In server environment, we can check environment variables directly
  return (
    process.env.USE_UPSTASH_ADAPTER === 'true' &&
    process.env.UPSTASH_REDIS_REST_URL !== undefined &&
    process.env.UPSTASH_REDIS_REST_TOKEN !== undefined
  );
}

/**
 * Utility function to determine if Upstash Vector is available
 * @returns Whether Upstash Vector is available
 */
export function isUpstashVectorAvailable(): boolean {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // In browser, we need to rely on the API to tell us
    return false; // Default to false, will be updated by the hook
  }

  // In server environment, we can check environment variables directly
  return (
    process.env.UPSTASH_VECTOR_REST_URL !== undefined &&
    process.env.UPSTASH_VECTOR_REST_TOKEN !== undefined
  );
}

export default useMemoryProvider;

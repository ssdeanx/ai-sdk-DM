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
    isReady: memoryProvider.isReady
  });

  useEffect(() => {
    // Update config when memory provider changes
    setConfig({
      enabled: memoryProvider.useUpstashAdapter,
      redisAvailable: memoryProvider.isRedisAvailable,
      vectorAvailable: memoryProvider.isVectorAvailable,
      isReady: memoryProvider.isReady,
      error: memoryProvider.error
    });

    // Fetch additional Upstash adapter configuration if enabled
    if (memoryProvider.useUpstashAdapter && memoryProvider.isReady) {
      async function fetchAdapterConfig() {
        try {
          const response = await fetch('/api/memory/upstash-config', {
            // Add cache control headers to prevent caching
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch Upstash adapter configuration: ${response.statusText}`);
          }

          const data = await response.json();

          if (!data.enabled) {
            throw new Error('Upstash adapter is not enabled on the server');
          }

          setConfig(prev => ({
            ...prev,
            redisUrl: data.redisUrl,
            vectorUrl: data.vectorUrl,
            qstashEnabled: data.qstashEnabled,
            isReady: true
          }));

          // Log configuration for debugging
          console.log('Upstash adapter configuration:', {
            redisUrl: data.redisUrl ? '✓ Available' : '✗ Not available',
            vectorUrl: data.vectorUrl ? '✓ Available' : '✗ Not available',
            qstashEnabled: data.qstashEnabled ? '✓ Enabled' : '✗ Disabled'
          });
        } catch (error) {
          console.error('Error fetching Upstash adapter configuration:', error);
          setConfig(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      }

      fetchAdapterConfig();
    }
  }, [memoryProvider]);

  return config;
}

/**
 * Utility function to determine if Upstash adapter should be used
 * @returns Whether Upstash adapter should be used
 */
export function shouldUseUpstashAdapter(): boolean {
  // Use the memory provider utility
  return useMemoryProvider().useUpstashAdapter;
}

/**
 * Utility function to check if Upstash Redis is available
 * @returns Whether Upstash Redis is available
 */
export function isUpstashRedisAvailable(): boolean {
  return useMemoryProvider().isRedisAvailable;
}

/**
 * Utility function to check if Upstash Vector is available
 * @returns Whether Upstash Vector is available
 */
export function isUpstashVectorAvailable(): boolean {
  return useMemoryProvider().isVectorAvailable;
}

export default useUpstashAdapter;

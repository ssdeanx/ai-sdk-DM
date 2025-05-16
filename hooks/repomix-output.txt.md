This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where empty lines have been removed, content has been formatted for parsing in markdown style, content has been compressed (code blocks are separated by ⋮---- delimiter).

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: hooks
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Empty lines have been removed from all files
- Content has been formatted for parsing in markdown style
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure
```
hooks/use-chat.ts
hooks/use-executor.ts
hooks/use-media-query.ts
hooks/use-memory-provider.ts
hooks/use-mobile.tsx
hooks/use-supabase-crud.ts
hooks/use-supabase-direct.ts
hooks/use-supabase-fetch.ts
hooks/use-supabase-realtime.ts
hooks/use-toast.ts
hooks/use-upstash-adapter.ts
```

# Files

## File: hooks/use-media-query.ts
````typescript
import { useEffect, useState } from "react"
/**
 * Custom hook for responsive design that detects if a media query matches
 * 
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 * 
 * @example
 * ```tsx
 * const isMobile = useMediaQuery("(max-width: 768px)")
 * ```
 */
export function useMediaQuery(query: string): boolean
⋮----
// Check if window is defined (client-side)
⋮----
// Set initial value
⋮----
// Define listener function
const listener = (event: MediaQueryListEvent) =>
// Add listener
⋮----
// Clean up
⋮----
// Default to false on server-side
````

## File: hooks/use-memory-provider.ts
````typescript
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
⋮----
/**
   * The current memory provider
   */
⋮----
/**
   * Whether Upstash adapter is enabled for Supabase compatibility
   */
⋮----
/**
   * Whether Upstash Redis is available
   */
⋮----
/**
   * Whether Upstash Vector is available
   */
⋮----
/**
   * Whether the memory provider is ready to use
   */
⋮----
/**
   * Error message if any
   */
⋮----
/**
 * Hook for determining the current memory provider
 * @returns Memory provider configuration
 */
export function useMemoryProvider(): MemoryProviderConfig
⋮----
// Fetch memory provider configuration from the server
async function fetchConfig()
⋮----
// Add cache control headers to prevent caching
⋮----
// Log configuration for debugging
⋮----
// Refresh configuration every 5 minutes to detect changes
⋮----
// Clean up interval on unmount
⋮----
/**
 * Utility function to determine if Upstash should be used
 * @returns Whether Upstash should be used
 */
export function shouldUseUpstash(): boolean
⋮----
// Check if we're in a browser environment
⋮----
// In browser, we need to rely on the API to tell us
return false; // Default to false, will be updated by the hook
⋮----
// In server environment, we can check environment variables directly
⋮----
/**
 * Utility function to determine if Upstash Vector is available
 * @returns Whether Upstash Vector is available
 */
export function isUpstashVectorAvailable(): boolean
⋮----
// Check if we're in a browser environment
⋮----
// In browser, we need to rely on the API to tell us
return false; // Default to false, will be updated by the hook
⋮----
// In server environment, we can check environment variables directly
````

## File: hooks/use-mobile.tsx
````typescript
export function useIsMobile()
⋮----
const onChange = () =>
````

## File: hooks/use-upstash-adapter.ts
````typescript
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
⋮----
/**
   * Whether Upstash adapter is enabled
   */
⋮----
/**
   * Whether Upstash Redis is available
   */
⋮----
/**
   * Whether Upstash Vector is available
   */
⋮----
/**
   * Whether the adapter is ready to use
   */
⋮----
/**
   * Error message if any
   */
⋮----
/**
   * Upstash Redis URL
   */
⋮----
/**
   * Upstash Vector URL
   */
⋮----
/**
 * Hook for accessing Upstash adapter configuration
 * @returns Upstash adapter configuration
 */
export function useUpstashAdapter(): UpstashAdapterConfig
⋮----
// Update config when memory provider changes
⋮----
// Fetch additional Upstash adapter configuration if enabled
⋮----
async function fetchAdapterConfig()
⋮----
// Add cache control headers to prevent caching
⋮----
// Log configuration for debugging
⋮----
/**
 * Utility function to determine if Upstash adapter should be used
 * @returns Whether Upstash adapter should be used
 */
export function shouldUseUpstashAdapter(): boolean
⋮----
// Use the memory provider utility
⋮----
/**
 * Utility function to check if Upstash Redis is available
 * @returns Whether Upstash Redis is available
 */
export function isUpstashRedisAvailable(): boolean
/**
 * Utility function to check if Upstash Vector is available
 * @returns Whether Upstash Vector is available
 */
export function isUpstashVectorAvailable(): boolean
````

## File: hooks/use-executor.ts
````typescript
import { useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { LRUCache } from 'lru-cache'
interface UseAgentExecutorOptions {
  agentId: string
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}
interface UseToolExecutorOptions {
  toolId: string
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}
export function useAgentExecutor<T = any>(
⋮----
ttl: 300000, // 5 minutes
⋮----
const executeAgent = async (message: string, history: any[] = [], retryCount = 0) =>
⋮----
// Cancel previous request if still in progress
⋮----
// Create new abort controller
⋮----
// Generate cache key based on agent ID, message, and history
⋮----
// Check cache
⋮----
// Check if error is retryable (network error, 5xx)
⋮----
// Exponential backoff
⋮----
// Handle non-retryable error
⋮----
const executeAgentWithStream = async (
    message: string, 
    history: any[] = [], 
    onChunk: (chunk: string) => void
) =>
⋮----
// Handle error
// ...
⋮----
// Handle error
// ...
⋮----
export function useToolExecutor(
⋮----
const executeTool = async (parameters: Record<string, any>) =>
````

## File: hooks/use-toast.ts
````typescript
/**
 * Enhanced toast hook with advanced features
 * Supports multiple toast types, actions, and toast queue management
 *
 * @module hooks/use-toast
 */
// Inspired by react-hot-toast library
⋮----
import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"
// Configuration
const TOAST_LIMIT = 5 // Increased from 1 to allow multiple toasts
const TOAST_REMOVE_DELAY = 5000 // Reduced from 1000000 to 5000ms (5 seconds)
/**
 * Toast variant types
 */
export type ToastVariant =
  | "default"
  | "destructive"
/**
 * Toast priority levels
 */
export type ToastPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent"
/**
 * Toast action with callback
 */
export interface ToastAction {
  label: string
  onClick: () => void
  className?: string
}
/**
 * Enhanced toast properties
 */
type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  variant?: ToastVariant
  duration?: number
  priority?: ToastPriority
  icon?: React.ReactNode
  onDismiss?: () => void
  group?: string
  createdAt: number
}
/**
 * Toast action types
 */
⋮----
function genId()
type ActionType = typeof actionTypes
/**
 * Toast actions
 */
type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["DISMISS_ALL_TOASTS"]
    }
  | {
      type: ActionType["REMOVE_ALL_TOASTS"]
    }
  | {
      type: ActionType["DISMISS_GROUP"]
      group: string
    }
  | {
      type: ActionType["PAUSE_TOAST"]
      toastId: ToasterToast["id"]
    }
  | {
      type: ActionType["RESUME_TOAST"]
      toastId: ToasterToast["id"]
    }
/**
 * Toast state
 */
interface State {
  toasts: ToasterToast[]
  paused: Record<string, boolean>
  queue: ToasterToast[]
}
/**
 * Toast timeout management
 */
⋮----
/**
 * Add toast to removal queue
 */
const addToRemoveQueue = (toastId: string, duration?: number) =>
⋮----
// Clear existing timeout if any
⋮----
// Don't set a timeout for permanent toasts (duration === 0)
⋮----
// Set timeout to remove toast
⋮----
// Process queue after removing a toast
⋮----
/**
 * Process toast queue
 */
const processQueue = () =>
⋮----
// If we have space for more toasts and there are toasts in the queue
⋮----
// Sort queue by priority and creation time
⋮----
return bPriority - aPriority // Higher priority first
⋮----
return a.createdAt - b.createdAt // Older first
⋮----
// Get the next toast from the queue
⋮----
// Remove it from the queue and add it to active toasts
⋮----
/**
 * Toast reducer
 */
export const reducer = (state: State, action: Action): State =>
⋮----
// If we've reached the toast limit, add to queue instead
⋮----
// Add toast and set timeout for removal
⋮----
// Call onDismiss callback if defined
⋮----
// Remove the toast
⋮----
// Remove from paused state
⋮----
// Call onDismiss for all toasts
⋮----
// Clear all timeouts
⋮----
// Call onDismiss for group toasts
⋮----
// Clear the timeout
⋮----
function dispatch(action: Action)
/**
 * Toast options
 */
type ToastOptions = Omit<ToasterToast, "id" | "createdAt">
/**
 * Create a toast
 */
function toast(
⋮----
// Update toast
const update = (props: Partial<ToasterToast>)
// Dismiss toast
const dismiss = () => dispatch(
// Pause toast (stop timer)
const pause = () => dispatch(
// Resume toast (restart timer)
const resume = () => dispatch(
// Create and dispatch toast
⋮----
/**
 * Create an error toast
 */
⋮----
/**
 * Create a success toast (uses default variant with custom styling)
 */
⋮----
/**
 * Create a warning toast (uses default variant with custom styling)
 */
⋮----
/**
 * Create an info toast (uses default variant with custom styling)
 */
⋮----
/**
 * Create a permanent toast (doesn't auto-dismiss)
 */
⋮----
/**
 * Create a toast with an action
 */
⋮----
// Create a proper React element for the toast action
⋮----
/**
 * Enhanced toast hook
 */
function useToast()
````

## File: hooks/use-chat.ts
````typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { toast } from "sonner"
import { LRUCache } from 'lru-cache'
import { LanguageModelV1Middleware } from "ai";
import { RequestMiddleware, ResponseMiddleware } from "@/lib/middleware";
export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: string
  isLoading?: boolean
  attachments?: Array<{
    type: string
    url: string
    name: string
  }>
}
interface UseChatOptions {
  initialMessages?: Message[]
  initialThreadId?: string
  onError?: (error: Error) => void
  onResponse?: (response: any) => void
  onFinish?: (messages: Message[]) => void
  apiEndpoint?: string
  cacheOptions?: {
    enabled?: boolean
    ttl?: number
    maxSize?: number
  }
  streamables?: {
    [key: string]: {
      initialValue?: React.ReactNode
      onUpdate?: (value: React.ReactNode) => void
    }
  }
  multistepOptions?: {
    enableToolComposition?: boolean
    contextWindow?: number
    maxSteps?: number
  }
  middleware?: {
    languageModel?: LanguageModelV1Middleware | LanguageModelV1Middleware[]
    request?: any[] // RequestMiddleware | RequestMiddleware[]
    response?: any[] // ResponseMiddleware | ResponseMiddleware[]
  }
  extractReasoning?: boolean
  simulateStreaming?: boolean
  defaultSettings?: {
    temperature?: number
    maxTokens?: number
    providerMetadata?: Record<string, any>
  }
}
⋮----
request?: any[] // RequestMiddleware | RequestMiddleware[]
response?: any[] // ResponseMiddleware | ResponseMiddleware[]
⋮----
export function useChat({
  initialMessages = [],
  initialThreadId,
  onError,
  onResponse,
  onFinish,
  apiEndpoint = "/api/chat",
  cacheOptions = {
    enabled: true,
    ttl: 60_000, // 1 minute default
    maxSize: 100,
  },
  streamables,
  middleware,
}: UseChatOptions =
⋮----
ttl: 60_000, // 1 minute default
⋮----
// Initialize streamable values
⋮----
// Reset messages when threadId changes
⋮----
// Fetch messages for a thread
const fetchMessages = async (threadId: string) =>
// Send a message
⋮----
// Cancel any ongoing request
⋮----
// Create new abort controller
⋮----
// Add user message to the UI immediately
⋮----
// Add loading message
⋮----
// Format messages for the API
⋮----
// Add the new user message
⋮----
// Generate cache key based on messages and other parameters
⋮----
// Check cache if enabled
⋮----
// Use cached response
⋮----
// Determine which API endpoint to use
⋮----
// Prepare request body
⋮----
// Add model ID if not using an agent
⋮----
// Add tools if selected
⋮----
// Add temperature and max tokens
⋮----
// Add middleware if provided
⋮----
// Make API request
⋮----
// Handle streaming response
⋮----
// Remove loading message
⋮----
// Add assistant message that will be updated
⋮----
// Process the stream with proper backpressure handling
⋮----
// Decode the chunk and update the message
⋮----
// Update the assistant message with the accumulated text
⋮----
// Call onResponse callback if provided
⋮----
// Add a small delay to prevent UI blocking
⋮----
// Handle streamable updates
⋮----
// Call onUpdate if provided
⋮----
// Check if error is due to abort
⋮----
// Remove loading message
⋮----
// Add error message
⋮----
// Remove loading message
⋮----
// Add step management functions
⋮----
// Replace placeholders with previous results
⋮----
// Send the message
⋮----
// Call progress callback if provided
⋮----
// Export middleware creation functions for use in the application
````

## File: hooks/use-supabase-realtime.ts
````typescript
/**
 * Hook for Supabase real-time subscriptions
 * Provides real-time updates for Supabase tables with automatic reconnection,
 * Zod validation, and optimized performance
 *
 * Also supports Upstash adapter for Supabase compatibility when configured
 *
 * @module hooks/use-supabase-realtime
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  SupabaseClient,
  RealtimeChannel,
  REALTIME_LISTEN_TYPES,
  REALTIME_PRESENCE_LISTEN_EVENTS,
  REALTIME_SUBSCRIBE_STATES,
  RealtimePostgresChangesPayload,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  RealtimePostgresDeletePayload,
  RealtimePresenceJoinPayload,
  RealtimePresenceLeavePayload,
} from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '@/types/supabase'
import { getSupabaseClient, isSupabaseClient, isUpstashClient } from '@/lib/memory/supabase'
import { useToast } from '@/hooks/use-toast'
import { useMemoryProvider } from './use-memory-provider'
import type { SupabaseClient as UpstashSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory'
export type ChannelType = 'postgres' | 'presence' | 'broadcast'
export type SubscriptionStatus =
  typeof REALTIME_SUBSCRIBE_STATES[keyof typeof REALTIME_SUBSCRIBE_STATES]
export type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in'
interface UseSupabaseRealtimeOptions<T extends z.ZodType<any, any>> {
  /* ------------------------ channel selection ----------------------- */
  channelType?: ChannelType
  channelName?: string
  table?: string
  /** database schema (public, private, etc.) */
  tableSchema?: string
  event?: PostgresChangeEvent
  filter?: { column: string; value: any; operator?: FilterOperator }
  enabled?: boolean
  maxReconnectAttempts?: number
  reconnectDelay?: number
  /** Zod schema for validating row payloads */
  zodSchema?: T
  logValidationErrors?: boolean
  onInsert?: (row: z.infer<T>) => void
  onUpdate?: (row: z.infer<T>) => void
  onDelete?: (row: z.infer<T>) => void
  onChange?: (payload: RealtimePostgresChangesPayload<z.infer<T>>) => void
  onBroadcast?: (payload: any) => void
  onPresenceSync?: (state: Record<string, any[]>) => void
  onPresenceJoin?: (
    key: string,
    newPresences: RealtimePresenceJoinPayload<any>['newPresences']
  ) => void
  onPresenceLeave?: (
    key: string,
    leftPresences: RealtimePresenceLeavePayload<any>['leftPresences']
  ) => void
  initialPresence?: Record<string, any>
  broadcastEventName?: string
  onStatusChange?: (status: SubscriptionStatus) => void
  onValidationError?: (err: z.ZodError) => void
  onError?: (err: Error) => void
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
⋮----
/* ------------------------ channel selection ----------------------- */
⋮----
/** database schema (public, private, etc.) */
⋮----
/** Zod schema for validating row payloads */
⋮----
/**
   * Upstash adapter options
   */
⋮----
/**
     * Whether to force using Upstash adapter
     * If not specified, will use the value from environment variables
     */
⋮----
/**
     * Whether to add Upstash adapter headers to the request
     * @default true
     */
⋮----
interface UseSupabaseRealtimeReturn {
  isConnected: boolean
  error: Error | null
  lastEventTimestamp: number | null
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  reconnect: () => void
  channel: RealtimeChannel | null
  broadcast?: (event: string, payload: any) => void
  track?: (presence: Record<string, any>) => Promise<void>
  untrack?: () => Promise<void>
  validationStats: { success: number; errors: number }
}
/**
 * Zod schema for Upstash adapter options
 */
⋮----
/**
   * Whether to force using Upstash adapter
   * If not specified, will use the value from environment variables
   */
⋮----
/**
   * Whether to add Upstash adapter headers to the request
   * @default true
   */
⋮----
/**
 * Zod schema for UseSupabaseRealtimeOptions
 */
export const UseSupabaseRealtimeOptionsSchema = <T extends z.ZodType<any, any>>(schema: T) => z.object(
export function useSupabaseRealtime<T extends z.ZodType<any, any> = z.ZodAny>(
  options: UseSupabaseRealtimeOptions<T>
): UseSupabaseRealtimeReturn
⋮----
// Validate options with Zod
⋮----
/** renamed to avoid collision */
⋮----
// Upstash adapter options
⋮----
// Determine if we should use Upstash adapter
⋮----
// Get the appropriate client based on configuration
⋮----
// Check if we're using Upstash and it doesn't support realtime
⋮----
// auto–reconnect
⋮----
// Initialize Supabase client
⋮----
// unique channel name
⋮----
// Check if we have a valid client that supports realtime
⋮----
const onPayload = (p: RealtimePostgresChangesPayload<any>) =>
⋮----
// presence
````

## File: hooks/use-supabase-direct.ts
````typescript
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
⋮----
/**
   * The table name to perform CRUD operations on
   */
⋮----
/**
   * Optional Drizzle schema table reference
   * If provided, will use Drizzle ORM for database operations
   */
⋮----
/**
   * Optional callback to transform data before saving
   */
⋮----
/**
   * Optional callback to transform data after fetching
   */
⋮----
/**
   * Optional error handler
   */
⋮----
/**
   * Optional success handler
   */
⋮----
/**
   * Cache options
   */
⋮----
/**
     * Whether to enable caching
     * @default true
     */
⋮----
/**
     * Maximum number of items to store in the cache
     * @default 100
     */
⋮----
/**
     * Time to live for cache entries in milliseconds
     * @default 60000 (1 minute)
     */
⋮----
/**
     * Whether to log cache hits and misses
     * @default false
     */
⋮----
/**
   * Whether to use Drizzle ORM for database operations
   * @default true if schemaTable is provided, false otherwise
   */
⋮----
/**
   * Whether to use optimistic updates for create, update, and delete operations
   * @default true
   */
⋮----
/**
   * Default page size for paginated queries
   * @default 20
   */
⋮----
/**
   * Whether to automatically refresh data after mutations
   * @default true
   */
⋮----
/**
   * Upstash adapter options
   */
⋮----
/**
     * Whether to force using Upstash adapter
     * If not specified, will use the value from environment variables
     */
⋮----
/**
     * Whether to add Upstash adapter headers to the request
     * @default true
     */
⋮----
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
⋮----
/**
   * Filter conditions
   */
⋮----
/**
   * Columns to select
   */
⋮----
/**
   * Pagination options
   */
⋮----
/**
     * Page number (1-based)
     */
⋮----
/**
     * Number of items per page
     */
⋮----
/**
     * Cursor for cursor-based pagination
     */
⋮----
/**
   * Sorting options
   */
⋮----
/**
     * Column to sort by
     */
⋮----
/**
     * Sort direction
     */
⋮----
/**
   * Relations to include
   */
⋮----
/**
   * Whether to count total rows
   */
⋮----
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
⋮----
/**
   * Column to filter on
   */
⋮----
/**
   * Operator to use
   */
⋮----
/**
   * Value to compare against
   */
⋮----
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
)
⋮----
// Get memory provider configuration
⋮----
// Determine if we should use Upstash adapter
⋮----
// Initialize LRU cache with optimized settings
⋮----
max: cacheOptions.maxSize || 500, // Increased default size for better hit rate
ttl: cacheOptions.ttl || 300000, // 5 minutes default TTL for better cache utilization
updateAgeOnGet: true, // Reset TTL when item is accessed
updateAgeOnHas: false, // Don't reset TTL on cache checks
allowStale: true, // Allow returning stale items before removing them
⋮----
// This allows for background refresh of cache items
// Return stale value immediately while fetching fresh data
⋮----
noDisposeOnSet: true, // Don't dispose items that are being replaced
noUpdateTTL: false, // Update TTL when item is set
⋮----
// Cache statistics for debugging and optimization
⋮----
// Initialize Drizzle client if needed
⋮----
// Create client refs to hold the Supabase or Upstash clients
⋮----
// Initialize clients if not already done
⋮----
// Create Upstash adapter client
⋮----
// Fall back to regular Supabase clients
⋮----
// Create regular Supabase clients
⋮----
// Get the clients from the refs
⋮----
// Type guard to check if client is Upstash adapter
const isUpstashAdapter = (client: any): client is UpstashSupabaseClient =>
// Use Drizzle if enabled
⋮----
/**
   * Handle errors from Supabase
   */
const handleError = (error: PostgrestError, operation: string) =>
⋮----
// Call custom error handler if provided
⋮----
// Default error handling
⋮----
/**
   * Handle success
   */
const handleSuccess = (operation: 'create' | 'update' | 'delete' | 'get', data?: any) =>
⋮----
// Default success handling
⋮----
/**
   * Cache management functions with optimized implementation
   */
⋮----
/**
     * Get an item from the cache with optimized performance
     * Uses allowStale option to return stale items while refreshing in background
     */
⋮----
// Get options with allowStale to improve performance
⋮----
// Check if the result is stale
⋮----
/**
     * Set an item in the cache with optimized settings
     * Uses background refresh for frequently accessed items
     */
⋮----
/**
     * Remove an item from the cache
     */
⋮----
/**
     * Clear the entire cache
     */
⋮----
// Reset statistics
⋮----
/**
     * Refresh a cache item if it exists
     * This is useful for background refreshing of frequently accessed items
     */
⋮----
// Check if item exists in cache (for future use)
⋮----
// Fetch new value
⋮----
// Update cache with new value
⋮----
/**
     * Get cache statistics with detailed metrics
     */
⋮----
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
}) =>
⋮----
// Build select statement with fields
⋮----
// Add join fields if specified
⋮----
// Apply join if specified
// Note: Join is implemented through the select statement
// as Supabase's JS client doesn't directly support JOIN operations
// The join is specified in the select statement format:
// select('*,foreign_table(*)')
⋮----
// Join is already handled in the select statement above
⋮----
// Apply simple filters (backward compatibility)
⋮----
// Apply advanced filters
⋮----
// Apply full-text search
⋮----
// Apply group by
// Note: Supabase's JS client doesn't directly support GROUP BY
// For complex grouping, consider using raw SQL queries
⋮----
// For simple cases, we can use the select statement to achieve grouping
// by selecting only the grouped columns
⋮----
// Apply having conditions
⋮----
// Note: Supabase doesn't directly support HAVING, but we can use it in raw SQL
// This is a simplified approach
⋮----
// Apply ordering (multiple columns)
⋮----
// Apply pagination
⋮----
// Convert data to the correct type with proper type casting
⋮----
// Cache the results with optimized settings
// Use a more efficient cache key that's less memory-intensive
⋮----
// Set TTL based on data size - larger datasets get shorter TTL
⋮----
? 60000  // 1 minute for large datasets
⋮----
? 180000  // 3 minutes for medium datasets
: 300000; // 5 minutes for small datasets
⋮----
/**
   * Get a single item by ID with optimized caching
   */
const getById = async (id: string | number) =>
⋮----
// Check cache first with optimized key
⋮----
// Cache the result with longer TTL for single items (10 minutes)
// Single items are accessed more frequently and change less often
⋮----
/**
   * Create a new item
   */
const create = async (data: T) =>
⋮----
// Invalidate any list caches since we've added a new item
⋮----
/**
   * Update an existing item
   */
const update = async (id: string | number, data: Partial<T>) =>
⋮----
// Invalidate specific item cache and any list caches
⋮----
// Invalidate list caches that might contain this item
⋮----
/**
   * Delete an item by ID
   */
const remove = async (id: string | number) =>
⋮----
// Invalidate specific item cache and any list caches
⋮----
// Invalidate list caches that might contain this item
⋮----
/**
   * Batch create multiple items
   */
const batchCreate = async (dataArray: T[]) =>
⋮----
// Invalidate all list caches after batch operation
⋮----
/**
   * Batch update multiple items
   */
const batchUpdate = async (dataArray: Array<
⋮----
// Process updates in batches of 10 to avoid overwhelming the database
⋮----
// Process each item in the batch
⋮----
// Invalidate all caches after batch update
// This is more efficient than trying to selectively invalidate
⋮----
/**
   * Batch delete multiple items
   */
const batchRemove = async (ids: Array<string | number>) =>
⋮----
// Process deletes in batches of 10 to avoid overwhelming the database
⋮----
// Invalidate all caches after batch delete
// This is more efficient than trying to selectively invalidate
⋮----
/**
   * Execute a raw SQL query
   * This provides maximum flexibility for complex queries
   * @param query SQL query string
   * @param params Query parameters
   * @returns Query results
   */
const executeRawQuery = async (query: string, params?: any[]) =>
⋮----
// For raw queries, we don't apply transformations
// as the structure may be completely different
⋮----
/**
   * Count records with optional filters
   */
const count = async (options?: {
    filters?: Record<string, any>;
    advancedFilters?: FilterCondition[];
}) =>
⋮----
// Apply simple filters
⋮----
// Apply advanced filters
⋮----
/**
   * Execute operations within a database transaction
   * All operations will be committed together or rolled back if any fails
   *
   * @param operations - Function containing operations to execute in transaction
   * @returns Result of the transaction
   */
const withTransaction = async <R>(
    operations: (client: typeof transactionClient) => Promise<R>
): Promise<R> =>
⋮----
// Begin transaction
⋮----
// Execute operations within transaction
⋮----
// Commit transaction
⋮----
// Rollback transaction on error
⋮----
// State
⋮----
// Basic CRUD operations
⋮----
// Batch operations
⋮----
// Advanced operations
⋮----
// Cache management
⋮----
// Direct access to Supabase client
````

## File: hooks/use-supabase-crud.ts
````typescript
/**
 * Hook for enhanced Supabase CRUD + Storage operations
 * - Typed table selects (filter/order/paginate)
 * - create / update / delete / batch insert
 * - file uploads (Supabase Storage)
 * - Zod request/response validation
 * - retry/backoff for transient network failures
 * - Upstash adapter support for Supabase compatibility
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { z } from "zod"
import { SupabaseClient, PostgrestError } from "@supabase/supabase-js"
import { getSupabaseClient, isSupabaseClient, isUpstashClient } from "@/lib/memory/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/types/supabase"
import { useMemoryProvider } from "./use-memory-provider"
import { createSupabaseClient } from "@/lib/memory/upstash/supabase-adapter-factory"
import type { SupabaseClient as UpstashSupabaseClient } from "@/lib/memory/upstash/supabase-adapter-factory"
// --- Table‐generic typings --------------------------------------------
type TableName = keyof Database["public"]["Tables"]
type RowOf<T extends TableName>   = Database["public"]["Tables"][T]["Row"]
type InsertOf<T extends TableName> = Database["public"]["Tables"][T]["Insert"]
type UpdateOf<T extends TableName> = Database["public"]["Tables"][T]["Update"]
// --- Hook options -----------------------------------------------------
type CrudOp = "fetch" | "create" | "update" | "delete" | "batch" | "upload"
export interface UseSupabaseCrudOptions<
  T extends TableName,
  Req extends Partial<InsertOf<T>> = Partial<InsertOf<T>>,
  Res extends RowOf<T> = RowOf<T>
> {
  table: T
  requestSchema?: z.ZodSchema<Req>
  responseSchema?: z.ZodSchema<Res>
  responseListSchema?: z.ZodSchema<Res[]>
  filters?: Partial<Record<keyof Res, any>>
  order?: { column: keyof Res; ascending?: boolean }
  pagination?: { limit: number; offset: number }
  maxRetries?: number
  retryDelay?: number
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
  onSuccess?: (op: CrudOp, data?: Res | Res[] | string) => void
  onError?: (err: Error, op: CrudOp) => void
}
⋮----
/**
   * Upstash adapter options
   */
⋮----
/**
     * Whether to force using Upstash adapter
     * If not specified, will use the value from environment variables
     */
⋮----
/**
     * Whether to add Upstash adapter headers to the request
     * @default true
     */
⋮----
// --- Hook return ------------------------------------------------------
export interface UseSupabaseCrudReturn<T extends TableName, Res> {
  items: Res[]
  loading: boolean
  error: Error | null
  fetchAll: () => Promise<Res[]>
  create: (data: Partial<InsertOf<T>>) => Promise<Res>
  update: (id: string, data: UpdateOf<T>) => Promise<Res>
  remove: (id: string) => Promise<void>
  batch: (arr: Partial<InsertOf<T>>[]) => Promise<Res[]>
  uploadFile: (bucket: string, path: string, file: File) => Promise<string>
}
// --- Hook implementation ---------------------------------------------
export function useSupabaseCrud<
  T extends TableName,
  Req extends Partial<InsertOf<T>> = Partial<InsertOf<T>>,
  Res extends RowOf<T> = RowOf<T>
>({
  table,
  requestSchema,
  responseSchema,
  responseListSchema,
  filters,
  order,
  pagination,
  maxRetries = 3,
  retryDelay = 500,
  upstash = { addHeaders: true },
  onSuccess,
  onError,
}: UseSupabaseCrudOptions<T, Req, Res>): UseSupabaseCrudReturn<T, Res>
⋮----
// Determine if we should use Upstash adapter
⋮----
// Create a ref to hold the client
⋮----
// Initialize the client if not already done
⋮----
// Fall back to regular Supabase client
⋮----
// Type guard to check if client is Upstash adapter
const isUpstashAdapter = (client: any): client is UpstashSupabaseClient =>
⋮----
// Zod validation helper
⋮----
// retry/backoff wrapper
⋮----
// --- FETCH ALL ------------------------------------------------------
⋮----
// Check if client is available
⋮----
// Use type assertion to handle both Supabase and Upstash adapter clients
⋮----
// --- CREATE ---------------------------------------------------------
⋮----
// Check if client is available
⋮----
// Use type assertion to handle both Supabase and Upstash adapter clients
⋮----
// --- UPDATE ---------------------------------------------------------
⋮----
// Check if client is available
⋮----
// Use type assertion to handle both Supabase and Upstash adapter clients
⋮----
// --- DELETE ---------------------------------------------------------
⋮----
// Check if client is available
⋮----
// Use type assertion to handle both Supabase and Upstash adapter clients
⋮----
// --- BATCH INSERT ---------------------------------------------------
⋮----
// Check if client is available
⋮----
// Use type assertion to handle both Supabase and Upstash adapter clients
⋮----
// --- FILE UPLOAD ----------------------------------------------------
⋮----
// Check if client is available
⋮----
// Get a regular Supabase client for storage operations
// This is because the Upstash adapter might not support storage operations
⋮----
// auto‐fetch on mount
````

## File: hooks/use-supabase-fetch.ts
````typescript
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
import { useState, useEffect, useRef, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { LRUCache } from "lru-cache"
import { useMemoryProvider } from "./use-memory-provider"
/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
interface UseSupabaseFetchOptions<T> {
  endpoint: string                              // API route   (e.g. /api/content/hero)
  resourceName: string                          // Human readable – used in toasts
  dataKey: string                               // Key containing the array in the response JSON
  initialData?: T[]
  queryParams?: Record<string, string>
  enabled?: boolean
  /* retry behaviour */
  maxRetries?: number
  retryDelay?: number                           // base delay in ms (exponential back-off)
  /* realtime subscriptions – currently unused but reserved for future use */
  realtime?: boolean
  pagination?: {
    pageSize?: number
    useCursor?: boolean
    initialCursor?: string
  }
  sort?: {
    column: string
    ascending?: boolean
  }[]
  cache?: {
    enabled?: boolean
    ttl?: number
    maxSize?: number
  }
  /* Upstash adapter options */
  upstash?: {
    /**
     * Whether to force using Upstash adapter
     * If not specified, will use the value from useMemoryProvider
     */
    forceUse?: boolean
    /**
     * Whether to add Upstash adapter headers to the request
     * @default true
     */
    addHeaders?: boolean
  }
  onSuccess?: (data: T[]) => void
  onError?: (error: Error) => void
}
⋮----
endpoint: string                              // API route   (e.g. /api/content/hero)
resourceName: string                          // Human readable – used in toasts
dataKey: string                               // Key containing the array in the response JSON
⋮----
/* retry behaviour */
⋮----
retryDelay?: number                           // base delay in ms (exponential back-off)
/* realtime subscriptions – currently unused but reserved for future use */
⋮----
/* Upstash adapter options */
⋮----
/**
     * Whether to force using Upstash adapter
     * If not specified, will use the value from useMemoryProvider
     */
⋮----
/**
     * Whether to add Upstash adapter headers to the request
     * @default true
     */
⋮----
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
}: UseSupabaseFetchOptions<T>)
⋮----
/* control */
⋮----
/* retry */
⋮----
/* pagination */
⋮----
/* cache */
⋮----
/* upstash */
⋮----
/* ---------------------------------------------------------------------- */
/* State                                                                  */
/* ---------------------------------------------------------------------- */
⋮----
/* pagination helpers */
⋮----
/* LRU cache */
⋮----
/* ---------------------------------------------------------------------- */
/* Main fetch function (memoised)                                         */
/* ---------------------------------------------------------------------- */
⋮----
/* for infinite scroll we don’t want a global spinner */
⋮----
/* build cache key */
⋮----
/* ---------------------------- 1. cache hit ----------------------- */
⋮----
/* ------------------------- 2. build URL -------------------------- */
⋮----
/* base params */
⋮----
/* pagination */
⋮----
/* sorting */
⋮----
/* ---------------------- 3. perform request ----------------------- */
// Add Upstash adapter headers if enabled
⋮----
// Check if we should use Upstash adapter
⋮----
// Add additional headers for Upstash adapter configuration
⋮----
// Add cache control headers
⋮----
// Log Upstash adapter usage for debugging
⋮----
/* ---------------------- 4. parse / validate ---------------------- */
⋮----
/* update state */
⋮----
/* cache */
⋮----
/* retry with exponential back-off */
⋮----
/* deps */
⋮----
JSON.stringify(queryParams),   // safe because queryParams is shallow
⋮----
/* -------------------------------------------------------------- */
/* Effects                                                        */
/* -------------------------------------------------------------- */
/* initial + reactive fetch */
⋮----
/* -------------------------------------------------------------- */
/* Public API                                                     */
/* -------------------------------------------------------------- */
const fetchMore = () =>
const refetch = ()
````

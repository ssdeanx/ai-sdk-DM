This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where empty lines have been removed, line numbers have been added, content has been formatted for parsing in markdown style, content has been compressed (code blocks are separated by ⋮---- delimiter).

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
5. Multiple file entries, each consisting of:
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
- Line numbers have been added to the beginning of each line
- Content has been formatted for parsing in markdown style
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

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
import { useEffect, useState } from 'react';
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

## File: hooks/use-mobile.tsx

````typescript
export function useIsMobile()
⋮----
const onChange = () =>
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

## File: hooks/use-chat.ts

````typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { LRUCache } from 'lru-cache';
import { LanguageModelV1Middleware } from 'ai';
import { RequestMiddleware, ResponseMiddleware } from '@/lib/middleware';
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  isLoading?: boolean;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
  }>;
}
interface UseChatOptions {
  initialMessages?: Message[];
  initialThreadId?: string;
  onError?: (error: Error) => void;
  onResponse?: (response: any) => void;
  onFinish?: (messages: Message[]) => void;
  apiEndpoint?: string;
  cacheOptions?: {
    enabled?: boolean;
    ttl?: number;
    maxSize?: number;
  };
  streamables?: {
    [key: string]: {
      initialValue?: React.ReactNode;
      onUpdate?: (value: React.ReactNode) => void;
    };
  };
  multistepOptions?: {
    enableToolComposition?: boolean;
    contextWindow?: number;
    maxSteps?: number;
  };
  middleware?: {
    languageModel?: LanguageModelV1Middleware | LanguageModelV1Middleware[];
    request?: any[]; // RequestMiddleware | RequestMiddleware[]
    response?: any[]; // ResponseMiddleware | ResponseMiddleware[]
  };
  extractReasoning?: boolean;
  simulateStreaming?: boolean;
  defaultSettings?: {
    temperature?: number;
    maxTokens?: number;
    providerMetadata?: Record<string, any>;
  };
}
⋮----
request?: any[]; // RequestMiddleware | RequestMiddleware[]
response?: any[]; // ResponseMiddleware | ResponseMiddleware[]
⋮----
export function useChat({
  initialMessages = [],
  initialThreadId,
  onError,
  onResponse,
  onFinish,
  apiEndpoint = '/api/chat',
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

## File: hooks/use-executor.ts

````typescript
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { LRUCache } from 'lru-cache';
import {
  AgentStateSchema as LibsqlAgentStateSchema,
  WorkflowSchema as LibsqlWorkflowSchema,
  WorkflowStepSchema as LibsqlWorkflowStepSchema,
  MessageSchema as LibsqlMessageSchema,
  MemoryThreadSchema as LibsqlMemoryThreadSchema,
  EmbeddingSchema as LibsqlEmbeddingSchema,
} from '@/db/libsql/validation';
import {
  WorkflowSchema as SupabaseWorkflowSchema,
  WorkflowStepSchema as SupabaseWorkflowStepSchema,
} from '@/db/supabase/validation';
import type { AgentState, WorkflowStep, Message } from '@/db/libsql/validation';
/**
 * Options for executing an agent.
 * @property agentId - The agent's unique identifier.
 * @property db - The database backend to use ('supabase' or 'libsql').
 * @property onSuccess - Callback for successful execution.
 * @property onError - Callback for error handling.
 */
export interface UseAgentExecutorOptions {
  agentId: string;
  db?: 'supabase' | 'libsql';
  onSuccess?: (data: AgentState | Message | WorkflowStep | object) => void;
  onError?: (error: Error) => void;
}
/**
 * Options for executing a tool.
 * @property toolId - The tool's unique identifier.
 * @property db - The database backend to use ('supabase' or 'libsql').
 * @property onSuccess - Callback for successful execution.
 * @property onError - Callback for error handling.
 */
export interface UseToolExecutorOptions {
  toolId: string;
  db?: 'supabase' | 'libsql';
  onSuccess?: (data: WorkflowStep | object) => void;
  onError?: (error: Error) => void;
}
/**
 * React hook for executing an agent by ID with type-safe response validation.
 * @param options - UseAgentExecutorOptions
 * @returns Agent execution API
 */
export function useAgentExecutor({
  agentId,
  db = 'libsql',
  onSuccess,
  onError,
}: UseAgentExecutorOptions)
⋮----
// Canonical schemas for validation
⋮----
const executeAgent = async (
    message: string,
    history: Message[] = [],
    retryCount = 0
): Promise<AgentState | Message | WorkflowStep | object> =>
const executeAgentWithStream = async (
    message: string,
    history: Message[] = [],
    onChunk: (chunk: string) => void
): Promise<AgentState | Message | WorkflowStep | object> =>
⋮----
/**
 * React hook for executing a tool by ID with type-safe response validation.
 * @param options - UseToolExecutorOptions
 * @returns Tool execution API
 */
export function useToolExecutor({
  toolId,
  db = 'libsql',
  onSuccess,
  onError,
}: UseToolExecutorOptions)
⋮----
const executeTool = async (
    parameters: Record<string, unknown>
): Promise<WorkflowStep | object> =>
⋮----
// Generated on 2025-05-19 - Now supports both Supabase and LibSQL, with canonical schemas and runtime selection.
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
/**
 * Custom hook to determine if Upstash adapter should be used
 */
export function useShouldUseUpstashAdapter(): boolean
/**
 * Custom hook to check if Upstash Redis is available
 */
export function useIsUpstashRedisAvailable(): boolean
/**
 * Custom hook to check if Upstash Vector is available
 */
export function useIsUpstashVectorAvailable(): boolean
/**
 * Upstash CRUD Client - provides a Supabase-like CRUD interface using Upstash via the /api/ai-sdk/crud/[table] API
 */
export function useUpstashCrudClient()
⋮----
// Generic CRUD methods using the API route
async function getAll(table: string)
async function create(table: string, item: unknown)
async function update(table: string, id: string, updates: unknown)
async function remove(table: string, id: string)
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
import { ToastAction as ToastActionComponent } from '@/components/ui/toast';
import type { ToastActionElement, ToastProps } from '@/components/ui/toast';
// Configuration
const TOAST_LIMIT = 5; // Increased from 1 to allow multiple toasts
const TOAST_REMOVE_DELAY = 5000; // Reduced from 1000000 to 5000ms (5 seconds)
/**
 * Toast variant types
 */
export type ToastVariant = 'default' | 'destructive';
/**
 * Toast priority levels
 */
export type ToastPriority = 'low' | 'normal' | 'high' | 'urgent';
/**
 * Toast action with callback
 */
export interface ToastAction {
  label: string;
  onClick: () => void;
  className?: string;
}
/**
 * Enhanced toast properties
 */
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: ToastVariant;
  duration?: number;
  priority?: ToastPriority;
  icon?: React.ReactNode;
  onDismiss?: () => void;
  group?: string;
  createdAt: number;
};
/**
 * Toast action types
 */
⋮----
function genId()
type ActionType = typeof actionTypes;
/**
 * Toast actions
 */
type Action =
  | {
      type: ActionType['ADD_TOAST'];
      toast: ToasterToast;
    }
  | {
      type: ActionType['UPDATE_TOAST'];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType['DISMISS_TOAST'];
      toastId?: ToasterToast['id'];
    }
  | {
      type: ActionType['REMOVE_TOAST'];
      toastId?: ToasterToast['id'];
    }
  | {
      type: ActionType['DISMISS_ALL_TOASTS'];
    }
  | {
      type: ActionType['REMOVE_ALL_TOASTS'];
    }
  | {
      type: ActionType['DISMISS_GROUP'];
      group: string;
    }
  | {
      type: ActionType['PAUSE_TOAST'];
      toastId: ToasterToast['id'];
    }
  | {
      type: ActionType['RESUME_TOAST'];
      toastId: ToasterToast['id'];
    };
/**
 * Toast state
 */
interface State {
  toasts: ToasterToast[];
  paused: Record<string, boolean>;
  queue: ToasterToast[];
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
return bPriority - aPriority; // Higher priority first
⋮----
return a.createdAt - b.createdAt; // Older first
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
type ToastOptions = Omit<ToasterToast, 'id' | 'createdAt'>;
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
// Use React.createElement to avoid JSX syntax issues in non-TSX file
⋮----
altText: props.action.label, // required by ToastActionProps
⋮----
/**
 * Enhanced toast hook
 */
function useToast()
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
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { LRUCache } from 'lru-cache';
import { getDrizzleClient } from '@/lib/memory/drizzle';
import { DATABASE_URL } from '../lib/tools/graphql/constants';
import { useMemoryProvider } from './use-memory-provider';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import type { SupabaseClient as UpstashSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
/**
 * Options for the useSupabaseDirect hook
 */
interface UseSupabaseDirectOptions<T> {
  /**
   * The table name to perform CRUD operations on
   */
  tableName: string;
  /**
   * Optional Drizzle schema table reference
   * If provided, will use Drizzle ORM for database operations
   */
  schemaTable?: any;
  /**
   * Optional callback to transform data before saving
   */
  transformBeforeSave?: (data: T) => any;
  /**
   * Optional callback to transform data after fetching
   */
  transformAfterFetch?: (data: any) => T;
  /**
   * Optional error handler
   */
  onError?: (error: PostgrestError | Error, operation?: string) => void;
  /**
   * Optional success handler
   */
  onSuccess?: (
    operation: 'create' | 'update' | 'delete' | 'get' | 'batch' | 'query',
    data?: any
  ) => void;
  /**
   * Cache options
   */
  cache?: {
    /**
     * Whether to enable caching
     * @default true
     */
    enabled?: boolean;
    /**
     * Maximum number of items to store in the cache
     * @default 100
     */
    maxSize?: number;
    /**
     * Time to live for cache entries in milliseconds
     * @default 60000 (1 minute)
     */
    ttl?: number;
    /**
     * Whether to log cache hits and misses
     * @default false
     */
    debug?: boolean;
  };
  /**
   * Whether to use Drizzle ORM for database operations
   * @default true if schemaTable is provided, false otherwise
   */
  useDrizzle?: boolean;
  /**
   * Whether to use optimistic updates for create, update, and delete operations
   * @default true
   */
  optimisticUpdates?: boolean;
  /**
   * Default page size for paginated queries
   * @default 20
   */
  defaultPageSize?: number;
  /**
   * Whether to automatically refresh data after mutations
   * @default true
   */
  autoRefresh?: boolean;
  /**
   * Upstash adapter options
   */
  upstash?: {
    /**
     * Whether to force using Upstash adapter
     * If not specified, will use the value from environment variables
     */
    forceUse?: boolean;
    /**
     * Whether to add Upstash adapter headers to the request
     * @default true
     */
    addHeaders?: boolean;
  };
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
  filters?: FilterCondition[];
  /**
   * Columns to select
   */
  select?: string | string[];
  /**
   * Pagination options
   */
  pagination?: {
    /**
     * Page number (1-based)
     */
    page?: number;
    /**
     * Number of items per page
     */
    pageSize?: number;
    /**
     * Cursor for cursor-based pagination
     */
    cursor?: string;
  };
  /**
   * Sorting options
   */
  sort?: {
    /**
     * Column to sort by
     */
    column: string;
    /**
     * Sort direction
     */
    ascending?: boolean;
  }[];
  /**
   * Relations to include
   */
  include?: string[];
  /**
   * Whether to count total rows
   */
  count?: boolean;
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
  column: string;
  /**
   * Operator to use
   */
  operator: FilterOperator;
  /**
   * Value to compare against
   */
  value: any;
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
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'in'
  | 'is'
  | 'contains'
  | 'containedBy'
  | 'overlaps'
  | 'textSearch'
  | 'between'
  | 'notBetween'
  | 'rangeGt'
  | 'rangeLt'
  | 'rangeGte'
  | 'rangeLte'
  | 'rangeAdjacent';
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
const handleSuccess = (
    operation: 'create' | 'update' | 'delete' | 'get',
    data?: any
) =>
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
? 60000 // 1 minute for large datasets
⋮----
? 180000 // 3 minutes for medium datasets
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
const batchUpdate = async (
    dataArray: Array<{ id: string | number; data: Partial<T> }>
) =>
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
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RealtimeChannel,
  REALTIME_LISTEN_TYPES,
  REALTIME_PRESENCE_LISTEN_EVENTS,
  REALTIME_SUBSCRIBE_STATES,
  RealtimePostgresDeletePayload,
  RealtimePresenceJoinPayload,
  RealtimePostgresChangesFilter,
  RealtimePostgresChangesPayload, // Added for clarity in onPayload
  RealtimePostgresInsertPayload, // Added for clarity in onPayload
  RealtimePostgresUpdatePayload, // Added for clarity in onPayload
  RealtimePresenceLeavePayload,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT, // Added for type-safe event comparison
  createClient as createSupabaseJsClient,
  SupabaseClient as OfficialSupabaseClient,
} from '@supabase/supabase-js';
⋮----
RealtimePostgresChangesPayload, // Added for clarity in onPayload
RealtimePostgresInsertPayload, // Added for clarity in onPayload
RealtimePostgresUpdatePayload, // Added for clarity in onPayload
⋮----
REALTIME_POSTGRES_CHANGES_LISTEN_EVENT, // Added for type-safe event comparison
⋮----
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useMemoryProvider } from './use-memory-provider';
import {
  createSupabaseClient as createCanonicalSupabaseClient,
  SupabaseClient as AdapterSupabaseClient,
} from '@/lib/memory/upstash/supabase-adapter-factory';
export type ChannelType = 'postgres' | 'presence' | 'broadcast';
export type SubscriptionStatus =
  (typeof REALTIME_SUBSCRIBE_STATES)[keyof typeof REALTIME_SUBSCRIBE_STATES];
export type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';
interface UseSupabaseRealtimeOptions<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends z.ZodType<Record<string, any>, any, any>,
> {
  /* ------------------------ channel selection ----------------------- */
  channelType?: ChannelType;
  channelName?: string;
  table?: string;
  /** database schema (public, private, etc.) */
  tableSchema?: string;
  event?: PostgresChangeEvent;
  filter?: { column: string; value: unknown; operator?: FilterOperator };
  enabled?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  /** Zod schema for validating row payloads */
  zodSchema?: T;
  logValidationErrors?: boolean;
  onInsert?: (row: z.infer<T>) => void;
  onUpdate?: (row: z.infer<T>) => void;
  onDelete?: (row: z.infer<T>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<z.infer<T>>) => void;
  onBroadcast?: (payload: unknown) => void;
  onPresenceSync?: (state: Record<string, unknown[]>) => void;
  onPresenceJoin?: (
    key: string,
    newPresences: RealtimePresenceJoinPayload<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Record<string, any>
    >['newPresences']
  ) => void;
  onPresenceLeave?: (
    key: string,
    leftPresences: RealtimePresenceLeavePayload<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Record<string, any>
    >['leftPresences']
  ) => void;
  initialPresence?: Record<string, unknown>;
  broadcastEventName?: string;
  onStatusChange?: (status: SubscriptionStatus) => void;
  onValidationError?: (err: z.ZodError) => void;
  onError?: (err: Error) => void;
  /**
   * Upstash adapter options
   */
  upstash?: {
    /**
     * Whether to force using Upstash adapter
     * If not specified, will use the value from environment variables
     */
    forceUse?: boolean;
    /**
     * Whether to add Upstash adapter headers to the request
     * @default true
     */
    addHeaders?: boolean;
  };
}
⋮----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
⋮----
/* ------------------------ channel selection ----------------------- */
⋮----
/** database schema (public, private, etc.) */
⋮----
/** Zod schema for validating row payloads */
⋮----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
⋮----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  isConnected: boolean;
  error: Error | null;
  lastEventTimestamp: number | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  reconnect: () => void;
  channel: RealtimeChannel | null;
  broadcast?: (event: string, payload: unknown) => void;
  track?: (presence: Record<string, unknown>) => Promise<void>;
  untrack?: () => Promise<void>;
  validationStats: { success: number; errors: number };
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
export const UseSupabaseRealtimeOptionsSchema = <
  T extends z.ZodType<unknown, z.ZodTypeDef>,
>(
  schema: T
)
export function useSupabaseRealtime<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends z.ZodType<Record<string, any>, any, any> = z.ZodAny,
>(options: UseSupabaseRealtimeOptions<T>): UseSupabaseRealtimeReturn
⋮----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
⋮----
// Validate options with Zod
⋮----
/** renamed to avoid collision */
⋮----
// Upstash adapter options
⋮----
// Ref to hold the subscribe function to break circular dependency
⋮----
// Determine if we should use Upstash adapter
⋮----
// Initialize canonical Supabase or Upstash client
⋮----
// Use canonical Upstash adapter factory
⋮----
// Upstash adapter does not support realtime subscriptions
⋮----
// Use canonical Supabase client factory (replace with your actual Supabase client)
// You may want to inject your Supabase client here instead of creating a new one every time
// Example:
⋮----
// handleStatus is defined before subscribe.
// It uses subscribeRef.current() to call the latest version of subscribe,
// breaking the direct circular dependency for useCallback.
⋮----
// auto–reconnect
⋮----
// Call the latest version of subscribe via ref
⋮----
// setIsConnected, setConnectionStatus are stable state setters from useState
// and refs (reconnectAttemptsRef, reconnectTimeoutRef) are stable.
// They are not strictly needed in the dependency array.
⋮----
// Initialize Supabase client
⋮----
// unique channel name
⋮----
// Check if we have a valid client that supports realtime
⋮----
// The initSupabase function is expected to throw if shouldUseUpstash is true,
// as the Upstash adapter (AdapterSupabaseClient) doesn't support realtime.
// This check ensures that whatever client we have, it must support .channel().
// This acts as a runtime safeguard and a type guard for TypeScript.
⋮----
// If shouldUseUpstash is true, initSupabase should have already thrown.
// This error indicates an unexpected state or misconfiguration if reached with an Upstash client.
⋮----
// TypeScript now knows that supabaseClient has a 'channel' method.
// Assert to OfficialSupabaseClient to ensure ch is correctly typed for official RealtimeChannel methods.
// This is safe because initSupabase throws if shouldUseUpstash is true,
// and the checks above ensure a client with a 'channel' method is present.
⋮----
// `table` is guaranteed to be non-null here due to the check earlier in the subscribe function.
// `event` is of type PostgresChangeEvent ('INSERT' | 'UPDATE' | 'DELETE' | '*')
// which is compatible with the generic constraint of RealtimePostgresChangesFilter.
⋮----
table: table!, // table is asserted as non-null due to prior checks
⋮----
const onPayload = (p: RealtimePostgresChangesPayload<z.infer<T>>) =>
// The filter string for postgres changes
⋮----
// Use paramsForChannel in ch.on() call
⋮----
onPayload // Callback is compatible
⋮----
onPayload // Callback is compatible
⋮----
onPayload // Callback is compatible
⋮----
// event === REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL ('*')
// In this branch, 'event' is narrowed to '*'
⋮----
onPayload // Callback is compatible
⋮----
// Supabase broadcast payload is an object: { type: 'broadcast', event: string, payload: any }
⋮----
onBroadcast?.(payloadEnvelope.payload); // Extract the actual payload
⋮----
// presence
⋮----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
⋮----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
⋮----
// Effect to update the subscribeRef when the subscribe function is recreated
````

## File: hooks/use-supabase-crud.ts

````typescript
/**
 * Hook for enhanced Supabase CRUD + Storage operations
 * - Typed table selects (filter/order/paginate)
 * - create / update / delete / batch insert
 * - Zod request/response validation
 * - retry/backoff for transient network failures
 * - Upstash adapter support for Supabase compatibility
 */
import { useState, useCallback, useRef } from 'react';
import { z } from 'zod';
import {
  createSupabaseClient,
  TableClient,
  tableSchemas,
  TableName,
} from '@/lib/memory/upstash/supabase-adapter-factory';
import { useToast } from '@/components/ui/use-toast';
type RowType<T extends TableName> = z.infer<(typeof tableSchemas)[T]>;
export interface UseSupabaseCrudOptions<T extends TableName> {
  table: T;
  filters?: Partial<RowType<T>>;
  order?: { column: keyof RowType<T>; ascending?: boolean };
  pagination?: { limit: number; offset: number };
  maxRetries?: number;
  retryDelay?: number;
  upstash?: { forceUse?: boolean; addHeaders?: boolean };
  onSuccess?: (op: string, data?: RowType<T> | RowType<T>[] | string) => void;
  onError?: (err: Error, op: string) => void;
}
export interface UseSupabaseCrudReturn<T extends TableName> {
  items: RowType<T>[];
  loading: boolean;
  error: Error | null;
  fetchAll: () => Promise<RowType<T>[]>;
  create: (data: Partial<RowType<T>>) => Promise<RowType<T>>;
  update: (id: string, data: Partial<RowType<T>>) => Promise<RowType<T>>;
  remove: (id: string) => Promise<void>;
  batch: (arr: Partial<RowType<T>>[]) => Promise<RowType<T>[]>;
  uploadFile: () => Promise<void>;
}
export function useSupabaseCrud<T extends TableName>({
  table,
  onSuccess,
  onError,
}: UseSupabaseCrudOptions<T>): UseSupabaseCrudReturn<T>
⋮----
// Use canonical TableClient from Upstash adapter factory
⋮----
// Helper to get id from row (type-safe)
⋮----
// --- FETCH ALL ------------------------------------------------------
⋮----
// --- CREATE ---------------------------------------------------------
⋮----
// --- UPDATE ---------------------------------------------------------
⋮----
// --- DELETE ---------------------------------------------------------
⋮----
// --- BATCH ----------------------------------------------------------
⋮----
// --- FILE UPLOAD (stub, see storage hooks for real impl) ------------
const uploadFile = async () =>
⋮----
// Generated on 2025-05-19 - Type-safe, canonical TableClient and schema usage. All errors resolved.
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
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
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
⋮----
endpoint: string; // API route   (e.g. /api/content/hero)
resourceName: string; // Human readable – used in toasts
dataKey: string; // Key containing the array in the response JSON
⋮----
/* retry behaviour */
⋮----
retryDelay?: number; // base delay in ms (exponential back-off)
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
// Optionally, use upstashLogger here if logging is required
// upstashLogger.info('use-supabase-fetch', `Using Upstash adapter for fetch: ${endpoint}`);
⋮----
/* ---------------------- 4. parse / validate ---------------------- */
⋮----
/* update state */
⋮----
/* cache */
⋮----
/* retry with exponential back-off */
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

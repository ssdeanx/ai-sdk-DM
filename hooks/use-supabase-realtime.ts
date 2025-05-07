'use client'

/**
 * Hook for Supabase real-time subscriptions
 * Provides real-time updates for Supabase tables with automatic reconnection
 * and optimized performance
 *
 * @module hooks/use-supabase-realtime
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { useToast } from '@/hooks/use-toast'

/**
 * Channel type for Supabase Realtime
 */
export type ChannelType = 'postgres' | 'presence' | 'broadcast'

/**
 * Options for the useSupabaseRealtime hook
 */
interface UseSupabaseRealtimeOptions {
  /**
   * Channel type (default: 'postgres')
   * - 'postgres': Subscribe to database changes
   * - 'presence': Track online users and their state
   * - 'broadcast': Send and receive messages between clients
   */
  channelType?: ChannelType

  /**
   * Channel name for presence or broadcast channels
   * Required when channelType is 'presence' or 'broadcast'
   */
  channelName?: string

  /**
   * Table to subscribe to
   * Required when channelType is 'postgres'
   */
  table?: string

  /**
   * Schema of the table (default: 'public')
   * Only used when channelType is 'postgres'
   */
  schema?: string

  /**
   * Event to listen for (default: '*' for all events)
   * Only used when channelType is 'postgres'
   */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'

  /**
   * Filter condition for the subscription
   * Only used when channelType is 'postgres'
   */
  filter?: {
    column: string
    value: any
    operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in'
  }

  /**
   * Whether the subscription is enabled
   */
  enabled?: boolean

  /**
   * Maximum number of reconnection attempts
   */
  maxReconnectAttempts?: number

  /**
   * Base delay between reconnection attempts (will be multiplied by 2^retryCount)
   */
  reconnectDelay?: number

  /**
   * Callback when a record is inserted
   * Only used when channelType is 'postgres'
   */
  onInsert?: (payload: any) => void

  /**
   * Callback when a record is updated
   * Only used when channelType is 'postgres'
   */
  onUpdate?: (payload: any) => void

  /**
   * Callback when a record is deleted
   * Only used when channelType is 'postgres'
   */
  onDelete?: (payload: any) => void

  /**
   * Callback when a broadcast message is received
   * Only used when channelType is 'broadcast'
   */
  onBroadcast?: (payload: any) => void

  /**
   * Callback when presence state changes
   * Only used when channelType is 'presence'
   */
  onPresenceSync?: (state: any) => void

  /**
   * Callback when a user joins
   * Only used when channelType is 'presence'
   */
  onPresenceJoin?: (key: string, currentPresence: any) => void

  /**
   * Callback when a user leaves
   * Only used when channelType is 'presence'
   */
  onPresenceLeave?: (key: string, currentPresence: any) => void

  /**
   * Initial presence state to track
   * Only used when channelType is 'presence'
   */
  initialPresence?: Record<string, any>

  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void
}

/**
 * Hook for Supabase real-time subscriptions
 */
export function useSupabaseRealtime({
  table,
  schema = 'public',
  event = '*',
  filter,
  enabled = true,
  maxReconnectAttempts = 5,
  reconnectDelay = 1000,
  onInsert,
  onUpdate,
  onDelete,
  onError
}: UseSupabaseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastEventTimestamp, setLastEventTimestamp] = useState<number | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')

  const channelRef = useRef<RealtimeChannel | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null)

  const { toast } = useToast()

  /**
   * Initialize Supabase client
   * Uses the session pooler URL for better performance with real-time subscriptions
   */
  const initSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        {
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          },
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
          global: {
            headers: {
              'x-client-info': 'SupabaseRealtime-Hook'
            }
          },
          db: {
            schema: 'public',
          }
        }
      )
    }
    return supabaseRef.current
  }, [])

  /**
   * Subscribe to real-time updates
   */
  const subscribe = useCallback(() => {
    if (!enabled) {
      setConnectionStatus('disconnected')
      return
    }

    try {
      setConnectionStatus('connecting')
      setError(null)

      const supabase = initSupabase()

      // Build channel name with table and filter for better debugging
      const filterString = filter ? `${filter.column}_${filter.operator || 'eq'}_${filter.value}` : 'all'
      const channelName = `${schema}_${table}_${filterString}_${Date.now()}`

      // Create channel
      let channel = supabase.channel(channelName)

      // Build filter
      let filterBuilder = channel.on(
        'postgres_changes',
        {
          event,
          schema,
          table
        },
        (payload) => {
          // Update last event timestamp
          setLastEventTimestamp(Date.now())

          // Call appropriate callback based on event type
          switch (payload.eventType) {
            case 'INSERT':
              if (onInsert) onInsert(payload.new)
              break
            case 'UPDATE':
              if (onUpdate) onUpdate({ old: payload.old, new: payload.new })
              break
            case 'DELETE':
              if (onDelete) onDelete(payload.old)
              break
          }
        }
      )

      // Apply filter if provided
      if (filter) {
        const { column, value, operator = 'eq' } = filter

        // Convert filter to Postgres format
        filterBuilder = channel.filter(
          'postgres_changes',
          {
            event,
            schema,
            table,
            filter: `${column}=${operator}.${value}`
          },
          (payload) => {
            // Same event handling as above
            setLastEventTimestamp(Date.now())

            switch (payload.eventType) {
              case 'INSERT':
                if (onInsert) onInsert(payload.new)
                break
              case 'UPDATE':
                if (onUpdate) onUpdate({ old: payload.old, new: payload.new })
                break
              case 'DELETE':
                if (onDelete) onDelete(payload.old)
                break
            }
          }
        )
      }

      // Subscribe to channel
      channel
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            setConnectionStatus('connected')
            reconnectAttemptsRef.current = 0
          } else {
            setIsConnected(false)
            setConnectionStatus('disconnected')
          }
        })

      // Store channel reference
      channelRef.current = channel

      return () => {
        channel.unsubscribe()
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to subscribe to real-time updates')
      setError(error)
      setConnectionStatus('disconnected')

      if (onError) {
        onError(error)
      }

      // Attempt to reconnect
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current)

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++
          subscribe()
        }, delay)
      } else {
        toast({
          title: 'Connection failed',
          description: `Failed to connect to real-time updates after ${maxReconnectAttempts} attempts.`,
          variant: 'destructive'
        })
      }
    }
  }, [
    enabled,
    table,
    schema,
    event,
    filter,
    maxReconnectAttempts,
    reconnectDelay,
    onInsert,
    onUpdate,
    onDelete,
    onError,
    initSupabase,
    toast
  ])

  // Subscribe on mount and when dependencies change
  useEffect(() => {
    const cleanup = subscribe()

    return () => {
      if (cleanup) cleanup()

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [subscribe])

  return {
    isConnected,
    error,
    lastEventTimestamp,
    connectionStatus,
    reconnect: subscribe
  }
}

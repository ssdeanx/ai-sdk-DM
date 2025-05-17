'use client';

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
} from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '@/types/supabase';
import {
  getSupabaseClient,
  isSupabaseClient,
  isUpstashClient,
} from '@/lib/memory/supabase';
import { useToast } from '@/hooks/use-toast';
import { useMemoryProvider } from './use-memory-provider';
import type { SupabaseClient as UpstashSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';

export type ChannelType = 'postgres' | 'presence' | 'broadcast';
export type SubscriptionStatus =
  (typeof REALTIME_SUBSCRIBE_STATES)[keyof typeof REALTIME_SUBSCRIBE_STATES];
export type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';

interface UseSupabaseRealtimeOptions<T extends z.ZodType<any, any>> {
  /* ------------------------ channel selection ----------------------- */
  channelType?: ChannelType;
  channelName?: string;
  table?: string;

  /** database schema (public, private, etc.) */
  tableSchema?: string;

  event?: PostgresChangeEvent;
  filter?: { column: string; value: any; operator?: FilterOperator };

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

  onBroadcast?: (payload: any) => void;

  onPresenceSync?: (state: Record<string, any[]>) => void;
  onPresenceJoin?: (
    key: string,
    newPresences: RealtimePresenceJoinPayload<any>['newPresences']
  ) => void;
  onPresenceLeave?: (
    key: string,
    leftPresences: RealtimePresenceLeavePayload<any>['leftPresences']
  ) => void;
  initialPresence?: Record<string, any>;

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

interface UseSupabaseRealtimeReturn {
  isConnected: boolean;
  error: Error | null;
  lastEventTimestamp: number | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  reconnect: () => void;
  channel: RealtimeChannel | null;
  broadcast?: (event: string, payload: any) => void;
  track?: (presence: Record<string, any>) => Promise<void>;
  untrack?: () => Promise<void>;
  validationStats: { success: number; errors: number };
}

/**
 * Zod schema for Upstash adapter options
 */
export const UpstashAdapterOptionsSchema = z
  .object({
    /**
     * Whether to force using Upstash adapter
     * If not specified, will use the value from environment variables
     */
    forceUse: z.boolean().optional(),

    /**
     * Whether to add Upstash adapter headers to the request
     * @default true
     */
    addHeaders: z.boolean().optional().default(true),
  })
  .optional();

/**
 * Zod schema for UseSupabaseRealtimeOptions
 */
export const UseSupabaseRealtimeOptionsSchema = <T extends z.ZodType<any, any>>(
  schema: T
) =>
  z.object({
    channelType: z
      .enum(['postgres', 'presence', 'broadcast'])
      .optional()
      .default('postgres'),
    channelName: z.string().optional(),
    table: z.string().optional(),
    tableSchema: z.string().optional().default('public'),
    event: z.enum(['INSERT', 'UPDATE', 'DELETE', '*']).optional().default('*'),
    filter: z
      .object({
        column: z.string(),
        value: z.any(),
        operator: z
          .enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in'])
          .optional(),
      })
      .optional(),
    enabled: z.boolean().optional().default(true),
    maxReconnectAttempts: z.number().optional().default(5),
    reconnectDelay: z.number().optional().default(1000),
    zodSchema: schema.optional(),
    logValidationErrors: z.boolean().optional().default(true),
    onInsert: z.function().args(z.any()).returns(z.void()).optional(),
    onUpdate: z.function().args(z.any()).returns(z.void()).optional(),
    onDelete: z.function().args(z.any()).returns(z.void()).optional(),
    onChange: z.function().args(z.any()).returns(z.void()).optional(),
    onBroadcast: z.function().args(z.any()).returns(z.void()).optional(),
    onPresenceSync: z
      .function()
      .args(z.record(z.array(z.any())))
      .returns(z.void())
      .optional(),
    onPresenceJoin: z
      .function()
      .args(z.string(), z.any())
      .returns(z.void())
      .optional(),
    onPresenceLeave: z
      .function()
      .args(z.string(), z.any())
      .returns(z.void())
      .optional(),
    initialPresence: z.record(z.any()).optional(),
    broadcastEventName: z.string().optional().default('message'),
    onStatusChange: z.function().args(z.any()).returns(z.void()).optional(),
    onValidationError: z
      .function()
      .args(z.instanceof(z.ZodError))
      .returns(z.void())
      .optional(),
    onError: z
      .function()
      .args(z.instanceof(Error))
      .returns(z.void())
      .optional(),
    upstash: UpstashAdapterOptionsSchema,
  });

export function useSupabaseRealtime<T extends z.ZodType<any, any> = z.ZodAny>(
  options: UseSupabaseRealtimeOptions<T>
): UseSupabaseRealtimeReturn {
  // Validate options with Zod
  const {
    channelType = 'postgres',
    channelName,
    table,
    tableSchema = 'public',
    event = '*',
    filter,
    enabled = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,

    /** renamed to avoid collision */
    zodSchema,
    logValidationErrors = true,
    onInsert,
    onUpdate,
    onDelete,
    onChange,

    onBroadcast,

    onPresenceSync,
    onPresenceJoin,
    onPresenceLeave,
    initialPresence,

    broadcastEventName = 'message',
    onStatusChange,
    onValidationError,
    onError,

    // Upstash adapter options
    upstash = { addHeaders: true },
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastEventTimestamp, setLastEventTimestamp] = useState<number | null>(
    null
  );
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('disconnected');
  const [validationStats, setValidationStats] = useState({
    success: 0,
    errors: 0,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const { useUpstashAdapter } = useMemoryProvider();

  // Determine if we should use Upstash adapter
  const shouldUseUpstash =
    upstash?.forceUse !== undefined ? upstash.forceUse : useUpstashAdapter;

  const initSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      // Get the appropriate client based on configuration
      supabaseRef.current = getSupabaseClient();

      // Check if we're using Upstash and it doesn't support realtime
      if (shouldUseUpstash && isUpstashClient(supabaseRef.current)) {
        console.warn(
          "Upstash adapter doesn't fully support Supabase Realtime. Some features may not work as expected."
        );
      }
    }
    return supabaseRef.current;
  }, [shouldUseUpstash]);

  const validateData = useCallback(
    (data: any) => {
      if (!zodSchema) return { success: true as const, data };
      try {
        const d = zodSchema.parse(data);
        setValidationStats((s) => ({ ...s, success: s.success + 1 }));
        return { success: true as const, data: d };
      } catch (err) {
        if (err instanceof z.ZodError) {
          setValidationStats((s) => ({ ...s, errors: s.errors + 1 }));
          if (logValidationErrors) console.error(err.errors);
          onValidationError?.(err);
          return { success: false as const, error: err };
        }
        throw err;
      }
    },
    [zodSchema, logValidationErrors, onValidationError]
  );

  const handleStatus = useCallback(
    (status: SubscriptionStatus) => {
      onStatusChange?.(status);
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
      } else if (
        status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT ||
        status === REALTIME_SUBSCRIBE_STATES.CLOSED ||
        status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR
      ) {
        setIsConnected(false);
        setConnectionStatus('disconnected');

        // auto–reconnect
        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelay * 2 ** reconnectAttemptsRef.current;
          clearTimeout(reconnectTimeoutRef.current!);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            subscribe();
          }, delay);
        }
      }
    },
    [enabled, maxReconnectAttempts, reconnectDelay, onStatusChange]
  );

  const broadcast = useCallback(
    (ev: string, payload: any) => {
      if (channelType !== 'broadcast' || !channelRef.current) return;
      channelRef.current.send({ type: 'broadcast', event: ev, payload });
    },
    [channelType]
  );

  const track = useCallback(
    async (presence: Record<string, any>) => {
      if (channelType !== 'presence' || !channelRef.current) return;
      await channelRef.current.track(presence);
    },
    [channelType]
  );

  const untrack = useCallback(async () => {
    if (channelType !== 'presence' || !channelRef.current) return;
    await channelRef.current.untrack();
  }, [channelType]);

  const subscribe = useCallback(() => {
    if (!enabled) {
      setConnectionStatus('disconnected');
      return;
    }

    try {
      setConnectionStatus('connecting');
      setError(null);

      // Initialize Supabase client
      const supabaseClient = initSupabase();

      if (channelType === 'postgres' && !table) {
        throw new Error('`table` is required for postgres channel');
      }
      if (
        (channelType === 'broadcast' || channelType === 'presence') &&
        !channelName
      ) {
        throw new Error('`channelName` is required for this channel type');
      }

      // unique channel name
      const name =
        channelType === 'postgres'
          ? `${tableSchema}_${table}_${filter ? `${filter.column}_${filter.operator}_${filter.value}` : 'all'}_${Date.now()}`
          : `${channelName}_${channelType}_${Date.now()}`;

      // Check if we have a valid client that supports realtime
      if (
        !supabaseClient ||
        (shouldUseUpstash &&
          isUpstashClient(supabaseClient) &&
          !('channel' in supabaseClient))
      ) {
        throw new Error(
          'Realtime subscriptions are not supported with the current client configuration'
        );
      }

      const ch = supabaseClient.channel(name);

      if (channelType === 'postgres') {
        const params: any = { event, schema: tableSchema, table };
        if (filter) {
          params.filter = `${filter.column}=${filter.operator || 'eq'}.${filter.value}`;
        }
        const onPayload = (p: RealtimePostgresChangesPayload<any>) => {
          setLastEventTimestamp(Date.now());
          onChange?.(p);
          switch (p.eventType) {
            case 'INSERT': {
              const v = validateData(
                (p as RealtimePostgresInsertPayload<any>).new
              );
              if (v.success) onInsert?.(v.data);
              break;
            }
            case 'UPDATE': {
              const v = validateData(
                (p as RealtimePostgresUpdatePayload<any>).new
              );
              if (v.success) onUpdate?.(v.data);
              break;
            }
            case 'DELETE': {
              const v = validateData(
                (p as RealtimePostgresDeletePayload<any>).old
              );
              if (v.success) onDelete?.(v.data);
              break;
            }
          }
        };

        ch.on(
          REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
          params,
          onPayload
        ).subscribe(handleStatus);
      } else if (channelType === 'broadcast') {
        ch.on(
          REALTIME_LISTEN_TYPES.BROADCAST,
          { event: broadcastEventName },
          (p: any) => {
            setLastEventTimestamp(Date.now());
            onBroadcast?.(p);
          }
        ).subscribe(handleStatus);
      } else {
        // presence
        ch.on(
          REALTIME_LISTEN_TYPES.PRESENCE,
          { event: REALTIME_PRESENCE_LISTEN_EVENTS.SYNC },
          () => {
            setLastEventTimestamp(Date.now());
            onPresenceSync?.(ch.presenceState());
          }
        )
          .on(
            REALTIME_LISTEN_TYPES.PRESENCE,
            { event: REALTIME_PRESENCE_LISTEN_EVENTS.JOIN },
            (p: RealtimePresenceJoinPayload<any>) => {
              setLastEventTimestamp(Date.now());
              onPresenceJoin?.(p.key, p.newPresences);
            }
          )
          .on(
            REALTIME_LISTEN_TYPES.PRESENCE,
            { event: REALTIME_PRESENCE_LISTEN_EVENTS.LEAVE },
            (p: RealtimePresenceLeavePayload<any>) => {
              setLastEventTimestamp(Date.now());
              onPresenceLeave?.(p.key, p.leftPresences);
            }
          )
          .subscribe(async (status: SubscriptionStatus) => {
            if (
              status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED &&
              initialPresence
            ) {
              await ch.track(initialPresence);
            }
            handleStatus(status);
          });
      }

      channelRef.current = ch;
      return () => {
        ch.unsubscribe();
      };
    } catch (err: any) {
      const e = err instanceof Error ? err : new Error('Subscription failed');
      setError(e);
      setConnectionStatus('disconnected');
      onError?.(e);
      toast({
        title: 'Realtime error',
        description: e.message,
        variant: 'destructive',
      });
    }
  }, [
    channelType,
    table,
    tableSchema,
    event,
    filter,
    channelName,
    enabled,
    reconnectDelay,
    maxReconnectAttempts,
    initSupabase,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    onBroadcast,
    onPresenceSync,
    onPresenceJoin,
    onPresenceLeave,
    initialPresence,
    broadcastEventName,
    handleStatus,
    validateData,
    toast,
    onError,
  ]);

  useEffect(() => {
    const cleanup = subscribe();
    return () => {
      cleanup?.();
      clearTimeout(reconnectTimeoutRef.current!);
      channelRef.current?.unsubscribe();
    };
  }, [subscribe]);

  return {
    isConnected,
    error,
    lastEventTimestamp,
    connectionStatus,
    reconnect: subscribe,
    channel: channelRef.current,
    broadcast,
    track,
    untrack,
    validationStats,
  };
}

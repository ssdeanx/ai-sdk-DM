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
  RealtimeChannel,
  REALTIME_PRESENCE_LISTEN_EVENTS,
  REALTIME_SUBSCRIBE_STATES,
  RealtimePostgresDeletePayload,
  RealtimePresenceJoinPayload,
  RealtimePostgresChangesPayload, // Added for clarity in onPayload
  RealtimePostgresInsertPayload, // Added for clarity in onPayload
  RealtimePostgresUpdatePayload, // Added for clarity in onPayload
  RealtimePresenceLeavePayload,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT, // Added for type-safe event comparison
  createClient as createSupabaseJsClient,
  SupabaseClient as OfficialSupabaseClient,
} from '@supabase/supabase-js';
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
export const UseSupabaseRealtimeOptionsSchema = <
  T extends z.ZodType<unknown, z.ZodTypeDef>,
>(
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
        value: z.unknown(),
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
    onInsert: z.function().args(z.unknown()).returns(z.void()).optional(),
    onUpdate: z.function().args(z.unknown()).returns(z.void()).optional(),
    onDelete: z.function().args(z.unknown()).returns(z.void()).optional(),
    onChange: z.function().args(z.unknown()).returns(z.void()).optional(),
    onBroadcast: z.function().args(z.unknown()).returns(z.void()).optional(),
    onPresenceSync: z
      .function()
      .args(z.record(z.array(z.unknown())))
      .returns(z.void())
      .optional(),
    onPresenceJoin: z
      .function()
      .args(z.string(), z.unknown())
      .returns(z.void())
      .optional(),
    onPresenceLeave: z
      .function()
      .args(z.string(), z.unknown())
      .returns(z.void())
      .optional(),
    initialPresence: z.record(z.unknown()).optional(),
    broadcastEventName: z.string().optional().default('message'),
    onStatusChange: z.function().args(z.unknown()).returns(z.void()).optional(),
    onValidationError: z
      .function()
      .args(z.instanceof(z.ZodError))
      .returns(z.void())
      .optional(),
    onError: z.function().args(z.instanceof(Error)).returns(z.void()),
  });

export function useSupabaseRealtime<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends z.ZodType<Record<string, any>, any, any> = z.ZodAny,
>(options: UseSupabaseRealtimeOptions<T>): UseSupabaseRealtimeReturn {
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

  const [isConnected, setIsConnected] = useState<boolean>(false);
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
  const supabaseRef = useRef<
    OfficialSupabaseClient | AdapterSupabaseClient | null
  >(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to hold the subscribe function to break circular dependency
  const subscribeRef = useRef<(() => (() => void) | void) | undefined>(
    undefined
  );

  const { toast } = useToast();
  const { useUpstashAdapter } = useMemoryProvider();

  // Determine if we should use Upstash adapter
  const shouldUseUpstash =
    upstash?.forceUse !== undefined ? upstash.forceUse : useUpstashAdapter;

  // Initialize canonical Supabase or Upstash client
  const initSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      // Always use direct Supabase client for realtime
      try {
        supabaseRef.current = createSupabaseJsClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
      } catch (e) {
        // Propagate error if client creation fails
        throw new Error(
          'Failed to initialize Supabase client for realtime: ' +
            (e instanceof Error ? e.message : String(e))
        );
      }
    }
    return supabaseRef.current;
  }, []);

  const validateData = useCallback(
    (data: z.infer<T>) => {
      if (!zodSchema) return { success: true as const, data };
      try {
        const d = zodSchema.parse(data);
        setValidationStats((s) => ({ ...s, success: s.success + 1 }));
        return { success: true as const, data: d };
      } catch (err) {
        if (err instanceof z.ZodError) {
          setValidationStats((s) => ({ ...s, errors: s.errors + 1 }));
          if (logValidationErrors && onValidationError) onValidationError(err);
          return { success: false as const, error: err };
        }
        throw err;
      }
    },
    [zodSchema, logValidationErrors, onValidationError]
  );

  // handleStatus is defined before subscribe.
  // It uses subscribeRef.current() to call the latest version of subscribe,
  // breaking the direct circular dependency for useCallback.
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
            // Call the latest version of subscribe via ref
            if (subscribeRef.current) {
              subscribeRef.current();
            }
          }, delay);
        }
      }
    },
    [
      enabled,
      maxReconnectAttempts,
      reconnectDelay,
      onStatusChange,
      // setIsConnected, setConnectionStatus are stable state setters from useState
      // and refs (reconnectAttemptsRef, reconnectTimeoutRef) are stable.
      // They are not strictly needed in the dependency array.
    ]
  );

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
      if (!supabaseClient) {
        throw new Error('Supabase client is not initialized.');
      }

      // The initSupabase function is expected to throw if shouldUseUpstash is true,
      // as the Upstash adapter (AdapterSupabaseClient) doesn't support realtime.
      // This check ensures that whatever client we have, it must support .channel().
      // This acts as a runtime safeguard and a type guard for TypeScript.
      if (
        !('channel' in supabaseClient) ||
        typeof supabaseClient.channel !== 'function'
      ) {
        // If shouldUseUpstash is true, initSupabase should have already thrown.
        // This error indicates an unexpected state or misconfiguration if reached with an Upstash client.
        const specificError = shouldUseUpstash
          ? 'Realtime subscriptions are not supported with the Upstash adapter (client lacks channel method). `initSupabase` should have caught this.'
          : 'The configured Supabase client does not support realtime channels (client lacks channel method).';
        throw new Error(specificError);
      }

      // TypeScript now knows that supabaseClient has a 'channel' method.
      // Assert to OfficialSupabaseClient to ensure ch is correctly typed for official RealtimeChannel methods.
      // This is safe because initSupabase throws if shouldUseUpstash is true,
      // and the checks above ensure a client with a 'channel' method is present.
      const ch = (supabaseClient as OfficialSupabaseClient).channel(name);

      if (channelType === 'postgres') {
        // `table` is guaranteed to be non-null here due to the check earlier in the subscribe function.
        // `event` is of type PostgresChangeEvent ('INSERT' | 'UPDATE' | 'DELETE' | '*')
        // which is compatible with the generic constraint of RealtimePostgresChangesFilter.
        // const paramsForChannel: RealtimePostgresChangesFilter<typeof event> = {
        //   event: event,
        //   schema: tableSchema,
        //   table: table!, // table is asserted as non-null due to prior checks
        const onPayload = (p: RealtimePostgresChangesPayload<z.infer<T>>) => {
          setLastEventTimestamp(Date.now());
          onChange?.(p);
          switch (p.eventType) {
            case REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT: {
              const v = validateData(
                (p as RealtimePostgresInsertPayload<z.infer<T>>).new
              );
              if (v.success) onInsert?.(v.data);
              break;
            }
            case REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE: {
              const v = validateData(
                (p as RealtimePostgresUpdatePayload<z.infer<T>>).new
              );
              if (v.success) onUpdate?.(v.data);
              break;
            }
            case REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE: {
              const v = validateData(
                (p as RealtimePostgresDeletePayload<z.infer<T>>).old
              );
              if (v.success) onDelete?.(v.data);
              break;
            }
          }
        };

        // The filter string for postgres changes
        const postgresFilterString = filter
          ? `${filter.column}=${filter.operator || 'eq'}.${filter.value}`
          : undefined;

        // Use paramsForChannel in ch.on() call
        if (event === REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT) {
          ch.on(
            'postgres_changes' as const,
            {
              event: event, // Use narrowed 'INSERT'
              schema: tableSchema,
              table: table!,
              filter: postgresFilterString,
            },
            onPayload // Callback is compatible
          ).subscribe(handleStatus);
        } else if (event === REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE) {
          ch.on(
            'postgres_changes' as const,
            {
              event: event, // Use narrowed 'UPDATE'
              schema: tableSchema,
              table: table!,
              filter: postgresFilterString,
            },
            onPayload // Callback is compatible
          ).subscribe(handleStatus);
        } else if (event === REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE) {
          ch.on(
            'postgres_changes' as const,
            {
              event: event, // Use narrowed 'DELETE'
              schema: tableSchema,
              table: table!,
              filter: postgresFilterString,
            },
            onPayload // Callback is compatible
          ).subscribe(handleStatus);
        } else {
          // event === REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL ('*')
          // In this branch, 'event' is narrowed to '*'
          ch.on(
            'postgres_changes' as const,
            {
              event: event, // Use narrowed '*'
              schema: tableSchema,
              table: table!,
              filter: postgresFilterString,
            },
            onPayload // Callback is compatible
          ).subscribe(handleStatus);
        }
      } else if (channelType === 'broadcast') {
        ch.on(
          'broadcast',
          { event: broadcastEventName },
          // Supabase broadcast payload is an object: { type: 'broadcast', event: string, payload: any }
          (payloadEnvelope: {
            type: string;
            event: string;
            payload: unknown;
          }) => {
            setLastEventTimestamp(Date.now());
            onBroadcast?.(payloadEnvelope.payload); // Extract the actual payload
          }
        ).subscribe(handleStatus);
      } else {
        // presence
        ch.on(
          'presence',
          { event: REALTIME_PRESENCE_LISTEN_EVENTS.SYNC },
          () => {
            setLastEventTimestamp(Date.now());
            onPresenceSync?.(ch.presenceState());
          }
        )
          .on(
            'presence',
            { event: REALTIME_PRESENCE_LISTEN_EVENTS.JOIN },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: RealtimePresenceJoinPayload<Record<string, any>>) => {
              setLastEventTimestamp(Date.now());
              onPresenceJoin?.(p.key, p.newPresences);
            }
          )
          .on(
            'presence',
            { event: REALTIME_PRESENCE_LISTEN_EVENTS.LEAVE },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: RealtimePresenceLeavePayload<Record<string, any>>) => {
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
    } catch (err) {
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
    enabled,
    initSupabase,
    channelType,
    table,
    channelName,
    tableSchema,
    filter,
    shouldUseUpstash,
    event,
    handleStatus,
    onChange,
    validateData,
    onInsert,
    onUpdate,
    onDelete,
    broadcastEventName,
    onBroadcast,
    onPresenceSync,
    onPresenceJoin,
    onPresenceLeave,
    initialPresence,
    onError,
    toast,
  ]);

  // Effect to update the subscribeRef when the subscribe function is recreated
  useEffect(() => {
    subscribeRef.current = subscribe;
  }, [subscribe]);

  const broadcast = useCallback(
    (ev: string, payload: unknown) => {
      if (channelType !== 'broadcast' || !channelRef.current) return;
      channelRef.current.send({ type: 'broadcast', event: ev, payload });
    },
    [channelType]
  );

  const track = useCallback(
    async (presence: Record<string, unknown>) => {
      if (channelType !== 'presence' || !channelRef.current) return;
      await channelRef.current.track(presence);
    },
    [channelType]
  );

  const untrack = useCallback(async () => {
    if (channelType !== 'presence' || !channelRef.current) return;
    await channelRef.current.untrack();
  }, [channelType]);

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

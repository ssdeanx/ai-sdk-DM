'use client';

/**
 * Hook for enhanced Supabase CRUD + Storage operations
 * - Typed table selects (filter/order/paginate)
 * - create / update / delete / batch insert
 * - file uploads (Supabase Storage)
 * - Zod request/response validation
 * - retry/backoff for transient network failures
 * - Upstash adapter support for Supabase compatibility
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { z } from 'zod';
import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import {
  getSupabaseClient,
  isSupabaseClient,
  isUpstashClient,
} from '@/lib/memory/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/types/supabase';
import { useMemoryProvider } from './use-memory-provider';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import type { SupabaseClient as UpstashSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';

// --- Table‐generic typings --------------------------------------------
type TableName = keyof Database['public']['Tables'];
type RowOf<T extends TableName> = Database['public']['Tables'][T]['Row'];
type InsertOf<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type UpdateOf<T extends TableName> = Database['public']['Tables'][T]['Update'];

// --- Hook options -----------------------------------------------------
type CrudOp = 'fetch' | 'create' | 'update' | 'delete' | 'batch' | 'upload';

export interface UseSupabaseCrudOptions<
  T extends TableName,
  Req extends Partial<InsertOf<T>> = Partial<InsertOf<T>>,
  Res extends RowOf<T> = RowOf<T>,
> {
  table: T;
  requestSchema?: z.ZodSchema<Req>;
  responseSchema?: z.ZodSchema<Res>;
  responseListSchema?: z.ZodSchema<Res[]>;

  filters?: Partial<Record<keyof Res, any>>;
  order?: { column: keyof Res; ascending?: boolean };
  pagination?: { limit: number; offset: number };

  maxRetries?: number;
  retryDelay?: number;

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

  onSuccess?: (op: CrudOp, data?: Res | Res[] | string) => void;
  onError?: (err: Error, op: CrudOp) => void;
}

// --- Hook return ------------------------------------------------------
export interface UseSupabaseCrudReturn<T extends TableName, Res> {
  items: Res[];
  loading: boolean;
  error: Error | null;

  fetchAll: () => Promise<Res[]>;
  create: (data: Partial<InsertOf<T>>) => Promise<Res>;
  update: (id: string, data: UpdateOf<T>) => Promise<Res>;
  remove: (id: string) => Promise<void>;
  batch: (arr: Partial<InsertOf<T>>[]) => Promise<Res[]>;
  uploadFile: (bucket: string, path: string, file: File) => Promise<string>;
}

// --- Hook implementation ---------------------------------------------
export function useSupabaseCrud<
  T extends TableName,
  Req extends Partial<InsertOf<T>> = Partial<InsertOf<T>>,
  Res extends RowOf<T> = RowOf<T>,
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
}: UseSupabaseCrudOptions<T, Req, Res>): UseSupabaseCrudReturn<T, Res> {
  const toast = useToast().toast;
  const { useUpstashAdapter } = useMemoryProvider();

  // Determine if we should use Upstash adapter
  const shouldUseUpstash =
    upstash.forceUse !== undefined ? upstash.forceUse : useUpstashAdapter;

  // Create a ref to hold the client
  const clientRef = useRef<
    SupabaseClient<Database> | UpstashSupabaseClient | null
  >(null);

  // Initialize the client if not already done
  if (!clientRef.current) {
    if (shouldUseUpstash) {
      try {
        clientRef.current = createSupabaseClient();
        console.log('Using Upstash adapter for Supabase CRUD operations');
      } catch (error) {
        console.error('Error creating Upstash adapter:', error);
        // Fall back to regular Supabase client
        clientRef.current = getSupabaseClient() as SupabaseClient<Database>;
      }
    } else {
      clientRef.current = getSupabaseClient() as SupabaseClient<Database>;
    }
  }

  // Type guard to check if client is Upstash adapter
  const isUpstashAdapter = (client: any): client is UpstashSupabaseClient => {
    return (
      client &&
      typeof client === 'object' &&
      'isUpstashAdapter' in client &&
      client.isUpstashAdapter === true
    );
  };

  const [items, setItems] = useState<Res[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const retryCount = useRef<number>(0);

  // Zod validation helper
  const validate = useCallback(
    <S>(schema: z.ZodSchema<S> | undefined, data: unknown): S => {
      if (!schema) return data as S;
      return schema.parse(data);
    },
    []
  );

  // retry/backoff wrapper
  const withRetry = useCallback(
    async <R>(op: CrudOp, fn: () => Promise<R> | R): Promise<R> => {
      try {
        const result = await fn();
        retryCount.current = 0;
        return result;
      } catch (err: any) {
        const isNetwork =
          err instanceof Error && /(fetch|network|\d{3})/i.test(err.message);
        if (isNetwork && retryCount.current < maxRetries) {
          retryCount.current++;
          await new Promise((r) =>
            setTimeout(r, retryDelay * 2 ** (retryCount.current - 1))
          );
          return withRetry(op, fn);
        }
        retryCount.current = 0;
        throw err;
      }
    },
    [maxRetries, retryDelay]
  );

  // --- FETCH ALL ------------------------------------------------------
  const fetchAll = useCallback(async (): Promise<Res[]> => {
    setLoading(true);
    setError(null);
    try {
      // Check if client is available
      if (!clientRef.current) {
        throw new Error('Database client is not available');
      }

      const { data, error: pgErr } = await withRetry(
        'fetch' as const,
        async () => {
          // Use type assertion to handle both Supabase and Upstash adapter clients
          const client = clientRef.current as any;
          let q = client.from(table).select('*');
          if (filters) {
            for (const [col, val] of Object.entries(filters)) {
              q = q.eq(col as any, val as any);
            }
          }
          if (order) {
            q = q.order(order.column as string, {
              ascending: order.ascending ?? true,
            });
          }
          if (pagination) {
            q = q.range(
              pagination.offset,
              pagination.offset + pagination.limit - 1
            );
          }
          return q;
        }
      );
      if (pgErr) throw pgErr;
      const rows = responseListSchema
        ? validate(responseListSchema, data)
        : (data as unknown as Res[]);

      setItems(rows);
      onSuccess?.('fetch', rows);
      return rows;
    } catch (err: any) {
      setError(err);
      onError?.(err, 'fetch');
      toast({
        title: 'Fetch Error',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [
    clientRef,
    table,
    filters,
    order,
    pagination,
    responseListSchema,
    validate,
    onSuccess,
    onError,
    toast,
    withRetry,
  ]);

  // --- CREATE ---------------------------------------------------------
  const create = useCallback(
    async (data: Partial<InsertOf<T>>): Promise<Res> => {
      setLoading(true);
      setError(null);

      // Check if client is available
      if (!clientRef.current) {
        throw new Error('Database client is not available');
      }

      let validated: Partial<InsertOf<T>>;
      try {
        validated = validate(
          requestSchema as z.ZodSchema<Partial<InsertOf<T>>>,
          data
        );
      } catch (zErr: any) {
        setError(zErr);
        onError?.(zErr, 'create');
        toast({
          title: 'Validation Error',
          description: zErr.message,
          variant: 'destructive',
        });
        throw zErr;
      }

      return withRetry('create' as const, async () => {
        try {
          // Use type assertion to handle both Supabase and Upstash adapter clients
          const client = clientRef.current as any;
          const { data: result, error: pgErr } = await client
            .from(table)
            .insert([validated as any])
            .select('*')
            .single();

          if (pgErr) throw pgErr;
          if (!result) throw new Error('No data returned');

          const row = validate(responseSchema, result) as Res;
          setItems((cur) => [row, ...cur]);
          onSuccess?.('create', row);
          toast({ title: 'Created', description: 'Record created.' });
          return row;
        } catch (err: any) {
          setError(err);
          onError?.(err, 'create');
          toast({
            title: 'Create Error',
            description: err.message,
            variant: 'destructive',
          });
          throw err;
        } finally {
          setLoading(false);
        }
      });
    },
    [
      clientRef,
      table,
      requestSchema,
      responseSchema,
      validate,
      onSuccess,
      onError,
      toast,
      withRetry,
    ]
  );

  // --- UPDATE ---------------------------------------------------------
  const update = useCallback(
    async (id: string, changes: UpdateOf<T>): Promise<Res> => {
      setLoading(true);
      setError(null);

      // Check if client is available
      if (!clientRef.current) {
        throw new Error('Database client is not available');
      }

      let validated: UpdateOf<T>;
      try {
        validated = validate(
          responseSchema as z.ZodSchema<UpdateOf<T>>,
          { ...changes, id } as any
        );
      } catch (zErr: any) {
        setError(zErr);
        onError?.(zErr, 'update');
        toast({
          title: 'Validation Error',
          description: zErr.message,
          variant: 'destructive',
        });
        throw zErr;
      }

      try {
        const result = await withRetry('update' as const, async () => {
          const updateData = { ...validated };
          if ('id' in updateData) {
            delete updateData.id;
          }
          // Use type assertion to handle both Supabase and Upstash adapter clients
          const client = clientRef.current as any;
          return await client
            .from(table)
            .update(updateData as any)
            .eq('id', id as any)
            .select('*')
            .single();
        });

        if (result.error) throw result.error;
        if (!result.data) throw new Error('No data returned');

        const row = validate(responseSchema, result.data);
        setItems((cur) => cur.map((r) => ('id' in r && r.id === id ? row : r)));
        onSuccess?.('update', row);
        toast({ title: 'Updated', description: 'Record updated.' });
        return row;
      } catch (err: any) {
        setError(err);
        onError?.(err, 'update');
        toast({
          title: 'Update Error',
          description: err.message,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      clientRef,
      table,
      responseSchema,
      validate,
      onSuccess,
      onError,
      toast,
      withRetry,
    ]
  );

  // --- DELETE ---------------------------------------------------------
  const remove = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true);
      setError(null);

      // Check if client is available
      if (!clientRef.current) {
        throw new Error('Database client is not available');
      }

      try {
        const result = await withRetry('delete' as const, async () => {
          // Use type assertion to handle both Supabase and Upstash adapter clients
          const client = clientRef.current as any;
          return await client
            .from(table)
            .delete()
            .eq('id', id as any)
            .select('*')
            .single();
        });
        if (result.error) throw result.error;

        setItems((cur) => cur.filter((r) => 'id' in r && r.id !== id));
        onSuccess?.('delete');
        toast({ title: 'Deleted', description: 'Record deleted.' });
      } catch (err: any) {
        setError(err);
        onError?.(err, 'delete');
        toast({
          title: 'Delete Error',
          description: err.message,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clientRef, table, onSuccess, onError, toast, withRetry]
  );

  // --- BATCH INSERT ---------------------------------------------------
  const batch = useCallback(
    async (arr: Partial<InsertOf<T>>[]): Promise<Res[]> => {
      setLoading(true);
      setError(null);

      // Check if client is available
      if (!clientRef.current) {
        throw new Error('Database client is not available');
      }

      let validatedArr: Partial<InsertOf<T>>[];
      try {
        validatedArr = arr.map((d) =>
          validate(requestSchema as z.ZodSchema<Partial<InsertOf<T>>>, d)
        );
      } catch (zErr: any) {
        setError(zErr);
        onError?.(zErr, 'batch');
        toast({
          title: 'Validation Error',
          description: zErr.message,
          variant: 'destructive',
        });
        throw zErr;
      }

      try {
        const result = await withRetry('batch' as const, async () => {
          // Use type assertion to handle both Supabase and Upstash adapter clients
          const client = clientRef.current as any;
          return await client
            .from(table)
            .insert(validatedArr as any)
            .select('*');
        });

        if (result.error) throw result.error;
        if (!result.data) throw new Error('No data returned');

        const rows = responseListSchema
          ? validate(responseListSchema, result.data)
          : (result.data as unknown as Res[]);

        setItems((cur) => [...rows, ...cur]);
        onSuccess?.('batch', rows);
        toast({
          title: 'Batch Created',
          description: `${rows.length} records created.`,
        });
        return rows;
      } catch (err: any) {
        setError(err);
        onError?.(err, 'batch');
        toast({
          title: 'Batch Error',
          description: err.message,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      clientRef,
      table,
      requestSchema,
      responseListSchema,
      validate,
      onSuccess,
      onError,
      toast,
      withRetry,
    ]
  );

  // --- FILE UPLOAD ----------------------------------------------------
  const uploadFile = useCallback(
    async (bucket: string, path: string, file: File): Promise<string> => {
      setLoading(true);
      setError(null);

      // Check if client is available
      if (!clientRef.current) {
        throw new Error('Database client is not available');
      }

      try {
        // Get a regular Supabase client for storage operations
        // This is because the Upstash adapter might not support storage operations
        const storageClient = getSupabaseClient() as any;

        const { error: stErr } = await storageClient.storage
          .from(bucket)
          .upload(path, file);
        if (stErr) throw stErr as unknown as PostgrestError;

        const url = storageClient.storage.from(bucket).getPublicUrl(path)
          .data.publicUrl;
        onSuccess?.('upload', url);
        toast({ title: 'Uploaded', description: 'File uploaded.' });
        return url;
      } catch (err: any) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        onError?.(e, 'upload');
        toast({
          title: 'Upload Error',
          description: e.message,
          variant: 'destructive',
        });
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [clientRef, onSuccess, onError, toast]
  );

  // auto‐fetch on mount
  useEffect(() => {
    fetchAll().catch(() => {});
  }, [fetchAll]);

  return {
    items,
    loading,
    error,
    fetchAll,
    create,
    update,
    remove,
    batch,
    uploadFile,
  };
}

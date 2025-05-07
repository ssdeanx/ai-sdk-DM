"use client"

/**
 * Hook for enhanced Supabase CRUD + Storage operations
 * - Typed table selects (filter/order/paginate)
 * - create / update / delete / batch insert
 * - file uploads (Supabase Storage)
 * - Zod request/response validation
 * - retry/backoff for transient network failures
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { z } from "zod"
import { SupabaseClient, PostgrestError } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/types/supabase"
import { LRUCache } from "lru-cache"

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

  onSuccess?: (op: CrudOp, data?: Res | Res[] | string) => void
  onError?: (err: Error, op: CrudOp) => void
}

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
  onSuccess,
  onError,
}: UseSupabaseCrudOptions<T, Req, Res>): UseSupabaseCrudReturn<T, Res> {
  const toast = useToast().toast
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null)
  if (!supabaseRef.current) supabaseRef.current = getSupabaseClient()
  const supabase = supabaseRef.current

  const [items, setItems] = useState<Res[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const retryCount = useRef<number>(0)

  // Zod validation helper
  const validate = useCallback(
    <S>(schema: z.ZodSchema<S> | undefined, data: unknown): S => {
      if (!schema) return data as S
      return schema.parse(data)
    },
    []
  )

  // retry/backoff wrapper
  const withRetry = useCallback(
    async <R>(op: CrudOp, fn: () => Promise<R> | R): Promise<R> => {
      try {
        const result = await fn()
        retryCount.current = 0
        return result
      } catch (err: any) {
        const isNetwork =
          err instanceof Error && /(fetch|network|\d{3})/i.test(err.message)
        if (isNetwork && retryCount.current < maxRetries) {
          retryCount.current++
          await new Promise((r) =>
            setTimeout(r, retryDelay * 2 ** (retryCount.current - 1))
          )
          return withRetry(op, fn)
        }
        retryCount.current = 0
        throw err
      }
    },
    [maxRetries, retryDelay]
  )

  // --- FETCH ALL ------------------------------------------------------
  const fetchAll = useCallback(async (): Promise<Res[]> => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: pgErr } = await withRetry("fetch", async () => {
        let q = supabase.from(table).select("*") as any
        if (filters) {
          for (const [col, val] of Object.entries(filters)) {
            q = q.eq(col, val)
          }
        }
        if (order) {
          q = q.order(order.column as string, {
            ascending: order.ascending ?? true,
          })
        }
        if (pagination) {
          q = q.range(pagination.offset, pagination.offset + pagination.limit - 1)
        }
        return await q
      })

      if (pgErr) throw pgErr
      const rows = responseListSchema
        ? validate(responseListSchema, data)
        : (data as Res[])

      setItems(rows)
      onSuccess?.("fetch", rows)
      return rows
    } catch (err: any) {
      setError(err)
      onError?.(err, "fetch")
      toast({
        title: "Fetch Error",
        description: err.message,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [
    supabase,
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
  ])

  // --- CREATE ---------------------------------------------------------
  const create = useCallback(
    async (data: Partial<InsertOf<T>>): Promise<Res> => {
      setLoading(true)
      setError(null)

      let validated: Partial<InsertOf<T>>
      try {
        validated = validate(requestSchema as z.ZodSchema<Partial<InsertOf<T>>>, data)
      } catch (zErr: any) {
        setError(zErr)
        onError?.(zErr, "create")
        toast({
          title: "Validation Error",
          description: zErr.message,
          variant: "destructive",
        })
        throw zErr
      }

      return withRetry("create", async () => {
        try {
          const { data: result, error: pgErr } = await supabase
            .from(table)
            .insert(validated)
            .select("*")
            .single()
          
          if (pgErr) throw pgErr
          if (!result) throw new Error("No data returned")

          const row = validate(responseSchema, result) as Res
          setItems((cur) => [row, ...cur])
          onSuccess?.("create", row)
          toast({ title: "Created", description: "Record created." })
          return row
        } catch (err: any) {
          setError(err)
          onError?.(err, "create")
          toast({
            title: "Create Error",
            description: err.message,
            variant: "destructive",
          })
          throw err
        } finally {
          setLoading(false)
        }
      })
    },
    [
      supabase,
      table,
      requestSchema,
      responseSchema,
      validate,
      onSuccess,
      onError,
      toast,
      withRetry,
    ]
  )

  // --- UPDATE ---------------------------------------------------------
  const update = useCallback(
    async (id: string, changes: UpdateOf<T>): Promise<Res> => {
      setLoading(true)
      setError(null)

      let validated: UpdateOf<T>
      try {
        validated = validate(responseSchema as z.ZodSchema<UpdateOf<T>>, { ...changes, id } as any)
      } catch (zErr: any) {
        setError(zErr)
        onError?.(zErr, "update")
        toast({
          title: "Validation Error",
          description: zErr.message,
          variant: "destructive",
        })
        throw zErr
      }

      try {
        const result = await withRetry("update", async () => {
          return await supabase
            .from(table)
            .update(validated)
            .eq("id", id)
            .select("*")
            .single()
        })
        
        if (result.error) throw result.error
        if (!result.data) throw new Error("No data returned")

        const row = validate(responseSchema, result.data)
        setItems((cur) => cur.map((r) => ('id' in r && r.id === id ? row : r)))
        onSuccess?.("update", row)
        toast({ title: "Updated", description: "Record updated." })
        return row
      } catch (err: any) {
        setError(err)
        onError?.(err, "update")
        toast({
          title: "Update Error",
          description: err.message,
          variant: "destructive",
        })
        throw err
      } finally {
        setLoading(false)
      }
    },
    [
      supabase,
      table,
      responseSchema,
      validate,
      onSuccess,
      onError,
      toast,
      withRetry,
    ]
  )

  // --- DELETE ---------------------------------------------------------
  const remove = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true)
      setError(null)
      try {
        const result = await withRetry("delete", async () => {
          const response = await supabase.from(table).delete().eq("id", id);
          return response;
        });
        
        if (result.error) throw result.error;

        setItems((cur) => cur.filter((r) => 'id' in r && r.id !== id));
        onSuccess?.("delete");
        toast({ title: "Deleted", description: "Record deleted." });
      } catch (err: any) {
        setError(err);
        onError?.(err, "delete");
        toast({
          title: "Delete Error",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase, table, onSuccess, onError, toast, withRetry]
  )

  // --- BATCH INSERT ---------------------------------------------------
  const batch = useCallback(
    async (arr: Partial<InsertOf<T>>[]): Promise<Res[]> => {
      setLoading(true)
      setError(null)

      let validatedArr: Partial<InsertOf<T>>[]
      try {
        validatedArr = arr.map((d) => validate(requestSchema as z.ZodSchema<Partial<InsertOf<T>>>, d))
      } catch (zErr: any) {
        setError(zErr)
        onError?.(zErr, "batch")
        toast({
          title: "Validation Error",
          description: zErr.message,
          variant: "destructive",
        })
        throw zErr
      }

      try {
        const result = await withRetry("batch", async () => {
          return await supabase.from(table).insert(validatedArr as any).select("*")
        })
        
        if (result.error) throw result.error
        if (!result.data) throw new Error("No data returned")

        const rows = responseListSchema
          ? validate(responseListSchema, result.data)
          : (result.data as Res[])

        setItems((cur) => [...rows, ...cur])
        onSuccess?.("batch", rows)
        toast({
          title: "Batch Created",
          description: `${rows.length} records created.`,
        })
        return rows
      } catch (err: any) {
        setError(err)
        onError?.(err, "batch")
        toast({
          title: "Batch Error",
          description: err.message,
          variant: "destructive",
        })
        throw err
      } finally {
        setLoading(false)
      }
    },
    [
      supabase,
      table,
      requestSchema,
      responseListSchema,
      validate,
      onSuccess,
      onError,
      toast,
      withRetry,
    ]
  )

  // --- FILE UPLOAD ----------------------------------------------------
  const uploadFile = useCallback(
    async (bucket: string, path: string, file: File): Promise<string> => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: stErr } = await supabase.storage
          .from(bucket)
          .upload(path, file)
        if (stErr) throw stErr as unknown as PostgrestError

        const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
        onSuccess?.("upload", url)
        toast({ title: "Uploaded", description: "File uploaded." })
        return url
      } catch (err: any) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        onError?.(e, "upload")
        toast({
          title: "Upload Error",
          description: e.message,
          variant: "destructive",
        })
        throw e
      } finally {
        setLoading(false)
      }
    },
    [supabase, onSuccess, onError, toast]
  )

  // auto‐fetch on mount
  useEffect(() => {
    fetchAll().catch(() => {})
  }, [fetchAll])

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
  }
}





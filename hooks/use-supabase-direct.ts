'use client'

/**
 * Hook for direct Supabase CRUD operations
 * @module hooks/use-supabase-direct
 */

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { PostgrestError } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * Options for the useSupabaseDirect hook
 */
interface UseSupabaseDirectOptions<T> {
  /**
   * The table name to perform CRUD operations on
   */
  tableName: string
  
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
  onError?: (error: PostgrestError) => void
  
  /**
   * Optional success handler
   */
  onSuccess?: (operation: 'create' | 'update' | 'delete' | 'get', data?: any) => void
}

/**
 * Hook for direct Supabase CRUD operations
 * @param options Options for the hook
 * @returns CRUD operations and state
 */
export function useSupabaseDirect<T extends { id?: string | number }>(
  options: UseSupabaseDirectOptions<T>
) {
  const { tableName, transformBeforeSave, transformAfterFetch, onError, onSuccess } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | null>(null)
  const [items, setItems] = useState<T[]>([])
  const [item, setItem] = useState<T | null>(null)
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()

  /**
   * Handle errors from Supabase
   */
  const handleError = (error: PostgrestError, operation: string) => {
    setError(error)
    console.error(`Error in ${operation} operation on ${tableName}:`, error)
    
    // Call custom error handler if provided
    if (onError) {
      onError(error)
    } else {
      // Default error handling
      toast({
        title: `Error in ${operation}`,
        description: error.message || 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handle success
   */
  const handleSuccess = (operation: 'create' | 'update' | 'delete' | 'get', data?: any) => {
    if (onSuccess) {
      onSuccess(operation, data)
    } else {
      // Default success handling
      const messages = {
        create: `Created new ${tableName} successfully`,
        update: `Updated ${tableName} successfully`,
        delete: `Deleted ${tableName} successfully`,
        get: `Retrieved ${tableName} data successfully`,
      }
      
      toast({
        title: 'Success',
        description: messages[operation],
      })
    }
  }

  /**
   * Get all items from the table
   */
  const getAll = async (options?: {
    filters?: Record<string, any>
    limit?: number
    offset?: number
    orderBy?: { column: string; ascending?: boolean }
  }) => {
    setLoading(true)
    setError(null)
    
    try {
      let query = supabase.from(tableName).select('*')
      
      // Apply filters
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }
      
      // Apply ordering
      if (options?.orderBy) {
        const { column, ascending = true } = options.orderBy
        query = query.order(column, { ascending })
      }
      
      // Apply pagination
      if (options?.limit !== undefined) {
        query = query.limit(options.limit)
        
        if (options?.offset !== undefined) {
          query = query.range(options.offset, options.offset + options.limit - 1)
        }
      }
      
      const { data, error } = await query
      
      if (error) {
        handleError(error, 'getAll')
        return []
      }
      
      const transformedData = transformAfterFetch 
        ? data.map(item => transformAfterFetch(item))
        : data as T[]
      
      setItems(transformedData)
      handleSuccess('get', transformedData)
      return transformedData
    } catch (err) {
      console.error('Unexpected error in getAll:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  /**
   * Get a single item by ID
   */
  const getById = async (id: string | number) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        handleError(error, 'getById')
        return null
      }
      
      const transformedData = transformAfterFetch 
        ? transformAfterFetch(data)
        : data as T
      
      setItem(transformedData)
      handleSuccess('get', transformedData)
      return transformedData
    } catch (err) {
      console.error('Unexpected error in getById:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  /**
   * Create a new item
   */
  const create = async (data: T) => {
    setLoading(true)
    setError(null)
    
    try {
      const transformedData = transformBeforeSave ? transformBeforeSave(data) : data
      
      const { data: createdData, error } = await supabase
        .from(tableName)
        .insert(transformedData)
        .select()
        .single()
      
      if (error) {
        handleError(error, 'create')
        return null
      }
      
      const newItem = transformAfterFetch 
        ? transformAfterFetch(createdData)
        : createdData as T
      
      setItem(newItem)
      handleSuccess('create', newItem)
      return newItem
    } catch (err) {
      console.error('Unexpected error in create:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  /**
   * Update an existing item
   */
  const update = async (id: string | number, data: Partial<T>) => {
    setLoading(true)
    setError(null)
    
    try {
      const transformedData = transformBeforeSave 
        ? transformBeforeSave({ ...data, id } as T)
        : data
      
      const { data: updatedData, error } = await supabase
        .from(tableName)
        .update(transformedData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        handleError(error, 'update')
        return null
      }
      
      const updatedItem = transformAfterFetch 
        ? transformAfterFetch(updatedData)
        : updatedData as T
      
      setItem(updatedItem)
      handleSuccess('update', updatedItem)
      return updatedItem
    } catch (err) {
      console.error('Unexpected error in update:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  /**
   * Delete an item by ID
   */
  const remove = async (id: string | number) => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      
      if (error) {
        handleError(error, 'delete')
        return false
      }
      
      handleSuccess('delete')
      return true
    } catch (err) {
      console.error('Unexpected error in remove:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    items,
    item,
    getAll,
    getById,
    create,
    update,
    remove,
  }
}

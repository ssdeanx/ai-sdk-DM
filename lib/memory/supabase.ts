import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Initialize Supabase client
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase credentials not found. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    )
  }

  return createClient<Database>(supabaseUrl, supabaseKey)
}

// Check if Supabase is available
export const isSupabaseAvailable = async () => {
  const supabase = createSupabaseClient()

  try {
    const { error } = await supabase.from("models").select("count", { count: "exact", head: true })
    return !error
  } catch (error) {
    console.error("Error checking Supabase availability:", error)
    return false
  }
}

// Generic function to get data from Supabase
export async function getData<T>(
  tableName: string,
  options?: {
    select?: string
    filters?: Record<string, any>
    limit?: number
    offset?: number
    orderBy?: { column: string; ascending?: boolean }
  },
): Promise<T[]> {
  const supabase = createSupabaseClient()

  try {
    let query = supabase.from(tableName).select(options?.select || "*")

    // Apply filters if provided
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (key === "search") {
          // Handle search filter specially - this would need to be customized based on your schema
          // This is a simplified example that searches in name or title columns
          query = query.or(`name.ilike.%${value}%,title.ilike.%${value}%`)
        } else {
          query = query.eq(key, value)
        }
      })
    }

    // Apply ordering if provided
    if (options?.orderBy) {
      const { column, ascending = true } = options.orderBy
      query = query.order(column, { ascending })
    }

    // Apply pagination if provided
    if (options?.limit !== undefined) {
      query = query.range(options?.offset || 0, (options?.offset || 0) + options.limit - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error(`Error fetching data from ${tableName}:`, error)
      throw error
    }

    return data as T[]
  } catch (error) {
    console.error(`Error fetching data from ${tableName}:`, error)
    throw error
  }
}

// Generic function to get a single item by ID
export async function getItemById<T>(tableName: string, id: string): Promise<T | null> {
  const supabase = createSupabaseClient()

  try {
    const { data, error } = await supabase.from(tableName).select("*").eq("id", id).single()

    if (error) {
      console.error(`Error fetching item from ${tableName}:`, error)
      throw error
    }

    return data as T
  } catch (error) {
    console.error(`Error fetching item from ${tableName}:`, error)
    throw error
  }
}

// Generic function to create an item
export async function createItem<T>(tableName: string, item: Omit<T, "id" | "created_at" | "updated_at">): Promise<T> {
  const supabase = createSupabaseClient()

  try {
    const { data, error } = await supabase.from(tableName).insert(item).select().single()

    if (error) {
      console.error(`Error creating item in ${tableName}:`, error)
      throw error
    }

    return data as T
  } catch (error) {
    console.error(`Error creating item in ${tableName}:`, error)
    throw error
  }
}

// Generic function to update an item
export async function updateItem<T>(tableName: string, id: string, updates: Partial<T>): Promise<T> {
  const supabase = createSupabaseClient()

  try {
    const { data, error } = await supabase
      .from(tableName)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error(`Error updating item in ${tableName}:`, error)
      throw error
    }

    return data as T
  } catch (error) {
    console.error(`Error updating item in ${tableName}:`, error)
    throw error
  }
}

// Generic function to delete an item
export async function deleteItem(tableName: string, id: string): Promise<boolean> {
  const supabase = createSupabaseClient()

  try {
    const { error } = await supabase.from(tableName).delete().eq("id", id)

    if (error) {
      console.error(`Error deleting item from ${tableName}:`, error)
      throw error
    }

    return true
  } catch (error) {
    console.error(`Error deleting item from ${tableName}:`, error)
    throw error
  }
}

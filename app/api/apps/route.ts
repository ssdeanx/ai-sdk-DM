import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { handleApiError } from "@/lib/api-error-handler"

export interface App {
  id: string
  name: string
  description: string
  type: string
  code: string
  parameters_schema?: string
  created_at: string
  updated_at: string
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const type = url.searchParams.get("type")
    const search = url.searchParams.get("search")
    
    const supabase = getSupabaseClient()
    
    let query = supabase.from("apps").select("*")
    
    // Apply type filter if provided
    if (type) {
      query = query.eq("type", type)
    }
    
    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // Order by created_at descending
    query = query.order("created_at", { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      console.error("Error fetching apps:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      apps: data || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.description || !body.type || !body.code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    const supabase = getSupabaseClient()
    
    // Format the data to match Supabase schema
    const appData = {
      name: body.name,
      description: body.description,
      type: body.type,
      code: body.code,
      parameters_schema: body.parametersSchema || null,
    }
    
    const { data, error } = await supabase.from("apps").insert(appData).select().single()
    
    if (error) {
      console.error("Error creating app:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}

import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { handleApiError } from "@/lib/api-error-handler"

export interface Network {
  id: string
  name: string
  description: string
  agent_count: number
  status: string
  created_at: string
  updated_at: string
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get("status")
    const search = url.searchParams.get("search")
    
    const supabase = getSupabaseClient()
    
    let query = supabase.from("networks").select("*")
    
    // Apply status filter if provided
    if (status) {
      query = query.eq("status", status)
    }
    
    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // Order by created_at descending
    query = query.order("created_at", { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      console.error("Error fetching networks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      networks: data || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    const supabase = getSupabaseClient()
    
    // Format the data to match Supabase schema
    const networkData = {
      name: body.name,
      description: body.description,
      agent_count: 0,
      status: body.status || "Active",
    }
    
    const { data, error } = await supabase.from("networks").insert(networkData).select().single()
    
    if (error) {
      console.error("Error creating network:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}

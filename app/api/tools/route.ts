import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { handleApiError } from "@/lib/api-error-handler"
import { revalidatePath } from "next/cache"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const search = url.searchParams.get("search") || ""
    const category = url.searchParams.get("category")
    const limit = Number.parseInt(url.searchParams.get("limit") || "100")
    const offset = Number.parseInt(url.searchParams.get("offset") || "0")

    const supabase = getSupabaseClient()

    let query = supabase.from("tools").select("*", { count: "exact" })

    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply category filter if provided
    if (category) {
      query = query.eq("category", category)
    }

    // Apply pagination
    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

    const { data: tools, error, count } = await query

    if (error) {
      console.error("Error fetching tools:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      tools,
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.description || !body.parametersSchema) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate parameters schema is valid JSON
    try {
      JSON.parse(body.parametersSchema)
    } catch (e) {
      return NextResponse.json({ error: "Parameters schema must be valid JSON" }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // Check if tool with same name already exists
    const { data: existingTool } = await supabase.from("tools").select("id").eq("name", body.name).maybeSingle()

    if (existingTool) {
      return NextResponse.json({ error: "A tool with this name already exists" }, { status: 409 })
    }

    // Insert new tool
    const { data: tool, error } = await supabase
      .from("tools")
      .insert({
        name: body.name,
        description: body.description,
        parameters_schema: body.parametersSchema,
        category: body.category || "custom",
        implementation: body.implementation || null,
        is_enabled: body.isEnabled !== undefined ? body.isEnabled : true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating tool:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Revalidate the tools page
    revalidatePath("/tools")

    return NextResponse.json(tool)
  } catch (error) {
    return handleApiError(error)
  }
}

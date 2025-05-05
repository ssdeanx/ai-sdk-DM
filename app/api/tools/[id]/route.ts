import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { handleApiError } from "@/lib/api-error-handler"
import { revalidatePath } from "next/cache"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const supabase = getSupabaseClient()

    const { data: tool, error } = await supabase.from("tools").select("*").eq("id", id).single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Tool not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(tool)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    // Validate parameters schema if provided
    if (body.parametersSchema) {
      try {
        JSON.parse(body.parametersSchema)
      } catch (e) {
        return NextResponse.json({ error: "Parameters schema must be valid JSON" }, { status: 400 })
      }
    }

    const supabase = getSupabaseClient()

    // Check if tool exists
    const { data: existingTool, error: checkError } = await supabase.from("tools").select("id").eq("id", id).single()

    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json({ error: "Tool not found" }, { status: 404 })
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    // Prepare update data
    const updateData: Record<string, any> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.parametersSchema !== undefined) updateData.parameters_schema = body.parametersSchema
    if (body.category !== undefined) updateData.category = body.category
    if (body.implementation !== undefined) updateData.implementation = body.implementation
    if (body.isEnabled !== undefined) updateData.is_enabled = body.isEnabled

    // Update tool
    const { data: updatedTool, error } = await supabase.from("tools").update(updateData).eq("id", id).select().single()

    if (error) {
      console.error("Error updating tool:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Revalidate the tools page
    revalidatePath("/tools")

    return NextResponse.json(updatedTool)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const supabase = getSupabaseClient()

    // Check if tool is being used by any agents
    const { data: usedByAgents, error: checkError } = await supabase
      .from("agent_tools")
      .select("agent_id")
      .eq("tool_id", id)

    if (checkError) {
      console.error("Error checking tool usage:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (usedByAgents && usedByAgents.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete tool that is being used by agents",
          agentIds: usedByAgents.map((item) => item.agent_id),
        },
        { status: 409 },
      )
    }

    // Delete tool
    const { error } = await supabase.from("tools").delete().eq("id", id)

    if (error) {
      console.error("Error deleting tool:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Revalidate the tools page
    revalidatePath("/tools")

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

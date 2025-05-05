import { NextResponse } from "next/server"
import { getItemById, updateItem, deleteItem } from "@/lib/memory/supabase"
import type { Agent } from "@/types/agents"
import type { Model } from "@/types/models"
import type { Tool } from "@/types/tools"
import { handleApiError } from "@/lib/api-error-handler"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const agent = await getItemById<Agent>("agents", id)

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Get model information
    const model = await getItemById<Model>("models", agent.model_id)

    // Get tool information
    const tools = await Promise.all(
      agent.tool_ids.map(async (toolId) => {
        const tool = await getItemById<Tool>("tools", toolId)
        return tool ? tool.name : null
      }),
    ).then((toolNames) => toolNames.filter(Boolean) as string[])

    return NextResponse.json({
      ...agent,
      model: model?.name || "Unknown Model",
      tools,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    // Format the data to match Supabase schema
    const updates: Partial<Agent> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.modelId !== undefined) updates.model_id = body.modelId
    if (body.toolIds !== undefined) updates.tool_ids = body.toolIds
    if (body.systemPrompt !== undefined) updates.system_prompt = body.systemPrompt

    const agent = await updateItem<Agent>("agents", id, updates)

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Get model information
    const model = await getItemById<Model>("models", agent.model_id)

    // Get tool information
    const tools = await Promise.all(
      agent.tool_ids.map(async (toolId) => {
        const tool = await getItemById<Tool>("tools", toolId)
        return tool ? tool.name : null
      }),
    ).then((toolNames) => toolNames.filter(Boolean) as string[])

    return NextResponse.json({
      ...agent,
      model: model?.name || "Unknown Model",
      tools,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const success = await deleteItem("agents", id)

    return NextResponse.json({
      success,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

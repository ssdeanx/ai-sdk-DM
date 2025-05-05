import { NextResponse } from "next/server"
import { getItemById, updateItem, deleteItem } from "@/lib/memory/supabase"
import type { Model } from "@/types/models"
import { handleApiError } from "@/lib/api-error-handler"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const model = await getItemById<Model>("models", id)

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    return NextResponse.json(model)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    // Format the data to match Supabase schema
    const updates: Partial<Model> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.provider !== undefined) updates.provider = body.provider
    if (body.modelId !== undefined) updates.model_id = body.modelId
    if (body.baseUrl !== undefined) updates.base_url = body.baseUrl
    if (body.apiKey !== undefined && body.apiKey !== "••••••••••••••••") updates.api_key = body.apiKey
    if (body.status !== undefined) updates.status = body.status as "active" | "inactive"

    const model = await updateItem<Model>("models", id, updates)

    return NextResponse.json(model)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const success = await deleteItem("models", id)

    return NextResponse.json({
      success,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

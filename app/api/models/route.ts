import { NextResponse } from "next/server"
import { getData, createItem } from "@/lib/memory/supabase"
import type { Model } from "@/types/models"
import { handleApiError } from "@/lib/api-error-handler"

export async function GET() {
  try {
    const models = await getData<Model>("models", {
      orderBy: { column: "created_at", ascending: false },
    })

    return NextResponse.json({
      models,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.provider || !body.modelId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Format the data to match Supabase schema
    const modelData = {
      name: body.name,
      provider: body.provider,
      model_id: body.modelId,
      base_url: body.baseUrl || null,
      api_key: body.apiKey || "",
      status: body.status || "active",
    }

    const model = await createItem<Model>("models", modelData)

    return NextResponse.json(model)
  } catch (error) {
    return handleApiError(error)
  }
}

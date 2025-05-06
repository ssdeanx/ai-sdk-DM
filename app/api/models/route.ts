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
      max_tokens: body.maxTokens || 4096,
      input_cost_per_token: body.inputCostPerToken || 0.00001,
      output_cost_per_token: body.outputCostPerToken || 0.00003,
      supports_vision: body.supportsVision || false,
      supports_functions: body.supportsFunctions || false,
      supports_streaming: body.supportsStreaming || true,
      default_temperature: body.defaultTemperature || 0.7,
      default_top_p: body.defaultTopP || 1.0,
      default_frequency_penalty: body.defaultFrequencyPenalty || 0.0,
      default_presence_penalty: body.defaultPresencePenalty || 0.0,
      context_window: body.contextWindow || 4096,
      description: body.description || null,
      category: body.category || "text",
      capabilities: body.capabilities || {
        text: true,
        vision: false,
        audio: false,
        video: false,
        functions: false,
        streaming: true,
        json_mode: false,
        fine_tuning: false,
        thinking: false,
        search_grounding: false,
        code_execution: false,
        structured_output: false,
        image_generation: false,
        video_generation: false,
        audio_generation: false
      },
      metadata: body.metadata || null,
    }

    const model = await createItem<Model>("models", modelData)

    return NextResponse.json(model)
  } catch (error) {
    return handleApiError(error)
  }
}

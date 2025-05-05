import { NextResponse } from "next/server"
import { streamGoogleAI } from "@/lib/google-ai"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { getLibSQLClient } from "@/lib/memory/libsql"
import { handleApiError } from "@/lib/api-error-handler"

export async function POST(request: Request) {
  try {
    const { messages, modelId, threadId, temperature = 0.7, maxTokens, tools = [] } = await request.json()

    if (!messages || !messages.length) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 })
    }

    // Get model configuration from Supabase
    const supabase = getSupabaseClient()
    const { data: model, error: modelError } = await supabase
      .from("models")
      .select("*")
      .eq("id", modelId || process.env.DEFAULT_MODEL_ID)
      .single()

    if (modelError || !model) {
      console.error("Error fetching model:", modelError)
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    // Get tool configurations if tools are specified
    const toolConfigs = {}
    if (tools && tools.length > 0) {
      const { data: toolData, error: toolError } = await supabase.from("tools").select("*").in("id", tools)

      if (!toolError && toolData) {
        for (const tool of toolData) {
          toolConfigs[tool.name] = {
            description: tool.description,
            parameters: JSON.parse(tool.parameters_schema || "{}"),
          }
        }
      }
    }

    // Store messages in LibSQL if threadId is provided
    if (threadId) {
      const db = getLibSQLClient()

      // Store the latest user message
      const userMessage = messages.find((m) => m.role === "user")
      if (userMessage) {
        await db.execute({
          sql: `
            INSERT INTO messages (thread_id, role, content, created_at)
            VALUES (?, ?, ?, datetime('now'))
          `,
          args: [threadId, "user", userMessage.content],
        })
      }
    }

    // Stream the response using Google AI
    const result = await streamGoogleAI({
      modelId: model.model_id,
      messages,
      temperature,
      maxTokens,
      tools: toolConfigs,
      apiKey: model.api_key,
      baseURL: model.base_url,
    })

    // Store the assistant's response in LibSQL when complete
    if (threadId) {
      result.text.then(async (text) => {
        const db = getLibSQLClient()
        await db.execute({
          sql: `
            INSERT INTO messages (thread_id, role, content, created_at)
            VALUES (?, ?, ?, datetime('now'))
          `,
          args: [threadId, "assistant", text],
        })
      })
    }

    return result.toDataStreamResponse()
  } catch (error) {
    return handleApiError(error)
  }
}

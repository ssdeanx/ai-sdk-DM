import { NextResponse } from "next/server"
import { streamGoogleAI } from "@/lib/google-ai"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { getLibSQLClient } from "@/lib/memory/libsql"
import { handleApiError } from "@/lib/api-error-handler"

export async function POST(request: Request) {
  try {
    const {
      messages,
      modelId,
      threadId,
      temperature = 0.7,
      maxTokens,
      tools = [],
      attachments = []
    } = await request.json()

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
          try {
            toolConfigs[tool.name] = {
              description: tool.description,
              parameters: typeof tool.parameters_schema === 'string'
                ? JSON.parse(tool.parameters_schema)
                : tool.parameters_schema || {},
            }
          } catch (e) {
            console.error(`Error parsing tool schema for ${tool.name}:`, e)
            // Continue with other tools even if one fails
          }
        }
      }
    }

    // Process messages to include attachments if any
    const processedMessages = [...messages]

    // If the last message has attachments, modify it to include them
    if (attachments && attachments.length > 0 && processedMessages.length > 0) {
      const lastMessage = processedMessages[processedMessages.length - 1]
      if (lastMessage.role === 'user') {
        // Add attachment information to the message content
        const attachmentDescriptions = attachments
          .map(att => `[${att.type === 'image' ? 'Image' : 'File'}: ${att.name}]`)
          .join('\n')

        lastMessage.content = `${lastMessage.content}\n\n${attachmentDescriptions}`
      }
    }

    // Store messages in LibSQL if threadId is provided
    if (threadId) {
      const db = getLibSQLClient()

      // Store the latest user message
      const userMessage = processedMessages.find((m) => m.role === "user")
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
      messages: processedMessages,
      temperature,
      maxTokens,
      tools: toolConfigs,
      apiKey: model.api_key || process.env.GOOGLE_API_KEY,
      baseURL: model.base_url,
    })

    // Store the assistant's response in LibSQL when complete
    if (threadId) {
      result.text.then(async (text) => {
        try {
          const db = getLibSQLClient()
          await db.execute({
            sql: `
              INSERT INTO messages (thread_id, role, content, created_at)
              VALUES (?, ?, ?, datetime('now'))
            `,
            args: [threadId, "assistant", text],
          })
        } catch (error) {
          console.error("Error storing assistant message:", error)
          // Don't throw here as we still want to return the response
        }
      }).catch(error => {
        console.error("Error processing assistant response:", error)
      })
    }

    return result.toDataStreamResponse()
  } catch (error) {
    return handleApiError(error)
  }
}

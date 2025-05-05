import { NextResponse } from "next/server"
import { executeTool, initializeToolkit } from "@/lib/agentic-integration"

// POST /api/agentic/tools/execute - Execute a specific tool
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { toolName, params } = body

    if (!toolName) {
      return NextResponse.json({ error: "Tool name is required" }, { status: 400 })
    }

    // Initialize toolkit if not already initialized
    await initializeToolkit({
      googleApiKey: process.env.GOOGLE_API_KEY,
      // Add other API keys as needed
    })

    const result = await executeTool(toolName, params || {})

    return NextResponse.json({ result })
  } catch (error) {
    console.error("Error executing agentic tool:", error)
    return NextResponse.json({ error: "Failed to execute tool", details: error.message }, { status: 500 })
  }
}

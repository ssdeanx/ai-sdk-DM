import { NextResponse } from "next/server"
import { getToolkit, initializeToolkit } from "@/lib/agentic-integration"

// GET /api/agentic/tools - Get all available tools
export async function GET(request: Request) {
  try {
    // Initialize toolkit if not already initialized
    await initializeToolkit({
      googleApiKey: process.env.GOOGLE_API_KEY,
      // Add other API keys as needed
    })

    const toolkit = getToolkit()
    const tools = toolkit.getTools()

    return NextResponse.json({
      tools: Object.keys(tools).map((key) => ({
        name: key,
        description: tools[key].description,
        parameters: tools[key].parameters,
      })),
    })
  } catch (error) {
    console.error("Error fetching agentic tools:", error)
    return NextResponse.json({ error: "Failed to fetch agentic tools" }, { status: 500 })
  }
}

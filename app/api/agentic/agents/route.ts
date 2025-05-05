import { NextResponse } from "next/server"
import { createAgent, initializeToolkit } from "@/lib/agentic-integration"
import { getLibSQLClient } from "@/lib/memory/db"
import { v4 as uuidv4 } from "uuid"

// GET /api/agentic/agents - Get all agents
export async function GET(request: Request) {
  try {
    const db = getLibSQLClient()

    const result = await db.execute({
      sql: `
        SELECT a.*, m.name as model_name, m.provider
        FROM agents a
        JOIN models m ON a.model_id = m.id
      `,
    })

    return NextResponse.json({ agents: result.rows })
  } catch (error) {
    console.error("Error fetching agents:", error)
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 })
  }
}

// POST /api/agentic/agents - Create a new agent
export async function POST(request: Request) {
  try {
    const db = getLibSQLClient()
    const body = await request.json()
    const { name, description, modelId, toolIds = [], systemPrompt = "" } = body

    if (!name || !modelId) {
      return NextResponse.json({ error: "Name and model ID are required" }, { status: 400 })
    }

    // Get model details
    const modelResult = await db.execute({
      sql: `SELECT * FROM models WHERE id = ?`,
      args: [modelId],
    })

    if (modelResult.rows.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    const model = modelResult.rows[0]

    // Create agent
    const id = uuidv4()
    const now = new Date().toISOString()

    await db.execute({
      sql: `
        INSERT INTO agents (id, name, description, model_id, system_prompt, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [id, name, description || "", modelId, systemPrompt, now, now],
    })

    // Add tools to agent
    for (const toolId of toolIds) {
      await db.execute({
        sql: `INSERT INTO agent_tools (agent_id, tool_id) VALUES (?, ?)`,
        args: [id, toolId],
      })
    }

    // Initialize toolkit and create agentic agent
    await initializeToolkit({
      googleApiKey: process.env.GOOGLE_API_KEY,
      // Add other API keys as needed
    })

    // Get tool names for the agent
    const toolsResult = await db.execute({
      sql: `
        SELECT t.name 
        FROM tools t
        JOIN agent_tools at ON t.id = at.tool_id
        WHERE at.agent_id = ?
      `,
      args: [id],
    })

    const toolNames = toolsResult.rows.map((row) => row.name as string)

    // Create agentic agent
    await createAgent({
      model: model.model_id as string,
      provider: model.provider as string,
      tools: toolNames,
      systemPrompt,
    })

    return NextResponse.json({
      id,
      name,
      description,
      modelId,
      toolIds,
      systemPrompt,
      createdAt: now,
      updatedAt: now,
    })
  } catch (error) {
    console.error("Error creating agent:", error)
    return NextResponse.json({ error: "Failed to create agent", details: error.message }, { status: 500 })
  }
}

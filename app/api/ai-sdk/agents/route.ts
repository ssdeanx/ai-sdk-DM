import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { v4 as uuidv4 } from "uuid";
import { getAllBuiltInTools } from "@/lib/tools";
import { streamGoogleAIWithTracing } from "@/lib/ai-sdk-tracing";
import { getModelConfig } from "@/lib/google-ai";

/**
 * GET /api/ai-sdk/agents
 * 
 * Fetch all available agents with their tools and models
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    
    const db = getLibSQLClient();
    
    // Query to get agents with their models and tools
    let sql = `
      SELECT 
        a.id, a.name, a.description, a.system_prompt, a.created_at, a.updated_at,
        m.id as model_id, m.name as model_name, m.provider as model_provider
      FROM agents a
      JOIN models m ON a.model_id = m.id
    `;
    
    // Add search condition if provided
    if (search) {
      sql += ` WHERE a.name LIKE '%${search}%' OR a.description LIKE '%${search}%'`;
    }
    
    // Add pagination
    sql += ` ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const agentsResult = await db.execute({ sql });
    
    // Format agents
    const agents = await Promise.all(agentsResult.rows.map(async (agent: any) => {
      // Get tools for this agent
      const toolsResult = await db.execute({
        sql: `
          SELECT t.id, t.name, t.description, t.parameters_schema
          FROM tools t
          JOIN agent_tools at ON t.id = at.tool_id
          WHERE at.agent_id = ?
        `,
        args: [agent.id]
      });
      
      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.system_prompt,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
        model: {
          id: agent.model_id,
          name: agent.model_name,
          provider: agent.model_provider
        },
        tools: toolsResult.rows.map((tool: any) => ({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          parametersSchema: tool.parameters_schema ? JSON.parse(tool.parameters_schema) : {}
        }))
      };
    }));
    
    // Get total count
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM agents`
    });
    
    return NextResponse.json({
      agents,
      count: countResult.rows[0].count,
      hasMore: agents.length === limit
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/ai-sdk/agents
 * 
 * Create a new agent
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, modelId, toolIds = [], systemPrompt = "" } = body;
    
    // Validate required fields
    if (!name || !modelId) {
      return NextResponse.json({ error: "Name and model ID are required" }, { status: 400 });
    }
    
    const db = getLibSQLClient();
    
    // Get model details
    const modelResult = await db.execute({
      sql: `SELECT * FROM models WHERE id = ?`,
      args: [modelId]
    });
    
    if (modelResult.rows.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }
    
    // Create agent
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await db.execute({
      sql: `
        INSERT INTO agents (id, name, description, model_id, system_prompt, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [id, name, description || "", modelId, systemPrompt, now, now]
    });
    
    // Add tools to agent
    for (const toolId of toolIds) {
      await db.execute({
        sql: `INSERT INTO agent_tools (agent_id, tool_id) VALUES (?, ?)`,
        args: [id, toolId]
      });
    }
    
    // Create trace for agent creation
    await createTrace({
      name: "agent_created",
      userId: id,
      metadata: {
        agentId: id,
        name,
        modelId,
        toolCount: toolIds.length
      }
    });
    
    return NextResponse.json({
      id,
      name,
      description,
      systemPrompt,
      modelId,
      toolIds,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    return handleApiError(error);
  }
}

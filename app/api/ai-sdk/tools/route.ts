import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { getAllBuiltInTools, loadCustomTools, toolCategories } from "@/lib/tools";
import { agenticTools } from "@/lib/tools/agentic";
import { getAllAISDKTools } from "@/lib/ai-sdk-integration";
import { createTrace, logEvent } from "@/lib/langfuse-integration";

/**
 * GET /api/ai-sdk/tools
 *
 * Fetch all available tools for use with AI SDK
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search") || "";
    const includeBuiltIn = url.searchParams.get("builtIn") !== "false";
    const includeCustom = url.searchParams.get("custom") !== "false";
    const includeAgentic = url.searchParams.get("agentic") !== "false";

    // Get all tools using the AI SDK integration module
    const allTools = await getAllAISDKTools({
      includeBuiltIn,
      includeCustom,
      includeAgentic
    });

    // Get individual tool collections for categorization
    const builtInTools = includeBuiltIn ? getAllBuiltInTools() : {};
    const customTools = includeCustom ? await loadCustomTools() : {};
    const agTools = includeAgentic ? agenticTools : {};

    // Format tools for response
    const formattedTools = Object.entries(allTools)
      .map(([name, tool]) => {
        // Get tool category
        let toolCategory = "other";
        for (const cat of toolCategories) {
          if (cat.tools.includes(name)) {
            toolCategory = cat.id;
            break;
          }
        }

        // For agentic tools, set category to "agentic"
        if (name in agTools) {
          toolCategory = "agentic";
        }

        return {
          name,
          description: tool.description,
          category: toolCategory,
          parameters: tool.parameters,
          isBuiltIn: name in builtInTools,
          isCustom: name in customTools,
          isAgentic: name in agTools
        };
      })
      .filter(tool => {
        // Apply category filter
        if (category && tool.category !== category) {
          return false;
        }

        // Apply search filter
        if (search && !tool.name.toLowerCase().includes(search.toLowerCase()) &&
            !tool.description.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }

        return true;
      });

    // Create trace for tools listing
    await createTrace({
      name: "tools_listing",
      metadata: {
        toolCount: formattedTools.length,
        builtInCount: Object.keys(builtInTools).length,
        customCount: Object.keys(customTools).length,
        agenticCount: Object.keys(agTools).length,
        category,
        search
      }
    });

    return NextResponse.json({
      tools: formattedTools,
      categories: toolCategories,
      count: formattedTools.length
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/ai-sdk/tools
 *
 * Create a new custom tool
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, parametersSchema, implementation, category = "custom" } = body;

    // Validate required fields
    if (!name || !description || !parametersSchema) {
      return NextResponse.json({ error: "Name, description, and parametersSchema are required" }, { status: 400 });
    }

    // Validate parameters schema is valid JSON
    let parsedSchema;
    try {
      parsedSchema = typeof parametersSchema === 'string'
        ? JSON.parse(parametersSchema)
        : parametersSchema;
    } catch (e) {
      return NextResponse.json({ error: "Parameters schema must be valid JSON" }, { status: 400 });
    }

    const db = getLibSQLClient();

    // Check if tool with same name already exists
    const existingToolResult = await db.execute({
      sql: `SELECT id FROM tools WHERE name = ?`,
      args: [name]
    });

    if (existingToolResult.rows.length > 0) {
      return NextResponse.json({ error: "A tool with this name already exists" }, { status: 409 });
    }

    // Insert new tool
    const now = new Date().toISOString();

    const result = await db.execute({
      sql: `
        INSERT INTO tools (name, description, parameters_schema, category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING id
      `,
      args: [
        name,
        description,
        JSON.stringify(parsedSchema),
        category,
        now,
        now
      ]
    });

    const toolId = result.rows[0].id;

    // If implementation is provided, save it to the apps table
    if (implementation) {
      await db.execute({
        sql: `
          INSERT INTO apps (name, type, code, created_at, updated_at)
          VALUES (?, 'tool', ?, ?, ?)
        `,
        args: [name, implementation, now, now]
      });
    }

    // Create trace for tool creation
    await createTrace({
      name: "tool_created",
      metadata: {
        toolId,
        name,
        category,
        hasImplementation: !!implementation
      }
    });

    return NextResponse.json({
      id: toolId,
      name,
      description,
      parametersSchema: parsedSchema,
      category,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    return handleApiError(error);
  }
}

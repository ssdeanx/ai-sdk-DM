import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { getAllBuiltInTools, loadCustomTools, toolCategories } from "@/lib/tools";
import { agenticTools } from "@/lib/tools/agentic";
import { getAllAISDKTools } from "@/lib/ai-sdk-integration";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { getMemoryProvider } from "@/lib/memory/factory";
import { z } from "zod";

// Import Upstash adapter functions
import {
  getData,
  getItemById,
  createItem,
  updateItem,
  deleteItem
} from "@/lib/memory/upstash/supabase-adapter";

// Define schemas for validation
const ToolQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional().default(""),
  builtIn: z.enum(["true", "false"]).optional().default("true"),
  custom: z.enum(["true", "false"]).optional().default("true"),
  agentic: z.enum(["true", "false"]).optional().default("true")
});

/**
 * GET /api/ai-sdk/tools
 *
 * Fetch all available tools for use with AI SDK
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // Parse and validate query parameters
    const queryResult = ToolQuerySchema.safeParse({
      category: url.searchParams.get("category"),
      search: url.searchParams.get("search") || "",
      builtIn: url.searchParams.get("builtIn") || "true",
      custom: url.searchParams.get("custom") || "true",
      agentic: url.searchParams.get("agentic") || "true"
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: queryResult.error.format() },
        { status: 400 }
      );
    }

    const { category, search } = queryResult.data;
    const includeBuiltIn = queryResult.data.builtIn !== "false";
    const includeCustom = queryResult.data.custom !== "false";
    const includeAgentic = queryResult.data.agentic !== "false";

    // Get all tools using the AI SDK integration module
    const allTools = await getAllAISDKTools({
      includeBuiltIn,
      includeCustom,
      includeAgentic
    });

    // Get individual tool collections for categorization
    const builtInTools = includeBuiltIn ? getAllBuiltInTools() : {};

    // Get custom tools - try Upstash first if enabled
    let customTools = {};
    const provider = getMemoryProvider();

    if (includeCustom) {
      if (provider === 'upstash') {
        try {
          // Get custom tools from Upstash
          const customToolsData = await getData('tools', {});

          // Convert to the format expected by the rest of the code
          customTools = customToolsData.reduce((acc, tool) => {
            // Parse parameters schema
            let parametersSchema;
            try {
              parametersSchema = JSON.parse(tool.parameters_schema);
            } catch (e) {
              parametersSchema = {};
            }

            acc[tool.name] = {
              description: tool.description,
              parameters: parametersSchema
            };
            return acc;
          }, {});

        } catch (error) {
          // Create trace for error with detailed logging
          await createTrace({
            name: "upstash_fallback",
            userId: "system",
            metadata: {
              operation: "list_tools",
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString()
            }
          });

          // TODO: Add proper logging mechanism

          // Fall back to LibSQL
          customTools = await loadCustomTools();
        }
      } else {
        // Use LibSQL directly
        customTools = await loadCustomTools();
      }
    }

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
        search,
        provider
      }
    });

    return NextResponse.json({
      tools: formattedTools,
      categories: toolCategories,
      count: formattedTools.length
    });
  } catch (error) {
    // Handle Upstash-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const errorObj = error as { name: string; message?: string };
      if (errorObj.name === 'UpstashAdapterError' || errorObj.name === 'RedisStoreError' || errorObj.name === 'UpstashClientError') {
        return NextResponse.json(
          { error: `Upstash error: ${errorObj.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    return handleApiError(error);
  }
}

// Define schemas for validation
const CreateToolSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  parametersSchema: z.union([z.string(), z.record(z.any())]),
  implementation: z.string().optional(),
  category: z.string().default("custom")
});

/**
 * POST /api/ai-sdk/tools
 *
 * Create a new custom tool
 */
export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = CreateToolSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { name, description, parametersSchema, implementation, category } = validationResult.data;

    // Validate parameters schema is valid JSON
    let parsedSchema;
    try {
      parsedSchema = typeof parametersSchema === 'string'
        ? JSON.parse(parametersSchema)
        : parametersSchema;
    } catch (e) {
      return NextResponse.json({ error: "Parameters schema must be valid JSON" }, { status: 400 });
    }

    // Determine which provider to use
    const provider = getMemoryProvider();
    let toolId;
    let useLibSQL = false;
    const now = new Date().toISOString();

    if (provider === 'upstash') {
      try {
        // Check if tool with same name already exists
        const existingTools = await getData('tools', {
          filters: [{ field: 'name', operator: 'eq', value: name }]
        });

        if (existingTools.length > 0) {
          return NextResponse.json({ error: "A tool with this name already exists" }, { status: 409 });
        }

        // Create new tool
        const toolData = {
          name,
          description,
          parameters_schema: JSON.stringify(parsedSchema),
          category,
          created_at: now,
          updated_at: now
        };

        const newTool = await createItem('tools', toolData);
        toolId = newTool.id;

        // If implementation is provided, save it to the apps table
        if (implementation) {
          await createItem('apps', {
            name,
            type: 'tool',
            code: implementation,
            created_at: now,
            updated_at: now
          });
        }

        // Create trace for tool creation
        await createTrace({
          name: "tool_created",
          metadata: {
            toolId,
            name,
            category,
            hasImplementation: !!implementation,
            provider: 'upstash'
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
        // Create trace for error with detailed logging
        await createTrace({
          name: "upstash_fallback",
          userId: "system",
          metadata: {
            operation: "create_tool",
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          }
        });

        // TODO: Add proper logging mechanism

        // Fall back to LibSQL
        useLibSQL = true;
      }
    } else {
      useLibSQL = true;
    }

    // Fall back to LibSQL if needed
    if (useLibSQL) {
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

      toolId = result.rows[0].id;

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
          hasImplementation: !!implementation,
          provider: 'libsql'
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
    }
  } catch (error) {
    // Handle Upstash-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const errorObj = error as { name: string; message?: string };
      if (errorObj.name === 'UpstashAdapterError' || errorObj.name === 'RedisStoreError' || errorObj.name === 'UpstashClientError') {
        return NextResponse.json(
          { error: `Upstash error: ${errorObj.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Use the generic API error handler for other errors
    return handleApiError(error);
  }
}

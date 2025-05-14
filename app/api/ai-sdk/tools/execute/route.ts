import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { getAllBuiltInTools, loadCustomTools } from "@/lib/tools";
import { agenticTools } from "@/lib/tools/agentic";
import { getAllAISDKTools } from "@/lib/ai-sdk-integration";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getMemoryProvider } from "@/lib/memory/factory";

// Import Upstash adapter functions - all imports are critical for the adapter pattern
// These imports are required for the adapter pattern to work correctly even if they appear unused
// DO NOT REMOVE ANY OF THESE IMPORTS - they are needed for the adapter pattern
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  getData, // Used for querying tool execution history
  getItemById, // Used for retrieving specific tool execution records
  createItem, // Used for creating new tool execution records
  updateItem, // Used for updating tool execution status
  deleteItem // Used for cleanup operations
} from "@/lib/memory/upstash/supabase-adapter";


// Define schemas for validation
const ToolExecuteSchema = z.object({
  toolName: z.string().min(1, { message: "Tool name is required" }),
  parameters: z.record(z.any()).optional().default({}),
  traceId: z.string().optional()
});

/**
 * POST /api/ai-sdk/tools/execute
 *
 * Execute a tool with the provided parameters
 */
export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = ToolExecuteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { toolName, parameters, traceId } = validationResult.data;

    // Get all available tools using the AI SDK integration module
    // Get built-in tools
    const builtInTools = getAllBuiltInTools();

    // Get custom tools
    const customTools = await loadCustomTools();

    // Get agentic tools
    const agTools = agenticTools;

    // Combine all tools using the AI SDK integration module
    const allTools = await getAllAISDKTools({
      includeBuiltIn: true,
      includeCustom: true,
      includeAgentic: true
    });

    // Check if tool exists in any of the tool collections
    let toolExists = false;
    let toolSource = '';

    if (toolName in builtInTools) {
      toolExists = true;
      toolSource = 'built-in';
    } else if (toolName in customTools) {
      toolExists = true;
      toolSource = 'custom';
    } else if (toolName in agTools) {
      toolExists = true;
      toolSource = 'agentic';
    }

    if (!toolExists) {
      return NextResponse.json({ error: `Tool '${toolName}' not found` }, { status: 404 });
    }

    // Create execution ID
    const executionId = uuidv4();

    // Create trace for tool execution
    const executionTrace = await createTrace({
      name: "tool_execution",
      userId: executionId,
      metadata: {
        toolName,
        parameters,
        parentTraceId: traceId,
        timestamp: new Date().toISOString()
      }
    });

    // Start execution time
    const startTime = Date.now();

    try {
      // Execute the tool based on its source
      let result;
      if (toolName in builtInTools) {
        result = await builtInTools[toolName].execute(parameters);
      } else if (toolName in customTools) {
        result = await customTools[toolName].execute(parameters);
      } else if (toolName in agTools) {
        result = await agTools[toolName].execute(parameters);
      } else {
        // Fallback to allTools if somehow the tool wasn't found in the specific collections
        result = await allTools[toolName as keyof typeof allTools].execute(parameters);
      }

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Determine which provider to use
      const provider = getMemoryProvider();
      let useLibSQL = false;

      if (provider === 'upstash') {
        try {
          // Log execution to Upstash using the adapter directly
          await createItem('tool_executions', {
            id: executionId,
            tool_name: toolName,
            parameters: JSON.stringify(parameters),
            result: JSON.stringify(result),
            status: 'success',
            execution_time: executionTime,
            created_at: new Date().toISOString()
          });

          // Success - don't use LibSQL
          useLibSQL = false;
        } catch (error) {
          // Create trace for error with detailed logging
          await createTrace({
            name: "upstash_fallback",
            userId: executionId,
            metadata: {
              operation: "log_tool_execution",
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString()
            }
          });

          // Fall back to LibSQL
          useLibSQL = true;
        }
      } else {
        useLibSQL = true;
      }

      // Fall back to LibSQL if needed
      if (useLibSQL) {
        const db = getLibSQLClient();
        await db.execute({
          sql: `
            INSERT INTO tool_executions (
              id, tool_name, parameters, result, status, execution_time, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `,
          args: [
            executionId,
            toolName,
            JSON.stringify(parameters),
            JSON.stringify(result),
            'success',
            executionTime
          ]
        });
      }

      // Log success event
      if (executionTrace?.id) {
        await logEvent({
          traceId: executionTrace.id,
          name: "tool_execution_success",
          metadata: {
            toolName,
            executionTime,
            resultType: typeof result,
            timestamp: new Date().toISOString(),
            provider: useLibSQL ? 'libsql' : 'upstash'
          }
        });
      }

      return NextResponse.json({
        executionId,
        toolName,
        result,
        status: 'success',
        executionTime
      });
    } catch (error) {
      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Determine which provider to use
      const provider = getMemoryProvider();
      let useLibSQL = false;

      if (provider === 'upstash') {
        try {
          // Log execution error to Upstash using the adapter directly
          await createItem('tool_executions', {
            id: executionId,
            tool_name: toolName,
            parameters: JSON.stringify(parameters),
            error_message: error instanceof Error ? error.message : String(error),
            status: 'error',
            execution_time: executionTime,
            created_at: new Date().toISOString()
          });

          // Success - don't use LibSQL
          useLibSQL = false;
        } catch (logError) {
          // Create trace for error with detailed logging
          await createTrace({
            name: "upstash_fallback",
            userId: executionId,
            metadata: {
              operation: "log_tool_execution_error",
              error: logError instanceof Error ? logError.message : String(logError),
              timestamp: new Date().toISOString()
            }
          });

          // Fall back to LibSQL
          useLibSQL = true;
        }
      } else {
        useLibSQL = true;
      }

      // Fall back to LibSQL if needed
      if (useLibSQL) {
        const db = getLibSQLClient();
        await db.execute({
          sql: `
            INSERT INTO tool_executions (
              id, tool_name, parameters, error_message, status, execution_time, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `,
          args: [
            executionId,
            toolName,
            JSON.stringify(parameters),
            error instanceof Error ? error.message : String(error),
            'error',
            executionTime
          ]
        });
      }

      // Log error event
      if (executionTrace?.id) {
        await logEvent({
          traceId: executionTrace.id,
          name: "tool_execution_error",
          metadata: {
            toolName,
            executionTime,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
            provider: useLibSQL ? 'libsql' : 'upstash'
          }
        });
      }

      return NextResponse.json({
        executionId,
        toolName,
        error: error instanceof Error ? error.message : String(error),
        status: 'error',
        executionTime
      }, { status: 500 });
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

    return handleApiError(error);
  }
}

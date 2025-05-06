import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { getAllBuiltInTools, loadCustomTools } from "@/lib/tools";
import { agenticTools } from "@/lib/tools/agentic";
import { getAllAISDKTools } from "@/lib/ai-sdk-integration";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { v4 as uuidv4 } from "uuid";
import * as toolExecutors from "@/lib/tools/tool-execution";

/**
 * POST /api/ai-sdk/tools/execute
 *
 * Execute a tool with the provided parameters
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { toolName, parameters, traceId } = body;

    if (!toolName) {
      return NextResponse.json({ error: "Tool name is required" }, { status: 400 });
    }

    // Get all available tools using the AI SDK integration module
    const allTools = await getAllAISDKTools({
      includeBuiltIn: true,
      includeCustom: true,
      includeAgentic: true
    });

    // Check if tool exists
    if (!allTools[toolName] && !toolExecutors[`execute${toolName}`]) {
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
      let result;

      // Execute the tool
      if (allTools[toolName]) {
        // Use the tool from the registry
        result = await allTools[toolName].execute(parameters);
      } else {
        // Use the tool executor
        result = await toolExecutors[`execute${toolName}`](parameters);
      }

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Log execution to database
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

      // Log success event
      if (executionTrace?.id) {
        await logEvent({
          traceId: executionTrace.id,
          name: "tool_execution_success",
          metadata: {
            toolName,
            executionTime,
            resultType: typeof result,
            timestamp: new Date().toISOString()
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

      // Log execution to database
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

      // Log error event
      if (executionTrace?.id) {
        await logEvent({
          traceId: executionTrace.id,
          name: "tool_execution_error",
          metadata: {
            toolName,
            executionTime,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
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
    return handleApiError(error);
  }
}

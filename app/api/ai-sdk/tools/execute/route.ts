import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { getAllBuiltInTools, loadCustomTools } from "@/lib/tools";
import { agenticTools } from "@/lib/tools/agentic";
import { getAllAISDKTools } from "@/lib/ai-sdk-integration";
import { createTrace } from "@/lib/langfuse-integration";
import { getMemoryProvider } from "@/lib/memory/factory";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const ToolExecuteSchema = z.object({
  toolName: z.string().min(1, { message: "Tool name is required" }),
  parameters: z.record(z.any()).optional().default({}),
  traceId: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = ToolExecuteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    const { toolName, parameters, traceId } = validationResult.data;
    const builtInTools = getAllBuiltInTools();
    const customTools = await loadCustomTools();
    const agTools = agenticTools;
    const allTools = await getAllAISDKTools({
      includeBuiltIn: true,
      includeCustom: true,
      includeAgentic: true
    });
    let toolExists = false;
    let toolExec: ((params: unknown) => Promise<unknown>) | undefined;
    if (toolName in builtInTools) {
      toolExists = true;
      toolExec = builtInTools[toolName].execute;
    } else if (toolName in customTools) {
      toolExists = true;
      toolExec = customTools[toolName]?.execute;
    } else if (toolName in agTools) {
      toolExists = true;
      toolExec = agTools[toolName]?.execute;
    } else if (toolName in allTools) {
      toolExists = true;
      toolExec = (allTools as Record<string, any>)[toolName]?.execute;
    }
    if (!toolExists || !toolExec) {
      return NextResponse.json({ error: `Tool '${toolName}' not found` }, { status: 404 });
    }
    const executionId = uuidv4();
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
    const startTime = Date.now();
    let result;
    try {
      result = await toolExec(parameters);
    } catch (err) {
      return NextResponse.json({ error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
    }
    const executionTime = Date.now() - startTime;
    const provider = getMemoryProvider();
    if (provider === 'upstash') {
      try {
        await (await import("@/lib/memory/upstash/supabase-adapter")).createItem('tool_executions', {
          id: executionId,
          tool_name: toolName,
          parameters: JSON.stringify(parameters),
          result: JSON.stringify(result),
          status: 'success',
          execution_time: executionTime,
          created_at: new Date().toISOString()
        });
      } catch {}
    }
    return NextResponse.json({ result, executionTime });
  } catch (error) {
    return handleApiError(error);
  }
}

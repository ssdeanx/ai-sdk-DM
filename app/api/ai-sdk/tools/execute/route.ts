import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { getAllBuiltInTools, loadCustomTools } from "@/lib/tools";
import { agenticTools } from "@/lib/tools/agentic";
import { getAllAISDKTools } from "@/lib/ai-sdk-integration";
import { getMemoryProvider } from "@/lib/memory/factory";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

// Local type for dynamic tool execution
interface DynamicTool {
  execute: (params: Record<string, unknown>, options: { toolCallId: string }) => Promise<unknown>;
}

const ToolExecuteSchema = z.object({
  toolName: z.string().min(1, { message: "Tool name is required" }),
  parameters: z.record(z.unknown()).optional().default({}),
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
    const { toolName, parameters } = validationResult.data;
    const builtInTools = getAllBuiltInTools();
    const customTools = await loadCustomTools();
    const agTools = agenticTools;
    const allTools = await getAllAISDKTools({
      includeBuiltIn: true,
      includeCustom: true,
      includeAgentic: true
    });
    let tool: unknown;
    if (Object.prototype.hasOwnProperty.call(builtInTools, toolName)) {
      tool = (builtInTools as Record<string, unknown>)[toolName];
    } else if (Object.prototype.hasOwnProperty.call(customTools, toolName)) {
      tool = (customTools as Record<string, unknown>)[toolName];
    } else if (Object.prototype.hasOwnProperty.call(agTools, toolName)) {
      tool = (agTools as Record<string, unknown>)[toolName];
    } else if (Object.prototype.hasOwnProperty.call(allTools, toolName)) {
      tool = (allTools as Record<string, unknown>)[toolName];
    }
    if (
      !tool ||
      typeof tool !== "object" ||
      tool === null ||
      typeof (tool as { execute?: unknown }).execute !== "function"
    ) {
      return NextResponse.json({ error: `Tool '${toolName}' not found` }, { status: 404 });
    }
    const executionId = uuidv4();
    const startTime = Date.now();
    let result;
    try {
      result = await (tool as DynamicTool).execute(parameters, { toolCallId: executionId });
    } catch (err) {
      return NextResponse.json({ error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
    }
    const executionTime = Date.now() - startTime;
    const provider = getMemoryProvider();
    if (provider === 'upstash') {
      try {
        // Use explicit type for tool_executions row
        type ToolExecutionRow = {
          id: string;
          tool_name: string;
          parameters: string;
          result: string;
          status: string;
          execution_time: number;
          created_at: string;
        };
        const executionRow: ToolExecutionRow = {
          id: executionId,
          tool_name: toolName,
          parameters: JSON.stringify(parameters),
          result: JSON.stringify(result),
          status: 'success',
          execution_time: executionTime,
          created_at: new Date().toISOString()
        };
        await (await import("@/lib/memory/upstash/supabase-adapter")).createItem('tool_executions', executionRow);
      } catch {
        // fallback: do not throw, just skip logging if Upstash fails
      }
    }
    return NextResponse.json({ result, executionTime });
  } catch (error) {
    return handleApiError(error);
  }
}

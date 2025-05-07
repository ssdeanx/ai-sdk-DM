/**
 * Tool Initializer for AI SDK
 * 
 * This module handles the initialization of all tools in the system.
 * It provides functions to initialize built-in tools, custom tools,
 * and agentic tools with proper configuration.
 * 
 * @module toolInitializer
 */

import { tool } from "ai"
import { z } from "zod"
import * as webTools from "./web-tools"
import * as codeTools from "./code-tools"
import * as dataTools from "./data-tools"
import * as fileTools from "./file-tools"
import * as apiTools from "./api-tools"
import * as ragTools from "./rag-tools"
import * as agenticTools from "./agentic"
import { getLibSQLClient } from "../memory/db"
import { getData, getItemById } from "../memory/supabase"
import { jsonSchemaToZod } from "./index"
import { createTrace, logEvent } from "../langfuse-integration"

/**
 * Configuration options for tool initialization
 */
export interface ToolInitializerOptions {
  /** Whether to include built-in tools */
  includeBuiltIn?: boolean
  /** Whether to include custom tools */
  includeCustom?: boolean
  /** Whether to include agentic tools */
  includeAgentic?: boolean
  /** Optional trace ID for observability */
  traceId?: string
  /** Optional user ID for observability */
  userId?: string
}

/**
 * Initialize all tools based on the provided options
 * 
 * @param options - Configuration options
 * @returns Object containing all initialized tools
 */
export async function initializeTools(options: ToolInitializerOptions = {}) {
  const {
    includeBuiltIn = true,
    includeCustom = true,
    includeAgentic = true,
    traceId,
    userId,
  } = options

  // Create trace for tool initialization
  const trace = traceId
    ? null
    : await createTrace({
        name: "tool_initialization",
        userId,
        metadata: {
          includeBuiltIn,
          includeCustom,
          includeAgentic,
        },
      })

  try {
    // Initialize built-in tools
    const builtInTools = includeBuiltIn ? initializeBuiltInTools() : {}

    // Initialize custom tools
    const customTools = includeCustom ? await initializeCustomTools() : {}

    // Initialize agentic tools
    const aTools = includeAgentic ? initializeAgenticTools() : {}

    // Combine all tools
    const allTools = {
      ...builtInTools,
      ...customTools,
      ...aTools,
    }

    // Log success event
    if (trace) {
      await logEvent({
        traceId: trace.id,
        name: "tools_initialized",
        metadata: {
          level: "info",
          builtInCount: Object.keys(builtInTools).length,
          customCount: Object.keys(customTools).length,
          agenticCount: Object.keys(aTools).length,
          totalCount: Object.keys(allTools).length,
        },
      })
    }

    return allTools
  } catch (error) {
    // Log error event
    if (trace) {
      await logEvent({
        traceId: trace.id,
        name: "tool_initialization_error",
        metadata: {
          level: "error",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      })
    }

    console.error("Error initializing tools:", error)
    throw error
  }
}

/**
 * Initialize built-in tools
 * 
 * @returns Object containing all built-in tools
 */
export function initializeBuiltInTools() {
  return {
    ...webTools.tools,
    ...codeTools.tools,
    ...dataTools.tools,
    ...fileTools.tools,
    ...apiTools.tools,
    ...ragTools.tools,
  }
}

/**
 * Initialize agentic tools
 * 
 * @returns Object containing all agentic tools
 */
export function initializeAgenticTools() {
  return {
    ...agenticTools,
  }
}

/**
 * Initialize custom tools from the database
 * 
 * @returns Object containing all custom tools
 */
export async function initializeCustomTools() {
  try {
    // Fetch custom tools from Supabase
    const tools = await getData<any>("tools", {
      filters: { type: "custom" },
    })

    const customTools: Record<string, any> = {}

    for (const tool of tools) {
      try {
        const name = tool.name as string
        const description = tool.description as string
        const parametersSchema = JSON.parse(tool.parameters_schema as string)
        
        // If implementation is in a separate table, fetch it
        let implementation = tool.implementation as string | undefined
        if (!implementation && tool.app_id) {
          const app = await getItemById<any>("apps", tool.app_id)
          implementation = app?.code
        }
        
        if (!implementation) continue

        // Convert JSON schema to Zod schema
        const zodSchema = jsonSchemaToZod(parametersSchema)

        // Create a safe execution environment for the custom tool
        const executeTool = new Function("params", implementation)

        customTools[name] = tool({
          description,
          parameters: zodSchema,
          execute: async (params: z.infer<typeof zodSchema>): Promise<any | { error: string }> => {
            try {
              const executionResult: any = await executeTool(params)
              return executionResult
            } catch (error: unknown) {
              console.error(`Error executing custom tool ${name}:`, error)
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
              return { error: `Tool execution failed: ${errorMessage}` } as { error: string }
            }
          },
        })
      } catch (error) {
        console.error(`Error loading custom tool ${tool.name}:`, error)
      }
    }

    return customTools
  } catch (error) {
    console.error("Error loading custom tools from Supabase:", error)
    return {}
  }
}

/**
 * Tool Initializer for AI SDK
 * 
 * This module handles the initialization of all tools in the system.
 * It provides functions to initialize built-in tools, custom tools,
 * and agentic tools with proper configuration.
 * 
 * @module toolInitializer
 */

import { tool, type Tool } from "ai"; // Import Tool type
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
 * @returns Object containing all initialized tools, structured according to LoadedTools interface
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
    const builtInTools = includeBuiltIn ? initializeBuiltInTools() : undefined;

    // Initialize custom tools
    const customTools = includeCustom ? await initializeCustomTools() : undefined;

    // Initialize agentic tools
    const agenticToolsResult = includeAgentic ? initializeAgenticTools() : undefined;

    // Structure the tools according to the LoadedTools interface
    const allInitializedTools = {
      builtIn: builtInTools,
      custom: customTools,
      agentic: agenticToolsResult,
    };

    // Log success event
    if (trace) {
      await logEvent({
        traceId: trace.id,
        name: "tools_initialized_structured",
        metadata: {
          level: "info",
          builtInCount: builtInTools ? Object.keys(builtInTools).reduce((acc, category) => acc + Object.keys(builtInTools[category] || {}).length, 0) : 0,
          customCount: customTools ? Object.keys(customTools).length : 0,
          agenticCount: agenticToolsResult ? Object.keys(agenticToolsResult).length : 0,
          totalCategories: Object.keys(allInitializedTools).filter(key => allInitializedTools[key as keyof typeof allInitializedTools] !== undefined).length,
        },
      })
    }

    return allInitializedTools;
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
 * Initialize built-in tools, grouped by their module/category.
 * 
 * @returns Object where keys are module names (e.g., "web", "code") 
 *          and values are records of tool names to tool instances.
 */
export function initializeBuiltInTools(): Record<string, Record<string, Tool<any, any> | undefined>> {
  const builtInToolGroups: Record<string, Record<string, Tool<any, any> | undefined>> = {};

  if (webTools && webTools.tools) {
    builtInToolGroups.web = webTools.tools as Record<string, Tool<any, any> | undefined>;
  }
  if (codeTools && codeTools.tools) {
    builtInToolGroups.code = codeTools.tools as Record<string, Tool<any, any> | undefined>;
  }
  if (dataTools && dataTools.tools) {
    builtInToolGroups.data = dataTools.tools as Record<string, Tool<any, any> | undefined>;
  }
  if (fileTools && fileTools.tools) {
    builtInToolGroups.file = fileTools.tools as Record<string, Tool<any, any> | undefined>;
  }
  if (apiTools && apiTools.tools) {
    builtInToolGroups.api = apiTools.tools as Record<string, Tool<any, any> | undefined>;
  }
  if (ragTools && ragTools.tools) {
    builtInToolGroups.rag = ragTools.tools as Record<string, Tool<any, any> | undefined>;
  }
  return builtInToolGroups;
}

/**
 * Initialize agentic tools.
 * 
 * @returns Object containing all agentic tools.
 */
export function initializeAgenticTools(): Record<string, Tool<any, any> | undefined> {
  const tools: Record<string, Tool<any, any> | undefined> = {};
  if (agenticTools && typeof agenticTools === 'object') {
    // Check if agenticTools itself is a collection of tools (e.g. exported directly from ./agentic/index.ts)
    // or if it has a .tools property like other modules.
    const source = (agenticTools as any).tools || agenticTools;
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const potentialTool = (source as any)[key];
        // Basic check for tool structure - adjust if needed
        if (potentialTool && typeof potentialTool === 'object' && 
            ('description' in potentialTool || 'parameters' in potentialTool) && 
            typeof potentialTool.execute === 'function') {
          tools[key] = potentialTool as Tool<any, any>;
        }
      }
    }
  }
  return tools;
}

/**
 * Initialize custom tools from the database
 * 
 * @returns Object containing all custom tools, structured with instance and category
 */
export async function initializeCustomTools(): Promise<Record<string, { instance: any; category: string }>> {
  const customTools: Record<string, { instance: any; category: string }> = {}; // Initialize customTools here
  try {
    // Fetch custom tools from Supabase, including their category
    const toolsFromDb = await getData<any>("tools", { // Assuming 'tools' table has a 'category' column
      match: { type: "custom" }, // Or however custom tools are identified
    });

    if (!toolsFromDb) {
      console.warn("No custom tools found in the database.");
      return {}; // Return empty if no tools are found
    }

    for (const dbTool of toolsFromDb) {
      try {
        const name = dbTool.name as string;
        if (!name) {
          console.warn("Custom tool found with no name. Skipping.", dbTool);
          continue;
        }
        const description = dbTool.description as string;
        const parametersSchemaString = dbTool.parameters_schema as string;
        const category = (dbTool.category as string | undefined) || 'custom'; // Default to 'custom' if not specified

        if (!parametersSchemaString) {
          console.warn(`Parameters schema not found for custom tool ${name}. Skipping.`);
          continue;
        }
        
        const parametersSchema = JSON.parse(parametersSchemaString);
        
        let implementation = dbTool.implementation as string | undefined;
        if (!implementation && dbTool.app_id) {
          const app = await getItemById<any>("apps", dbTool.app_id);
          implementation = app?.code;
        }
        
        if (!implementation) {
          console.warn(`Implementation not found for custom tool ${name}. Skipping.`);
          continue;
        }

        const zodSchema = jsonSchemaToZod(parametersSchema);

        const executeTool = new Function("params", implementation);

        customTools[name] = {
          instance: tool({
            description,
            parameters: zodSchema,
            execute: async (params: z.infer<typeof zodSchema>): Promise<any> => { // Return type changed to Promise<any> for simplicity, can be more specific
              try {
                const executionResult: any = await executeTool(params);
                return executionResult;
              } catch (error: unknown) { // Explicitly type error
                console.error(`Error executing custom tool ${name}:`, error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                return { tool_execution_error: `Tool execution failed: ${errorMessage}` }; 
              }
            },
          }),
          category: category
        };
      } catch (error: unknown) { // Explicitly type error
        console.error(`Error loading custom tool ${(dbTool as any)?.name || 'unknown'}:`, error);
      }
    }
    return customTools; // Added return statement
  } catch (error: unknown) { // Explicitly type error for the outer catch
    console.error("Failed to initialize custom tools:", error);
    return {}; // Return empty object or rethrow, depending on desired error handling
  }
}

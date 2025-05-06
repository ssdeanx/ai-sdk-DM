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

// Export all tool modules
export { webTools, codeTools, dataTools, fileTools, apiTools, ragTools, agenticTools }

// Tool categories
export const toolCategories = [
  { id: "web", name: "Web Tools", description: "Tools for interacting with the web" },
  { id: "code", name: "Code Tools", description: "Tools for code execution and analysis" },
  { id: "data", name: "Data Tools", description: "Tools for data processing and analysis" },
  { id: "file", name: "File Tools", description: "Tools for file system operations" },
  { id: "api", name: "API Tools", description: "Tools for API interactions" },
  { id: "rag", name: "RAG Tools", description: "Tools for retrieval-augmented generation" },
  { id: "agentic", name: "Agentic Tools", description: "Agentic and AI SDK compatible tools" },
  { id: "custom", name: "Custom Tools", description: "User-defined custom tools" },
]

// Get all built-in tools
export function getAllBuiltInTools() {
  return {
    ...webTools.tools,
    ...codeTools.tools,
    ...dataTools.tools,
    ...fileTools.tools,
    ...apiTools.tools,
    ...ragTools.tools,
    ...agenticTools,
  }
}

// Load custom tools from Supabase
export async function loadCustomTools() {
  try {
    // Fetch custom tools from Supabase
    const tools = await getData<any>("tools", {
      filters: { type: "custom" },
    })

    // Optionally join with implementation code from an "apps" table if needed
    // For now, assume implementation is stored in a column (e.g., implementation or code)

    const customTools: Record<string, any> = {}

    for (const tool of tools) {
      try {
        const name = tool.name as string
        const description = tool.description as string
        const parametersSchema = JSON.parse(tool.parameters_schema as string)
        // If implementation is in a separate table, fetch it here
        let implementation = tool.implementation as string | undefined
        if (!implementation && tool.app_id) {
          // Example: fetch from apps table if needed
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
          parameters: zodSchema, // Assuming zodSchema is of type z.ZodTypeAny
          execute: async (params: z.infer<typeof zodSchema>): Promise<any | { error: string }> => {
            try {
              // Assuming executeTool is typed as:
              // const executeTool: (params: z.infer<typeof zodSchema>) => Promise<any> | any;
              const executionResult: any = await executeTool(params);
              return executionResult;
            } catch (error: unknown) {
              console.error(`Error executing custom tool ${name}:`, error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
              return { error: `Tool execution failed: ${errorMessage}` } as { error: string };
            }
          },
        });
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

// Helper to convert JSON schema to Zod schema
export function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || typeof schema !== "object") {
    throw new Error("Invalid schema")
  }

  if (schema.type === "object") {
    const shape: Record<string, z.ZodTypeAny> = {}

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        let zodProp = jsonSchemaToZod(prop as any)

        // Make property optional if not in required array
        if (schema.required && !schema.required.includes(key)) {
          zodProp = zodProp.optional()
        }

        shape[key] = zodProp
      }
    }

    return z.object(shape)
  } else if (schema.type === "string") {
    let zodString = z.string()

    if (schema.enum) {
      return z.enum(schema.enum as [string, ...string[]])
    }

    if (schema.description) {
      zodString = zodString.describe(schema.description)
    }

    return zodString
  } else if (schema.type === "number" || schema.type === "integer") {
    return z.number()
  } else if (schema.type === "boolean") {
    return z.boolean()
  } else if (schema.type === "array") {
    if (schema.items) {
      return z.array(jsonSchemaToZod(schema.items))
    }
    return z.array(z.any())
  }

  return z.any()
}

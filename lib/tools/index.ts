/**
 * AI SDK Tools - Main Barrel File
 *
 * This is the main entry point for all tools in the AI SDK.
 * It exports all tool modules, categories, and utility functions.
 *
 * @module tools
 */

import { z } from "zod"

// Import all tool modules
import * as webTools from "./web-tools"
import * as codeTools from "./code-tools"
import * as dataTools from "./data-tools"
import * as fileTools from "./file-tools"
import * as apiTools from "./api-tools"
import * as ragTools from "./rag-tools"
import * as agenticTools from "./agentic"
import * as toolExecutionStore from "./upstash-tool-execution-store"

// Import tool initialization and registry
import { initializeTools, initializeBuiltInTools, initializeCustomTools, initializeAgenticTools } from "./toolInitializer"
import { ToolRegistry, toolRegistry } from "./toolRegistry"

// Export all tool modules
export { webTools, codeTools, dataTools, fileTools, apiTools, ragTools, agenticTools, toolExecutionStore }

// Export tool initialization and registry
export { initializeTools, initializeBuiltInTools, initializeCustomTools, initializeAgenticTools }
export { ToolRegistry, toolRegistry }

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
  { id: "execution", name: "Tool Execution", description: "Tools for tracking and analyzing tool executions" },
]

/**
 * Get all built-in tools
 *
 * @returns Object containing all built-in tools
 */
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

/**
 * Load custom tools from Supabase
 *
 * @returns Object containing all custom tools
 */
export async function loadCustomTools() {
  return await initializeCustomTools()
}

/**
 * Helper to convert JSON schema to Zod schema
 *
 * @param schema - JSON schema to convert
 * @returns Zod schema
 */
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

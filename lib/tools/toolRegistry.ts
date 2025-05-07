/**
 * Tool Registry for AI SDK
 *
 * This module provides a registry for managing and accessing tools.
 * It allows registering, retrieving, and validating tools.
 *
 * @module toolRegistry
 */

import { tool } from "ai"
import { z } from "zod"
import { initializeTools } from "./toolInitializer"
import { createTrace, logEvent } from "../langfuse-integration"
import { LRUCache } from "lru-cache"

/**
 * Tool registry class for managing AI SDK tools
 */
export class ToolRegistry {
  private tools: Record<string, any> = {}
  private initialized: boolean = false
  private initializationPromise: Promise<void> | null = null

  /**
   * Create a new tool registry
   *
   * @param options - Initialization options
   */
  constructor(private options: {
    autoInitialize?: boolean
    includeBuiltIn?: boolean
    includeCustom?: boolean
    includeAgentic?: boolean
  } = {}) {
    const { autoInitialize = true } = options

    if (autoInitialize) {
      this.initializationPromise = this.initialize()
    }
  }

  /**
   * Initialize the tool registry
   *
   * @param traceId - Optional trace ID for observability
   * @param userId - Optional user ID for observability
   */
  async initialize(traceId?: string, userId?: string): Promise<void> {
    if (this.initialized) return

    const { includeBuiltIn = true, includeCustom = true, includeAgentic = true } = this.options

    try {
      this.tools = await initializeTools({
        includeBuiltIn,
        includeCustom,
        includeAgentic,
        traceId,
        userId,
      })

      this.initialized = true
    } catch (error) {
      console.error("Error initializing tool registry:", error)
      throw error
    }
  }

  /**
   * Ensure the registry is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return
    if (this.initializationPromise) {
      await this.initializationPromise
      return
    }
    await this.initialize()
  }

  /**
   * Register a new tool
   *
   * @param name - Tool name
   * @param description - Tool description
   * @param parameters - Tool parameters schema
   * @param execute - Tool execution function
   * @returns The registered tool
   */
  register<T extends z.ZodTypeAny>(
    name: string,
    description: string,
    parameters: T,
    execute: (params: z.infer<T>) => Promise<any>
  ): any {
    const newTool = tool({
      description,
      parameters,
      execute,
    })

    this.tools[name] = newTool
    return newTool
  }

  /**
   * Get a tool by name
   *
   * @param name - Tool name
   * @returns The tool or undefined if not found
   */
  async getTool(name: string): Promise<any | undefined> {
    await this.ensureInitialized()
    return this.tools[name]
  }

  /**
   * Get all tools
   *
   * @returns Object containing all tools
   */
  async getAllTools(): Promise<Record<string, any>> {
    await this.ensureInitialized()
    return { ...this.tools }
  }

  /**
   * Get tools by category
   *
   * @param category - Tool category
   * @returns Object containing tools in the category
   */
  async getToolsByCategory(category: string): Promise<Record<string, any>> {
    await this.ensureInitialized()

    // Get tool categories from index.ts
    const { toolCategories } = await import("./index")

    // Find category
    const categoryInfo = toolCategories.find((c) => c.id === category)
    if (!categoryInfo) {
      return {}
    }

    // Filter tools by category
    const result: Record<string, any> = {}

    // For built-in tools, use the naming convention
    for (const [name, toolObj] of Object.entries(this.tools)) {
      // Check if tool name starts with category name (e.g., "Web" for web tools)
      if (name.startsWith(categoryInfo.name.split(" ")[0])) {
        result[name] = toolObj
      }
    }

    return result
  }

  /**
   * Check if a tool exists
   *
   * @param name - Tool name
   * @returns True if the tool exists
   */
  async hasTool(name: string): Promise<boolean> {
    await this.ensureInitialized()
    return name in this.tools
  }

  /**
   * Execute a tool
   *
   * @param name - Tool name
   * @param params - Tool parameters
   * @param traceId - Optional trace ID for observability
   * @returns Tool execution result
   */
  async executeTool(name: string, params: any, traceId?: string): Promise<any> {
    await this.ensureInitialized()

    const tool = this.tools[name]
    if (!tool) {
      throw new Error(`Tool '${name}' not found`)
    }

    // Create trace for tool execution
    const trace = traceId
      ? null
      : await createTrace({
          name: "tool_execution",
          metadata: {
            toolName: name,
            params,
          },
        })

    try {
      // Execute the tool
      const result = await tool.execute(params)

      // Log success event
      if (trace) {
        await logEvent({
          traceId: trace.id,
          name: "tool_execution_success",
          metadata: {
            level: "info",
            toolName: name,
            result,
          },
        })
      }

      return result
    } catch (error) {
      // Log error event
      if (trace) {
        await logEvent({
          traceId: trace.id,
          name: "tool_execution_error",
          metadata: {
            level: "error",
            toolName: name,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        })
      }

      console.error(`Error executing tool '${name}':`, error)
      throw error
    }
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry()

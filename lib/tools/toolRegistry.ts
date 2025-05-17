/**
 * Tool Registry for AI SDK
 *
 * This module provides a registry for managing and accessing tools.
 * It allows registering, retrieving, and validating tools.
 *
 * @module toolRegistry
 */

import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { initializeTools } from './toolInitializer';
import { createTrace, logEvent } from '../langfuse-integration';

/**
 * Represents a tool along with its category.
 */
interface CategorizedTool {
  instance: Tool<any, any>;
  category: string;
}

/**
 * Describes the structure of tools loaded by `initializeTools`.
 */
interface LoadedTools {
  builtIn?: Record<string, Record<string, Tool<any, any> | undefined>>; // moduleName -> toolName -> toolInstance
  custom?: Record<
    string,
    {
      // Changed from Array to Record
      instance: Tool<any, any>;
      category: string;
      // is_enabled can be handled by initializeCustomTools by not returning disabled tools
    }
  >;
  agentic?: Record<string, Tool<any, any> | undefined>; // toolName -> toolInstance
}

/**
 * Initialization options for the ToolRegistry.
 */
interface ToolRegistryOptions {
  autoInitialize?: boolean;
  includeBuiltIn?: boolean;
  includeCustom?: boolean;
  includeAgentic?: boolean;
}

/**
 * Tool registry class for managing AI SDK tools.
 * It loads tools from different sources (built-in, custom via Supabase, agentic)
 * and categorizes them.
 */
export class ToolRegistry {
  // Singleton instance for static method access
  static readonly instance: ToolRegistry = new ToolRegistry();

  /**
   * Checks if a tool with the given name exists in the registry.
   *
   * @param toolName - The name of the tool to check.
   * @returns A promise that resolves to true if the tool exists, false otherwise.
   */
  static async hasTool(toolName: string): Promise<boolean> {
    const tool = await ToolRegistry.instance.getTool(toolName);
    return !!tool;
  }

  /**
   * Gets a tool by its name.
   *
   * @param toolName - The name of the tool to retrieve.
   * @returns A promise that resolves to the tool instance, or undefined if not found.
   */
  static async getTool(toolName: string): Promise<Tool<any, any> | undefined> {
    return ToolRegistry.instance.getTool(toolName);
  }

  /**
   * Executes a tool with the given parameters.
   *
   * @param toolName - The name of the tool to execute.
   * @param params - The parameters to pass to the tool.
   * @returns A promise that resolves to the result of the tool execution.
   * @throws Error if the tool is not found or execution fails.
   */
  static async executeTool(toolName: string, params: any): Promise<any> {
    const tool = (await ToolRegistry.instance.getTool(toolName)) as any;
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found in registry.`);
    }

    try {
      // Create a trace for tool execution
      const trace = await createTrace({
        name: `tool_execution_${toolName}`,
        metadata: {
          toolName,
          params: JSON.stringify(params),
        },
      });

      // Execute the tool - AI SDK tools have an execute method that takes params
      // We need to handle both the AI SDK tool format and any custom formats
      let result;

      // Handle different tool formats
      if (typeof tool === 'function') {
        // Direct function tool
        result = await tool(params);
      } else if (tool && typeof (tool as any).execute === 'function') {
        // AI SDK tool format
        const executeFn = (tool as any).execute;
        // AI SDK tools might expect (params, runId) signature
        result = await executeFn.call(
          tool,
          params,
          `tool_execution_${Date.now()}`
        );
      } else if (tool && typeof (tool as any).call === 'function') {
        // For compatibility with other tool formats
        result = await (tool as any).call(params);
      } else {
        throw new Error(
          `Tool '${toolName}' does not have a valid execute method.`
        );
      }

      // Log successful execution
      logEvent({
        traceId: trace ? trace.id : 'ToolRegistry',
        name: 'ToolExecutionSuccess',
        metadata: {
          toolName,
          result:
            typeof result === 'object'
              ? JSON.stringify(result)
              : String(result),
        },
      });

      return result;
    } catch (error) {
      console.error(`Error executing tool '${toolName}':`, error);

      // Log execution error
      logEvent({
        traceId: 'ToolRegistry',
        name: 'ToolExecutionError',
        metadata: {
          toolName,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  /**
   * Registers a new tool in the registry.
   *
   * @param toolName - The name of the tool.
   * @param description - The description of the tool.
   * @param zodSchema - The Zod schema for the tool parameters.
   * @param execute - The function to execute when the tool is called.
   * @returns A promise that resolves when the tool is registered.
   */
  static async register(
    toolName: string,
    description: string,
    zodSchema: z.ZodTypeAny,
    execute: (params: any) => Promise<any>
  ): Promise<void> {
    // Create the tool instance
    const toolInstance = tool({
      description,
      parameters: zodSchema,
      execute,
    });

    // Add the tool to the registry
    await ToolRegistry.instance.ensureInitialized();
    ToolRegistry.instance.categorizedTools.set(toolName, {
      instance: toolInstance,
      category: 'custom',
    });

    // Log tool registration
    logEvent({
      traceId: 'ToolRegistry',
      name: 'ToolRegistered',
      metadata: {
        toolName,
        category: 'custom',
      },
    });
  }
  private categorizedTools: Map<string, CategorizedTool> = new Map();
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private options: ToolRegistryOptions;

  /**
   * Creates a new tool registry.
   *
   * @param options - Initialization options.
   */
  constructor(options: ToolRegistryOptions = {}) {
    this.options = {
      autoInitialize: true,
      includeBuiltIn: true,
      includeCustom: true,
      includeAgentic: true,
      ...options,
    };

    if (this.options.autoInitialize) {
      // Assign to a local variable to avoid unhandled promise rejection in constructor if initialize throws sync
      const initPromise = this.initialize();
      if (initPromise.catch) {
        initPromise.catch((error) => {
          console.error(
            'Failed to auto-initialize ToolRegistry in constructor:',
            error
          );
          // If initialization fails, it's important that this.initializationPromise is cleared
          // so that subsequent calls to initialize() or ensureInitialized() can retry.
          // The initialize() method itself handles setting this.initializationPromise to null on failure.
        });
      }
    }
  }

  /**
   * Initializes the tool registry by loading built-in, custom, and agentic tools.
   * It populates the `categorizedTools` map.
   * This method is idempotent and ensures that initialization occurs only once.
   *
   * @param traceId - Optional trace ID for observability.
   * @param userId - Optional user ID for observability.
   */
  async initialize(traceId?: string, userId?: string): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    let resolveInit: () => void;
    let rejectInit: (reason?: any) => void;
    this.initializationPromise = new Promise((resolve, reject) => {
      resolveInit = resolve;
      rejectInit = reject;
    });

    try {
      const { includeBuiltIn, includeCustom, includeAgentic } = this.options;
      // Cast the result of initializeTools to LoadedTools
      const loadedTools = (await initializeTools({
        includeBuiltIn,
        includeCustom,
        includeAgentic,
        traceId,
        userId,
      })) as LoadedTools;

      this.categorizedTools.clear();

      // Process built-in tools
      if (
        loadedTools.builtIn &&
        typeof loadedTools.builtIn === 'object' &&
        loadedTools.builtIn !== null
      ) {
        for (const [moduleName, toolsInModule] of Object.entries(
          loadedTools.builtIn
        )) {
          const category = moduleName
            .replace(/-tools$|Tools$/i, '')
            .toLowerCase();
          if (
            toolsInModule &&
            typeof toolsInModule === 'object' &&
            toolsInModule !== null
          ) {
            for (const [toolName, toolInstance] of Object.entries(
              toolsInModule
            )) {
              if (toolInstance) {
                this.categorizedTools.set(toolName, {
                  instance: toolInstance,
                  category,
                });
              }
            }
          }
        }
      }

      // Process custom tools (loaded from Supabase)
      if (
        loadedTools.custom &&
        typeof loadedTools.custom === 'object' &&
        loadedTools.custom !== null
      ) {
        for (const [toolName, customToolData] of Object.entries(
          loadedTools.custom
        )) {
          // Assuming initializeCustomTools now only returns enabled tools
          // and provides the instance and category directly.
          if (toolName && customToolData && customToolData.instance) {
            this.categorizedTools.set(toolName, {
              instance: customToolData.instance,
              category: customToolData.category?.toLowerCase() || 'custom',
            });
          }
        }
      }

      // Process agentic tools
      if (
        loadedTools.agentic &&
        typeof loadedTools.agentic === 'object' &&
        loadedTools.agentic !== null
      ) {
        for (const [toolName, toolInstance] of Object.entries(
          loadedTools.agentic
        )) {
          if (toolInstance) {
            this.categorizedTools.set(toolName, {
              instance: toolInstance,
              category: 'agentic',
            });
          }
        }
      }

      this.initialized = true;
      logEvent({
        traceId: 'ToolRegistry',
        name: 'Initialized',
        metadata: {
          toolCount: this.categorizedTools.size,
          categories: Array.from(
            new Set(
              Array.from(this.categorizedTools.values()).map(
                (ct) => ct.category
              )
            )
          ),
        },
      });
      resolveInit!();
    } catch (error) {
      console.error('Error initializing tool registry:', error);
      this.initialized = false;
      rejectInit!(error);
      // No need to set this.initializationPromise to null here, finally block handles it.
      throw error;
    } finally {
      // Whether success or failure, the current attempt is done. Clear the promise
      // to allow future calls to re-attempt if it failed, or to bypass if succeeded.
      this.initializationPromise = null;
    }
  }

  /**
   * Ensures the registry is initialized before performing operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      // If initializationPromise is already set, it means initialization is in progress or was triggered.
      // Awaiting it will ensure we don't try to initialize multiple times concurrently.
      if (this.initializationPromise) {
        await this.initializationPromise;
      } else {
        // If not initialized and no promise exists, it means initialization hasn't been attempted yet
        // or a previous attempt failed and cleared the promise. So, try to initialize.
        await this.initialize();
      }
    }
    // After attempting to initialize (either by awaiting an existing promise or calling initialize()),
    // check `initialized` flag again. If it's still false, initialization failed.
    if (!this.initialized) {
      throw new Error(
        'ToolRegistry failed to initialize or is still initializing.'
      );
    }
  }

  /**
   * Gets a specific tool by its name.
   *
   * @param name - The name of the tool.
   * @returns The tool instance, or undefined if not found.
   */
  async getTool(name: string): Promise<Tool<any, any> | undefined> {
    await this.ensureInitialized();
    return this.categorizedTools.get(name)?.instance;
  }

  /**
   * Gets all tools as a flat record of tool names to tool instances.
   *
   * @returns A record containing all registered tool instances.
   */
  async getAllTools(): Promise<Record<string, Tool<any, any>>> {
    await this.ensureInitialized();
    const allTools: Record<string, Tool<any, any>> = {};
    for (const [name, categorizedTool] of this.categorizedTools.entries()) {
      allTools[name] = categorizedTool.instance;
    }
    return allTools;
  }

  /**
   * Gets tools belonging to a specific category.
   *
   * @param category - The category of tools to retrieve (e.g., "web", "custom", "rag"). Case-insensitive.
   * @returns A record containing tool instances for the specified category.
   */
  async getToolsByCategory(
    category: string
  ): Promise<Record<string, Tool<any, any>>> {
    await this.ensureInitialized();
    const normalizedCategory = category.toLowerCase();
    const filteredTools: Record<string, Tool<any, any>> = {};
    for (const [name, categorizedTool] of this.categorizedTools.entries()) {
      if (categorizedTool.category.toLowerCase() === normalizedCategory) {
        filteredTools[name] = categorizedTool.instance;
      }
    }
    return filteredTools;
  }

  /**
   * Gets all tools, categorized into a map where keys are category names
   * and values are records of tool names to tool instances within that category.
   *
   * @returns A Map of categorized tools.
   */
  async getAllToolsCategorized(): Promise<
    Map<string, Record<string, Tool<any, any>>>
  > {
    await this.ensureInitialized();
    const result: Map<string, Record<string, Tool<any, any>>> = new Map();
    for (const [toolName, categorizedTool] of this.categorizedTools.entries()) {
      const categoryKey = categorizedTool.category;
      if (!result.has(categoryKey)) {
        result.set(categoryKey, {});
      }
      result.get(categoryKey)![toolName] = categorizedTool.instance;
    }
    return result;
  }

  /**
   * Gets a list of all unique available tool category names.
   *
   * @returns An array of unique category names (e.g., ["web", "custom", "rag"]).
   */
  async getAvailableCategories(): Promise<string[]> {
    await this.ensureInitialized();
    const categories = new Set<string>();
    for (const categorizedTool of this.categorizedTools.values()) {
      categories.add(categorizedTool.category);
    }
    return Array.from(categories);
  }
}

/**
 * Singleton instance of the ToolRegistry.
 * Use this instance for direct method access.
 */
export const toolRegistry = ToolRegistry.instance;

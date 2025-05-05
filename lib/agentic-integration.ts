import { type AgenticToolkit, createToolkit } from "@agentic/core"
import { createLangChainAdapter } from "@agentic/langchain"
import { createLlamaIndexAdapter } from "@agentic/llamaindex"
import { createGoogleAI } from "@ai-sdk/google"
import { createGoogleVertexAI } from "@ai-sdk/google-vertex"
import { createCalculatorTool } from "@agentic/calculator"
import { createGoogleCustomSearchTool } from "@agentic/google-custom-search"
import { createWikipediaTool } from "@agentic/wikipedia"

// Singleton instance
let toolkitInstance: AgenticToolkit | null = null

// Initialize the toolkit with all available tools
export async function initializeToolkit(config: {
  googleApiKey?: string
  googleVertexApiKey?: string
  openaiApiKey?: string
  anthropicApiKey?: string
  // Add other API keys as needed
}) {
  if (toolkitInstance) {
    return toolkitInstance
  }

  // Create AI providers
  const providers = {
    googleAI: config.googleApiKey ? createGoogleAI({ apiKey: config.googleApiKey }) : undefined,
    googleVertexAI: config.googleVertexApiKey ? createGoogleVertexAI({ apiKey: config.googleVertexApiKey }) : undefined,
    // Add other providers as needed
  }

  // Create adapters
  const langchainAdapter = createLangChainAdapter()
  const llamaindexAdapter = createLlamaIndexAdapter()

  // Initialize toolkit
  const toolkit = createToolkit({
    adapters: {
      langchain: langchainAdapter,
      llamaindex: llamaindexAdapter,
    },
  })

  // Register tools conditionally based on available API keys
  try {
    // Always available tools
    toolkit.registerTool("calculator", createCalculatorTool())
    toolkit.registerTool("wikipedia", createWikipediaTool())

    // Conditionally register tools based on available API keys
    if (config.googleApiKey) {
      toolkit.registerTool("google-search", createGoogleCustomSearchTool({ apiKey: config.googleApiKey }))
      // Add other Google tools
    }

    // Add more conditional tool registrations

    toolkitInstance = toolkit
    return toolkit
  } catch (error) {
    console.error("Error initializing agentic toolkit:", error)
    throw error
  }
}

// Get the toolkit instance
export function getToolkit() {
  if (!toolkitInstance) {
    throw new Error("Toolkit not initialized. Call initializeToolkit first.")
  }
  return toolkitInstance
}

// Execute a tool by name
export async function executeTool(toolName: string, params: any) {
  const toolkit = getToolkit()
  const tool = toolkit.getTool(toolName)

  if (!tool) {
    throw new Error(`Tool ${toolName} not found`)
  }

  return await tool.execute(params)
}

// Create an agent with specific tools
export async function createAgent(config: {
  model: string
  provider: string
  tools: string[]
  systemPrompt?: string
}) {
  const toolkit = getToolkit()

  // Get the specified tools
  const agentTools = config.tools.map((toolName) => {
    const tool = toolkit.getTool(toolName)
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`)
    }
    return tool
  })

  // Create and return the agent
  return toolkit.createAgent({
    model: config.model,
    provider: config.provider,
    tools: agentTools,
    systemPrompt: config.systemPrompt,
  })
}

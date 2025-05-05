import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { handleApiError } from "@/lib/api-error-handler"
import { getLibSQLClient } from "@/lib/memory/libsql"
import { generateGoogleAI } from "@/lib/google-ai"
import { z } from "zod"

// Tool execution log interface
interface ToolExecutionLog {
  id: string
  tool_id: string
  parameters: Record<string, any>
  result: Record<string, any> | string
  status: "success" | "error"
  error_message?: string
  execution_time: number
  created_at: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { toolId, parameters, agentId, threadId } = body

    if (!toolId) {
      return NextResponse.json({ error: "Tool ID is required" }, { status: 400 })
    }

    const startTime = Date.now()
    const executionId = crypto.randomUUID()

    const supabase = getSupabaseClient()

    // Get tool details
    const { data: tool, error: toolError } = await supabase.from("tools").select("*").eq("id", toolId).single()

    if (toolError || !tool) {
      console.error("Error fetching tool:", toolError)
      return NextResponse.json({ error: "Tool not found" }, { status: 404 })
    }

    // Validate parameters against schema
    try {
      const schema = JSON.parse(tool.parameters_schema)

      // Convert JSON schema to Zod schema
      const zodSchema = jsonSchemaToZod(schema)

      // Validate parameters
      zodSchema.parse(parameters)
    } catch (error) {
      console.error("Parameter validation error:", error)

      // Log execution failure
      await logToolExecution({
        id: executionId,
        tool_id: toolId,
        parameters,
        result: {},
        status: "error",
        error_message: error instanceof Error ? error.message : "Parameter validation failed",
        execution_time: Date.now() - startTime,
        created_at: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: error instanceof Error ? error.message : undefined,
        },
        { status: 400 },
      )
    }

    let result: any

    try {
      // Execute tool based on category and name
      switch (tool.category) {
        case "web":
          result = await executeWebTool(tool.name, parameters)
          break
        case "code":
          result = await executeCodeTool(tool.name, parameters)
          break
        case "data":
          result = await executeDataTool(tool.name, parameters)
          break
        case "ai":
          result = await executeAITool(tool.name, parameters)
          break
        case "custom":
          result = await executeCustomTool(tool, parameters)
          break
        default:
          throw new Error(`Unsupported tool category: ${tool.category}`)
      }

      // Log successful execution
      await logToolExecution({
        id: executionId,
        tool_id: toolId,
        parameters,
        result,
        status: "success",
        execution_time: Date.now() - startTime,
        created_at: new Date().toISOString(),
      })

      // If this execution is part of an agent run, log it to the thread
      if (agentId && threadId) {
        const db = getLibSQLClient()
        await db.execute({
          sql: `
            INSERT INTO tool_executions (id, thread_id, agent_id, tool_id, parameters, result, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `,
          args: [executionId, threadId, agentId, toolId, JSON.stringify(parameters), JSON.stringify(result)],
        })
      }

      return NextResponse.json({
        executionId,
        result,
        toolName: tool.name,
        executionTime: Date.now() - startTime,
      })
    } catch (error) {
      console.error(`Error executing tool ${tool.name}:`, error)

      // Log execution failure
      await logToolExecution({
        id: executionId,
        tool_id: toolId,
        parameters,
        result: {},
        status: "error",
        error_message: error instanceof Error ? error.message : "Tool execution failed",
        execution_time: Date.now() - startTime,
        created_at: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          error: "Tool execution failed",
          details: error instanceof Error ? error.message : undefined,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    return handleApiError(error)
  }
}

// Log tool execution to database
async function logToolExecution(log: ToolExecutionLog) {
  try {
    const supabase = getSupabaseClient()

    await supabase.from("tool_executions").insert({
      id: log.id,
      tool_id: log.tool_id,
      parameters: log.parameters,
      result: log.result,
      status: log.status,
      error_message: log.error_message,
      execution_time: log.execution_time,
      created_at: log.created_at,
    })
  } catch (error) {
    console.error("Failed to log tool execution:", error)
  }
}

// Tool execution implementations
async function executeWebTool(name: string, parameters: any) {
  switch (name.toLowerCase()) {
    case "websearch":
    case "web_search":
      return await executeWebSearch(parameters.query, parameters.numResults || 5)
    case "webextract":
    case "web_extract":
      return await executeWebExtract(parameters.url, parameters.selector)
    case "webscrape":
    case "web_scrape":
      return await executeWebScrape(parameters.url, parameters.selectors)
    default:
      throw new Error(`Unknown web tool: ${name}`)
  }
}

async function executeCodeTool(name: string, parameters: any) {
  switch (name.toLowerCase()) {
    case "codeexecute":
    case "code_execute":
      return await executeCodeExecution(parameters.code, parameters.language, parameters.timeout || 10)
    case "codeanalyze":
    case "code_analyze":
      return await executeCodeAnalysis(parameters.code, parameters.language, parameters.analysis || ["complexity"])
    default:
      throw new Error(`Unknown code tool: ${name}`)
  }
}

async function executeDataTool(name: string, parameters: any) {
  switch (name.toLowerCase()) {
    case "dataquery":
    case "data_query":
      return await executeDataQuery(parameters.query, parameters.datasource)
    case "datavisualize":
    case "data_visualize":
      return await executeDataVisualization(parameters.data, parameters.type, parameters.options)
    default:
      throw new Error(`Unknown data tool: ${name}`)
  }
}

async function executeAITool(name: string, parameters: any) {
  switch (name.toLowerCase()) {
    case "textgeneration":
    case "text_generation":
      return await executeTextGeneration(parameters.prompt, parameters.options)
    case "imagegeneration":
    case "image_generation":
      return await executeImageGeneration(parameters.prompt, parameters.options)
    default:
      throw new Error(`Unknown AI tool: ${name}`)
  }
}

async function executeCustomTool(tool: any, parameters: any) {
  if (!tool.implementation) {
    throw new Error("Custom tool has no implementation")
  }

  // SECURITY WARNING: This is just for demonstration
  // In production, you should use a secure sandboxed environment
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor

  try {
    const fn = new AsyncFunction("parameters", tool.implementation)
    return await fn(parameters)
  } catch (error) {
    console.error("Error executing custom tool:", error)
    throw error
  }
}

// Specific tool implementations
async function executeWebSearch(query: string, numResults = 5) {
  // In production, integrate with a real search API
  console.log(`Searching for: ${query}, results: ${numResults}`)

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return {
    query,
    results: Array.from({ length: numResults }, (_, i) => ({
      title: `Search result ${i + 1} for "${query}"`,
      snippet: `This is a snippet of information related to "${query}". It contains relevant details that might be useful.`,
      url: `https://example.com/result${i + 1}?q=${encodeURIComponent(query)}`,
    })),
    totalResults: numResults,
  }
}

async function executeWebExtract(url: string, selector?: string) {
  // In production, use a library like cheerio or puppeteer
  console.log(`Extracting content from: ${url}, selector: ${selector || "none"}`)

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return {
    title: "Example Page Title",
    content: selector ? `Content extracted using selector "${selector}"` : "Full page content would be extracted here",
    url,
  }
}

async function executeWebScrape(url: string, selectors: Record<string, string>) {
  // In production, use a library like cheerio or puppeteer
  console.log(`Scraping content from: ${url}`)
  console.log("Selectors:", selectors)

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const result: Record<string, string> = {}

  // Create mock results for each selector
  Object.entries(selectors).forEach(([key, selector]) => {
    result[key] = `Content for "${key}" using selector "${selector}"`
  })

  return {
    url,
    data: result,
  }
}

async function executeCodeExecution(code: string, language: string, timeout: number) {
  console.log(`Executing ${language} code with ${timeout}s timeout`)

  if (language === "javascript") {
    // SECURITY WARNING: This is just a demonstration
    // Never execute arbitrary code in a production environment without proper sandboxing

    // Create a safe execution context
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor

    // Set up a timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timed out after ${timeout} seconds`)), timeout * 1000)
    })

    // Capture console output
    const output: string[] = []
    const originalConsoleLog = console.log
    console.log = (...args) => {
      output.push(args.map((arg) => String(arg)).join(" "))
    }

    try {
      // Execute the code with timeout
      const execPromise = AsyncFunction(code)()
      const result = await Promise.race([execPromise, timeoutPromise])

      return {
        success: true,
        output: output.join("\n"),
        result: result !== undefined ? String(result) : undefined,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        output: output.join("\n"),
      }
    } finally {
      // Restore console.log
      console.log = originalConsoleLog
    }
  } else {
    return {
      success: false,
      error: `Execution of ${language} is not implemented in this demo`,
    }
  }
}

async function executeCodeAnalysis(code: string, language: string, analysis: string[]) {
  console.log(`Analyzing ${language} code for ${analysis.join(", ")}`)

  const results: Record<string, any> = {}

  if (analysis.includes("complexity")) {
    // Simple complexity metric: count lines and nesting level
    const lines = code.split("\n").length
    const nestingLevel = Math.max(
      ...code.split("\n").map((line) => {
        const indentation = line.search(/\S/)
        return indentation > 0 ? indentation / 2 : 0
      }),
    )

    results["complexity"] = {
      lines,
      nestingLevel,
      assessment: nestingLevel > 5 ? "High complexity" : "Acceptable complexity",
    }
  }

  if (analysis.includes("security")) {
    // Simple security check: look for eval, exec, etc.
    const dangerousPatterns: Record<string, string[]> = {
      javascript: ["eval(", "new Function(", "setTimeout(", "setInterval("],
      python: ["eval(", "exec(", "os.system(", "subprocess"],
    }

    const patterns = dangerousPatterns[language] || []
    const issues = patterns
      .map((pattern) => {
        const regex = new RegExp(pattern, "g")
        const matches = code.match(regex) || []
        return matches.length > 0 ? { pattern, count: matches.length } : null
      })
      .filter(Boolean)

    results["security"] = {
      issues,
      assessment: issues.length > 0 ? "Potential security issues found" : "No obvious security issues",
    }
  }

  return {
    language,
    analysisTypes: analysis,
    results,
  }
}

async function executeDataQuery(query: string, datasource: string) {
  // In production, integrate with actual databases
  console.log(`Executing query on datasource ${datasource}: ${query}`)

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return {
    columns: ["id", "name", "value"],
    rows: [
      { id: 1, name: "Item 1", value: 100 },
      { id: 2, name: "Item 2", value: 200 },
      { id: 3, name: "Item 3", value: 300 },
    ],
    rowCount: 3,
    executionTime: 0.05,
  }
}

async function executeDataVisualization(data: any, type: string, options: any = {}) {
  console.log(`Creating ${type} visualization with options:`, options)

  // In production, use a visualization library
  return {
    type,
    data,
    options,
    svgContent: `<svg width="200" height="100"><rect width="50" height="80" fill="blue" /><rect x="60" width="50" height="50" fill="red" /><rect x="120" width="50" height="30" fill="green" /></svg>`,
  }
}

async function executeTextGeneration(prompt: string, options: any = {}) {
  console.log(`Generating text for prompt: ${prompt}`)

  // Use Google AI for text generation
  const { text } = await generateGoogleAI({
    modelId: options.model || "gemini-pro",
    messages: [{ role: "user", content: prompt }],
    temperature: options.temperature || 0.7,
    maxTokens: options.maxTokens || 1000,
  })

  return {
    prompt,
    text,
    options,
  }
}

async function executeImageGeneration(prompt: string, options: any = {}) {
  console.log(`Generating image for prompt: ${prompt}`)

  // In production, integrate with an image generation API
  return {
    prompt,
    imageUrl: `https://placehold.co/600x400?text=${encodeURIComponent(prompt)}`,
    options,
  }
}

// Helper to convert JSON schema to Zod schema
function jsonSchemaToZod(schema: any): z.ZodTypeAny {
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

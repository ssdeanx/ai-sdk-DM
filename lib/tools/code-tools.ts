import { tool } from "ai"
import { z } from "zod"

// Code execution tool schema
export const codeExecuteSchema = z.object({
  code: z.string().describe("The code to execute"),
  language: z.enum(["javascript", "python", "shell"]).describe("The programming language"),
  timeout: z.number().int().min(1).max(30).default(10).describe("Execution timeout in seconds"),
})

// Code analysis tool schema
export const codeAnalyzeSchema = z.object({
  code: z.string().describe("The code to analyze"),
  language: z
    .enum(["javascript", "python", "typescript", "java", "c", "cpp", "csharp", "go", "ruby", "php"])
    .describe("The programming language"),
  analysis: z
    .array(z.enum(["complexity", "security", "style", "performance"]))
    .default(["complexity"])
    .describe("Types of analysis to perform"),
})

// Code execution implementation
async function codeExecute(params: z.infer<typeof codeExecuteSchema>) {
  const { code, language, timeout } = params

  try {
    console.log(`Executing ${language} code with ${timeout}s timeout`)

    // This is a placeholder implementation
    // In a real application, you would use a secure sandboxed environment

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
      const output = []
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
  } catch (error) {
    console.error("Error executing code:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Code analysis implementation
async function codeAnalyze(params: z.infer<typeof codeAnalyzeSchema>) {
  const { code, language, analysis } = params

  try {
    console.log(`Analyzing ${language} code for ${analysis.join(", ")}`)

    // This is a placeholder implementation
    // In a real application, you would use code analysis libraries

    const results = {}

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
      const dangerousPatterns = {
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
  } catch (error) {
    console.error("Error analyzing code:", error)
    return { error: error.message }
  }
}

// Export tools
export const tools = {
  CodeExecute: tool({
    description: "Execute code in a sandboxed environment",
    parameters: codeExecuteSchema,
    execute: codeExecute,
  }),

  CodeAnalyze: tool({
    description: "Analyze code for complexity, security issues, style, and performance",
    parameters: codeAnalyzeSchema,
    execute: codeAnalyze,
  }),
}

import { tool } from "ai"
import { z } from "zod"

// API request tool schema
export const apiRequestSchema = z.object({
  url: z.string().url().describe("The URL to send the request to"),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET").describe("HTTP method"),
  headers: z.record(z.string()).optional().describe("HTTP headers to include in the request"),
  body: z.string().optional().describe("Request body (for POST, PUT, PATCH)"),
  timeout: z.number().int().min(1000).max(30000).default(10000).describe("Request timeout in milliseconds"),
})

// API authentication tool schema
export const apiAuthSchema = z.object({
  type: z.enum(["basic", "bearer", "api-key"]).describe("Authentication type"),
  username: z.string().optional().describe("Username for Basic auth"),
  password: z.string().optional().describe("Password for Basic auth"),
  token: z.string().optional().describe("Token for Bearer auth"),
  apiKey: z.string().optional().describe("API key value"),
  apiKeyName: z.string().optional().describe("API key header or query parameter name"),
  apiKeyIn: z.enum(["header", "query"]).optional().describe("Where to include the API key"),
})

// API request implementation
async function apiRequest(params: z.infer<typeof apiRequestSchema>) {
  const { url, method, headers = {}, body, timeout } = params

  try {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Prepare request options
    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    }

    // Add body for non-GET requests
    if (method !== "GET" && body) {
      options.body = body
    }

    // Make the request
    const response = await fetch(url, options)
    clearTimeout(timeoutId)

    // Get response data
    let responseData: any
    const contentType = response.headers.get("content-type")
    if (contentType?.includes("application/json")) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
    }
  } catch (error) {
    console.error("Error making API request:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// API authentication implementation
async function apiAuth(params: z.infer<typeof apiAuthSchema>) {
  const { type, username, password, token, apiKey, apiKeyName, apiKeyIn } = params

  try {
    switch (type) {
      case "basic":
        if (!username || !password) {
          throw new Error("Username and password are required for Basic authentication")
        }
        return {
          success: true,
          type: "basic",
          headers: {
            Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
          },
        }

      case "bearer":
        if (!token) {
          throw new Error("Token is required for Bearer authentication")
        }
        return {
          success: true,
          type: "bearer",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }

      case "api-key":
        if (!apiKey || !apiKeyName) {
          throw new Error("API key and key name are required for API key authentication")
        }

        if (apiKeyIn === "header") {
          return {
            success: true,
            type: "api-key",
            headers: {
              [apiKeyName]: apiKey,
            },
          }
        } else if (apiKeyIn === "query") {
          return {
            success: true,
            type: "api-key",
            queryParams: {
              [apiKeyName]: apiKey,
            },
          }
        } else {
          throw new Error("API key location (apiKeyIn) must be 'header' or 'query'")
        }

      default:
        throw new Error(`Unsupported authentication type: ${type}`)
    }
  } catch (error) {
    console.error("Error creating API authentication:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Export tools
export const tools = {
  ApiRequest: tool({
    description: "Make HTTP requests to APIs",
    parameters: apiRequestSchema,
    execute: apiRequest,
  }),

  ApiAuth: tool({
    description: "Generate authentication headers for API requests",
    parameters: apiAuthSchema,
    execute: apiAuth,
  }),
}
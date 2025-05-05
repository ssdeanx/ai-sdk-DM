export interface Tool {
  id: string
  name: string
  description: string
  parameters_schema: string
  created_at: string
  updated_at: string
}

export const mockTools: Tool[] = [
  {
    id: "1",
    name: "Web Search",
    description: "Search the web for real-time information",
    parameters_schema: JSON.stringify({
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
      },
      required: ["query"],
    }),
    created_at: "2023-12-01T00:00:00.000Z",
    updated_at: "2023-12-01T00:00:00.000Z",
  },
  {
    id: "2",
    name: "Calculator",
    description: "Perform mathematical calculations",
    parameters_schema: JSON.stringify({
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "The mathematical expression to evaluate",
        },
      },
      required: ["expression"],
    }),
    created_at: "2023-12-01T00:00:00.000Z",
    updated_at: "2023-12-01T00:00:00.000Z",
  },
  {
    id: "3",
    name: "Weather",
    description: "Get current weather information for a location",
    parameters_schema: JSON.stringify({
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The location to get weather for",
        },
        units: {
          type: "string",
          enum: ["metric", "imperial"],
          description: "The units to use",
        },
      },
      required: ["location"],
    }),
    created_at: "2023-12-01T00:00:00.000Z",
    updated_at: "2023-12-01T00:00:00.000Z",
  },
]

import { createVertex } from "@ai-sdk/google-vertex"
import { streamText, generateText } from "ai"
import { getSupabaseClient } from "./memory/supabase"

// Initialize Google Vertex AI provider
export function getGoogleVertex(project?: string, location?: string) {
  const effectiveProject = project || process.env.GOOGLE_VERTEX_PROJECT_ID
  const effectiveLocation = location || process.env.GOOGLE_VERTEX_LOCATION || "us-central1"
  
  if (!effectiveProject) {
    throw new Error("Project ID is required for Google Vertex AI")
  }
  
  return createVertex({
    project: effectiveProject,
    location: effectiveLocation
  })
}

// Get model configuration from Supabase
export async function getModelConfig(modelId: string) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.from("models").select("*").eq("id", modelId).single()

  if (error) {
    console.error("Error fetching model config:", error)
    throw error
  }

  return data
}

// Stream text with Google Vertex AI
export async function streamGoogleVertex({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  project,
  location,
}: {
  modelId: string
  messages: any[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>
  project?: string
  location?: string
}) {
  try {
    // Get model configuration if not provided
    let modelConfig

    if (!modelId.includes("gemini")) {
      modelConfig = await getModelConfig(modelId)
      if (!modelConfig) {
        throw new Error(`Model configuration not found for ID: ${modelId}`)
      }
    } else {
      modelConfig = {
        model_id: modelId,
        provider: "google-vertex",
      }
    }

    // Initialize Google Vertex AI
    const vertexAI = getGoogleVertex(project, location)
    const model = vertexAI(modelConfig.model_id)

    // Stream the response
    const result = streamText({
      model,
      messages,
      temperature,
      maxTokens,
      ...(Object.keys(tools).length > 0 ? { tools } : {}),
    })

    return result
  } catch (error) {
    console.error("Error streaming Google Vertex AI response:", error)
    throw error
  }
}

// Generate text with Google Vertex AI (non-streaming)
export async function generateGoogleVertex({
  modelId,
  messages,
  temperature = 0.7,
  maxTokens,
  tools = {},
  project,
  location,
}: {
  modelId: string
  messages: any[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>
  project?: string
  location?: string
}) {
  try {
    // Get model configuration if not provided
    let modelConfig

    if (!modelId.includes("gemini")) {
      modelConfig = await getModelConfig(modelId)
      if (!modelConfig) {
        throw new Error(`Model configuration not found for ID: ${modelId}`)
      }
    } else {
      modelConfig = {
        model_id: modelId,
        provider: "google-vertex",
      }
    }

    // Initialize Google Vertex AI
    const vertexAI = getGoogleVertex(project, location)
    const model = vertexAI(modelConfig.model_id)

    // Generate the response
    const result = await generateText({
      model,
      messages,
      temperature,
      maxTokens,
      ...(Object.keys(tools).length > 0 ? { tools } : {}),
    })

    return result
  } catch (error) {
    console.error("Error generating Google Vertex AI response:", error)
    throw error
  }
}

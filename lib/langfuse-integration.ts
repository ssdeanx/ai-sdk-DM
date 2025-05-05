import { Langfuse } from "langfuse"

// Initialize Langfuse client
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY as string,
  secretKey: process.env.LANGFUSE_SECRET_KEY as string,
  baseUrl: process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
})

// Create a trace
export async function createTrace({ name, userId, metadata }: { name: string; userId?: string; metadata?: any }) {
  try {
    const trace = langfuse.trace({
      name,
      userId,
      metadata,
    })
    return trace
  } catch (error) {
    console.error("Langfuse trace creation error:", error)
    // Don't throw - we don't want to break the application if tracing fails
    return null
  }
}

// Create a generation
export async function createGeneration({
  traceId,
  name,
  model,
  modelParameters,
  input,
  output,
  startTime,
  endTime,
  metadata,
}: {
  traceId: string
  name: string
  model: string
  modelParameters?: any
  input: any // Use 'any' or a more specific type like CoreMessage[] | string
  output: any // Use 'any' or a more specific type like string
  startTime: Date
  endTime: Date
  metadata?: any
}) {
  try {
    const generation = langfuse.generation({
      traceId,
      name,
      model,
      modelParameters,
      input,
      output,
      startTime,
      endTime,
      metadata,
    })
    return generation
  } catch (error) {
    console.error("Langfuse generation creation error:", error)
    // Don't throw - we don't want to break the application if tracing fails
    return null
  }
}

// Create a span
export async function createSpan({
  traceId,
  name,
  startTime,
  endTime,
  metadata,
}: {
  traceId: string
  name: string
  startTime: Date
  endTime: Date
  metadata?: any
}) {
  try {
    const span = langfuse.span({
      traceId,
      name,
      startTime,
      endTime,
      metadata,
    })
    return span
  } catch (error) {
    console.error("Langfuse span creation error:", error)
    // Don't throw - we don't want to break the application if tracing fails
    return null
  }
}

// Log an event
export async function logEvent({
  traceId,
  name,
  metadata,
}: {
  traceId: string
  name: string
  metadata?: any
}) {
  try {
    const event = langfuse.event({
      traceId,
      name,
      metadata,
    })
    return event
  } catch (error) {
    console.error("Langfuse event creation error:", error)
    // Don't throw - we don't want to break the application if tracing fails
    return null
  }
}

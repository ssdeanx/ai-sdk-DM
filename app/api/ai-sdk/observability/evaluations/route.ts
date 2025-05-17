import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { createTrace, logEvent } from "@/lib/langfuse-integration"

/**
 * API route for fetching model evaluation data for observability dashboard
 * Provides evaluation metrics for different AI models
 */
export async function GET(request: Request) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const timeRange = searchParams.get('timeRange') || '24h'
    const modelId = searchParams.get('modelId')
    
    // Create a trace for this API call
    const trace = await createTrace({
      name: "observability_evaluations_api",
      metadata: {
        limit,
        timeRange,
        modelId,
        timestamp: new Date().toISOString()
      }
    })
    
    // Log API call event
    if (trace?.id) {
      await logEvent({
        traceId: trace.id,
        name: "api_call",
        metadata: {
          endpoint: "/api/observability/evaluations",
          method: "GET",
          params: { limit, timeRange, modelId },
          timestamp: new Date().toISOString()
        }
      })
    }
    
    // Get Supabase client
    const supabase = getSupabaseClient()
    
    // Convert time range to milliseconds
    const timeRangeMap: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }
    
    const timeInMs = timeRangeMap[timeRange] || timeRangeMap['24h']
    const startTime = new Date(Date.now() - timeInMs).toISOString()
    
    // If modelId is provided, get specific model evaluation
    if (modelId) {
      try {
        // Try to connect to Supabase and get real data
        const { data: evaluation, error } = await supabase
          .from('model_evaluations')
          .select('*, metrics(*), examples(*)')
          .eq('modelId', modelId)
          .single()
        
        if (error) {
          console.warn("Falling back to mock data due to Supabase error:", error)
          return getMockModelEvaluation(modelId)
        }
        
        if (evaluation) {
          return NextResponse.json({
            evaluation,
            isMockData: false
          })
        }
        
        // If no evaluation found, return mock data
        return getMockModelEvaluation(modelId)
      } catch (error) {
        console.warn("Error connecting to Supabase:", error)
        return getMockModelEvaluation(modelId)
      }
    }
    
    // Otherwise, get list of model evaluations
    try {
      // Try to get real evaluations from Supabase
      const { data: evaluations, error } = await supabase
        .from('model_evaluations')
        .select('*')
        .gte('evaluationDate', startTime)
        .order('evaluationDate', { ascending: false })
        .limit(limit)
      
      if (error) {
        console.warn("Falling back to mock evaluations due to Supabase error:", error)
        return getMockModelEvaluations()
      }
      
      if (evaluations && evaluations.length > 0) {
        return NextResponse.json({
          evaluations,
          isMockData: false
        })
      }
      
      // If no evaluations found, return mock data
      return getMockModelEvaluations()
    } catch (error) {
      console.warn("Error connecting to Supabase:", error)
      return getMockModelEvaluations()
    }
  } catch (error) {
    console.error("Error in observability evaluations API:", error)
    
    // Return error response
    return NextResponse.json({
      error: "Failed to fetch evaluations",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * Generate a mock model evaluation for a specific model ID
 */
function getMockModelEvaluation(modelId: string) {
  const mockModels = {
    "gemini-1.5-pro": { provider: "google", displayName: "Gemini 1.5 Pro", version: "2024-06-01" },
    "gpt-4o": { provider: "openai", displayName: "GPT-4o", version: "2024-05-15" },
    "claude-3-opus": { provider: "anthropic", displayName: "Claude 3 Opus", version: "2024-04-20" },
    "gemini-1.5-flash": { provider: "google", displayName: "Gemini 1.5 Flash", version: "2024-06-01" },
    "gpt-4-turbo": { provider: "openai", displayName: "GPT-4 Turbo", version: "2024-03-10" }
  }
  
  const model = mockModels[modelId as keyof typeof mockModels] || { 
    provider: "unknown", 
    displayName: modelId, 
    version: "unknown" 
  }
  
  const metricNames = [
    { name: "accuracy", description: "Correctness of responses" },
    { name: "relevance", description: "Relevance to the query" },
    { name: "coherence", description: "Logical flow and consistency" },
    { name: "conciseness", description: "Brevity and clarity" },
    { name: "harmlessness", description: "Avoidance of harmful content" }
  ]
  
  // Generate random metrics
  const metrics = metricNames.map(metric => ({
    name: metric.name,
    description: metric.description,
    value: Math.random() * 0.4 + 0.6, // Between 0.6 and 1.0
    threshold: 0.7,
    weight: 1.0 / metricNames.length
  }))
  
  // Calculate overall score
  const overallScore = metrics.reduce((sum, metric) => sum + (metric.value * metric.weight), 0)
  
  // Generate example evaluations
  const examples = Array.from({ length: 5 }, (_, i) => {
    const exampleScores: Record<string, number> = {}
    metricNames.forEach(metric => {
      exampleScores[metric.name] = Math.random() * 0.4 + 0.6 // Between 0.6 and 1.0
    })
    
    return {
      id: `example-${i + 1}`,
      input: `Example query ${i + 1} for testing the model's capabilities.`,
      expectedOutput: `Expected response for example ${i + 1} that demonstrates ideal behavior.`,
      actualOutput: `Actual model response for example ${i + 1} that may or may not match expectations.`,
      scores: exampleScores
    }
  })
  
  return NextResponse.json({
    evaluation: {
      modelId,
      provider: model.provider,
      displayName: model.displayName,
      version: model.version,
      evaluationDate: new Date().toISOString(),
      datasetName: "Evaluation Dataset v1.0",
      datasetSize: 100,
      metrics,
      overallScore,
      previousScore: overallScore - (Math.random() * 0.1 - 0.05), // Slight variation from current
      examples
    },
    isMockData: true
  })
}

/**
 * Generate a list of mock model evaluations
 */
function getMockModelEvaluations() {
  const mockModels = [
    { modelId: "gemini-1.5-pro", provider: "google", displayName: "Gemini 1.5 Pro", version: "2024-06-01" },
    { modelId: "gpt-4o", provider: "openai", displayName: "GPT-4o", version: "2024-05-15" },
    { modelId: "claude-3-opus", provider: "anthropic", displayName: "Claude 3 Opus", version: "2024-04-20" },
    { modelId: "gemini-1.5-flash", provider: "google", displayName: "Gemini 1.5 Flash", version: "2024-06-01" },
    { modelId: "gpt-4-turbo", provider: "openai", displayName: "GPT-4 Turbo", version: "2024-03-10" }
  ]
  
  const metricNames = [
    { name: "accuracy", description: "Correctness of responses" },
    { name: "relevance", description: "Relevance to the query" },
    { name: "coherence", description: "Logical flow and consistency" },
    { name: "conciseness", description: "Brevity and clarity" },
    { name: "harmlessness", description: "Avoidance of harmful content" }
  ]
  
  const evaluations = mockModels.map(model => {
    // Generate random metrics
    const metrics = metricNames.map(metric => ({
      name: metric.name,
      description: metric.description,
      value: Math.random() * 0.4 + 0.6, // Between 0.6 and 1.0
      threshold: 0.7,
      weight: 1.0 / metricNames.length
    }))
    
    // Calculate overall score
    const overallScore = metrics.reduce((sum, metric) => sum + (metric.value * metric.weight), 0)
    
    // Generate example evaluations
    const examples = Array.from({ length: 5 }, (_, i) => {
      const exampleScores: Record<string, number> = {}
      metricNames.forEach(metric => {
        exampleScores[metric.name] = Math.random() * 0.4 + 0.6 // Between 0.6 and 1.0
      })
      
      return {
        id: `example-${i + 1}`,
        input: `Example query ${i + 1} for testing the model's capabilities.`,
        expectedOutput: `Expected response for example ${i + 1} that demonstrates ideal behavior.`,
        actualOutput: `Actual model response for example ${i + 1} that may or may not match expectations.`,
        scores: exampleScores
      }
    })
    
    return {
      ...model,
      evaluationDate: new Date().toISOString(),
      datasetName: "Evaluation Dataset v1.0",
      datasetSize: 100,
      metrics,
      overallScore,
      previousScore: overallScore - (Math.random() * 0.1 - 0.05), // Slight variation from current
      examples
    }
  })
  
  return NextResponse.json({
    evaluations,
    isMockData: true
  })
}

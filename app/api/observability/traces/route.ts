import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { createTrace, logEvent } from "@/lib/langfuse-integration"

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const timeRange = searchParams.get('timeRange') || '24h'
    const traceId = searchParams.get('traceId')
    
    // Create a trace for this API call
    const trace = await createTrace({
      name: "observability_traces_api",
      metadata: {
        limit,
        timeRange,
        traceId,
        timestamp: new Date().toISOString()
      }
    })
    
    // Log API call event
    if (trace?.id) {
      await logEvent({
        traceId: trace.id,
        name: "api_call",
        metadata: {
          endpoint: "/api/observability/traces",
          method: "GET",
          params: { limit, timeRange, traceId },
          timestamp: new Date().toISOString()
        }
      })
    }
    
    // Get Supabase client
    const supabase = getSupabaseClient()
    
    // Convert time range to milliseconds
    let timeInMs = 24 * 60 * 60 * 1000 // Default: 24 hours
    if (timeRange === '1h') timeInMs = 60 * 60 * 1000
    if (timeRange === '6h') timeInMs = 6 * 60 * 60 * 1000
    if (timeRange === '7d') timeInMs = 7 * 24 * 60 * 60 * 1000
    if (timeRange === '30d') timeInMs = 30 * 24 * 60 * 60 * 1000
    
    const startTime = new Date(Date.now() - timeInMs).toISOString()
    
    // If traceId is provided, get specific trace details
    if (traceId) {
      // In a real application, you would query your Supabase database
      // Here we're simulating the response for demonstration purposes
      
      // Check if we can connect to Supabase
      const { error: connectionError } = await supabase
        .from('traces')
        .select('count')
        .limit(1)
        .single()
      
      if (connectionError) {
        console.error("Error connecting to Supabase:", connectionError)
        
        // Return mock data if we can't connect to Supabase
        return NextResponse.json({
          trace: {
            id: traceId,
            name: "example_trace",
            startTime: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            endTime: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
            duration: 60000, // 1 minute in milliseconds
            status: "success",
            userId: "user-1",
            metadata: {
              modelId: "gemini-1.5-pro",
              provider: "google",
              temperature: 0.7,
              maxTokens: 8192,
              hasTools: true,
              messageCount: 5
            },
            spans: [
              {
                id: "span-1",
                name: "model_initialization",
                startTime: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                endTime: new Date(Date.now() - 1000 * 60 * 4.9).toISOString(),
                duration: 6000,
                status: "success",
                metadata: { provider: "google" }
              },
              {
                id: "span-2",
                name: "prompt_construction",
                startTime: new Date(Date.now() - 1000 * 60 * 4.9).toISOString(),
                endTime: new Date(Date.now() - 1000 * 60 * 4.8).toISOString(),
                duration: 6000,
                status: "success",
                metadata: { tokenCount: 1024 }
              },
              {
                id: "span-3",
                name: "model_inference",
                startTime: new Date(Date.now() - 1000 * 60 * 4.8).toISOString(),
                endTime: new Date(Date.now() - 1000 * 60 * 4.3).toISOString(),
                duration: 30000,
                status: "success",
                metadata: { outputTokens: 512 }
              },
              {
                id: "span-4",
                name: "tool_execution",
                startTime: new Date(Date.now() - 1000 * 60 * 4.3).toISOString(),
                endTime: new Date(Date.now() - 1000 * 60 * 4.1).toISOString(),
                duration: 12000,
                status: "success",
                metadata: { tool: "web_search" }
              },
              {
                id: "span-5",
                name: "response_processing",
                startTime: new Date(Date.now() - 1000 * 60 * 4.1).toISOString(),
                endTime: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
                duration: 6000,
                status: "success",
                metadata: { format: "markdown" }
              }
            ],
            events: [
              {
                id: "event-1",
                name: "trace_started",
                timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                metadata: { initiator: "user" }
              },
              {
                id: "event-2",
                name: "model_loaded",
                timestamp: new Date(Date.now() - 1000 * 60 * 4.9).toISOString(),
                metadata: { model: "gemini-1.5-pro" }
              },
              {
                id: "event-3",
                name: "tool_called",
                timestamp: new Date(Date.now() - 1000 * 60 * 4.3).toISOString(),
                metadata: { tool: "web_search", query: "latest AI research" }
              },
              {
                id: "event-4",
                name: "trace_completed",
                timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
                metadata: { status: "success" }
              }
            ]
          },
          isMockData: true
        })
      }
      
      // If we can connect, get real trace data from the database
      // This would be your actual implementation
      const { data: trace, error } = await supabase
        .from('traces')
        .select('*, spans(*), events(*)')
        .eq('id', traceId)
        .single()
      
      if (error) {
        console.error("Error fetching trace data:", error)
        throw error
      }
      
      return NextResponse.json({
        trace: trace || null,
        isMockData: false
      })
    }
    
    // Otherwise, get list of traces
    // Check if we can connect to Supabase
    const { error: connectionError } = await supabase
      .from('traces')
      .select('count')
      .limit(1)
      .single()
    
    if (connectionError) {
      console.error("Error connecting to Supabase:", connectionError)
      
      // Return mock data if we can't connect to Supabase
      return NextResponse.json({
        traces: Array.from({ length: 20 }, (_, i) => ({
          id: `trace-${i + 1}`,
          name: ["chat_completion", "tool_execution", "model_inference", "data_processing"][Math.floor(Math.random() * 4)],
          startTime: new Date(Date.now() - Math.random() * timeInMs).toISOString(),
          endTime: new Date(Date.now() - Math.random() * timeInMs / 2).toISOString(),
          duration: Math.floor(Math.random() * 60000) + 1000,
          status: Math.random() > 0.1 ? "success" : "error",
          userId: `user-${Math.floor(Math.random() * 5) + 1}`,
          metadata: {
            modelId: ["gemini-1.5-pro", "gpt-4o", "claude-3-opus"][Math.floor(Math.random() * 3)],
            provider: ["google", "openai", "anthropic"][Math.floor(Math.random() * 3)],
            temperature: Math.random().toFixed(1),
            maxTokens: [4096, 8192, 16384][Math.floor(Math.random() * 3)],
            hasTools: Math.random() > 0.5,
            messageCount: Math.floor(Math.random() * 10) + 1
          }
        })),
        isMockData: true
      })
    }
    
    // If we can connect, get real traces from the database
    const { data: traces, error } = await supabase
      .from('traces')
      .select('*')
      .gte('startTime', startTime)
      .order('startTime', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error("Error fetching traces:", error)
      throw error
    }
    
    return NextResponse.json({
      traces: traces || [],
      isMockData: false
    })
    
  } catch (error) {
    console.error("Error in observability traces API:", error)
    
    // Return error response
    return NextResponse.json({
      error: "Failed to fetch traces",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

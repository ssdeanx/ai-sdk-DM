import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';
import { createTrace, logEvent } from '@/lib/langfuse-integration';

/**
 * API route for fetching trace data for observability dashboard
 * Supports fetching a list of traces or a single trace by ID
 */
export async function GET(request: Request) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const timeRange = searchParams.get('timeRange') || '24h';
    const traceId = searchParams.get('traceId');

    // Create a trace for this API call for meta-observability
    const trace = await createTrace({
      name: 'observability_traces_api',
      metadata: {
        limit,
        timeRange,
        traceId,
        timestamp: new Date().toISOString(),
      },
    });

    // Log API call event
    if (trace?.id) {
      await logEvent({
        traceId: trace.id,
        name: 'api_call',
        metadata: {
          endpoint: '/api/observability/traces',
          method: 'GET',
          params: { limit, timeRange, traceId },
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Get Supabase client
    const supabase = getSupabaseClient();

    // Convert time range to milliseconds
    const timeRangeMap: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const timeInMs = timeRangeMap[timeRange] || timeRangeMap['24h'];
    const startTime = new Date(Date.now() - timeInMs).toISOString();

    // If traceId is provided, get specific trace details
    if (traceId) {
      try {
        // Try to connect to Supabase and get real data
        const { data: trace, error } = await supabase
          .from('traces')
          .select('*, spans(*), events(*)')
          .eq('id', traceId)
          .single();

        if (error) {
          console.warn(
            'Falling back to mock data due to Supabase error:',
            error
          );
          return getDetailedMockTrace(traceId);
        }

        if (trace) {
          return NextResponse.json({
            trace,
            isMockData: false,
          });
        }

        // If no trace found, return mock data
        return getDetailedMockTrace(traceId);
      } catch (error) {
        console.warn('Error connecting to Supabase:', error);
        return getDetailedMockTrace(traceId);
      }
    }

    // Otherwise, get list of traces
    try {
      // Try to get real traces from Supabase
      const { data: traces, error } = await supabase
        .from('traces')
        .select('*')
        .gte('startTime', startTime)
        .order('startTime', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn(
          'Falling back to mock trace list due to Supabase error:',
          error
        );
        return getMockTraceList(timeInMs);
      }

      if (traces && traces.length > 0) {
        return NextResponse.json({
          traces,
          isMockData: false,
        });
      }

      // If no traces found, return mock data
      return getMockTraceList(timeInMs);
    } catch (error) {
      console.warn('Error connecting to Supabase:', error);
      return getMockTraceList(timeInMs);
    }
  } catch (error) {
    console.error('Error in observability traces API:', error);

    // Return error response
    return NextResponse.json(
      {
        error: 'Failed to fetch traces',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a detailed mock trace for a specific trace ID
 */
function getDetailedMockTrace(traceId: string) {
  const now = Date.now();
  const startTime = now - 1000 * 60 * 5; // 5 minutes ago
  const endTime = now - 1000 * 60 * 4; // 4 minutes ago

  // Generate model ID and provider
  const providers = ['google', 'openai', 'anthropic'];
  const models = {
    google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
    openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  };

  const provider = providers[Math.floor(Math.random() * providers.length)];
  const modelId =
    models[provider as keyof typeof models][Math.floor(Math.random() * 3)];

  // Generate spans with realistic timing
  const spanCount = Math.floor(Math.random() * 3) + 3; // 3-5 spans
  const spanDuration = (endTime - startTime) / spanCount;

  const spans = [];
  let currentTime = startTime;

  const spanTypes = [
    'model_initialization',
    'prompt_construction',
    'model_inference',
    'tool_execution',
    'response_processing',
    'token_counting',
    'embedding_generation',
    'context_retrieval',
  ];

  for (let i = 0; i < spanCount; i++) {
    const spanType = spanTypes[Math.floor(Math.random() * spanTypes.length)];
    const spanStartTime = currentTime;
    const thisSpanDuration = Math.floor(spanDuration * (0.5 + Math.random()));
    currentTime += thisSpanDuration;

    spans.push({
      id: `span-${i + 1}`,
      name: spanType,
      startTime: new Date(spanStartTime).toISOString(),
      endTime: new Date(currentTime).toISOString(),
      duration: thisSpanDuration,
      status: Math.random() > 0.9 ? 'error' : 'success',
      metadata: getSpanMetadata(spanType, provider, modelId),
    });
  }

  // Generate events
  const events = [
    {
      id: 'event-1',
      name: 'trace_started',
      timestamp: new Date(startTime).toISOString(),
      metadata: { initiator: 'user' },
    },
    {
      id: 'event-2',
      name: 'model_loaded',
      timestamp: new Date(startTime + 100).toISOString(),
      metadata: { model: modelId, provider },
    },
  ];

  // Add tool events if applicable
  if (Math.random() > 0.5) {
    const tools = [
      'web_search',
      'code_execution',
      'data_analysis',
      'image_generation',
    ];
    const tool = tools[Math.floor(Math.random() * tools.length)];

    events.push({
      id: 'event-3',
      name: 'tool_called',
      timestamp: new Date(
        startTime + (endTime - startTime) * 0.6
      ).toISOString(),
      metadata: { tool, params: JSON.stringify({ query: 'sample query' }) },
    });

    events.push({
      id: 'event-4',
      name: 'tool_completed',
      timestamp: new Date(
        startTime + (endTime - startTime) * 0.7
      ).toISOString(),
      metadata: { tool, status: 'success' },
    });
  }

  // Add completion event
  events.push({
    id: `event-${events.length + 1}`,
    name: 'trace_completed',
    timestamp: new Date(endTime).toISOString(),
    metadata: { status: 'success' },
  });

  return NextResponse.json({
    trace: {
      id: traceId,
      name: [
        'chat_completion',
        'tool_execution',
        'model_inference',
        'data_processing',
      ][Math.floor(Math.random() * 4)],
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: endTime - startTime,
      status: Math.random() > 0.1 ? 'success' : 'error',
      userId: `user-${Math.floor(Math.random() * 5) + 1}`,
      metadata: {
        modelId,
        provider,
        temperature: (Math.random() * 0.8 + 0.2).toFixed(1),
        maxTokens: [4096, 8192, 16384][Math.floor(Math.random() * 3)],
        hasTools: Math.random() > 0.5,
        messageCount: Math.floor(Math.random() * 10) + 1,
        inputTokens: Math.floor(Math.random() * 1000) + 100,
        outputTokens: Math.floor(Math.random() * 500) + 50,
      },
      spans,
      events,
    },
    isMockData: true,
  });
}

/**
 * Generate metadata for a specific span type
 */
function getSpanMetadata(spanType: string, provider: string, modelId: string) {
  switch (spanType) {
    case 'model_initialization':
      return { provider, modelId, cacheHit: Math.random() > 0.7 };
    case 'prompt_construction':
      return {
        tokenCount: Math.floor(Math.random() * 1000) + 100,
        promptTemplate: 'chat',
      };
    case 'model_inference':
      return {
        outputTokens: Math.floor(Math.random() * 500) + 50,
        tokensPerSecond: Math.floor(Math.random() * 20) + 10,
      };
    case 'tool_execution':
      const tools = [
        'web_search',
        'code_execution',
        'data_analysis',
        'image_generation',
      ];
      return { tool: tools[Math.floor(Math.random() * tools.length)] };
    case 'response_processing':
      return {
        format: ['markdown', 'json', 'text'][Math.floor(Math.random() * 3)],
      };
    case 'token_counting':
      return {
        inputTokens: Math.floor(Math.random() * 1000) + 100,
        outputTokens: Math.floor(Math.random() * 500) + 50,
        totalTokens: Math.floor(Math.random() * 1500) + 150,
      };
    case 'embedding_generation':
      return {
        model: `${provider}-embedding`,
        dimensions: [768, 1024, 1536][Math.floor(Math.random() * 3)],
        chunks: Math.floor(Math.random() * 5) + 1,
      };
    case 'context_retrieval':
      return {
        vectorDb: ['pinecone', 'qdrant', 'supabase'][
          Math.floor(Math.random() * 3)
        ],
        matches: Math.floor(Math.random() * 5) + 1,
        threshold: (Math.random() * 0.3 + 0.7).toFixed(2),
      };
    default:
      return { spanType };
  }
}

/**
 * Generate a list of mock traces
 */
function getMockTraceList(timeInMs: number) {
  const traceCount = Math.floor(Math.random() * 15) + 15; // 15-30 traces

  const traces = Array.from({ length: traceCount }, (_, i) => {
    const startTime = Date.now() - Math.random() * timeInMs;
    const duration = Math.floor(Math.random() * 60000) + 1000; // 1-61 seconds
    const endTime = startTime + duration;

    const providers = ['google', 'openai', 'anthropic'];
    const models = {
      google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
      openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    };

    const provider = providers[Math.floor(Math.random() * providers.length)];
    const modelId =
      models[provider as keyof typeof models][Math.floor(Math.random() * 3)];

    return {
      id: `trace-${i + 1}`,
      name: [
        'chat_completion',
        'tool_execution',
        'model_inference',
        'data_processing',
      ][Math.floor(Math.random() * 4)],
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration,
      status: Math.random() > 0.1 ? 'success' : 'error',
      userId: `user-${Math.floor(Math.random() * 5) + 1}`,
      metadata: {
        modelId,
        provider,
        temperature: (Math.random() * 0.8 + 0.2).toFixed(1),
        maxTokens: [4096, 8192, 16384][Math.floor(Math.random() * 3)],
        hasTools: Math.random() > 0.5,
        messageCount: Math.floor(Math.random() * 10) + 1,
        inputTokens: Math.floor(Math.random() * 1000) + 100,
        outputTokens: Math.floor(Math.random() * 500) + 50,
      },
    };
  });

  return NextResponse.json({
    traces,
    isMockData: true,
  });
}

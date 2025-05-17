import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';
import { createTrace, logEvent } from '@/lib/langfuse-integration';

/**
 * API route for fetching model performance data for observability dashboard
 * Provides performance metrics for different AI models like latency, tokens per second, etc.
 */

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const modelId = searchParams.get('modelId');

    // Create a trace for this API call
    const trace = await createTrace({
      name: 'observability_performance_api',
      metadata: {
        timeRange,
        modelId,
        timestamp: new Date().toISOString(),
      },
    });

    // Log API call event
    if (trace?.id) {
      await logEvent({
        traceId: trace.id,
        name: 'api_call',
        metadata: {
          endpoint: '/api/observability/performance',
          method: 'GET',
          params: { timeRange, modelId },
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Get Supabase client
    const supabase = getSupabaseClient();

    // Convert time range to milliseconds
    let timeInMs = 24 * 60 * 60 * 1000; // Default: 24 hours
    if (timeRange === '1h') timeInMs = 60 * 60 * 1000;
    if (timeRange === '6h') timeInMs = 6 * 60 * 60 * 1000;
    if (timeRange === '7d') timeInMs = 7 * 24 * 60 * 60 * 1000;
    if (timeRange === '30d') timeInMs = 30 * 24 * 60 * 60 * 1000;

    const startTime = new Date(Date.now() - timeInMs).toISOString();

    // Check if we can connect to Supabase
    const { error: connectionError } = await supabase
      .from('model_performance')
      .select('count')
      .limit(1)
      .single();

    if (connectionError) {
      console.error('Error connecting to Supabase:', connectionError);

      // Generate mock model performance data
      const models = [
        {
          id: 'gemini-1.5-pro',
          provider: 'google',
          displayName: 'Gemini 1.5 Pro',
        },
        { id: 'gpt-4o', provider: 'openai', displayName: 'GPT-4o' },
        {
          id: 'claude-3-opus',
          provider: 'anthropic',
          displayName: 'Claude 3 Opus',
        },
        {
          id: 'gemini-1.5-flash',
          provider: 'google',
          displayName: 'Gemini 1.5 Flash',
        },
        { id: 'gpt-4-turbo', provider: 'openai', displayName: 'GPT-4 Turbo' },
      ];

      // Filter by model if specified
      const filteredModels = modelId
        ? models.filter((m) => m.id === modelId)
        : models;

      // Generate performance data for each model
      const modelPerformance = filteredModels.map((model) => {
        // Generate time series data
        const timeSeriesData = generateModelTimeSeriesData(timeRange, model.id);

        // Calculate aggregated metrics
        const avgLatency = Math.round(
          timeSeriesData.reduce((sum, dp) => sum + dp.latency_ms, 0) /
            timeSeriesData.length
        );
        const avgTokensPerSecond = Math.round(
          timeSeriesData.reduce((sum, dp) => sum + dp.tokens_per_second, 0) /
            timeSeriesData.length
        );
        const totalRequests = timeSeriesData.reduce(
          (sum, dp) => sum + dp.request_count,
          0
        );
        const totalTokens = timeSeriesData.reduce(
          (sum, dp) => sum + dp.total_tokens,
          0
        );
        const successRate = Math.round(
          timeSeriesData.reduce((sum, dp) => sum + dp.success_rate, 0) /
            timeSeriesData.length
        );

        return {
          modelId: model.id,
          provider: model.provider,
          displayName: model.displayName,
          timeSeriesData,
          metrics: {
            avgLatency,
            avgTokensPerSecond,
            totalRequests,
            totalTokens,
            successRate,
          },
        };
      });

      // Return mock data
      return NextResponse.json({
        performance: modelPerformance,
        isMockData: true,
      });
    }

    // If we can connect, get real performance data from the database
    let query = supabase
      .from('model_performance')
      .select('*')
      .gte('timestamp', startTime);

    // Filter by model if specified
    if (modelId) {
      query = query.eq('modelId', modelId);
    }

    const { data: performanceData, error } = await query.order('timestamp', {
      ascending: true,
    });

    if (error) {
      console.error('Error fetching performance data:', error);
      throw error;
    }

    // Process and aggregate the data by model
    const modelMap = new Map();

    performanceData?.forEach((record) => {
      if (!modelMap.has(record.modelId)) {
        modelMap.set(record.modelId, {
          modelId: record.modelId,
          provider: record.provider,
          displayName: record.displayName,
          timeSeriesData: [],
          metrics: {
            avgLatency: 0,
            avgTokensPerSecond: 0,
            totalRequests: 0,
            totalTokens: 0,
            successRate: 0,
          },
        });
      }

      const modelData = modelMap.get(record.modelId);
      modelData.timeSeriesData.push(record);
    });

    // Calculate aggregated metrics for each model
    modelMap.forEach((modelData) => {
      const timeSeriesData = modelData.timeSeriesData;
      if (timeSeriesData.length > 0) {
        modelData.metrics = {
          avgLatency: Math.round(
            timeSeriesData.reduce((sum, dp) => sum + dp.latency_ms, 0) /
              timeSeriesData.length
          ),
          avgTokensPerSecond: Math.round(
            timeSeriesData.reduce((sum, dp) => sum + dp.tokens_per_second, 0) /
              timeSeriesData.length
          ),
          totalRequests: timeSeriesData.reduce(
            (sum, dp) => sum + dp.request_count,
            0
          ),
          totalTokens: timeSeriesData.reduce(
            (sum, dp) => sum + dp.total_tokens,
            0
          ),
          successRate: Math.round(
            timeSeriesData.reduce((sum, dp) => sum + dp.success_rate, 0) /
              timeSeriesData.length
          ),
        };
      }
    });

    return NextResponse.json({
      performance: Array.from(modelMap.values()),
      isMockData: false,
    });
  } catch (error) {
    console.error('Error in observability performance API:', error);

    // Return error response
    return NextResponse.json(
      {
        error: 'Failed to fetch performance data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper function to generate time series data for mock model performance
function generateModelTimeSeriesData(timeRange: string, modelId: string) {
  let timeInMs = 24 * 60 * 60 * 1000; // Default: 24 hours
  let dataPoints = 24; // Default: hourly data points for 24 hours

  if (timeRange === '1h') {
    timeInMs = 60 * 60 * 1000;
    dataPoints = 60; // Minute-by-minute for 1 hour
  } else if (timeRange === '6h') {
    timeInMs = 6 * 60 * 60 * 1000;
    dataPoints = 72; // 5-minute intervals for 6 hours
  } else if (timeRange === '7d') {
    timeInMs = 7 * 24 * 60 * 60 * 1000;
    dataPoints = 168; // Hourly for 7 days
  } else if (timeRange === '30d') {
    timeInMs = 30 * 24 * 60 * 60 * 1000;
    dataPoints = 30; // Daily for 30 days
  }

  const now = Date.now();
  const result = [];

  // Base values - different for each model
  let baseLatency = 0;
  let baseTokensPerSecond = 0;
  let baseSuccessRate = 0;

  // Set base values based on model
  if (modelId === 'gemini-1.5-pro') {
    baseLatency = 800;
    baseTokensPerSecond = 35;
    baseSuccessRate = 98;
  } else if (modelId === 'gpt-4o') {
    baseLatency = 700;
    baseTokensPerSecond = 40;
    baseSuccessRate = 99;
  } else if (modelId === 'claude-3-opus') {
    baseLatency = 900;
    baseTokensPerSecond = 30;
    baseSuccessRate = 97;
  } else if (modelId === 'gemini-1.5-flash') {
    baseLatency = 400;
    baseTokensPerSecond = 60;
    baseSuccessRate = 96;
  } else if (modelId === 'gpt-4-turbo') {
    baseLatency = 600;
    baseTokensPerSecond = 45;
    baseSuccessRate = 98;
  } else {
    baseLatency = 750;
    baseTokensPerSecond = 38;
    baseSuccessRate = 97;
  }

  // Generate data points with realistic variations
  for (let i = 0; i < dataPoints; i++) {
    const timeOffset = i / dataPoints;
    const dailyPattern = Math.sin(timeOffset * Math.PI * 2) * 0.2; // 20% variation based on time of day

    // Calculate values with some randomness and daily patterns
    const latency = Math.round(
      baseLatency * (1 + (Math.random() * 0.3 - 0.15) + dailyPattern)
    );
    const tokensPerSecond = Math.round(
      baseTokensPerSecond * (1 + (Math.random() * 0.2 - 0.1) + dailyPattern)
    );
    const successRate = Math.min(
      100,
      Math.max(90, baseSuccessRate + (Math.random() * 4 - 2))
    );
    const requestCount = Math.round(
      10 + Math.random() * 40 * (1 + dailyPattern)
    );
    const totalTokens = requestCount * Math.round(500 + Math.random() * 1500);

    result.push({
      timestamp: new Date(
        now - timeInMs + (timeInMs * i) / dataPoints
      ).toISOString(),
      modelId,
      latency_ms: latency,
      tokens_per_second: tokensPerSecond,
      request_count: requestCount,
      total_tokens: totalTokens,
      success_rate: successRate,
      error_count: Math.round(requestCount * (1 - successRate / 100)),
    });
  }

  return result;
}

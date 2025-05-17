import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';
import { createTrace, logEvent } from '@/lib/langfuse-integration';

/**
 * API route for fetching cost estimation data for observability dashboard
 * Provides cost metrics for different AI models
 */
export async function GET(request: Request) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const timeRange = searchParams.get('timeRange') || '30d';
    const modelId = searchParams.get('modelId');

    // Create a trace for this API call
    const trace = await createTrace({
      name: 'observability_costs_api',
      metadata: {
        limit,
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
          endpoint: '/api/observability/costs',
          method: 'GET',
          params: { limit, timeRange, modelId },
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

    const timeInMs = timeRangeMap[timeRange] || timeRangeMap['30d'];
    const startTime = new Date(Date.now() - timeInMs).toISOString();

    // If modelId is provided, get specific model cost data
    if (modelId) {
      try {
        // Try to connect to Supabase and get real data
        const { data: costData, error } = await supabase
          .from('model_costs')
          .select('*, time_series_data(*)')
          .eq('modelId', modelId)
          .single();

        if (error) {
          console.warn(
            'Falling back to mock data due to Supabase error:',
            error
          );
          return getMockModelCost(modelId, timeRange);
        }

        if (costData) {
          return NextResponse.json({
            costData,
            isMockData: false,
          });
        }

        // If no cost data found, return mock data
        return getMockModelCost(modelId, timeRange);
      } catch (error) {
        console.warn('Error connecting to Supabase:', error);
        return getMockModelCost(modelId, timeRange);
      }
    }

    // Otherwise, get list of model costs
    try {
      // Try to get real cost data from Supabase
      const { data: costData, error } = await supabase
        .from('model_costs')
        .select('*')
        .gte('startDate', startTime)
        .order('startDate', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn(
          'Falling back to mock cost data due to Supabase error:',
          error
        );
        return getMockModelCosts(timeRange);
      }

      if (costData && costData.length > 0) {
        return NextResponse.json({
          costData,
          isMockData: false,
        });
      }

      // If no cost data found, return mock data
      return getMockModelCosts(timeRange);
    } catch (error) {
      console.warn('Error connecting to Supabase:', error);
      return getMockModelCosts(timeRange);
    }
  } catch (error) {
    console.error('Error in observability costs API:', error);

    // Return error response
    return NextResponse.json(
      {
        error: 'Failed to fetch cost data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate mock cost data for a specific model
 */
function getMockModelCost(modelId: string, timeRange: string) {
  const mockModels = {
    'gemini-1.5-pro': {
      provider: 'google',
      displayName: 'Gemini 1.5 Pro',
      costPerInputToken: 0.00001,
      costPerOutputToken: 0.00002,
    },
    'gpt-4o': {
      provider: 'openai',
      displayName: 'GPT-4o',
      costPerInputToken: 0.00001,
      costPerOutputToken: 0.00003,
    },
    'claude-3-opus': {
      provider: 'anthropic',
      displayName: 'Claude 3 Opus',
      costPerInputToken: 0.000015,
      costPerOutputToken: 0.000075,
    },
    'gemini-1.5-flash': {
      provider: 'google',
      displayName: 'Gemini 1.5 Flash',
      costPerInputToken: 0.000003,
      costPerOutputToken: 0.000006,
    },
    'gpt-3.5-turbo': {
      provider: 'openai',
      displayName: 'GPT-3.5 Turbo',
      costPerInputToken: 0.0000015,
      costPerOutputToken: 0.000002,
    },
  };

  const model = mockModels[modelId as keyof typeof mockModels] || {
    provider: 'unknown',
    displayName: modelId,
    costPerInputToken: 0.00001,
    costPerOutputToken: 0.00002,
  };

  // Generate random usage data
  const totalInputTokens = Math.floor(Math.random() * 10000000) + 1000000;
  const totalOutputTokens = Math.floor(totalInputTokens * 0.3);
  const totalCost =
    totalInputTokens * model.costPerInputToken +
    totalOutputTokens * model.costPerOutputToken;
  const avgCostPerRequest =
    totalCost / (Math.floor(Math.random() * 10000) + 1000);

  // Generate time series data
  const timeSeriesData = [];
  const days = timeRange === '7d' ? 7 : 30;
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - i));

    const dailyInputTokens =
      Math.floor(Math.random() * ((totalInputTokens / days) * 1.5)) +
      (totalInputTokens / days) * 0.5;
    const dailyOutputTokens = Math.floor(dailyInputTokens * 0.3);
    const dailyCost =
      dailyInputTokens * model.costPerInputToken +
      dailyOutputTokens * model.costPerOutputToken;

    timeSeriesData.push({
      date: date.toISOString(),
      cost: dailyCost,
      inputTokens: dailyInputTokens,
      outputTokens: dailyOutputTokens,
      requests: Math.floor(Math.random() * 1000) + 100,
    });
  }

  // Calculate daily average and projected monthly cost
  const dailyAverage =
    timeSeriesData.reduce((sum, day) => sum + day.cost, 0) /
    timeSeriesData.length;
  const projectedMonthlyCost = dailyAverage * 30;

  return NextResponse.json({
    costData: {
      modelId,
      provider: model.provider,
      displayName: model.displayName,
      costPerInputToken: model.costPerInputToken,
      costPerOutputToken: model.costPerOutputToken,
      timeSeriesData,
      metrics: {
        totalInputTokens,
        totalOutputTokens,
        totalCost,
        avgCostPerRequest,
        dailyAverage,
        projectedMonthlyCost,
      },
    },
    isMockData: true,
  });
}

/**
 * Generate a list of mock model costs
 */
function getMockModelCosts(timeRange: string) {
  const mockModels = [
    {
      modelId: 'gemini-1.5-pro',
      provider: 'google',
      displayName: 'Gemini 1.5 Pro',
      costPerInputToken: 0.00001,
      costPerOutputToken: 0.00002,
    },
    {
      modelId: 'gpt-4o',
      provider: 'openai',
      displayName: 'GPT-4o',
      costPerInputToken: 0.00001,
      costPerOutputToken: 0.00003,
    },
    {
      modelId: 'claude-3-opus',
      provider: 'anthropic',
      displayName: 'Claude 3 Opus',
      costPerInputToken: 0.000015,
      costPerOutputToken: 0.000075,
    },
    {
      modelId: 'gemini-1.5-flash',
      provider: 'google',
      displayName: 'Gemini 1.5 Flash',
      costPerInputToken: 0.000003,
      costPerOutputToken: 0.000006,
    },
    {
      modelId: 'gpt-3.5-turbo',
      provider: 'openai',
      displayName: 'GPT-3.5 Turbo',
      costPerInputToken: 0.0000015,
      costPerOutputToken: 0.000002,
    },
  ];

  const costData = mockModels.map((model) => {
    // Generate random usage data
    const totalInputTokens = Math.floor(Math.random() * 10000000) + 1000000;
    const totalOutputTokens = Math.floor(totalInputTokens * 0.3);
    const totalCost =
      totalInputTokens * model.costPerInputToken +
      totalOutputTokens * model.costPerOutputToken;
    const avgCostPerRequest =
      totalCost / (Math.floor(Math.random() * 10000) + 1000);

    // Generate time series data
    const timeSeriesData = [];
    const days = timeRange === '7d' ? 7 : 30;
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - i));

      const dailyInputTokens =
        Math.floor(Math.random() * ((totalInputTokens / days) * 1.5)) +
        (totalInputTokens / days) * 0.5;
      const dailyOutputTokens = Math.floor(dailyInputTokens * 0.3);
      const dailyCost =
        dailyInputTokens * model.costPerInputToken +
        dailyOutputTokens * model.costPerOutputToken;

      timeSeriesData.push({
        date: date.toISOString(),
        cost: dailyCost,
        inputTokens: dailyInputTokens,
        outputTokens: dailyOutputTokens,
        requests: Math.floor(Math.random() * 1000) + 100,
      });
    }

    // Calculate daily average and projected monthly cost
    const dailyAverage =
      timeSeriesData.reduce((sum, day) => sum + day.cost, 0) /
      timeSeriesData.length;
    const projectedMonthlyCost = dailyAverage * 30;

    return {
      modelId: model.modelId,
      provider: model.provider,
      displayName: model.displayName,
      costPerInputToken: model.costPerInputToken,
      costPerOutputToken: model.costPerOutputToken,
      timeSeriesData,
      metrics: {
        totalInputTokens,
        totalOutputTokens,
        totalCost,
        avgCostPerRequest,
        dailyAverage,
        projectedMonthlyCost,
      },
    };
  });

  return NextResponse.json({
    costData,
    isMockData: true,
  });
}

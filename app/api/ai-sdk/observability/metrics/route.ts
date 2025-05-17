import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';
import { createTrace, logEvent } from '@/lib/langfuse-integration';

/**
 * API route for fetching system metrics data for observability dashboard
 * Provides system health metrics like CPU usage, memory usage, etc.
 */

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';

    // Create a trace for this API call
    const trace = await createTrace({
      name: 'observability_metrics_api',
      metadata: {
        timeRange,
        timestamp: new Date().toISOString(),
      },
    });

    // Log API call event
    if (trace?.id) {
      await logEvent({
        traceId: trace.id,
        name: 'api_call',
        metadata: {
          endpoint: '/api/observability/metrics',
          method: 'GET',
          params: { timeRange },
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
      .from('system_metrics')
      .select('count')
      .limit(1)
      .single();

    if (connectionError) {
      console.error('Error connecting to Supabase:', connectionError);

      // Generate mock data points based on time range
      const dataPoints = generateTimeSeriesData(timeRange);

      // Return mock data if we can't connect to Supabase
      return NextResponse.json({
        metrics: {
          timeRange,
          dataPoints,
          summary: {
            avgCpuUsage: Math.round(
              dataPoints.reduce((sum, dp) => sum + dp.cpu_usage, 0) /
                dataPoints.length
            ),
            avgMemoryUsage: Math.round(
              dataPoints.reduce((sum, dp) => sum + dp.memory_usage, 0) /
                dataPoints.length
            ),
            avgResponseTime: Math.round(
              dataPoints.reduce(
                (sum, dp) => sum + dp.average_response_time_ms,
                0
              ) / dataPoints.length
            ),
            peakApiRequests: Math.max(
              ...dataPoints.map((dp) => dp.api_requests_per_minute)
            ),
            totalRequests: dataPoints.reduce(
              (sum, dp) => sum + dp.api_requests_per_minute,
              0
            ),
            avgActiveUsers: Math.round(
              dataPoints.reduce((sum, dp) => sum + dp.active_users, 0) /
                dataPoints.length
            ),
          },
        },
        isMockData: true,
      });
    }

    // If we can connect, get real metrics from the database
    const { data: metricsData, error } = await supabase
      .from('system_metrics')
      .select('*')
      .gte('timestamp', startTime)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }

    // Calculate summary metrics
    const summary =
      metricsData && metricsData.length > 0
        ? {
            avgCpuUsage: Math.round(
              metricsData.reduce((sum, m) => sum + m.cpu_usage, 0) /
                metricsData.length
            ),
            avgMemoryUsage: Math.round(
              metricsData.reduce((sum, m) => sum + m.memory_usage, 0) /
                metricsData.length
            ),
            avgResponseTime: Math.round(
              metricsData.reduce(
                (sum, m) => sum + m.average_response_time_ms,
                0
              ) / metricsData.length
            ),
            peakApiRequests: Math.max(
              ...metricsData.map((m) => m.api_requests_per_minute)
            ),
            totalRequests: metricsData.reduce(
              (sum, m) => sum + m.api_requests_per_minute,
              0
            ),
            avgActiveUsers: Math.round(
              metricsData.reduce((sum, m) => sum + m.active_users, 0) /
                metricsData.length
            ),
          }
        : null;

    return NextResponse.json({
      metrics: {
        timeRange,
        dataPoints: metricsData || [],
        summary,
      },
      isMockData: false,
    });
  } catch (error) {
    console.error('Error in observability metrics API:', error);

    // Return error response
    return NextResponse.json(
      {
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper function to generate time series data for mock metrics
function generateTimeSeriesData(timeRange: string) {
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

  // Base values
  let cpuUsage = 30 + Math.random() * 20;
  let memoryUsage = 40 + Math.random() * 20;
  let dbConnections = 15 + Math.random() * 10;
  let apiRequests = 50 + Math.random() * 30;
  let responseTime = 250 + Math.random() * 100;
  let activeUsers = 8 + Math.random() * 8;

  // Generate data points with realistic variations
  for (let i = 0; i < dataPoints; i++) {
    // Add some randomness but maintain trends
    cpuUsage = Math.max(5, Math.min(95, cpuUsage + (Math.random() * 10 - 5)));
    memoryUsage = Math.max(
      10,
      Math.min(95, memoryUsage + (Math.random() * 8 - 4))
    );
    dbConnections = Math.max(
      1,
      Math.min(50, dbConnections + (Math.random() * 6 - 3))
    );
    apiRequests = Math.max(
      5,
      Math.min(200, apiRequests + (Math.random() * 20 - 10))
    );
    responseTime = Math.max(
      100,
      Math.min(1000, responseTime + (Math.random() * 50 - 25))
    );
    activeUsers = Math.max(
      1,
      Math.min(30, activeUsers + (Math.random() * 4 - 2))
    );

    // Add daily patterns for more realism
    const timeOffset = i / dataPoints;
    const dailyPattern = Math.sin(timeOffset * Math.PI * 2) * 15;

    result.push({
      id: `metric-${i}`,
      timestamp: new Date(
        now - timeInMs + (timeInMs * i) / dataPoints
      ).toISOString(),
      cpu_usage: Math.round(cpuUsage + dailyPattern * 0.5),
      memory_usage: Math.round(memoryUsage + dailyPattern * 0.3),
      database_connections: Math.round(dbConnections + dailyPattern * 0.2),
      api_requests_per_minute: Math.round(apiRequests + dailyPattern),
      average_response_time_ms: Math.round(responseTime + dailyPattern * 2),
      active_users: Math.round(activeUsers + dailyPattern * 0.1),
    });
  }

  return result;
}

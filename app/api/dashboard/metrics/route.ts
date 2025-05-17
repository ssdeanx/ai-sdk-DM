import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';

export async function GET() {
  try {
    // Get Supabase client
    const supabase = getSupabaseClient();

    // In a real application, you would query your Supabase database
    // Here we're simulating the response for demonstration purposes

    // Check if we can connect to Supabase
    const { error: connectionError } = await supabase
      .from('models')
      .select('count')
      .limit(1)
      .single();

    if (connectionError) {
      console.error('Error connecting to Supabase:', connectionError);

      // Return mock data if we can't connect to Supabase
      return NextResponse.json({
        metrics: [
          {
            id: '1',
            cpu_usage: 42,
            memory_usage: 58,
            database_connections: 24,
            api_requests_per_minute: 78,
            average_response_time_ms: 320,
            active_users: 12,
            timestamp: new Date().toISOString(),
          },
          {
            id: '2',
            cpu_usage: 38,
            memory_usage: 52,
            database_connections: 18,
            api_requests_per_minute: 65,
            average_response_time_ms: 290,
            active_users: 10,
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
          },
          {
            id: '3',
            cpu_usage: 45,
            memory_usage: 60,
            database_connections: 22,
            api_requests_per_minute: 82,
            average_response_time_ms: 350,
            active_users: 14,
            timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
          },
        ],
        isMockData: true,
      });
    }

    // If we can connect, get real metrics data from the database
    const { data: metrics, error } = await supabase
      .from('system_metrics')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching metrics data:', error);
      throw error;
    }

    return NextResponse.json({
      metrics: metrics || [],
      isMockData: false,
    });
  } catch (error) {
    console.error('Error in dashboard metrics API:', error);

    // Return mock data in case of error
    return NextResponse.json({
      metrics: [
        {
          id: '1',
          cpu_usage: 42,
          memory_usage: 58,
          database_connections: 24,
          api_requests_per_minute: 78,
          average_response_time_ms: 320,
          active_users: 12,
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          cpu_usage: 38,
          memory_usage: 52,
          database_connections: 18,
          api_requests_per_minute: 65,
          average_response_time_ms: 290,
          active_users: 10,
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        },
        {
          id: '3',
          cpu_usage: 45,
          memory_usage: 60,
          database_connections: 22,
          api_requests_per_minute: 82,
          average_response_time_ms: 350,
          active_users: 14,
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
        },
      ],
      isMockData: true,
    });
  }
}

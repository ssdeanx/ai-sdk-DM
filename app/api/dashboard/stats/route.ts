import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';

export async function GET() {
  try {
    // Get Supabase client
    const supabase = getSupabaseClient();

    // In a real application, you would query your Supabase database
    // Here we're simulating the response for demonstration purposes

    // Check if we can connect to Supabase
    const { data: connectionTest, error: connectionError } = await supabase
      .from('models')
      .select('count')
      .limit(1)
      .single();

    if (connectionError) {
      console.error('Error connecting to Supabase:', connectionError);

      // Return mock data if we can't connect to Supabase
      return NextResponse.json({
        stats: [
          {
            agents: 12,
            models: 8,
            tools: 24,
            conversations: 156,
            networks: 5,
            workflows: 10,
          },
        ],
        isMockData: true,
      });
    }

    // If we can connect, get real counts from the database
    const [
      { count: agentsCount },
      { count: modelsCount },
      { count: toolsCount },
      { count: conversationsCount },
    ] = await Promise.all(
      [
        supabase.from('agents').select('count').single(),
        supabase.from('models').select('count').single(),
        supabase.from('tools').select('count').single(),
        supabase.from('conversations').select('count').single(),
      ].map((promise) =>
        promise.catch((error) => {
          console.error('Error fetching count:', error);
          return { count: 0 };
        })
      )
    );

    return NextResponse.json({
      stats: [
        {
          agents: agentsCount || 0,
          models: modelsCount || 0,
          tools: toolsCount || 0,
          conversations: conversationsCount || 0,
        },
      ],
      isMockData: false,
    });
  } catch (error) {
    console.error('Error in dashboard stats API:', error);

    // Return mock data in case of error
    return NextResponse.json({
      stats: [
        {
          agents: 12,
          models: 8,
          tools: 24,
          conversations: 156,
        },
      ],
      isMockData: true,
    });
  }
}

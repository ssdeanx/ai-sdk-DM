import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

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
        activities: [
          {
            id: '1',
            type: 'agent_created',
            entityId: 'agent-1',
            entityName: 'Research Assistant',
            userId: 'user-1',
            userName: 'Sam Dean',
            userAvatar: '',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
          },
          {
            id: '2',
            type: 'model_added',
            entityId: 'model-1',
            entityName: 'Gemini Pro 1.5',
            userId: 'user-1',
            userName: 'Sam Dean',
            userAvatar: '',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          },
          {
            id: '3',
            type: 'conversation_completed',
            entityId: 'conv-1',
            entityName: 'Project Planning',
            userId: 'user-2',
            userName: 'Alex Johnson',
            userAvatar: '',
            timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
          },
          {
            id: '4',
            type: 'tool_executed',
            entityId: 'tool-1',
            entityName: 'Web Search',
            userId: 'user-1',
            userName: 'Sam Dean',
            userAvatar: '',
            timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
          },
          {
            id: '5',
            type: 'agent_created',
            entityId: 'agent-2',
            entityName: 'Code Assistant',
            userId: 'user-3',
            userName: 'Taylor Smith',
            userAvatar: '',
            timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
          },
        ].slice(0, limit),
        isMockData: true,
      });
    }

    // If we can connect, get real activity data from the database
    const { data: activities, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activity data:', error);
      throw error;
    }

    return NextResponse.json({
      activities: activities || [],
      isMockData: false,
    });
  } catch (error) {
    console.error('Error in dashboard activity API:', error);

    // Return mock data in case of error
    return NextResponse.json({
      activities: [
        {
          id: '1',
          type: 'agent_created',
          entityId: 'agent-1',
          entityName: 'Research Assistant',
          userId: 'user-1',
          userName: 'Sam Dean',
          userAvatar: '',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        },
        {
          id: '2',
          type: 'model_added',
          entityId: 'model-1',
          entityName: 'Gemini Pro 1.5',
          userId: 'user-1',
          userName: 'Sam Dean',
          userAvatar: '',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        },
        {
          id: '3',
          type: 'conversation_completed',
          entityId: 'conv-1',
          entityName: 'Project Planning',
          userId: 'user-2',
          userName: 'Alex Johnson',
          userAvatar: '',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        },
        {
          id: '4',
          type: 'tool_executed',
          entityId: 'tool-1',
          entityName: 'Web Search',
          userId: 'user-1',
          userName: 'Sam Dean',
          userAvatar: '',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
        },
        {
          id: '5',
          type: 'agent_created',
          entityId: 'agent-2',
          entityName: 'Code Assistant',
          userId: 'user-3',
          userName: 'Taylor Smith',
          userAvatar: '',
          timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
        },
      ].slice(0, Number(searchParams.get('limit') || 10)),
      isMockData: true,
    });
  }
}

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';
import { handleApiError } from '@/lib/api-error-handler';

export interface NetworkAgent {
  id: string;
  network_id: string;
  agent_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const supabase = getSupabaseClient();

    // Get network agents with agent details
    const { data, error } = await supabase
      .from('network_agents')
      .select(
        `
        *,
        agents:agent_id (
          id,
          name,
          description
        )
      `
      )
      .eq('network_id', id);

    if (error) {
      console.error('Error fetching network agents:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      agents: data || [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate required fields
    if (!body.agentId || !body.role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Format the data to match Supabase schema
    const networkAgentData = {
      network_id: id,
      agent_id: body.agentId,
      role: body.role,
    };

    // Start a transaction
    const { data: networkAgent, error: agentError } = await supabase
      .from('network_agents')
      .insert(networkAgentData)
      .select()
      .single();

    if (agentError) {
      console.error('Error adding agent to network:', agentError);
      return NextResponse.json({ error: agentError.message }, { status: 500 });
    }

    // Update the agent count in the network
    const { data: network, error: networkError } = await supabase.rpc(
      'increment_network_agent_count',
      {
        network_id: id,
      }
    );

    if (networkError) {
      console.error('Error updating network agent count:', networkError);
      // Don't return an error here, as the agent was successfully added
    }

    return NextResponse.json(networkAgent);
  } catch (error) {
    return handleApiError(error);
  }
}

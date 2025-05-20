import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { z } from 'zod';

// Canonical Zod schema for NetworkAgent (do not edit db schemas, define here for route validation)
const NetworkAgentSchema = z.object({
  id: z.string(),
  network_id: z.string(),
  agent_id: z.string(),
  role: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; agentId: string } }
) {
  try {
    const { id, agentId } = params;
    const supabase = createSupabaseClient();
    const table = supabase.from('network_agents', undefined);
    // Delete the network agent
    await table.delete(agentId);
    // Decrement agent_count in networks table
    const networksTable = supabase.from('networks', undefined);
    const network = await networksTable.getById(id);
    if (network && typeof network === 'object' && 'agent_count' in network) {
      await networksTable.update(id, {
        agent_count: Math.max(0, (network.agent_count || 1) - 1),
        updated_at: new Date().toISOString(),
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    upstashLogger.error(
      'DELETE /api/ai-sdk/networks/[id]/agents/[agentId] failed',
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string; agentId: string } }
) {
  try {
    const { id, agentId } = params;
    const body = await request.json();
    // Validate input
    const InputSchema = z.object({
      role: z.string(),
    });
    const parsed = InputSchema.parse(body);
    const supabase = createSupabaseClient();
    const table = supabase.from('network_agents', undefined);
    // Update the network agent, ensuring both id and agentId are used
    const updated = await table.update(
      { network_id: id, agent_id: agentId },
      {
        role: parsed.role,
        updated_at: new Date().toISOString(),
      }
    );
    const validated = NetworkAgentSchema.parse(updated);
    return NextResponse.json(validated);
  } catch (error) {
    upstashLogger.error(
      'PUT /api/ai-sdk/networks/[id]/agents/[agentId] failed',
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

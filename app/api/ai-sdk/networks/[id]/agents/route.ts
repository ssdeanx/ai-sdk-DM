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

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createSupabaseClient();
    const table = supabase.from('network_agents', undefined);
    // Get all network agents for this network
    let agents: unknown[] = await table.getAll();
    agents = agents.filter(
      (a) => (a as { network_id: string }).network_id === id
    );
    // Validate output
    const validated = agents.map((a) => NetworkAgentSchema.parse(a));
    return NextResponse.json({ agents: validated });
  } catch (error) {
    upstashLogger.error(
      'GET /api/ai-sdk/networks/[id]/agents failed',
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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    // Validate input
    const InputSchema = z.object({
      agentId: z.string(),
      role: z.string(),
    });
    const parsed = InputSchema.parse(body);
    const supabase = createSupabaseClient();
    const table = supabase.from('network_agents', undefined);
    const now = new Date().toISOString();
    const newAgent = {
      id: `network-agent-${Date.now()}`,
      network_id: id,
      agent_id: parsed.agentId,
      role: parsed.role,
      created_at: now,
      updated_at: now,
    };
    const created = await table.create(newAgent);
    // Increment agent_count in networks table
    const networksTable = supabase.from('networks', undefined);
    const network = await networksTable.getById(id);
    if (network && typeof network === 'object' && 'agent_count' in network) {
      await networksTable.update(id, {
        agent_count:
          ((network as { agent_count: number }).agent_count || 0) + 1,
        updated_at: now,
      });
    }
    const validated = NetworkAgentSchema.parse(created);
    return NextResponse.json(validated);
  } catch (error) {
    upstashLogger.error(
      'POST /api/ai-sdk/networks/[id]/agents failed',
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

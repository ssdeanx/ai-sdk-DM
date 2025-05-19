import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { z } from 'zod';

// Canonical Zod schema for Network (do not edit db schemas, define here for route validation)
const NetworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  agent_count: z.number(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Infer the Network type from the Zod schema
type Network = z.infer<typeof NetworkSchema>;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');
    const supabase = createSupabaseClient();
    const table = supabase.from('networks', undefined); // schema param ignored
    let allNetworks = (await table.getAll()) as Network[];
    // Filter in-memory if needed (Upstash TableClient does not support advanced queries)
    if (status) {
      allNetworks = allNetworks.filter((n: Network) => n.status === status);
    }
    if (search) {
      const s = search.toLowerCase();
      allNetworks = allNetworks.filter(
        (n: Network) =>
          n.name.toLowerCase().includes(s) ||
          n.description.toLowerCase().includes(s)
      );
    }
    // Sort by created_at descending
    allNetworks = allNetworks.sort((a: Network, b: Network) =>
      b.created_at.localeCompare(a.created_at)
    );
    // Validate output
    const validated = allNetworks.map((n) => NetworkSchema.parse(n));
    return NextResponse.json({ networks: validated });
  } catch (error) {
    upstashLogger.error(
      'GET /api/networks failed',
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Validate input (omit id, created_at, updated_at)
    const parsed = NetworkSchema.omit({
      id: true,
      created_at: true,
      updated_at: true,
    }).parse(body);
    const supabase = createSupabaseClient();
    const table = supabase.from('networks', undefined);
    const now = new Date().toISOString();
    const newNetwork = {
      ...parsed,
      id: `network-${Date.now()}`,
      agent_count: 0,
      status: parsed.status || 'Active',
      created_at: now,
      updated_at: now,
    };
    const created = await table.create(newNetwork);
    const validated = NetworkSchema.parse(created);
    return NextResponse.json(validated);
  } catch (error) {
    upstashLogger.error(
      'POST /api/networks failed',
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

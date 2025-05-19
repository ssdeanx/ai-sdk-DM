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

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createSupabaseClient();
    const table = supabase.from('networks', undefined);
    const network = await table.getById(id);
    if (!network) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }
    const validated = NetworkSchema.parse(network);
    return NextResponse.json(validated);
  } catch (error) {
    upstashLogger.error(
      'GET /api/ai-sdk/networks/[id] failed',
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    // Validate input (allow partial update, but require at least one field)
    const UpdateSchema = NetworkSchema.omit({
      id: true,
      created_at: true,
      updated_at: true,
      agent_count: true,
    }).partial();
    const parsed = UpdateSchema.parse(body);
    if (Object.keys(parsed).length === 0) {
      return NextResponse.json(
        { error: 'No fields provided for update' },
        { status: 400 }
      );
    }
    const supabase = createSupabaseClient();
    const table = supabase.from('networks', undefined);
    const existing = await table.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }
    const updated = await table.update(id, {
      ...parsed,
      updated_at: new Date().toISOString(),
    });
    const validated = NetworkSchema.parse(updated);
    return NextResponse.json(validated);
  } catch (error) {
    upstashLogger.error(
      'PUT /api/ai-sdk/networks/[id] failed',
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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createSupabaseClient();
    const table = supabase.from('networks', undefined);
    const existing = await table.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }
    await table.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    upstashLogger.error(
      'DELETE /api/ai-sdk/networks/[id] failed',
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

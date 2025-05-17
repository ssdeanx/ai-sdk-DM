import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { handleApiError } from '@/lib/api-error-handler';

const adapter = createSupabaseClient();

const AppSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.string().min(1),
  code: z.string().optional().nullable(),
  parameters_schema: z.any().optional().nullable(),
  metadata: z.any().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

function isApp(item: any): item is { id: string; name: string; type: string; code: string } {
  return item && typeof item === 'object' && typeof item.name === 'string' && typeof item.type === 'string' && 'code' in item;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const item = await adapter.from('apps').getById(id);
      if (!isApp(item)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (item && typeof item.parameters_schema === 'string') {
        try { item.parameters_schema = JSON.parse(item.parameters_schema); } catch {}
      }
        try { item.parameters_schema = JSON.parse(item.parameters_schema); } catch {}
      }
      if (typeof item.metadata === 'string') {
        try { item.metadata = JSON.parse(item.metadata); } catch {}
      }
      return NextResponse.json(item);
    }
    const items = await adapter.from(table).getAll();
    const parsed = items.filter(isApp).map((item) => {
      if (typeof item.parameters_schema === 'string') {
        try { item.parameters_schema = JSON.parse(item.parameters_schema); } catch {}
      }
      if (typeof item.metadata === 'string') {
        try { item.metadata = JSON.parse(item.metadata); } catch {}
      }
      return item;
    });
    return NextResponse.json(parsed);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = AppSchema.omit({ id: true, created_at: true, updated_at: true }).parse(raw);
    const now = new Date().toISOString();
    const insertData = {
      ...parsed,
      code: parsed.code || '',
      parameters_schema: parsed.parameters_schema ? JSON.stringify(parsed.parameters_schema) : null,
      metadata: parsed.metadata ? JSON.stringify(parsed.metadata) : null,
      created_at: now,
      updated_at: now,
    };
    const created = await adapter.from(table).create(insertData);
    if (typeof created.parameters_schema === 'string') {
      try { created.parameters_schema = JSON.parse(created.parameters_schema); } catch {}
    }
    if (typeof created.metadata === 'string') {
      try { created.metadata = JSON.parse(created.metadata); } catch {}
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const raw = await req.json();
    if (!raw.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const parsed = AppSchema.partial().parse(raw);
    const now = new Date().toISOString();
    const updateData = {
      ...parsed,
      code: parsed.code || '',
      parameters_schema: parsed.parameters_schema ? JSON.stringify(parsed.parameters_schema) : null,
      metadata: parsed.metadata ? JSON.stringify(parsed.metadata) : null,
      updated_at: now,
      id: raw.id,
    };
    const updated = await adapter.from(table).update(updateData.id, updateData);
    if (!isApp(updated)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (typeof updated.parameters_schema === 'string') {
      try { updated.parameters_schema = JSON.parse(updated.parameters_schema); } catch {}
    }
    if (typeof updated.metadata === 'string') {
      try { updated.metadata = JSON.parse(updated.metadata); } catch {}
    }
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const deleted = await adapter.from(table).delete(id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
// Generated on 2025-05-17 by ssdeanx
// Uses schema import for table, no types, schema-driven only.

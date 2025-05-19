import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { settings } from '@/db/supabase/schema';

const table = 'settings';
const adapter = createSupabaseClient();
const schema = settings;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const key = searchParams.get('key');
  if (category && key) {
    const item = await adapter
      .from(table, schema)
      .getById(`${category}:${key}`); // Composite key
    if (!item)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  }
  const items = await adapter.from(table, schema).getAll();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const created = await adapter.from(table, schema).create(data);
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const data = await req.json();
  if (!data.category || !data.key)
    return NextResponse.json(
      { error: 'Missing category or key' },
      { status: 400 }
    );
  const updated = await adapter
    .from(table, schema)
    .update(`${data.category}:${data.key}`, data);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const key = searchParams.get('key');
  if (!category || !key)
    return NextResponse.json(
      { error: 'Missing category or key' },
      { status: 400 }
    );
  const deleted = await adapter
    .from(table, schema)
    .delete(`${category}:${key}`);
  return NextResponse.json({ success: deleted });
}

// Content API route for CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';

const table = 'content';
const adapter = createSupabaseClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const item = await adapter.from(table).getById(id);
    if (!item)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  }
  const items = await adapter.from(table).getAll();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const created = await adapter.from(table).create(data);
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const data = await req.json();
  if (!data.id)
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const updated = await adapter.from(table).update(data.id, data);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const deleted = await adapter.from(table).delete(id);
  return NextResponse.json({ success: deleted });
}

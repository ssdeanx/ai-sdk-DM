// Observability API route for CRUD operations (traces and spans)
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';

const tracesTable = 'traces';
const spansTable = 'spans';
const adapter = createSupabaseClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'trace' or 'span'
  const id = searchParams.get('id');
  if (type === 'span') {
    if (id) {
      const item = await adapter.from(spansTable).getById(id);
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(item);
    }
    const items = await adapter.from(spansTable).getAll();
    return NextResponse.json(items);
  } else {
    if (id) {
      const item = await adapter.from(tracesTable).getById(id);
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(item);
    }
    const items = await adapter.from(tracesTable).getAll();
    return NextResponse.json(items);
  }
}

export async function POST(req: NextRequest) {
  const { type, ...data } = await req.json();
  if (type === 'span') {
    const created = await adapter.from(spansTable).create(data);
    return NextResponse.json(created, { status: 201 });
  } else {
    const created = await adapter.from(tracesTable).create(data);
    return NextResponse.json(created, { status: 201 });
  }
}

export async function PUT(req: NextRequest) {
  const { type, ...data } = await req.json();
  if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (type === 'span') {
    const updated = await adapter.from(spansTable).update(data.id, data);
    return NextResponse.json(updated);
  } else {
    const updated = await adapter.from(tracesTable).update(data.id, data);
    return NextResponse.json(updated);
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (type === 'span') {
    const deleted = await adapter.from(spansTable).delete(id);
    return NextResponse.json({ success: deleted });
  } else {
    const deleted = await adapter.from(tracesTable).delete(id);
    return NextResponse.json({ success: deleted });
  }
}

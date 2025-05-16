import { NextRequest, NextResponse } from 'next/server';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';

const table = 'models';
const adapter = createSupabaseClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const item = await adapter.from(table).getById(id);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  }
  const items = await adapter.from(table).getAll();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const now = new Date().toISOString();
    const created = await adapter.from(table).create({ ...data, created_at: now, updated_at: now });
    await upstashLogger.info('models', 'Model created', { modelId: created.id });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    await upstashLogger.error('models', 'Model creation error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const updated = await adapter.from(table).update(data.id, { ...data, updated_at: new Date().toISOString() });
    await upstashLogger.info('models', 'Model updated', { modelId: data.id });
    return NextResponse.json(updated);
  } catch (error) {
    await upstashLogger.error('models', 'Model update error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const deleted = await adapter.from(table).delete(id);
    await upstashLogger.info('models', 'Model deleted', { modelId: id });
    return NextResponse.json({ success: deleted });
  } catch (error) {
    await upstashLogger.error('models', 'Model delete error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

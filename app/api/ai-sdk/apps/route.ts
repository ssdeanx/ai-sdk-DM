import { NextRequest, NextResponse } from 'next/server';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';

const adapter = createSupabaseClient();
const table = 'apps';

export async function GET(_req: NextRequest) {
  try {
    const apps = await adapter.from(table).getAll();
    return NextResponse.json(apps);
  } catch (error) {
    await upstashLogger.error('apps', 'App fetch error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const now = new Date().toISOString();
    const created = await adapter.from(table).create({ ...data, created_at: now, updated_at: now });
    await upstashLogger.info('apps', 'App created', { appId: created.id });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    await upstashLogger.error('apps', 'App creation error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const updated = await adapter.from(table).update(data.id, { ...data, updated_at: new Date().toISOString() });
    await upstashLogger.info('apps', 'App updated', { appId: data.id });
    return NextResponse.json(updated);
  } catch (error) {
    await upstashLogger.error('apps', 'App update error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const deleted = await adapter.from(table).delete(id);
    await upstashLogger.info('apps', 'App deleted', { appId: id });
    return NextResponse.json({ success: deleted });
  } catch (error) {
    await upstashLogger.error('apps', 'App delete error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

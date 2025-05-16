import { NextRequest, NextResponse } from 'next/server';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';

const adapter = createSupabaseClient();
const table = 'apps';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const app = await adapter.from(table).getById(id);
    if (!app) return NextResponse.json({ error: 'App not found' }, { status: 404 });
    return NextResponse.json(app);
  } catch (error) {
    await upstashLogger.error('apps', 'App fetch by id error', error instanceof Error ? error : new Error(String(error)), { appId: params?.id });
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const data = await req.json();
    const updated = await adapter.from(table).update(id, { ...data, updated_at: new Date().toISOString() });
    await upstashLogger.info('apps', 'App updated by id', { appId: id });
    return NextResponse.json(updated);
  } catch (error) {
    await upstashLogger.error('apps', 'App update by id error', error instanceof Error ? error : new Error(String(error)), { appId: params?.id });
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const deleted = await adapter.from(table).delete(id);
    await upstashLogger.info('apps', 'App deleted by id', { appId: id });
    return NextResponse.json({ success: deleted });
  } catch (error) {
    await upstashLogger.error('apps', 'App delete by id error', error instanceof Error ? error : new Error(String(error)), { appId: params?.id });
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// Providers API route for CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';

const table = 'settings';
const PROVIDER_PREFIX = 'provider:';
const adapter = createSupabaseClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const item = await adapter.from(table).getById(PROVIDER_PREFIX + id);
    if (!item)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  }
  const items = await adapter.from(table).getAll();
  type SettingsRow = { key: string; value: string; [k: string]: unknown };
  const providers = (items as SettingsRow[]).filter(
    (i) => i.key && i.key.startsWith(PROVIDER_PREFIX)
  );
  return NextResponse.json(providers);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const now = new Date().toISOString();
  const id = data.id || crypto.randomUUID();
  const created = await adapter.from(table).create({
    ...data,
    key: PROVIDER_PREFIX + id,
    created_at: now,
    updated_at: now,
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const data = await req.json();
  if (!data.id)
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const updated = await adapter.from(table).update(PROVIDER_PREFIX + data.id, {
    ...data,
    updated_at: new Date().toISOString(),
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const deleted = await adapter.from(table).delete(PROVIDER_PREFIX + id);
  return NextResponse.json({ success: deleted });
}

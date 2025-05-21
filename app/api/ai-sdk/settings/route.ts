import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { settings } from '@/db/supabase/schema';
import { SettingSchema } from 'types/supabase';

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
    const parsed = SettingSchema.safeParse(item);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }
    return NextResponse.json(parsed.data);
  }
  const items = await adapter.from(table, schema).getAll();
  const settings = items
    .map((item: unknown) => {
      const parsed = SettingSchema.safeParse(item);
      return parsed.success ? parsed.data : null;
    })
    .filter(Boolean);
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const parsed = SettingSchema.omit({
    created_at: true,
    updated_at: true,
  }).safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }
  const now = new Date().toISOString();
  const created = await adapter.from(table, schema).create({
    ...parsed.data,
    created_at: now,
    updated_at: now,
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const data = await req.json();
  if (!data.category || !data.key)
    return NextResponse.json(
      { error: 'Missing category or key' },
      { status: 400 }
    );
  const parsed = SettingSchema.partial().safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }
  const updated = await adapter
    .from(table, schema)
    .update(`${data.category}:${data.key}`, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    });
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

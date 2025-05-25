import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { ProviderSchema } from '@/lib/shared/types/supabase';

const table = 'settings';
const PROVIDER_PREFIX = 'provider:';
const adapter = createSupabaseClient();

// GET: List all providers or get by id
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const item = await adapter.from(table, null).getById(PROVIDER_PREFIX + id);
    if (!item)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Validate output with canonical ProviderSchema
    const parsed = ProviderSchema.safeParse(item);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }
    return NextResponse.json(parsed.data);
  }
  const items = await adapter.from(table, null).getAll();
  type SettingsRow = { key: string; value: string; [k: string]: unknown };
  const providers = (items as SettingsRow[])
    .filter((i) => i.key && i.key.startsWith(PROVIDER_PREFIX))
    .map((i) => {
      const parsed = ProviderSchema.safeParse(i);
      return parsed.success ? parsed.data : null;
    })
    .filter(Boolean);
  return NextResponse.json(providers);
}

// POST: Create a new provider
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // Validate input with canonical ProviderSchema (omit id, created_at, updated_at)
    const parsed = ProviderSchema.omit({
      id: true,
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
    const id = data.id || crypto.randomUUID();
    const created = await adapter.from(table, null).create({
      ...parsed.data,
      id,
      key: PROVIDER_PREFIX + id,
      created_at: now,
      updated_at: now,
    });
    await upstashLogger.info('providers', 'Provider created', {
      providerId: id,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    await upstashLogger.error(
      'providers',
      'Provider creation error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PUT: Update a provider
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id)
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    // Validate input with canonical ProviderSchema (partial for PATCH/PUT)
    const parsed = ProviderSchema.partial().safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const updated = await adapter
      .from(table, null)
      .update(PROVIDER_PREFIX + data.id, {
        ...parsed.data,
        updated_at: new Date().toISOString(),
      });
    await upstashLogger.info('providers', 'Provider updated', {
      providerId: data.id,
    });
    return NextResponse.json(updated);
  } catch (error) {
    await upstashLogger.error(
      'providers',
      'Provider update error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE: Remove a provider
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const deleted = await adapter
      .from(table, null)
      .delete(PROVIDER_PREFIX + id);
    await upstashLogger.info('providers', 'Provider deleted', {
      providerId: id,
    });
    return NextResponse.json({ success: deleted });
  } catch (error) {
    await upstashLogger.error(
      'providers',
      'Provider delete error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

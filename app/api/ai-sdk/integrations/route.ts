import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { IntegrationSchema } from '@/lib/shared/types/supabase';

const table = 'settings';
const INTEGRATION_PREFIX = 'integration:';
const adapter = createSupabaseClient();

// GET: List all integrations or get by id
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const item = await adapter
      .from(table, null)
      .getById(INTEGRATION_PREFIX + id);
    if (!item)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Validate output with canonical IntegrationSchema
    const parsed = IntegrationSchema.safeParse(item);
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
  const integrations = (items as SettingsRow[])
    .filter((i) => i.key && i.key.startsWith(INTEGRATION_PREFIX))
    .map((i) => {
      const parsed = IntegrationSchema.safeParse(i);
      return parsed.success ? parsed.data : null;
    })
    .filter(Boolean);
  return NextResponse.json(integrations);
}

// POST: Create a new integration
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // Validate input with canonical IntegrationSchema (omit id, created_at, updated_at)
    const parsed = IntegrationSchema.omit({
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
      key: INTEGRATION_PREFIX + id,
      created_at: now,
      updated_at: now,
    });
    await upstashLogger.info('integrations', 'Integration created', {
      integrationId: id,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    await upstashLogger.error(
      'integrations',
      'Integration creation error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PUT: Update an integration
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id)
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    // Validate input with canonical IntegrationSchema (partial for PATCH/PUT)
    const parsed = IntegrationSchema.partial().safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const updated = await adapter
      .from(table, null)
      .update(INTEGRATION_PREFIX + data.id, {
        ...parsed.data,
        updated_at: new Date().toISOString(),
      });
    await upstashLogger.info('integrations', 'Integration updated', {
      integrationId: data.id,
    });
    return NextResponse.json(updated);
  } catch (error) {
    await upstashLogger.error(
      'integrations',
      'Integration update error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE: Remove an integration
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const deleted = await adapter
      .from(table, null)
      .delete(INTEGRATION_PREFIX + id);
    await upstashLogger.info('integrations', 'Integration deleted', {
      integrationId: id,
    });
    return NextResponse.json({ success: deleted });
  } catch (error) {
    await upstashLogger.error(
      'integrations',
      'Integration delete error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

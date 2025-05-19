import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { ModelSchema } from '@/db/supabase/validation';

const table = 'models';
const adapter = createSupabaseClient();

/**
 * GET /api/ai-sdk/models
 * Fetch all models or a single model by id
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const item = await adapter.from(table, null).getById(id);
      if (!item)
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const parsed = ModelSchema.safeParse(item);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.format() },
          { status: 400 }
        );
      }
      return NextResponse.json(parsed.data);
    }
    const items = await adapter.from(table, null).getAll();
    const models = items
      .map((item: unknown) => {
        const parsed = ModelSchema.safeParse(item);
        return parsed.success ? parsed.data : null;
      })
      .filter(Boolean);
    return NextResponse.json(models);
  } catch (error) {
    await upstashLogger.error(
      'models',
      'GET error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-sdk/models
 * Create a new model (schema validated)
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const parsed = ModelSchema.omit({
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
      created_at: now,
      updated_at: now,
    });
    await upstashLogger.info('models', 'Model created', { modelId: id });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    await upstashLogger.error(
      'models',
      'Model creation error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai-sdk/models
 * Update a model (schema validated)
 */
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id)
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const parsed = ModelSchema.partial().safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const updated = await adapter.from(table, null).update(data.id, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    });
    await upstashLogger.info('models', 'Model updated', { modelId: data.id });
    return NextResponse.json(updated);
  } catch (error) {
    await upstashLogger.error(
      'models',
      'Model update error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-sdk/models
 * Delete a model by id
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const deleted = await adapter.from(table, null).delete(id);
    await upstashLogger.info('models', 'Model deleted', { modelId: id });
    return NextResponse.json({ success: deleted });
  } catch (error) {
    await upstashLogger.error(
      'models',
      'Model delete error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

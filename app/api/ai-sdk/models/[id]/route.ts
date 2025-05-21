import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { ModelSchema } from 'types/supabase';

const table = 'models';
const adapter = createSupabaseClient();

/**
 * GET /api/ai-sdk/models/[id]
 * Fetch a single model by id (source of truth: ModelSchema)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
  } catch (error) {
    await upstashLogger.error(
      'models',
      'GET by id error',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai-sdk/models/[id]
 * Update a model by id (source of truth: ModelSchema)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await req.json();
    const parsed = ModelSchema.partial().safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const updated = await adapter.from(table, null).update(id, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    });
    await upstashLogger.info('models', 'Model updated', { modelId: id });
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
 * DELETE /api/ai-sdk/models/[id]
 * Delete a model by id
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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

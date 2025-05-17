import { NextRequest, NextResponse } from 'next/server';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { z } from 'zod';
import { models } from '@/db/supabase/schema';
import { InferModel } from 'drizzle-orm';
import { ModelSettingsSchema } from '@/lib/models/model-registry';

const table = 'models';
const adapter = createSupabaseClient();

/**
 * Type for a model row (from Drizzle schema)
 */
type ModelRow = InferModel<typeof models>;

/**
 * GET /api/ai-sdk/models
 * Fetch all models or a single model by id
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const item = await adapter.from(table).getById(id);
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(item);
    }
    const items = await adapter.from(table).getAll();
    return NextResponse.json(items);
  } catch (error) {
    await upstashLogger.error('models', 'GET error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

/**
 * POST /api/ai-sdk/models
 * Create a new model (type safe, validated)
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // Validate input using Zod schema
    const parsed = ModelSettingsSchema.omit({ id: true, created_at: true, updated_at: true }).parse(data);
    const now = new Date().toISOString();
    // Convert numeric fields to string for DB compatibility
    const toDbString = (v: number | undefined) => v !== undefined ? v.toString() : undefined;
    const created = await adapter.from(table).create({
      ...parsed,
      input_cost_per_token: toDbString(parsed.input_cost_per_token),
      output_cost_per_token: toDbString(parsed.output_cost_per_token),
      default_temperature: toDbString(parsed.default_temperature),
      default_top_p: toDbString(parsed.default_top_p),
      default_frequency_penalty: toDbString(parsed.default_frequency_penalty),
      default_presence_penalty: toDbString(parsed.default_presence_penalty),
      created_at: now,
      updated_at: now
    });
    await upstashLogger.info('models', 'Model created', { modelId: created.id });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    await upstashLogger.error('models', 'Model creation error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

/**
 * PUT /api/ai-sdk/models
 * Update a model (type safe, validated)
 */
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    // Validate input using Zod schema (partial for update)
    const parsed = ModelSettingsSchema.partial().parse(data);
    // Convert numeric fields to string for DB compatibility
    const toDbString = (v: number | undefined) => v !== undefined ? v.toString() : undefined;
    const updated = await adapter.from(table).update(data.id, {
      ...parsed,
      input_cost_per_token: toDbString(parsed.input_cost_per_token),
      output_cost_per_token: toDbString(parsed.output_cost_per_token),
      default_temperature: toDbString(parsed.default_temperature),
      default_top_p: toDbString(parsed.default_top_p),
      default_frequency_penalty: toDbString(parsed.default_frequency_penalty),
      default_presence_penalty: toDbString(parsed.default_presence_penalty),
      updated_at: new Date().toISOString()
    });
    await upstashLogger.info('models', 'Model updated', { modelId: data.id });
    return NextResponse.json(updated);
  } catch (error) {
    await upstashLogger.error('models', 'Model update error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
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
    const deleted = await adapter.from(table).delete(id);
    await upstashLogger.info('models', 'Model deleted', { modelId: id });
    return NextResponse.json({ success: deleted });
  } catch (error) {
    await upstashLogger.error('models', 'Model delete error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
// Generated on 2025-05-17 by ssdeanx

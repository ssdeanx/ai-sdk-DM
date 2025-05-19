import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { handleApiError } from '@/lib/api-error-handler';
import { AppSchema } from '@/db/supabase/validation';
import { apps } from '@/db/supabase/schema';

const adapter = createSupabaseClient();
const table = 'apps';

function isApp(item: unknown): item is z.infer<typeof AppSchema> {
  return AppSchema.safeParse(item).success;
}

/**
 * GET /api/ai-sdk/apps
 * Fetch all apps or a single app by id
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const item = await adapter.from(table, apps).getById(id);
      if (!isApp(item))
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(item);
    }
    const items = await adapter.from(table, apps).getAll();
    const parsed = items.filter(isApp);
    return NextResponse.json(parsed);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/ai-sdk/apps
 * Create a new app (schema validated)
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = AppSchema.omit({
      id: true,
      created_at: true,
      updated_at: true,
    }).parse(raw);
    const now = new Date().toISOString();
    const insertData = {
      ...parsed,
      created_at: now,
      updated_at: now,
    };
    const created = await adapter.from(table, apps).create(insertData);
    if (!isApp(created))
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/ai-sdk/apps
 * Update an app (schema validated)
 */
export async function PUT(req: NextRequest) {
  try {
    const raw = await req.json();
    if (!raw.id)
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const parsed = AppSchema.partial().parse(raw);
    const now = new Date().toISOString();
    const updateData = {
      ...parsed,
      updated_at: now,
      id: raw.id,
    };
    const updated = await adapter
      .from(table, apps)
      .update(updateData.id, updateData);
    if (!isApp(updated))
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/ai-sdk/apps
 * Delete an app by id
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const deleted = await adapter.from(table, apps).delete(id);
    if (!deleted)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

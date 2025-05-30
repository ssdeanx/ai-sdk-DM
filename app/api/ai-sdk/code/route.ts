// API route for CRUD operations on app_code_blocks (AppBuilder code blocks)
import { NextRequest, NextResponse } from 'next/server';
import { getLibSQLClient } from '@/lib/memory/db';
import { getMemoryProvider } from '@/lib/memory/factory';
import { handleApiError } from '@/lib/api-error-handler';
import {
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getData,
  TableRow,
} from '@/lib/memory/upstash/supabase-adapter';
import { AppCodeBlockSchema } from '@/lib/shared/types/libsql';

const table = 'app_code_blocks';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const app_id = searchParams.get('app_id');
    const provider = getMemoryProvider();
    if (provider === 'upstash') {
      if (id) {
        const item = await getItemById<'app_code_blocks'>(table, id);
        if (!item)
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(item);
      }
      if (app_id) {
        // Fetch all items and filter in memory as QueryOptions may not support 'where' for Upstash
        const allItems = await getData<'app_code_blocks'>(table);
        const items = allItems.filter(
          (item: TableRow<'app_code_blocks'>) => item.app_id === app_id
        );
        return NextResponse.json(items);
      }
      const items = await getData<'app_code_blocks'>(table);
      return NextResponse.json(items);
    }
    if (provider === 'libsql') {
      const db = getLibSQLClient();
      if (id) {
        const result = await db.execute({
          sql: 'SELECT * FROM app_code_blocks WHERE id = ?',
          args: [id],
        });
        if (!result.rows.length)
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(result.rows[0]);
      }
      if (app_id) {
        const result = await db.execute({
          sql: 'SELECT * FROM app_code_blocks WHERE app_id = ?',
          args: [app_id],
        });
        return NextResponse.json(result.rows);
      }
      const result = await db.execute({
        sql: 'SELECT * FROM app_code_blocks',
        args: [],
      });
      return NextResponse.json(result.rows);
    }
    return NextResponse.json({ error: 'Invalid provider' }, { status: 500 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const parsed = AppCodeBlockSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const now = new Date().toISOString();
    const provider = getMemoryProvider();
    if (provider === 'upstash') {
      const created = await createItem<'app_code_blocks'>(table, {
        ...parsed.data,
        created_at: now,
        updated_at: now,
      });
      return NextResponse.json(created, { status: 201 });
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    const result = await db.execute({
      sql: 'INSERT INTO app_code_blocks (id, app_id, language, code, description, [order], created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        parsed.data.id ?? null,
        parsed.data.app_id,
        parsed.data.language,
        parsed.data.code,
        parsed.data.description ?? null,
        parsed.data.order ?? 0,
        now,
        now,
      ],
    });
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id)
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const parsed = AppCodeBlockSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const now = new Date().toISOString();
    const provider = getMemoryProvider();
    if (provider === 'upstash') {
      const { id, ...updateData } = parsed.data;
      const updated = await updateItem<'app_code_blocks'>(table, id, {
        ...updateData,
        updated_at: now,
      });
      return NextResponse.json(updated);
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    const result = await db.execute({
      sql: 'UPDATE app_code_blocks SET app_id=?, language=?, code=?, description=?, [order]=?, updated_at=? WHERE id=?',
      args: [
        parsed.data.app_id,
        parsed.data.language,
        parsed.data.code,
        parsed.data.description ?? null,
        parsed.data.order ?? 0,
        now,
        parsed.data.id,
      ],
    });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const provider = getMemoryProvider();
    if (provider === 'upstash') {
      const deleted = await deleteItem<'app_code_blocks'>(table, id);
      return NextResponse.json({ success: deleted });
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    await db.execute({
      sql: 'DELETE FROM app_code_blocks WHERE id = ?',
      args: [id],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
// Generated on 2025-05-17: CRUD API for app_code_blocks table, cross-backend compatible, type-safe, and ready for AppBuilder code block UI integration.

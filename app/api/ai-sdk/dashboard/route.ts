// Dashboard API route for CRUD operations (apps table)
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
  TableInsert,
  TableUpdate,
} from '@/lib/memory/upstash/supabase-adapter';

const table = 'apps';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const provider = getMemoryProvider();
    if (provider === 'upstash') {
      if (id) {
        const item = await getItemById<'apps'>(table, id);
        if (!item)
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(item);
      }
      const items = await getData<'apps'>(table);
      return NextResponse.json(items);
    }
    if (provider === 'libsql') {
      const db = getLibSQLClient();
      if (id) {
        const result = await db.execute({
          sql: 'SELECT * FROM apps WHERE id = ?',
          args: [id],
        });
        if (!result.rows.length)
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(result.rows[0]);
      }
      const result = await db.execute({ sql: 'SELECT * FROM apps', args: [] });
      return NextResponse.json(result.rows);
    }
    return NextResponse.json({ error: 'Invalid provider' }, { status: 500 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as TableInsert<'apps'>;
    const now = new Date().toISOString();
    const provider = getMemoryProvider();
    if (provider === 'upstash') {
      const created = await createItem<'apps'>(table, {
        ...data,
        created_at: now,
        updated_at: now,
      });
      return NextResponse.json(created, { status: 201 });
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    const result = await db.execute({
      sql: 'INSERT INTO apps (id, name, description, type, code, parameters_schema, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        data.id ?? null,
        data.name,
        data.description ?? null,
        data.type,
        data.code,
        data.parameters_schema ?? null,
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
    const data = (await req.json()) as TableUpdate<'apps'> & { id: string };
    if (!data.id)
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const now = new Date().toISOString();
    const provider = getMemoryProvider();
    if (provider === 'upstash') {
      const { id, ...updateData } = data;
      const updated = await updateItem<'apps'>(table, id, {
        ...updateData,
        updated_at: now,
      });
      return NextResponse.json(updated);
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    const result = await db.execute({
      sql: 'UPDATE apps SET name=?, description=?, type=?, code=?, parameters_schema=?, updated_at=? WHERE id=?',
      args: [
        data.name ?? null,
        data.description ?? null,
        data.type ?? null,
        data.code ?? null,
        data.parameters_schema ?? null,
        now,
        data.id,
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
      const deleted = await deleteItem<'apps'>(table, id);
      return NextResponse.json({ success: deleted });
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    await db.execute({ sql: 'DELETE FROM apps WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
// Generated on 2025-05-17: Refactored to use type-safe generics for all CRUD operations on the 'apps' table, removing all 'any' usages.

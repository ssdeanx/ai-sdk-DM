import { handleApiError } from '@/lib/api-error-handler';
import { getLibSQLClient } from '@/lib/memory/db';
import { getMemoryProvider } from '@/lib/memory/factory';
import {
  getData,
  updateItem,
  deleteItem,
} from '@/lib/memory/upstash/supabase-adapter';
import { AppSchema } from '@/lib/shared/types/supabase';

const APPS_PREFIX = 'app:';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) {
      return Response.json({ error: 'Invalid ID' }, { status: 400 });
    }
    const provider = getMemoryProvider();
    if (provider === 'upstash' || provider === 'libsql') {
      const items = await getData('settings', {
        filters: [{ field: 'key', operator: 'eq', value: APPS_PREFIX + id }],
      });
      if (!items || items.length === 0)
        return Response.json({ error: 'Not found' }, { status: 404 });
      // Validate output with canonical AppSchema
      const parsed = AppSchema.safeParse(items[0]);
      if (!parsed.success) {
        return Response.json(
          { error: 'Validation failed', details: parsed.error.format() },
          { status: 400 }
        );
      }
      return Response.json(parsed.data);
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    const result = await db.execute({
      sql: 'SELECT * FROM apps WHERE id = ?',
      args: [id],
    });
    if (!result.rows.length)
      return Response.json({ error: 'Not found' }, { status: 404 });
    const parsed = AppSchema.safeParse(result.rows[0]);
    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }
    return Response.json(parsed.data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    const data = await req.json();
    const now = new Date().toISOString();
    // Validate input with canonical AppSchema (partial for PATCH/PUT)
    const parsed = AppSchema.partial().safeParse(data);
    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const provider = getMemoryProvider();
    if (provider === 'upstash' || provider === 'libsql') {
      await updateItem('settings', APPS_PREFIX + id, {
        value: JSON.stringify(parsed.data),
        updated_at: now,
      });
      return Response.json({ ...parsed.data, updated_at: now });
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    const result = await db.execute({
      sql: 'UPDATE apps SET name=?, description=?, type=?, code=?, parameters_schema=?, updated_at=? WHERE id=?',
      args: [
        typeof parsed.data.name === 'string' ? parsed.data.name : '',
        typeof parsed.data.description === 'string'
          ? parsed.data.description
          : parsed.data.description === null
            ? null
            : '',
        typeof parsed.data.type === 'string' ? parsed.data.type : '',
        typeof parsed.data.code === 'string' ? parsed.data.code : '',
        parsed.data.parameters_schema !== undefined &&
        parsed.data.parameters_schema !== null
          ? JSON.stringify(parsed.data.parameters_schema)
          : null,
        now,
        typeof id === 'string' ? id : '',
      ],
    });
    return Response.json(result.rows[0]);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) {
      return Response.json({ error: 'Invalid ID' }, { status: 400 });
    }
    const provider = getMemoryProvider();
    if (provider === 'upstash' || provider === 'libsql') {
      await deleteItem('settings', APPS_PREFIX + id);
      return Response.json({ success: true });
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    await db.execute({ sql: 'DELETE FROM apps WHERE id = ?', args: [id] });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

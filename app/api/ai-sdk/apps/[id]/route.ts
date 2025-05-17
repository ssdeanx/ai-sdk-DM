import { handleApiError } from '@/lib/api-error-handler';
import { getLibSQLClient } from '@/lib/memory/db';
import { getMemoryProvider } from '@/lib/memory/factory';
import { getData, updateItem, deleteItem } from '@/lib/memory/upstash/supabase-adapter';

const APPS_PREFIX = 'app:';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    const provider = getMemoryProvider();
    if (provider === 'upstash' || provider === 'supabase') {
      const items = await getData('settings', { filters: [{ field: 'key', operator: 'eq', value: APPS_PREFIX + id }] });
      if (!items || items.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json(items[0]);
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    const result = await db.execute({ sql: 'SELECT * FROM apps WHERE id = ?', args: [id] });
    if (!result.rows.length) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(result.rows[0]);
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
    const provider = getMemoryProvider();
    if (provider === 'upstash' || provider === 'supabase') {
      await updateItem('settings', APPS_PREFIX + id, { value: JSON.stringify(data), updated_at: now });
      return Response.json({ ...data, updated_at: now });
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    const result = await db.execute({
      sql: 'UPDATE apps SET name=?, description=?, type=?, code=?, parameters_schema=?, updated_at=? WHERE id=?',
      args: [data.name, data.description, data.type, data.code, data.parameters_schema, now, id]
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
    const provider = getMemoryProvider();
    if (provider === 'upstash' || provider === 'supabase') {
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

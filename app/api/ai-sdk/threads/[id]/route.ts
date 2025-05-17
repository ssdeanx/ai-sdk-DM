import { NextResponse } from 'next/server';
import { getLibSQLClient } from '@/lib/memory/db';
import { handleApiError } from '@/lib/api-error-handler';
import { getMemoryProvider } from '@/lib/memory/factory';
import {
  getItemById,
  updateItem,
  deleteItem,
  getData,
  UpstashAdapterError,
} from '@/lib/memory/upstash/supabase-adapter';

/**
 * GET /api/ai-sdk/threads/[id]
 *
 * Fetch a specific thread and optionally its messages
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const includeMessages = url.searchParams.get('messages') === 'true';
    const messageLimit = parseInt(url.searchParams.get('limit') || '100');
    const provider = getMemoryProvider();
    if (provider === 'upstash') {
      try {
        const thread = await getItemById('memory_threads', id);
        if (!thread) {
          return NextResponse.json(
            { error: 'Thread not found' },
            { status: 404 }
          );
        }
        const formattedThread = {
          id: thread.id,
          name: thread.name,
          metadata: thread.metadata || {},
          createdAt: thread.created_at,
          updatedAt: thread.updated_at,
        };
        if (includeMessages) {
          const messages = await getData('messages', {
            filters: [{ field: 'thread_id', operator: 'eq', value: id }],
            orderBy: { column: 'created_at', ascending: true },
            limit: messageLimit,
          });
          // Format messages
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (formattedThread as any).messages = messages.map((msg) => ({
            id: msg.id,
            threadId: msg.thread_id,
            role: msg.role,
            content: msg.content,
            metadata: msg.metadata || {},
            createdAt: msg.created_at,
          }));
        }
        return NextResponse.json(formattedThread);
      } catch (err) {
        if (!(err instanceof UpstashAdapterError)) throw err;
        // Fallback to LibSQL
      }
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    const threadResult = await db.execute({
      sql: `SELECT * FROM memory_threads WHERE id = ?`,
      args: [id],
    });
    if (threadResult.rows.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }
    const thread = threadResult.rows[0];
    let metadata = {};
    try {
      if (typeof thread.metadata === 'string') {
        metadata = JSON.parse(thread.metadata);
      } else if (
        typeof thread.metadata === 'object' &&
        thread.metadata !== null &&
        !(thread.metadata instanceof ArrayBuffer)
      ) {
        metadata = thread.metadata;
      }
    } catch {
      metadata = {};
    }
    const formattedThread = {
      id: thread.id,
      name: thread.name,
      metadata,
      createdAt: thread.created_at,
      updatedAt: thread.updated_at,
    };
    if (includeMessages) {
      const msgResult = await db.execute({
        sql: `SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC LIMIT ?`,
        args: [id, messageLimit],
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (formattedThread as any).messages = msgResult.rows.map((msg) => {
        let msgMeta = {};
        try {
          if (typeof msg.metadata === 'string') {
            msgMeta = JSON.parse(msg.metadata);
          } else if (
            typeof msg.metadata === 'object' &&
            msg.metadata !== null &&
            !(msg.metadata instanceof ArrayBuffer)
          ) {
            msgMeta = msg.metadata;
          }
        } catch {
          msgMeta = {};
        }
        return {
          id: msg.id,
          threadId: msg.thread_id,
          role: msg.role,
          content: msg.content,
          metadata: msgMeta,
          createdAt: msg.created_at,
        };
      });
    }
    return NextResponse.json(formattedThread);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/ai-sdk/threads/[id]
 *
 * Update a specific thread
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, metadata } = body;
    const provider = getMemoryProvider();
    if (provider === 'upstash') {
      try {
        const thread = await getItemById('memory_threads', id);
        if (!thread) {
          return NextResponse.json(
            { error: 'Thread not found' },
            { status: 404 }
          );
        }
        const existingMetadata = thread.metadata || {};
        const updatedMetadata = metadata
          ? { ...existingMetadata, ...metadata }
          : existingMetadata;
        const now = new Date().toISOString();
        const updated = await updateItem('memory_threads', id, {
          name: name ?? thread.name,
          metadata: updatedMetadata,
          updated_at: now,
        });
        return NextResponse.json({
          id: updated.id,
          name: updated.name,
          metadata: updated.metadata || {},
          createdAt: updated.created_at,
          updatedAt: updated.updated_at,
        });
      } catch (err) {
        if (!(err instanceof UpstashAdapterError)) throw err;
        // Fallback to LibSQL
      }
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    const threadResult = await db.execute({
      sql: `SELECT * FROM memory_threads WHERE id = ?`,
      args: [id],
    });
    if (threadResult.rows.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }
    const thread = threadResult.rows[0];
    let existingMetadata = {};
    try {
      if (typeof thread.metadata === 'string') {
        existingMetadata = JSON.parse(thread.metadata);
      } else if (
        typeof thread.metadata === 'object' &&
        thread.metadata !== null &&
        !(thread.metadata instanceof ArrayBuffer)
      ) {
        existingMetadata = thread.metadata;
      }
    } catch {
      existingMetadata = {};
    }
    const updatedMetadata = metadata
      ? { ...existingMetadata, ...metadata }
      : existingMetadata;
    const now = new Date().toISOString();
    await db.execute({
      sql: `UPDATE memory_threads SET name = ?, metadata = ?, updated_at = ? WHERE id = ?`,
      args: [name ?? thread.name, JSON.stringify(updatedMetadata), now, id],
    });
    return NextResponse.json({
      id: thread.id,
      name: name ?? thread.name,
      metadata: updatedMetadata,
      createdAt: thread.created_at,
      updatedAt: now,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/ai-sdk/threads/[id]
 *
 * Delete a specific thread and all its messages
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const provider = getMemoryProvider();
    if (provider === 'upstash') {
      try {
        const deleted = await deleteItem('memory_threads', id);
        // Optionally delete messages as well (if needed)
        // await deleteItem('messages', { thread_id: id });
        return NextResponse.json({ success: !!deleted });
      } catch (err) {
        if (!(err instanceof UpstashAdapterError)) throw err;
        // Fallback to LibSQL
      }
    }
    // LibSQL fallback
    const db = getLibSQLClient();
    await db.execute({
      sql: `DELETE FROM messages WHERE thread_id = ?`,
      args: [id],
    });
    await db.execute({
      sql: `DELETE FROM memory_threads WHERE id = ?`,
      args: [id],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

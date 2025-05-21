import { NextResponse } from 'next/server';
import { getLibSQLClient } from '@/lib/memory/db';
import { handleApiError } from '@/lib/api-error-handler';
import { getMemoryProvider } from '@/lib/memory/factory';
import {
  getItemById,
  updateItem,
  deleteItem,
  getData,
} from '@/lib/memory/upstash/supabase-adapter';
import { MemoryThreadSchema, MessageSchema } from 'types/libsql';

/**
 * Interface for formatted thread
 */
interface FormattedThread {
  id: string;
  name: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  messages?: Array<{
    id: string;
    threadId: string;
    role: string;
    content: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
}

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
        // Validate thread with canonical schema
        const threadValidation = MemoryThreadSchema.safeParse(thread);
        if (!threadValidation.success) {
          return NextResponse.json(
            { error: threadValidation.error.flatten().fieldErrors },
            { status: 500 }
          );
        }
        // Ensure all fields are strings and metadata is an object
        const formattedThread: FormattedThread = {
          id: String(thread.id ?? ''),
          name: String(thread.name ?? ''),
          metadata: (() => {
            try {
              if (typeof thread.metadata === 'string') {
                return thread.metadata ? JSON.parse(thread.metadata) : {};
              } else if (
                typeof thread.metadata === 'object' &&
                thread.metadata !== null &&
                !(thread.metadata instanceof ArrayBuffer)
              ) {
                return thread.metadata;
              }
            } catch {}
            return {};
          })(),
          createdAt: String(thread.created_at ?? ''),
          updatedAt: String(thread.updated_at ?? ''),
        };
        if (includeMessages) {
          const messages = await getData('messages', {
            filters: [{ field: 'thread_id', operator: 'eq', value: id }],
            orderBy: { column: 'created_at', ascending: true },
            limit: messageLimit,
          });
          // Validate and format messages
          formattedThread.messages = messages
            .map((msg) => {
              const msgValidation = MessageSchema.safeParse(msg);
              if (!msgValidation.success) return null;
              let msgMeta: Record<string, unknown> = {};
              try {
                if (typeof msg.metadata === 'string') {
                  msgMeta = msg.metadata ? JSON.parse(msg.metadata) : {};
                } else if (
                  typeof msg.metadata === 'object' &&
                  msg.metadata !== null &&
                  !(msg.metadata instanceof ArrayBuffer)
                ) {
                  msgMeta = msg.metadata;
                }
              } catch {}
              return {
                id: String(msg.id ?? ''),
                threadId: String(msg.memory_thread_id ?? ''),
                role: String(msg.role ?? ''),
                content: String(msg.content ?? ''),
                metadata: msgMeta,
                createdAt: String(msg.created_at ?? ''),
              };
            })
            .filter((m): m is NonNullable<typeof m> => m !== null);
        }
        return NextResponse.json(formattedThread);
      } catch (err) {
        if (!(err instanceof Error)) throw err;
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
    // Ensure all fields are strings and metadata is an object
    const formattedThread: FormattedThread = {
      id: String(thread.id ?? ''),
      name: String(thread.name ?? ''),
      metadata: (() => {
        try {
          if (typeof thread.metadata === 'string') {
            return thread.metadata ? JSON.parse(thread.metadata) : {};
          } else if (
            typeof thread.metadata === 'object' &&
            thread.metadata !== null &&
            !(thread.metadata instanceof ArrayBuffer)
          ) {
            return thread.metadata;
          }
        } catch {}
        return {};
      })(),
      createdAt: String(thread.created_at ?? ''),
      updatedAt: String(thread.updated_at ?? ''),
    };
    if (includeMessages) {
      const msgResult = await db.execute({
        sql: `SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC LIMIT ?`,
        args: [id, messageLimit],
      });
      formattedThread.messages = msgResult.rows
        .map((msg) => {
          const msgValidation = MessageSchema.safeParse(msg);
          if (!msgValidation.success) return null;
          let msgMeta: Record<string, unknown> = {};
          try {
            if (typeof msg.metadata === 'string') {
              msgMeta = msg.metadata ? JSON.parse(msg.metadata) : {};
            } else if (
              typeof msg.metadata === 'object' &&
              msg.metadata !== null &&
              !(msg.metadata instanceof ArrayBuffer)
            ) {
              msgMeta = msg.metadata;
            }
          } catch {}
          return {
            id: String(msg.id ?? ''),
            threadId: String(msg.memory_thread_id ?? ''),
            role: String(msg.role ?? ''),
            content: String(msg.content ?? ''),
            metadata: msgMeta,
            createdAt: String(msg.created_at ?? ''),
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);
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
        // Validate updated thread
        const updatedValidation = MemoryThreadSchema.safeParse(updated);
        if (!updatedValidation.success) {
          return NextResponse.json(
            { error: updatedValidation.error.flatten().fieldErrors },
            { status: 500 }
          );
        }
        return NextResponse.json({
          id: updated.id,
          name: updated.name,
          metadata: updated.metadata || {},
          createdAt: updated.created_at,
          updatedAt: updated.updated_at,
        });
      } catch (err) {
        if (!(err instanceof Error)) throw err;
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
    // Validate updated thread
    const updatedThread = {
      ...thread,
      name: name ?? thread.name,
      metadata: updatedMetadata,
      updated_at: now,
    };
    const updatedValidation = MemoryThreadSchema.safeParse(updatedThread);
    if (!updatedValidation.success) {
      return NextResponse.json(
        { error: updatedValidation.error.flatten().fieldErrors },
        { status: 500 }
      );
    }
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
        if (!(err instanceof Error)) throw err;
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

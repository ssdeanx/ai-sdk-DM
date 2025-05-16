import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { logEvent } from "@/lib/langfuse-integration";
import { generateId } from "ai";
import { upstashLogger } from "@/lib/memory/upstash/upstash-logger";
import { getMemoryProvider } from "@/lib/memory/factory";
import {
  getItemById,
  getData,
  createItem,
  updateItem
} from "@/lib/memory/upstash/supabase-adapter";
import { getLibSQLClient } from "@/lib/memory/db";

/**
 * GET /api/ai-sdk/threads/[id]/messages
 * 
 * Fetch messages for a specific thread
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const provider = getMemoryProvider();
    let messages: unknown[] = [];
    let count = 0;
    let useLibSQL = false;

    if (provider === "upstash") {
      try {
        const thread = await getItemById("memory_threads", id);
        if (!thread) {
          return NextResponse.json({ error: "Thread not found" }, { status: 404 });
        }

        messages = await getData("messages", {
          filters: [{ field: "thread_id", operator: "eq", value: id }],
          orderBy: { column: "created_at", ascending: true },
          limit,
          offset
        });

        count = (await getData("messages", {
          filters: [{ field: "thread_id", operator: "eq", value: id }]
        })).length;
      } catch {
        useLibSQL = true;
      }
    } else {
      useLibSQL = true;
    }

    if (useLibSQL) {
      const db = getLibSQLClient();

      const threadResult = await db.execute({
        sql: `SELECT id FROM memory_threads WHERE id = ?`,
        args: [id]
      });

      if (threadResult.rows.length === 0) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }

      const messagesResult = await db.execute({
        sql: `SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?`,
        args: [id, limit, offset]
      });

      messages = messagesResult.rows.map((msg) => {
        let metadata = {};
        try {
          metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata || {};
        } catch {
          // ignore
        }
        return {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          metadata,
          tokenCount: msg.token_count,
          createdAt: msg.created_at
        };
      });

      const countResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM messages WHERE thread_id = ?`,
        args: [id]
      });

      count = Number(countResult.rows[0].count ?? 0);
    } else {
      // Format messages for Upstash
      messages = Array.isArray(messages)
        ? messages.map((msg) => {
            if (typeof msg !== 'object' || msg === null) return msg;
            const m = msg as Record<string, unknown>;
            let metadata: Record<string, unknown> = {};
            try {
              metadata = typeof m.metadata === 'string' ? JSON.parse(m.metadata as string) : m.metadata || {};
            } catch {
              // ignore
            }
            return {
              id: m.id,
              role: m.role,
              content: m.content,
              metadata,
              tokenCount: m.token_count,
              createdAt: m.created_at
            };
          })
        : [];
    }

    return NextResponse.json({
      messages,
      count,
      hasMore: messages.length === limit
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/ai-sdk/threads/[id]/messages
 * 
 * Add a message to a specific thread
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { role, content, metadata = {} } = body;

    // Validate required fields
    if (!role || !content) {
      return NextResponse.json(
        { error: "Role and content are required" },
        { status: 400 }
      );
    }

    const provider = getMemoryProvider();
    let useLibSQL = false;
    const messageId = generateId();
    const now = new Date().toISOString();

    const messageMetadata = {
      ...metadata,
      source: 'ai-sdk-ui',
      timestamp: now
    };

    if (provider === "upstash") {
      try {
        const thread = await getItemById("memory_threads", id);
        if (!thread) {
          return NextResponse.json({ error: "Thread not found" }, { status: 404 });
        }

        await createItem("messages", {
          id: messageId,
          thread_id: id,
          role,
          content,
          metadata: JSON.stringify(messageMetadata),
          created_at: now
        });

        await updateItem("memory_threads", id, { updated_at: now });
      } catch {
        useLibSQL = true;
      }
    } else {
      useLibSQL = true;
    }

    if (useLibSQL) {
      const db = getLibSQLClient();

      const threadResult = await db.execute({
        sql: `SELECT id FROM memory_threads WHERE id = ?`,
        args: [id]
      });

      if (threadResult.rows.length === 0) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }

      await db.execute({
        sql: `INSERT INTO messages (id, thread_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [messageId, id, role, content, JSON.stringify(messageMetadata), now]
      });

      await db.execute({
        sql: `UPDATE memory_threads SET updated_at = ? WHERE id = ?`,
        args: [now, id]
      });
    }

    await logEvent({
      traceId: messageId,
      name: "message_created",
      metadata: {
        messageId,
        threadId: id,
        role,
        timestamp: now
      }
    });

    await upstashLogger.info('threads', 'Message created', { messageId, threadId: id, role });

    return NextResponse.json({
      id: messageId,
      threadId: id,
      role,
      content,
      metadata: messageMetadata,
      createdAt: now
    });
  } catch (error) {
    await upstashLogger.error('threads', 'Message creation error', error instanceof Error ? error : new Error(String(error)));
    return handleApiError(error);
  }
}

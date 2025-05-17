import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { generateId } from 'ai';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { getMemoryProvider } from '@/lib/memory/factory';
import { getData, createItem, type TableRow, type QueryOptions, type FilterOptions } from '@/lib/memory/upstash/supabase-adapter';

/**
 * GET /api/ai-sdk/threads
 * 
 * Fetch all threads for AI SDK UI
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const provider = getMemoryProvider();
    let threads: Array<TableRow<'memory_threads'>> = [];
    let count = 0;
    let hasMore = false;

    if (provider === 'upstash') {
      try {
        // Upstash: get threads with source 'ai-sdk-ui'
        const filters: FilterOptions[] = [
          { field: 'metadata.source', operator: 'eq', value: 'ai-sdk-ui' }
        ];
        if (search) {
          filters.push({ field: 'name', operator: 'ilike', value: `%${search}%` });
        }
        const options: QueryOptions = { filters, limit, offset, orderBy: { column: 'updated_at', ascending: false } };
        const upstashThreads = await getData('memory_threads', options);
        threads = upstashThreads.map((thread) => ({
          id: thread.id,
          user_id: thread.user_id ?? null,
          agent_id: thread.agent_id ?? null,
          name: thread.name,
          summary: thread.summary ?? null,
          metadata: thread.metadata,
          created_at: thread.created_at,
          updated_at: thread.updated_at
        }));
        // Upstash: get total count
        const allThreads = await getData('memory_threads', { filters: [{ field: 'metadata.source', operator: 'eq', value: 'ai-sdk-ui' }] });
        count = allThreads.length;
        hasMore = threads.length === limit;
        return NextResponse.json({ threads, count, hasMore });
      } catch (err) {
        // Fallback to LibSQL if Upstash fails
        if (typeof err === 'object' && err && 'name' in err && (err as { name: string }).name !== 'UpstashAdapterError') throw err;
      }
    }

    // LibSQL fallback
    const db = getLibSQLClient();
    let sql = `
      SELECT 
        t.id, t.user_id, t.agent_id, t.name, t.summary, t.metadata, t.created_at, t.updated_at,
        (SELECT COUNT(*) FROM messages WHERE memory_thread_id = t.id) as message_count
      FROM memory_threads t
    `;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args: any[] = [];
    sql += ` WHERE json_extract(t.metadata, '$.source') = 'ai-sdk-ui'`;
    if (search) {
      sql += ` AND t.name LIKE ?`;
      args.push(`%${search}%`);
    }
    sql += ` ORDER BY t.updated_at DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);
    const result = await db.execute({ sql, args });
    threads = result.rows.map((thread) => {
      let parsedMetadata: Record<string, unknown> = {};
      if (typeof thread.metadata === 'string') {
        try {
          parsedMetadata = JSON.parse(thread.metadata);
        } catch {
          parsedMetadata = {};
        }
      } else if (
        typeof thread.metadata === 'object' &&
        thread.metadata !== null &&
        !(thread.metadata instanceof ArrayBuffer)
      ) {
        parsedMetadata = thread.metadata as Record<string, unknown>;
      }
      // Normalize all fields to string/null as needed
      const normalize = (v: unknown): string | null => {
        if (typeof v === 'string') return v;
        if (v === null || v === undefined) return null;
        if (typeof v === 'number' || typeof v === 'bigint') return v.toString();
        if (v instanceof ArrayBuffer) return null;
        return String(v);
      };
      // Only include message_count in the response, not in the TableRow type
      return {
        id: normalize(thread.id) ?? '',
        user_id: normalize(thread.user_id),
        agent_id: normalize(thread.agent_id),
        name: normalize(thread.name) ?? '',
        summary: normalize(thread.summary),
        metadata: parsedMetadata as unknown as import('@/types/supabase').Json, // Cast to Json type
        created_at: normalize(thread.created_at) ?? '',
        updated_at: normalize(thread.updated_at) ?? '',
        message_count: typeof thread.message_count === 'number' ? thread.message_count : Number(thread.message_count) || 0
      };
    });
    const countQueryResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM memory_threads WHERE json_extract(metadata, '$.source') = 'ai-sdk-ui'`,
      args: []
    });
    count = Number(countQueryResult.rows[0].count) || 0;
    hasMore = threads.length === limit;
    return NextResponse.json({ threads, count, hasMore });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/ai-sdk/threads
 * 
 * Create a new thread for AI SDK UI
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name = 'New Chat', metadata = {} } = body;
    const provider = getMemoryProvider();
    const id = generateId();
    const now = new Date().toISOString();
    const threadMetadata = { ...metadata, source: 'ai-sdk-ui', created_at: now };

    if (provider === 'upstash') {
      try {
        await createItem('memory_threads', {
          id,
          name,
          metadata: threadMetadata,
          created_at: now,
          updated_at: now
        });
        await upstashLogger.info('threads', 'Thread created', { threadId: id, name });
        return NextResponse.json({ id, name, metadata: threadMetadata, createdAt: now, updatedAt: now });
      } catch (err) {
        if (!(err instanceof Error)) throw err;
        // Fallback to LibSQL
      }
    }

    // LibSQL fallback
    const db = getLibSQLClient();
    await db.execute({
      sql: `INSERT INTO memory_threads (id, name, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?)` ,
      args: [id, name, JSON.stringify(threadMetadata), now, now]
    });
    await upstashLogger.info('threads', 'Thread created', { threadId: id, name });
    return NextResponse.json({ id, name, metadata: threadMetadata, createdAt: now, updatedAt: now });
  } catch (error) {
    await upstashLogger.error('threads', 'Thread creation error', error instanceof Error ? error : new Error(String(error)));
    return handleApiError(error);
  }
}

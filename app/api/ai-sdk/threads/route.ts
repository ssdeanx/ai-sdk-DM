import { NextResponse } from 'next/server';
import { getLibSQLClient } from '@/lib/memory/db';
import { handleApiError } from '@/lib/api-error-handler';
import { generateId } from 'ai';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { getMemoryProvider } from '@/lib/memory/factory';
import { getData, createItem } from '@/lib/memory/upstash/supabase-adapter';
import { z } from 'zod';
import { MemoryThreadSchema } from 'types/libsql';

/**
 * GET /api/ai-sdk/threads
 *
 * Fetch all threads for AI SDK UI
 * Supports LibSQL (primary) and Upstash (fallback) adapters.
 */
const QuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = QuerySchema.parse({
      search: url.searchParams.get('search') || undefined,
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
    });
    const provider = getMemoryProvider();
    let threads: unknown[] = [];
    let count = 0;
    let hasMore = false;

    if (provider === 'libsql') {
      // LibSQL: Use listMemoryThreads (with pagination)
      const memoryMod = await import('@/lib/memory/memory');
      threads = await memoryMod.listMemoryThreads({
        limit: query.limit,
        offset: query.offset,
      });
      count = threads.length;
      hasMore = count === query.limit;
    } else if (provider === 'upstash') {
      // Upstash: Use getData for memory_threads
      try {
        threads = await getData('memory_threads', {
          limit: query.limit,
          offset: query.offset,
        });
        count = threads.length;
        hasMore = count === query.limit;
      } catch (err) {
        await upstashLogger.error(
          'threads',
          'Upstash getData error: ' +
            (err instanceof Error ? err.message : String(err))
        );
        // Fallback to LibSQL
        const memoryMod = await import('@/lib/memory/memory');
        threads = await memoryMod.listMemoryThreads({
          limit: query.limit,
          offset: query.offset,
        });
        count = threads.length;
        hasMore = count === query.limit;
      }
    } else {
      throw new Error('No valid memory provider configured');
    }

    // Validate threads array
    const validated = z.array(MemoryThreadSchema).safeParse(threads);
    if (!validated.success) {
      await upstashLogger.error(
        'threads',
        'Thread validation failed: ' + validated.error.message
      );
      return new Response(
        JSON.stringify({
          error: 'Thread validation failed',
          details: validated.error.errors,
        }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ threads: validated.data, count, hasMore }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    await upstashLogger.error(
      'threads',
      'Failed to fetch threads: ' +
        (error instanceof Error ? error.message : String(error))
    );
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch threads',
        details: error instanceof Error ? error.message : error,
      }),
      { status: 500 }
    );
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
    const threadMetadata = {
      ...metadata,
      source: 'ai-sdk-ui',
      created_at: now,
    };

    if (provider === 'upstash') {
      try {
        await createItem('memory_threads', {
          id,
          name,
          metadata: threadMetadata,
          created_at: now,
          updated_at: now,
        });
        await upstashLogger.info('threads', 'Thread created', {
          threadId: id,
          name,
        });
        return NextResponse.json({
          id,
          name,
          metadata: threadMetadata,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        if (!(err instanceof Error)) throw err;
        // Fallback to LibSQL
      }
    }

    // LibSQL fallback
    const db = getLibSQLClient();
    await db.execute({
      sql: `INSERT INTO memory_threads (id, name, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      args: [id, name, JSON.stringify(threadMetadata), now, now],
    });
    await upstashLogger.info('threads', 'Thread created', {
      threadId: id,
      name,
    });
    return NextResponse.json({
      id,
      name,
      metadata: threadMetadata,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    await upstashLogger.error(
      'threads',
      'Thread creation error',
      error instanceof Error ? error : new Error(String(error))
    );
    return handleApiError(error);
  }
}

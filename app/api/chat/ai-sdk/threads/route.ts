import { NextResponse } from 'next/server';
import { createMemory } from '@/lib/memory/factory';
import { handleApiError } from '@/lib/api-error-handler';
import { z } from 'zod';

// Define schemas for validation
const ThreadQuerySchema = z.object({
  limit: z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const CreateThreadSchema = z.object({
  name: z.string().optional().default('New Chat'),
});

// Create memory instance using the factory
const memory = createMemory();

/**
 * GET /api/chat/ai-sdk/threads
 *
 * Fetch all AI SDK chat threads
 */
/**
 * GET /api/chat/ai-sdk/threads
 *
 * Retrieves a list of AI SDK chat threads with pagination support
 *
 * @param request - The incoming HTTP request
 * @returns A JSON response containing:
 * - threads: Formatted list of AI SDK chat threads
 * - count: Total number of threads returned
 * - hasMore: Indicates if more threads are available for pagination
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // Validate and parse query parameters using Zod
    const queryResult = ThreadQuerySchema.safeParse({
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { limit, offset } = queryResult.data;

    // Get threads with AI SDK UI metadata using memory factory
    const threads = await memory.listMemoryThreads({
      limit,
      offset,
    });

    // Use the imported MemoryThread type

    // Filter and sort threads in code
    const filteredThreads = threads
      .filter((thread) => {
        let parsedMetadata: Record<string, unknown> = {};

        if (typeof thread.metadata === 'string') {
          try {
            parsedMetadata = JSON.parse(thread.metadata);
          } catch {
            parsedMetadata = {};
          }
        } else if (thread.metadata) {
          parsedMetadata = thread.metadata;
        }

        return parsedMetadata.source === 'ai-sdk-ui';
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

    // Format threads for the client
    const formattedThreads = filteredThreads.map((thread) => {
      let parsedMetadata: Record<string, unknown> = {};

      if (thread.metadata) {
        if (typeof thread.metadata === 'string') {
          try {
            parsedMetadata = JSON.parse(thread.metadata);
          } catch {
            // If parsing fails, use empty object
            parsedMetadata = {};
          }
        } else {
          parsedMetadata = thread.metadata;
        }
      }

      return {
        id: thread.id,
        name: thread.name || 'Untitled Chat',
        createdAt: thread.created_at,
        updatedAt: thread.updated_at,
        metadata: parsedMetadata,
      };
    });

    return NextResponse.json({
      threads: formattedThreads,
      count: formattedThreads.length,
      hasMore: formattedThreads.length === limit,
    });
  } catch (error: unknown) {
    // Handle Upstash-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const errorObj = error as { name: string; message?: string };
      if (
        errorObj.name === 'RedisStoreError' ||
        errorObj.name === 'UpstashClientError'
      ) {
        return NextResponse.json(
          { error: `Upstash error: ${errorObj.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Use the generic API error handler for other errors
    return handleApiError(error);
  }
}

/**
 * POST /api/chat/ai-sdk/threads
 *
 * Create a new AI SDK chat thread
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body using Zod
    const bodyResult = CreateThreadSchema.safeParse(body);

    if (!bodyResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyResult.error.format() },
        { status: 400 }
      );
    }

    const { name } = bodyResult.data;

    // Create a new thread with AI SDK UI metadata
    const threadId = await memory.createMemoryThread(name, {
      metadata: {
        source: 'ai-sdk-ui',
        created_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      id: threadId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    // Handle Upstash-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const errorObj = error as { name: string; message?: string };
      if (
        errorObj.name === 'RedisStoreError' ||
        errorObj.name === 'UpstashClientError'
      ) {
        return NextResponse.json(
          { error: `Upstash error: ${errorObj.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Use the generic API error handler for other errors
    return handleApiError(error);
  }
}

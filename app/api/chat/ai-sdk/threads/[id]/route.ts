import { NextResponse } from 'next/server';
import { createMemory } from '@/lib/memory/factory';
import { handleApiError } from '@/lib/api-error-handler';
import { z } from 'zod';

// Define schemas for validation
const ThreadParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid thread ID format' }),
});

const UpdateThreadSchema = z.object({
  name: z.string().min(1, { message: 'Thread name cannot be empty' }),
});

// Create memory instance using the factory
const memory = createMemory();

/**
 * GET /api/chat/ai-sdk/threads/[id]
 *
 * Fetch a specific AI SDK chat thread and its messages
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate thread ID
    const paramsResult = ThreadParamsSchema.safeParse(params);
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Invalid thread ID', details: paramsResult.error.format() },
        { status: 400 }
      );
    }

    const { id } = paramsResult.data;
    const url = new URL(request.url);
    const includeMessages = url.searchParams.get('messages') === 'true';

    // Get thread details
    const thread = await memory.getMemoryThread(id);

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Format thread for the client
    const formattedThread = {
      id: thread.id,
      name: thread.name,
      createdAt: thread.created_at,
      updatedAt: thread.updated_at,
      metadata: thread.metadata
        ? typeof thread.metadata === 'string'
          ? JSON.parse(thread.metadata)
          : thread.metadata
        : {},
    };

    // Include messages if requested
    if (includeMessages) {
      const messages = await memory.loadMessages(id);

      // Format messages for the client
      const formattedMessages = messages.map((message) => ({
        id: message.id || '',
        role: message.role,
        content: message.content,
        createdAt: message.created_at || new Date().toISOString(),
        metadata: message.metadata
          ? typeof message.metadata === 'string'
            ? JSON.parse(message.metadata)
            : message.metadata
          : {},
      }));
      return NextResponse.json({
        ...formattedThread,
        messages: formattedMessages,
      });
    }

    return NextResponse.json(formattedThread);
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
 * PATCH /api/chat/ai-sdk/threads/[id]
 *
 * Update a specific AI SDK chat thread
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate thread ID
    const paramsResult = ThreadParamsSchema.safeParse(params);
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Invalid thread ID', details: paramsResult.error.format() },
        { status: 400 }
      );
    }

    const { id } = paramsResult.data;

    // Validate request body
    const body = await request.json();
    const bodyResult = UpdateThreadSchema.safeParse(body);

    if (!bodyResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyResult.error.format() },
        { status: 400 }
      );
    }

    const { name } = bodyResult.data;

    // Get thread details
    const thread = await memory.getMemoryThread(id);

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Update thread using memory factory
    await memory.updateMemoryThread(id, {
      name,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      id,
      name,
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

/**
 * DELETE /api/chat/ai-sdk/threads/[id]
 *
 * Delete a specific AI SDK chat thread
 */
export async function DELETE(
  _request: Request, // Prefix with underscore to indicate it's not used
  { params }: { params: { id: string } }
) {
  try {
    // Validate thread ID
    const paramsResult = ThreadParamsSchema.safeParse(params);
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Invalid thread ID', details: paramsResult.error.format() },
        { status: 400 }
      );
    }

    const { id } = paramsResult.data;

    // Delete the thread using memory factory
    const success = await memory.deleteMemoryThread(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete thread' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
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

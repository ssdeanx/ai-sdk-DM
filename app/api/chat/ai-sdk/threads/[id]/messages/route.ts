import { NextResponse } from 'next/server';
import { createMemory } from '@/lib/memory/factory';
import { handleApiError } from '@/lib/api-error-handler';
import { z } from 'zod';

// Define schemas for validation
const ThreadParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid thread ID format' }),
});

const MessageQuerySchema = z.object({
  limit: z.coerce.number().int().positive().default(100),
});

const MessageRoleEnum = z.enum(['user', 'assistant', 'system', 'tool']);

const CreateMessageSchema = z.object({
  role: MessageRoleEnum,
  content: z.string().min(1, { message: 'Message content cannot be empty' }),
  metadata: z.record(z.unknown()).optional().default({}),
});

// Create memory instance using the factory
const memory = createMemory();

/**
 * GET /api/chat/ai-sdk/threads/[id]/messages
 *
 * Fetch messages for a specific AI SDK chat thread
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

    // Validate query parameters
    const url = new URL(request.url);
    const queryResult = MessageQuerySchema.safeParse({
      limit: url.searchParams.get('limit'),
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

    const { limit } = queryResult.data;

    // Load messages for the thread using memory factory
    const messages = await memory.loadMessages(id, limit);

    // Format messages for the client
    const formattedMessages = messages.map((message) => {
      let parsedMetadata: Record<string, unknown> = {};

      if (message.metadata) {
        if (typeof message.metadata === 'string') {
          try {
            parsedMetadata = JSON.parse(message.metadata);
          } catch {
            // If parsing fails, use empty object
            parsedMetadata = {};
          }
        } else {
          parsedMetadata = message.metadata;
        }
      }

      return {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at,
        metadata: parsedMetadata,
      };
    });

    return NextResponse.json({
      messages: formattedMessages,
      count: formattedMessages.length,
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
 * POST /api/chat/ai-sdk/threads/[id]/messages
 *
 * Add a message to a specific AI SDK chat thread
 */
export async function POST(
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
    const bodyResult = CreateMessageSchema.safeParse(body);

    if (!bodyResult.success) {
      return NextResponse.json(
        { error: 'Invalid message data', details: bodyResult.error.format() },
        { status: 400 }
      );
    }

    const { role, content, metadata } = bodyResult.data;

    // Save the message using memory factory
    const messageId = await memory.saveMessage(
      id,
      role as 'user' | 'assistant' | 'system' | 'tool',
      content,
      {
        count_tokens: true,
        generate_embeddings: role === 'assistant', // Generate embeddings for assistant messages
        metadata: {
          ...metadata,
          source: 'ai-sdk-ui',
          timestamp: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      id: messageId,
      role,
      content,
      createdAt: new Date().toISOString(),
      metadata: {
        ...metadata,
        source: 'ai-sdk-ui',
        timestamp: new Date().toISOString(),
      },
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

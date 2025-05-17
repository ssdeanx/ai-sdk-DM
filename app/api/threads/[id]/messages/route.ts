import { NextResponse } from 'next/server';
import { loadMessages, saveMessage } from '@/lib/memory/memory';

// GET /api/threads/[id]/messages - Get messages for a thread
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const thread_id = params.id;
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit')
      ? Number.parseInt(url.searchParams.get('limit')!)
      : undefined;

    const messages = await loadMessages(thread_id, limit);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error(`Error getting messages for thread ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}

// POST /api/threads/[id]/messages - Add a message to a thread
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const thread_id = params.id;
    const body = await request.json();
    const {
      role,
      content,
      tool_call_id,
      tool_name,
      generate_embeddings,
      count_tokens,
      metadata,
      model_name,
    } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: 'Role and content are required' },
        { status: 400 }
      );
    }

    const message_id = await saveMessage(thread_id, role, content, {
      tool_call_id,
      tool_name,
      generate_embeddings,
      count_tokens,
      metadata,
      model_name,
    });

    return NextResponse.json({
      id: message_id,
      thread_id,
      role,
      content,
      tool_call_id,
      tool_name,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error adding message to thread ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}

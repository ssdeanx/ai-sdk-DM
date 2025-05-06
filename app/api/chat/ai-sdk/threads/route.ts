import { NextResponse } from "next/server";
import { listMemoryThreads, getMemoryThread, deleteMemoryThread } from "@/lib/memory/memory";
import { memory } from "@/lib/memory/factory";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * GET /api/chat/ai-sdk/threads
 * 
 * Fetch all AI SDK chat threads
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    
    // Get threads with AI SDK UI metadata
    const threads = await listMemoryThreads({
      filters: {
        metadata: { source: 'ai-sdk-ui' }
      },
      limit,
      offset,
      orderBy: { column: 'updated_at', ascending: false }
    });
    
    // Format threads for the client
    const formattedThreads = threads.map(thread => ({
      id: thread.id,
      name: thread.name,
      createdAt: thread.created_at,
      updatedAt: thread.updated_at,
      metadata: thread.metadata ? 
        (typeof thread.metadata === 'string' ? JSON.parse(thread.metadata) : thread.metadata) 
        : {}
    }));
    
    return NextResponse.json({
      threads: formattedThreads,
      count: formattedThreads.length,
      hasMore: formattedThreads.length === limit
    });
  } catch (error) {
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
    const { name = 'New Chat' } = body;
    
    // Create a new thread with AI SDK UI metadata
    const threadId = await memory.createMemoryThread(name, {
      metadata: {
        source: 'ai-sdk-ui',
        created_at: new Date().toISOString()
      }
    });
    
    return NextResponse.json({
      id: threadId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    return handleApiError(error);
  }
}

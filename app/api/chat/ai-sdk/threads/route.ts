import { NextResponse } from "next/server";
import { listMemoryThreads } from "@/lib/memory/memory";
import { memory } from "@/lib/memory/factory";
import { handleApiError } from "@/lib/api-error-handler";

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
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    
    // Get threads with AI SDK UI metadata
    const threads = await listMemoryThreads({
      limit,
      offset
    });

    // Filter and sort threads in code
    const filteredThreads = threads
      .filter(thread => {
        const metadata = typeof thread.metadata === 'string'
          ? JSON.parse(thread.metadata)
          : thread.metadata || {};
        return metadata.source === 'ai-sdk-ui';
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    // Format threads for the client
    const formattedThreads = filteredThreads.map(thread => ({
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

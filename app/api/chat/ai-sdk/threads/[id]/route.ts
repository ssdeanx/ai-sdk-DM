import { NextResponse } from "next/server";
import { getMemoryThread, deleteMemoryThread, loadMessages } from "@/lib/memory/memory";
import { memory } from "@/lib/memory/factory";
import { handleApiError } from "@/lib/api-error-handler";

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
    const { id } = params;
    const url = new URL(request.url);
    const includeMessages = url.searchParams.get("messages") === "true";
    
    // Get thread details
    const thread = await getMemoryThread(id);
    
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    
    // Format thread for the client
    const formattedThread = {
      id: thread.id,
      name: thread.name,
      createdAt: thread.created_at,
      updatedAt: thread.updated_at,
      metadata: thread.metadata ? 
        (typeof thread.metadata === 'string' ? JSON.parse(thread.metadata) : thread.metadata) 
        : {}
    };
    
    // Include messages if requested
    if (includeMessages) {
      const messages = await loadMessages(id);
      
      // Format messages for the client
      const formattedMessages = messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at,
        metadata: message.metadata ? 
          (typeof message.metadata === 'string' ? JSON.parse(message.metadata) : message.metadata) 
          : {}
      }));
      
      return NextResponse.json({
        ...formattedThread,
        messages: formattedMessages
      });
    }
    
    return NextResponse.json(formattedThread);
  } catch (error) {
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
    const { id } = params;
    const body = await request.json();
    const { name } = body;
    
    // Get thread details
    const thread = await getMemoryThread(id);
    
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    
    // Update thread name in LibSQL
    const db = await import("@/lib/memory/db").then(m => m.getLibSQLClient());
    
    await db.execute({
      sql: `
        UPDATE memory_threads
        SET name = ?, updated_at = datetime('now')
        WHERE id = ?
      `,
      args: [name, id]
    });
    
    return NextResponse.json({
      id,
      name,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/chat/ai-sdk/threads/[id]
 * 
 * Delete a specific AI SDK chat thread
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Delete the thread
    const success = await deleteMemoryThread(id);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

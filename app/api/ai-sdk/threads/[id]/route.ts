import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";

/**
 * GET /api/ai-sdk/threads/[id]
 * 
 * Fetch a specific thread and optionally its messages
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const includeMessages = url.searchParams.get("messages") === "true";
    const messageLimit = parseInt(url.searchParams.get("limit") || "100");
    
    const db = getLibSQLClient();
    
    // Get thread
    const threadResult = await db.execute({
      sql: `SELECT * FROM memory_threads WHERE id = ?`,
      args: [id]
    });
    
    if (threadResult.rows.length === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    
    const thread = threadResult.rows[0];
    
    // Parse metadata
    let metadata = {};
    try {
      metadata = typeof thread.metadata === 'string' 
        ? JSON.parse(thread.metadata) 
        : thread.metadata || {};
    } catch (e) {
      console.error('Error parsing thread metadata:', e);
    }
    
    // Format thread
    const formattedThread = {
      id: thread.id,
      name: thread.name,
      metadata,
      createdAt: thread.created_at,
      updatedAt: thread.updated_at
    };
    
    // Include messages if requested
    if (includeMessages) {
      const messagesResult = await db.execute({
        sql: `
          SELECT * FROM messages 
          WHERE memory_thread_id = ? 
          ORDER BY created_at ASC
          LIMIT ?
        `,
        args: [id, messageLimit]
      });
      
      // Format messages
      const messages = messagesResult.rows.map((msg: any) => {
        let metadata = {};
        try {
          metadata = typeof msg.metadata === 'string' 
            ? JSON.parse(msg.metadata) 
            : msg.metadata || {};
        } catch (e) {
          console.error('Error parsing message metadata:', e);
        }
        
        return {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          metadata,
          createdAt: msg.created_at
        };
      });
      
      return NextResponse.json({
        ...formattedThread,
        messages,
        messageCount: messages.length
      });
    }
    
    return NextResponse.json(formattedThread);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/ai-sdk/threads/[id]
 * 
 * Update a specific thread
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, metadata } = body;
    
    const db = getLibSQLClient();
    
    // Check if thread exists
    const threadResult = await db.execute({
      sql: `SELECT * FROM memory_threads WHERE id = ?`,
      args: [id]
    });
    
    if (threadResult.rows.length === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    
    const thread = threadResult.rows[0];
    
    // Parse existing metadata
    let existingMetadata = {};
    try {
      existingMetadata = typeof thread.metadata === 'string' 
        ? JSON.parse(thread.metadata) 
        : thread.metadata || {};
    } catch (e) {
      console.error('Error parsing thread metadata:', e);
    }
    
    // Merge metadata if provided
    const updatedMetadata = metadata 
      ? { ...existingMetadata, ...metadata } 
      : existingMetadata;
    
    // Update thread
    const now = new Date().toISOString();
    
    await db.execute({
      sql: `
        UPDATE memory_threads
        SET 
          ${name ? 'name = ?,' : ''} 
          metadata = ?,
          updated_at = ?
        WHERE id = ?
      `,
      args: name 
        ? [name, JSON.stringify(updatedMetadata), now, id] 
        : [JSON.stringify(updatedMetadata), now, id]
    });
    
    // Log thread update
    await logEvent({
      name: "thread_updated",
      metadata: {
        threadId: id,
        name: name || thread.name,
        timestamp: now
      }
    });
    
    return NextResponse.json({
      id,
      name: name || thread.name,
      metadata: updatedMetadata,
      updatedAt: now
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/ai-sdk/threads/[id]
 * 
 * Delete a specific thread and all its messages
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const db = getLibSQLClient();
    
    // Check if thread exists
    const threadResult = await db.execute({
      sql: `SELECT * FROM memory_threads WHERE id = ?`,
      args: [id]
    });
    
    if (threadResult.rows.length === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    
    // Delete messages first
    await db.execute({
      sql: `DELETE FROM messages WHERE memory_thread_id = ?`,
      args: [id]
    });
    
    // Delete thread
    await db.execute({
      sql: `DELETE FROM memory_threads WHERE id = ?`,
      args: [id]
    });
    
    // Log thread deletion
    await createTrace({
      name: "thread_deleted",
      metadata: {
        threadId: id,
        timestamp: new Date().toISOString()
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

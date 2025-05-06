import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { v4 as uuidv4 } from "uuid";
import { countTokens } from "@/lib/memory/memory";

/**
 * GET /api/ai-sdk/threads/[id]/messages
 * 
 * Fetch messages for a specific thread
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    
    const db = getLibSQLClient();
    
    // Check if thread exists
    const threadResult = await db.execute({
      sql: `SELECT id FROM memory_threads WHERE id = ?`,
      args: [id]
    });
    
    if (threadResult.rows.length === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    
    // Get messages
    const messagesResult = await db.execute({
      sql: `
        SELECT * FROM messages 
        WHERE memory_thread_id = ? 
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
      `,
      args: [id, limit, offset]
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
        tokenCount: msg.token_count,
        createdAt: msg.created_at
      };
    });
    
    // Get total count
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM messages WHERE memory_thread_id = ?`,
      args: [id]
    });
    
    return NextResponse.json({
      messages,
      count: countResult.rows[0].count,
      hasMore: messages.length === limit
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/ai-sdk/threads/[id]/messages
 * 
 * Add a message to a specific thread
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { role, content, metadata = {} } = body;
    
    // Validate required fields
    if (!role || !content) {
      return NextResponse.json(
        { error: "Role and content are required" },
        { status: 400 }
      );
    }
    
    const db = getLibSQLClient();
    
    // Check if thread exists
    const threadResult = await db.execute({
      sql: `SELECT id FROM memory_threads WHERE id = ?`,
      args: [id]
    });
    
    if (threadResult.rows.length === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    
    // Generate message ID
    const messageId = uuidv4();
    const now = new Date().toISOString();
    
    // Count tokens
    let tokenCount = null;
    try {
      tokenCount = countTokens(content);
    } catch (e) {
      console.error('Error counting tokens:', e);
    }
    
    // Merge metadata
    const messageMetadata = {
      ...metadata,
      source: 'ai-sdk-ui',
      timestamp: now
    };
    
    // Insert message
    await db.execute({
      sql: `
        INSERT INTO messages (
          id, memory_thread_id, role, content, 
          token_count, metadata, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        messageId, 
        id, 
        role, 
        content, 
        tokenCount, 
        JSON.stringify(messageMetadata), 
        now
      ]
    });
    
    // Update thread's updated_at timestamp
    await db.execute({
      sql: `UPDATE memory_threads SET updated_at = ? WHERE id = ?`,
      args: [now, id]
    });
    
    // Log message creation
    await logEvent({
      name: "message_created",
      metadata: {
        messageId,
        threadId: id,
        role,
        tokenCount,
        timestamp: now
      }
    });
    
    return NextResponse.json({
      id: messageId,
      threadId: id,
      role,
      content,
      tokenCount,
      metadata: messageMetadata,
      createdAt: now
    });
  } catch (error) {
    return handleApiError(error);
  }
}

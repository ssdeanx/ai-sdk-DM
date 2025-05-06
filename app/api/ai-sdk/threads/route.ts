import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { v4 as uuidv4 } from "uuid";

/**
 * GET /api/ai-sdk/threads
 * 
 * Fetch all threads for AI SDK UI
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    
    const db = getLibSQLClient();
    
    // Build query
    let sql = `
      SELECT 
        t.id, t.name, t.metadata, t.created_at, t.updated_at,
        (SELECT COUNT(*) FROM messages WHERE memory_thread_id = t.id) as message_count
      FROM memory_threads t
    `;
    
    const args = [];
    
    // Add filter for AI SDK UI threads
    sql += ` WHERE json_extract(t.metadata, '$.source') = 'ai-sdk-ui'`;
    
    // Add search filter if provided
    if (search) {
      sql += ` AND (t.name LIKE ? OR t.id LIKE ?)`;
      args.push(`%${search}%`, `%${search}%`);
    }
    
    // Add order by and pagination
    sql += ` ORDER BY t.updated_at DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);
    
    const result = await db.execute({
      sql,
      args
    });
    
    // Format threads
    const threads = result.rows.map((thread: any) => {
      let metadata = {};
      try {
        metadata = typeof thread.metadata === 'string' 
          ? JSON.parse(thread.metadata) 
          : thread.metadata || {};
      } catch (e) {
        console.error('Error parsing thread metadata:', e);
      }
      
      return {
        id: thread.id,
        name: thread.name,
        messageCount: thread.message_count,
        metadata,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at
      };
    });
    
    // Get total count
    const countResult = await db.execute({
      sql: `
        SELECT COUNT(*) as count 
        FROM memory_threads 
        WHERE json_extract(metadata, '$.source') = 'ai-sdk-ui'
      `
    });
    
    return NextResponse.json({
      threads,
      count: countResult.rows[0].count,
      hasMore: threads.length === limit
    });
  } catch (error) {
    return handleApiError(error);
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
    
    const db = getLibSQLClient();
    
    // Create thread ID
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Merge metadata with source
    const threadMetadata = {
      ...metadata,
      source: 'ai-sdk-ui',
      created_at: now
    };
    
    // Insert thread
    await db.execute({
      sql: `
        INSERT INTO memory_threads (id, name, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [id, name, JSON.stringify(threadMetadata), now, now]
    });
    
    // Create trace for thread creation
    await createTrace({
      name: "thread_created",
      userId: id,
      metadata: {
        threadId: id,
        name,
        source: 'ai-sdk-ui',
        timestamp: now
      }
    });
    
    return NextResponse.json({
      id,
      name,
      messageCount: 0,
      metadata: threadMetadata,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    return handleApiError(error);
  }
}

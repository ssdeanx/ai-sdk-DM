import { NextResponse } from "next/server";
import { loadMessages, saveMessage } from "@/lib/memory/memory";
import { memory } from "@/lib/memory/factory";
import { handleApiError } from "@/lib/api-error-handler";

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
    const { id } = params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    
    // Load messages for the thread
    const messages = await loadMessages(id, limit);
    
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
      messages: formattedMessages,
      count: formattedMessages.length
    });
  } catch (error) {
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
    const { id } = params;
    const body = await request.json();
    const { role, content, metadata = {} } = body;
    
    // Validate request
    if (!role || !content) {
      return NextResponse.json(
        { error: "Role and content are required" },
        { status: 400 }
      );
    }
    
    // Save the message
    const messageId = await saveMessage(
      id,
      role as "user" | "assistant" | "system" | "tool",
      content,
      {
        count_tokens: true,
        generate_embeddings: role === "assistant", // Generate embeddings for assistant messages
        metadata: {
          ...metadata,
          source: 'ai-sdk-ui',
          timestamp: new Date().toISOString()
        }
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
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

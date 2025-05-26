/**
 * Cloudflare Durable Object for Chat Room Management
 *
 * Manages real-time chat/messaging for threads with WebSocket connections,
 * typing indicators, and message broadcasting.
 *
 * Generated on 2025-05-24
 */

import { DurableObject } from 'cloudflare:workers';
import { generateId } from 'ai';
import {
  ChatMessageSchema,
  TypingIndicatorSchema,
  UserPresenceSchema,
  type ChatMessage,
} from './schema';

/**
 * ChatRoomDO
 *
 * Durable Object for managing real-time chat rooms with WebSocket support.
 * Handles message broadcasting, typing indicators, and user presence.
 */
export class ChatRoomDO extends DurableObject {
  private roomId: string;
  private connections: Map<string, WebSocket> = new Map();
  private activeUsers: Set<string> = new Set();
  private typingUsers: Map<string, number> = new Map();
  private messages: ChatMessage[] = [];

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.roomId = this.ctx.id.toString();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    try {
      if (request.headers.get('Upgrade') === 'websocket') {
        return await this.handleWebSocketUpgrade(request);
      }

      switch (method) {
        case 'POST':
          if (path === '/message') return await this.handleNewMessage(request);
          if (path === '/typing') return await this.handleTypingStatus(request);
          if (path === '/presence')
            return await this.handlePresenceUpdate(request);
          break;
        case 'GET':
          if (path === '/messages') return await this.handleGetMessages();
          if (path === '/users') return await this.handleGetActiveUsers();
          if (path === '/typing') return await this.handleGetTypingUsers();
          if (path === '/presence') return await this.handleGetPresence();
          if (path === '/roomid') return await this.handleGetRoomId();
          break;
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response(`Internal Server Error: ${error}`, { status: 500 });
    }
  }

  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response('Missing userId', { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.connections.set(userId, server);
    this.activeUsers.add(userId);

    server.accept();
    server.addEventListener('close', () => {
      this.connections.delete(userId);
      this.activeUsers.delete(userId);
      this.typingUsers.delete(userId);
      this.broadcastUserLeft(userId);
    });

    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleWebSocketMessage(userId, data);
      } catch {
        server.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    this.broadcastUserJoined(userId);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleNewMessage(request: Request): Promise<Response> {
    const data = await request.json();
    const messageId = generateId();
    const now = Date.now();

    // Ensure data is an object before spreading
    const validatedData = typeof data === 'object' && data !== null ? data : {};

    const message = ChatMessageSchema.parse({
      id: messageId,
      ...validatedData,
      createdAt: now,
      updatedAt: now,
      roomId: this.roomId,
    });

    this.messages.push(message);
    await this.ctx.storage.put('messages', this.messages);

    this.broadcastMessage('new-message', message);

    return new Response(JSON.stringify(message), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleTypingStatus(request: Request): Promise<Response> {
    const data = TypingIndicatorSchema.parse(await request.json());

    if (data.isTyping) {
      this.typingUsers.set(data.userId, Date.now());
    } else {
      this.typingUsers.delete(data.userId);
    }

    this.broadcastTypingStatus(data.userId, data.isTyping);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetMessages(): Promise<Response> {
    if (this.messages.length === 0) {
      const storedMessages = await this.ctx.storage.get('messages');
      if (storedMessages) {
        this.messages = storedMessages as ChatMessage[];
      }
    }

    return new Response(JSON.stringify(this.messages), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetActiveUsers(): Promise<Response> {
    return new Response(JSON.stringify(Array.from(this.activeUsers)), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetTypingUsers(): Promise<Response> {
    const now = Date.now();
    const recentTyping = Array.from(this.typingUsers.entries())
      .filter(([, timestamp]) => now - timestamp < 5000)
      .map(([userId]) => userId);

    return new Response(JSON.stringify(recentTyping), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetRoomId(): Promise<Response> {
    return new Response(JSON.stringify({ roomId: this.roomId }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleWebSocketMessage(
    userId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const { type, payload } = data as { type: string; payload: unknown };

    switch (type) {
      case 'ping':
        this.sendToUser(userId, 'pong', {
          timestamp: Date.now(),
          roomId: this.roomId,
        });
        break;
      case 'typing-start':
        this.typingUsers.set(userId, Date.now());
        this.broadcastTypingStatus(userId, true);
        break;
      case 'typing-stop':
        this.typingUsers.delete(userId);
        this.broadcastTypingStatus(userId, false);
        break;
      case 'presence-update':
        this.broadcastPresenceUpdate(userId, payload);
        break;
    }
  }

  private broadcastMessage(type: string, data: unknown): void {
    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now(),
      roomId: this.roomId,
    });

    for (const [, ws] of this.connections) {
      try {
        ws.send(message);
      } catch {
        // Connection closed, will be cleaned up by close handler
      }
    }
  }

  private broadcastTypingStatus(userId: string, isTyping: boolean): void {
    const message = JSON.stringify({
      type: 'typing-status',
      data: { userId, isTyping, roomId: this.roomId },
      timestamp: Date.now(),
    });

    for (const [connUserId, ws] of this.connections) {
      if (connUserId !== userId) {
        try {
          ws.send(message);
        } catch {
          // Connection closed
        }
      }
    }
  }

  private broadcastUserJoined(userId: string): void {
    this.broadcastMessage('user-joined', {
      userId,
      activeUsers: Array.from(this.activeUsers),
      roomId: this.roomId,
    });
  }

  private broadcastUserLeft(userId: string): void {
    this.broadcastMessage('user-left', {
      userId,
      activeUsers: Array.from(this.activeUsers),
      roomId: this.roomId,
    });
  }

  private broadcastPresenceUpdate(userId: string, presence: unknown): void {
    this.broadcastMessage('presence-update', {
      userId,
      presence,
      roomId: this.roomId,
    });
  }

  private sendToUser(userId: string, type: string, data: unknown): void {
    const ws = this.connections.get(userId);
    if (ws) {
      try {
        ws.send(
          JSON.stringify({
            type,
            data,
            timestamp: Date.now(),
            roomId: this.roomId,
          })
        );
      } catch {
        this.connections.delete(userId);
      }
    }
  }

  async getActiveUsers(): Promise<string[]> {
    return Array.from(this.activeUsers);
  }

  async getMessages(): Promise<ChatMessage[]> {
    if (this.messages.length === 0) {
      const storedMessages = await this.ctx.storage.get('messages');
      if (storedMessages) {
        this.messages = storedMessages as ChatMessage[];
      }
    }
    return this.messages;
  }

  /**
   * Handle user presence updates
   */
  private async handlePresenceUpdate(request: Request): Promise<Response> {
    try {
      const data = UserPresenceSchema.parse(await request.json());

      // Store presence in durable storage
      const presenceKey = `presence:${data.userId}`;
      await this.ctx.storage.put(presenceKey, data);

      // Broadcast presence update to all connected users
      this.broadcastPresenceUpdate(data.userId, data);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid presence data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  /**
   * Get current presence data for all users
   */
  private async handleGetPresence(): Promise<Response> {
    try {
      const presenceMap = await this.ctx.storage.list({ prefix: 'presence:' });
      const presenceData = Object.fromEntries(presenceMap);

      return new Response(JSON.stringify(presenceData), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to get presence data' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
}

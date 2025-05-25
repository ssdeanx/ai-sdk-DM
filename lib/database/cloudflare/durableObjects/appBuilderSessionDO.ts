/**
 * Cloudflare Durable Object for App Builder Session Management
 *
 * Manages real-time app building sessions with collaborative editing,
 * live preview updates, and code synchronization.
 *
 * Generated on 2025-05-24
 */

import { DurableObject } from 'cloudflare:workers';
import { generateId } from 'ai';
import { z } from 'zod';

/**
 * Zod schemas for AppBuilderSessionDO operations
 */
const AppBuilderSessionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  name: z.string(),
  status: z.enum(['active', 'paused', 'completed', 'archived']),
  config: z
    .object({
      framework: z.string().optional(),
      language: z.string().optional(),
      features: z.array(z.string()).optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const CodeUpdateSchema = z.object({
  blockId: z.string(),
  content: z.string(),
  language: z.string().optional(),
  userId: z.string(),
  timestamp: z.number(),
});

const PreviewStateSchema = z.object({
  url: z.string().optional(),
  status: z.enum(['building', 'ready', 'error']),
  error: z.string().optional(),
  timestamp: z.number(),
});

const AddCollaboratorSchema = z.object({
  userId: z.string(),
});

type AppBuilderSession = z.infer<typeof AppBuilderSessionSchema>;
type CodeUpdate = z.infer<typeof CodeUpdateSchema>;
type PreviewState = z.infer<typeof PreviewStateSchema>;

/**
 * Stored code block with additional metadata
 */
type StoredCodeBlock = CodeUpdate & {
  timestamp: number;
};

/**
 * AppBuilderSessionDO
 *
  private codeBlocks: Map<string, StoredCodeBlock> = new Map();
 * Handles code updates, live previews, and session state management.
 */
export class AppBuilderSessionDO extends DurableObject {
  private sessionId: string;
  private session: AppBuilderSession | null = null;
  private collaborators: Map<string, WebSocket> = new Map();
  private codeBlocks: Map<string, StoredCodeBlock> = new Map();
  private previewState: PreviewState | null = null;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.sessionId = this.ctx.id.toString();
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
          if (path === '/session')
            return await this.handleCreateSession(request);
          if (path === '/code') return await this.handleCodeUpdate(request);
          if (path === '/preview')
            return await this.handlePreviewUpdate(request);
          if (path === '/collaborator')
            return await this.handleAddCollaborator(request);
          break;
        case 'GET':
          if (path === '/session') return await this.handleGetSession();
          if (path === '/code') return await this.handleGetCodeBlocks();
          if (path === '/preview') return await this.handleGetPreview();
          if (path === '/collaborators')
            return await this.handleGetCollaborators();
          break;
        case 'PUT':
          if (path === '/session')
            return await this.handleUpdateSession(request);
          break;
        case 'DELETE':
          if (path === '/session') return await this.handleDeleteSession();
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

    this.collaborators.set(userId, server);

    server.accept();
    server.addEventListener('close', () => {
      this.collaborators.delete(userId);
      this.broadcastToCollaborators('collaborator-left', { userId });
    });

    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleWebSocketMessage(userId, data);
      } catch {
        server.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    this.broadcastToCollaborators('collaborator-joined', { userId });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleCreateSession(request: Request): Promise<Response> {
    const data = await request.json();
    const now = Date.now();

    // Ensure data is an object before spreading
    const validatedData = typeof data === 'object' && data !== null ? data : {};

    const session = AppBuilderSessionSchema.parse({
      id: this.sessionId,
      ...validatedData,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    this.session = session;
    await this.ctx.storage.put('session', this.session);

    return new Response(JSON.stringify(this.session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleCodeUpdate(request: Request): Promise<Response> {
    const update = CodeUpdateSchema.parse(await request.json());

    this.codeBlocks.set(update.blockId, {
      ...update,
      timestamp: Date.now(),
    });

    await this.ctx.storage.put(
      'codeBlocks',
      Object.fromEntries(this.codeBlocks)
    );

    this.broadcastToCollaborators('code-update', update);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handlePreviewUpdate(request: Request): Promise<Response> {
    const previewData = PreviewStateSchema.parse(await request.json());

    this.previewState = previewData;
    await this.ctx.storage.put('previewState', this.previewState);

    this.broadcastToCollaborators('preview-update', this.previewState);

    return new Response(JSON.stringify(this.previewState), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleAddCollaborator(request: Request): Promise<Response> {
    const data = AddCollaboratorSchema.parse(await request.json());
    const { userId } = data;

    if (!userId) {
      return new Response('Missing userId', { status: 400 });
    }

    // Check if collaborator already exists
    if (this.collaborators.has(userId)) {
      return new Response('Collaborator already exists', { status: 409 });
    }

    // Broadcast new collaborator to existing collaborators
    this.broadcastToCollaborators('collaborator-added', { userId });

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  private async handleGetSession(): Promise<Response> {
    if (!this.session) {
      const storedSession = await this.ctx.storage.get('session');
      if (storedSession) {
        try {
          this.session = AppBuilderSessionSchema.parse(storedSession);
        } catch {
          this.session = null;
        }
      }
    }

    if (!this.session) {
      return new Response('Session not found', { status: 404 });
    }

    return new Response(JSON.stringify(this.session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetPreview(): Promise<Response> {
    if (!this.previewState) {
      const storedPreview = await this.ctx.storage.get('previewState');
      if (storedPreview) {
        this.previewState = PreviewStateSchema.parse(storedPreview);
      }
    }

    if (!this.previewState) {
      return new Response('Preview not found', { status: 404 });
    }

    return new Response(JSON.stringify(this.previewState), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetCollaborators(): Promise<Response> {
    const collaboratorIds = Array.from(this.collaborators.keys());

    return new Response(JSON.stringify({ collaborators: collaboratorIds }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleUpdateSession(request: Request): Promise<Response> {
    if (!this.session) {
      return new Response('Session not found', { status: 404 });
    }

    const updateData = await request.json();
    const now = Date.now();

    // Ensure updateData is an object before spreading
    const validatedUpdateData =
      typeof updateData === 'object' && updateData !== null ? updateData : {};

    this.session = AppBuilderSessionSchema.parse({
      ...this.session,
      ...validatedUpdateData,
      updatedAt: now,
    });

    await this.ctx.storage.put('session', this.session);

    this.broadcastToCollaborators('session-updated', this.session);

    return new Response(JSON.stringify(this.session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleDeleteSession(): Promise<Response> {
    if (!this.session) {
      return new Response('Session not found', { status: 404 });
    }

    // Close all WebSocket connections
    for (const [userId, ws] of this.collaborators) {
      try {
        ws.close();
        void userId; // read userId
      } catch {
        // Ignore errors when closing
      }
    }

    this.collaborators.clear();
    this.session = null;
    this.codeBlocks.clear();
    this.previewState = null;

    // Clear storage
    await this.ctx.storage.deleteAll();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  private async handleGetCodeBlocks(): Promise<Response> {
    if (this.codeBlocks.size === 0) {
      const storedBlocks = await this.ctx.storage.get('codeBlocks');
      if (storedBlocks) {
        this.codeBlocks = new Map(
          Object.entries(storedBlocks as Record<string, StoredCodeBlock>)
        );
      }
    }

    return new Response(JSON.stringify(Object.fromEntries(this.codeBlocks)), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleWebSocketMessage(
    userId: string,
    data: unknown
  ): Promise<void> {
    if (typeof data !== 'object' || data === null) return;
    const { type, payload } = data as { type: string; payload: unknown };

    // Ensure payload is an object before spreading
    const validatedPayload =
      typeof payload === 'object' && payload !== null ? payload : {};

    switch (type) {
      case 'cursor-position':
        this.broadcastToOthers(userId, 'cursor-update', {
          userId,
          ...validatedPayload,
        });
        break;
      case 'selection-change':
        this.broadcastToOthers(userId, 'selection-update', {
          userId,
          ...validatedPayload,
        });
        break;
      case 'typing-indicator':
        this.broadcastToOthers(userId, 'typing-indicator', {
          userId,
          ...validatedPayload,
        });
        break;
    }
  }

  private broadcastToCollaborators(type: string, data: unknown): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });

    for (const [userId, ws] of this.collaborators) {
      try {
        ws.send(message);
        void userId; // read userId
      } catch {
        this.collaborators.delete(userId);
      }
    }
  }
  private broadcastToOthers(
    excludeUserId: string,
    type: string,
    data: unknown
  ): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });

    for (const [userId, ws] of this.collaborators) {
      if (userId !== excludeUserId) {
        try {
          ws.send(message);
          void userId; // read userId
        } catch {
          this.collaborators.delete(userId);
        }
      }
    }
  }
  async getSession(): Promise<AppBuilderSession | null> {
    if (!this.session) {
      const storedSession = await this.ctx.storage.get('session');
      if (storedSession) {
        try {
          this.session = AppBuilderSessionSchema.parse(storedSession);
        } catch {
          this.session = null;
        }
      }
    }
    return this.session;
  }
}

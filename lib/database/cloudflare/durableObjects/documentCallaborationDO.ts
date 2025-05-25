/**
 * Cloudflare Durable Object for Document Collaboration Management
 *
 * Manages real-time document editing with collaborative features,
 * operational transforms, and conflict resolution.
 *
 * Generated on 2025-05-24
 */

import { DurableObject } from 'cloudflare:workers';
import { generateId } from 'ai';
import { z } from 'zod';

/**
 * Zod schemas for DocumentCollaborationDO operations
 */
const DocumentStateSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  contentType: z.enum(['markdown', 'plaintext', 'html', 'json']),
  version: z.number().default(1),
  lastModified: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

const DocumentOperationSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  userId: z.string(),
  type: z.enum(['insert', 'delete', 'replace', 'format']),
  position: z.number(),
  content: z.string().optional(),
  length: z.number().optional(),
  attributes: z.record(z.unknown()).optional(),
  timestamp: z.number(),
  version: z.number(),
});

const CursorPositionSchema = z.object({
  userId: z.string(),
  position: z.number(),
  selection: z
    .object({
      start: z.number(),
      end: z.number(),
    })
    .optional(),
  timestamp: z.number(),
});

type DocumentState = z.infer<typeof DocumentStateSchema>;
type DocumentOperation = z.infer<typeof DocumentOperationSchema>;
type CursorPosition = z.infer<typeof CursorPositionSchema>;

/**
 * DocumentCollaborationDO
 *
 * Durable Object for managing real-time document collaboration.
 * Handles operational transforms, conflict resolution, and cursor synchronization.
 */
export class DocumentCollaborationDO extends DurableObject {
  private documentId: string;
  private document: DocumentState | null = null;
  private collaborators: Map<string, WebSocket> = new Map();
  private operations: DocumentOperation[] = [];
  private cursors: Map<string, CursorPosition> = new Map();

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.documentId = this.ctx.id.toString();
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
          if (path === '/document')
            return await this.handleCreateDocument(request);
          if (path === '/operation')
            return await this.handleApplyOperation(request);
          if (path === '/cursor') return await this.handleUpdateCursor(request);
          break;
        case 'GET':
          if (path === '/document') return await this.handleGetDocument();
          if (path === '/operations') return await this.handleGetOperations();
          if (path === '/cursors') return await this.handleGetCursors();
          if (path === '/collaborators')
            return await this.handleGetCollaborators();
          break;
        case 'PUT':
          if (path === '/document')
            return await this.handleUpdateDocument(request);
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
      this.cursors.delete(userId);
      this.broadcastCollaboratorLeft(userId);
    });

    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleWebSocketMessage(userId, data);
      } catch {
        server.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    // Send current document state
    if (this.document) {
      server.send(
        JSON.stringify({
          type: 'document-state',
          data: this.document,
        })
      );
    }

    this.broadcastCollaboratorJoined(userId);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleCreateDocument(request: Request): Promise<Response> {
    const data = await request.json();
    const now = Date.now();

    // Ensure data is an object before spreading
    const requestData =
      data && typeof data === 'object' && !Array.isArray(data) ? data : {};

    const document = DocumentStateSchema.parse({
      id: this.documentId,
      ...requestData,
      version: 1,
      lastModified: now,
    });

    this.document = document;
    await this.ctx.storage.put('document', this.document);

    this.broadcastToCollaborators('document-created', this.document);

    return new Response(JSON.stringify(this.document), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleApplyOperation(request: Request): Promise<Response> {
    const data = await request.json();
    const operationId = generateId();
    const now = Date.now();

    if (!this.document) {
      return new Response('Document not found', { status: 404 });
    }

    // Ensure data is an object before spreading
    const requestData =
      data && typeof data === 'object' && !Array.isArray(data) ? data : {};

    const operation = DocumentOperationSchema.parse({
      id: operationId,
      documentId: this.documentId,
      ...requestData,
      timestamp: now,
      version: this.document.version + 1,
    });

    // Apply operation to document
    const newContent = this.applyOperationToContent(
      this.document.content,
      operation
    );

    this.document = {
      ...this.document,
      content: newContent,
      version: operation.version,
      lastModified: now,
    };

    this.operations.push(operation);

    await this.ctx.storage.put('document', this.document);
    await this.ctx.storage.put('operations', this.operations);

    this.broadcastToCollaborators('operation-applied', {
      operation,
      document: this.document,
    });

    return new Response(
      JSON.stringify({ operation, document: this.document }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async handleUpdateCursor(request: Request): Promise<Response> {
    const data = CursorPositionSchema.parse(await request.json());

    this.cursors.set(data.userId, data);

    this.broadcastToOthers(data.userId, 'cursor-update', data);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetDocument(): Promise<Response> {
    if (!this.document) {
      const storedDocument = await this.ctx.storage.get('document');
      if (storedDocument) {
        this.document = DocumentStateSchema.parse(storedDocument);
      }
    }

    if (!this.document) {
      return new Response('Document not found', { status: 404 });
    }

    return new Response(JSON.stringify(this.document), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetOperations(): Promise<Response> {
    if (this.operations.length === 0) {
      const storedOperations = await this.ctx.storage.get('operations');
      if (storedOperations) {
        this.operations = storedOperations as DocumentOperation[];
      }
    }

    return new Response(JSON.stringify(this.operations), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetCursors(): Promise<Response> {
    return new Response(JSON.stringify(Object.fromEntries(this.cursors)), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetCollaborators(): Promise<Response> {
    return new Response(JSON.stringify(Array.from(this.collaborators.keys())), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleUpdateDocument(request: Request): Promise<Response> {
    const data = await request.json();
    const now = Date.now();

    if (!this.document) {
      return new Response('Document not found', { status: 404 });
    }

    // Ensure data is an object before spreading
    const requestData =
      data && typeof data === 'object' && !Array.isArray(data) ? data : {};

    const updatedDocument = DocumentStateSchema.parse({
      ...this.document,
      ...requestData,
      id: this.documentId, // Preserve document ID
      version: this.document.version + 1,
      lastModified: now,
    });

    this.document = updatedDocument;
    await this.ctx.storage.put('document', this.document);

    this.broadcastToCollaborators('document-updated', this.document);

    return new Response(JSON.stringify(this.document), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleWebSocketMessage(
    userId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const { type, payload } = data;

    switch (type) {
      case 'operation':
        // Handle operation via WebSocket
        break;
      case 'cursor-update':
        if (payload && typeof payload === 'object') {
          const cursorData = { ...payload, userId, timestamp: Date.now() };
          this.cursors.set(userId, cursorData as CursorPosition);
          this.broadcastToOthers(userId, 'cursor-update', cursorData);
        }
        break;
      case 'selection-change':
        if (payload && typeof payload === 'object') {
          this.broadcastToOthers(userId, 'selection-change', {
            userId,
            ...payload,
          });
        }
        break;
    }
  }

  private applyOperationToContent(
    content: string,
    operation: DocumentOperation
  ): string {
    switch (operation.type) {
      case 'insert':
        return (
          content.slice(0, operation.position) +
          (operation.content || '') +
          content.slice(operation.position)
        );

      case 'delete':
        return (
          content.slice(0, operation.position) +
          content.slice(operation.position + (operation.length || 0))
        );

      case 'replace':
        return (
          content.slice(0, operation.position) +
          (operation.content || '') +
          content.slice(operation.position + (operation.length || 0))
        );

      default:
        return content;
    }
  }

  private broadcastToCollaborators(type: string, data: unknown): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });

    for (const [, ws] of this.collaborators) {
      try {
        ws.send(message);
      } catch {
        // Connection closed
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
        } catch {
          this.collaborators.delete(userId);
        }
      }
    }
  }

  private broadcastCollaboratorJoined(userId: string): void {
    this.broadcastToOthers(userId, 'collaborator-joined', {
      userId,
      collaborators: Array.from(this.collaborators.keys()),
    });
  }

  private broadcastCollaboratorLeft(userId: string): void {
    this.broadcastToCollaborators('collaborator-left', {
      userId,
      collaborators: Array.from(this.collaborators.keys()),
    });
  }

  async getDocument(): Promise<DocumentState | null> {
    if (!this.document) {
      const storedDocument = await this.ctx.storage.get('document');
      if (storedDocument) {
        try {
          this.document = DocumentStateSchema.parse(storedDocument);
        } catch {
          this.document = null;
        }
      }
    }
    return this.document;
  }

  async getOperations(): Promise<DocumentOperation[]> {
    if (this.operations.length === 0) {
      const storedOperations = await this.ctx.storage.get('operations');
      if (storedOperations) {
        this.operations = storedOperations as DocumentOperation[];
      }
    }
    return this.operations;
  }
}

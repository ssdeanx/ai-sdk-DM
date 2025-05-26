/**
 * Cloudflare Durable Object for Integration Session Management
 *
 * Manages active integration sessions with external services,
 * connection pooling, and real-time status monitoring.
 *
 * Generated on 2025-05-24
 */

import { DurableObject } from 'cloudflare:workers';
import { generateId } from 'ai';
import { z } from 'zod';

/**
 * Zod schemas for IntegrationSessionDO operations
 */
const IntegrationSessionSchema = z.object({
  id: z.string(),
  integrationId: z.string(),
  userId: z.string(),
  type: z.enum(['oauth', 'api_key', 'webhook', 'socket']),
  status: z.enum([
    'connecting',
    'connected',
    'disconnected',
    'error',
    'expired',
  ]),
  config: z.record(z.unknown()).optional(),
  credentials: z.record(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  lastActivity: z.number(),
  expiresAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const IntegrationEventSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  type: z.enum([
    'connection',
    'disconnection',
    'data',
    'error',
    'heartbeat',
    'session-updated',
  ]),
  data: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  timestamp: z.number(),
});

const ConnectionMetricsSchema = z.object({
  sessionId: z.string(),
  totalRequests: z.number().default(0),
  successfulRequests: z.number().default(0),
  failedRequests: z.number().default(0),
  avgResponseTime: z.number().default(0),
  lastRequestTime: z.number().optional(),
  errors: z.array(z.string()).default([]),
});

const LogEventRequestSchema = z.object({
  type: z.enum([
    'connection',
    'disconnection',
    'data',
    'error',
    'heartbeat',
    'session-updated',
  ]),
  data: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});

type IntegrationSession = z.infer<typeof IntegrationSessionSchema>;
type IntegrationEvent = z.infer<typeof IntegrationEventSchema>;
type ConnectionMetrics = z.infer<typeof ConnectionMetricsSchema>;

/**
 * IntegrationSessionDO
 *
 * Durable Object for managing integration sessions with external services.
 * Handles connection management, monitoring, and real-time updates.
 */
export class IntegrationSessionDO extends DurableObject {
  private sessionId: string;
  private session: IntegrationSession | null = null;
  private connections: Map<string, WebSocket> = new Map();
  private events: IntegrationEvent[] = [];
  private metrics: ConnectionMetrics | null = null;
  private heartbeatInterval: number | null = null;

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
          if (path === '/connect') return await this.handleConnect(request);
          if (path === '/event') return await this.handleLogEvent(request);
          if (path === '/heartbeat') return await this.handleHeartbeat();
          break;
        case 'GET':
          if (path === '/session') return await this.handleGetSession();
          if (path === '/status') return await this.handleGetStatus();
          if (path === '/events') return await this.handleGetEvents();
          if (path === '/metrics') return await this.handleGetMetrics();
          break;
        case 'PUT':
          if (path === '/session')
            return await this.handleUpdateSession(request);
          break;
        case 'DELETE':
          if (path === '/session') return await this.handleDisconnect();
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

    server.accept();
    server.addEventListener('close', () => {
      this.connections.delete(userId);
    });

    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleWebSocketMessage(userId, data);
      } catch {
        server.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    // Send current session state
    if (this.session) {
      server.send(
        JSON.stringify({
          type: 'session-state',
          data: this.session,
        })
      );
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleCreateSession(request: Request): Promise<Response> {
    const data = await request.json();
    const now = Date.now();

    // Ensure data is an object before spreading
    const requestData =
      data && typeof data === 'object' && !Array.isArray(data) ? data : {};

    const session = IntegrationSessionSchema.parse({
      id: this.sessionId,
      ...requestData,
      status: 'connecting',
      lastActivity: now,
      createdAt: now,
      updatedAt: now,
    });

    this.session = session;
    await this.ctx.storage.put('session', this.session);

    // Initialize metrics
    this.metrics = ConnectionMetricsSchema.parse({
      sessionId: this.sessionId,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      errors: [],
    });
    await this.ctx.storage.put('metrics', this.metrics);

    this.broadcastToConnections('session-created', this.session);

    return new Response(JSON.stringify(this.session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleConnect(_request: Request): Promise<Response> {
    if (!this.session) {
      return new Response('Session not found', { status: 404 });
    }

    const now = Date.now();
    this.session.status = 'connected';
    this.session.lastActivity = now;
    this.session.updatedAt = now;

    await this.ctx.storage.put('session', this.session);

    const event = await this.logEvent('connection', { connected: true });
    this.broadcastToConnections('session-connected', {
      session: this.session,
      event,
    });

    // Start heartbeat if needed
    this.startHeartbeat();

    return new Response(JSON.stringify(this.session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleLogEvent(request: Request): Promise<Response> {
    const requestData = await request.json();
    const validatedData = LogEventRequestSchema.parse(requestData);
    const event = await this.logEvent(
      validatedData.type,
      validatedData.data,
      validatedData.error
    );

    this.broadcastToConnections('integration-event', event);

    return new Response(JSON.stringify(event), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleHeartbeat(): Promise<Response> {
    if (!this.session) {
      return new Response('Session not found', { status: 404 });
    }

    const now = Date.now();
    this.session.lastActivity = now;
    this.session.updatedAt = now;

    await this.ctx.storage.put('session', this.session);
    await this.logEvent('heartbeat', { timestamp: now });

    return new Response(JSON.stringify({ status: 'ok', timestamp: now }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetSession(): Promise<Response> {
    if (!this.session) {
      const storedSession = await this.ctx.storage.get('session');
      if (storedSession) {
        this.session = IntegrationSessionSchema.parse(storedSession);
      }
    }

    if (!this.session) {
      return new Response('Session not found', { status: 404 });
    }

    return new Response(JSON.stringify(this.session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetStatus(): Promise<Response> {
    if (!this.session) {
      return new Response('Session not found', { status: 404 });
    }

    const status = {
      sessionId: this.sessionId,
      status: this.session.status,
      lastActivity: this.session.lastActivity,
      isExpired: this.session.expiresAt
        ? Date.now() > this.session.expiresAt
        : false,
      connectedClients: this.connections.size,
    };

    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetEvents(): Promise<Response> {
    if (this.events.length === 0) {
      const storedEvents = await this.ctx.storage.get('events');
      if (storedEvents) {
        this.events = storedEvents as IntegrationEvent[];
      }
    }

    return new Response(JSON.stringify(this.events), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetMetrics(): Promise<Response> {
    if (!this.metrics) {
      const storedMetrics = await this.ctx.storage.get('metrics');
      if (storedMetrics) {
        this.metrics = ConnectionMetricsSchema.parse(storedMetrics);
      }
    }

    return new Response(JSON.stringify(this.metrics), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleUpdateSession(request: Request): Promise<Response> {
    if (!this.session) {
      return new Response('Session not found', { status: 404 });
    }

    const data = await request.json();
    const now = Date.now();

    // Ensure data is an object before spreading
    const requestData =
      data && typeof data === 'object' && !Array.isArray(data) ? data : {};

    // Update session with new data
    const updatedSession = IntegrationSessionSchema.parse({
      ...this.session,
      ...requestData,
      id: this.sessionId, // Ensure ID doesn't change
      updatedAt: now,
      lastActivity: now,
    });

    this.session = updatedSession;
    await this.ctx.storage.put('session', this.session);

    await this.logEvent('session-updated', {
      updatedFields:
        data && typeof data === 'object' && data !== null
          ? Object.keys(data as Record<string, unknown>)
          : [],
    });
    this.broadcastToConnections('session-updated', this.session);

    return new Response(JSON.stringify(this.session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleDisconnect(): Promise<Response> {
    if (!this.session) {
      return new Response('Session not found', { status: 404 });
    }

    this.session.status = 'disconnected';
    this.session.updatedAt = Date.now();

    await this.ctx.storage.put('session', this.session);
    await this.logEvent('disconnection', { disconnected: true });

    this.stopHeartbeat();
    this.broadcastToConnections('session-disconnected', this.session);

    return new Response(JSON.stringify(this.session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleWebSocketMessage(
    userId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const { type, payload } = data;

    switch (type) {
      case 'ping':
        this.sendToUser(userId, 'pong', { timestamp: Date.now() });
        break;
      case 'request-metrics':
        this.sendToUser(userId, 'metrics-update', this.metrics);
        break;
      case 'update-config':
        if (this.session && payload) {
          this.session.config = { ...this.session.config, ...payload };
          await this.ctx.storage.put('session', this.session);
          this.broadcastToConnections('session-updated', this.session);
        }
        break;
    }
  }

  private async logEvent(
    type:
      | 'connection'
      | 'disconnection'
      | 'data'
      | 'error'
      | 'heartbeat'
      | 'session-updated',
    data?: Record<string, unknown>,
    error?: string
  ): Promise<IntegrationEvent> {
    const event = IntegrationEventSchema.parse({
      id: generateId(),
      sessionId: this.sessionId,
      type,
      data,
      error,
      timestamp: Date.now(),
    });

    this.events.push(event);

    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }

    await this.ctx.storage.put('events', this.events);
    return event;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(async () => {
      await this.handleHeartbeat();
    }, 30000) as unknown as number; // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private broadcastToConnections(type: string, data: unknown): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });

    for (const [_userId, ws] of this.connections) {
      try {
        ws.send(message);
      } catch {
        // Connection already closed, remove it
        this.connections.delete(_userId);
      }
    }
  }

  private sendToUser(userId: string, type: string, data: unknown): void {
    const ws = this.connections.get(userId);
    if (ws) {
      try {
        ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
      } catch {
        this.connections.delete(userId);
      }
    }
  }

  async getSession(): Promise<IntegrationSession | null> {
    if (!this.session) {
      const storedSession = await this.ctx.storage.get('session');
      if (storedSession) {
        try {
          this.session = IntegrationSessionSchema.parse(storedSession);
        } catch {
          this.session = null;
        }
      }
    }
    return this.session;
  }

  async getMetrics(): Promise<ConnectionMetrics | null> {
    if (!this.metrics) {
      const storedMetrics = await this.ctx.storage.get('metrics');
      if (storedMetrics) {
        this.metrics = ConnectionMetricsSchema.parse(storedMetrics);
      }
    }
    return this.metrics;
  }
}

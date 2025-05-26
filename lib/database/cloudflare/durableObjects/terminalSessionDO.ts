/**
 * Cloudflare Durable Object for Terminal Session Management
 *
 * Manages persistent terminal sessions with command execution,
 * output streaming, and session state management.
 *
 * Generated on 2025-05-24
 */

import { DurableObject } from 'cloudflare:workers';
import { generateId } from 'ai';
import { z } from 'zod';

/**
 * Zod schemas for TerminalSessionDO operations
 */
const TerminalSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  status: z.enum(['active', 'paused', 'terminated', 'error']),
  environment: z.record(z.string()).optional(),
  workingDirectory: z.string().optional(),
  shell: z.string().default('/bin/bash'),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  lastActivityAt: z.number(),
});

const CommandExecutionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  command: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  exitCode: z.number().optional(),
  output: z.string().optional(),
  error: z.string().optional(),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  duration: z.number().optional(),
});

const TerminalOutputSchema = z.object({
  sessionId: z.string(),
  type: z.enum(['stdout', 'stderr', 'system']),
  content: z.string(),
  timestamp: z.number(),
});

const TerminalInputSchema = z.object({
  input: z.string(),
});

type TerminalSession = z.infer<typeof TerminalSessionSchema>;
type CommandExecution = z.infer<typeof CommandExecutionSchema>;
type TerminalOutput = z.infer<typeof TerminalOutputSchema>;

/**
 * TerminalSessionDO
 *
 * Durable Object for managing persistent terminal sessions.
 * Handles command execution, output streaming, and session persistence.
 */
export class TerminalSessionDO extends DurableObject {
  private sessionId: string;
  private session: TerminalSession | null = null;
  private connections: Map<string, WebSocket> = new Map();
  private commandHistory: CommandExecution[] = [];
  private outputBuffer: TerminalOutput[] = [];

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
          if (path === '/command')
            return await this.handleExecuteCommand(request);
          if (path === '/input') return await this.handleSendInput(request);
          break;
        case 'GET':
          if (path === '/session') return await this.handleGetSession();
          if (path === '/history') return await this.handleGetHistory();
          if (path === '/output') return await this.handleGetOutput();
          break;
        case 'PUT':
          if (path === '/session')
            return await this.handleUpdateSession(request);
          break;
        case 'DELETE':
          if (path === '/session') return await this.handleTerminateSession();
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
    const sessionData = typeof data === 'object' && data !== null ? data : {};

    const session = TerminalSessionSchema.parse({
      id: this.sessionId,
      ...sessionData,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    });

    this.session = session;
    await this.ctx.storage.put('session', this.session);

    this.broadcastToConnections('session-created', this.session);

    return new Response(JSON.stringify(this.session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleExecuteCommand(request: Request): Promise<Response> {
    const data = await request.json();
    const commandId = generateId();
    const now = Date.now();

    // Ensure data is an object before spreading
    const commandData = typeof data === 'object' && data !== null ? data : {};

    const execution = CommandExecutionSchema.parse({
      id: commandId,
      sessionId: this.sessionId,
      ...commandData,
      status: 'running',
      startedAt: now,
    });

    this.commandHistory.push(execution);
    await this.ctx.storage.put('commandHistory', this.commandHistory);

    // Update session last activity
    if (this.session) {
      this.session.lastActivityAt = now;
      this.session.updatedAt = now;
      await this.ctx.storage.put('session', this.session);
    }

    this.broadcastToConnections('command-started', execution);

    // Simulate command execution (in real implementation, this would interact with actual terminal)
    setTimeout(async () => {
      await this.completeCommand(commandId, 0, 'Command executed successfully');
    }, 1000);

    return new Response(JSON.stringify(execution), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleSendInput(request: Request): Promise<Response> {
    const data = await request.json();
    const { input } = TerminalInputSchema.parse(data);

    const output = TerminalOutputSchema.parse({
      sessionId: this.sessionId,
      type: 'system',
      content: `Input: ${input}`,
      timestamp: Date.now(),
    });

    this.outputBuffer.push(output);
    await this.ctx.storage.put('outputBuffer', this.outputBuffer);

    this.broadcastToConnections('terminal-input', output);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetSession(): Promise<Response> {
    if (!this.session) {
      const storedSession = await this.ctx.storage.get('session');
      if (storedSession) {
        this.session = TerminalSessionSchema.parse(storedSession);
      }
    }

    if (!this.session) {
      return new Response('Session not found', { status: 404 });
    }

    return new Response(JSON.stringify(this.session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetHistory(): Promise<Response> {
    if (this.commandHistory.length === 0) {
      const storedHistory = await this.ctx.storage.get('commandHistory');
      if (storedHistory) {
        this.commandHistory = storedHistory as CommandExecution[];
      }
    }

    return new Response(JSON.stringify(this.commandHistory), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetOutput(): Promise<Response> {
    if (this.outputBuffer.length === 0) {
      const storedOutput = await this.ctx.storage.get('outputBuffer');
      if (storedOutput) {
        this.outputBuffer = storedOutput as TerminalOutput[];
      }
    }

    return new Response(JSON.stringify(this.outputBuffer), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleUpdateSession(request: Request): Promise<Response> {
    const data = await request.json();
    const now = Date.now();

    if (!this.session) {
      const storedSession = await this.ctx.storage.get('session');
      if (storedSession) {
        this.session = TerminalSessionSchema.parse(storedSession);
      } else {
        return new Response('Session not found', { status: 404 });
      }
    }

    // Ensure data is an object before spreading
    const updateData = typeof data === 'object' && data !== null ? data : {};

    // Validate and merge update data with existing session
    const updatedSession = TerminalSessionSchema.parse({
      ...this.session,
      ...updateData,
      id: this.sessionId, // Prevent ID changes
      updatedAt: now,
      lastActivityAt: now,
    });

    this.session = updatedSession;
    await this.ctx.storage.put('session', this.session);

    this.broadcastToConnections('session-updated', this.session);

    return new Response(JSON.stringify(this.session), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleTerminateSession(): Promise<Response> {
    if (!this.session) {
      return new Response('Session not found', { status: 404 });
    }

    const now = Date.now();
    this.session.status = 'terminated';
    this.session.updatedAt = now;

    await this.ctx.storage.put('session', this.session);

    // Close all WebSocket connections
    for (const [userId, ws] of this.connections) {
      try {
        ws.close(1000, `Session terminated for user ${userId}`);
      } catch {
        // Connection already closed
      }
    }
    this.connections.clear();

    this.broadcastToConnections('session-terminated', this.session);

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
      case 'execute-command':
        // Handle command execution via WebSocket
        break;
      case 'send-input':
        // Handle input via WebSocket
        break;
      case 'resize-terminal':
        this.broadcastToOthers(userId, 'terminal-resize', payload);
        break;
    }
  }

  private async completeCommand(
    commandId: string,
    exitCode: number,
    output: string
  ): Promise<void> {
    const commandIndex = this.commandHistory.findIndex(
      (cmd) => cmd.id === commandId
    );

    if (commandIndex !== -1) {
      const now = Date.now();
      const command = this.commandHistory[commandIndex];

      this.commandHistory[commandIndex] = {
        ...command,
        status: exitCode === 0 ? 'completed' : 'failed',
        exitCode,
        output,
        completedAt: now,
        duration: now - command.startedAt,
      };

      await this.ctx.storage.put('commandHistory', this.commandHistory);

      const terminalOutput = TerminalOutputSchema.parse({
        sessionId: this.sessionId,
        type: 'stdout',
        content: output,
        timestamp: now,
      });

      this.outputBuffer.push(terminalOutput);
      await this.ctx.storage.put('outputBuffer', this.outputBuffer);

      this.broadcastToConnections(
        'command-completed',
        this.commandHistory[commandIndex]
      );
      this.broadcastToConnections('terminal-output', terminalOutput);
    }
  }

  private broadcastToConnections(type: string, data: unknown): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });

    for (const [, ws] of this.connections) {
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

    for (const [userId, ws] of this.connections) {
      if (userId !== excludeUserId) {
        try {
          ws.send(message);
        } catch {
          this.connections.delete(userId);
        }
      }
    }
  }

  async getSession(): Promise<TerminalSession | null> {
    if (!this.session) {
      const storedSession = await this.ctx.storage.get('session');
      if (storedSession) {
        try {
          this.session = TerminalSessionSchema.parse(storedSession);
        } catch {
          this.session = null;
        }
      }
    }
    return this.session;
  }

  async getCommandHistory(): Promise<CommandExecution[]> {
    if (this.commandHistory.length === 0) {
      const storedHistory = await this.ctx.storage.get('commandHistory');
      if (storedHistory) {
        this.commandHistory = storedHistory as CommandExecution[];
      }
    }
    return this.commandHistory;
  }
}

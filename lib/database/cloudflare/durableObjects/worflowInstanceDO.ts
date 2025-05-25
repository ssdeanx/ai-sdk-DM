/**
 * Cloudflare Durable Object for Workflow Instance Management
 *
 * Manages workflow execution state, step progression, and real-time updates.
 * Provides persistent storage for long-running workflow processes.
 *
 * Generated on 2025-05-24
 */

import { DurableObject } from 'cloudflare:workers';
import { generateId } from 'ai';
import { z } from 'zod';

/**
 * Zod schemas for WorkflowInstanceDO operations
 */
const WorkflowStepSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  agentId: z.string(),
  input: z.string().optional(),
  threadId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  result: z.string().optional(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  order: z.number().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const WorkflowExecutionSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  userId: z.string(),
  status: z.enum([
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
    'paused',
  ]),
  currentStepIndex: z.number().default(0),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  duration: z.number().optional(),
  triggeredBy: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const WorkflowProgressUpdateSchema = z.object({
  stepId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  result: z.unknown().optional(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;
type WorkflowProgressUpdate = z.infer<typeof WorkflowProgressUpdateSchema>;

/**
 * WorkflowInstanceDO
 *
 * Durable Object for managing workflow execution state and progression.
 * Handles step-by-step workflow execution with real-time status updates.
 */
export class WorkflowInstanceDO extends DurableObject {
  private executionId: string;
  private execution: WorkflowExecution | null = null;
  private steps: WorkflowStep[] = [];
  private connections: Map<string, WebSocket> = new Map();

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.executionId = this.ctx.id.toString();
  }

  /**
   * Handle fetch requests to the DO.
   * @param request - Incoming request
   * @returns Response
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    try {
      // Handle WebSocket upgrade for real-time updates
      if (request.headers.get('Upgrade') === 'websocket') {
        return await this.handleWebSocketUpgrade(request);
      }

      switch (method) {
        case 'POST':
          if (path === '/start')
            return await this.handleStartExecution(request);
          if (path === '/step') return await this.handleExecuteStep(request);
          if (path === '/pause') return await this.handlePauseExecution();
          if (path === '/resume') return await this.handleResumeExecution();
          if (path === '/cancel') return await this.handleCancelExecution();
          if (path === '/progress')
            return await this.handleUpdateProgressTyped(request);
          break;
        case 'GET':
          if (path === '/status') return await this.handleGetStatus();
          if (path === '/steps') return await this.handleGetSteps();
          if (path === '/execution') return await this.handleGetExecution();
          break;
        case 'PUT':
          if (path === '/step') return await this.handleUpdateStep(request);
          break;
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response(`Internal Server Error: ${error}`, { status: 500 });
    }
  }

  /**
   * Start workflow execution.
   * @param request - Request with execution data
   */
  private async handleStartExecution(request: Request): Promise<Response> {
    const data = await request.json();

    // Validate that data is an object
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return new Response('Invalid data format', { status: 400 });
    }

    const now = Date.now();

    const execution = WorkflowExecutionSchema.parse({
      id: this.executionId,
      ...data,
      status: 'running',
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    this.execution = execution;
    await this.ctx.storage.put('execution', this.execution);

    // Initialize steps if provided
    if ('steps' in data && Array.isArray(data.steps)) {
      this.steps = data.steps.map((step: unknown, index: number) => {
        // Ensure step is an object before spreading
        const stepData =
          typeof step === 'object' && step !== null && !Array.isArray(step)
            ? step
            : {};
        return WorkflowStepSchema.parse({
          ...stepData,
          id: (stepData as Record<string, unknown>)?.id || generateId(),
          workflowId: execution.workflowId,
          status: index === 0 ? 'running' : 'pending',
          order: index,
          createdAt: now,
          updatedAt: now,
        });
      });
      await this.ctx.storage.put('steps', this.steps);
    }

    // Broadcast to connected clients
    this.broadcastUpdate('execution-started', { execution: this.execution });

    return new Response(JSON.stringify(this.execution), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Execute next workflow step.
   */
  private async handleExecuteStep(request: Request): Promise<Response> {
    if (!this.execution) {
      return new Response('No active execution', { status: 404 });
    }

    const data = await request.json();

    // Validate that data is an object
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return new Response('Invalid data format', { status: 400 });
    }

    const stepIndex = this.execution.currentStepIndex;

    if (stepIndex >= this.steps.length) {
      return new Response('No more steps to execute', { status: 400 });
    }

    const currentStep = this.steps[stepIndex];
    const updatedStep = {
      ...currentStep,
      status: 'running' as const,
      ...data,
      updatedAt: Date.now(),
    };

    this.steps[stepIndex] = updatedStep;
    await this.ctx.storage.put('steps', this.steps);

    // Broadcast step update
    this.broadcastUpdate('step-updated', { step: updatedStep });

    return new Response(JSON.stringify(updatedStep), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Update step progress using WorkflowProgressUpdate type.
   */
  private async handleUpdateProgressTyped(request: Request): Promise<Response> {
    const update: WorkflowProgressUpdate = WorkflowProgressUpdateSchema.parse(
      await request.json()
    );
    const stepIndex = this.steps.findIndex((step) => step.id === update.stepId);

    if (stepIndex === -1) {
      return new Response('Step not found', { status: 404 });
    }

    const step = this.steps[stepIndex];
    const updatedStep = {
      ...step,
      status: update.status,
      result: update.result ? JSON.stringify(update.result) : step.result,
      error: update.error || step.error,
      metadata: { ...step.metadata, ...update.metadata },
      updatedAt: Date.now(),
    };

    this.steps[stepIndex] = updatedStep;
    await this.ctx.storage.put('steps', this.steps);

    // Update execution if step is completed or failed
    if (update.status === 'completed' && this.execution) {
      const nextStepIndex = this.execution.currentStepIndex + 1;
      this.execution.currentStepIndex = nextStepIndex;

      // Check if workflow is complete
      if (nextStepIndex >= this.steps.length) {
        this.execution.status = 'completed';
        this.execution.completedAt = Date.now();
        this.execution.duration =
          this.execution.completedAt - (this.execution.startedAt || 0);
      }

      this.execution.updatedAt = Date.now();
      await this.ctx.storage.put('execution', this.execution);
    }

    // Broadcast updates
    this.broadcastUpdate('step-progress', { step: updatedStep });
    if (this.execution) {
      this.broadcastUpdate('execution-updated', { execution: this.execution });
    }

    return new Response(JSON.stringify(updatedStep), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Pause workflow execution.
   */
  private async handlePauseExecution(): Promise<Response> {
    if (!this.execution) {
      return new Response('No active execution', { status: 404 });
    }

    this.execution.status = 'paused';
    this.execution.updatedAt = Date.now();
    await this.ctx.storage.put('execution', this.execution);

    this.broadcastUpdate('execution-paused', { execution: this.execution });

    return new Response(JSON.stringify(this.execution), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Resume workflow execution.
   */
  private async handleResumeExecution(): Promise<Response> {
    if (!this.execution) {
      return new Response('No active execution', { status: 404 });
    }

    this.execution.status = 'running';
    this.execution.updatedAt = Date.now();
    await this.ctx.storage.put('execution', this.execution);

    this.broadcastUpdate('execution-resumed', { execution: this.execution });

    return new Response(JSON.stringify(this.execution), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Cancel workflow execution.
   */
  private async handleCancelExecution(): Promise<Response> {
    if (!this.execution) {
      return new Response('No active execution', { status: 404 });
    }

    this.execution.status = 'cancelled';
    this.execution.completedAt = Date.now();
    this.execution.duration =
      this.execution.completedAt - (this.execution.startedAt || 0);
    this.execution.updatedAt = Date.now();
    await this.ctx.storage.put('execution', this.execution);

    this.broadcastUpdate('execution-cancelled', { execution: this.execution });

    return new Response(JSON.stringify(this.execution), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get workflow execution status.
   */
  private async handleGetStatus(): Promise<Response> {
    if (!this.execution) {
      const storedExecution = await this.ctx.storage.get('execution');
      if (storedExecution) {
        this.execution = WorkflowExecutionSchema.parse(storedExecution);
      }
    }

    return new Response(JSON.stringify(this.execution), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get workflow steps.
   */
  private async handleGetSteps(): Promise<Response> {
    if (this.steps.length === 0) {
      const storedSteps = await this.ctx.storage.get('steps');
      if (storedSteps) {
        this.steps = (storedSteps as unknown[]).map((step) =>
          WorkflowStepSchema.parse(step)
        );
      }
    }

    return new Response(JSON.stringify(this.steps), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get full execution details.
   */
  private async handleGetExecution(): Promise<Response> {
    await this.loadState();

    return new Response(
      JSON.stringify({
        execution: this.execution,
        steps: this.steps,
        connections: this.connections.size,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Update specific step.
   */
  private async handleUpdateStep(request: Request): Promise<Response> {
    const data = await request.json();

    // Validate that data is an object
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return new Response('Invalid data format', { status: 400 });
    }

    // Validate that data has an id property
    if (!('id' in data) || typeof data.id !== 'string') {
      return new Response('Missing or invalid id property', { status: 400 });
    }

    const stepIndex = this.steps.findIndex((step) => step.id === data.id);

    if (stepIndex === -1) {
      return new Response('Step not found', { status: 404 });
    }

    const updatedStep = {
      ...this.steps[stepIndex],
      ...data,
      updatedAt: Date.now(),
    };

    this.steps[stepIndex] = WorkflowStepSchema.parse(updatedStep);
    await this.ctx.storage.put('steps', this.steps);

    this.broadcastUpdate('step-updated', { step: this.steps[stepIndex] });

    return new Response(JSON.stringify(this.steps[stepIndex]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Handle WebSocket upgrade for real-time updates.
   */
  private async handleWebSocketUpgrade(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();

    const connectionId = generateId();
    this.connections.set(connectionId, server);

    server.addEventListener('close', () => {
      this.connections.delete(connectionId);
    });

    server.addEventListener('error', () => {
      this.connections.delete(connectionId);
    });

    // Send current state to new connection
    if (this.execution) {
      server.send(
        JSON.stringify({
          type: 'initial-state',
          data: {
            execution: this.execution,
            steps: this.steps,
          },
        })
      );
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Broadcast update to all connected clients.
   */
  private broadcastUpdate(type: string, data: unknown): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    for (const ws of this.connections.values()) {
      try {
        ws.send(message);
      } catch {
        // Connection might be closed, will be cleaned up on next iteration
      }
    }
  }

  /**
   * Load state from storage.
   */
  private async loadState(): Promise<void> {
    if (!this.execution) {
      const storedExecution = await this.ctx.storage.get('execution');
      if (storedExecution) {
        this.execution = WorkflowExecutionSchema.parse(storedExecution);
      }
    }

    if (this.steps.length === 0) {
      const storedSteps = await this.ctx.storage.get('steps');
      if (storedSteps) {
        this.steps = (storedSteps as unknown[]).map((step) =>
          WorkflowStepSchema.parse(step)
        );
      }
    }
  }
}

/**
 * Workflow Module
 *
 * This module provides a unified interface for working with workflows.
 * It supports different workflow providers like Upstash Workflow and in-memory workflows.
 */

import { v4 as uuidv4 } from 'uuid';
import { getMemoryProvider, memory } from '../memory/factory';

// Import workflow providers - forward declarations
let UpstashWorkflowProvider: any;
let LibSQLWorkflowProvider: any;
let SupabaseWorkflowProvider: any;

// Workflow step status
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed';

// Workflow status
export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused';

// Workflow step interface
export interface WorkflowStep {
  id: string;
  workflowId: string;
  agentId: string;
  input?: string;
  threadId?: string;
  status: WorkflowStepStatus;
  result?: string;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Workflow interface
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  currentStepIndex: number;
  status: WorkflowStatus;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Options for creating a workflow
export interface CreateWorkflowOptions {
  name: string;
  description?: string;
  steps?: Array<{
    agentId: string;
    input?: string;
    threadId?: string;
    metadata?: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}

// Options for adding a step to a workflow
export interface AddWorkflowStepOptions {
  agentId: string;
  input?: string;
  threadId?: string;
  metadata?: Record<string, any>;
}

// Workflow provider interface
export interface WorkflowProvider {
  createWorkflow(options: CreateWorkflowOptions): Promise<Workflow>;
  getWorkflow(id: string): Promise<Workflow | null>;
  listWorkflows(limit?: number, offset?: number): Promise<Workflow[]>;
  deleteWorkflow(id: string): Promise<boolean>;
  addWorkflowStep(
    id: string,
    options: AddWorkflowStepOptions
  ): Promise<Workflow>;
  executeWorkflow(id: string): Promise<Workflow>;
  pauseWorkflow(id: string): Promise<Workflow>;
  resumeWorkflow(id: string): Promise<Workflow>;
}

// In-memory workflow provider
class InMemoryWorkflowProvider implements WorkflowProvider {
  private workflows: Map<string, Workflow> = new Map();

  async createWorkflow(options: CreateWorkflowOptions): Promise<Workflow> {
    const now = new Date().toISOString();
    const workflow: Workflow = {
      id: uuidv4(),
      name: options.name,
      description: options.description,
      steps: [],
      currentStepIndex: 0,
      status: 'pending',
      metadata: options.metadata,
      createdAt: now,
      updatedAt: now,
    };

    // Initialize steps if provided
    if (options.steps && options.steps.length > 0) {
      workflow.steps = options.steps.map((step) => ({
        id: uuidv4(),
        workflowId: workflow.id,
        agentId: step.agentId,
        input: step.input,
        threadId: step.threadId || uuidv4(),
        status: 'pending',
        metadata: step.metadata,
        createdAt: now,
        updatedAt: now,
      }));
    }

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    return this.workflows.get(id) || null;
  }

  async listWorkflows(limit = 10, offset = 0): Promise<Workflow[]> {
    return Array.from(this.workflows.values())
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(offset, offset + limit);
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    return this.workflows.delete(id);
  }

  async addWorkflowStep(
    id: string,
    options: AddWorkflowStepOptions
  ): Promise<Workflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    const now = new Date().toISOString();
    const step: WorkflowStep = {
      id: uuidv4(),
      workflowId: workflow.id,
      agentId: options.agentId,
      input: options.input,
      threadId: options.threadId || uuidv4(),
      status: 'pending',
      metadata: options.metadata,
      createdAt: now,
      updatedAt: now,
    };

    workflow.steps.push(step);
    workflow.updatedAt = now;
    this.workflows.set(id, workflow);

    return workflow;
  }

  async executeWorkflow(id: string): Promise<Workflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    if (workflow.status === 'completed' || workflow.status === 'failed') {
      throw new Error(`Workflow with ID ${id} is already ${workflow.status}`);
    }

    workflow.status = 'running';
    workflow.updatedAt = new Date().toISOString();
    this.workflows.set(id, workflow);

    try {
      // Execute steps starting from the current index
      for (let i = workflow.currentStepIndex; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        workflow.currentStepIndex = i;

        // Update step status
        step.status = 'running';
        step.updatedAt = new Date().toISOString();
        this.workflows.set(id, workflow);

        try {
          // Create a memory thread for this step if not provided
          let threadId = step.threadId;
          if (!threadId) {
            threadId = await memory.createMemoryThread(
              `Workflow ${workflow.name} - Step ${i + 1}`
            );
            step.threadId = threadId;
          }

          // Save the input as a message
          if (step.input) {
            await memory.saveMessage(threadId, 'user', step.input);
          }

          // TODO: Execute the agent with the step input
          // For now, just simulate a successful execution
          const result = `Simulated result for step ${i + 1}`;

          // Save the result as a message
          await memory.saveMessage(threadId, 'assistant', result);

          // Update step with result
          step.status = 'completed';
          step.result = result;
          step.updatedAt = new Date().toISOString();
        } catch (error) {
          // Handle step execution error
          step.status = 'failed';
          step.error = error instanceof Error ? error.message : String(error);
          step.updatedAt = new Date().toISOString();

          // Mark workflow as failed
          workflow.status = 'failed';
          workflow.updatedAt = new Date().toISOString();
          this.workflows.set(id, workflow);

          throw error;
        }
      }

      // Mark workflow as completed
      workflow.status = 'completed';
      workflow.updatedAt = new Date().toISOString();
      this.workflows.set(id, workflow);

      return workflow;
    } catch (error) {
      console.error(`Error executing workflow ${id}:`, error);
      throw error;
    }
  }

  async pauseWorkflow(id: string): Promise<Workflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    if (workflow.status !== 'running') {
      throw new Error(`Workflow with ID ${id} is not running`);
    }

    workflow.status = 'paused';
    workflow.updatedAt = new Date().toISOString();
    this.workflows.set(id, workflow);

    return workflow;
  }

  async resumeWorkflow(id: string): Promise<Workflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    if (workflow.status !== 'paused') {
      throw new Error(`Workflow with ID ${id} is not paused`);
    }

    workflow.status = 'running';
    workflow.updatedAt = new Date().toISOString();
    this.workflows.set(id, workflow);

    return this.executeWorkflow(id);
  }
}

// Import workflow providers
try {
  const { UpstashWorkflowProvider: UpstashProvider } = require('./upstash');
  UpstashWorkflowProvider = UpstashProvider;
} catch (error) {
  console.warn('Error importing Upstash workflow provider:', error);
}

try {
  const { LibSQLWorkflowProvider: LibSQLProvider } = require('./libsql');
  LibSQLWorkflowProvider = LibSQLProvider;
} catch (error) {
  console.warn('Error importing LibSQL workflow provider:', error);
}

// Create a workflow provider based on the memory provider
export function createWorkflowProvider(): WorkflowProvider {
  const memoryProvider = getMemoryProvider();

  switch (memoryProvider) {
    case 'upstash':
      try {
        return new UpstashWorkflowProvider();
      } catch (error) {
        console.warn(
          'Error initializing Upstash workflow provider, falling back to in-memory:',
          error
        );
        return new InMemoryWorkflowProvider();
      }
    case 'libsql':
      try {
        return new LibSQLWorkflowProvider();
      } catch (error) {
        console.warn(
          'Error initializing LibSQL workflow provider, falling back to in-memory:',
          error
        );
        return new InMemoryWorkflowProvider();
      }
    default:
      return new InMemoryWorkflowProvider();
  }
}

// Export a singleton workflow provider
export const workflow = createWorkflowProvider();

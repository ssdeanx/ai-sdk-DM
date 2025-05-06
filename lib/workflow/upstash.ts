/**
 * Upstash Workflow Provider
 *
 * This module provides an implementation of the WorkflowProvider interface using Upstash Redis.
 */

import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../memory/upstash/memoryStore';
import { memory } from '../memory/factory';
import {
  WorkflowProvider,
  Workflow,
  WorkflowStep,
  CreateWorkflowOptions,
  AddWorkflowStepOptions
} from './index';

export class UpstashWorkflowProvider implements WorkflowProvider {
  async createWorkflow(options: CreateWorkflowOptions): Promise<Workflow> {
    const redis = getRedisClient();
    const now = new Date().toISOString();
    const workflowId = uuidv4();

    const workflow: Workflow = {
      id: workflowId,
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
      workflow.steps = await Promise.all(options.steps.map(async (step) => {
        const stepId = uuidv4();
        const threadId = step.threadId || await memory.createMemoryThread(`Workflow ${workflow.name} - Step`);

        const workflowStep: WorkflowStep = {
          id: stepId,
          workflowId,
          agentId: step.agentId,
          input: step.input,
          threadId,
          status: 'pending',
          metadata: step.metadata,
          createdAt: now,
          updatedAt: now,
        };

        // Save step to Redis
        await redis.hset(`workflow:step:${stepId}`, workflowStep as unknown as Record<string, unknown>);

        return workflowStep;
      }));
    }

    // Save workflow to Redis
    await redis.hset(`workflow:${workflowId}`, {
      ...workflow,
      steps: workflow.steps.map(step => step.id), // Store only step IDs in the workflow
    });

    // Add to workflows sorted set
    await redis.zadd('workflows', { score: Date.now(), member: workflowId });

    return workflow;
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    const redis = getRedisClient();

    // Get workflow from Redis
    const workflowData = await redis.hgetall(`workflow:${id}`);

    if (!workflowData || Object.keys(workflowData).length === 0) {
      return null;
    }

    // Parse steps array
    const stepIds = JSON.parse(workflowData.steps as string || '[]');

    // Get all steps
    const steps: WorkflowStep[] = [];
    for (const stepId of stepIds) {
      const stepData = await redis.hgetall(`workflow:step:${stepId}`);
      if (stepData && Object.keys(stepData).length > 0) {
        // Parse metadata if it exists
        if (stepData.metadata) {
          try {
            stepData.metadata = JSON.parse(stepData.metadata as string);
          } catch (e) {
            console.error(`Error parsing step metadata for step ${stepId}:`, e);
            stepData.metadata = {};
          }
        }

        steps.push(stepData as unknown as WorkflowStep);
      }
    }

    // Parse metadata if it exists
    if (workflowData.metadata) {
      try {
        workflowData.metadata = JSON.parse(workflowData.metadata as string);
      } catch (e) {
        console.error(`Error parsing workflow metadata for workflow ${id}:`, e);
        workflowData.metadata = {};
      }
    }

    // Reconstruct the workflow
    const workflow: Workflow = {
      ...workflowData as unknown as Workflow,
      steps,
      currentStepIndex: parseInt(workflowData.currentStepIndex as string, 10) || 0,
    };

    return workflow;
  }

  async listWorkflows(limit = 10, offset = 0): Promise<Workflow[]> {
    const redis = getRedisClient();

    // Get workflow IDs from sorted set
    const workflowIds = await redis.zrange('workflows', offset, offset + limit - 1, { rev: true });

    // Get all workflows
    const workflows: Workflow[] = [];
    for (const workflowId of workflowIds) {
      const workflow = await this.getWorkflow(workflowId as string);
      if (workflow) {
        workflows.push(workflow);
      }
    }

    return workflows;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const redis = getRedisClient();

    // Get workflow to get step IDs
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      return false;
    }

    // Delete all steps
    for (const step of workflow.steps) {
      await redis.del(`workflow:step:${step.id}`);
    }

    // Delete workflow
    await redis.del(`workflow:${id}`);

    // Remove from workflows sorted set
    await redis.zrem('workflows', id);

    return true;
  }

  async addWorkflowStep(id: string, options: AddWorkflowStepOptions): Promise<Workflow> {
    const redis = getRedisClient();

    // Get workflow
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    const now = new Date().toISOString();
    const stepId = uuidv4();
    const threadId = options.threadId || await memory.createMemoryThread(`Workflow ${workflow.name} - Step ${workflow.steps.length + 1}`);

    // Create step
    const step: WorkflowStep = {
      id: stepId,
      workflowId: id,
      agentId: options.agentId,
      input: options.input,
      threadId,
      status: 'pending',
      metadata: options.metadata,
      createdAt: now,
      updatedAt: now,
    };

    // Save step to Redis
    await redis.hset(`workflow:step:${stepId}`, step as unknown as Record<string, unknown>);

    // Update workflow
    workflow.steps.push(step);
    workflow.updatedAt = now;

    // Save workflow to Redis
    await redis.hset(`workflow:${id}`, {
      ...workflow,
      steps: JSON.stringify(workflow.steps.map(s => s.id)),
      updatedAt: now,
    });

    // Update workflow's position in the sorted set
    await redis.zadd('workflows', { score: Date.now(), member: id });

    return workflow;
  }

  async executeWorkflow(id: string): Promise<Workflow> {
    // Implementation similar to InMemoryWorkflowProvider but with Redis persistence
    // This would be a more complex implementation that would need to handle
    // executing agents and updating the workflow state in Redis

    // For now, we'll throw an error
    throw new Error('Upstash workflow execution not implemented yet');
  }

  async pauseWorkflow(id: string): Promise<Workflow> {
    const redis = getRedisClient();

    // Get workflow
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    if (workflow.status !== 'running') {
      throw new Error(`Workflow with ID ${id} is not running`);
    }

    // Update workflow
    workflow.status = 'paused';
    workflow.updatedAt = new Date().toISOString();

    // Save workflow to Redis
    await redis.hset(`workflow:${id}`, {
      ...workflow,
      steps: JSON.stringify(workflow.steps.map(s => s.id)),
      status: workflow.status,
      updatedAt: workflow.updatedAt,
    });

    return workflow;
  }

  async resumeWorkflow(id: string): Promise<Workflow> {
    const redis = getRedisClient();

    // Get workflow
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    if (workflow.status !== 'paused') {
      throw new Error(`Workflow with ID ${id} is not paused`);
    }

    // Update workflow
    workflow.status = 'running';
    workflow.updatedAt = new Date().toISOString();

    // Save workflow to Redis
    await redis.hset(`workflow:${id}`, {
      ...workflow,
      steps: JSON.stringify(workflow.steps.map(s => s.id)),
      status: workflow.status,
      updatedAt: workflow.updatedAt,
    });

    return this.executeWorkflow(id);
  }
}

/**
 * LibSQL Workflow Provider
 *
 * This module provides an implementation of the WorkflowProvider interface using LibSQL.
 */

import { v4 as uuidv4 } from 'uuid';
import { getLibSQLClient, query, transaction } from '../memory/db';
import { memory } from '../memory/factory';
import {
  WorkflowProvider,
  Workflow,
  WorkflowStep,
  CreateWorkflowOptions,
  AddWorkflowStepOptions
} from './index';

export class LibSQLWorkflowProvider implements WorkflowProvider {
  async createWorkflow(options: CreateWorkflowOptions): Promise<Workflow> {
    const db = getLibSQLClient();
    const now = new Date().toISOString();
    const workflowId = uuidv4();

    // Create workflow
    await db.execute({
      sql: `
        INSERT INTO workflows (
          id, name, description, current_step_index, status, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        workflowId,
        options.name,
        options.description || null,
        0,
        'pending',
        options.metadata ? JSON.stringify(options.metadata) : null,
        now,
        now
      ],
    });

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

    // Create steps if provided
    if (options.steps && options.steps.length > 0) {
      for (const stepOption of options.steps) {
        const stepId = uuidv4();
        const threadId = stepOption.threadId || await memory.createMemoryThread(`Workflow ${options.name} - Step`);

        await db.execute({
          sql: `
            INSERT INTO workflow_steps (
              id, workflow_id, agent_id, input, thread_id, status, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            stepId,
            workflowId,
            stepOption.agentId,
            stepOption.input || null,
            threadId,
            'pending',
            stepOption.metadata ? JSON.stringify(stepOption.metadata) : null,
            now,
            now
          ],
        });

        workflow.steps.push({
          id: stepId,
          workflowId,
          agentId: stepOption.agentId,
          input: stepOption.input,
          threadId,
          status: 'pending',
          metadata: stepOption.metadata,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return workflow;
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    const db = getLibSQLClient();

    // Get workflow
    const workflowResult = await db.execute({
      sql: `
        SELECT * FROM workflows WHERE id = ?
      `,
      args: [id],
    });

    if (workflowResult.rows.length === 0) {
      return null;
    }

    const workflowRow = workflowResult.rows[0];

    // Get steps
    const stepsResult = await db.execute({
      sql: `
        SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY created_at
      `,
      args: [id],
    });

    const steps: WorkflowStep[] = stepsResult.rows.map(row => {
      let metadata = null;
      if (row.metadata) {
        try {
          metadata = JSON.parse(row.metadata as string);
        } catch (e) {
          console.error(`Error parsing step metadata for step ${row.id}:`, e);
        }
      }

      return {
        id: row.id as string,
        workflowId: row.workflow_id as string,
        agentId: row.agent_id as string,
        input: row.input as string,
        threadId: row.thread_id as string,
        status: row.status as 'pending' | 'running' | 'completed' | 'failed',
        result: row.result as string,
        error: row.error as string,
        metadata,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      };
    });

    // Parse metadata
    let metadata = null;
    if (workflowRow.metadata) {
      try {
        metadata = JSON.parse(workflowRow.metadata as string);
      } catch (e) {
        console.error(`Error parsing workflow metadata for workflow ${id}:`, e);
      }
    }

    // Construct workflow
    const workflow: Workflow = {
      id: workflowRow.id as string,
      name: workflowRow.name as string,
      description: workflowRow.description as string,
      steps,
      currentStepIndex: workflowRow.current_step_index as number,
      status: workflowRow.status as 'pending' | 'running' | 'completed' | 'failed' | 'paused',
      metadata,
      createdAt: workflowRow.created_at as string,
      updatedAt: workflowRow.updated_at as string,
    };

    return workflow;
  }

  async listWorkflows(limit = 10, offset = 0): Promise<Workflow[]> {
    const db = getLibSQLClient();

    // Get workflows
    const workflowsResult = await db.execute({
      sql: `
        SELECT * FROM workflows ORDER BY updated_at DESC LIMIT ? OFFSET ?
      `,
      args: [limit, offset],
    });

    // Get all workflows with their steps
    const workflows: Workflow[] = [];
    for (const workflowRow of workflowsResult.rows) {
      const workflow = await this.getWorkflow(workflowRow.id as string);
      if (workflow) {
        workflows.push(workflow);
      }
    }

    return workflows;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const db = getLibSQLClient();

    try {
      // Delete workflow and its steps in a transaction
      await transaction([
        {
          sql: 'DELETE FROM workflow_steps WHERE workflow_id = ?',
          params: [id]
        },
        {
          sql: 'DELETE FROM workflows WHERE id = ?',
          params: [id]
        }
      ]);

      return true;
    } catch (error) {
      console.error(`Error deleting workflow ${id}:`, error);
      return false;
    }
  }

  async addWorkflowStep(id: string, options: AddWorkflowStepOptions): Promise<Workflow> {
    const db = getLibSQLClient();

    // Get workflow
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    const now = new Date().toISOString();
    const stepId = uuidv4();
    const threadId = options.threadId || await memory.createMemoryThread(`Workflow ${workflow.name} - Step ${workflow.steps.length + 1}`);

    // Create step
    await db.execute({
      sql: `
        INSERT INTO workflow_steps (
          id, workflow_id, agent_id, input, thread_id, status, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        stepId,
        id,
        options.agentId,
        options.input || null,
        threadId,
        'pending',
        options.metadata ? JSON.stringify(options.metadata) : null,
        now,
        now
      ],
    });

    // Update workflow
    await db.execute({
      sql: `
        UPDATE workflows SET updated_at = ? WHERE id = ?
      `,
      args: [now, id],
    });

    // Get updated workflow
    return this.getWorkflow(id) as Promise<Workflow>;
  }

  async executeWorkflow(id: string): Promise<Workflow> {
    // Implementation similar to InMemoryWorkflowProvider but with LibSQL persistence
    // This would be a more complex implementation that would need to handle
    // executing agents and updating the workflow state in LibSQL

    // For now, we'll throw an error
    throw new Error('LibSQL workflow execution not implemented yet');
  }

  async pauseWorkflow(id: string): Promise<Workflow> {
    const db = getLibSQLClient();

    // Get workflow
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    if (workflow.status !== 'running') {
      throw new Error(`Workflow with ID ${id} is not running`);
    }

    const now = new Date().toISOString();

    // Update workflow
    await db.execute({
      sql: `
        UPDATE workflows SET status = ?, updated_at = ? WHERE id = ?
      `,
      args: ['paused', now, id],
    });

    // Get updated workflow
    return this.getWorkflow(id) as Promise<Workflow>;
  }

  async resumeWorkflow(id: string): Promise<Workflow> {
    const db = getLibSQLClient();

    // Get workflow
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    if (workflow.status !== 'paused') {
      throw new Error(`Workflow with ID ${id} is not paused`);
    }

    const now = new Date().toISOString();

    // Update workflow
    await db.execute({
      sql: `
        UPDATE workflows SET status = ?, updated_at = ? WHERE id = ?
      `,
      args: ['running', now, id],
    });

    // Execute workflow
    return this.executeWorkflow(id);
  }
}

/**
 * Supabase Workflow Provider
 *
 * This module provides an implementation of the WorkflowProvider interface using Supabase.
 */

import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '../memory/supabase';
import { memory } from '../memory/factory';
import {
  WorkflowProvider,
  Workflow,
  WorkflowStep,
  CreateWorkflowOptions,
  AddWorkflowStepOptions
} from './index';

export class SupabaseWorkflowProvider implements WorkflowProvider {
  async createWorkflow(options: CreateWorkflowOptions): Promise<Workflow> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const workflowId = uuidv4();

    // Create workflow
    const { error: workflowError } = await supabase
      .from('workflows')
      .insert({
        id: workflowId,
        name: options.name,
        description: options.description,
        current_step_index: 0,
        status: 'pending',
        metadata: options.metadata,
        created_at: now,
        updated_at: now
      });

    if (workflowError) {
      console.error('Error creating workflow:', workflowError);
      throw workflowError;
    }

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

        const { error: stepError } = await supabase
          .from('workflow_steps')
          .insert({
            id: stepId,
            workflow_id: workflowId,
            agent_id: stepOption.agentId,
            input: stepOption.input,
            thread_id: threadId,
            status: 'pending',
            metadata: stepOption.metadata,
            created_at: now,
            updated_at: now
          });

        if (stepError) {
          console.error('Error creating workflow step:', stepError);
          throw stepError;
        }

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
    const supabase = getSupabaseClient();

    // Get workflow
    const { data: workflowData, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (workflowError) {
      if (workflowError.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Error getting workflow:', workflowError);
      throw workflowError;
    }

    // Get steps
    const { data: stepsData, error: stepsError } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', id)
      .order('created_at', { ascending: true });

    if (stepsError) {
      console.error('Error getting workflow steps:', stepsError);
      throw stepsError;
    }

    // Convert steps
    const steps: WorkflowStep[] = stepsData.map(step => ({
      id: step.id,
      workflowId: step.workflow_id,
      agentId: step.agent_id,
      input: step.input,
      threadId: step.thread_id,
      status: step.status,
      result: step.result,
      error: step.error,
      metadata: step.metadata,
      createdAt: step.created_at,
      updatedAt: step.updated_at,
    }));

    // Construct workflow
    const workflow: Workflow = {
      id: workflowData.id,
      name: workflowData.name,
      description: workflowData.description,
      steps,
      currentStepIndex: workflowData.current_step_index,
      status: workflowData.status,
      metadata: workflowData.metadata,
      createdAt: workflowData.created_at,
      updatedAt: workflowData.updated_at,
    };

    return workflow;
  }

  async listWorkflows(limit = 10, offset = 0): Promise<Workflow[]> {
    const supabase = getSupabaseClient();

    // Get workflows
    const { data: workflowsData, error: workflowsError } = await supabase
      .from('workflows')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (workflowsError) {
      console.error('Error listing workflows:', workflowsError);
      throw workflowsError;
    }

    // Get all workflows with their steps
    const workflows: Workflow[] = [];
    for (const workflowData of workflowsData) {
      const workflow = await this.getWorkflow(workflowData.id);
      if (workflow) {
        workflows.push(workflow);
      }
    }

    return workflows;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();

    // Delete steps first
    const { error: stepsError } = await supabase
      .from('workflow_steps')
      .delete()
      .eq('workflow_id', id);

    if (stepsError) {
      console.error('Error deleting workflow steps:', stepsError);
      throw stepsError;
    }

    // Delete workflow
    const { error: workflowError } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (workflowError) {
      console.error('Error deleting workflow:', workflowError);
      throw workflowError;
    }

    return true;
  }

  async addWorkflowStep(id: string, options: AddWorkflowStepOptions): Promise<Workflow> {
    const supabase = getSupabaseClient();

    // Get workflow
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    const now = new Date().toISOString();
    const stepId = uuidv4();
    const threadId = options.threadId || await memory.createMemoryThread(`Workflow ${workflow.name} - Step ${workflow.steps.length + 1}`);

    // Create step
    const { error: stepError } = await supabase
      .from('workflow_steps')
      .insert({
        id: stepId,
        workflow_id: id,
        agent_id: options.agentId,
        input: options.input,
        thread_id: threadId,
        status: 'pending',
        metadata: options.metadata,
        created_at: now,
        updated_at: now
      });

    if (stepError) {
      console.error('Error adding workflow step:', stepError);
      throw stepError;
    }

    // Update workflow
    const { error: workflowError } = await supabase
      .from('workflows')
      .update({
        updated_at: now
      })
      .eq('id', id);

    if (workflowError) {
      console.error('Error updating workflow:', workflowError);
      throw workflowError;
    }

    // Get updated workflow
    return this.getWorkflow(id) as Promise<Workflow>;
  }

  async executeWorkflow(id: string): Promise<Workflow> {
    const supabase = getSupabaseClient();

    // Get workflow
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    if (workflow.status === 'completed' || workflow.status === 'failed') {
      throw new Error(`Workflow with ID ${id} is already ${workflow.status}`);
    }

    const now = new Date().toISOString();

    // Update workflow status to running
    const { error: updateError } = await supabase
      .from('workflows')
      .update({
        status: 'running',
        updated_at: now
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating workflow status:', updateError);
      throw updateError;
    }

    try {
      // Execute steps starting from the current index
      for (let i = workflow.currentStepIndex; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];

        // Update current step index
        const { error: indexError } = await supabase
          .from('workflows')
          .update({
            current_step_index: i,
            updated_at: now
          })
          .eq('id', id);

        if (indexError) {
          console.error('Error updating workflow step index:', indexError);
          throw indexError;
        }

        // Update step status to running
        const { error: stepError } = await supabase
          .from('workflow_steps')
          .update({
            status: 'running',
            updated_at: now
          })
          .eq('id', step.id);

        if (stepError) {
          console.error('Error updating step status:', stepError);
          throw stepError;
        }

        try {
          // Create a memory thread for this step if not provided
          let threadId = step.threadId;
          if (!threadId) {
            threadId = await memory.createMemoryThread(`Workflow ${workflow.name} - Step ${i + 1}`);

            // Update step with thread ID
            const { error: threadError } = await supabase
              .from('workflow_steps')
              .update({
                thread_id: threadId,
                updated_at: now
              })
              .eq('id', step.id);

            if (threadError) {
              console.error('Error updating step thread ID:', threadError);
              throw threadError;
            }
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
          const { error: resultError } = await supabase
            .from('workflow_steps')
            .update({
              status: 'completed',
              result,
              updated_at: now
            })
            .eq('id', step.id);

          if (resultError) {
            console.error('Error updating step result:', resultError);
            throw resultError;
          }
        } catch (error) {
          // Handle step execution error
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Update step with error
          const { error: errorUpdateError } = await supabase
            .from('workflow_steps')
            .update({
              status: 'failed',
              error: errorMessage,
              updated_at: now
            })
            .eq('id', step.id);

          if (errorUpdateError) {
            console.error('Error updating step error:', errorUpdateError);
          }

          // Mark workflow as failed
          const { error: workflowError } = await supabase
            .from('workflows')
            .update({
              status: 'failed',
              updated_at: now
            })
            .eq('id', id);

          if (workflowError) {
            console.error('Error updating workflow status:', workflowError);
          }

          throw error;
        }
      }

      // Mark workflow as completed
      const { error: completedError } = await supabase
        .from('workflows')
        .update({
          status: 'completed',
          updated_at: now
        })
        .eq('id', id);

      if (completedError) {
        console.error('Error marking workflow as completed:', completedError);
        throw completedError;
      }

      // Get updated workflow
      return this.getWorkflow(id) as Promise<Workflow>;
    } catch (error) {
      console.error(`Error executing workflow ${id}:`, error);
      throw error;
    }
  }

  async pauseWorkflow(id: string): Promise<Workflow> {
    const supabase = getSupabaseClient();

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
    const { error: workflowError } = await supabase
      .from('workflows')
      .update({
        status: 'paused',
        updated_at: now
      })
      .eq('id', id);

    if (workflowError) {
      console.error('Error pausing workflow:', workflowError);
      throw workflowError;
    }

    // Get updated workflow
    return this.getWorkflow(id) as Promise<Workflow>;
  }

  async resumeWorkflow(id: string): Promise<Workflow> {
    const supabase = getSupabaseClient();

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
    const { error: workflowError } = await supabase
      .from('workflows')
      .update({
        status: 'running',
        updated_at: now
      })
      .eq('id', id);

    if (workflowError) {
      console.error('Error resuming workflow:', workflowError);
      throw workflowError;
    }

    // Execute workflow
    return this.executeWorkflow(id);
  }
}

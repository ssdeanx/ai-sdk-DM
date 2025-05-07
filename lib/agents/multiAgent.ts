/**
 * Multi-Agent Orchestration System
 *
 * @module lib/agents/multiAgent
 * @description Implements agent-to-agent communication and workflow orchestration
 * for complex multi-agent scenarios. Allows agents to delegate tasks, share context,
 * and collaborate on solving problems.
 */

import { BaseAgent } from "./baseAgent";
import { agentRegistry } from "./registry";
import { loadMessages, saveMessage } from "../memory/memory";
import { v4 as uuidv4 } from "uuid";
import { toolRegistry } from "../tools/toolRegistry";

/**
 * Represents a step in a multi-agent workflow
 * @interface WorkflowStep
 */
export interface WorkflowStep {
  /** Unique identifier for the step */
  id: string;
  /** ID of the agent that should execute this step */
  agentId: string;
  /** Optional input to provide to the agent */
  input?: string;
  /** Optional thread ID to use for this step */
  threadId?: string;
  /** Status of the workflow step */
  status: "pending" | "running" | "completed" | "failed";
  /** Result of the step execution */
  result?: string;
  /** Error message if the step failed */
  error?: string;
  /** Timestamp when the step was created */
  createdAt: Date;
  /** Timestamp when the step was last updated */
  updatedAt: Date;
}

/**
 * Represents a multi-agent workflow
 * @interface Workflow
 */
export interface Workflow {
  /** Unique identifier for the workflow */
  id: string;
  /** Name of the workflow */
  name: string;
  /** Description of the workflow */
  description?: string;
  /** Array of workflow steps */
  steps: WorkflowStep[];
  /** Current step index */
  currentStepIndex: number;
  /** Status of the workflow */
  status: "pending" | "running" | "completed" | "failed" | "paused";
  /** Timestamp when the workflow was created */
  createdAt: Date;
  /** Timestamp when the workflow was last updated */
  updatedAt: Date;
}

/**
 * Options for creating a new workflow
 * @interface CreateWorkflowOptions
 */
export interface CreateWorkflowOptions {
  /** Name of the workflow */
  name: string;
  /** Description of the workflow */
  description?: string;
  /** Initial steps to add to the workflow */
  steps?: Array<{
    agentId: string;
    input?: string;
    threadId?: string;
  }>;
}

/**
 * Options for agent-to-agent communication
 * @interface AgentCommunicationOptions
 */
export interface AgentCommunicationOptions {
  /** Whether to share the full thread history */
  shareFullHistory?: boolean;
  /** Source thread ID to copy messages from */
  sourceThreadId?: string;
  /** Custom message to send along with the request */
  message?: string;
  /** Whether to wait for the target agent to complete */
  waitForCompletion?: boolean;
  /** Maximum time to wait for completion in milliseconds */
  timeout?: number;
}

/**
 * Multi-Agent orchestrator for complex workflows and agent collaboration
 * @class MultiAgentOrchestrator
 */
export class MultiAgentOrchestrator {
  /** Map of workflow IDs to workflow objects */
  private workflows: Map<string, Workflow> = new Map();
  /** Map of thread IDs to shared context */
  private sharedContexts: Map<string, Record<string, any>> = new Map();

  /**
   * Creates a new workflow for multi-agent collaboration
   * @param options - Options for creating the workflow
   * @returns The created workflow
   */
  public createWorkflow(options: CreateWorkflowOptions): Workflow {
    const now = new Date();
    const workflow: Workflow = {
      id: uuidv4(),
      name: options.name,
      description: options.description,
      steps: [],
      currentStepIndex: 0,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    // Initialize steps if provided
    if (options.steps && options.steps.length > 0) {
      workflow.steps = options.steps.map((step) => ({
        id: uuidv4(),
        agentId: step.agentId,
        input: step.input,
        threadId: step.threadId || uuidv4(),
        status: "pending",
        createdAt: now,
        updatedAt: now,
      }));
    }

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  /**
   * Adds a step to an existing workflow
   * @param workflowId - ID of the workflow to add the step to
   * @param agentId - ID of the agent that should execute this step
   * @param input - Optional input to provide to the agent
   * @param threadId - Optional thread ID to use for this step
   * @returns The updated workflow
   * @throws Error if the workflow is not found
   */
  public addWorkflowStep(
    workflowId: string,
    agentId: string,
    input?: string,
    threadId?: string
  ): Workflow {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    const now = new Date();
    const step: WorkflowStep = {
      id: uuidv4(),
      agentId,
      input,
      threadId: threadId || uuidv4(),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    workflow.steps.push(step);
    workflow.updatedAt = now;
    this.workflows.set(workflowId, workflow);

    return workflow;
  }

  /**
   * Executes a workflow from start to finish or continues execution
   * @param workflowId - ID of the workflow to execute
   * @returns Promise resolving to the completed workflow
   * @throws Error if the workflow is not found or already completed/failed
   */
  public async executeWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    if (workflow.status === "completed" || workflow.status === "failed") {
      throw new Error(`Workflow with ID ${workflowId} is already ${workflow.status}`);
    }

    workflow.status = "running";
    workflow.updatedAt = new Date();
    this.workflows.set(workflowId, workflow);

    try {
      // Ensure tool registry is initialized
      await toolRegistry.initialize();

      // Execute steps starting from the current index
      for (let i = workflow.currentStepIndex; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        workflow.currentStepIndex = i;

        // Update step status
        step.status = "running";
        step.updatedAt = new Date();
        this.workflows.set(workflowId, workflow);

        try {
          // Get the agent for this step
          const agent = await agentRegistry.getAgent(step.agentId);

          // Execute the agent with the step input
          const result = await agent.run(step.input, step.threadId);

          // Update step with result
          step.status = "completed";
          step.result = result.output;
          step.updatedAt = new Date();
        } catch (error) {
          // Handle step execution error
          step.status = "failed";
          step.error = error instanceof Error ? error.message : String(error);
          step.updatedAt = new Date();

          // Mark workflow as failed
          workflow.status = "failed";
          workflow.updatedAt = new Date();
          this.workflows.set(workflowId, workflow);

          throw error;
        }
      }

      // All steps completed successfully
      workflow.status = "completed";
      workflow.updatedAt = new Date();
      this.workflows.set(workflowId, workflow);

      return workflow;
    } catch (error) {
      // Workflow execution failed
      console.error(`Workflow execution failed: ${error}`);
      return this.workflows.get(workflowId)!;
    }
  }

  /**
   * Pauses a running workflow
   * @param workflowId - ID of the workflow to pause
   * @returns The updated workflow
   * @throws Error if the workflow is not found or not running
   */
  public pauseWorkflow(workflowId: string): Workflow {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    if (workflow.status !== "running") {
      throw new Error(`Cannot pause workflow with status ${workflow.status}`);
    }

    workflow.status = "paused";
    workflow.updatedAt = new Date();
    this.workflows.set(workflowId, workflow);

    return workflow;
  }

  /**
   * Resumes a paused workflow
   * @param workflowId - ID of the workflow to resume
   * @returns Promise resolving to the resumed workflow
   * @throws Error if the workflow is not found or not paused
   */
  public async resumeWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    if (workflow.status !== "paused") {
      throw new Error(`Cannot resume workflow with status ${workflow.status}`);
    }

    return this.executeWorkflow(workflowId);
  }

  /**
   * Gets a workflow by ID
   * @param workflowId - ID of the workflow to get
   * @returns The workflow or undefined if not found
   */
  public getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Lists all workflows
   * @returns Array of all workflows
   */
  public listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Enables direct communication between agents
   * @param sourceAgentId - ID of the source agent
   * @param targetAgentId - ID of the target agent
   * @param input - Input to send to the target agent
   * @param options - Options for agent communication
   * @returns Promise resolving to the target agent's response
   * @throws Error if either agent is not found
   */
  public async agentToAgentCommunication(
    sourceAgentId: string,
    targetAgentId: string,
    input: string,
    options: AgentCommunicationOptions = {}
  ): Promise<string> {
    // Ensure tool registry is initialized
    await toolRegistry.initialize();

    // Get the agents
    const sourceAgent = await agentRegistry.getAgent(sourceAgentId);
    const targetAgent = await agentRegistry.getAgent(targetAgentId);

    // Create a new thread for this communication
    const threadId = uuidv4();

    // If sharing full history is enabled and we have a source thread ID
    if (options.shareFullHistory && options.sourceThreadId) {
      // Get messages from source thread
      const messages = await loadMessages(options.sourceThreadId);

      // Save these messages to the new thread
      for (const message of messages) {
        await saveMessage(threadId, message.role, message.content);
      }
    }

    // Add custom message if provided
    if (options.message) {
      await saveMessage(threadId, "system", options.message);
    }

    // Add the input as a user message
    await saveMessage(threadId, "user", `[From Agent: ${sourceAgent.name}] ${input}`);

    // Run the target agent with the prepared thread
    const result = await targetAgent.run(undefined, threadId);

    // Return the response
    return result.output;
  }

  /**
   * Shares context between agents in a workflow
   * @param workflowId - ID of the workflow
   * @param key - Context key
   * @param value - Context value
   * @throws Error if the workflow is not found
   */
  public setSharedContext(workflowId: string, key: string, value: any): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    let context = this.sharedContexts.get(workflowId);
    if (!context) {
      context = {};
      this.sharedContexts.set(workflowId, context);
    }

    context[key] = value;
  }

  /**
   * Gets shared context for a workflow
   * @param workflowId - ID of the workflow
   * @param key - Optional context key to retrieve specific value
   * @returns The shared context or specific value if key is provided
   * @throws Error if the workflow is not found
   */
  public getSharedContext(workflowId: string, key?: string): any {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    const context = this.sharedContexts.get(workflowId) || {};

    if (key) {
      return context[key];
    }

    return context;
  }
}

/**
 * Singleton instance of the MultiAgentOrchestrator
 */
export const multiAgentOrchestrator = new MultiAgentOrchestrator();
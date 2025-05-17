/**
 * Agent system exports
 *
 * This file exports all components of the agent system for easy importing.
 */

// Core agent types
export * from './agent.types';

// Base agent implementation
export { BaseAgent } from './baseAgent';

// Agent registry
export { AgentRegistry, agentRegistry } from './registry';

// Agent service
export * from './agent-service';

// Persona management
export { PersonaManager, personaManager } from './personas/persona-manager';

// Multi-agent orchestration
export { MultiAgentOrchestrator, multiAgentOrchestrator } from './multiAgent';

export type {
  Workflow,
  WorkflowStep,
  CreateWorkflowOptions,
  AgentCommunicationOptions,
} from './multiAgent';

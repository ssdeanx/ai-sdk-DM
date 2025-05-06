# Workflow System

This directory contains the implementation of the workflow system, which allows you to create and execute multi-step workflows involving different agents.

## Overview

The workflow system provides:

1. **Workflow Management**: Create, retrieve, list, and delete workflows
2. **Step Management**: Add steps to workflows and track their execution
3. **Execution Control**: Execute, pause, and resume workflows
4. **Persistence**: Store workflows and their state in the database

## Architecture

The workflow system is designed to be provider-agnostic, with implementations for different storage backends:

- **In-Memory**: Simple in-memory implementation for testing and development
- **LibSQL**: Persistent storage using LibSQL/Turso
- **Upstash**: Persistent storage using Upstash Redis

The system automatically selects the appropriate provider based on the configured memory provider.

## Data Model

### Workflow

A workflow represents a sequence of steps to be executed:

```typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  currentStepIndex: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

### Workflow Step

A step represents a single task to be executed by an agent:

```typescript
interface WorkflowStep {
  id: string;
  workflowId: string;
  agentId: string;
  input?: string;
  threadId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

## Usage

```typescript
import { workflow } from '../workflow';

// Create a workflow
const myWorkflow = await workflow.createWorkflow({
  name: 'My Workflow',
  description: 'A multi-step workflow',
  steps: [
    {
      agentId: 'research-agent',
      input: 'Research the latest AI trends',
    },
    {
      agentId: 'summary-agent',
      input: 'Summarize the research findings',
    },
  ],
});

// Add a step to the workflow
await workflow.addWorkflowStep(myWorkflow.id, {
  agentId: 'report-agent',
  input: 'Generate a report based on the summary',
});

// Execute the workflow
const result = await workflow.executeWorkflow(myWorkflow.id);

// Pause a running workflow
await workflow.pauseWorkflow(myWorkflow.id);

// Resume a paused workflow
await workflow.resumeWorkflow(myWorkflow.id);

// Get a workflow
const retrievedWorkflow = await workflow.getWorkflow(myWorkflow.id);

// List workflows
const workflows = await workflow.listWorkflows(10, 0);

// Delete a workflow
await workflow.deleteWorkflow(myWorkflow.id);
```

## Integration with Memory System

The workflow system integrates with the memory system to store conversation threads and messages. Each step in a workflow has its own thread, which can be used to store the conversation between the agent and the user.

## Database Schema

### LibSQL

```sql
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE workflow_steps (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  input TEXT,
  thread_id TEXT NOT NULL,
  status TEXT NOT NULL,
  result TEXT,
  error TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workflow_id) REFERENCES workflows (id)
);
```

### Upstash Redis

The Upstash implementation uses the following data structures:

- `workflow:{id}` - Hash containing workflow metadata
- `workflows` - Sorted set of workflow IDs, sorted by last updated timestamp
- `workflow:step:{id}` - Hash containing step data

## Future Improvements

- Implement workflow templates
- Add support for conditional branching
- Add support for parallel execution
- Add support for error handling and retries
- Add support for webhooks and notifications

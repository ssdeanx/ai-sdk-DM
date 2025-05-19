# /lib/agents — AI Agent System (AI Assistant Onboarding)

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib/agents`, use the following pattern to enrich your responses:

1. **Background**: This folder implements the Agent framework for the DeanmachinesAI project:

   - **BaseAgent**: Core agent class with lifecycle hooks, tool initialization, and run logic
   - **AgentRegistry**: Loads agent configurations from Supabase and manages agent instances
   - **agent-service**: Orchestrates agent execution with memory, tools, and AI providers
   - **Advanced Features**: Multi-agent orchestration, persistent memory, context window management, and resumable operations
   - **Persona System**: Dynamic persona management with customizable system prompts and model settings

2. **Your Role**: Provide code snippets, refactor suggestions, and troubleshooting steps tailored to:

   - Agent implementation patterns and best practices
   - Registry and service flow optimizations
   - Multi-agent orchestration techniques
   - Advanced state management strategies
   - Dynamic persona configuration

3. **Goals**:

   - Clarify file responsibilities and data flows (Supabase → Agent → Memory → Tools → AI)
   - Offer step-by-step guidance for adding/updating agents, hooks, or multi-agent features
   - Maintain consistency with existing architecture and TypeScript types (`agent.types.ts`)
   - Demonstrate advanced patterns like orchestrator-worker, routing agents, and parallel processing
   - Explain state management techniques for persistent memory and context window optimization

4. **Constraints**:

   - Avoid large-scale refactors unless explicitly requested
   - Align code with Supabase-driven configs and LibSQL memory patterns
   - Use clear, concise explanations and minimal examples
   - Ensure compatibility with the AI SDK's tool pattern
   - Maintain proper error handling and observability integration

5. **Example Prompt**:
   "Explain how to add a lifecycle hook (`onStart`) to `BaseAgent` so that it logs a message before each run, ensuring type safety and minimal changes."

Use this template as context for all code and documentation suggestions in the `agents` folder.

---

## 1. Purpose and Scope

The agents system serves as the core orchestration layer for AI-driven interactions in the DeanmachinesAI platform:

- **Autonomous Agents**: Implements modular agent classes that encapsulate LLM configurations, memory threads, tools, and execution logic.
- **Configuration Management**: Loads agent definitions from Supabase (`agents` table), including model selection, tool assignments, and system prompts.
- **Memory Integration**: Manages conversation history and state via LibSQL (`db.ts`), with support for persistent memory and context window optimization.
- **Tool Orchestration**: Coordinates tool execution with proper initialization, validation, and error handling.
- **Multi-Agent Collaboration**: Supports sophisticated patterns like orchestrator-worker, routing agents, and parallel processing.
- **Dynamic Personas**: Enables customizable agent personas with dynamic system prompt generation and model settings.
- **Lifecycle Management**: Provides hooks for agent initialization, execution, and cleanup with proper state management.
- **Observability**: Integrates with the tracing system for monitoring performance, costs, and usage patterns.
- **Error Handling**: Implements comprehensive error handling with proper fallbacks and recovery mechanisms.

---

## 2. Current Folder Structure & Files

```bash
lib/agents/
├── agent.types.ts       # TypeScript interfaces for Agent configuration rows
├── baseAgent.ts         # Core Agent class: config loading, tool init, run logic
├── agent-service.ts     # Procedural runner: loads config, memory, tools, invokes BaseAgent
├── registry.ts          # AgentRegistry: loads all agents from Supabase into memory
├── multiAgent.ts        # Multi-agent orchestration and communication
├── personas/            # Dynamic persona management
│   └── persona-manager.ts # Persona management and system prompt generation
├── index.ts             # Barrel file exporting all components
├── README.md            # This file: onboarding for AI assistants
```

### 2.1 agent.types.ts

- Defines the `Agent` interface matching Supabase `agents` table (`id`, `name`, `description`, `model_id`, `tool_ids`, `system_prompt`, timestamps).
- Use this for type safety when reading from Supabase.

### 2.2 baseAgent.ts

- Exports `BaseAgent` class.
- Constructor accepts an `Agent` config object, array of tool configs, and optional lifecycle hooks.
- `run(input?, threadId?)` handles:
  1. Memory thread creation via `libsql`.
  2. Loading and saving messages (`memory.ts`).
  3. State loading/saving (`memory.ts`).
  4. Provider initialization (`ai.ts`).
  5. Tool initialization via `toolRegistry` from `@lib/tools/toolRegistry.ts`.
  6. Invocation of `streamText` with messages, tools, and maxSteps.
  7. Lifecycle hooks for `onStart`, `onToolCall`, and `onFinish`.

### 2.3 agent-service.ts

- Exports `runAgent(agentId, memoryThreadId, initialInput?)`.
- Procedural wrapper that directly:
  - Reads agent row from Supabase (`supabase.ts`).
  - Reads model row (`supabase.ts`).
  - Reads tool rows (`supabase.ts`).
  - Delegates to `getLibSQLClient()` (`db.ts`) for memory thread management.
  - Initializes provider & model, builds `aiTools` using `toolRegistry`.
  - Integrates with persona management for dynamic system prompts.
  - Streams response using `ai` SDK with proper error handling.

### 2.4 registry.ts

- Exports `AgentRegistry` and instantiated `agentRegistry` singleton.
- `init()`: loads all agents and their tools from Supabase.
- `listAgents()`: returns array of `BaseAgent` instances.
- `getAgent(id)`: fetches a `BaseAgent` by ID or throws an error.
- `reloadAgent(id)`: reloads a specific agent from Supabase.
- Implements initialization state management with proper error handling.

### 2.5 multiAgent.ts

- Exports `MultiAgentOrchestrator` for complex workflows and agent collaboration.
- Supports workflow creation, execution, and management.
- Enables direct agent-to-agent communication.
- Implements context sharing between agents.

### 2.6 personas/persona-manager.ts

- Exports `PersonaManager` for dynamic persona management.
- Supports system prompt generation with template substitution.
- Provides model settings for different personas.
- Implements CRUD operations for personas.

---

## 3. Agent Loading & Execution Flow

1. **Registry Initialization** (`registry.ts`):

   - Connect to Supabase via `createSupabaseClient()`.
   - Load all `agents` rows.
   - For each agent, load its tool configs and instantiate `BaseAgent(config, tools)`.

2. **Running an Agent** (`agent-service.ts`):

   - Call `runAgent(agentId, threadId, optionalInput)`.
   - Service fetches agent & model configs, loads tools, and manages memory thread.
   - Delegates to either `BaseAgent.run()` or inline logic to stream/generate response.

3. **Memory Management** (`db.ts` / `memory.ts`):

   - Uses LibSQL client for threads and messages.
   - Persists messages and agent state for context.

4. **Tool Invocation**:
   - Tools loaded via `toolRegistry` from `@lib/tools/toolRegistry.ts`.
   - Tool initialization handled by `toolInitializer.ts`.
   - Agents call tools during `streamText` with `maxSteps` support.
   - Lifecycle hooks for tool execution with proper error handling.

## 3.1 Advanced Agent State Management

While the basic agent execution flow handles immediate conversation context, sophisticated agents require more advanced state management:

### 3.1.1 Persistent Memory

Agents need to maintain state beyond the current conversation, including:

- **User Profiles**: Preferences, demographics, and interaction history
- **Long-term Memory**: Knowledge accumulated across multiple sessions
- **Task Progress**: Status of multi-step or long-running tasks
- **Relationship Context**: Evolution of agent-user relationship dynamics

Implementation approaches:

```typescript
// Example of loading persistent memory in BaseAgent
async loadPersistentMemory(userId: string) {
  // Load user-specific memory from database
  const userMemory = await this.memoryProvider.getUserMemory(userId);

  // Integrate with current conversation context
  this.context = {
    ...this.context,
    userProfile: userMemory.profile,
    preferences: userMemory.preferences,
    pastInteractions: userMemory.getRecentInteractions(5)
  };

  return this.context;
}
```

### 3.1.2 Context Window Management

Advanced agents must intelligently manage token limits through:

- **Summarization**: Periodically condensing conversation history
- **Prioritization**: Selecting most relevant context for current query
- **Chunking**: Breaking large contexts into manageable pieces
- **Pruning**: Removing less relevant or outdated information

Example implementation:

```typescript
// Example of context window management in BaseAgent
async prepareContext(messages: Message[], maxTokens: number) {
  // Count tokens in current messages
  const tokenCount = await countTokens(messages);

  if (tokenCount > maxTokens) {
    // Apply prioritization strategy
    const prioritizedMessages = this.prioritizeMessages(messages);

    // Apply summarization if still too large
    if (await countTokens(prioritizedMessages) > maxTokens) {
      return this.summarizeMessages(prioritizedMessages, maxTokens);
    }

    return prioritizedMessages;
  }

  return messages;
}
```

### 3.1.3 Resumable Operations

For long-running agent tasks, implement resumable operations:

- **State Persistence**: Save execution state to database
- **Checkpointing**: Create recovery points during execution
- **Progress Tracking**: Monitor and report task completion percentage
- **Reconnection Logic**: Handle client disconnects gracefully

Example implementation:

```typescript
// Example of resumable operations in agent-service.ts
async function resumeAgent(agentId: string, operationId: string) {
  // Load operation state from database
  const operationState = await getOperationState(operationId);

  if (!operationState) {
    throw new Error(`Operation ${operationId} not found`);
  }

  // Recreate agent instance
  const agent = await agentRegistry.getAgent(agentId);

  // Restore execution state
  agent.restoreState(operationState.agentState);

  // Resume execution from last checkpoint
  return agent.resumeExecution(operationState.checkpoint);
}
```

---

## 4. Multi-Agent Orchestration

Advanced AI applications often require multiple specialized agents working together to solve complex problems. This section outlines approaches for implementing multi-agent systems.

### 4.1 Orchestrator-Worker Pattern

The orchestrator-worker pattern involves a central "orchestrator" agent that plans tasks and delegates them to specialized "worker" agents:

```typescript
// Example orchestrator agent implementation
class OrchestratorAgent extends BaseAgent {
  private workerAgents: Map<string, BaseAgent> = new Map();

  constructor(config: Agent, tools: Tool[], workers: BaseAgent[]) {
    super(config, tools);

    // Register worker agents
    workers.forEach((worker) => {
      this.workerAgents.set(worker.config.id, worker);
    });
  }

  async run(input: string, threadId?: string): Promise<AIResponse> {
    // Create a plan based on the input
    const plan = await this.createPlan(input);

    // Execute each step in the plan
    const results = [];
    for (const step of plan.steps) {
      // Determine which worker to use
      const workerId = step.agentId;
      const worker = this.workerAgents.get(workerId);

      if (!worker) {
        throw new Error(`Worker agent ${workerId} not found`);
      }

      // Execute the step with the worker
      const result = await worker.run(step.input, threadId);
      results.push(result);

      // Update the plan based on the result
      await this.updatePlan(plan, step, result);
    }

    // Synthesize the final response
    return this.synthesizeResults(results, plan);
  }

  private async createPlan(input: string): Promise<Plan> {
    // Use LLM to create a plan with steps
    const planningPrompt = `Create a step-by-step plan to address: ${input}`;
    const response = await generateText({
      model: this.model,
      prompt: planningPrompt,
      temperature: 0.3,
    });

    // Parse the response into a structured plan
    return this.parsePlan(response.text);
  }

  // Additional methods for plan management and result synthesis
}
```

### 4.2 Routing Agent

A routing agent analyzes user queries and directs them to the most appropriate specialized agent:

```typescript
// Example routing logic
async function routeQuery(
  query: string,
  agents: BaseAgent[]
): Promise<BaseAgent> {
  // Generate embeddings for the query
  const queryEmbedding = await generateEmbedding(query);

  // Generate embeddings for each agent's description
  const agentEmbeddings = await Promise.all(
    agents.map(async (agent) => ({
      agent,
      embedding: await generateEmbedding(agent.config.description),
    }))
  );

  // Find the agent with the highest similarity
  let bestMatch = null;
  let highestSimilarity = -Infinity;

  for (const { agent, embedding } of agentEmbeddings) {
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = agent;
    }
  }

  return bestMatch;
}
```

### 4.3 Parallel Processing

For tasks with independent sub-components, implement parallel processing:

```typescript
// Example parallel processing implementation
async function processInParallel(
  query: string,
  agents: BaseAgent[]
): Promise<AIResponse[]> {
  // Create subtasks for each agent
  const subtasks = agents.map((agent) => ({
    agent,
    input: query,
  }));

  // Execute subtasks in parallel
  const results = await Promise.all(
    subtasks.map(async (subtask) => {
      try {
        return await subtask.agent.run(subtask.input);
      } catch (error) {
        console.error(`Error in agent ${subtask.agent.config.id}:`, error);
        return { error };
      }
    })
  );

  return results;
}
```

### 4.4 Inter-Agent Communication

Enable agents to communicate with each other through a message-passing system:

```typescript
// Example message passing system
class AgentMessage {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly content: string,
    public readonly metadata: Record<string, any> = {}
  ) {}
}

class MessageBus {
  private messageQueues: Map<string, AgentMessage[]> = new Map();

  sendMessage(message: AgentMessage): void {
    const queue = this.messageQueues.get(message.to) || [];
    queue.push(message);
    this.messageQueues.set(message.to, queue);
  }

  receiveMessages(agentId: string): AgentMessage[] {
    const queue = this.messageQueues.get(agentId) || [];
    this.messageQueues.set(agentId, []);
    return queue;
  }
}
```

## 5. Persona System

- **Persona** = agent instance with unique `tool_ids`.
- `tool_ids` array on `agents` table controls which built-in or custom tools an agent can call.
- No code change is required to add or remove tools from a persona—update Supabase `tool_ids`.
- When assisting, confirm that `tool_ids` for the target agent align with available tool names.

### 5.1 Dynamic Persona Management

Advanced persona management involves dynamically generating and adapting system prompts based on context:

```typescript
// Example dynamic prompt generation
class DynamicPersonaManager {
  private promptTemplates: Map<string, string> = new Map();

  constructor() {
    // Load prompt templates from database or configuration
    this.loadPromptTemplates();
  }

  async generateSystemPrompt(
    role: string,
    intent: string,
    tone: string = 'neutral',
    context: Record<string, any> = {}
  ): Promise<string> {
    // Get base template for the role
    const roleTemplate = this.promptTemplates.get(role) || '';

    // Get intent-specific instructions
    const intentInstructions =
      this.promptTemplates.get(`${role}_${intent}`) || '';

    // Get tone modifiers
    const toneModifiers = this.promptTemplates.get(`tone_${tone}`) || '';

    // Combine templates
    let combinedTemplate = `${roleTemplate}\n\n${intentInstructions}\n\n${toneModifiers}`;

    // Replace variables with context values
    for (const [key, value] of Object.entries(context)) {
      combinedTemplate = combinedTemplate.replace(`{{${key}}}`, String(value));
    }

    return combinedTemplate;
  }

  private loadPromptTemplates(): void {
    // Example templates
    this.promptTemplates.set(
      'support_agent',
      'You are a helpful support agent for our product.'
    );
    this.promptTemplates.set(
      'support_agent_troubleshooting',
      'Focus on diagnosing and solving technical issues.'
    );
    this.promptTemplates.set(
      'tone_friendly',
      'Use a warm, approachable tone with simple language.'
    );
    // Load more templates from database
  }
}
```

### 5.2 Persona Libraries with customProvider

Use the AI SDK's `customProvider` feature to create a library of personas with pre-configured settings:

```typescript
import { customProvider } from 'ai';
import { openai } from '@ai-sdk/openai';

// Create persona library
export const personas = customProvider({
  languageModels: {
    'support-agent-friendly': openai('gpt-4o', {
      temperature: 0.7,
      system: 'You are a friendly and empathetic support agent...',
    }),
    'support-agent-technical': openai('gpt-4o', {
      temperature: 0.3,
      system: 'You are a precise and technical support agent...',
    }),
    'creative-storyteller': openai('gpt-4o', {
      temperature: 0.9,
      system: 'You are a master storyteller, weave captivating narratives...',
    }),
  },
  fallbackProvider: openai,
});
```

---

## 5. How I (AI Assistant) Should Help

### 5.1. When Adding/Modifying Agents

- Suggest updates to Supabase schema (`agents` table) matching `Agent` interface (`agent.types.ts`).
- Guide edits in `baseAgent.ts` for custom logic or additional hooks.
- Update `registry.ts` if agent loading logic needs extension (e.g., caching).
- Ensure `agent-service.ts` reflects any changes in memory or provider flow.

### 5.2. When Troubleshooting Agents

- Verify Supabase queries in `agent-service.ts` and `registry.ts` for correct table/column usage.
- Check memory loading/saving in `memory.ts` and client instantiation in `db.ts`.
- Inspect tool initialization in `baseAgent.ts` and `tool-execution.ts` for missing executors.
- Log and debug streaming/generation errors from `ai-integration.ts` or `ai.ts` providers.

### 5.3. When Extending Capabilities

- Propose adding multi-agent orchestration in a new `multiAgent.ts` file.
- Suggest lifecycle methods (e.g., `beforeRun` / `afterRun`) in `BaseAgent` for hooks.
- Recommend dynamic agent registration via file discovery or configuration.
- Advise integrating analytics or telemetry around agent runs.

### 5.4. Best Practices

- Maintain separation of concerns: config loading, memory, tools, provider invocation.
- Keep agent logic in `BaseAgent` generic; use subclassing or composition for specialization.
- Use TypeScript types (`agent.types.ts`) to enforce schema correctness.
- Add unit/integration tests for `BaseAgent` run flows and `registry` loading.

---

## 6. Onboarding Steps for a New Agent Persona

1. **Supabase Configuration**:

   - Add row to `agents` table with `id`, `name`, `description`, `model_id`, `tool_ids`, `system_prompt`.

2. **Code Verification**:

   - Run `agentRegistry.init()` to load new agent.
   - Call `agentRegistry.getAgent(newId).run(prompt)` to exercise.

3. **Testing & Feedback**:
   - Validate memory thread creation in LibSQL.
   - Inspect logs for streaming and tool calls.
   - Iterate on `system_prompt` and tool list.

---

## 7. Future Scope / Sprint Items

- [x] **Multi-Agent Orchestration:** Add `multiAgent.ts` for agent-to-agent messaging and workflow delegation.
- [x] **Agent Lifecycle Hooks:** Support `onStart`, `onToolCall`, `onFinish` hooks in `BaseAgent`.
- [x] **Dynamic Persona Management:** Implement `PersonaManager` for system prompt generation.
- [x] **Tool Registry Integration:** Use `toolRegistry` and `toolInitializer` for tool management.
- [x] **Dynamic Persona Loading:** Auto-discover and register agents from a JSON/YAML config folder.
- [x] **Agent Analytics:** Integrate event logging and metrics (e.g., run duration, tool usage).
- [ ] **Versioning & Rollback:** Store agent versions and allow rollbacks via Supabase.
- [x] **Advanced State Management:** Implement persistent memory with user-specific information and preferences.
- [x] **Context Window Management:** Add intelligent token limit handling with summarization and prioritization.
- [ ] **Resumable Agent Operations:** Support reconnecting to long-running operations after disconnection.
- [x] **Hybrid Memory Systems:** Combine conversation history, RAG context, and personalized memory.
- [ ] **Routing Agent:** Create dispatcher agent that analyzes queries and routes to specialized agents.
- [ ] **Parallel Processing:** Implement concurrent execution of multiple independent sub-tasks.
- [ ] **Orchestrator-Worker Pattern:** Develop central agent that plans tasks and delegates to specialized workers.
- [x] **Persona Libraries:** Use `customProvider` to define and select from multiple personas.
- [x] **Stateful Adaptation:** Evolve personas based on interaction history and memory.
- [x] **Error Handling and Fault Tolerance:** Implement retry mechanisms and fallback paths for resilience.

---

## 8. Troubleshooting

- **Agent Not Found**: Ensure `agents` table row exists and `agentRegistry.init()` was called.
- **Tool Missing**: Check `tool_ids` vs. keys from `toolRegistry.getAllTools()`.
- **Tool Registry Issues**: Ensure `toolRegistry.initialize()` is called before using tools.
- **Memory Errors**: Validate LibSQL connection env vars and `memory.ts` queries.
- **Provider Errors**: Verify `model_id`, provider name, and API keys in `models` table.
- **Streaming Issues**: Inspect `streamText` call in `baseAgent.ts` or `agent-service.ts`.
- **Persona Issues**: Check if `personaManager.init()` was called and templates exist.

---

_End of `/lib/agents/README.md`_

# /lib/agents — AI Agent System (AI Assistant Onboarding)

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib/agents`, use the following pattern to enrich your responses:

1. **Background**: This folder implements the Agent framework—`BaseAgent`, `AgentRegistry`, and `agent-service`—for loading agent configs from Supabase and running AI-driven workflows with memory and tools.
2. **Your Role**: Provide code snippets, refactor suggestions, and troubleshooting steps tailored to agent classes, registry logic, and service flows.
3. **Goals**:
   - Clarify file responsibilities and data flows (Supabase → Agent → Memory → Tools → AI).
   - Offer step-by-step guidance for adding/updating agents, hooks, or multi-agent features.
   - Maintain consistency with existing architecture and TypeScript types (`agent.types.ts`).
4. **Constraints**:
   - Avoid large-scale refactors unless explicitly requested.
   - Align code with Supabase-driven configs and LibSQL memory patterns.
   - Use clear, concise explanations and minimal examples.
5. **Example Prompt**:
   "Explain how to add a lifecycle hook (`onStart`) to `BaseAgent` so that it logs a message before each run, ensuring type safety and minimal changes."

Use this template as context for all code and documentation suggestions in the `agents` folder.

---

## 1. Purpose and Scope

- **Agents** are autonomous, modular classes that encapsulate LLM configurations, memory threads, and tools.
- The system loads agent definitions from Supabase (`agents` table), assigns tools, and manages memory via LibSQL (`db.ts`).
- This folder implements the core classes and services for running agents and will eventually support multi-agent orchestration.

---

## 2. Current Folder Structure & Files

```
lib/agents/
├── agent.types.ts       # TypeScript interfaces for Agent configuration rows
├── baseAgent.ts         # Core Agent class: config loading, tool init, run logic
├── agent-service.ts     # Procedural runner: loads config, memory, tools, invokes BaseAgent
├── registry.ts          # AgentRegistry: loads all agents from Supabase into memory
├── README.md            # This file: onboarding for AI assistants
```

### 2.1 agent.types.ts

- Defines the `Agent` interface matching Supabase `agents` table (`id`, `name`, `description`, `model_id`, `tool_ids`, `system_prompt`, timestamps).
- Use this for type safety when reading from Supabase.

### 2.2 baseAgent.ts

- Exports `BaseAgent` class.
- Constructor accepts an `Agent` config object and array of tool configs.
- `run(input?, threadId?)` handles:
  1. Memory thread creation via `libsql`.
  2. Loading and saving messages (`memory.ts`).
  3. State loading/saving (`memory.ts`).
  4. Provider initialization (`ai.ts`).
  5. Tool initialization via `jsonSchemaToZod` and `tool-execution.ts`.
  6. Invocation of `streamText` with messages, tools, and maxSteps.

### 2.3 agent-service.ts

- Exports `runAgent(agentId, memoryThreadId, initialInput?)`.
- Procedural wrapper that directly:
  - Reads agent row from Supabase (`supabase.ts`).
  - Reads model row (`supabase.ts`).
  - Reads tool rows (`supabase.ts`).
  - Delegates to `getLibSQLClient()` (`db.ts`) for memory thread management.
  - Initializes provider & model, builds `aiTools`, and streams response using `ai` SDK.

### 2.4 registry.ts

- Exports `AgentRegistry` and instantiated `agentRegistry` singleton.
- `init()`: loads all agents and their tools from Supabase.
- `listAgents()`: returns array of `BaseAgent` instances.
- `getAgent(id)`: fetches a `BaseAgent` by ID or throws an error.

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
   - Tools loaded via `jsonSchemaToZod()` in `baseAgent.ts` or service.
   - Each tool executor imported from `tool-execution.ts`.
   - Agents call tools during `streamText` with `maxSteps` support.

---

## 4. Persona System

- **Persona** = agent instance with unique `tool_ids`.
- `tool_ids` array on `agents` table controls which built-in or custom tools an agent can call.
- No code change is required to add or remove tools from a persona—update Supabase `tool_ids`.
- When assisting, confirm that `tool_ids` for the target agent align with available tool names.

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

- [ ] **Multi-Agent Orchestration:** Add `multiAgent.ts` for agent-to-agent messaging and workflow delegation.
- [ ] **Agent Lifecycle Hooks:** Support `onStart`, `onToolCall`, `onFinish` hooks in `BaseAgent`.
- [ ] **Dynamic Persona Loading:** Auto-discover and register agents from a JSON/YAML config folder.
- [ ] **Agent Analytics:** Integrate event logging and metrics (e.g., run duration, tool usage).
- [ ] **Versioning & Rollback:** Store agent versions and allow rollbacks via Supabase.

---

## 8. Troubleshooting

- **Agent Not Found**: Ensure `agents` table row exists and `agentRegistry.init()` was called.
- **Tool Missing**: Check `tool_ids` vs. keys from `getAllBuiltInTools()` and `loadCustomTools()`.
- **Memory Errors**: Validate LibSQL connection env vars and `memory.ts` queries.
- **Provider Errors**: Verify `model_id`, provider name, and API keys in `models` table.
- **Streaming Issues**: Inspect `streamText` call in `baseAgent.ts` or `agent-service.ts`.

---

*End of `/lib/agents/README.md`*

# /lib/agents — Agent Framework

_Last updated: 2025-05-05_

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib/agents`, use this onboarding and context-enrichment template. This is designed for maximum clarity, accuracy, and adaptability for future coding agents and maintainers, focused specifically on the agent system.

### 1. Mental Model & System Overview

- `/lib/agents` contains all core logic for agent creation, registration, orchestration, and execution.
- Agents are defined as TypeScript classes (BaseAgent), registered in a central registry, and can be loaded dynamically from Supabase.
- The folder includes the agent base class, registry, service runner, and type definitions for all agent-related data.
- Agents interact with tools, memory, and workflows via well-defined interfaces and hooks.

### 2. Your Role as Coding Agent

- **Diagnose**: Determine if a request is about agent definition, registration, orchestration, or execution.
- **Guide**: Offer code snippets, onboarding steps, and troubleshooting for agent creation, loading, and running.
- **Clarify**: Ask for missing context (e.g., "Is this a new agent type, a registry update, or a run-time orchestration?").
- **Validate**: Ensure new agents are registered, types are updated, and all flows are tested.
- **Explain**: For every suggestion, provide rationale, file references, and potential pitfalls.

### 3. Decision Tree (Where Should Agent Logic Live?)

- **Base agent logic**: `baseAgent.ts` (core class, run loop, memory/tools integration)
- **Agent registry**: `registry.ts` (loads agents from Supabase, caches in memory)
- **Agent service**: `agent-service.ts` (procedural runner, exposes `runAgent()`)
- **Types**: `agent.types.ts` (TypeScript interfaces for all agent data)
- **If unsure**: Ask the user for intent and expected agent workflow.

### 4. Key Files & Integration Points

- **baseAgent.ts**: Abstract class for all agents, defines `run()`, memory, tool, and provider hooks.
- **agent-service.ts**: Exposes `runAgent(agentId, threadId, prompt)` for procedural agent runs.
- **registry.ts**: Loads agents from Supabase, caches for fast lookup, supports hot reload.
- **agent.types.ts**: TypeScript interfaces for agent config, state, and Supabase rows.
- **Supabase**: Agents are defined in the `agents` table, loaded at startup.
- **Memory/Tools**: Agents interact with memory (`lib/memory/`) and tools (`lib/tools/`) via injected dependencies.
- **Workflow**: Advanced orchestration can be implemented in `lib/workflow/` and referenced from agents.

### 5. Advanced Scenarios & Examples

- **Add a new agent**: Define a new class extending `BaseAgent` in `agents/`, add config to Supabase `agents` table, update `agent.types.ts`, and register in `registry.ts`.
- **Run an agent**: Use `runAgent()` from `agent-service.ts` with the agent ID, thread ID, and prompt.
- **Update agent config**: Edit the Supabase `agents` table, update types, and reload the registry.
- **Integrate with tools/memory**: Inject tool/memory dependencies into the agent class, use hooks for context and tool calls.
- **Orchestrate multi-agent flows**: Use `lib/workflow/` to coordinate multiple agents, passing state and context as needed.

### 6. Onboarding & Troubleshooting Checklist

- [x] All agent classes extend `BaseAgent` — 2025-05-05
- [x] Registry loads agents from Supabase and caches in memory — 2025-05-05
- [x] `runAgent()` in `agent-service.ts` is tested and documented — 2025-05-05
- [x] Types in `agent.types.ts` are up to date — 2025-05-05
- [x] Agents interact with tools and memory via dependency injection — 2025-05-05

### 7. Questions to Ask (for Maximum Context)

- Is this a new agent type, or an update to an existing one?
- Should this agent be loaded from Supabase or defined in code?
- Are all required types and Supabase columns up to date?
- Does the agent need access to tools, memory, or workflows?
- Is the agent run loop (`run()`) implemented and tested?

### 8. Common Pitfalls & Anti-Patterns

- Forgetting to register a new agent in `registry.ts` (agent won't be available)
- Type mismatch between Supabase and `agent.types.ts`
- Not injecting tools/memory dependencies (agent can't access context)
- Not handling errors in agent run loop (breaks orchestration)
- Not updating Supabase after schema/type changes

### 9. End-to-End Example (Full Flow)

- Developer defines a new agent class in `baseAgent.ts` or `agents/` → adds config to Supabase `agents` table → updates `agent.types.ts` → registers in `registry.ts` → agent is available for `runAgent()` calls and orchestration.

---

## 1. Folder Structure & File Responsibilities

```
lib/agents/
├── agent-service.ts   # Procedural runner, exposes `runAgent()`
├── agent.types.ts     # TypeScript interfaces for agent config, state, Supabase rows
├── baseAgent.ts       # Abstract base class for all agents, defines run loop and hooks
├── registry.ts        # Loads agents from Supabase, caches in memory, supports hot reload
└── README.md          # This file: overview, onboarding, scope checklists
```

---

## 2. Agent Lifecycle & Integration

- **Definition**: Agents are defined as classes extending `BaseAgent`, with config in Supabase and types in `agent.types.ts`.
- **Registration**: All agents must be registered in `registry.ts` for discovery and hot reload.
- **Execution**: Use `runAgent()` in `agent-service.ts` to execute an agent with a given prompt and context.
- **Integration**: Agents interact with memory (`lib/memory/`), tools (`lib/tools/`), and workflows (`lib/workflow/`) via dependency injection and hooks.
- **State**: Agent state is managed in Supabase and in-memory, with type safety enforced by `agent.types.ts`.

---

## 3. Current Scope Checklist

- [x] BaseAgent class with run loop and hooks
- [x] Agent registry with Supabase loading and hot reload
- [x] Procedural runner (`runAgent()`) in `agent-service.ts`
- [x] TypeScript interfaces for all agent config/state
- [x] Integration with tools, memory, and workflows

---

## 4. Completed Checklist (as of 2025-05-05)

- [x] Agent CRUD via Supabase and type-safe helpers — 2025-05-05
- [x] Agent registry with dynamic reload — 2025-05-05
- [x] Agent run loop with error handling — 2025-05-05
- [x] Agent state management and persistence — 2025-05-05
- [x] Agent-tool-memory integration — 2025-05-05

---

## 5. Future Scope Checklist

- [ ] Multi-agent orchestration and planning (`lib/workflow/`, `agents/multiAgent.ts`)
- [ ] Agent lifecycle hooks (preLoad, postRun, onError, onToolCall, onMemoryUpdate)
- [ ] Advanced state management and persistence (versioning, migrations)
- [ ] Telemetry and analytics for agent runs (Langfuse, OpenTelemetry, custom metrics)
- [ ] Automated and integration tests for agent flows and error boundaries
- [ ] Admin UI/API for agent management, inspection, and live debugging
- [ ] Documentation and code samples for custom agent development
- [ ] Agent versioning and rollback
- [ ] Agent sandboxing and security (resource limits, isolation)
- [ ] Real-time agent collaboration and event streaming
- [ ] Agent plugin system for runtime extension
- [ ] Supabase/LibSQL schema evolution and migration scripts

---

## 5. Troubleshooting

- **Agent not found**: Check registration in `registry.ts` and Supabase `agents` table.
- **Type errors**: Ensure `agent.types.ts` matches Supabase schema.
- **Run loop issues**: Debug `run()` implementation in agent class.
- **Dependency errors**: Verify tools/memory are injected and available.
- **Orchestration failures**: Inspect workflow integration and state passing.

---

_End of `/lib/agents/README.md`_

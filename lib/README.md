# /lib — Core Backend Library

_Last updated: 2025-05-05_

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib`, use this onboarding and context-enrichment template. This is designed for maximum clarity, accuracy, and adaptability for future coding agents and maintainers.

### 1. Mental Model & System Overview

- `/lib` is the backend core for all agent, tool, memory, workflow, and integration logic in ai-sdk-DM.
- It bridges:
  - **Supabase**: for persistent app config, agent, tool, and model data (see `db/supabase/schema.ts`, `types/supabase.ts`).
  - **LibSQL/Turso**: for agent memory, threads, messages, embeddings, and vector search (see `db/libsql/schema.ts`).
  - **AI Providers**: Unified abstraction for Google and future LLMs (see `ai.ts`, `google-ai.ts`, `ai-integration.ts`).
  - **Langfuse & OpenTelemetry**: For observability, tracing, and analytics (see `langfuse-integration.ts`, and OpenTelemetry packages in `package.json`).
- All API routes and frontend hooks ultimately use helpers from this folder for CRUD, agent runs, tool execution, and memory.
- **Environment variables**: Always check `.env.local.example` for the required variables. If you see connection or credential errors, compare your `.env.local` to `.env.local.example` and ensure all required variables are set. All code should check for these variables as shown in `supabase.ts`, `db.ts`, and `google-ai.ts`.

### 2. Your Role as Coding Agent

- **Diagnose**: Quickly determine if a request is about agent logic, tool execution, memory, workflow, or provider integration.
- **Guide**: Offer step-by-step, type-safe code and migration examples for any CRUD, schema, or agent/tool/memory/workflow operation.
- **Clarify**: Ask for missing context (e.g., "Is this a new tool, agent, or memory feature? Should it be exposed via an API route?").
- **Validate**: Always check that types, schema, and API routes are in sync after any change.
- **Explain**: For every suggestion, provide rationale, file references, and potential pitfalls.
- **Reference**: Remind users to check `.env.local.example` for all required environment variables before running or deploying.

### 3. Decision Tree (Where Should Logic Live?)

- **Agent logic**: `agents/` (BaseAgent, registry, service, types)
- **Tool logic**: `tools/`, `tool-execution.ts`, `tools.ts`
- **Memory/persistence**: `memory/` (threads, messages, embeddings, state)
- **Workflow orchestration**: `workflow/`
- **AI provider abstraction**: `ai.ts`, `ai-integration.ts`, `google-ai.ts`
- **API error handling**: `api-error-handler.ts`
- **General utilities**: `utils.ts`, `langfuse-integration.ts`
- **If unsure**: Ask the user for intent and expected workflow.

### 4. Key Files & Integration Points

- **Agents**:
  - `agents/baseAgent.ts`, `agents/agent-service.ts`, `agents/registry.ts`, `agents/agent.types.ts`
- **Tools**:
  - `tools/` (category modules), `tool-execution.ts`, `tools.ts`, `types/tools.ts`
- **Memory**:
  - `memory/` (see that folder's README for details)
- **Workflow**:
  - `workflow/` (for advanced orchestration, pipelines, or multi-agent flows)
- **AI Providers**:
  - `ai.ts`, `ai-integration.ts`, `google-ai.ts`
- **Error Handling & Utilities**:
  - `api-error-handler.ts`, `utils.ts`, `langfuse-integration.ts`
- **Environment**:
  - Reference `.env.local.example` for all required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `LIBSQL_DATABASE_URL`, `LIBSQL_AUTH_TOKEN`, `GOOGLE_API_KEY`, etc.

### 5. Advanced Scenarios & Examples

- **Add a new agent**: Update `db/supabase/schema.ts`, `types/supabase.ts`, add logic in `agents/`, expose via `/api/agents`, and test with `use-supabase-crud`.
- **Register a new tool**: Add to `tools/` (category module), update `tools.ts` and `tool-execution.ts`, and add schema in Supabase if needed.
- **Integrate a new AI provider**: Extend `ai.ts` and `ai-integration.ts`, add config in Supabase `models` table, and update types.
- **Add a workflow**: Implement in `workflow/`, connect to agents/tools/memory as needed.
- **Expose new data to frontend**: Add/extend an API route in `app/api/`, update hooks, and ensure types are correct.
- **Check environment**: Always verify `.env.local` matches `.env.local.example` before running scripts or deploying.

### 6. Onboarding & Troubleshooting Checklist

- [x] Confirm `.env.local` is set for all required services (see `.env.local.example`). — 2025-05-05
- [x] Validate schema and types are in sync (`db/supabase/schema.ts`, `types/supabase.ts`, `db/libsql/schema.ts`). — 2025-05-05
- [x] Run Drizzle migrations after any schema change. — 2025-05-05
- [x] Test CRUD via API routes and hooks (`use-supabase-crud`, `use-supabase-fetch`). — 2025-05-05
- [x] For agent/memory/tool/workflow issues, check the relevant folder and README. — 2025-05-05
- [x] For API errors, check error logs and ensure all helpers are imported from the correct file. — 2025-05-05
- [x] After adding a new feature, update this README and the checklist. — 2025-05-05

### 7. Questions to Ask (for Maximum Context)

- Is this logic for an agent, tool, memory, workflow, or provider?
- Should this be exposed via an API route, or is it internal only?
- Are you using the correct types and updating them after schema changes?
- Is this change compatible with the current frontend hooks and API routes?
- Are all required environment variables set in `.env.local` as shown in `.env.local.example`?

### 8. Common Pitfalls & Anti-Patterns

- Forgetting to update types after schema changes (causes runtime errors).
- Mixing up agent/tool/memory/workflow/provider responsibilities (leads to bugs or duplication).
- Not handling errors or missing environment variables (causes silent failures).
- Not updating API routes or hooks after schema changes (breaks frontend).
- Not running migrations after schema updates (DB out of sync).
- Not checking `.env.local.example` for new or changed environment variables.

### 9. End-to-End Example (Full Flow)

- User creates a new agent in the UI → API route `/api/agents` → `createItem` in `lib/memory/supabase.ts` → row in Supabase DB → type in `types/supabase.ts` → agent available in registry.
- User adds a new tool → update `tools/`, `tool-execution.ts`, and Supabase schema/types → tool available for agent use.
- User sends a chat message → API route `/api/threads` → `saveMessage` in `memory.ts` → message row in LibSQL → embedding generated and stored → message available for vector search and context window.
- User creates a workflow → implement in `workflow/`, connect to agents/tools/memory as needed.
- User or agent runs any script or deploy: always check `.env.local.example` for required variables first.

### 10. Advanced Agent Techniques (2025+)

- Modular, hot-swappable agent, tool, memory, and workflow processors.
- Multi-agent orchestration and shared context via message bus.
- Self-diagnosis and schema/type validation before running.
- Traceable, explainable actions with rationale and file references.
- Continuous validation: type checks, lint, and integration tests after every change.
- Prompt engineering: meta-prompts with explicit goals, constraints, and recent actions.
- Context window management: dynamic summarization, pruning, and vector recall.
- Adversarial testing and fallback strategies for robustness.
- Auto-sync types and migrations after schema changes.
- Interactive onboarding checklists and scenario-driven examples.

---

## 1. Folder Structure & File Responsibilities

```
lib/
├── agentic-integration.ts      # High-level hooks for agentic SDK flows (custom orchestration)
├── agents/                     # Agent framework: BaseAgent, registry, service, types, onboarding
├── ai-integration.ts           # Low-level AI SDK streaming/generation, token count, embeddings, vector search
├── ai.ts                       # High-level provider/model abstraction loaded from Supabase
├── api-error-handler.ts        # Central error wrapper for API endpoints and service layers
├── google-ai.ts                # Google Generative AI integration with Supabase model config
├── langfuse-integration.ts     # Telemetry integration via Langfuse API (see also OpenTelemetry below)
├── memory/                     # Memory & persistence: threads, messages, embeddings, state management
├── mock-data/                  # Seed data and examples for local development/testing
├── tool-execution.ts           # Dispatcher mapping tool names to executor functions
├── tools/                      # Built-in tool modules categorized (web, code, data, file, api, rag)
├── tools.ts                    # Schema utilities: JSON Schema → Zod, tool validation helpers
├── workflow/                   # Workflow orchestration, pipelines, and multi-agent flows
└── README.md                   # This file: lib overview, onboarding, scope checklists
```

---

## 2. Component Overview

### 2.1 AI Integrations

- **ai-integration.ts**: Low-level wrappers for `streamText`/`generateText`, token counting (`js-tiktoken`), embedding generation (`@xenova/transformers`), and vector search.
- **ai.ts**: Unified entry point to select and initialize AI providers (Google, future OpenAI/Anthropic) based on Supabase `models` table.
- **google-ai.ts**: Specialized Google Generative AI functions (`streamGoogleAI`, `generateGoogleAI`) with Supabase-driven config lookup.
- **agentic-integration.ts**: High-level SDK integration for multi-step and orchestrated agentic flows (if using @agentic/core).

### 2.2 Agents Framework

- Located in `agents/`:
  - **baseAgent.ts**: Core Agent class with `run()` logic (memory, tools, provider, state).
  - **agent-service.ts**: Procedural runner exposing a simple `runAgent()` function.
  - **registry.ts**: Loads and caches agents from Supabase at startup.
  - **agent.types.ts**: TypeScript interface for Supabase `agents` rows.

### 2.3 Memory & Persistence

- Moved to `memory/`:
  - **db.ts** & **libsql.ts**: LibSQL client and raw query helpers.
  - **memory.ts**: High-level memory API (threads, messages, embeddings, state, summarization, semantic search).
  - **vector-store.ts, store-embedding.ts, memory-processors.ts**: Vector search, batch embedding, and message processing helpers.

### 2.4 Tools System

- **tools/**: Category-based modules (`web-tools.ts`, `code-tools.ts`, etc.) each exporting a `tools` map of executors.
- **tool-execution.ts**: Imports all built-in tools and custom tools loader, dispatches calls by key.
- **tools.ts**: Utility functions for JSON Schema → Zod conversion and schema validation.

### 2.5 Workflow Orchestration

- **workflow/**: For advanced agent orchestration, pipelines, and multi-agent flows.

### 2.6 Utilities & Observability

- **api-error-handler.ts**: Wrap routes or service functions to normalize and log errors.
- **utils.ts**: Misc helpers (e.g., `cn` for Tailwind class merging).
- **langfuse-integration.ts**: Telemetry/tracing with Langfuse. See also OpenTelemetry packages in `package.json`:
  - `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/sdk-metrics`, etc.
  - These enable distributed tracing, metrics, and logs for all backend operations. Future work: full OTel integration for all agent/tool/memory flows.

---

## 3. Onboarding & Getting Started

1. **Environment**:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (Supabase client)
   - `LIBSQL_DATABASE_URL`, `LIBSQL_AUTH_TOKEN` (LibSQL memory)
   - `GOOGLE_API_KEY` (or other provider keys)
   - See `.env.local.example` for all required variables.
2. **Database Init**:
   - Run `pnpm tsx scripts/init-database.ts` to create memory tables.
   - Run `pnpm tsx scripts/init-supabase.ts` to scaffold Supabase tables (`models`, `tools`, `agents`, `settings`).
3. **Seed Data (Optional)**:
   - Use files in `lib/mock-data/` to populate baseline agents, models, and tools.
4. **Load Agents**:

   ```ts
   import { agentRegistry } from "./agents/registry"
   await agentRegistry.init()
   ```

5. **Run an Agent**:

   ```ts
   import { runAgent } from "./agents/agent-service"
   const response = await runAgent("agent-id", "thread-id", "Your prompt here")
   ```

6. **Invoke Tools Directly** (for testing):

   ```ts
   import { getAllBuiltInTools, loadCustomTools } from "./tools/index"
   const tools = { ...getAllBuiltInTools(), ...(await loadCustomTools()) }
   const result = await tools.web_search({ query: "example" })
   ```

---

## 4. Current Scope Checklist

- [x] **AI abstraction**: `ai.ts`, `ai-integration.ts`, `google-ai.ts`, `agentic-integration.ts`
- [x] **Agents**: BaseAgent, registry, service, types in `agents/`
- [x] **Memory**: Moved to `memory/`, high-level and raw APIs
- [x] **Tools**: Built-in modules (`tools/`), dispatcher (`tool-execution.ts`), schema utils (`tools.ts`)
- [x] **Supabase Helper**: `supabase.ts`, generic CRUD and `getItemById`/`getData`
- [x] **Error Handling**: `api-error-handler.ts`
- [x] **Utilities**: `utils.ts`, placeholder mock data in `mock-data/`
- [x] **Workflow**: Orchestration and pipelines in `workflow/`
- [x] **Langfuse/OTel**: Initial integration for tracing and metrics

---

## 5. Completed Checklist (as of 2025-05-05)

- [x] Memory processors: Modular pipelines for message transformations (`memory/memory-processors.ts`) — 2025-05-05
- [x] Vector store module (`memory/vector-store.ts`) — 2025-05-05
- [x] Embedding batch helper (`memory/store-embedding.ts`) — 2025-05-05
- [x] LRU cache integration (`lru-cache` in memory layer) — 2025-05-05
- [x] Langfuse and OpenTelemetry initial integration — 2025-05-05

## 6. Future Scope Checklist

- [ ] Full Langfuse and OpenTelemetry instrumentation for all agent, tool, and memory flows
- [ ] Multi-Agent Orchestration and advanced workflow patterns (`workflow/`, `agents/multiAgent.ts`)
- [ ] Additional AI providers: Google Vertex, custom LLMs, dynamic registry
- [ ] Agent lifecycle hooks in BaseAgent
- [ ] Admin UI/API for agents, tools, and memory inspection
- [ ] Automated and integration tests for all core modules
- [ ] Documentation and code samples for all public APIs
- [ ] Drizzle migrations and rollback for Supabase and LibSQL schemas
  
---

## 6. Troubleshooting

- **Supabase failures**: Validate `SUPABASE_URL`/`SUPABASE_ANON_KEY`, inspect table schemas, and check Drizzle migrations.
- **Memory errors**: Test `getLibSQLClient().isDatabaseAvailable()`, verify `memory_threads`, `messages`, `embeddings` tables.
- **Agent load issues**: Confirm `agentRegistry.init()` is called, inspect Supabase `agents` rows.
- **Tool not found**: Ensure name matches in `tools/` map and in Supabase `tools` table.
- **AI provider errors**: Verify model config in Supabase `models` table and provider API keys.
- **Telemetry/OTel**: Check Langfuse and OpenTelemetry setup, ensure all required env vars are set.
- **Migrations**: Always use Drizzle for schema changes and keep types in sync.

---

Refer to folder-specific READMEs (`agents/README.md`, `tools/README.md`, `memory/README.md`) for deeper context, or the top-level [docs/](../docs/) directory for detailed guides.

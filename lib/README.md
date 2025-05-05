# /lib — Core Backend Library

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib`, use the following context-enrichment pattern:

1. **Background**: `/lib` contains backend modules for AI agents, memory, tools, and utilities in the ai-sdk-DM project.
2. **Your Role**: Provide code suggestions, documentation, and troubleshooting tailored to these modules.
3. **Goals**:
   - Quickly orient on file responsibilities and folder structure.
   - Offer actionable steps to add, update, or debug components.
   - Maintain consistency with existing architecture and TypeScript conventions.
4. **Constraints**:
   - Do not propose refactors unless requested.
   - Align examples with Supabase-driven config and LibSQL memory.
   - Use clear, concise explanations and code snippets.
5. **Example Prompt**:
   "You are a TypeScript coding assistant. Explain how to add a new tool in `/lib/tools`: include Supabase entry, module code, registration in index.ts, and assignment to an agent persona."

Use this pattern as a template when generating or updating code and documentation in `/lib`.

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
├── langfuse-integration.ts     # (Optional) Telemetry integration via Langfuse API
├── memory/                     # Memory & persistence: threads, messages, embeddings, state management
├── mock-data/                  # Seed data and examples for local development/testing
├── tool-execution.ts           # Dispatcher mapping tool names to executor functions
├── tools/                      # Built-in tool modules categorized (web, code, data, file, api, rag)
├── tools.ts                    # Schema utilities: JSON Schema → Zod, tool validation helpers
├── utils.ts                    # General-purpose utilities (e.g., `cn` for class merging)
└── README.md                   # This file: lib overview, onboarding, scope checklists
```

- Files previously in root (`db.ts`, `libsql.ts`, `memory.ts`) have been moved into `lib/memory/` for clearer separation of persistence logic.

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
  - **... additional files (vector-store.ts, store-embedding.ts) pending**

### 2.4 Tools System

- **tools/**: Category-based modules (`web-tools.ts`, `code-tools.ts`, etc.) each exporting a `tools` map of executors.
- **tool-execution.ts**: Imports all built-in tools and custom tools loader, dispatches calls by key.
- **tools.ts**: Utility functions for JSON Schema → Zod conversion and schema validation.

### 2.5 Utilities & Helpers

- **api-error-handler.ts**: Wrap routes or service functions to normalize and log errors.
- **utils.ts**: Misc helpers (e.g., `cn` for Tailwind class merging).
- **langfuse-integration.ts**: Optional telemetry/tracing with Langfuse.

---

## 3. Onboarding & Getting Started

1. **Environment**:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (Supabase client)
   - `LIBSQL_DATABASE_URL`, `LIBSQL_AUTH_TOKEN` (LibSQL memory)
   - `GOOGLE_API_KEY` (or other provider keys)
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

---

## 5. Future Scope Checklist

- [ ] Multi-Agent Orchestration (`agents/multiAgent.ts`)
- [ ] Memory processors: Modular pipelines for message transformations (`memory/plugins/`)
- [ ] Vector store module (`memory/vector-store.ts`)
- [ ] Embedding batch helper (`memory/store-embedding.ts`)
- [ ] LRU cache integration (`lru-cache` in memory layer)
- [ ] Additional AI providers: OpenAI, Anthropic, dynamic registry
- [ ] Agent lifecycle hooks in BaseAgent
- [ ] Schema migrations with a formal tool (e.g., Liquibase)
- [ ] Telemetry and analytics (Langfuse, custom metrics)
- [ ] Admin UI/API for agents, tools, and memory inspection

---

## 6. Troubleshooting

- **Supabase failures**: Validate `SUPABASE_URL`/`SUPABASE_ANON_KEY`, inspect table schemas.
- **Memory errors**: Test `getLibSQLClient().isDatabaseAvailable()`, verify `memory_threads`, `messages`, `embeddings` tables.
- **Agent load issues**: Confirm `agentRegistry.init()` is called, inspect Supabase `agents` rows.
- **Tool not found**: Ensure name matches in `tools/` map and in Supabase `tools` table.
- **AI provider errors**: Verify model config in Supabase `models` table and provider API keys.

---

Refer to folder-specific READMEs (`agents/README.md`, `tools/README.md`, `memory/README.md`) for deeper context, or the top-level [docs/](../docs/) directory for detailed guides.

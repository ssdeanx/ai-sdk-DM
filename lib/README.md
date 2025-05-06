# /lib — Core Backend Library

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib`, use the following context-enrichment pattern:

1. **Background**: `/lib` contains backend modules for AI agents, memory, tools, and utilities in the ai-sdk-DM project.
2. **Your Role**: Provide code suggestions, documentation, and troubleshooting tailored to these modules.
3. **Goals**:
   - Quickly orient on file responsibilities and folder structure.
   - Offer actionable steps to add, update, or debug components.
   - Maintain consistency with existing architecture and TypeScript conventions.
   - Ensure all persistence is handled via Supabase (for config, models, agents, tools, content) and LibSQL (for agent memory, threads, messages, embeddings, state).
   - Reference Drizzle schemas and migrations for both DBs.
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
├── memory/                     # Memory & persistence: threads, messages, embeddings, state management (LibSQL)
├── mock-data/                  # Seed data and examples for local development/testing
├── tool-execution.ts           # Dispatcher mapping tool names to executor functions
├── tools/                      # Built-in tool modules categorized (web, code, data, file, api, rag)
├── tools.ts                    # Schema utilities: JSON Schema → Zod, tool validation helpers
├── utils.ts                    # General-purpose utilities (e.g., `cn` for class merging)
└── README.md                   # This file: lib overview, onboarding, scope checklists
```

- All config, models, agents, tools, and content are persisted in Supabase (Postgres) using Drizzle migrations (`db/supabase/schema.ts`).
- All agent memory (threads, messages, embeddings, state) is persisted in LibSQL (SQLite) using Drizzle migrations (`db/libsql/schema.ts`).

---

## 2. Persistence & Schema Management

- **Supabase (Postgres)**: Used for all configuration, models, agents, tools, content, and settings. See `db/supabase/schema.ts` and `types/supabase.ts` for schema and types.
- **LibSQL (SQLite)**: Used for agent memory, threads, messages, embeddings, and agent state. See `db/libsql/schema.ts` and `lib/memory/` for schema and logic.
- **Drizzle Migrations**: All schema changes are managed via Drizzle. Use separate config files for each DB (`drizzle.supabase.config.ts`, `drizzle.libsql.config.ts`).

---

## 3. Onboarding & Getting Started

1. **Environment**:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase client)
   - `DATABASE_URL` (Supabase Postgres connection for Drizzle)
   - `LIBSQL_DATABASE_URL`, `LIBSQL_AUTH_TOKEN` (LibSQL memory)
   - `GOOGLE_API_KEY` (or other provider keys)
2. **Database Init**:
   - Run Drizzle migrations for both DBs:
     ```sh
     pnpm drizzle-kit generate --config drizzle.supabase.config.ts --name init
     pnpm drizzle-kit up --config drizzle.supabase.config.ts
     pnpm drizzle-kit generate --config drizzle.libsql.config.ts --name init
     pnpm drizzle-kit up --config drizzle.libsql.config.ts
     ```
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
- [x] **Memory**: Moved to `memory/`, high-level and raw APIs (LibSQL)
- [x] **Tools**: Built-in modules (`tools/`), dispatcher (`tool-execution.ts`), schema utils (`tools.ts`)
- [x] **Supabase Helper**: `supabase.ts`, generic CRUD and `getItemById`/`getData`
- [x] **Error Handling**: `api-error-handler.ts`
- [x] **Utilities**: `utils.ts`, placeholder mock data in `mock-data/`
- [x] **Drizzle Migrations**: Separate config and schema for Supabase and LibSQL

---

## 5. Troubleshooting

- **Supabase failures**: Validate `SUPABASE_URL`/`SUPABASE_ANON_KEY`, inspect table schemas.
- **Memory errors**: Test `getLibSQLClient().isDatabaseAvailable()`, verify `memory_threads`, `messages`, `embeddings` tables.
- **Agent load issues**: Confirm `agentRegistry.init()` is called, inspect Supabase `agents` rows.
- **Tool not found**: Ensure name matches in `tools/` map and in Supabase `tools` table.
- **AI provider errors**: Verify model config in Supabase `models` table and provider API keys.
- **Migration issues**: Ensure Drizzle config files are correct and environment variables are set for both DBs.

---

Refer to folder-specific READMEs (`agents/README.md`, `tools/README.md`, `memory/README.md`) for deeper context, or the top-level [docs/](../docs/) directory for detailed guides.

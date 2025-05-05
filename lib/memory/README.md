# /lib/memory — Memory & Persistence Layer

_Last updated: 2025-05-05_

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib/memory`, use this advanced onboarding and context-enrichment template. This is designed for maximum clarity, accuracy, and adaptability for future coding agents and maintainers.

### 1. Mental Model & System Overview

- `/lib/memory` is the core of all agent memory, chat context, and vector search. It bridges:
  - **Supabase**: for all persistent app config, agent, tool, and model data (schema in `db/supabase/schema.ts`, types in `types/supabase.ts`).
  - **LibSQL/Turso**: for all conversational memory, threads, messages, embeddings, and vector search (schema in `db/libsql/schema.ts`).
- All API routes and frontend hooks ultimately use helpers from this folder for CRUD, memory, and search.
- **Environment variables**: Always check `.env.local.example` for the required variables. If you see connection or credential errors, compare your `.env.local` to `.env.local.example` and ensure all required variables are set. All code should check for these variables as shown in `supabase.ts` and `db.ts`.

### 2. Your Role as Coding Agent

- **Diagnose**: Quickly determine if a request is about Supabase (app config, agents, tools) or LibSQL (chat memory, embeddings).
- **Guide**: Offer step-by-step, type-safe code and migration examples for any CRUD, schema, or memory operation.
- **Clarify**: Ask for missing context (e.g., "Should this be stored in Supabase or LibSQL? Should it be exposed via an API route?").
- **Validate**: Always check that types, schema, and API routes are in sync after any change.
- **Explain**: For every suggestion, provide rationale, file references, and potential pitfalls.
- **Reference**: Remind users to check `.env.local.example` for all required environment variables before running or deploying.

### 3. Decision Tree (Where Should Data Live?)

- **Supabase**: Use for all global, persistent, or multi-user data (agents, tools, models, settings, user profiles).
- **LibSQL**: Use for ephemeral, high-volume, or per-thread data (chat messages, memory threads, embeddings, agent state).
- **If unsure**: Ask the user for intent and expected data lifecycle.

### 4. Key Files & Integration Points

- **Supabase**:
  - Schema: `db/supabase/schema.ts`
  - Types: `types/supabase.ts`
  - Helpers: `lib/memory/supabase.ts`
  - API: `app/api/agents`, `app/api/tools`, `app/api/settings`, etc.
  - Hooks: `hooks/use-supabase-crud.ts`, `hooks/use-supabase-fetch.ts`
- **LibSQL**:
  - Schema: `db/libsql/schema.ts`
  - Core: `lib/memory/db.ts`, `lib/memory/libsql.ts`, `lib/memory/memory.ts`
  - Vector: `lib/memory/vector-store.ts`, `lib/memory/store-embedding.ts`
  - Processors: `lib/memory/memory-processors.ts`
  - API: `app/api/threads`, `app/api/chat`, etc.
- **Environment**:
  - Reference `.env.local.example` for all required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `LIBSQL_DATABASE_URL`, `LIBSQL_AUTH_TOKEN`, `GOOGLE_API_KEY`, etc.

### 5. Advanced Scenarios & Examples

- **Add a new agent**: Update `db/supabase/schema.ts`, `types/supabase.ts`, expose via `/api/agents`, and test with `use-supabase-crud`.
- **Store a chat message**: Use `saveMessage()` in `memory.ts` (LibSQL), retrieve with `loadMessages()`, and optionally generate embeddings for vector search.
- **Batch save embeddings**: Use `store-embedding.ts` for efficient bulk inserts.
- **Vector search**: Use `vector-store.ts` helpers to find semantically similar messages for context windowing.
- **Schema migration**: After changing a schema file, run `pnpm migrate:generate` and `pnpm migrate:up`, then update types and API routes.
- **Expose new data to frontend**: Add/extend an API route in `app/api/`, update hooks, and ensure types are correct.
- **Check environment**: Always verify `.env.local` matches `.env.local.example` before running scripts or deploying.

### 6. Onboarding & Troubleshooting Checklist

- [x] Confirm `.env.local` is set for both Supabase and LibSQL (see `.env.local.example`). — 2025-05-05
- [x] Validate schema and types are in sync (`db/supabase/schema.ts`, `types/supabase.ts`, `db/libsql/schema.ts`). — 2025-05-05
- [x] Run Drizzle migrations after any schema change. — 2025-05-05
- [x] Test CRUD via API routes and hooks (`use-supabase-crud`, `use-supabase-fetch`). — 2025-05-05
- [x] For memory issues, check LRU cache, vector index, and fallback logic in `memory.ts`. — 2025-05-05
- [x] For API errors, check error logs and ensure all helpers are imported from the correct file. — 2025-05-05
- [x] After adding a new feature, update this README and the checklist. — 2025-05-05

### 7. Questions to Ask (for Maximum Context)

- Is this data global (Supabase) or per-session/thread (LibSQL)?
- Should this be exposed via an API route, or is it internal only?
- Are you using the correct types and updating them after schema changes?
- Do you need to support vector search or advanced memory features for this data?
- Is this change compatible with the current frontend hooks and API routes?
- Are all required environment variables set in `.env.local` as shown in `.env.local.example`?

### 8. Common Pitfalls & Anti-Patterns

- Forgetting to update types after schema changes (causes runtime errors).
- Mixing up Supabase and LibSQL responsibilities (leads to data loss or duplication).
- Not handling errors or missing environment variables (causes silent failures).
- Not updating API routes or hooks after schema changes (breaks frontend).
- Not running migrations after schema updates (DB out of sync).
- Not checking `.env.local.example` for new or changed environment variables.

### 9. End-to-End Example (Full Flow)

- User creates a new agent in the UI → API route `/api/agents` → `createItem` in `lib/memory/supabase.ts` → row in Supabase DB → type in `types/supabase.ts` → agent available in registry.
- User sends a chat message → API route `/api/threads` → `saveMessage` in `memory.ts` → message row in LibSQL → embedding generated and stored → message available for vector search and context window.
- User updates a tool → API route `/api/tools` → `updateItem` in `lib/memory/supabase.ts` → type in `types/supabase.ts` → tool available for agent use.
- User or agent runs any script or deploy: always check `.env.local.example` for required variables first.

### 10. Advanced Agent Techniques (2025+)

- Modular, hot-swappable memory processors and vector stores.
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

## 1. Purpose and Scope

- Provide a unified API for creating, reading, updating, and deleting memory threads and messages.
- Handle token counting, embedding generation, and semantic search over stored messages.
- Manage agent-specific and thread-specific state data for long-lived conversations.
- Offer low-level LibSQL helpers alongside higher-level memory abstractions.
- Integrate with Supabase for all application config, agent, tool, and model data.

---

## 2. Folder Structure & File Responsibilities

```
lib/memory/
├── db.ts                  # LibSQL client, query and transaction helpers
├── libsql.ts              # Raw memory operations (getMemory, addMemory, getThreads, deleteThread)
├── memory.ts              # High-level memory API (threads, messages, embeddings, state, summarization, semantic search)
├── vector-store.ts        # Helpers for HNSW index init, storeTextEmbedding, searchTextStore
├── store-embedding.ts     # Batch save embeddings helper for multiple texts
├── memory-processors.ts   # Modular message processing pipeline (pruning, filtering)
├── supabase.ts            # Supabase client, generic CRUD, and type-safe helpers for all app data
└── README.md              # This file: overview, onboarding, and AI assistant guide
```

### 2.1 db.ts

- Exports `getLibSQLClient()`: Initializes a LibSQL client using `LIBSQL_DATABASE_URL` and `LIBSQL_AUTH_TOKEN`.
- Exports `isDatabaseAvailable()`: Checks connectivity by executing a simple `SELECT 1`.
- Exports `query(sql, params)` & `transaction(queries)`: Wrap low-level SQL operations with error handling and batched execution.

### 2.2 libsql.ts

- Exports `createLibSQLClient()`: Alias to `getLibSQLClient` for raw memory tables under `memory` (legacy vs. agent-memory distinction).
- Provides direct functions on a `memory` table (thread_id, role, content, metadata):
  - `getMemory(threadId)`, `addMemory(threadId, role, content, metadata)`, `getThreads()`, `deleteThread(threadId)`.
- Use for fast, unstructured key/value style memory operations.

### 2.3 memory.ts

- High-level orchestrator for agent conversations:
  - **Thread lifecycle**: `createMemoryThread`, `getMemoryThread`, `listMemoryThreads`, `deleteMemoryThread`.
  - **Messages**: `saveMessage`, `loadMessages` (with LRU cache), token counting, embedding generation, metadata, and thread timestamp updates.
  - **Token & Embedding**: `countTokens`, `generateEmbedding`, `saveEmbedding` (Xenova/Google fallback), vector search.
  - **State Management**: `loadAgentState`, `saveAgentState` (JSON blobs in `agent_states`).
  - **Summarization & Search**: `generateThreadSummary`, `semanticSearchMemory` (cosine similarity, HNSW, etc).

### 2.4 vector-store.ts

- HNSW index helpers: `initVectorStore`, `storeTextEmbedding`, `searchTextStore`.
- Used for fast vector similarity search over embeddings table.

### 2.5 store-embedding.ts

- Batch save embeddings for multiple texts, using `generateEmbedding` and `saveEmbedding`.

### 2.6 memory-processors.ts

- Modular pipeline for message transformations (pruning, filtering, chunking, etc).

### 2.7 supabase.ts

- Type-safe Supabase client, generic CRUD (`getData`, `getItemById`, `createItem`, `updateItem`, `deleteItem`).
- Used by all API routes and hooks for app data (models, tools, agents, settings, etc).

---

## 3. Data Flow & Integration: Supabase + LibSQL

- **Supabase** is the source of truth for all application configuration, agent definitions, tool schemas, and model metadata. All CRUD operations for these tables are handled via the generic helpers in `supabase.ts` and exposed through API routes (see `app/api/agents`, `app/api/tools`, etc). Types are enforced via `types/supabase.ts`.
- **LibSQL** is used for all agent memory, chat threads, messages, embeddings, and vector search. The memory layer (`memory.ts`, `libsql.ts`, `db.ts`) provides both low-level and high-level APIs for storing and retrieving conversational context, with support for HNSW vector search and LRU caching.
- **API routes** in `app/api/threads`, `app/api/agents`, `app/api/tools`, etc, use the helpers in `lib/memory/supabase.ts` and `lib/memory/memory.ts` to bridge between frontend hooks (`use-supabase-crud`, `use-supabase-fetch`) and the database.
- **Types** in `types/supabase.ts` and `types/agents.ts` ensure all data is type-safe and consistent across the stack.

---

## 4. Example: Building & Migrating Both Schemas

This project uses Drizzle to manage both Postgres (Supabase) and SQLite (LibSQL) migrations defined in `drizzle.config.ts`:

```bash
# Generate SQL migration files for both databases based on the TS schemas
pnpm migrate:generate --name init

# Apply migrations to Supabase and LibSQL targets
pnpm migrate:up
```

- Supabase schema is defined in `db/supabase/schema.ts` and types in `types/supabase.ts`.
- LibSQL schema is defined in `db/libsql/schema.ts`.
- Keep both schemas in sync with your application needs and update types as you add new fields.

---

## 5. Example: Supabase CRUD & API Route Usage

- Use the generic helpers in `lib/memory/supabase.ts` for all CRUD operations:

```ts
import { getData, createItem, updateItem, deleteItem } from "@/lib/memory/supabase"

// Fetch all agents
const agents = await getData<Agent>("agents")

// Create a new tool
const newTool = await createItem<Tool>("tools", { name: "my_tool", ... })

// Update a model
const updatedModel = await updateItem<Model>("models", modelId, { name: "New Name" })

// Delete a setting
await deleteItem("settings", settingId)
```

- API routes in `app/api/agents/route.ts`, `app/api/tools/route.ts`, etc, use these helpers to implement RESTful endpoints for the frontend.
- React hooks (`use-supabase-crud`, `use-supabase-fetch`) call these API routes for all data operations, ensuring type safety and consistency.

---

## 6. Example: LibSQL Memory, Embeddings, and Vector Search

- Use the high-level memory API in `memory.ts` for all thread/message/embedding operations:

```ts
import { createMemoryThread, saveMessage, loadMessages, generateEmbedding, saveEmbedding } from "@/lib/memory/memory"

// Create a new memory thread
const threadId = await createMemoryThread("Chat with user")

// Save a message
await saveMessage(threadId, "user", "Hello, how can I help you?")

// Generate and save an embedding
const embedding = await generateEmbedding("Some text")
const embeddingId = await saveEmbedding(embedding)
```

- Use the vector store helpers for similarity search:

```ts
import { initVectorStore, storeTextEmbedding, searchTextStore } from "@/lib/memory/vector-store"

await initVectorStore({ dims: 384 })
const id = await storeTextEmbedding("Find this later")
const results = await searchTextStore("Find this later", 5)
```

---

## 7. Completed Checklist (as of 2025-05-05)

- [x] All core helpers (`db.ts`, `libsql.ts`, `memory.ts`, `supabase.ts`) implemented and documented — 2025-05-05
- [x] LRU cache for hot thread messages in `memory.ts` — 2025-05-05
- [x] Vector store helpers (`vector-store.ts`) and batch embedding (`store-embedding.ts`) — 2025-05-05
- [x] Modular message processors (`memory-processors.ts`) — 2025-05-05
- [x] Supabase CRUD helpers and type-safe API (`supabase.ts`, `types/supabase.ts`) — 2025-05-05
- [x] Drizzle config for dual schema management (`drizzle.config.ts`) — 2025-05-05
- [x] Example API routes and React hooks for CRUD (`app/api/*`, `hooks/use-supabase-crud.ts`, `hooks/use-supabase-fetch.ts`) — 2025-05-05
- [x] README fully updated for all files, flows, and integration — 2025-05-05

---

## 8. Future Enhancements

- [ ] Drizzle migrations for Supabase schema (`db/supabase/schema.ts`) with rollback scripts
- [ ] Drizzle migrations for LibSQL schema (`db/libsql/schema.ts`) and versioning
- [ ] Improve TypeScript definitions in `types/supabase.ts` to cover all tables and relationships
- [ ] Refactor and enhance `db.ts`, `libsql.ts`, and `memory.ts` for consistency, error isolation, and testing
- [ ] Provide API route templates and examples for CRUD operations in `hooks/use-supabase-*` and `app/api/*`
- [ ] Add cursor-based pagination to `loadMessages()` and `listMemoryThreads()`
- [ ] Automated pruning of old threads and embeddings based on TTL or threshold
- [ ] Incremental summarization and real-time update webhooks for long threads
- [ ] End-to-end tests covering memory helpers, vector store, and Supabase integrations
- [ ] Comprehensive documentation examples showing Supabase + LibSQL workflows

---

_End of `/lib/memory/README.md`_

# /lib/memory — Memory & Persistence Layer

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib/memory`, use this prompt-enrichment template:

1. **Background**: This folder implements the memory and persistence layer for AI agents:
   - **LibSQL/Turso** for conversational history, embeddings storage, HNSW vector indexing, and thread state.
   - **Supabase** for loading model, agent, and tool configurations that drive memory behavior.
2. **Your Role**: Provide code examples, debugging steps, and performance suggestions for memory operations and database interactions, considering both DBs:
   - Supabase: reference API routes under `app/api/*` (e.g. `/api/threads`, `/api/agents`) and TypeScript definitions in `types/supabase.ts` for schema generation and type safety.
   - LibSQL: low-latency memory reads/writes, caching (LRU), and vector search via HNSW indices.
3. **Goals**:
   - Explain file responsibilities and data flow (Supabase config → AgentService → memory layer → LibSQL tables).
   - Guide adding or optimizing memory features (pagination, caching, vector-store integration).
   - Recommend best practices for context management: token limits, summarization, conversational pruning, and vector recall.
   - Illustrate how to build Supabase tables and API routes using Drizzle migrations and the `getData`, `createItem`, etc. helpers.
4. **Constraints**:
   - Avoid major architectural refactors unless requested.
   - Preserve statelessness and transaction safety via `transaction()` helper.
   - Keep explanations concise and focused on memory logic.
5. **Example Prompt**:
   "Show how to integrate a Supabase setting change (e.g., default model) into `generateEmbedding`, and how to fall back to LibSQL vector search if service key is missing."

Use this template for all code and documentation suggestions in `lib/memory`.

---

# /lib/memory — Memory & Persistence Layer

This folder consolidates all memory and persistence logic for AI agents and other components in the ai-sdk-DM framework. It is organized into three modules that together manage conversational threads, embeddings, message storage, and state data.

---

## 1. Purpose and Scope

- Provide a unified API for creating, reading, updating, and deleting memory threads and messages.
- Handle token counting, embedding generation, and semantic search over stored messages.
- Manage agent-specific and thread-specific state data for long-lived conversations.
- Offer low-level LibSQL helpers alongside higher-level memory abstractions.

---

## 2. Current Folder Structure & Key Files

```
lib/memory/
├── db.ts                  # LibSQL client, query and transaction helpers
├── libsql.ts              # Raw memory operations (getMemory, addMemory, getThreads, deleteThread)
├── memory.ts              # High-level memory API (threads, messages, embeddings, state, summarization, semantic search)
├── vector-store.ts        # Helpers for HNSW index init, storeTextEmbedding, searchTextStore
├── store-embedding.ts     # Batch save embeddings helper for multiple texts
├── memory-processors.ts   # Modular message processing pipeline (pruning, filtering)
└── README.md              # This file: overview, onboarding, and AI assistant guide
```

### 2.1 db.ts

- Exports `getLibSQLClient()`:
  - Initializes a LibSQL client using `LIBSQL_DATABASE_URL` and `LIBSQL_AUTH_TOKEN`.
  - Throws if the URL is not configured.
- Exports `isDatabaseAvailable()`:
  - Checks connectivity by executing a simple `SELECT 1`.
- Exports `query(sql, params)` & `transaction(queries)`:
  - Wrap low-level SQL operations with error handling and batched execution.

### 2.2 libsql.ts

- Exports `createLibSQLClient()`:
  - Alias to `getLibSQLClient` for raw memory tables under `memory` (legacy vs. agent-memory distinction).
- Provides direct functions on a `memory` table (thread_id, role, content, metadata):
  - `getMemory(threadId)`, `addMemory(threadId, role, content, metadata)`, `getThreads()`, `deleteThread(threadId)`.
- Use when you need fast, unstructured key/value style memory operations.

### 2.3 memory.ts

- High-level orchestrator for agent conversations:
  - **Thread lifecycle**:
    - `createMemoryThread(name, options)`: creates new thread row.
    - `getMemoryThread(id)`, `listMemoryThreads(filters)`, `deleteMemoryThread(id)`.
  - **Messages**:
    - `saveMessage(thread_id, role, content, options)`: supports token counting, embedding generation, metadata, and updates thread timestamp.
    - `loadMessages(thread_id, limit)`: retrieves ordered messages with full metadata.
  - **Token & Embedding**:
    - `countTokens(text, model)`: wraps `js-tiktoken` with fallback.
    - `generateEmbedding(text)`, `saveEmbedding(vector, model)`: uses `@xenova/transformers` and persists to `embeddings` table.
  - **State Management**:
    - `loadAgentState(thread_id, agent_id)`, `saveAgentState(thread_id, agent_id, state)`: store JSON blobs in `agent_states` table.
  - **Summarization & Search**:
    - `generateThreadSummary(thread_id)`: calls `generateAIResponse` to summarize a conversation.
    - `semanticSearchMemory(query, options)`: performs cosine-similarity search over embeddings.

---

## 3. Memory Flow & Usage Patterns

1. **Start a Conversation**:
   - Call `createMemoryThread()` to obtain a new thread ID.
   - Use `saveMessage()` with role `system` to set up initial context.
2. **Add Messages**:
   - On each user or agent response, call `saveMessage()`, optionally enabling token counting or embeddings.
   - Track tool calls by passing `tool_call_id` and `tool_name` in options.
3. **Load Context**:
   - Before generating or streaming, retrieve history via `loadMessages()`.
   - Pass messages into `streamText` or `generateText` calls.
4. **Maintain State**:
   - After each run, update agent-specific state with `saveAgentState()`.
   - Retrieve prior run information with `loadAgentState()`.
5. **Summarize or Search**:
   - Periodically call `generateThreadSummary()` to condense long conversations.
   - Use `semanticSearchMemory()` for vector-based retrieval over historical messages.

---

## 4. How I (AI Assistant) Should Help

- **When adding new memory features**:
  - Suggest extending `memory.ts` with new thread or message utilities.
  - Recommend adding SQL scripts to `scripts/` for schema changes (e.g., new columns in `memory_threads` or `messages`).
- **When troubleshooting memory operations**:
  - Verify `getLibSQLClient()` credentials and URL in `db.ts`.
  - Check SQL syntax and tables (`memory_threads`, `messages`, `embeddings`, `agent_states`).
  - Validate fallback logic in `countTokens()` and embedding generation errors.
- **When optimizing performance**:
  - Propose pagination or cursor-based loading in `loadMessages()`.
  - Suggest batch inserts or transactions for bulk operations.
  - Advise on indexing strategies (e.g., indexes on `memory_thread_id`, `embedding_id`).
- **When extending persistence**:
  - Guide you to add caching layers or Redis integration for hot threads.
  - Recommend schema versioning and migrations via `init-database.ts`.
- **Always**:
  - Keep memory modules decoupled from business logic.
  - Use proper typing (`Message`, `MemoryThread`, `AgentState`) to enforce schema.
  - Ask for clarification when a request references parts of the memory API.

---

## 5. Best Practices

- **Statelessness**: Do not hold in-memory state; rely on DB and memory layer.
- **Granular Writes**: Save only incremental changes (e.g., one message at a time).
- **Error Isolation**: Wrap each DB call in try/catch; log errors with context.
- **Type Safety**: Use TypeScript interfaces for all memory functions.
- **Batching & Transactions**: Use `transaction()` in `db.ts` for multi-step operations.
- **Embeddings & Token Costs**: Control embedding generation and token counting via options to manage performance.

---

## 6. Troubleshooting

- **Connection errors**: Ensure `LIBSQL_DATABASE_URL` and `LIBSQL_AUTH_TOKEN` are set.
- **Missing tables**: Run `scripts/init-database.ts` to create required tables.
- **Embedding failures**: Verify model availability in `@xenova/transformers` and fallback logic.
- **Incorrect summaries**: Check prompt construction in `generateThreadSummary()` and model config retrieval.
- **Slow queries**: Profile SQL, add index on `updated_at` or `memory_thread_id`.

---

## 7. Future Enhancements

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

## 8. Building & Migrating Schemas

This project uses Drizzle to manage both Postgres (Supabase) and SQLite (LibSQL) migrations defined in `drizzle.config.ts`:

```bash
# Generate SQL migration files for both databases based on the TS schemas
pnpm migrate:generate --name init

# Apply migrations to Supabase and LibSQL targets
pnpm migrate:up
```

Ensure your `.env.local` variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `LIBSQL_DATABASE_URL`, `LIBSQL_AUTH_TOKEN`) are set before running migrations.

---

## 9. Setup LibSQL Vector DB (Embeddings)

To optimize embeddings storage and similarity search using LibSQL/Turso:

1. Follow Turso guidance on space-complexity of vector indexes
   [https://turso.tech/blog/the-space-complexity-of-vector-indexes-in-liql]
2. Create an `embeddings` table with a BLOB `vector` column:

   ```sql
   CREATE TABLE embeddings (
     id TEXT PRIMARY KEY,
     vector BLOB NOT NULL,
     model TEXT,
     dimensions INTEGER,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

4. Install or enable the HNSW extension if needed.
5. Create an HNSW index on the `vector` column:

   ```sql
   CREATE INDEX embeddings_hnsw
     ON embeddings USING HNSW (vector)
     WITH (dims = 384, m = 16, efConstruction = 200);
   ```

6. Verify performance and storage footprint as per Turso recommendations.

---

*End of `/lib/memory/README.md`*

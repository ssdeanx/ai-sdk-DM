# /lib/memory — Memory & Persistence Layer

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib/memory`, use this prompt-enrichment template:

1. **Background**: This folder implements the memory and persistence layer for AI agents, including LibSQL client, raw memory operations, high-level thread/message APIs, embeddings, and summarization.
2. **Your Role**: Provide code examples, debugging steps, and performance suggestions for memory operations and database interactions.
3. **Goals**:
   - Explain file responsibilities and data flow (db.ts → libsql.ts → memory.ts).
   - Guide adding or optimizing memory features (pagination, caching, vector store) with minimal impact.
   - Align code with TypeScript types and Supabase/LibSQL patterns.
4. **Constraints**:
   - Avoid major architectural refactors unless requested.
   - Preserve statelessness and transaction safety via `transaction()` helper.
   - Keep explanations concise and focus on memory logic.
5. **Example Prompt**:
   "Show how to add cursor-based pagination to `loadMessages()` in `/lib/memory/memory.ts`, including SQL changes and type updates."

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
├── db.ts          # LibSQL client factory, query and transaction helpers
├── libsql.ts      # Secondary LibSQL API for raw memory operations
├── memory.ts      # High-level memory thread, message, embedding, and state management
├── README.md      # This file: overview and AI assistant onboarding
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

- [ ] Cursor-based pagination for `loadMessages()` and `listMemoryThreads()`
- [ ] Automated pruning of old threads and embeddings
- [ ] Incremental summarization and real-time update webhooks
- [ ] Schema migrations using a formal migration tool (e.g., Liquibase)
- [ ] Hybrid storage: Combine DB storage with vector DB for high-scale embeddings
- [ ] memory-processors: Add modular processing pipelines for message transformations and filtering
- [ ] vector-store.ts: Implement a dedicated vector store module for efficient similarity search
- [ ] store-embedding.ts: Create helper to batch-save embeddings and manage persistence
- [ ] lru-cache: Integrate an LRU caching layer for hot threads and embeddings

---

## Setup LibSQL Vector DB (Embeddings)

To optimize embeddings storage and similarity search using LibSQL/Turso:

1. Follow Turso guidance on space-complexity of vector indexes:
   https://turso.tech/blog/the-space-complexity-of-vector-indexes-in-libsql
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

3. Install or enable the HNSW extension if needed.
4. Create an HNSW index on the `vector` column:

   ```sql
   CREATE INDEX embeddings_hnsw
     ON embeddings USING HNSW (vector)
     WITH (dims = 384, m = 16, efConstruction = 200);
   ```

5. Verify performance and storage footprint as per Turso recommendations.

---

## Current Scope Checklist

- [x] Core memory APIs (`db.ts`, `libsql.ts`, `memory.ts`)
- [x] High-level thread/message management and summarization
- [x] Token counting and embedding generation
- [x] State management for agents
- [x] Semantic search over embeddings
- [x] **Vector DB integration**: `embeddings` table with HNSW index per Turso blog

---

*End of `/lib/memory/README.md`*

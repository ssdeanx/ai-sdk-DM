# /lib/memory — Memory & Persistence Layer

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib/memory`, use this prompt-enrichment template:

1. **Background**: This folder implements the memory and persistence layer for AI agents in the DeanmachinesAI project:
   - **LibSQL/Turso** for conversational history, embeddings storage, HNSW vector indexing, and thread state.
   - **Supabase** for configuration, vector search (pgvector with HNSW indexes), workflow management, and loading model, agent, and tool configurations that drive memory behavior.
   - **Redis** integration for caching, real-time data, and session management.
   - **Advanced RAG** techniques including query transformation (HyDE), re-ranking, contextual chunking, and hybrid search.
   - **Observability** system with comprehensive tracing, metrics, and cost tracking.

2. **Your Role**: Provide code examples, debugging steps, and performance suggestions for memory operations and database interactions, considering all storage systems:
   - **Supabase**: Reference API routes under `app/api/*` (e.g. `/api/threads`, `/api/agents`) and TypeScript definitions in `types/supabase.ts` for schema generation and type safety.
   - **LibSQL**: Low-latency memory reads/writes, caching (LRU), and vector search via HNSW indices.
   - **Redis**: Caching strategies, real-time updates, and session management.
   - **Drizzle ORM**: Type-safe database operations with schema validation and query building.

3. **Goals**:
   - Explain file responsibilities and data flow (Supabase config → AgentService → memory layer → LibSQL tables).
   - Guide adding or optimizing memory features (pagination, caching, vector-store integration).
   - Recommend best practices for context management: token limits, summarization, conversational pruning, and vector recall.
   - Illustrate how to build Supabase tables and API routes using Drizzle migrations and the `getData`, `createItem`, etc. helpers.
   - Demonstrate advanced RAG techniques like query transformation, re-ranking, contextual chunking, and hybrid search.
   - Show how to integrate with the observability system for tracing and metrics.

4. **Constraints**:
   - Avoid major architectural refactors unless requested.
   - Preserve statelessness and transaction safety via `transaction()` helper.
   - Keep explanations concise and focused on memory logic.
   - Ensure compatibility with both LibSQL and Supabase vector search.
   - Maintain proper error handling and fallback mechanisms.

5. **Example Prompt**:
   "Show how to integrate a Supabase setting change (e.g., default model) into `generateEmbedding`, and how to fall back to LibSQL vector search if service key is missing."

Use this template for all code and documentation suggestions in `lib/memory`.

---

## Memory & Persistence System Overview

This folder consolidates all memory and persistence logic for AI agents and other components in the DeanmachinesAI project (formerly ai-sdk-DM). It implements a sophisticated multi-database architecture that combines LibSQL for high-performance memory operations, Supabase for configuration and vector search, and Redis for caching and real-time data. The system is organized into specialized modules that together manage conversational threads, embeddings, message storage, state data, and advanced RAG capabilities.

---

## 1. Purpose and Scope

The memory system serves as the persistence and retrieval backbone for the entire DeanmachinesAI platform, with these key responsibilities:

- **Conversation Management**: Provide a unified API for creating, reading, updating, and deleting memory threads and messages.
- **Embedding Operations**: Handle token counting, embedding generation, and semantic search over stored messages.
- **State Management**: Manage agent-specific and thread-specific state data for long-lived conversations.
- **Database Abstraction**: Offer low-level LibSQL and Supabase helpers alongside higher-level memory abstractions.
- **Advanced RAG**: Implement sophisticated retrieval techniques including query transformation, re-ranking, contextual chunking, and hybrid search.
- **Observability**: Integrate with the tracing system for monitoring performance, costs, and usage patterns.
- **Caching**: Implement efficient caching strategies using Redis for frequently accessed data.
- **Workflow Management**: Support multi-step AI processes with persistence and state tracking.
- **Multi-Database Architecture**: Coordinate between LibSQL, Supabase, and Redis for optimal performance and scalability.

---

## 2. Current Folder Structure & Key Files

```bash
lib/memory/
├── db.ts                  # LibSQL client, query and transaction helpers
├── drizzle.ts             # Drizzle ORM integration for Supabase
├── libsql.ts              # Raw memory operations (getMemory, addMemory, getThreads, deleteThread)
├── memory.ts              # High-level memory API (threads, messages, embeddings, state, summarization, semantic search)
├── supabase.ts            # Supabase client with Drizzle integration
├── vector-store.ts        # Helpers for HNSW index init, storeTextEmbedding, searchTextStore
├── store-embedding.ts     # Batch save embeddings helper for multiple texts
├── memory-processors.ts   # Modular message processing pipeline (pruning, filtering)
├── factory.ts             # Memory provider factory, adapter pattern
├── index.ts               # Barrel export
└── README.md              # This file: overview, onboarding, and AI assistant guide

# Related Tracing & Observability Files
lib/
├── ai-sdk-tracing.ts      # AI SDK integration with tracing system
├── langfuse-integration.ts # Langfuse tracing integration
├── otel-tracing.ts        # OpenTelemetry integration
└── tracing.ts             # Core tracing utilities
```

---

## File-by-File Status & Detailed TODO Checklist

### db.ts
- [x] Type-safe LibSQL client and helpers
- [x] Error handling and transaction support
- [ ] Add/expand tests for query/transaction helpers

### drizzle.ts
- [x] Type-safe Drizzle ORM integration
- [x] Supabase support
- [ ] Add/expand tests for Drizzle queries and model config

### libsql.ts
- [x] Raw memory operations (get/add/delete thread/message)
- [x] Fast key/value access
- [ ] Add/expand tests for memory ops

### memory.ts
- [x] High-level memory API (threads, messages, embeddings, state, summarization, semantic search)
- [x] Orchestrates all memory flows
- [ ] Add/expand tests for thread/message/semantic search

### supabase.ts
- [x] Supabase client with Drizzle integration
- [x] Upstash adapter support and fallback logic
- [ ] Fix all type errors in CRUD and cache logic (see get_errors)
- [ ] Refine TableRow/TableInsert types for .eq/.insert/.update
- [ ] Improve error handling for details/hint/code fields
- [ ] Add/expand tests for CRUD and vector search

### vector-store.ts
- [x] HNSW index, vector search, embedding storage
- [x] Type safety
- [ ] Add/expand tests for vector search and info

### store-embedding.ts
- [x] Batch embedding save
- [x] Type safety
- [ ] Add/expand tests for batch embedding

### memory-processors.ts
- [x] Message processing pipeline (pruning, filtering)
- [x] Type safety
- [ ] Add/expand tests for message processing

### factory.ts
- [x] Memory provider factory, adapter pattern
- [x] Type safety
- [ ] Remove unused exports (see get_errors)
- [ ] Clean up unused imports/vars
- [ ] Add/expand tests for memory provider factory

### index.ts
- [x] Barrel export
- [ ] Ensure all exports are up-to-date and type-safe

---

## Feature Coverage Table

| File                | Type Safety | CRUD | Vector | Caching | Fallback | Tests | Error Handling |
|---------------------|:-----------:|:----:|:------:|:-------:|:--------:|:-----:|:--------------:|
| db.ts               |     ✅      |  ✅  |   ❌   |   ❌    |    ❌    |   ⚠️  |      ✅        |
| drizzle.ts          |     ✅      |  ✅  |   ❌   |   ❌    |    ❌    |   ⚠️  |      ✅        |
| libsql.ts           |     ✅      |  ✅  |   ❌   |   ❌    |    ❌    |   ⚠️  |      ✅        |
| memory.ts           |     ✅      |  ✅  |   ✅   |   ⚠️    |    ✅    |   ⚠️  |      ✅        |
| supabase.ts         |     ⚠️      |  ✅  |   ✅   |   ✅    |    ✅    |   ⚠️  |      ⚠️        |
| vector-store.ts     |     ✅      |  ❌  |   ✅   |   ❌    |    ❌    |   ⚠️  |      ✅        |
| store-embedding.ts  |     ✅      |  ❌  |   ✅   |   ❌    |    ❌    |   ⚠️  |      ✅        |
| memory-processors.ts|     ✅      |  ❌  |   ❌   |   ❌    |    ❌    |   ⚠️  |      ✅        |
| factory.ts          |     ⚠️      |  ✅  |   ✅   |   ⚠️    |    ✅    |   ⚠️  |      ✅        |
| index.ts            |     ✅      |  ❌  |   ❌   |   ❌    |    ❌    |   ❌  |      ❌        |

Legend: ✅ = Complete, ⚠️ = Needs work, ❌ = Not present

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
- **When enhancing observability**:
  - Suggest improvements to tracing integration in `ai-sdk-tracing.ts`.
  - Recommend new metrics or visualizations for the observability dashboard.
  - Guide on adding new tables or columns to the observability schema.
  - Advise on best practices for trace sampling, span creation, and event logging.
- **Always**:
  - Keep memory modules decoupled from business logic.
  - Use proper typing (`Message`, `MemoryThread`, `AgentState`, `Trace`, `Span`) to enforce schema.
  - Ask for clarification when a request references parts of the memory or tracing API.

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

- [x] Drizzle migrations for Supabase schema (`db/supabase/schema.ts`) with rollback scripts
- [x] Drizzle migrations for LibSQL schema (`db/libsql/schema.ts`) and versioning
- [x] Drizzle ORM integration for Supabase in `lib/memory/drizzle.ts` and `lib/memory/supabase.ts`
- [x] Improve TypeScript definitions in `types/supabase.ts` to cover all tables and relationships
- [x] Advanced observability components with d3, recharts, and plotly visualizations
- [x] Comprehensive tracing system with spans, events, and metrics
- [ ] Refactor and enhance `db.ts`, `libsql.ts`, and `memory.ts` for consistency, error isolation, and testing
- [x] Provide API route templates and examples for CRUD operations in `hooks/use-supabase-*` and `app/api/*`
- [ ] Add cursor-based pagination to `loadMessages()` and `listMemoryThreads()`
- [ ] Automated pruning of old threads and embeddings based on TTL or threshold
- [ ] Incremental summarization and real-time update webhooks for long threads
- [ ] End-to-end tests covering memory helpers, vector store, and Supabase integrations
- [ ] Comprehensive documentation examples showing Supabase + LibSQL workflows
- [x] Implement Supabase pgvector integration with HNSW indexes for efficient vector search
- [x] Create workflow management system using Supabase for multi-step AI processes
- [ ] Enhance Supabase Redis wrapper integration with caching strategies
- [ ] Implement bidirectional sync between Supabase and LibSQL using webhooks
- [ ] Create admin dashboard for managing Supabase-Redis connections
- [ ] Update drizzle.ts to support direct Redis operations via Supabase
- [ ] Implement rate limiting and quota management using Redis counters
- [ ] Create migration scripts for Redis schema changes
- [ ] Set up Supabase Edge Functions for serverless processing
- [x] Configure local development environment with Supabase CLI
- [x] Create Supabase migrations for database schema changes
- [x] Implement type generation from Supabase schema
- [x] Implement advanced context window management with intelligent token limit handling
- [ ] Add query transformation techniques (HyDE) for improved vector search relevance
- [ ] Implement cross-encoder re-ranking for more accurate vector search results
- [ ] Create hybrid search combining vector similarity with keyword/BM25 search
- [ ] Develop contextual chunking strategies based on document structure and content
- [ ] Implement embedding model selection based on content type and query characteristics
- [x] Add persistent memory for user-specific information and preferences
- [ ] Create resumable operations system for long-running memory tasks
- [x] Implement hybrid memory systems combining conversation history, RAG, and personalization
- [x] Add stateful adaptation capabilities for evolving agent personas
- [x] Implement error handling and fault tolerance for memory operations
- [x] Create middleware for memory operations with pre/post processing hooks

---

## 8. Building, Migrating, and Upgrading Supabase

This project uses Drizzle to manage both Postgres (Supabase) and SQLite (LibSQL) migrations defined in separate configuration files:

- `drizzle.supabase.config.ts`: Configuration for Supabase (Postgres) migrations
- `drizzle.libsql.config.ts`: Configuration for LibSQL (SQLite) migrations

### 8.1 Generating Migrations

To generate migration files based on schema changes:

```bash
# Generate Supabase migrations
pnpm migrate:generate:supabase my_migration_name

# Generate LibSQL migrations
pnpm migrate:generate:libsql my_migration_name
```

### 8.2 Applying Migrations

To apply pending migrations to the databases:

```bash
# Apply Supabase migrations
pnpm migrate:up:supabase

# Apply LibSQL migrations
pnpm migrate:up:libsql
```

### 8.3 Rolling Back Migrations

If needed, you can roll back migrations:

```bash
# Roll back Supabase migrations
pnpm migrate:down:supabase

# Roll back LibSQL migrations
pnpm migrate:down:libsql
```

Ensure your `.env.local` variables are set before running migrations:

- For Supabase: `DATABASE_URL` (Postgres connection string)
- For LibSQL: `LIBSQL_DATABASE_URL`, `LIBSQL_AUTH_TOKEN`

### 8.4 Drizzle Integration

The project now includes Drizzle ORM integration for Supabase in `lib/memory/drizzle.ts` and `lib/memory/supabase.ts`. This integration provides:

- Type-safe database operations
- Schema validation
- Query building with filtering, sorting, and pagination
- Fallback to Supabase client when needed

To enable Drizzle for database operations, set the environment variable:

```bash
USE_DRIZZLE=true
```

### 8.5 Supabase CLI Integration

The project has been initialized with Supabase CLI, which provides local development capabilities and deployment tools:

```bash
# Initialize Supabase in the project
supabase init

# Generate VS Code settings for Deno
# This enables proper support for Supabase Edge Functions
```

The VS Code extension for Supabase has been installed, providing:

- Syntax highlighting for Supabase SQL files
- IntelliSense for Supabase API methods
- Edge Function development support
- Database schema visualization
- SQL query execution directly from VS Code

The project has a local Supabase instance running for development:

```bash
# Start local Supabase services (already done)
supabase start

# Generate types from your database schema
supabase gen types typescript --local > types/supabase.ts
```

The local Supabase instance provides:

- A PostgreSQL database with all extensions enabled (pgvector, pg_cron, etc.)
- A local Studio UI for database management (`http://localhost:54323`)
- Authentication services
- Storage services
- Edge Functions runtime
- Real-time subscriptions

You can access the local Supabase Studio at `http://localhost:54323` with the following credentials:

- Email: `admin@example.com`
- Password: Check the terminal output after running `supabase start`

### 8.6 Full Supabase Upgrade Process

To perform a complete Supabase upgrade, follow these steps:

#### 8.6.1 Preparation

1. **Backup your data**:
   ```bash
   # Create a backup of your Supabase database
   supabase db dump -f backup.sql
   ```

2. **Update Supabase CLI**:
   ```bash
   # Update Supabase CLI to the latest version
   npm install -g supabase@latest
   ```

3. **Check current version**:
   ```bash
   # Check current Supabase version
   supabase --version
   ```

#### 8.6.2 Schema Updates

1. **Update schema definitions**:
   - Update `db/supabase/schema.ts` with new tables, columns, or indexes
   - Update `types/supabase.ts` with corresponding TypeScript types

2. **Generate migration files**:
   ```bash
   # Generate migration files for schema changes
   pnpm migrate:generate:supabase upgrade_supabase_schema
   ```

3. **Review migration files**:
   - Check the generated SQL in `drizzle/migrations/supabase/[timestamp]_upgrade_supabase_schema.sql`
   - Make any necessary adjustments to the SQL

#### 8.6.3 Database Extensions

1. **Enable required extensions**:
   ```sql
   -- Enable pgvector extension for vector operations
   CREATE EXTENSION IF NOT EXISTS vector;

   -- Enable pg_cron for scheduled tasks
   CREATE EXTENSION IF NOT EXISTS pg_cron;

   -- Enable pgmq for message queuing
   CREATE EXTENSION IF NOT EXISTS pgmq;

   -- Enable pg_net for HTTP requests
   CREATE EXTENSION IF NOT EXISTS pg_net;

   -- Enable postgres_fdw for foreign data wrappers
   CREATE EXTENSION IF NOT EXISTS postgres_fdw;

   -- Enable redis_fdw for Redis integration
   CREATE EXTENSION IF NOT EXISTS redis_fdw;
   ```

2. **Configure HNSW indexes** for vector search:
   ```sql
   -- Create HNSW index for vector search
   CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);
   ```

#### 8.6.4 Apply Migrations

1. **Apply migrations to development environment**:
   ```bash
   # Apply migrations to local Supabase instance
   pnpm migrate:up:supabase
   ```

2. **Verify migrations**:
   - Check that all tables, columns, and indexes are created correctly
   - Run tests to ensure functionality works as expected

3. **Apply migrations to production**:
   ```bash
   # Set production database URL
   export DATABASE_URL=your_production_database_url

   # Apply migrations to production
   pnpm migrate:up:supabase
   ```

#### 8.6.5 Update Connection Pooling

1. **Configure session pooler**:
   - Update `.env.local` with session pooler URL:
     ```
     SESSION_POOL_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?pgbouncer=true
     ```

2. **Configure transaction pooler**:
   - Update `.env.local` with transaction pooler URL:
     ```
     DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
     ```

3. **Update connection clients**:
   - Ensure `lib/memory/supabase.ts` uses the correct connection URLs
   - Verify that `getSupabaseClient()` and `getSupabaseTransactionClient()` are configured correctly

#### 8.6.6 Enable Real-time Features

1. **Configure real-time subscriptions**:
   ```sql
   -- Enable real-time for specific tables
   ALTER PUBLICATION supabase_realtime ADD TABLE documents, agents, workflows;
   ```

2. **Set up webhooks**:
   - Configure webhooks in Supabase dashboard for database events
   - Create webhook handlers in Next.js API routes

3. **Implement real-time hooks**:
   - Use `useSupabaseRealtime` hook for real-time updates
   - Configure channels and event handlers

#### 8.6.7 Set Up Automatic Embeddings

1. **Create trigger functions**:
   ```sql
   -- Create function to queue embedding generation
   CREATE OR REPLACE FUNCTION queue_embedding_generation()
   RETURNS TRIGGER AS $$
   BEGIN
     -- Queue the document for embedding generation
     PERFORM pgmq.send(
       'embedding_jobs',
       json_build_object(
         'id', NEW.id,
         'content', NEW.content,
         'title', NEW.title
       )
     );
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Create triggers**:
   ```sql
   -- Create trigger for document inserts
   CREATE TRIGGER generate_embedding_on_insert
   AFTER INSERT ON documents
   FOR EACH ROW
   EXECUTE FUNCTION queue_embedding_generation();

   -- Create trigger for document updates
   CREATE TRIGGER generate_embedding_on_update
   AFTER UPDATE OF title, content ON documents
   FOR EACH ROW
   WHEN (OLD.title IS DISTINCT FROM NEW.title OR OLD.content IS DISTINCT FROM NEW.content)
   EXECUTE FUNCTION queue_embedding_generation();
   ```

3. **Set up Edge Function**:
   - Create an Edge Function for embedding generation
   - Deploy the Edge Function to Supabase

4. **Configure scheduled task**:
   ```sql
   -- Schedule embedding processing every minute
   SELECT cron.schedule(
     'process-embedding-jobs',
     '* * * * *',
     $$SELECT process_embedding_jobs()$$
   );
   ```

#### 8.6.8 Update Client Code

1. **Update Supabase client**:
   ```bash
   # Update Supabase JS client
   pnpm add @supabase/supabase-js@latest
   ```

2. **Update hooks**:
   - Update `useSupabaseDirect`, `useSupabaseFetch`, and `useSupabaseCrud` hooks
   - Implement `useSupabaseRealtime` hook for real-time updates

3. **Generate updated types**:
   ```bash
   # Generate types from your database schema
   supabase gen types typescript > types/supabase.ts
   ```

#### 8.6.9 Testing and Verification

1. **Test database connections**:
   ```typescript
   // Test Supabase connection
   const isAvailable = await isSupabaseAvailable();
   console.log('Supabase available:', isAvailable);

   // Test transaction client
   const transactionClient = getSupabaseTransactionClient();
   const { data, error } = await transactionClient.from('settings').select('*').limit(1);
   console.log('Transaction client working:', !error);
   ```

2. **Test real-time subscriptions**:
   - Create a test component that uses `useSupabaseRealtime`
   - Verify that events are received when data changes

3. **Test vector search**:
   - Insert test documents with embeddings
   - Perform vector search queries
   - Verify that results are accurate and performant

#### 8.6.10 Monitoring and Maintenance

1. **Set up monitoring**:
   - Configure database connection logging
   - Set up transaction logging
   - Monitor query performance

2. **Implement maintenance tasks**:
   ```sql
   -- Schedule database maintenance
   SELECT cron.schedule(
     'database-maintenance',
     '0 0 * * *',  -- Run daily at midnight
     $$VACUUM ANALYZE;$$
   );

   -- Schedule index maintenance
   SELECT cron.schedule(
     'reindex-vectors',
     '0 1 * * 0',  -- Run weekly on Sunday at 1 AM
     $$REINDEX INDEX documents_embedding_idx;$$
   );
   ```

3. **Set up backup schedule**:
   - Configure regular database backups
   - Test backup restoration process

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

3. Install or enable the HNSW extension if needed.
4. Create an HNSW index on the `vector` column:

   ```sql
   CREATE INDEX embeddings_hnsw
     ON embeddings USING HNSW (vector)
     WITH (dims = 384, m = 16, efConstruction = 200);
   ```

5. Verify performance and storage footprint as per Turso recommendations.

---

## 10. Advanced RAG Techniques

This section covers advanced Retrieval Augmented Generation (RAG) techniques implemented in the memory system.

### 10.1 Query Transformation

Query transformation improves retrieval accuracy by modifying the original query to better match relevant documents:

#### Hypothetical Document Embeddings (HyDE)

HyDE uses an LLM to generate a hypothetical answer before performing vector search:

```typescript
// Example HyDE implementation
async function hydeSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  // Generate a hypothetical document that would answer the query
  const hypotheticalDocument = await generateText({
    model: openai('gpt-4o'),
    prompt: `Generate a detailed passage that would answer this question: "${query}"`,
    temperature: 0.3,
  });

  // Generate embedding for the hypothetical document instead of the original query
  const embedding = await generateEmbedding(hypotheticalDocument.text);

  // Perform vector search using the hypothetical document embedding
  return vectorSearch(embedding, options);
}
```

#### Query Expansion

Query expansion adds related terms to improve recall:

```typescript
// Example query expansion implementation
async function expandedSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  // Generate expanded query with related terms
  const expandedQuery = await generateText({
    model: openai('gpt-4o'),
    prompt: `Expand this search query with related terms: "${query}"`,
    temperature: 0.3,
  });

  // Combine original and expanded queries
  const combinedQuery = `${query} ${expandedQuery.text}`;

  // Generate embedding for the combined query
  const embedding = await generateEmbedding(combinedQuery);

  // Perform vector search
  return vectorSearch(embedding, options);
}
```

### 10.2 Re-ranking

Re-ranking improves precision by applying more sophisticated relevance models to initial search results:

#### Cross-Encoder Re-ranking

Cross-encoders process query and document pairs for more accurate relevance scoring:

```typescript
// Example cross-encoder re-ranking implementation
async function crossEncoderRerank(query: string, initialResults: SearchResult[], topK: number = 5): Promise<SearchResult[]> {
  // Get document content for each result
  const documents = initialResults.map(result => result.content);

  // Create query-document pairs
  const pairs = documents.map(doc => ({ query, document: doc }));

  // Score pairs using cross-encoder model
  const scores = await crossEncoderModel.score(pairs);

  // Combine scores with initial results
  const scoredResults = initialResults.map((result, i) => ({
    ...result,
    score: scores[i]
  }));

  // Sort by new scores and return top K
  return scoredResults
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
```

#### Reciprocal Rank Fusion

Combine results from multiple retrieval methods:

```typescript
// Example reciprocal rank fusion implementation
function reciprocalRankFusion(
  vectorResults: SearchResult[],
  keywordResults: SearchResult[],
  k: number = 60
): SearchResult[] {
  // Create a map to store combined scores
  const scoreMap = new Map<string, { result: SearchResult, score: number }>();

  // Process vector search results
  vectorResults.forEach((result, i) => {
    const id = result.id;
    const score = 1 / (i + k);
    scoreMap.set(id, { result, score });
  });

  // Process keyword search results
  keywordResults.forEach((result, i) => {
    const id = result.id;
    const score = 1 / (i + k);

    if (scoreMap.has(id)) {
      // Add scores if document exists in both result sets
      const existing = scoreMap.get(id)!;
      scoreMap.set(id, {
        result: existing.result,
        score: existing.score + score
      });
    } else {
      scoreMap.set(id, { result, score });
    }
  });

  // Convert map to array and sort by score
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(item => item.result);
}
```

### 10.3 Contextual Chunking

Advanced chunking strategies improve retrieval quality by creating more semantically meaningful chunks:

#### Semantic Chunking

Split documents based on semantic boundaries rather than fixed sizes:

```typescript
// Example semantic chunking implementation
async function semanticChunking(document: string): Promise<string[]> {
  // Use LLM to identify semantic boundaries
  const response = await generateText({
    model: openai('gpt-4o'),
    prompt: `Split the following document into coherent sections based on semantic meaning. Mark each section boundary with [SECTION_BREAK]:

${document}`,
    temperature: 0.2,
  });

  // Split by section breaks
  return response.text.split('[SECTION_BREAK]')
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0);
}
```

#### Hierarchical Chunking

Create chunks at multiple levels of granularity:

```typescript
// Example hierarchical chunking implementation
function hierarchicalChunking(document: string): {
  paragraphs: string[],
  sections: string[],
  document: string
} {
  // Split into paragraphs
  const paragraphs = document.split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Group paragraphs into sections (e.g., every 3 paragraphs)
  const sections = [];
  for (let i = 0; i < paragraphs.length; i += 3) {
    const section = paragraphs.slice(i, i + 3).join('\n\n');
    sections.push(section);
  }

  return {
    paragraphs,
    sections,
    document
  };
}
```

### 10.4 Hybrid Search

Combine vector search with traditional keyword search for better results:

```typescript
// Example hybrid search implementation
async function hybridSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  // Perform vector search
  const vectorResults = await vectorSearch(
    await generateEmbedding(query),
    { ...options, limit: options.limit || 20 }
  );

  // Perform keyword search (BM25)
  const keywordResults = await keywordSearch(
    query,
    { ...options, limit: options.limit || 20 }
  );

  // Combine results using reciprocal rank fusion
  const combinedResults = reciprocalRankFusion(
    vectorResults,
    keywordResults
  );

  // Return top results
  return combinedResults.slice(0, options.limit || 10);
}
```

## 11. Supabase Integration Features

### 11.1 Real-time Features

Supabase provides powerful real-time capabilities through Postgres's logical replication and WebSockets:

#### 11.1.1 Real-time Subscriptions

The project leverages Supabase's real-time capabilities through the `useSupabaseRealtime` hook:

```typescript
// Subscribe to changes in a table
const { isConnected, error, lastEventTimestamp } = useSupabaseRealtime({
  table: 'documents',
  event: '*', // 'INSERT', 'UPDATE', 'DELETE', or '*'
  filter: { column: 'user_id', value: currentUser.id },
  onInsert: (payload) => console.log('New document:', payload),
  onUpdate: (payload) => console.log('Document updated:', payload),
  onDelete: (payload) => console.log('Document deleted:', payload),
});
```

#### 11.1.2 Presence Channels

Track online users and their state:

```typescript
// Track online users
const { isConnected } = useSupabaseRealtime({
  channelType: 'presence',
  channelName: 'online-users',
  initialPresence: { user_id: currentUser.id, status: 'online' },
  onPresenceSync: (state) => console.log('Current online users:', state),
  onPresenceJoin: (key, presence) => console.log('User joined:', key, presence),
  onPresenceLeave: (key, presence) => console.log('User left:', key, presence),
});
```

#### 11.1.3 Broadcast Channels

Send and receive messages between clients:

```typescript
// Send and receive messages
const { isConnected } = useSupabaseRealtime({
  channelType: 'broadcast',
  channelName: 'chat-room',
  onBroadcast: (payload) => console.log('New message:', payload),
});
```

#### 11.1.4 Configuring Real-time

To enable real-time for specific tables:

```sql
-- Enable real-time for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE documents, agents, workflows;
```

#### 11.1.5 Real-time with Row Level Security

Real-time subscriptions respect Row Level Security (RLS) policies:

```sql
-- Enable RLS on the documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create a policy that only allows users to access their own documents
CREATE POLICY "Users can only access their own documents"
ON documents
FOR ALL
USING (auth.uid() = owner_id);
```

### 11.2 Vector Database Capabilities

Supabase provides powerful vector database capabilities through pgvector:

- **pgvector Extension**: Stores and queries vector embeddings with up to 2,000 dimensions
- **HNSW Indexes**: Hierarchical Navigable Small World indexes for efficient approximate nearest neighbor search
- **Distance Operators**: Support for Euclidean (L2), Inner Product, and Cosine distance metrics
- **Automatic Embeddings**: Automated generation and updates of embeddings
- **Structured and Unstructured Metadata**: Flexible storage options for vector metadata

#### 11.2.1 Vector Columns

To create a table with vector columns:

```sql
-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector
WITH SCHEMA extensions;

-- Create a table to store vectors
CREATE TABLE documents (
  id serial PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  embedding vector(384)  -- 384 dimensions for gte-small model
);
```

The `vector` data type requires specifying the number of dimensions. Choose the appropriate dimension size based on your embedding model:

| Model | Dimensions |
|-------|------------|
| OpenAI text-embedding-3-small | 1536 |
| OpenAI text-embedding-3-large | 3072 |
| Google text-embedding-gecko | 768 |
| Supabase/gte-small | 384 |
| Cohere embed-english-v3.0 | 1024 |

#### 11.2.2 Storing Vectors

To store vectors in the database:

```typescript
// Generate a vector using Transformers.js
const generateEmbedding = await pipeline('feature-extraction', 'Supabase/gte-small');
const output = await generateEmbedding(text, {
  pooling: 'mean',
  normalize: true,
});

// Extract the embedding output
const embedding = Array.from(output.data);

// Store the vector in Postgres
const { data, error } = await supabase.from('documents').insert({
  title,
  body,
  embedding,
});
```

#### 11.2.3 Querying Vectors

Supabase supports three distance operators for vector similarity search:

| Operator | Description | Operator Class |
|----------|-------------|---------------|
| <-> | Euclidean distance | vector_l2_ops |
| <#> | Negative inner product | vector_ip_ops |
| <=> | Cosine distance | vector_cosine_ops |

To perform a similarity search, create a Postgres function:

```sql
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  title text,
  body text,
  similarity float
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    documents.id,
    documents.title,
    documents.body,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY (documents.embedding <=> query_embedding) ASC
  LIMIT match_count;
$$;
```

Then call this function from your application:

```typescript
// Generate embedding for the search query
const queryEmbedding = await generateEmbedding(searchQuery);

// Call the match_documents function
const { data: documents } = await supabase.rpc('match_documents', {
  query_embedding: queryEmbedding,
  match_threshold: 0.78,
  match_count: 10
});
```

#### 11.2.4 Automatic Embeddings

Supabase supports automatic embedding generation and updates using:

1. **pgmq**: Queues embedding generation requests
2. **pg_net**: Handles asynchronous HTTP requests to Edge Functions
3. **pg_cron**: Automatically processes and retries embedding generations
4. **Triggers**: Detects content changes and enqueues embedding generation requests

```sql
-- Create trigger function to queue embedding generation
CREATE OR REPLACE FUNCTION queue_embedding_generation()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue the document for embedding generation
  PERFORM pgmq.send(
    'embedding_jobs',
    json_build_object(
      'id', NEW.id,
      'content', NEW.content,
      'title', NEW.title
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document inserts
CREATE TRIGGER generate_embedding_on_insert
AFTER INSERT ON documents
FOR EACH ROW
EXECUTE FUNCTION queue_embedding_generation();

-- Create trigger for document updates
CREATE TRIGGER generate_embedding_on_update
AFTER UPDATE OF title, content ON documents
FOR EACH ROW
WHEN (OLD.title IS DISTINCT FROM NEW.title OR OLD.content IS DISTINCT FROM NEW.content)
EXECUTE FUNCTION queue_embedding_generation();
```

#### 11.2.5 Halfvec Support

For memory optimization, Supabase supports `halfvec` type which uses half-precision (16-bit) floating point numbers:

```sql
-- Create table with halfvec column
CREATE TABLE documents (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title text NOT NULL,
  content text NOT NULL,
  embedding halfvec(1536),
  created_at timestamp WITH TIME ZONE DEFAULT NOW()
);

-- Create HNSW index for halfvec column
CREATE INDEX ON documents USING hnsw (embedding halfvec_cosine_ops);
```

The `halfvec` type reduces memory usage by approximately 50% compared to the standard `vector` type, with minimal impact on search accuracy.

### 11.3 Scheduled Tasks with pg_cron

The project leverages Supabase's pg_cron extension for scheduled tasks and automated processes:

#### 11.3.1 pg_cron Overview

pg_cron is a PostgreSQL extension that provides cron-based job scheduling directly within the database:

- Schedule SQL commands to run periodically
- Manage jobs through SQL interface
- Monitor job execution and history
- Automatically retry failed jobs

#### 11.3.2 Creating Scheduled Tasks

```typescript
// Create a daily database maintenance task
const taskId = await createScheduledTask(
  'Daily Database Maintenance',
  '0 0 * * *', // Run at midnight every day
  'VACUUM ANALYZE; REINDEX TABLE documents;',
  {
    description: 'Performs daily database maintenance',
    isActive: true,
    metadata: { priority: 'high', category: 'maintenance' }
  }
);
```

#### 11.3.3 Managing Scheduled Tasks

```typescript
// Update a scheduled task
await updateScheduledTask(taskId, {
  cronExpression: '0 1 * * *', // Change to 1 AM
  isActive: true
});

// Run a task immediately
const runId = await runScheduledTaskNow(taskId);

// Delete a scheduled task
await deleteScheduledTask(taskId);
```

#### 11.3.4 Querying Scheduled Tasks

```typescript
// Get all active tasks
const activeTasks = await getScheduledTasks({ isActive: true });

// Get a specific task with its run history
const task = await getScheduledTask(taskId);
```

#### 11.3.5 Automatic Embeddings with pg_cron

One of the most powerful use cases for pg_cron is automating vector embedding generation and updates:

```sql
-- Create a scheduled task to process embedding queue every minute
SELECT cron.schedule(
  'process_embedding_queue',
  '* * * * *',
  $$
  WITH pending_jobs AS (
    SELECT * FROM pgmq.get_job('embedding_queue', 10)
  )
  SELECT
    id,
    generate_embedding(payload->>'content') AS embedding
  FROM pending_jobs;
  $$
);
```

This approach enables:

- Asynchronous embedding generation without blocking user operations
- Automatic retries for failed embedding generations
- Efficient batch processing of embedding requests
- Monitoring and logging of embedding generation processes

#### 11.3.6 Other Common Use Cases

- **Database Maintenance**: Regular vacuum, analyze, and reindex operations
- **Data Aggregation**: Scheduled rollups and analytics calculations
- **Cache Invalidation**: Periodic cache clearing and refreshing
- **Report Generation**: Automated report creation and distribution
- **Data Synchronization**: Keep data in sync across systems
- **Monitoring**: Collect and store system metrics at regular intervals

### 11.4 Transaction Management

The project includes comprehensive transaction management capabilities for Supabase:

#### 11.4.1 Transaction Client

The project provides a dedicated transaction client for Supabase:

```typescript
// Get a transaction client
const transactionClient = getSupabaseTransactionClient();
```

#### 11.4.2 Transaction Logging

All transactions are logged to the `database_transactions` table:

```typescript
// Log a transaction
const connectionId = await logDatabaseConnection(
  'transaction',
  'transaction_pool',
  process.env.DATABASE_URL || 'DATABASE_URL environment variable',
  { metadata: { source: 'withTransaction' } }
);

// Start a transaction
const { transactionId, client } = await startTransaction(
  connectionId,
  'write',
  { metadata: { operation: 'update-user-profile' } }
);
```

#### 11.4.3 High-Level Transaction API

The project provides a high-level API for transaction management:

```typescript
// Execute operations within a transaction
await withTransaction(async (client, transactionId) => {
  // Perform database operations
  const { data, error } = await client
    .from('users')
    .update({ name: 'New Name' })
    .eq('id', userId);

  // Log queries if needed
  await logDatabaseQuery(
    transactionId,
    'UPDATE users SET name = $1 WHERE id = $2',
    'update',
    { executionTimeMs: 15, rowCount: 1 }
  );

  return data;
}, {
  transactionType: 'write',
  metadata: { userId, action: 'update-profile' }
});
```

#### 11.4.4 Transaction Monitoring

The project includes monitoring capabilities for transactions:

```typescript
// Get transaction statistics
const { data, error } = await supabase
  .from('database_transactions')
  .select('status, count(*)')
  .group('status');

// Get transaction details
const { data, error } = await supabase
  .from('database_transactions')
  .select('*, database_queries(*)')
  .eq('id', transactionId);
```

### 11.5 HNSW Index Creation

HNSW (Hierarchical Navigable Small World) is an algorithm for approximate nearest neighbor search that significantly improves query performance for high-dimensional vectors.

To create HNSW indexes for different distance metrics:

```sql
-- For Euclidean distance
CREATE INDEX ON documents USING hnsw (embedding vector_l2_ops);

-- For inner product
CREATE INDEX ON documents USING hnsw (embedding vector_ip_ops);

-- For cosine distance
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);
```

#### 11.4.1 HNSW Index Parameters

You can customize HNSW indexes with additional parameters:

```sql
-- Create HNSW index with custom parameters
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

Key parameters:

- **m**: Controls the maximum number of connections per node (default: 16)
- **ef_construction**: Controls the size of the dynamic candidate list during index construction (default: 64)
- **ef_search**: Controls the size of the dynamic candidate list during search (set at query time)

Higher values for these parameters generally improve search accuracy at the cost of longer index build times and higher memory usage.

#### 11.4.2 When to Use HNSW

HNSW indexes are recommended when:

1. Your vector table has more than 100,000 rows
2. You need faster query performance for high-dimensional vectors
3. You can accept approximate nearest neighbor results (slightly less accurate than exact search)
4. You have sufficient memory to store the index

Unlike IVFFlat indexes, HNSW indexes can be built immediately after table creation and remain optimal as new data is added.

### 11.3 Automatic Embedding Generation

The project implements an automated system for embedding generation and updates using Supabase's capabilities:

1. **Triggers**: Detect content changes and enqueue embedding generation requests

   ```sql
   -- Trigger for insert events
   CREATE TRIGGER embed_documents_on_insert
     AFTER INSERT
     ON documents
     FOR EACH ROW
     EXECUTE FUNCTION util.queue_embeddings('embedding_input', 'embedding');

   -- Trigger for update events
   CREATE TRIGGER embed_documents_on_update
     AFTER UPDATE OF title, content
     ON documents
     FOR EACH ROW
     EXECUTE FUNCTION util.queue_embeddings('embedding_input', 'embedding');
   ```

1. **Queues**: Use pgmq for reliable job processing and retries

   ```sql
   -- Queue embedding generation requests
   SELECT pgmq.create_queue('embedding_jobs');
   ```

- **Edge Functions**: Generate embeddings via external APIs (OpenAI, Google)

   ```typescript
   // Edge Function to generate embeddings
   async function generateEmbedding(text: string) {
     const response = await openai.embeddings.create({
       model: 'text-embedding-3-small',
       input: text,
     });
     return response.data[0].embedding;
   }
   ```

- **Scheduled Tasks**: Process embedding jobs automatically with pg_cron

   ```sql
   -- Schedule embedding processing every minute
   SELECT cron.schedule(
     'process-embedding-jobs',
     '* * * * *',
     $$SELECT util.process_embedding_jobs()$$
   );
   ```

This system ensures that embeddings are always kept in sync with content changes, with automatic retries for failed jobs.

The project leverages several advanced Supabase features:

1. **pg_cron Extension**: Already enabled for scheduled tasks and automated maintenance
2. **Webhooks**: Configured to trigger LibSQL updates when Supabase data changes
3. **Redis Wrapper**: Direct connection to Upstash Redis database for caching and real-time data

### 11.4 Engineering for Scale

For production vector workloads, the application follows these best practices:

1. **Separate Databases**: Split vector collections into separate projects for independent scaling
2. **Foreign Data Wrappers**: Connect primary and secondary databases for unified queries
3. **View Abstractions**: Expose collections through views for application access
4. **Compute Sizing**: Select appropriate compute add-ons based on vector dimensions and dataset size

#### Compute Add-on Selection

The project provides guidance for selecting the appropriate compute add-on based on your vector workload:

| Compute Add-on | Max Vectors (1536d) | QPS (1536d) | RAM Usage | Total RAM |
|---------------|-------------------|------------|-----------|----------|
| Small         | 100,000           | 25         | 1.5 GB    | 2 GB     |
| Medium        | 250,000           | 60         | 3.5 GB    | 4 GB     |
| Large         | 500,000           | 120        | 7 GB      | 8 GB     |
| XL            | 1,000,000         | 250        | 13 GB     | 16 GB    |
| 2XL           | 1,000,000         | 350        | 15 GB     | 32 GB    |
| 4XL           | 1,000,000         | 500        | 15 GB     | 64 GB    |

For optimal performance, ensure your vector database fits in RAM to avoid disk I/O bottlenecks.

### 11.5 Security and Access Control

Supabase provides Row Level Security (RLS) for fine-grained access control to vector data:

```sql
-- Enable RLS on the documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create a policy that only allows users to access their own documents
CREATE POLICY "Users can only access their own documents"
ON documents
FOR ALL
USING (auth.uid() = owner_id);
```

This can be combined with Foreign Data Wrappers when user and document data live outside of Supabase:

```sql
-- Create foreign tables that link to external tables
CREATE SCHEMA external;
CREATE EXTENSION postgres_fdw WITH SCHEMA extensions;

-- Setup the foreign server
CREATE SERVER foreign_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host '<db-host>', port '<db-port>', dbname '<db-name>');

-- Map local 'authenticated' role to external 'postgres' user
CREATE USER MAPPING FOR authenticated
  SERVER foreign_server
  OPTIONS (user 'postgres', password '<user-password>');
```

This approach allows for secure vector search that respects user permissions, even when those permissions are defined in external systems.

### 11.6 Redis Integration with Supabase

The project includes a Redis wrapper in Supabase that connects directly to an Upstash Redis database:

```sql
-- Enable the Redis wrapper extension
CREATE EXTENSION IF NOT EXISTS redis_fdw;

-- Create a server connection to Upstash Redis
CREATE SERVER redis_server
  FOREIGN DATA WRAPPER redis_fdw
  OPTIONS (address 'redis://default:[PASSWORD]@[HOST].upstash.io:[PORT]');

-- Create a user mapping
CREATE USER MAPPING FOR postgres
  SERVER redis_server
  OPTIONS (password '[PASSWORD]');

-- Create a foreign table for Redis data
CREATE FOREIGN TABLE redis_cache (
  key text,
  value text
)
SERVER redis_server
OPTIONS (database '0');
```

This integration enables:

1. **Caching**: Store frequently accessed data in Redis for faster retrieval
2. **Real-time Data**: Use Redis pub/sub for real-time updates across services
3. **Session Management**: Store session data in Redis for stateless API routes
4. **Rate Limiting**: Implement rate limiting using Redis counters

The Redis wrapper can be accessed directly from SQL queries or through the Supabase client:

```typescript
// Example of using Redis from Supabase
const { data, error } = await supabase.from('redis_cache')
  .select('value')
  .eq('key', 'cached_data');

// Example of setting Redis data
const { error } = await supabase.from('redis_cache')
  .insert({ key: 'cached_data', value: JSON.stringify(data) });
```

### 11.7 Supabase Webhooks

The project uses Supabase webhooks to synchronize data between Supabase and LibSQL:

```typescript
// Example webhook handler in Next.js API route
export async function POST(req: Request) {
  const payload = await req.json();
  const { type, table, record, old_record } = payload;

  // Verify webhook signature
  const signature = req.headers.get('x-supabase-signature');
  if (!verifySignature(payload, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Process the webhook event
  if (table === 'documents' && type === 'INSERT') {
    // Sync new document to LibSQL
    await syncDocumentToLibSQL(record);
  } else if (table === 'documents' && type === 'UPDATE') {
    // Update document in LibSQL
    await updateDocumentInLibSQL(record, old_record);
  }

  return new Response('Webhook processed', { status: 200 });
}
```

Webhooks are configured in the Supabase dashboard to trigger on specific database events (INSERT, UPDATE, DELETE) for selected tables.

### 11.8 Supabase Client Hooks

The project includes three custom hooks for Supabase integration:

1. **`useSupabaseFetch`**: Data fetching from API routes with error handling and retries

   ```typescript
   const { data, isLoading, error, refetch } = useSupabaseFetch({
     endpoint: '/api/documents',
     resourceName: 'documents',
     dataKey: 'documents',
     queryParams: { category: 'technical' },
     enabled: true,
     maxRetries: 3
   });
   ```

2. **`useSupabaseCrud`**: CRUD operations via API routes with toast notifications

   ```typescript
   const { create, update, remove, isLoading, error } = useSupabaseCrud({
     resourceName: 'documents',
     endpoint: '/api/documents',
     onSuccess: () => toast({ title: 'Success', description: 'Operation completed' })
   });
   ```

3. **`useSupabaseDirect`**: Direct Supabase client operations with transformation support

   ```typescript
   const { loading, error, items, getAll, getById, create, update, remove } = useSupabaseDirect({
     tableName: 'documents',
     transformBeforeSave: (data) => ({
       ...data,
       updated_at: new Date().toISOString()
     }),
     transformAfterFetch: (data) => ({
       ...data,
       formattedDate: new Date(data.created_at).toLocaleDateString()
     })
   });
   ```

### 11.9 Workflow Integration

The project includes a Supabase workflow provider for managing multi-step AI processes. This implementation uses Supabase tables to store workflow state and steps, providing persistence and scalability:

```typescript
// Create a new workflow
const workflow = await workflowProvider.createWorkflow({
  name: 'Document Processing',
  description: 'Process and analyze documents',
  metadata: { priority: 'high' }
});

// Add steps to the workflow
await workflowProvider.addWorkflowStep(workflow.id, {
  agentId: 'document-analyzer',
  input: { documentId: '123' },
  metadata: { requiresApproval: true }
});
```

The workflow system supports:

- **Workflow Management**: Create, retrieve, list, and delete workflows
- **Step Management**: Add steps to workflows and track their execution
- **Execution Control**: Execute, pause, and resume workflows
- **Integration with Memory**: Each step has its own thread for conversation history
- **AI Model Integration**: Specialized AI providers for workflow contexts

The Supabase implementation uses the following tables:

- `workflows`: Stores workflow metadata and status
- `workflow_steps`: Stores individual steps with their agent, input, and status

---

## 11. Observability System

The project includes a comprehensive observability system for monitoring AI model performance, system health, costs, and evaluations. This system is built on top of the memory layer and provides insights into the behavior of AI models and the overall system.

### 11.1 Observability Tables

The following tables have been added to the Supabase schema to support observability:

- **Tracing Tables**:
  - `traces`: Stores high-level trace information for AI model interactions
  - `spans`: Stores detailed timing information for specific operations within a trace
  - `events`: Stores discrete events that occur during a trace

- **Metrics Tables**:
  - `system_metrics`: Stores system health metrics like CPU usage, memory usage, etc.
  - `model_performance`: Stores performance metrics for AI models like latency, tokens per second, etc.

- **Cost Tables**:
  - `model_costs`: Stores cost information for AI model usage

- **Evaluation Tables**:
  - `model_evaluations`: Stores evaluation results for AI models
  - `evaluation_metrics`: Stores detailed metrics for model evaluations
  - `evaluation_examples`: Stores example inputs and outputs for model evaluations

### 11.2 Observability Components

The project includes advanced visualization components for the observability dashboard:

- **TracingOverview**: Displays a list of traces with filtering and sorting
- **TracingDetails**: Shows detailed information about a specific trace
- **TracingTimeline**: Visualizes the timeline of spans and events within a trace
- **ModelPerformance**: Visualizes performance metrics for AI models using recharts
- **SystemHealth**: Monitors system health metrics with d3 gauge charts
- **CostEstimation**: Analyzes and projects costs for AI model usage
- **ModelEvaluation**: Evaluates model quality with radar charts for metrics

### 11.3 Tracing Integration

The tracing system is integrated with the memory layer to provide insights into AI model interactions:

- **Trace Creation**: Each AI model interaction creates a trace with a unique ID
- **Span Recording**: Operations like token counting, embedding generation, and model inference create spans
- **Event Logging**: Discrete events like user messages, tool calls, and errors are logged
- **Metadata Capture**: Relevant metadata like model ID, temperature, and token counts are captured

### 11.4 Usage

To use the observability system:

1. **View the Dashboard**: Navigate to `/observability` to see the dashboard
2. **Filter Traces**: Use the time range selector and search box to filter traces
3. **Analyze Performance**: View model performance metrics and system health
4. **Track Costs**: Monitor and project costs for AI model usage
5. **Evaluate Models**: Compare model quality across different metrics

### 11.5 API Routes

The following API routes are available for the observability system:

- **GET /api/observability/traces**: Get a list of traces or a specific trace
- **GET /api/observability/metrics**: Get system health metrics
- **GET /api/observability/performance**: Get model performance metrics
- **GET /api/observability/costs**: Get cost information for AI models
- **GET /api/observability/evaluations**: Get evaluation results for AI models

---

*End of `/lib/memory/README.md`*

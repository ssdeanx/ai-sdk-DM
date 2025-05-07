# /lib/memory — Memory & Persistence Layer

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib/memory`, use this prompt-enrichment template:

1. **Background**: This folder implements the memory and persistence layer for AI agents:
   - **LibSQL/Turso** for conversational history, embeddings storage, HNSW vector indexing, and thread state.
   - **Supabase** for configuration, vector search (pgvector with HNSW indexes), workflow management, and loading model, agent, and tool configurations that drive memory behavior.
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
└── README.md              # This file: overview, onboarding, and AI assistant guide

# Related Tracing & Observability Files
lib/
├── ai-sdk-tracing.ts      # AI SDK integration with tracing system
├── langfuse-integration.ts # Langfuse tracing integration
├── otel-tracing.ts        # OpenTelemetry integration
└── tracing.ts             # Core tracing utilities
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

### 2.3 drizzle.ts

- Exports `getDrizzleClient()`:
  - Initializes a Drizzle ORM client using `DATABASE_URL`.
  - Throws if the connection string is not configured.
- Exports `isDrizzleAvailable()`:
  - Checks connectivity by executing a simple query.
- Exports `getDataWithDrizzle(table, options)`:
  - Provides a generic function for querying data with filtering, sorting, and pagination.
- Exports `getModelConfigWithDrizzle(modelId)`:
  - Retrieves a model configuration by ID using Drizzle.

### 2.4 supabase.ts

- Exports `getSupabaseClient()`:
  - Initializes a Supabase client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Throws if the credentials are not configured.
- Exports `getDrizzleClient()`:
  - Initializes a Drizzle ORM client for Supabase.
  - Uses `DATABASE_URL` environment variable for direct Postgres connection.
  - Integrates with schema definitions in `db/supabase/schema.ts`.
- Exports `isSupabaseAvailable()`:
  - Checks connectivity by executing a simple query.
- Exports `getData()`, `getItemById()`, `createItem()`, `updateItem()`, `deleteItem()`:
  - Generic CRUD operations for Supabase tables with filtering, sorting, and pagination.
  - Supports transaction safety and error handling.
- Exports `getModelConfig()`, `getModels()`:
  - Model-specific operations with Drizzle integration.
  - Caches results for performance optimization.
- Exports `getAgentConfig()`, `getAgents()`, `getAgentTools()`:
  - Agent-specific operations with relationship handling.
- Exports `getSetting()`:
  - Retrieves a setting by category and key with default value support.

### 2.5 memory.ts

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
- [ ] Create Supabase migrations for database schema changes
- [ ] Implement type generation from Supabase schema

---

## 8. Building & Migrating Schemas

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

## 10. Supabase Vector Integration

The project leverages Supabase's pgvector capabilities for advanced vector search and embedding management:

### 10.1 Vector Database Capabilities

Supabase provides powerful vector database capabilities through pgvector:

- **pgvector Extension**: Stores and queries vector embeddings with up to 2,000 dimensions
- **HNSW Indexes**: Hierarchical Navigable Small World indexes for efficient approximate nearest neighbor search
- **Distance Operators**: Support for Euclidean (L2), Inner Product, and Cosine distance metrics
- **Automatic Embeddings**: Automated generation and updates of embeddings

### 10.2 HNSW Index Creation

To create HNSW indexes for different distance metrics:

```sql
-- For Euclidean distance
CREATE INDEX ON embeddings USING hnsw (embedding vector_l2_ops);

-- For inner product
CREATE INDEX ON embeddings USING hnsw (embedding vector_ip_ops);

-- For cosine distance
CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops);
```

### 10.3 Automatic Embedding Generation

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

2. **Queues**: Use pgmq for reliable job processing and retries

   ```sql
   -- Queue embedding generation requests
   SELECT pgmq.create_queue('embedding_jobs');
   ```

3. **Edge Functions**: Generate embeddings via external APIs (OpenAI, Google)

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

4. **Scheduled Tasks**: Process embedding jobs automatically with pg_cron

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

### 10.4 Engineering for Scale

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

### 10.5 Security and Access Control

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

### 10.6 Redis Integration with Supabase

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

### 10.7 Supabase Webhooks

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

### 10.8 Supabase Client Hooks

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

### 10.9 Workflow Integration

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

# Upstash Memory & Logging Implementation

This directory contains a comprehensive, type-safe implementation for leveraging Upstash Redis and Upstash VectorDB as a robust memory store and remote logger for AI applications.

---

## Overview

The Upstash implementation provides a modular, production-grade, and feature-rich solution for AI memory, vector search, and logging, including:

1. **Upstash Client Management (`upstashClients.ts`)**: Centralized, singleton initialization and management of Redis, VectorDB, and Query clients, with health checks and config validation.
2. **Redis-based Memory Storage (`redis-store.ts`)**: Typed, efficient storage and retrieval of conversation threads and messages using Redis Hashes and Sorted Sets, with RediSearch and @upstash/query integration for advanced search.
3. **Vector Database Operations (`vector-store.ts`)**: Full vector operations (upsert, search, fetch, delete, reset, info) for managing embeddings with metadata using Upstash VectorDB and @upstash/query for hybrid/filtered search.
4. **Remote Logging (`upstash-logger.ts`)**: Persistent, capped logging system using Redis Streams for capturing application logs (info, warnings, errors, debug) with advanced querying and retrieval.
5. **Supabase Compatibility Layer (`supabase-adapter.ts`, `supabase-adapter-factory.ts`)**: Drop-in replacement for Supabase memory APIs, with Upstash-first, fallback-to-Supabase/LibSQL strategy and @upstash/query support for advanced queries.
6. **Advanced Streaming & Processing (`stream-processor.ts`, `memory-processor.ts`)**: Efficient streaming, batching, and semantic search utilities, with @upstash/query for streaming queries.
7. **Barrel Export (`index.ts`)**: Easy-to-use exports for all functionalities.

---

# Upstash Knowledge Graph & Tooling Overview

This section mirrors the canonical knowledge graph in `upstash.json` and serves as the single source of truth for onboarding, refactoring, and AI agent support. All contributors and AI agents should reference this section for:

- **Todos, tags, features, API routes, onboarding/tooling, and reasoning tools**
- **Deduplicated tool list with usage notes, when/how/why, and relationships**
- **File-by-file status, todos, and feature coverage table**
- **Onboarding, troubleshooting, best practices, and mental models**

---

## 📚 Available Tools for Upstash Integration & Project Automation

Below is a deduplicated list of all available tools (from the knowledge graph's onboarding:tool-list), with usage notes, when/how/why to use, and relationships. Use these for onboarding, automation, troubleshooting, and continuous improvement.

| Tool ID                | When to Use                                      | How to Use / Notes                                                                 | Why / Relationships / Connections |
|------------------------|--------------------------------------------------|------------------------------------------------------------------------------------|-----------------------------------|
| add_documentation      | Onboarding new libs/APIs, after refactors        | Provide name & URL. Optionally add tags/topics.                                    | Keeps docs up-to-date. Related: update_documentation, search_documentation |
| update_documentation   | After API/library/workflow changes               | Specify doc to update and new content/URL.                                         | Prevents outdated docs. Related: add_documentation, search_documentation |
| think                  | Before major changes, debugging, migration       | Write out reasoning, hypotheses, next steps. Use as digital rubber duck.           | Improves code quality. Related: debuggingapproach, sequentialthinking |
| open_project           | Onboarding, troubleshooting, multi-repo work     | Specify project/workspace to open.                                                 | Ensures context alignment. Related: set_profile, get_profile_context |
| read_context           | Reviewing legacy code, onboarding, refactoring   | Specify path, file types, recurse.                                                 | Enables deep code analysis. Related: get_chunk_count, generate_outline |
| get_chunk_count        | Before reading/analyzing large files/dirs        | Provide same params as read_context.                                               | Prevents timeouts. Related: read_context |
| set_profile            | Switching work types (backend/frontend, etc)     | Specify profile name/settings.                                                     | Optimizes context/tools. Related: get_profile_context, open_project |
| get_profile_context    | After setting/switching profiles                 | Call after set_profile.                                                            | Gathers context for migration. Related: set_profile |
| generate_outline       | Onboarding, reviewing, refactoring code          | Specify file path.                                                                 | Understand file structure. Related: read_context |
| search_documentation   | Troubleshooting, onboarding, migration           | Provide query string.                                                              | Finds best practices. Related: add_documentation, update_documentation, list_documentation |
| list_documentation     | Onboarding, auditing, updating docs              | Call without params for full list.                                                 | Audits docs. Related: search_documentation, add_documentation |
| get_library_docs       | Integrating/updating libs, troubleshooting       | Resolve library ID, then fetch docs.                                               | Latest best practices. Related: resolve_library_id |
| resolve_library_id     | Before fetching docs for new/updated package     | Provide npm package name.                                                          | Ensures correct docs. Related: get_library_docs |
| write_to_terminal      | Running scripts/tests/deployments, migrations    | Provide command string/params.                                                     | Automates CLI tasks. Related: read_terminal_output, send_control_character |
| read_terminal_output   | After running scripts/tests/deployments          | Specify terminal session/command.                                                  | Validates automation. Related: write_to_terminal |
| send_control_character | Stopping/controlling scripts/processes           | Specify control char & terminal session.                                           | Manages automation. Related: write_to_terminal, read_terminal_output |

**Best Practices:**

- Always use `add_documentation` for new sources and `update_documentation` for changes.
- Use `list_documentation` to check docs before making changes.
- Reference this list when building onboarding flows, troubleshooting, or automating tasks.

---

## 📊 File-by-File Status, Todos, Tags, API Routes, and Reasoning Tools

The following table summarizes the status, todos, tags, API routes, and reasoning tools for each Upstash entity. For full details, see `upstash.json`.

| File                      | Status      | Todos (Key)                                              | Tags (Key)                | API Routes (Key)                | Reasoning Tools (Key)                |
|---------------------------|-------------|----------------------------------------------------------|---------------------------|----------------------------------|--------------------------------------|
| agent-state-store.ts      | incomplete  | Remove all any, console; add query, tests, type safety   | upstash, agent-state, ... | /api/ai-sdk/agents, ...          | debuggingapproach, metacognitivemonitoring, codesmells |
| redis-store.ts            | incomplete  | Remove any, console; add query, tests, helpers           | upstash, redis, ...       | /api/ai-sdk/threads, ...         | debuggingapproach, sequentialthinking, codesmells      |
| vector-store.ts           | incomplete  | Remove console; add query, tests, type safety, logging   | upstash, vector, ...      | /api/ai-sdk/embeddings, ...      | scientificmethod, decisionframework, codesmells        |
| upstash-logger.ts         | incomplete  | Remove any, console; add type-safe parsing, tests        | upstash, logging, ...     | /api/ai-sdk/logs, ...            | metacognitivemonitoring, codesmells                   |
| upstashClients.ts         | incomplete  | Add advanced query usage docs/examples                   | upstash, client, ...      | /api/ai-sdk/*                    | debuggingapproach, metacognitivemonitoring            |
| upstashTypes.ts           | incomplete  | Expand types for RediSearch/query, add granular types    | upstash, types, ...       |                                  | debuggingapproach, metacognitivemonitoring, codesmells |
| memoryStore.ts            | incomplete  | Remove any, console; add query, tests, error handling    | upstash, memory, ...      | /api/ai-sdk/threads, ...         | debuggingapproach, decisionframework, codesmells       |
| stream-processor.ts       | incomplete  | Remove any, console; add query, tests, error handling    | upstash, streaming, ...   | /api/ai-sdk/streams, ...         | sequentialthinking, scientificmethod, codesmells       |
| memory-processor.ts       | incomplete  | Add query for streaming/semantic search, add tests       | upstash, memory, ...      |                                  | debuggingapproach, codesmells                          |
| supabase-adapter.ts       | incomplete  | Fix Query API, add CRUD, error handling, tests           | upstash, supabase, ...    |                                  | debuggingapproach, codesmells                          |
| supabase-adapter-factory.ts| incomplete | Remove any, add query, error handling, tests             | upstash, supabase, ...    |                                  | debuggingapproach, codesmells                          |
| index.ts                  | incomplete  | Remove broken exports, update/type-safe exports           | upstash, barrel, ...      | /api/ai-sdk/*                    | debuggingapproach, codesmells                          |

**Legend:** See `upstash.json` for full tag and route lists. All files must:

- Remove all `any` types and direct `console` statements
- Use Zod schemas and upstashLogger for type safety and logging
- Add/expand tests and docs for all features
- Use @upstash/query for advanced search, streaming, and filtering
- Update the knowledge graph and README after every significant change

---

## Features

- **Typed API**: Strongly-typed interfaces for all data models and function signatures.
- **Error Handling**: Custom error classes for each module (`UpstashClientError`, `RedisStoreError`, `VectorStoreError`, `LoggerError`).
- **Efficient Data Structures**: Optimized use of Redis data structures for performance.
- **Vector Similarity Search**: Powerful semantic and hybrid search capabilities.
- **Metadata Support**: Rich metadata storage for threads, messages, and vectors.
- **Redis Streams for Logging**: Scalable and persistent logging.
- **@upstash/query Integration**: Advanced querying, RediSearch, and secondary indexing for flexible, production-grade queries.
- **Environment Variable Configuration**: Easy setup via environment variables.
- **Modular Design**: Clear separation of concerns for maintainability and testability.
- **Supabase Fallback**: Automatic fallback to Supabase/LibSQL for maximum reliability.

---

## Directory Structure

```bash
┣ 📜agent-state-store.ts
┣ 📜index.ts
┣ 📜memory-processor.ts
┣ 📜memoryStore.ts
┣ 📜README.md
┣ 📜redis-store.ts
┣ 📜stream-processor.ts
┣ 📜supabase-adapter-factory.ts
┣ 📜supabase-adapter.ts
┣ 📜upstash-logger.ts
┣ 📜upstash.json
┣ 📜upstashClients.ts
┣ 📜upstashTypes.ts
┗ 📜vector-store.ts
```

## Setup

To use the Upstash memory and logging implementation, ensure the following environment variables are set:

```env
# Required for all Upstash services
UPSTASH_REDIS_REST_URL=your_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_redis_rest_token
UPSTASH_VECTOR_REST_URL=your_vector_rest_url
UPSTASH_VECTOR_REST_TOKEN=your_vector_rest_token

# Optional: For memory factory integration
MEMORY_PROVIDER=upstash

# Optional: For Upstash Logger configuration
UPSTASH_LOGGER_STREAM_NAME=ai_app_logs # Default stream name
UPSTASH_LOGGER_MAX_LENGTH=1000 # Default max log entries
```

---

## File-by-File Status & Detailed TODO Checklist

### upstashClients.ts

- [x] Type-safe, robust, singleton clients for Redis, Vector, and Query
- [x] Uses Zod schemas for config validation
- [x] upstashLogger for all logging
- [x] Health checks and availability functions
- [ ] **Add advanced Query client usage examples in docs**
- [ ] **Document how to use Query for RediSearch and advanced filtering**

### upstashTypes.ts

- [x] Canonical source for types, Zod schemas, and error classes
- [x] No errors
- [ ] **Expand types for advanced RediSearch/query support if needed**
- [ ] **Add more granular types for RediSearch results and query options**

### upstash-logger.ts

- [ ] Replace all `any` types with precise types (see errors)
- [ ] Remove unused types/vars (e.g., RedisClient)
- [ ] Remove all console statements, use upstashLogger only
- [ ] Ensure all log entry parsing is type-safe
- [ ] Add advanced log querying (e.g., by level, time range)
- [ ] Add tests for log streaming and retrieval

### redis-store.ts

- [ ] Remove all `any` types (see errors)
- [ ] Remove unused @ts-expect-error
- [ ] Use @upstash/query for advanced thread/message search (RediSearch, full-text, filters)
- [ ] Add more type-safe helpers for RediSearch results
- [ ] Remove all direct console statements, use upstashLogger
- [ ] Add tests for thread/message search and RediSearch integration

### vector-store.ts

- [x] No type errors
- [ ] Remove all direct console statements, use upstashLogger
- [ ] Use precise types for metadata, results, and errors
- [ ] Add @upstash/query integration for hybrid search, advanced filtering
- [ ] Add more robust error handling and logging
- [ ] Add tests for hybrid and filtered search

### supabase-adapter.ts

- [x] Uses generateEmbedding from ai-integration for real embeddings
- [x] Uses upstashLogger for all logging
- [x] Uses getUpstashQueryClient for advanced queries (but see error below)
- [ ] **Fix: Property 'sql' does not exist on type 'Query' (update to use correct @upstash/query API)**
- [ ] Remove unused imports (uuidv4, Query)
- [ ] Add create/update/delete item support for full Supabase compatibility
- [ ] Add more advanced query support (RediSearch, full-text, filters)
- [ ] Add more robust error handling and type safety
- [ ] Add tests for all CRUD and query operations

### supabase-adapter-factory.ts

- [ ] Remove all `any` types (see errors)
- [ ] Remove unused types/vars
- [ ] Add @upstash/query support for advanced table/vector operations
- [ ] Add more robust error handling and type safety
- [ ] Add tests for all factory-generated clients

### stream-processor.ts

- [ ] Remove all `any` types (see errors)
- [ ] Remove all direct console statements, use upstashLogger
- [ ] Remove unused imports/vars
- [ ] Add @upstash/query support for streaming queries
- [ ] Add more robust error handling and type safety
- [ ] Add tests for streaming and batch processing

### memoryStore.ts

- [ ] Remove all `any` types (see errors)
- [ ] Remove all direct console statements, use upstashLogger
- [ ] Add @upstash/query support for advanced memory/thread/message search
- [ ] Add more robust error handling and type safety
- [ ] Add tests for memory operations and advanced search

### memory-processor.ts

- [x] No errors
- [ ] Add @upstash/query support for streaming/semantic search if needed
- [ ] Add tests for memory processing

### agent-state-store.ts

- [ ] Remove all `any` types (see errors)
- [ ] Remove all direct console statements, use upstashLogger
- [ ] Add @upstash/query support for agent state search if needed
- [ ] Add more robust error handling and type safety
- [ ] Add tests for agent state operations

### index.ts (barrel)

- [ ] Remove/replace all broken exports (see errors: missing exports from supabase-adapter)
- [ ] Ensure all exports are up-to-date and type-safe
- [ ] Add documentation for new/advanced exports

---

## Feature Coverage Table

| File                        | Type Safety | Logging | @upstash/query | RediSearch | CRUD | Vector | Streaming | Tests | Supabase Fallback |
|-----------------------------|:-----------:|:-------:|:--------------:|:----------:|:----:|:------:|:---------:|:-----:|:-----------------:|
| upstashClients.ts           |     ✅      |   ✅    |      ✅        |     ❌     |  ❌  |   ❌   |     ❌    |   ❌  |        ❌         |
| upstashTypes.ts             |     ✅      |   ❌    |      ❌        |     ❌     |  ❌  |   ❌   |     ❌    |   ❌  |        ❌         |
| upstash-logger.ts           |     ⚠️      |   ✅    |      ❌        |     ❌     |  ❌  |   ❌   |     ❌    |   ❌  |        ❌         |
| redis-store.ts              |     ⚠️      |   ⚠️    |      ⚠️        |     ⚠️     |  ✅  |   ❌   |     ❌    |   ❌  |        ❌         |
| vector-store.ts             |     ✅      |   ⚠️    |      ⚠️        |     ⚠️     |  ❌  |   ✅   |     ❌    |   ❌  |        ❌         |
| supabase-adapter.ts         |     ✅      |   ✅    |      ⚠️        |     ⚠️     |  ⚠️  |   ✅   |     ❌    |   ❌  |        ✅         |
| supabase-adapter-factory.ts |     ⚠️      |   ❌    |      ⚠️        |     ⚠️     |  ⚠️  |   ⚠️   |     ❌    |   ❌  |        ✅         |
| stream-processor.ts         |     ⚠️      |   ⚠️    |      ⚠️        |     ❌     |  ❌  |   ❌   |     ✅    |   ❌  |        ❌         |
| memoryStore.ts              |     ⚠️      |   ⚠️    |      ⚠️        |     ❌     |  ✅  |   ⚠️   |     ⚠️    |   ❌  |        ✅         |
| memory-processor.ts         |     ✅      |   ✅    |      ⚠️        |     ❌     |  ❌  |   ⚠️   |     ✅    |   ❌  |        ✅         |
| agent-state-store.ts        |     ⚠️      |   ⚠️    |      ⚠️        |     ❌     |  ✅  |   ❌   |     ❌    |   ❌  |        ✅         |
| index.ts                    |     ⚠️      |   ❌    |      ❌        |     ❌     |  ❌  |   ❌   |     ❌    |   ❌  |        ❌         |

Legend: ✅ = Complete, ⚠️ = Needs work, ❌ = Not present

---

## Implementation Guide & Best Practices

### Why Upstash as Main Memory (with Supabase Fallback)?

- **Performance**: Upstash Redis and VectorDB provide low-latency, serverless, globally distributed memory and vector search.
- **Scalability**: Upstash scales automatically, with no server management.
- **Advanced Querying**: @upstash/query enables secondary indexes, RediSearch, and flexible, typesafe queries.
- **Reliability**: Supabase/LibSQL fallback ensures data durability and compatibility with existing APIs.
- **Observability**: upstashLogger and Redis Streams provide robust, persistent logging.

### How to Implement and Use Each Module

#### upstashClients.ts

- Use singleton pattern for Redis, Vector, and Query clients.
- Validate all configs with Zod schemas.
- Log all client errors and health checks with upstashLogger.
- Example:

  ```ts
  import { getRedisClient, getVectorClient, getUpstashQueryClient } from './upstashClients';
  const redis = getRedisClient();
  const vector = getVectorClient();
  const query = getUpstashQueryClient();
  ```

#### upstashTypes.ts

- Define all types, interfaces, and Zod schemas for memory, vector, and query data.
- Add types for RediSearch and @upstash/query results as needed.

#### upstash-logger.ts

- Use Redis Streams for log storage.
- Replace all `any` types with precise types or Zod schemas.
- Remove all direct console statements; use upstashLogger for all logging.
- Add advanced log querying (by level, time range, etc).

#### redis-store.ts

- Store threads/messages as Redis Hashes and Sorted Sets.
- Use @upstash/query for advanced search (secondary indexes, RediSearch, full-text, filters):

  ```ts
  import { getUpstashQueryClient } from './upstashClients';
  const query = getUpstashQueryClient();
  const threads = query.createCollection<Thread>('threads');
  const threadsByUser = threads.createIndex({ name: 'threads_by_user', terms: ['userId'] });
  const userThreads = await threadsByUser.match({ userId: '123' });
  ```

- Remove all `any` types and direct console statements.

#### vector-store.ts

- Use Upstash Vector for all vector operations.
- Integrate @upstash/query for hybrid/filtered search and secondary indexes.
- Example:

  ```ts
  import { getUpstashQueryClient } from './upstashClients';
  const query = getUpstashQueryClient();
  const vectors = query.createCollection<VectorDocument>('vectors');
  const vectorsByDoc = vectors.createIndex({ name: 'vectors_by_doc', terms: ['document_id'] });
  const docVectors = await vectorsByDoc.match({ document_id: 'doc1' });
  ```

#### supabase-adapter.ts

- Provide Supabase-compatible API using Upstash as backend.
- Use generateEmbedding for vector operations.
- Use getUpstashQueryClient for advanced queries (see above for examples).
- Remove unused imports and fix all type errors.
- Add full CRUD support for items, threads, and vectors.

#### supabase-adapter-factory.ts

- Factory for creating Supabase/Upstash-compatible clients.
- Add @upstash/query support for advanced table/vector operations.
- Remove all `any` types and unused vars.

#### stream-processor.ts

- Use @upstash/query for streaming and batch queries.
- Remove all direct console statements and `any` types.

#### memoryStore.ts

- High-level memory operations (threads, messages, etc).
- Use @upstash/query for advanced search/filtering.
- Remove all `any` types and direct console statements.

#### memory-processor.ts

- Use @upstash/query for streaming/semantic search if needed.
- Add tests for memory processing.

#### agent-state-store.ts

- Use @upstash/query for advanced agent state search.
- Remove all `any` types and direct console statements.

#### index.ts

- Ensure all exports are up-to-date and type-safe.
- Remove/replace all broken exports.

---

## Advanced @upstash/query Usage Examples

### 1. Creating a Collection and Index

```ts
import { Query } from '@upstash/query';
import { Redis } from '@upstash/redis';

type User = { id: string; name: string; organization: string; email: string };
const q = new Query({ redis: Redis.fromEnv({ automaticDeserialization: false }) });
const users = q.createCollection<User>('users');
const usersByOrg = users.createIndex({ name: 'users_by_organization', terms: ['organization'] });

// Add a user
await users.set('user1', { id: 'user1', name: 'Alice', organization: 'Upstash', email: 'alice@upstash.com' });

// Query by organization
const upstashUsers = await usersByOrg.match({ organization: 'Upstash' });
```

### 2. Advanced Filtering and Range Queries

```ts
const deployments = q.createCollection<Deployment>('deployments');
const deploymentsByOrg = deployments.createIndex({ name: 'deployments_by_org', terms: ['organization'] });
const results = await deploymentsByOrg.match({ organization: 'Upstash' });
// Range query example (numeric or lexicographic)
const rangeResults = await deploymentsByOrg.range({ organization: 'Upstash' }, { time: { gte: 1700000000000 } });
```

### 3. Hybrid Search with Vectors and Metadata

```ts
// Use Upstash Vector for similarity search, then filter with @upstash/query
const vectorResults = await vectorClient.query({ vector, topK: 10, includeMetadata: true });
const query = getUpstashQueryClient();
const vectors = query.createCollection<VectorDocument>('vectors');
const vectorsByDoc = vectors.createIndex({ name: 'vectors_by_doc', terms: ['document_id'] });
const docVectors = await vectorsByDoc.match({ document_id: 'doc1' });
```

---

## Upstash SDK Best Practices & Advanced Features (2025)

### @upstash/redis

- **TypeScript-first, REST-based, connectionless:** Designed for serverless, edge, and multi-platform environments.
- **Initialization:** Use `Redis.fromEnv()` for automatic config from environment variables, or pass `{ url, token }` directly.
- **Type Safety:** All commands are strongly typed. You can disable automatic JSON serialization with `automaticDeserialization: false` for raw data.
- **Best Practices:**
  - **Singleton Pattern:** Keep the Redis client in memory for reuse (especially in serverless/edge).
  - **No direct console:** Use a logger for all output.
  - **Pipelining:** Use built-in pipelining for batch operations.
  - **Supported Types:** Strings, hashes, sets, sorted sets, lists, etc. All with type-safe APIs.
- **Advanced:** Supports keyspace notifications, multi-region, and RESTful access for edge/serverless.
- **Common Use Cases:** Caching, session/token storage, real-time analytics, queues, pub/sub, prototyping.

### @upstash/vector

- **TypeScript-first, REST-based, connectionless:** For serverless, edge, and multi-platform.
- **Initialization:** Use `new Index()` with env vars or pass `{ url, token }` directly.
- **Type Safety:** You can specify a metadata type at the index level for all operations (`Index<MyMetaType>`), or per-command.
- **Best Practices:**
  - **Namespaces:** Use `index.namespace("name")` to partition data for multi-tenant or isolated workloads.
  - **Metadata Filtering:** Use SQL-like filter strings in queries (e.g., `genre = 'fantasy' and year > 2000`).
  - **Hybrid Search:** Combine vector similarity with metadata filters for powerful RAG and semantic search.
  - **No direct console:** Use a logger for all output.
- **Advanced:** Supports dense and sparse vectors, multiple similarity functions (cosine, dot, euclidean), and metadata filtering.
- **Example Types:**

  ```ts
  type Metadata = { title: string; genre: "sci-fi" | "fantasy"; year: number };
  const index = new Index<Metadata>();
  ```

- **Common Use Cases:** RAG, semantic search, hybrid search, multi-tenant vector storage.

### @upstash/query

- **TypeScript-first, typesafe secondary indexing and querying for Redis.**
- **Collections & Indexes:** Use `createCollection<T>()` and `createIndex({ name, terms })` for typesafe, indexed queries.
- **Best Practices:**
  - **Always pass types** to collections and indexes for full type safety.
  - **Use secondary indexes** for fast lookups and filtering.
  - **Range queries:** Use `.range()` for numeric/lexicographic queries.
  - **No direct console:** Use a logger for all output.
- **Advanced:** Blazing fast, supports RediSearch-like queries, hybrid search (combine with vector results), and full CRUD.
- **Example Types:**

  ```ts
  type User = { id: string; org: string };
  const users = q.createCollection<User>("users");
  const byOrg = users.createIndex({ name: "by_org", terms: ["org"] });
  ```

- **Common Use Cases:** Secondary indexes, advanced filtering, hybrid search, typesafe queries.

---

## Using This Guide for Future Development & Best Practices

This README is designed to be a living, authoritative reference for all Upstash-based memory, vector, and logging development in this project. To ensure long-term maintainability, reliability, and production-readiness, follow these principles and workflows:

### 1. **Onboarding & Team Knowledge Transfer**

- New contributors should read this document in full before making changes to any Upstash-related code.
- All onboarding sessions should reference the Implementation Guide, Feature Table, and Best Practices sections.
- Encourage team members to update this README with new patterns, lessons learned, and API changes as Upstash evolves.

### 2. **Development Workflow**

- **Start with Types:** Always define and validate types in `upstashTypes.ts` before implementing new features.
- **Singleton Clients:** Use the provided Upstash client factories to avoid connection churn and maximize performance.
- **Type Safety:** Never use `any`—always use Zod schemas and shared types for all data, queries, and results.
- **Logging:** Replace all direct `console` usage with `upstashLogger` for observability and debugging.
- **Advanced Features:** When adding new search, filtering, or hybrid features, consult the @upstash/query and @upstash/vector best practices and examples in this README.
- **Testing:** Add/expand tests for all new features, especially for advanced queries, hybrid search, and error handling.
- **Documentation:** Update this README with new usage patterns, code snippets, and lessons learned after every major change.

### 3. **Troubleshooting & Debugging**

- Use the Feature Coverage Table to quickly identify which modules are missing type safety, logging, or advanced query support.
- Reference the Implementation Guide for step-by-step instructions on how to add or refactor features.
- For issues with Upstash SDKs, check the Best Practices and Advanced Features section for the latest recommendations.
- If you encounter new Upstash features or breaking changes, document them here and update the codebase accordingly.

### 4. **Staying Up to Date**

- Regularly review Upstash, @upstash/redis, @upstash/vector, and @upstash/query documentation for new features and deprecations.
- Schedule periodic code reviews to ensure all modules adhere to the latest best practices outlined here.
- Use this README as the single source of truth for Upstash integration—avoid duplicating guidance elsewhere.

### 5. **Contributing & Continuous Improvement**

- All pull requests that touch Upstash code must reference relevant sections of this README in their description.
- Encourage contributors to add new examples, troubleshooting tips, and advanced usage patterns as they are discovered.
- Use the checklists and tables to track progress and ensure nothing is missed during refactors or feature additions.

### 6. **Production Readiness Checklist**

- [ ] All types are defined and validated with Zod.
- [ ] No `any` types or direct `console` statements remain.
- [ ] All logging uses `upstashLogger`.
- [ ] All advanced queries use @upstash/query or @upstash/vector with type safety.
- [ ] Tests cover all major features and edge cases.
- [ ] This README is up to date and covers all new features and patterns.

---

## Long-Term Onboarding, Evolution, and AI Agent Guidance (2025+)

This section is designed to future-proof your Upstash memory and logging system, ensuring that both human developers and AI coding agents (like Copilot or custom LLM-based agents) can onboard, extend, and maintain this codebase with maximum reliability, context, and best practices. Drawing from the latest 2025 onboarding and AI agent development techniques, this guidance will help you avoid common pitfalls and keep your system at the cutting edge.

### 1. **AI Agent and Human Onboarding: Structured, Context-Rich, and Iterative**

- **Purpose and Scope:** Every new agent or contributor should start by reading this README in full, understanding the rationale for Upstash-first design, and reviewing the Feature Table and Implementation Guide.
- **Knowledge Graphs & Semantic Search:** Use knowledge graphs (or structured docs) to relate types, modules, and workflows. Semantic search (for both humans and AI) should be enabled across this README and codebase to quickly answer "how do I...?" questions.
- **Explicit API and Type Contracts:** All APIs, types, and Zod schemas must be documented and discoverable. This enables both AI and human agents to reason about the system without guesswork.
- **Continuous Learning:** AI agents should be designed to learn from every code review, PR, and user interaction—updating their internal models and this README as new best practices emerge.

### 2. **Development Environment and Tooling**

- **Integrated DevOps:** Use CI/CD pipelines to enforce type safety, linting, and test coverage. Automated checks should block PRs that violate the standards in this README.
- **Automated Documentation Generation:** Use NLP models or AI agents to auto-generate and update docstrings, usage examples, and module-level documentation from code and type signatures.
- **Feedback Loops:** Set up mechanisms for both human and AI contributors to provide feedback on onboarding, documentation, and system behavior. Use this feedback to iteratively improve the onboarding process and documentation.

### 3. **AI Agent Optimization and Continuous Improvement**

- **Transfer Learning and RLHF:** AI agents should leverage transfer learning (using pre-trained models) and reinforcement learning with human feedback (RLHF) to improve code suggestions, error detection, and documentation generation over time.
- **Monitoring and Telemetry:** Continuously monitor agent and system performance (e.g., via Azure Monitor, Upstash logs, or custom dashboards). Use this data to identify bottlenecks, regressions, or opportunities for optimization.
- **Iterative Updates:** Regularly retrain and update AI models, expand agent capabilities, and update this README as new features, patterns, or technologies are adopted.

### 4. **Advanced Testing, Debugging, and Validation**

- **Automated Testing:** All new features must be covered by unit, integration, and load tests. AI agents should be able to auto-generate and optimize test cases based on code changes and usage patterns.
- **User Acceptance Testing (UAT):** Gather feedback from real developers and AI agents to validate that new features and workflows add value and do not introduce regressions.
- **Load and Edge-Case Testing:** Ensure the system can handle high concurrency, large data volumes, and unusual edge cases—especially for memory, vector, and logging operations.

### 5. **Human-AI Collaboration and Future-Proofing**

- **Human-in-the-Loop:** Encourage a collaborative workflow where AI agents augment, not replace, human developers. Use AI for code review, test generation, and documentation, but always validate with human oversight.
- **Customizability and Extensibility:** Design the system so that both AI and human contributors can easily add new memory backends, logging strategies, or advanced query features without breaking existing contracts.
- **Security and Compliance:** Regularly review secrets management, access controls, and compliance requirements. AI agents should be aware of and enforce these constraints.

### 6. **Integration with Modern Dev Workflows**

- **Cloud and Edge Readiness:** Ensure all modules are compatible with serverless, edge, and multi-cloud environments. Use RESTful, stateless patterns and avoid assumptions about runtime or infrastructure.
- **API and Tooling Integration:** Integrate with modern tools (e.g., VS Code, GitHub, Azure, CI/CD) so that both AI and human agents can access, test, and deploy the system efficiently.
- **Automated Change Tracking:** Use bots or scripts to detect when the README or codebase falls out of sync, prompting updates or reviews as needed.

### 7. **Continuous Documentation and Knowledge Sharing**

- **Living Documentation:** Treat this README as a living document. Every major change, new feature, or lesson learned should be reflected here.
- **Onboarding Playbooks:** Maintain onboarding playbooks for both human and AI agents, including step-by-step guides, troubleshooting tips, and escalation paths for complex issues.
- **Community and Feedback:** Foster a culture of open feedback, regular retrospectives, and knowledge sharing—ensuring that both AI and human contributors feel empowered to improve the system.

---

**Final Note:**

By following this extended guidance, you ensure that your Upstash memory, vector, and logging system is not only robust and production-ready today, but also adaptable, scalable, and AI-friendly for the future. Whether you are a new developer, a seasoned maintainer, or an advanced AI coding agent, this README and its workflows will help you onboard quickly, avoid common mistakes, and contribute to a system that is always improving. Treat this document as your north star for quality, reliability, and innovation—update it often, and let it guide every step of your development journey.

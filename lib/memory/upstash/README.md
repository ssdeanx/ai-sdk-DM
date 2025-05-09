# Upstash Memory & Logging Implementation

This directory contains a comprehensive implementation for leveraging Upstash Redis and Upstash VectorDB as a robust memory store and remote logger for AI applications.

## Overview

The Upstash implementation provides a modular and feature-rich solution, including:

1. **Upstash Client Management (`upstashClients.ts`)**: Centralized initialization and management of Redis and VectorDB clients, including health checks.
2. **Redis-based Memory Storage (`redis-store.ts`)**: Typed, efficient storage and retrieval of conversation threads and messages using Redis Hashes and Sorted Sets.
3. **Vector Database Operations (`vector-store.ts`)**: Comprehensive vector operations (upsert, search, fetch, delete, reset, info) for managing embeddings with metadata using Upstash VectorDB.
4. **Remote Logging (`upstash-logger.ts`)**: A persistent, capped logging system using Redis Streams for capturing application logs (info, warnings, errors, debug) with retrieval capabilities.
5. **Barrel Export (`index.ts`)**: Easy-to-use exports for all functionalities.

## Features

* **Typed API**: Strongly-typed interfaces for all data models and function signatures.
* **Error Handling**: Custom error classes for each module (`UpstashClientError`, `RedisStoreError`, `VectorStoreError`, `LoggerError`).
* **Efficient Data Structures**: Optimized use of Redis data structures for performance.
* **Vector Similarity Search**: Powerful semantic search capabilities.
* **Metadata Support**: Rich metadata storage for threads, messages, and vectors.
* **Redis Streams for Logging**: Scalable and persistent logging.
* **Environment Variable Configuration**: Easy setup via environment variables.
* **Modular Design**: Clear separation of concerns for better maintainability and testability.

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

## API Documentation & Usage Examples

All functions are exported from `lib/memory/upstash/index.ts`.

### 1. Client Management (`upstashClients.ts`)

Handles the creation and availability checks for Redis and Vector clients.

```typescript
import {
  getRedisClient,
  getVectorClient,
  checkUpstashAvailability
} from './index'; // Assuming you are importing from the barrel file

async function initializeAndCheck() {
  try {
    const redis = getRedisClient();
    const vector = getVectorClient();
    console.log('Redis and Vector clients initialized.');

    const availability = await checkUpstashAvailability();
    console.log('Upstash Availability:', availability);
    // Output: { redisAvailable: true, vectorAvailable: true }
  } catch (error) {
    console.error('Failed to initialize or check Upstash services:', error);
  }
}

initializeAndCheck();
```

### 2. Redis Store (`redis-store.ts`)

Manages threads and messages.

**Interfaces:**

* `Thread`: `{ id: string; name?: string; createdAt: number; updatedAt: number; metadata?: ThreadMetadata; }`
* `Message`: `{ id: string; threadId: string; role: 'user' | 'assistant' | 'system' | 'tool'; content: string; createdAt: number; metadata?: MessageMetadata; }`
* `ThreadMetadata`: `Record<string, any>`
* `MessageMetadata`: `Record<string, any>`

**Functions:**

* `createRedisThread(name?: string, metadata?: ThreadMetadata): Promise<Thread>`
* `getRedisThreadById(threadId: string): Promise<Thread | null>`
* `updateRedisThread(threadId: string, updates: Partial<Omit<Thread, 'id' | 'createdAt'>>): Promise<Thread | null>`
* `listRedisThreads(limit?: number, offset?: number): Promise<Thread[]>`
* `deleteRedisThread(threadId: string): Promise<boolean>`
* `createRedisMessage(threadId: string, messageData: Omit<Message, 'id' | 'threadId' | 'createdAt'>): Promise<Message>`
* `getRedisMessageById(messageId: string): Promise<Message | null>`
* `getRedisMessagesByThreadId(threadId: string, limit?: number, offset?: number): Promise<Message[]>`
* `deleteRedisMessage(messageId: string): Promise<boolean>`

**Example:**

```typescript
import {
  createRedisThread,
  createRedisMessage,
  getRedisMessagesByThreadId,
  listRedisThreads
} from './index';

async function manageConversation() {
  try {
    const newThread = await createRedisThread('Customer Support Chat', { customerId: 'cust_123' });
    console.log('Created Thread:', newThread);

    await createRedisMessage(newThread.id, {
      role: 'user',
      content: 'Hello, I need help with my order.'
    });
    await createRedisMessage(newThread.id, {
      role: 'assistant',
      content: 'Hi there! How can I assist you today?'
    });

    const messages = await getRedisMessagesByThreadId(newThread.id);
    console.log('Conversation Messages:', messages);

    const threads = await listRedisThreads(10);
    console.log('Recent Threads:', threads);
  } catch (error) {
    console.error('Redis Store Error:', error);
  }
}

manageConversation();
```

### 3. Vector Store (`vector-store.ts`)

Manages vector embeddings.

**Interfaces:**

* `VectorDocument`: `{ id: string; vector: number[]; metadata?: VectorMetadata; }`
* `VectorMetadata`: `Record<string, any>`
* `VectorSearchOptions`: `{ topK?: number; includeVectors?: boolean; includeMetadata?: boolean; filter?: string; }`
* `VectorSearchResult`: `{ id: string; score: number; vector?: number[]; metadata?: VectorMetadata; }`

**Functions:**

* `upsertVectors(documents: VectorDocument[]): Promise<{ ids: string[]; error?: string }>`
* `searchVectors(queryVector: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]>`
* `fetchVectorsById(ids: string[]): Promise<VectorDocument[]>`
* `deleteVectorsById(ids: string[]): Promise<{ success: boolean; error?: string }>`
* `resetVectorIndex(): Promise<{ success: boolean; error?: string }>`
* `getVectorIndexInfo(): Promise<any>`

**Example:**

```typescript
import {
  upsertVectors,
  searchVectors,
  getVectorIndexInfo
} from './index';

async function manageEmbeddings() {
  try {
    const documentsToUpsert: VectorDocument[] = [
      { id: 'doc1', vector: [0.1, 0.2, 0.3], metadata: { source: 'faq' } },
      { id: 'doc2', vector: [0.4, 0.5, 0.6], metadata: { source: 'manual' } }
    ];
    const upsertResult = await upsertVectors(documentsToUpsert);
    console.log('Upserted IDs:', upsertResult.ids);

    const queryVector = [0.15, 0.25, 0.35];
    const searchResults = await searchVectors(queryVector, { topK: 1, includeMetadata: true });
    console.log('Search Results:', searchResults);

    const indexInfo = await getVectorIndexInfo();
    console.log('Vector Index Info:', indexInfo);
  } catch (error) {
    console.error('Vector Store Error:', error);
  }
}

manageEmbeddings();
```

### 4. Upstash Logger (`upstash-logger.ts`)

Provides remote logging capabilities.

**Interfaces:**

* `LogEntry`: `{ level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'; message: string; timestamp: string; context?: Record<string, any>; }`
* `LogQueryOptions`: `{ count?: number; start?: string; end?: string; }` (start/end are Redis Stream IDs or timestamps)

**Functions:**

* `logToUpstash(level: LogEntry['level'], message: string, context?: Record<string, any>): Promise<string | null>` (returns log ID or null on error)
* `getUpstashLogs(options?: LogQueryOptions): Promise<LogEntry[]>`

**Example:**

```typescript
import { logToUpstash, getUpstashLogs } from './index';

async function demonstrateLogging() {
  try {
    await logToUpstash('INFO', 'Application started', { version: '1.0.0' });
    await logToUpstash('WARN', 'Low disk space warning', { freeSpace: '10GB' });
    await logToUpstash('ERROR', 'Failed to process payment', { orderId: 'order_789' });

    const recentLogs = await getUpstashLogs({ count: 10 });
    console.log('Recent Logs:', recentLogs);
  } catch (error) {
    console.error('Logger Error:', error);
  }
}

demonstrateLogging();
```

## Integration with Memory Factory

If you intend to use this Upstash implementation via the generic memory factory (`lib/memory/factory.ts`), ensure `MEMORY_PROVIDER` is set to `upstash` in your environment variables.

The factory will primarily use the `redis-store.ts` and `vector-store.ts` functionalities, adapted to its generic interface.

```typescript
// Example: lib/memory/factory.ts (Conceptual)
// import { memory } from '../memory/factory';

// // Create a thread
// const threadId = await memory.createMemoryThread('My Upstash Thread', { metadata: { userId: 'user_abc' } });

// // Save a message
// await memory.saveMessage(threadId, 'user', 'Hello from factory!', { metadata: { timestamp: Date.now() } });

// // Load messages
// const messages = await memory.loadMessages(threadId);
// console.log(messages);

// // Add documents to memory (uses vector store)
// await memory.addDocuments([
//   { pageContent: 'This is a test document for Upstash.', metadata: { source: 'readme' } }
// ]);

// // Search memory (uses vector store)
// const searchResults = await memory.search('test document', 1);
// console.log(searchResults);
```

This updated README provides a comprehensive guide to the new modular Upstash implementation.

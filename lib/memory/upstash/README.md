# Upstash Memory Implementation

This directory contains the implementation of memory storage using Upstash Redis and Upstash Vector.

## Overview

The Upstash memory implementation provides:

1. **Redis-based Memory Storage**: For storing conversation threads and messages
2. **Vector Database**: For storing and searching embeddings

## Setup

To use the Upstash memory implementation, you need to set the following environment variables:

```
MEMORY_PROVIDER=upstash
UPSTASH_REDIS_REST_URL=your_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_redis_rest_token
UPSTASH_VECTOR_REST_URL=your_vector_rest_url
UPSTASH_VECTOR_REST_TOKEN=your_vector_rest_token
```

## Data Structure

The Upstash implementation uses the following data structures:

### Redis

- `thread:{id}` - Hash containing thread metadata
- `threads` - Sorted set of thread IDs, sorted by last updated timestamp
- `thread:{id}:messages` - Set of message IDs for a thread
- `message:{id}` - Hash containing message data

### Vector DB

- Vector index for storing embeddings with metadata

## API

The Upstash memory implementation provides the following functions:

### Thread Operations

- `createThread(name, metadata)`: Create a new thread
- `getThread(threadId)`: Get thread metadata
- `listThreads(limit, offset)`: List threads with pagination
- `deleteThread(threadId)`: Delete a thread and all its messages

### Message Operations

- `saveMessage(threadId, message)`: Save a message to a thread
- `getMessages(threadId)`: Get all messages for a thread

### Vector Operations

- `storeEmbedding(text, vector, metadata)`: Store an embedding in the vector database
- `searchEmbeddings(vector, limit)`: Search for similar embeddings

## Usage

```typescript
import { 
  createThread, 
  saveMessage, 
  getMessages, 
  storeEmbedding, 
  searchEmbeddings 
} from './memoryStore';

// Create a thread
const threadId = await createThread('My Thread', { userId: '123' });

// Save a message
await saveMessage(threadId, {
  role: 'user',
  content: 'Hello, world!',
  metadata: { timestamp: Date.now() }
});

// Get messages
const messages = await getMessages(threadId);

// Store an embedding
const embeddingId = await storeEmbedding(
  'Hello, world!', 
  [0.1, 0.2, 0.3], 
  { threadId }
);

// Search embeddings
const results = await searchEmbeddings([0.1, 0.2, 0.3], 5);
```

## Integration with Memory Factory

The Upstash memory implementation is integrated with the memory factory in `lib/memory/factory.ts`. To use it, set the `MEMORY_PROVIDER` environment variable to `upstash`.

```typescript
import { memory } from '../memory/factory';

// Create a thread
const threadId = await memory.createMemoryThread('My Thread', { metadata: { userId: '123' } });

// Save a message
await memory.saveMessage(threadId, 'user', 'Hello, world!', { metadata: { timestamp: Date.now() } });

// Get messages
const messages = await memory.loadMessages(threadId);
```

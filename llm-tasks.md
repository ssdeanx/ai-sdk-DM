# Upstash Integration Tasks

## Tree of Thoughts (ToT) Approach

When implementing these changes, use the Tree of Thoughts methodology:

1. **Exploration Phase**:
   - Analyze the current implementation of each route
   - Identify all database interactions that need to be updated
   - Map out the required changes for both Upstash and LibSQL paths

2. **Planning Phase**:
   - Design the Zod validation schemas based on existing code
   - Plan the error handling strategy for different failure scenarios
   - Determine the appropriate Upstash adapter functions to use

3. **Implementation Phase**:
   - Start with the simplest routes first
   - Implement changes incrementally, testing each step
   - Use consistent patterns across all routes

4. **Verification Phase**:
   - Test each route thoroughly with both backends
   - Verify error handling works as expected
   - Ensure backward compatibility is maintained

5. **Refinement Phase**:
   - Optimize code for performance and readability
   - Add comprehensive comments for future maintenance
   - Update documentation to reflect changes

## Overview

This document outlines the remaining tasks for migrating data-handling API routes in the ai-sdk-DM framework to utilize Upstash as their primary backend for data persistence and operations.

## Progress Tracker

| Category | Completed | Total | Percentage |
|----------|-----------|-------|------------|
| AI SDK Routes | 4 | 4 | 100% |
| Agent Routes | 0 | 5 | 0% |
| Tool Routes | 0 | 3 | 0% |
| Workflow Routes | 0 | 2 | 0% |
| Memory Routes | 0 | 2 | 0% |
| **Overall** | **4** | **16** | **25%** |

## Completion Checklist

- [x] AI SDK Routes
  - [x] app/api/chat/ai-sdk/route.ts
  - [x] app/api/chat/ai-sdk/threads/route.ts
  - [x] app/api/chat/ai-sdk/threads/[id]/route.ts
  - [x] app/api/chat/ai-sdk/threads/[id]/messages/route.ts
- [ ] Agent Routes
  - [ ] app/api/ai-sdk/agents/route.ts
  - [ ] app/api/ai-sdk/agents/[id]/route.ts
  - [ ] app/api/ai-sdk/agents/[id]/run/route.ts
  - [ ] app/api/agentic/agents/route.ts
  - [ ] app/api/agents/route.ts
- [ ] Tool Routes
  - [ ] app/api/ai-sdk/tools/route.ts
  - [ ] app/api/ai-sdk/tools/execute/route.ts
  - [ ] app/api/tools/route.ts
- [ ] Workflow Routes
  - [ ] app/api/workflows/route.ts
  - [ ] app/api/workflows/[id]/route.ts
- [ ] Memory Routes
  - [ ] app/api/memory/route.ts
  - [ ] app/api/memory/vector/route.ts

## Completed Work

- AI SDK Routes (app/api/chat/ai-sdk/route.ts, threads routes, and messages routes)

## Failed Attempts

- Agent Routes:
  - app/api/ai-sdk/agents/route.ts - Attempted but contains TypeScript errors and incomplete implementation
  - app/api/ai-sdk/agents/[id]/route.ts - Attempted but contains multiple TypeScript errors, Supabase client type issues, and incomplete implementation

## Critical Issues to Address

- TypeScript errors must be fixed before considering any route complete
- TODOs must be added to mark unfinished work
- Proper error handling needs to be implemented
- Comprehensive testing must be done for each route
- Supabase client type issues need to be resolved
- Console statements should be replaced with proper logging

## Next Steps and Corrective Actions

1. **Fix TypeScript Errors in Attempted Routes**
   - Fix all TypeScript errors in app/api/ai-sdk/agents/route.ts
   - Fix all TypeScript errors in app/api/ai-sdk/agents/[id]/route.ts
   - Add proper type definitions for Supabase client operations
   - Replace any `any` type assertions with proper types

2. **Add TODOs for Unfinished Work**
   - Mark all unfinished sections with TODO comments
   - Create a tracking system for TODOs
   - Ensure TODOs are specific and actionable

3. **Implement Proper Error Handling**
   - Replace console statements with proper logging
   - Add comprehensive error handling for all edge cases
   - Implement retry mechanisms for transient errors

4. **Create Comprehensive Tests**
   - Write unit tests for each route
   - Create integration tests for end-to-end flows
   - Test both Upstash and LibSQL backends

## Routes to Implement

### Agent Routes

1. **app/api/ai-sdk/agents/route.ts**
   - Start fresh with proper TypeScript types
   - Implement Upstash integration with memory factory
   - Add Zod validation for request parameters and body
   - Add comprehensive error handling
   - Maintain LibSQL fallback for backward compatibility
   - Add proper tests

2. **app/api/ai-sdk/agents/[id]/route.ts**
   - Start fresh with proper TypeScript types
   - Implement Upstash integration with memory factory
   - Add Zod validation for request parameters and body
   - Add comprehensive error handling
   - Maintain LibSQL fallback for backward compatibility
   - Add proper tests

3. **app/api/ai-sdk/agents/[id]/run/route.ts**
   - Start fresh with proper TypeScript types
   - Implement Upstash integration with memory factory
   - Add Zod validation for request parameters and body
   - Add comprehensive error handling
   - Maintain LibSQL fallback for backward compatibility
   - Add proper tests

4. **app/api/agentic/agents/route.ts**
   - Start fresh with proper TypeScript types
   - Implement Upstash integration with memory factory
   - Add Zod validation for request parameters and body
   - Add comprehensive error handling
   - Maintain LibSQL fallback for backward compatibility
   - Add proper tests

### Tool Routes

1. **app/api/ai-sdk/tools/route.ts**
   - Update to use memory factory for Upstash integration
   - Add Zod validation for request parameters and body
   - Improve error handling with specific Upstash error cases
   - Maintain LibSQL fallback for backward compatibility

2. **app/api/ai-sdk/tools/execute/route.ts**
   - Update to use memory factory for Upstash integration
   - Add Zod validation for request parameters and body
   - Improve error handling with specific Upstash error cases
   - Maintain LibSQL fallback for backward compatibility

## Implementation Pattern

For each route:

1. **Import Required Modules**

   ```typescript
   import { NextResponse } from "next/server";
   import { handleApiError } from "@/lib/api-error-handler";
   import { z } from "zod";
   import { getMemoryProvider } from "@/lib/memory/factory";
   import { getData, getItemById, createItem, updateItem, deleteItem } from "@/lib/memory/upstash/supabase-adapter";
   import { getLibSQLClient } from "@/lib/memory/db";
   ```

2. **Define Zod Schemas**

   ```typescript
   // Define schemas for validation
   const ParamsSchema = z.object({
     id: z.string().uuid({ message: "Invalid ID format" })
   });

   const RequestBodySchema = z.object({
     // Define request body schema
   });
   ```

3. **Update GET Method**

   ```typescript
   export async function GET(request: Request, { params }: { params: { id: string } }) {
     try {
       // Validate params
       const paramsResult = ParamsSchema.safeParse(params);
       if (!paramsResult.success) {
         return NextResponse.json(
           { error: "Invalid parameters", details: paramsResult.error.format() },
           { status: 400 }
         );
       }

       const { id } = paramsResult.data;

       // Determine which provider to use
       const provider = getMemoryProvider();

       if (provider === 'upstash') {
         try {
           // Implement Upstash logic
           const item = await getItemById('table_name', id);

           if (!item) {
             return NextResponse.json({ error: "Item not found" }, { status: 404 });
           }

           return NextResponse.json(item);
         } catch (_error) {
           // Fall back to LibSQL if Upstash fails
         }
       }

       // Fall back to LibSQL
       const db = getLibSQLClient();

       // Implement LibSQL logic

       // Return response
     } catch (error: unknown) {
       // Handle Upstash-specific errors
       if (error && typeof error === 'object' && 'name' in error) {
         const errorObj = error as { name: string; message?: string };
         if (errorObj.name === 'UpstashAdapterError' || errorObj.name === 'RedisStoreError' || errorObj.name === 'UpstashClientError') {
           return NextResponse.json(
             { error: `Upstash error: ${errorObj.message || 'Unknown error'}` },
             { status: 500 }
           );
         }
       }

       // Use the generic API error handler for other errors
       return handleApiError(error);
     }
   }
   ```

4. **Update POST/PATCH/DELETE Methods**
   - Follow similar pattern as GET method
   - Add appropriate Zod validation
   - Implement Upstash logic with fallback to LibSQL
   - Add proper error handling

5. **Update llm.json**
   - Move completed routes to "recentlyCompleted" section
   - Update "inProgress" section with current work
   - Update "nextSteps" as needed

## Testing Strategy

For each updated route:

1. Test with Upstash enabled (MEMORY_PROVIDER=upstash)
2. Test with LibSQL fallback (MEMORY_PROVIDER=libsql)
3. Test error handling by simulating failures
4. Test with invalid inputs to verify validation

## Additional Tasks

### Workflow Routes

1. **app/api/workflows/route.ts**
   - Update to use memory factory for Upstash integration
   - Add Zod validation for request parameters and body
   - Improve error handling with specific Upstash error cases
   - Maintain LibSQL fallback for backward compatibility

2. **app/api/workflows/[id]/route.ts**
   - Update to use memory factory for Upstash integration
   - Add Zod validation for request parameters and body
   - Improve error handling with specific Upstash error cases
   - Maintain LibSQL fallback for backward compatibility

### Memory Routes

1. **app/api/memory/route.ts**
   - Update to use memory factory for Upstash integration
   - Add Zod validation for request parameters and body
   - Improve error handling with specific Upstash error cases
   - Maintain LibSQL fallback for backward compatibility

2. **app/api/memory/vector/route.ts**
   - Update to use memory factory for Upstash integration
   - Add Zod validation for request parameters and body
   - Improve error handling with specific Upstash error cases
   - Maintain LibSQL fallback for backward compatibility
   - Implement vector search capabilities with Upstash

### Performance Optimization

1. **Implement Caching**
   - Add Redis caching layer for frequently accessed data
   - Implement cache invalidation strategies
   - Add cache headers to API responses

2. **Connection Pooling**
   - Implement connection pooling for Upstash clients
   - Configure optimal pool size based on expected load
   - Add connection timeout and retry logic

### Monitoring and Logging

1. **Add Telemetry**
   - Implement request timing metrics
   - Track success/failure rates for each route
   - Monitor memory usage and connection pool status

2. **Enhanced Error Logging**
   - Create structured error logs
   - Implement error categorization
   - Add context information to error logs

## Final Steps

After completing all routes:

1. Update llm.json with final status
2. Create comprehensive test suite
   - Unit tests for each route
   - Integration tests for end-to-end flows
   - Load tests to verify performance
3. Create documentation for Upstash integration
   - API documentation
   - Configuration guide
   - Troubleshooting guide
4. Create migration scripts
   - Data migration from LibSQL to Upstash
   - Rollback procedures
5. Implement feature flags
   - Allow gradual rollout of Upstash integration
   - Support A/B testing between LibSQL and Upstash

## Upstash Redis and Vector Optimization

Based on research into best practices for Upstash Redis and Vector implementations, here are specific improvements we can make to our current implementation:

### 1. Performance Optimization

#### Connection Management

- **Connection Pooling**: Implement connection pooling to reduce the overhead of creating new connections

  ```typescript
  // Create a singleton Redis client that can be reused across requests
  export const getRedisClient = (() => {
    let client: Redis | null = null;
    return () => {
      if (!client) {
        client = new Redis({
          url: process.env.UPSTASH_REDIS_URL,
          token: process.env.UPSTASH_REDIS_TOKEN,
          automaticDeserialization: true,
        });
      }
      return client;
    };
  })();
  ```

#### Caching Strategies

- **Multi-level Caching**: Implement a tiered caching strategy with different TTLs

  ```typescript
  // Short-lived cache for frequently changing data (1 minute)
  await redis.set(`user:${userId}:status`, status, { ex: 60 });

  // Medium-lived cache for semi-static data (1 hour)
  await redis.set(`thread:${threadId}:messages`, JSON.stringify(messages), { ex: 3600 });

  // Long-lived cache for static data (1 day)
  await redis.set(`model:${modelId}:config`, JSON.stringify(config), { ex: 86400 });
  ```

#### Read/Write Optimizations

- **Pipelining**: Use pipelining for multiple operations to reduce network round trips

  ```typescript
  const pipeline = redis.pipeline();
  pipeline.set('key1', 'value1');
  pipeline.set('key2', 'value2');
  pipeline.get('key3');
  const results = await pipeline.exec();
  ```

- **Batch Operations**: Use multi-key operations instead of multiple single-key operations

  ```typescript
  // Instead of multiple GET operations
  const values = await redis.mget(['key1', 'key2', 'key3']);

  // Instead of multiple SET operations
  await redis.mset({
    'key1': 'value1',
    'key2': 'value2',
    'key3': 'value3'
  });
  ```

### 2. Error Handling and Resilience

#### Retry Mechanisms

- **Exponential Backoff**: Implement exponential backoff for retrying failed operations

  ```typescript
  async function retryOperation(operation, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        retries++;
        if (retries >= maxRetries) throw error;

        // Exponential backoff with jitter
        const delay = Math.min(100 * Math.pow(2, retries) + Math.random() * 100, 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  ```

#### Circuit Breakers

- **Implement Circuit Breaker Pattern**: Prevent cascading failures by failing fast

  ```typescript
  class CircuitBreaker {
    private failures = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    private lastFailureTime = 0;
    private readonly threshold = 5;
    private readonly resetTimeout = 30000; // 30 seconds

    async execute(operation) {
      if (this.state === 'OPEN') {
        if (Date.now() - this.lastFailureTime > this.resetTimeout) {
          this.state = 'HALF_OPEN';
        } else {
          throw new Error('Circuit breaker is open');
        }
      }

      try {
        const result = await operation();
        if (this.state === 'HALF_OPEN') {
          this.state = 'CLOSED';
          this.failures = 0;
        }
        return result;
      } catch (error) {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.threshold || this.state === 'HALF_OPEN') {
          this.state = 'OPEN';
        }
        throw error;
      }
    }
  }
  ```

#### Error Categorization

- **Categorize Errors**: Differentiate between transient and permanent errors

  ```typescript
  function handleUpstashError(error) {
    if (error.name === 'ConnectionError' || error.name === 'TimeoutError') {
      // Transient error - can retry
      return retryOperation(() => originalOperation());
    } else if (error.name === 'AuthenticationError') {
      // Permanent error - credentials issue
      console.error('Authentication failed with Upstash');
      throw error;
    } else {
      // Unknown error
      console.error('Unknown Upstash error:', error);
      throw error;
    }
  }
  ```

### 3. Memory Usage and Cost Efficiency

#### Key Optimization

- **Compact Key Names**: Use shorter key names to reduce memory usage

  ```typescript
  // Instead of
  const key = `user:${userId}:preferences:theme:color`;

  // Use
  const key = `u:${userId}:p:t:c`;
  ```

#### Data Compression

- **Compress Large Values**: Compress large values before storing

  ```typescript
  import { gzip, ungzip } from 'node-gzip';

  // Compress before storing
  const compressed = await gzip(JSON.stringify(largeObject));
  await redis.set('large-data', compressed);

  // Decompress after retrieving
  const compressed = await redis.get('large-data');
  const decompressed = JSON.parse(await ungzip(compressed));
  ```

#### TTL Management

- **Appropriate TTLs**: Set appropriate TTLs for different types of data

  ```typescript
  // Session data (4 hours)
  await redis.set(`session:${sessionId}`, sessionData, { ex: 14400 });

  // Cache data (10 minutes)
  await redis.set(`cache:${cacheKey}`, cacheData, { ex: 600 });
  ```

### 4. Advanced Features

#### Pub/Sub Implementation

- **Real-time Notifications**: Use Pub/Sub for real-time updates

  ```typescript
  // Publisher
  await redis.publish('user-updates', JSON.stringify({ userId, action: 'profile-updated' }));

  // Subscriber
  const subscriber = redis.duplicate();
  await subscriber.subscribe('user-updates');
  subscriber.on('message', (channel, message) => {
    const data = JSON.parse(message);
    console.log(`Received ${data.action} for user ${data.userId}`);
  });
  ```

#### Redis Streams

- **Event Sourcing**: Use Redis Streams for event sourcing

  ```typescript
  // Add event to stream
  await redis.xadd('user-events', '*', {
    userId: '123',
    action: 'login',
    timestamp: Date.now()
  });

  // Read from stream
  const events = await redis.xread('BLOCK', 5000, 'STREAMS', 'user-events', '0');
  ```

#### Vector Similarity Search

- **Optimized Vector Search**: Configure vector search for optimal performance

  ```typescript
  // Create vector index with appropriate parameters
  const index = new VectorIndex({
    url: process.env.UPSTASH_VECTOR_URL,
    token: process.env.UPSTASH_VECTOR_TOKEN,
    dimensions: 1536,
    metric: 'cosine'
  });

  // Batch upsert for efficiency
  await index.upsert([
    { id: '1', vector: embedding1, metadata: { text: 'sample text 1' } },
    { id: '2', vector: embedding2, metadata: { text: 'sample text 2' } }
  ]);

  // Efficient search with filters
  const results = await index.query({
    vector: queryEmbedding,
    topK: 5,
    filter: { type: 'equals', field: 'category', value: 'article' }
  });
  ```

### 5. Monitoring and Observability

#### Performance Metrics

- **Track Key Metrics**: Monitor Redis performance metrics

  ```typescript
  async function getRedisMetrics() {
    const info = await redis.info();
    const metrics = {
      connectedClients: parseInt(info.clients.connected_clients),
      usedMemory: parseInt(info.memory.used_memory),
      hitRate: parseInt(info.stats.keyspace_hits) /
               (parseInt(info.stats.keyspace_hits) + parseInt(info.stats.keyspace_misses)),
      commandsProcessed: parseInt(info.stats.total_commands_processed)
    };
    return metrics;
  }
  ```

#### Request Tracing

- **Trace Redis Operations**: Add tracing to Redis operations

  ```typescript
  async function tracedRedisOperation(operation, name) {
    const startTime = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      // Log or send to monitoring system
      console.log(`Redis operation ${name} completed in ${duration}ms`);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`Redis operation ${name} failed after ${duration}ms:`, error);
      throw error;
    }
  }
  ```

#### Health Checks

- **Implement Health Checks**: Add Redis health checks to your application

  ```typescript
  async function checkRedisHealth() {
    try {
      const pong = await redis.ping();
      return { status: 'healthy', ping: pong === 'PONG' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
  ```



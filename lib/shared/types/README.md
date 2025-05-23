# Shared Types Library

This directory contains TypeScript type definitions that are shared across both frontend and backend parts of the application. These types provide a consistent interface for working with various data structures, APIs, and services throughout the codebase.

## Purpose

The shared types library serves several important purposes:

1. **Type Safety**: Provides strong typing for data structures used throughout the application
2. **Consistency**: Ensures consistent data structures between frontend and backend
3. **DRY Principle**: Prevents duplication of type definitions
4. **Documentation**: Acts as self-documenting code for data structures
5. **IDE Support**: Enables better autocomplete and type checking in development

## Type Files Overview

### `supabase.ts`

Contains types for Supabase database entities and their relationships.

```typescript
// Example usage
import { User, App, Integration } from '@/lib/shared/types/supabase';
```

Key types include:

- `User` - User account information
- `App` - Application data structures
- `AppCodeBlock` - Code blocks within applications
- `Integration` - Third-party service integrations
- `File` - File system entities
- `Workflow` - Workflow definitions
- `Agent` - AI agent configurations
- `Tool` - Tool definitions for agents
- `Model` - AI model configurations
- `Provider` - AI provider information

### `libsql.ts`

Contains types for LibSQL database entities, primarily used for memory and state management.

```typescript
// Example usage
import { MemoryThread, Message, Embedding } from '@/lib/shared/types/libsql';
```

Key types include:

- `MemoryThread` - Conversation thread structures
- `Message` - Individual messages within threads
- `Embedding` - Vector embeddings for semantic search
- `AgentState` - State management for AI agents
- `Workflow` - Workflow execution data
- `WorkflowStep` - Individual steps within workflows
- `GqlCache` - GraphQL query cache structures

### `upstashTypes.ts`

Contains types for Upstash Redis and Vector Store operations, used for caching, vector search, and real-time data.

```typescript
// Example usage
import { 
  VectorDocument, 
  VectorMetadata,
  RedisClientConfig
} from '@/lib/shared/types/upstashTypes';
```

Key types include:

- `VectorDocument` - Vector document structures for semantic search
- `VectorMetadata` - Metadata for vector documents
- `RedisClientConfig` - Configuration for Redis clients
- `VectorStoreConfig` - Configuration for vector stores
- `Thread` - Conversation thread structures
- `Message` - Message structures for conversations
- `RediSearchResult` - Results from Redis search operations
- Various error classes for error handling

### `nlpjs__nlp.d.ts`

Type declarations for the '@nlpjs/nlp' module, providing TypeScript support for natural language processing operations.

```typescript
// Example usage
import { NlpManager } from '@nlpjs/nlp';
```

## Type Organization Principles

1. **Separation of Concerns**: Types are organized by their data source or service
2. **Consistency**: Type naming follows consistent patterns (e.g., `Entity` for database entities)
3. **Validation**: Many types are derived from Zod schemas for runtime validation
4. **Extensibility**: Types are designed to be extensible for future requirements

## Best Practices

When working with shared types:

### Do

- Import types directly from their specific files
- Keep types in sync with their database schema counterparts
- Add JSDoc comments to complex types
- Use Zod schemas for runtime validation when appropriate
- Create new type files for new data sources or services

### Don't

- Modify shared types without considering the impact on both frontend and backend
- Create duplicate types that already exist in the shared library
- Add application logic to type files
- Include types that are only used in one part of the application

## Adding New Types

When adding new types to the shared library:

1. Determine if the type belongs in an existing file or needs a new file
2. Follow the existing naming conventions
3. Add appropriate JSDoc comments
4. Consider adding Zod schemas for runtime validation
5. Export the type from the file
6. Update this README if adding a new type file

## Type Versioning

Types in this directory should be considered part of the application's internal API. Changes to these types may require updates to both frontend and backend code. When making significant changes:

1. Discuss with the team before implementation
2. Consider backward compatibility
3. Update all affected code
4. Document changes in the project CHANGELOG

## Related Documentation

- [Zod Documentation](https://zod.dev/) - For schema validation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - For TypeScript best practices
- [Supabase Documentation](https://supabase.com/docs) - For Supabase data structures
- [Upstash Documentation](https://docs.upstash.com/) - For Upstash Redis and Vector Store

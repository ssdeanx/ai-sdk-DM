# Shared Library

This directory contains shared code and utilities that are used across multiple parts of the project, including both frontend and backend.

## Overview

The `lib/shared` folder is intended for modules, functions, types, and other code that are generic or reusable by different features or services within the codebase. This centralized approach to shared resources helps maintain consistency, reduces duplication, and improves maintainability across the entire application.

## Directory Structure

```bash
lib/shared/
├── types/            # Shared TypeScript type definitions
│   ├── supabase.ts   # Supabase database types
│   ├── libsql.ts     # LibSQL database types
│   ├── upstashTypes.ts # Upstash Redis/Vector types
│   └── ...
├── utils/            # Utility functions and helpers
├── hooks/            # Shared React hooks
├── constants/        # Application constants and configuration
└── components/       # Shared UI components (if applicable)
```

## Type Definitions

### Purpose

The `lib/shared/types` directory contains TypeScript type definitions that are used throughout the project by both frontend and backend code. Centralizing these types ensures consistency across the application and reduces the need to duplicate type definitions.

### Key Type Files

- **`supabase.ts`**: Contains types for Supabase database entities, including:
  - User types
  - App types
  - Integration types
  - Workflow types
  - Agent types
  - Tool types
  - And other Supabase-related entities

- **`libsql.ts`**: Contains types for LibSQL database entities, including:
  - Memory thread types
  - Message types
  - Embedding types
  - Agent state types
  - Workflow types
  - Cache types

- **`upstashTypes.ts`**: Contains types for Upstash Redis and Vector Store, including:
  - Vector metadata types
  - Vector document types
  - Redis client configuration
  - Vector store configuration
  - Memory types
  - Thread and message types
  - Error classes

- **`nlpjs__nlp.d.ts`**: Type declarations for the '@nlpjs/nlp' module, providing TypeScript support for this library.

### Usage Guidelines

When working with shared types:

1. **Import Patterns**: Import types directly from their specific files:

   ```typescript
   import { User, App } from '@/lib/shared/types/supabase';
   import { MemoryThread, Message } from '@/lib/shared/types/libsql';
   import { VectorDocument, VectorMetadata } from '@/lib/shared/types/upstashTypes';
   ```

2. **Type Extensions**: When extending shared types, consider whether the extension should also be shared or remain feature-specific.

3. **Type Consistency**: Ensure that types remain consistent with their database schema counterparts. When database schemas change, update the corresponding type definitions.

4. **Documentation**: Add JSDoc comments to complex types to explain their purpose and usage.

## Utility Functions

The `lib/shared/utils` directory contains reusable utility functions that are used across the application. These functions should be:

- Pure and side-effect free when possible
- Well-tested
- Well-documented with JSDoc comments
- Focused on a single responsibility

## Shared Hooks

The `lib/shared/hooks` directory contains React hooks that are used across multiple components. These hooks should:

- Follow React's rules of hooks
- Be well-documented with usage examples
- Handle their own error states
- Be tested in isolation

## Constants and Configuration

The `lib/shared/constants` directory contains application-wide constants and configuration values. This includes:

- API endpoints
- Feature flags
- Environment-specific configurations
- Shared enums and constant values

## Best Practices

1. **Keep It Generic**: Code in the shared library should be generic and not tied to specific features.

2. **Minimize Dependencies**: Shared code should have minimal dependencies to prevent circular dependencies.

3. **Versioning Awareness**: Be cautious when modifying shared code, as changes can affect multiple parts of the application.

4. **Testing**: Thoroughly test shared code, as bugs will impact multiple features.

5. **Documentation**: Document the purpose and usage of shared code to help other developers.

6. **Avoid Duplication**: If you find similar code in multiple places, consider moving it to the shared library.

7. **Export Patterns**: Use named exports for better tree-shaking and to make imports more explicit.

## When to Add to Shared Library

Add code to the shared library when:

- It's used by multiple features or services
- It's generic and not tied to a specific feature
- It provides common functionality that could be reused
- It defines types that are used across the application

Don't add code to the shared library when:

- It's specific to a single feature
- It has complex dependencies on feature-specific code
- It's experimental or likely to change frequently

## Migration Guide

If you're moving existing types from root-level directories (e.g., `/types`) to `lib/shared/types`:

1. Move the file to the appropriate location in `lib/shared/types`
2. Update all imports throughout the codebase
3. Verify that TypeScript compilation succeeds
4. Test affected components to ensure they still work correctly

## Contributing

When contributing to the shared library:

1. Discuss significant changes with the team before implementation
2. Follow the project's coding standards
3. Add appropriate tests for new shared code
4. Update documentation to reflect changes
5. Consider the impact on existing code that uses shared resources

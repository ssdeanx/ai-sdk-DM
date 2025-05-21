/*
README_TYPES.md
===============

# Unified Type Definitions in AI SDK DM

This document describes how we manage and organize TypeScript types throughout the AI SDK DM project. Our approach is to derive types directly from the canonical Zod validation schemas defined in our database validation files (located in `db/supabase/validation.ts` and `db/libsql/validation.ts`). This ensures consistency, type safety, and a single source of truth for our database entities across both Supabase and LibSQL (Turso) backends.

## Overview

The project maintains two sets of types:

1. **Schema-Derived Types:**
   - These types are automatically inferred from Zod validation schemas. They ensure that any changes in the database schema (as validated by Zod) are directly reflected in our TypeScript types.
   - Files such as `types/agents.ts`, `types/blog.ts`, `types/app_code_blocks.ts`, `types/integrations.ts`, `types/mdx.ts`, `types/models.ts`, `types/personas.ts`, `types/providers.ts`, `types/settings.ts`, `types/terminal.ts`, and `types/tools.ts` are examples where types are derived from their corresponding validation schemas in `db/supabase/validation.ts`.

2. **Unified Schema File (`types/schema.ts`):**
   - This file consolidates type definitions for database entities from both Supabase and LibSQL backends.
   - The Supabase variants are used as the canonical types for frontend usage, ensuring consistency across the project.
   - For example, it exports unified types such as `User`, `App`, `BlogPost`, `MdxDocument`, and `Model` by inferring them from the respective Supabase validation schemas.

3. **Legacy/Manual Types:**
   - Some types defined in `types/index.ts` remain manually written and provide domain-specific interfaces (e.g., for messages, tool calls, networks, etc.).
   - We recommend using the unified schema-derived types for new development to maintain consistency, but legacy types may still be present for backward compatibility.

## File Breakdown

- **types/agents.ts:**
  Derives the `Agent` type from the Supabase `AgentSchema`. Used as the canonical type for agents.

- **types/blog.ts:**
  The `BlogPost` type is derived from the Supabase `BlogPostSchema`.

- **types/app_code_blocks.ts:**
  The `AppCodeBlock` and `NewAppCodeBlock` types are derived from the `AppCodeBlockSchema` in Supabase.

- **types/content.ts:**
  Contains handcrafted interfaces for content; these represent UI content that might not be directly tied to the database schemas.

- **types/file.ts:**
  Now derives the `File` type from the Supabase `FileSchema`.

- **types/index.ts:**
  Contains legacy and manually maintained interfaces for various domain concepts (e.g., models, tools, networks, etc.).
  It serves as an aggregator for non-schema-derived types. For unified and up-to-date types, refer to `types/schema.ts`.

- **types/integrations.ts:**
  Derives the `Integration` type from the Supabase `IntegrationSchema`.

- **types/mdx.ts:**
  Uses the Supabase `MdxDocumentSchema` to define the `MdxDocument` type.

- **types/model-settings.ts:**
  Contains interfaces for model settings which are used on the frontend to configure AI models.

- **types/models.ts:**
  The `Model` type is derived from the Supabase `ModelSchema`.

- **types/nlpjs__nlp.d.ts:**
  Provides fallback type definitions for the `@nlpjs/nlp` package.

- **types/personas.ts:**
  Derives the `AgentPersona` type from the Supabase `AgentPersonaSchema`.

- **types/providers.ts:**
  Uses the Supabase `ProviderSchema` to derive provider types.

- **types/schema.ts:**
  Aggregates unified type definitions by combining Supabase and LibSQL validation schemas. The Supabase types are used as canonical for frontend usage.

- **types/settings.ts:**
  Derives the `Setting` type from the Supabase `SettingSchema`.

- **types/terminal.ts:**
  Implements a temporary `TerminalSchema` to derive the `Terminal` type until a canonical schema is available in `db/supabase/validation.ts`.

- **types/tools.ts:**
  Derives the `Tool` type from the Supabase `ToolSchema`.

## Future Improvements

- As the project evolves, we plan to move any temporary schemas (e.g., in `types/terminal.ts`) to the canonical validation files.
- We also encourage migrating any legacy interfaces (such as those in `types/index.ts`) to unified, schema-derived types where applicable.
- Ensure any changes to database schemas in `db/supabase/validation.ts` or `db/libsql/validation.ts` are immediately reflected in the corresponding TypeScript types.

## Conclusion

By relying on Zod schemas as the single source of truth for type definitions, the AI SDK DM project maintains robust type safety, consistency, and ease of maintenance. Developers should prefer these unified types for any new development to ensure alignment with the evolving database schemas.

*/ 
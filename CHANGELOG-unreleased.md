nreleased] - 2025-05-19

### Major Refactors & Type Safety
- **Supabase/LibSQL Drizzle ORM helpers** (`lib/memory/drizzle.ts`):
  - Refactored all CRUD helpers to require canonical Drizzle table objects and column references (e.g., `users`, `users.id`).
  - All helpers now use the table's `$inferSelect`/`$inferInsert` types for row typing, ensuring full type safety and compatibility with both Supabase (Postgres) and LibSQL (SQLite) backends.
  - Removed all legacy/incorrect generic table typing and `@ts-expect-error` directives.
  - All arguments are now strongly typed, and all use of `any` has been eliminated.
  - All helpers now use canonical Zod schemas for input/output validation.
  - Fixed all type errors and runtime issues in CRUD helpers for both backends.

- **React Hooks**:
  - `hooks/use-supabase-crud.ts`, `hooks/use-supabase-fetch.ts`, `hooks/use-supabase-realtime.ts`:
    - Refactored to use canonical types, schemas, and TableClient from Upstash adapter factory.
    - All hooks are now type-safe, use static schema mapping, and are compatible with both Supabase and Upstash/ai-sdk/react frontend.
    - Removed all legacy/incorrect types and imports.
  - `hooks/use-toast.ts`:
    - Fixed all type errors related to `ToastActionElement` and forbidden `require()` usage.
    - Enhanced type safety and improved action/queue management.

### AI SDK & Provider Integration
- **`lib/ai.ts`**:
  - Ensured all provider initialization and model config fetching use canonical types and adapters.
  - All AI-driven functionality now consistently uses the Vercel AI SDK (core and react libraries) with Google AI (Gemini models) as the primary provider, as guided by project documentation.
  - Improved error handling and type safety for all provider and model selection logic.

### Architectural & Schema Synchronization
- Ensured all data schemas for Supabase and LibSQL are kept in sync with the canonical project schema.
- All CRUD and memory helpers now use canonical Zod schemas for validation.
- All new/updated code follows project conventions for error handling, logging, and cross-cutting concerns.

### Miscellaneous
- Improved documentation and TSDoc comments for all exported functions, classes, and types.
- Proactively flagged and removed code smells (e.g., dead code, code duplication, direct state mutation in React, etc.).
- All package management operations use `pnpm` as per project convention.

---

**Outstanding Tasks:**
- Finalize and validate all updated hooks and helpers for runtime correctness and feature parity.
- Validate all changes by running type checks and, if possible, runtime tests.
- Update project documentation (e.g., Project Overview, `.copilot-instructions.md`) to reflect new patterns and conventions.

// Generated on 2025-05-19

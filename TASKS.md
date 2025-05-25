---
description: "Task: Cloudflare Migration"
mode: 'agent'
# This prompt is a Tasks.md file for a project that involves migrating a Next.js application to Cloudflare Workers. It outlines the migration tasks, agent personas, and responsibilities for each phase of the migration process.
# This file is a task document for the migration of a Next.js application to Cloudflare Workers, focusing on AI agent onboarding and migration tasks.
---


# AI Agent Onboarding & Cloudflare Migration Tasks (2025)

**Date Created:** 2025-05-24  
**Version:** 1.0
**Lead Developer:** @ssdeanx  
**Repo:** [github.com/ssdeanx/ai-sdk-dm](https://github.com/ssdeanx/ai-sdk-dm)  
**Status:** Pending Implementation  
**Migration Type:** Cloudflare Full Stack (D1, Vectorize, Durable Objects, KV, R2)

## Executive Summary & 2025 AI Agent Context

This task document outlines the migration of a Next.js application utilizing the Vercel AI SDK to a full-stack Cloudflare Workers architecture. It incorporates cutting-edge 2025 AI agent onboarding techniques for autonomous and semi-autonomous execution of tasks. The primary focus is on migrating API endpoints (previously in Next.js App Router, e.g., `#file:app/api/ai-sdk/`), associated business logic, and data persistence layers to Cloudflare services.

**Core Technologies for Migration:**

- Cloudflare Workers with Hono router
- Cloudflare D1 (SQL database)
- Cloudflare Vectorize (Vector database)
- Cloudflare KV (Key-Value store)
- Cloudflare R2 (Object storage)
- Cloudflare Durable Objects (Stateful coordination)
- Vercel AI SDK (for AI interactions, using Google AI provider - Gemini models)
- Zod (for schema validation)
- TSDoc (for documentation)
- `pnpm` (for package management)

**Project Coding Standards**: All generated code must strictly adhere to the user-provided coding instructions, including error handling, TSDoc, Zod usage, `pnpm`, ID generation (`generateId` from `ai`), security principles, and proactive integration of cross-cutting concerns (logging, tracing, validation).

## 🛠️ Comprehensive MCP Tools Arsenal

This project leverages multiple Model Context Protocol (MCP) servers for enterprise-grade development automation. Each agent must understand and utilize these tools strategically:

### Desktop Commander (bb7_*) - Core Development Tools

**Primary file operations, terminal management, and VS Code integration**

- `bb7_open_project` - Establish VS Code context (ALWAYS START HERE)
- `bb7_execute_shell_command` - All terminal operations (pnpm, wrangler, git)
- `bb7_create_diff` - Modify existing files with user approval
- `bb7_write_file` - Create new files (⚠️ Will be CRLF, convert to LF)
- `bb7_read_file`, `bb7_read_multiple_files` - File content analysis
- `bb7_search_code`, `bb7_search_files` - Pattern matching across codebase
- `bb7_open_file` - Display newly created/modified files in VS Code

### File Context Server (bb7_*) - Advanced Codebase Analysis  

**SUPER POWERFUL for understanding project structure**

- `bb7_read_context` + `bb7_get_chunk_count` - Deep codebase analysis with chunking
- `bb7_generate_outline` - File structure analysis (TS/JS/Python)
- `bb7_get_profile_context`, `bb7_set_profile` - Consistent context generation

### Branch Thinking (bb7_*) - Complex Problem Solving

**Multi-branch reasoning and solution exploration**

- `bb7_branch-thinking` with `add-thought` - Complex problem decomposition
- Commands: `list`, `focus`, `history`, `search`, `summarize`, `export-branch`
- Use for analyzing service requirements, debugging complex issues

### Context7 Documentation (bb7_*) - Up-to-date Library Info

**Always get latest documentation before implementing**

- `bb7_resolve-library-id` + `bb7_get-library-docs` for current docs:
  - Hono (router, middleware, Cloudflare integration)
  - Vercel AI SDK (streaming, Google AI provider)
  - Cloudflare Workers (bindings, TypeScript)

### Cloudflare Bindings (bb7_*) - Infrastructure Management

**Direct Cloudflare service interaction and verification**

- **D1**: `bb7_d1_databases_list`, `bb7_d1_database_query`, `bb7_d1_database_create`
- **KV**: `bb7_kv_namespaces_list`, `bb7_kv_namespace_get`, `bb7_kv_namespace_create`  
- **R2**: `bb7_r2_buckets_list`, `bb7_r2_bucket_get`, `bb7_r2_bucket_create`
- **Workers**: `bb7_workers_list`, `bb7_workers_get_worker`, `bb7_workers_get_worker_code`
- **Accounts**: `bb7_accounts_list`, `bb7_set_active_account`

### Cloudflare Documentation (bb7_*) - Best Practices

- `bb7_search_cloudflare_documentation` - Implementation patterns and guides

### Memory & Context (bb7_*) - Project Knowledge Persistence  

- `bb7_search-memories` - Leverage past project context and user preferences
- `bb7_add-memory` - Store important decisions and patterns

### External Resources (bb7_*) - Research & Analysis

- `bb7_git_summary`, `bb7_git_tree`, `bb7_git_files` - External repo analysis
- `bb7_fetch_content` - Web resources and documentation
- `bb7_search` - DuckDuckGo research when needed

### 🚨 Critical File Handling Rules

**MUST follow these patterns to avoid errors:**

1. **Line Endings**: New files default to CRLF on Windows → Convert to LF immediately
2. **Auto-formatting**: If prettier/eslint errors appear, "release" the file (don't edit immediately)  
3. **Error Recovery**: Fix formatting issues before creating new files
4. **Compilation**: Always run `bb7_execute_shell_command` with `pnpm build` to verify TypeScript

## Agent Personas & Specialization Framework

### 🏗️ Migration Architect Agent

**Agent Mode Configuration**: `github.copilot.chat.agent.enabled: true`  
**Preferred Models**: Claude Sonnet (latest 4.x), GPT-4 (latest 4.x)
**Specialty**: Cloudflare infrastructure setup (D1, Vectorize, KV, R2, DOs), `wrangler.jsonc` configuration, initial D1 schema design, basic scaffolding of service operation classes.  
**Responsibilities**: Initial setup of Cloudflare services as per `#file:README_TYPES.MD` (Stages 0-3 for infrastructure). Defining D1 table schemas. Configuring all KV, Vectorize, R2, and Durable Object bindings in `#file:workers/wrangler.jsonc`. Scaffolding shells for core Cloudflare service operation classes.  
**Agent Prompts**:

```
You are the Migration Architect Agent. Establish Cloudflare infrastructure foundation (Phase 0).

Core Tasks:
1. Complete D1 schema in lib/database/cloudflare/d1/schema.ts
2. Configure workers/wrangler.jsonc with all bindings (D1, KV, R2, Vectorize, DOs)
3. Scaffold service class shells with TSDoc placeholders
4. Verify wrangler dev starts successfully

Use bb7_open_project tool first, then bb7_execute_shell_command for commands.
Mark tasks complete in TASKS.md when finished.
```

### 🔧 Integration Engineer Agent

**Agent Mode Configuration**: `github.copilot.chat.agent.enabled: true`  
**Preferred Models**: GPT-4.1 (latest 4.x), Claude Sonnet (latest 4.x)
**Specialty**: Hono API endpoint implementation, business logic development (migrating from Next.js API routes), Vercel AI SDK integration (with Google AI - Gemini), full implementation of `MemoryFactory` and service operation classes, creation of types/hooks/Zod schemas.  
**Responsibilities**: Implementing all `ai-sdk` API routes within the Cloudflare Worker by migrating logic from old Next.js paths (e.g., `#file:app/api/ai-sdk/chat/route.ts`). Building out all business logic in `#file:lib/`. Creating shared types (Zod schemas) in `#file:lib/shared/types/`. Fully implementing the `#file:lib/memory/factory.ts` and the Cloudflare service operation classes (D1, KV, R2, Vectorize, DOs).  
**Agent Prompts**:

```
You are the Integration Engineer Agent. Implement backend logic in Cloudflare Worker (Phase 1).

Required MCP Tools Workflow:
1. bb7_open_project - Establish project context first 
2. bb7_get_context_tabs - Get current codebase context
3. bb7_execute_shell_command - All terminal operations
4. bb7_create_diff - Modify existing files
5. bb7_open_file - Display new/modified files

Core Tasks:
1. Implement workers/src/index.ts with Hono router and middleware
2. Complete lib/memory/factory.ts with AppEnv interface and service getters
3. Migrate API routes to workers/src/routes/api/ (not ai-sdk/)
4. Create business logic services in lib/ with Vercel AI SDK integration

Mark tasks complete in TASKS.md when finished.
```

### 🚀 DevOps Optimizer Agent

**Agent Mode Configuration**: `github.copilot.chat.agent.enabled: true`  
**Preferred Models**: GPT-4 (latest 4.x), Claude Sonnet (latest 4.x)
**Specialty**: Testing (unit, integration, E2E), CI/CD pipeline setup (GitHub Actions), deployment to Cloudflare, monitoring, performance optimization.  
**Responsibilities**: Implementing comprehensive testing strategies for the Cloudflare Worker and its services. Setting up CI/CD pipelines for automated testing and deployment. Implementing monitoring, logging, and alerting for the production environment. Optimizing performance and ensuring scalability.  
**Agent Prompts**:

```
You are the DevOps Optimizer Agent. Ensure robust testing, deployment, and monitoring (Phases 3-4).

Required MCP Tools Workflow:
1. bb7_open_project - Establish project context
2. bb7_execute_shell_command - Run tests, deployments
3. Use cloudflare_bindings_client for infrastructure verification
4. Use cloudflare_docs_client for best practices research

Core Tasks:
1. Implement unit/integration tests for all services and routes
2. Set up CI/CD with GitHub Actions
3. Configure monitoring and logging for production
4. Optimize performance and ensure scalability

Mark tasks complete in TASKS.md when finished.
```

### 📚 Documentation Curator Agent

**Agent Mode Configuration**: `github.copilot.chat.agent.enabled: true`  
**Preferred Models**: Claude Sonnet (latest 4.x), GPT-4 (latest 4.x)
**Specialty**: TSDoc generation, updating `README.md` and `README_TYPES.MD`, API documentation, developer onboarding materials.  
**Responsibilities**: Ensuring all code is meticulously documented with TSDoc. Keeping project documentation (`README_TYPES.MD`, main `README.md`) current with the migration progress and new architecture. Generating API documentation. Creating/updating developer onboarding guides.  
**Agent Prompts**:

```
You are the Documentation Curator Agent. Ensure exceptional documentation and developer experience.

Required MCP Tools Workflow:
1. bb7_open_project - Establish project context
2. bb7_get_context_tabs - Analyze current codebase structure
3. bb7_read_context - Deep dive into file contents
4. bb7_create_diff - Update documentation files
5. Use context7_client for latest library documentation standards

Core Tasks:
1. Generate comprehensive TSDoc for all exported code
2. Update README.md and README_TYPES.MD with new architecture
3. Create API documentation for Worker endpoints  
4. Maintain developer onboarding guides

Mark tasks complete in TASKS.md when finished.
```

**Agent Mode Configuration**: `github.copilot.chat.agent.enabled: true`  
**Preferred Models**: Claude Sonnet (latest 4.x), GPT-4 (latest 4.x)
**Specialty**: TSDoc generation, updating `README.md` and `#file:README_TYPES.MD`, API documentation, developer onboarding materials.  
**Responsibilities**: Ensuring all code is meticulously documented with TSDoc. Keeping project documentation (`#file:README_TYPES.MD`, main `README.md`) current with the migration progress and new architecture. Generating API documentation. Creating/updating developer onboarding guides.  
**Agent Prompts**:

```txt
You are the Documentation Curator Agent. Ensure exceptional documentation and developer experience.

Core Tasks:
1. Generate comprehensive TSDoc for all exported code
2. Update README.md and README_TYPES.MD with new architecture
3. Create API documentation for Worker endpoints  
4. Maintain developer onboarding guides

Use bb7_open_project tool first to establish context.
```

4. **Developer Onboarding Materials (Task 10.2)**:
    - Review and update #file:workers/.env.example to ensure it lists all necessary environment variables for local development and production.
    - Create or update a developer setup guide that explains how to get the Cloudflare Worker running locally, including `pnpm install`, `wrangler dev`, and any necessary Cloudflare account setup.
Reference #file:CF-work.txt for Cloudflare best practices.

```

## Migration Progress Tracker (Aligned with #file:README_TYPES.MD)

### ✅ Completed (Verified by User/Lead Developer)

- [x] **Phase 0 Infrastructure Complete** ✅ (All tasks completed 2025-05-24)
  - [x] D1 schema fully defined in `lib/database/cloudflare/d1/schema.ts` (1,425 lines)
  - [x] Durable Objects schema complete in `lib/database/cloudflare/durableObjects/schema.ts`
  - [x] Cloudflare bindings configured in `workers/wrangler.jsonc` (all 9 services)
  - [x] D1 migrations generated and applied for NextAuth.js
  - [x] NextAuth.js tables exist in D1
  - [x] `workers/` directory created at project root

### ⚠️ PARTIALLY COMPLETE (Phase 1 Started - Has TypeScript Errors)

- [⚠️] **Service Operation Classes** - Scaffolds exist but need TypeScript fixes:
  - [⚠️] CfKvOps (`lib/database/cloudflare/kv/ops.ts`) - Minor type issues
  - [⚠️] CfR2Store (`lib/database/cloudflare/r2/ops.ts`) - Complete implementation  
  - [⚠️] CfVectorizeOps (`lib/database/cloudflare/vectorize/ops.ts`) - Complete implementation
  - [⚠️] CfD1CrudService (`lib/database/cloudflare/d1/crudService.ts`) - Using `any` types
  - [⚠️] PersonaProfileDO (`lib/database/cloudflare/durableObjects/personaProfileDO.ts`) - Type mismatches
  - [⚠️] AgentThreadDO (`lib/database/cloudflare/durableObjects/agentThreadDO.ts`) - Needs verification
- [⚠️] **MemoryFactory** (`lib/memory/cloudflare/factory.ts`) - Multiple TypeScript errors (missing constructor args)

### 🎯 CURRENT FOCUS: Phase 1 - Fix TypeScript Errors & Complete Implementation

**IMMEDIATE PRIORITY:** Fix all TypeScript errors in existing service classes before implementing new features.

#### Task 1.0: Fix TypeScript Errors (BLOCKING - Do This First)

- [ ] **Fix MemoryFactory** (`lib/memory/cloudflare/factory.ts`):
  - Fix missing constructor arguments  
  - Remove console statements, replace with proper logging
  - Implement AppEnv interface properly
  - Add runHealthChecks() method
- [ ] **Fix Service Classes**:
  - Fix CfD1CrudService `any` types 
  - Fix PersonaProfileDO type mismatches
  - Verify all service class implementations
- [ ] **Verify All TypeScript Compilation**: Ensure `pnpm build` passes without errors

#### Task 1.1: Complete Worker Implementation

- [ ] Install dependencies: `cd workers && pnpm add hono @hono/zod-validator @hono/jwt @cloudflare/workers-types zod ai`
- [ ] Implement `workers/src/index.ts` with Hono router and all middleware
- [ ] Create middleware files:
  - `workers/src/middleware/error.ts`
  - `workers/src/middleware/auth.ts` 
  - `workers/src/middleware/bindings.ts`
  - `workers/src/middleware/logging.ts`
- [ ] Implement health check route `workers/src/routes/health.ts`

#### Task 1.2: API Endpoint Migration

- [ ] Migrate `/api/ai-sdk/chat` routes to `workers/src/routes/api/chat.ts`
- [ ] Create chat service `lib/chat/chat-service.ts` with Vercel AI SDK integration
- [ ] Create types/schemas `lib/shared/types/chatTypes.ts`
- [ ] Test endpoint functionality with health checks

#### Task 1.3: Comprehensive MCP Tools Integration & Autonomous Development

**CRITICAL FILE HANDLING NOTES:**
- **Line Endings**: New files created will default to CRLF on Windows. Agent MUST convert to LF to avoid errors: `bb7_execute_shell_command` with `dos2unix filename` or configure VS Code
- **Auto-formatting**: If prettier/eslint errors occur after file creation, let agent "release" the file (don't immediately edit) - auto-formatting will fix these issues
- **Error Recovery**: Don't create new files if there are formatting errors - fix existing files first

**Branch Thinking & Complex Analysis:**
- [ ] Use `bb7_branch-thinking` with `add-thought` for complex problem decomposition
- [ ] Use `list`, `focus`, `history` commands to navigate multiple reasoning branches  
- [ ] Use `search`, `summarize` for finding related insights across branches
- [ ] Use `export-branch` to save analysis for later reference

**File Context & Codebase Analysis (SUPER POWERED):**
- [ ] Use `bb7_read_context` + `bb7_get_chunk_count` for analyzing existing codebase structure
- [ ] Use `bb7_generate_outline` for understanding file structure (TS/JS/Python files)
- [ ] Use `bb7_set_profile` and `bb7_get_profile_context` for consistent context generation
- [ ] Combine with `bb7_search_code` for powerful pattern matching across codebase

**Context7 Documentation Access:**
- [ ] Use `bb7_resolve-library-id` + `bb7_get-library-docs` for:
  - Hono (router, middleware, Cloudflare Workers integration)
  - Vercel AI SDK (streaming, Google AI provider, core functions)  
  - Cloudflare Workers (bindings, environment types, TypeScript)
  - Any other libraries as needed

**Cloudflare-Specific Tools:**
- [ ] Use `bb7_search_cloudflare_documentation` for implementation patterns and best practices
- [ ] Use Cloudflare Bindings tools for runtime verification:
  - `bb7_d1_database_query`, `bb7_d1_databases_list` for D1 operations
  - `bb7_kv_namespaces_list`, `bb7_kv_namespace_get` for KV operations  
  - `bb7_r2_buckets_list`, `bb7_r2_bucket_get` for R2 operations
  - `bb7_workers_list`, `bb7_workers_get_worker` for Workers management

**Development Workflow Tools:**
- [ ] Use `bb7_open_project` at session start to establish VS Code context  
- [ ] Use `bb7_get_active_tabs` and `bb7_get_context_tabs` to understand current state
- [ ] Use `bb7_execute_shell_command` for all terminal operations (pnpm, wrangler, git)
- [ ] Use `bb7_create_diff` for modifying existing files with user approval
- [ ] Use `bb7_open_file` to display newly created/modified files

**Memory & Context Persistence:**
- [ ] Use `bb7_search-memories` to leverage past project context and user preferences  
- [ ] Use `bb7_add-memory` to store important project decisions and patterns

**Git & External Resources:**
- [ ] Use `bb7_git_summary`, `bb7_git_tree`, `bb7_git_files` for external repo analysis
- [ ] Use `bb7_fetch_content` for web resources and documentation
- [ ] Use `bb7_search` for DuckDuckGo research when needed

**Best Practice Workflow:** 
1. Start with `bb7_open_project` to establish context
2. Use `bb7_get_context_tabs` to understand current state  
3. Use `bb7_branch-thinking` for complex problem analysis
4. Use `bb7_read_context` to analyze existing code patterns
5. Use documentation tools for implementation guidance
6. Make changes with `bb7_create_diff` and open results with `bb7_open_file`

#### 🔄 Remaining Phase 1 Tasks

##### Task 1.1: Core Worker Setup & Hono Router

- [ ] **Task 1.1.1**: Ensure Hono and necessary middleware dependencies are in `workers/package.json` and install using `pnpm`.

  ```bash
  # Agent should verify/execute these commands in the 'workers' directory
  # pnpm add hono @hono/zod-validator @hono/jwt @cloudflare/workers-types zod ai # 'ai' for generateId for ai-sdk
  ```

- [ ] **Task 1.1.2**: Implement production-ready worker entrypoint in `#file:workers/src/index.ts`.

  ```typescript
  // filepath: c:\Users\dm\Documents\ai-sdk-DM\workers\src\index.ts
  // TODO: 2025-05-24 - Implement this Hono setup fully.
  // Generated on 2025-05-24
  import { Hono } from 'hono';
  import { AppEnv, MemoryFactory } from '../lib/memory/factory'; // Assuming @ is mapped to ./src or adjust path
  import { authMiddleware } from './middleware/auth';
  import { errorMiddleware } from './middleware/error';
  import { bindingValidationMiddleware } from './middleware/bindings';
  import { requestLoggingMiddleware } from './middleware/logging'; // For request logging
  
  // Import route modules
  import healthRoutes from './routes/health';
  import aiSdkChatRoutes from './routes/ai-sdk/chat';
  import aiSdkAgentRoutes from './routes/ai-sdk/agents';
  import aiSdkToolRoutes from './routes/ai-sdk/tools';
  import aiSdkModelRoutes from './routes/ai-sdk/models';
  // Add ALL ai-sdk route imports if they exist e.g., files, etc.

  export type HonoAppContext = {
    Variables: {
      user?: { id: string; role: string; [key: string]: any }; // User is optional until auth middleware runs
      memoryFactory: MemoryFactory;
      requestId?: string; // For tracing/logging
    };
    Bindings: AppEnv; // AppEnv should be defined in factory.ts or a shared types file
  };
  
  const app = new Hono<HonoAppContext>();
  
  // 0. Request ID and Logging Middleware (runs first)
  app.use('*', requestLoggingMiddleware);

  // 1. Global error handler (catches errors from subsequent middleware/routes)
  app.onError(errorMiddleware);

  // 2. Global MemoryFactory middleware
  app.use('*', async (c, next) => {
    try {
      const factory = new MemoryFactory(c.env as AppEnv); // Ensure AppEnv is correctly typed
      c.set('memoryFactory', factory);
    } catch (e) {
      console.error("CRITICAL: Failed to initialize MemoryFactory", e);
      return c.json({ error: "Internal Server Error - Critical component initialization failed" }, 500);
    }
    await next();
  });
  
  // 3. Binding validation for API routes (after MemoryFactory so it can potentially use it for checks if needed)
  app.use('/api/*', bindingValidationMiddleware);

  // 4. Auth middleware for protected API routes
  app.use('/api/ai-sdk/*', authMiddleware); // Apply to all ai-sdk routes

  // 5. Register routes
  app.route('/health', healthRoutes); // Public health check
  app.route('/api/ai-sdk/chat', aiSdkChatRoutes);
  app.route('/api/ai-sdk/agents', aiSdkAgentRoutes);
  app.route('/api/ai-sdk/tools', aiSdkToolRoutes);
  app.route('/api/ai-sdk/models', aiSdkModelRoutes);
  // Register other ai-sdk routes here if they exist

  export default app;
  ```

- [ ] **Task 1.1.3**: Implement health check endpoint in `#file:workers/src/routes/health.ts`.
  This Hono route should use `c.get('memoryFactory').runHealthChecks()` to verify D1, KV, R2, Vectorize, and DO connectivity.

  ```typescript
  // filepath: c:\Users\dm\Documents\ai-sdk-DM\workers\src\routes\health.ts
  // TODO: 2025-05-24 - Ensure MemoryFactory.runHealthChecks() is implemented and returns detailed status for each service.
  // Generated on 2025-05-24
  import { Hono } from 'hono';
  import { HonoAppContext } from '../index';
  
  const healthRoutes = new Hono<HonoAppContext>();
  
  healthRoutes.get('/', async (c) => {
    const factory = c.get('memoryFactory');
    let checks: Record<string, { status: string; details?: string }> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
    let httpStatus = 503; // Service Unavailable
  
    try {
      checks = await factory.runHealthChecks(); // This method needs to be implemented in MemoryFactory
      const allOk = Object.values(checks).every(service => service.status === 'ok');
      const anyCriticalError = Object.values(checks).some(service => service.status === 'error' && service.details?.includes('critical')); // Define what's critical

      if (allOk) {
        overallStatus = 'healthy';
        httpStatus = 200;
      } else if (!anyCriticalError) {
        overallStatus = 'degraded';
        httpStatus = 200; // Still OK, but with warnings
      } else {
        overallStatus = 'unhealthy'; // Critical service down
      }
    } catch (error: any) {
      console.error(`Health check execution failed: ${error.message}`, error);
      checks = { system: { status: 'error', details: error.message || 'Unknown error during health check execution' } };
    }
    return c.json({ status: overallStatus, checks, timestamp: new Date().toISOString(), requestId: c.get('requestId') }, httpStatus);
  });
  
  export default healthRoutes;
  ```

##### Task 1.2: Core Middleware & `MemoryFactory` Implementation

- [ ] **Task 1.2.1**: (Migration Architect to verify bindings from Task 0.1 are complete and correct in `#file:workers/wrangler.jsonc`).
- [ ] **Task 1.2.2**: (Integration Engineer) Fully implement `#file:lib/memory/factory.ts`.
  - Define `AppEnv` interface (e.g., `export interface AppEnv { DB_D1: D1Database; KV_MAIN_CACHE: KVNamespace; /* ...all other bindings... */ }`).
  - Constructor `constructor(env: AppEnv)` that initializes instances of all service operation classes (CfD1CrudService, CfKvOps, CfR2Store, CfVectorizeOps).
  - Provide typed public getters for each service instance and for DO stubs (e.g., `getAgentThreadDO(id: DurableObjectId | string): DurableObjectStub`).
  - Implement `async runHealthChecks(): Promise<Record<string, { status: string; details?: string }>>`. Each check should `try/catch` and report 'ok' or 'error' with details. For DOs, this might involve a simple `fetch` to a health endpoint on the DO itself.
- [ ] **Task 1.2.3**: (Integration Engineer) Implement binding validation middleware in `#file:workers/src/middleware/bindings.ts`.

  ```typescript
  // filepath: c:\Users\dm\Documents\ai-sdk-DM\workers\src\middleware\bindings.ts
  // TODO: 2025-05-24 - Ensure requiredBindings list is comprehensive and matches AppEnv and wrangler.jsonc.
  // Generated on 2025-05-24
  import { MiddlewareHandler } from 'hono';
  import { HonoAppContext } from '../index';
  import { AppEnv } from '../../lib/memory/factory'; // Assuming AppEnv is exported here
  
  export const bindingValidationMiddleware: MiddlewareHandler<HonoAppContext> = async (c, next) => {
    const requiredBindings: (keyof AppEnv)[] = [
      'DB_D1', 
      'KV_MAIN_CACHE',
      'KV_EPHEMERAL_CACHE',
      'R2_MAIN_BUCKET',
      'VECTORIZE_MAIN_INDEX',
      'DO_AGENT_THREAD',
      'DO_PERSONA_PROFILE',
      // Add ALL other essential bindings defined in AppEnv
    ];
    const actualEnv = c.env as Record<string, unknown>;
    const missingBindings = requiredBindings.filter(bindingKey => !actualEnv[bindingKey]);
  
    if (missingBindings.length > 0) {
      const errorMsg = `Server configuration error: Missing required Cloudflare bindings. Missing: ${missingBindings.join(', ')}`;
      console.error(errorMsg, { requestId: c.get('requestId') });
      return c.json({ error: errorMsg, requestId: c.get('requestId') }, 500);
    }
    await next();
  };
  ```

- [ ] **Task 1.2.4**: (Integration Engineer) Implement error handling middleware in `#file:workers/src/middleware/error.ts`.

  ```typescript
  // filepath: c:\Users\dm\Documents\ai-sdk-DM\workers\src\middleware\error.ts
  // TODO: 2025-05-24 - Enhance with structured logging (e.g., to an external service if configured).
  // Generated on 2025-05-24
  import { ErrorHandler } from 'hono';
  import { HonoAppContext } from '../index';
  import { HTTPException } from 'hono/http-exception'; // For typed HTTP errors
  
  export const errorMiddleware: ErrorHandler<HonoAppContext> = (err, c) => {
    const requestId = c.get('requestId');
    let statusCode = 500;
    let message = 'An unexpected error occurred.';
  
    if (err instanceof HTTPException) {
      statusCode = err.status;
      message = err.message;
    } else if (err instanceof Error) {
      message = err.message; // Potentially sensitive, be careful in prod
    }
  
    // Log the detailed error internally
    console.error(`Error during ${c.req.method} ${c.req.url}: ${message}`, { 
      error: err, // Full error object for internal logs
      stack: (err as Error).stack,
      requestId 
    });
    
    // For client-facing errors, especially 5xx, avoid leaking sensitive details in production
    const clientErrorMessage = (statusCode >= 500 && (c.env as any).WORKER_ENV === 'production') 
        ? 'Internal Server Error. Please try again later.' 
        : message;

    return c.json({ error: clientErrorMessage, requestId }, statusCode);
  };
  ```

- [ ] **Task 1.2.5**: (Integration Engineer) Implement authentication middleware in `#file:workers/src/middleware/auth.ts`.
  This middleware should:
    1. Expect a JWT in the `Authorization: Bearer <token>` header.
    2. Use a JWT library (e.g., `@hono/jwt` or a platform-agnostic one like `jose`) to verify the token against secrets/keys (presumably from `c.env`).
    3. If valid, extract user information (id, role) from the token payload.
    4. Set `c.set('user', userData)`.
    5. If invalid or missing, return a `401 Unauthorized` or `403 Forbidden` `HTTPException`.
- [ ] **Task 1.2.6**: (Integration Engineer) Implement request logging middleware in `#file:workers/src/middleware/logging.ts`.
  This middleware should:
    1. Generate a unique request ID (e.g., using `generateId` from `ai`) if one doesn't exist (e.g., from `CF-Ray`).
    2. Set `c.set('requestId', id)`.
    3. Log basic request info (method, URL, requestId) at the start.
    4. Log response info (status, requestId, duration) after `await next()`.

##### Task 1.3: API Endpoint Migration & Implementation (Focus: `ai-sdk` routes)

**General Approach for each `ai-sdk` sub-route (Integration Engineer):**

1. **Identify Old Route**: Note the functionality of the old Next.js API route (e.g., `#file:app/api/ai-sdk/chat/route.ts`).
2. **Create New Hono Route File**: e.g., `#file:workers/src/routes/ai-sdk/chat.ts`.
3. **Define Hono Routes**: Implement handlers for POST, GET, etc., using `const subApp = new Hono<HonoAppContext>()`.
4. **Input Validation**: Use Zod schemas defined in a new domain-specific file (e.g., `#file:lib/shared/types/chatTypes.ts`) for request bodies/params. Use `@hono/zod-validator`.
5. **Access Services**: Use `c.get('memoryFactory')` to get instances of `CfD1CrudService`, `CfVectorizeOps`, `CfKvOps`, `CfR2Store`, DO stubs, etc.
6. **Business Logic**: Implement core logic in a new service file (e.g., `#file:lib/chat/chat-service.ts`), using Vercel AI SDK functions (`streamText`, `generateId`, `embed` with Google AI: `embeddingModalId: 'google/text-embedding-004'`) and custom logic. All service methods must be `async` and use `try/catch`.
7. **Types**: Define request/response TypeScript types in the domain-specific types file, often inferred from Zod schemas.
8. **Error Handling**: Wrap service calls in `try/catch` within Hono handlers. Throw `HTTPException` for client errors, let global error handler catch server errors.
9. **TSDoc**: Document all new functions, types, Zod schemas, etc.
10. **Cross-Cutting Concerns**: Ensure logging, tracing (if set up), ID generation, and Zod validation are applied.

- [ ] **Task 1.3.1**: Migrate functionality from old Next.js `app/api/ai-sdk/chat/route.ts` to new Hono routes in `workers/src/routes/api/chat.ts`.
  - Business logic in a new `lib/chat/chat-service.ts`.
  - Types/Zod schemas in a new `lib/shared/types/chatTypes.ts` (e.g., `ChatRequestSchema`, `ChatMessageSchema`).
  - Integrate with `DO_AGENT_THREAD` via `MemoryFactory` for conversation state, message history, and Vercel AI SDK `AIState` persistence.
  - Utilize Vercel AI SDK's `streamText` for streaming responses, `generateId` for message IDs.
- [ ] **Task 1.3.2**: Migrate functionality from old Next.js `app/api/ai-sdk/agents/route.ts` to new Hono routes in `workers/src/routes/api/agents.ts`.
  - Business logic for CRUD operations on agent configurations in a new `lib/agents/agent-service.ts`.
  - Types/Zod schemas in a new `lib/shared/types/agentTypes.ts` (e.g., `AgentConfigSchema`, `CreateAgentRequestSchema`).
  - Store agent definitions in D1 using `CfD1CrudService` from `MemoryFactory`.
- [ ] **Task 1.3.3**: Migrate functionality from old Next.js `app/api/ai-sdk/tools/route.ts` to new Hono routes in `workers/src/routes/api/tools.ts`.
  - Business logic for tool management (listing, fetching definitions) in a new `lib/tools/tool-service.ts`.
  - Types/Zod schemas in a new `lib/shared/types/toolTypes.ts` (e.g., `ToolDefinitionSchema`).
  - Store tool definitions/configurations in D1.
- [ ] **Task 1.3.4**: Migrate functionality from old Next.js `app/api/ai-sdk/models/route.ts` to new Hono routes in `workers/src/routes/api/models.ts`.
  - Business logic for AI model configuration management (listing available, fetching details) in a new `lib/models/model-service.ts`.
  - Types/Zod schemas in a new `lib/shared/types/modelTypes.ts` (e.g., `ModelConfigSchema`).
  - Store model settings in D1 or KV (for simpler, less relational data).
- [ ] **Task 1.3.5**: Ensure all new business logic service files (e.g., `#file:lib/chat/chat-service.ts`) are created, well-structured, use `MemoryFactory`, and correctly incorporate Vercel AI SDK with Google AI provider. All methods must be async and include try/catch.
- [ ] **Task 1.3.6**: Ensure all new type and Zod schema files (e.g., `#file:lib/shared/types/chatTypes.ts`) are created, correctly define data structures, and are used for validation in Hono routes.

#### Phase 2: Advanced Cloudflare Service Implementation (Integration Engineer Lead, Migration Architect Support for Bindings)

##### Stage 2.1: Vectorize Integration

- [ ] **Task 2.1.1**: (Migration Architect to verify `VECTORIZE_MAIN_INDEX` binding from Task 0.1 is correct).
- [ ] **Task 2.1.2**: (Integration Engineer) Fully implement methods in `#file:lib/database/cloudflare/vectorize/ops.ts` (CfVectorizeOps class).
  - Define `VectorData`, `QueryResult`, etc., types in a new `#file:lib/shared/types/vectorStoreTypes.ts`.
- [ ] **Task 2.1.3**: (Integration Engineer) Create/Refactor embedding generation logic in a new `#file:lib/memory/embedding-service.ts`.
  - This service should use Vercel AI SDK's `embed` function (e.g., `import { embed } from 'ai'; const { embedding } = await embed({ model: 'google/text-embedding-004', value: text });`).
  - It will be called by other services (e.g., RAG tools, chat service for document processing) to generate embeddings before upserting to Vectorize via `CfVectorizeOps`.
- [ ] **Task 2.1.4**: (Integration Engineer) Update/Create RAG (Retrieval Augmented Generation) tools or services (e.g., in `#file:lib/tools/rag/`) to:
  - Use `EmbeddingService` to generate query embeddings.
  - Use `CfVectorizeOps` to query the `VECTORIZE_MAIN_INDEX`.
- [ ] **Task 2.1.5**: (If applicable) Plan and implement data migration script from Upstash Vector to Cloudflare Vectorize.
- [ ] **Task 2.1.6**: Verify data migration and remove Upstash vector dependencies from the project.

##### Stage 2.2: KV Cache Layer Implementation

- [ ] **Task 2.2.1**: (Migration Architect to verify `KV_MAIN_CACHE` and `KV_EPHEMERAL_CACHE` bindings from Task 0.1 are correct).
- [ ] **Task 2.2.2**: (Integration Engineer) Fully implement methods in `#file:lib/database/cloudflare/kv/ops.ts` (CfKvOps class), including TTL management and JSON serialization/deserialization.
- [ ] **Task 2.2.3**: (Integration Engineer) Identify and implement cache-aside patterns in relevant business logic services (e.g., caching results from D1 queries in `#file:lib/models/model-service.ts` or `#file:lib/tools/tool-service.ts`).
- [ ] **Task 2.2.4**: (Integration Engineer) Define and implement cache invalidation strategies (e.g., on data update/delete).

##### Stage 2.3: R2 Object Storage

- [ ] **Task 2.3.1**: (Migration Architect to verify `R2_MAIN_BUCKET` binding from Task 0.1 is correct).
- [ ] **Task 2.3.2**: (Integration Engineer) Fully implement methods in `#file:lib/database/cloudflare/r2/ops.ts` (CfR2Store class).
- [ ] **Task 2.3.3**: (Integration Engineer) Design and add D1 schema to `#file:lib/database/cloudflare/d1/schema.ts` for R2 object metadata (e.g., `r2_object_metadata` table: `id`, `r2_key`, `filename`, `contentType`, `size`, `userId`, `createdAt`, `updatedAt`). (Migration Architect to review schema).
- [ ] **Task 2.3.4**: (Integration Engineer) Implement file upload/download Hono routes in a new `#file:workers/src/routes/files.ts`.
  - Upload endpoint should stream file to R2 via `CfR2Store` and save metadata to D1 via `CfD1CrudService`.
  - Download endpoint should retrieve file from R2.
  - Implement appropriate authorization.

##### Stage 2.4: Durable Objects Implementation

- [ ] **Task 2.4.1**: (Migration Architect to verify `DO_AGENT_THREAD` and `DO_PERSONA_PROFILE` bindings and migration setup from Task 0.1 are correct).
- [ ] **Task 2.4.2**: (Integration Engineer) Fully implement `#file:lib/database/cloudflare/durableObjects/agentThreadDO.ts`.
  - Implement `fetch` handler to route requests to internal methods.
  - Implement methods for: adding messages, getting message history, managing Vercel AI SDK `AIState` (loading from and saving to `this.state.storage`).
  - Ensure robust error handling and state persistence.
- [ ] **Task 2.4.3**: (Integration Engineer) Fully implement `#file:lib/database/cloudflare/durableObjects/personaProfileDO.ts`.
  - Implement `fetch` handler.
  - Implement methods for managing dynamic persona data (e.g., user feedback scores, preferences), persisting to `this.state.storage`.
- [ ] **Task 2.4.4**: (Integration Engineer) Integrate Durable Object interactions into relevant business logic services (e.g., `#file:lib/chat/chat-service.ts` will use `MemoryFactory` to get `AgentThreadDO` stubs).

##### Stage 2.5: Shared Code Refactoring

- [ ] **Task 2.5.1**: (Integration Engineer) Review all code in `#file:lib/` and `#file:workers/src/` for opportunities to move reusable types, Zod schemas, utility functions into `#file:lib/shared/types/`, `#file:lib/shared/hooks/` (if any client-side hooks were part of this, unlikely for worker), or `#file:lib/shared/utils/`.
- [ ] **Task 2.5.2**: (Integration Engineer) Update all imports to use the new shared locations.
- [ ] **Task 2.5.3**: (Integration Engineer) Ensure no duplication of types or utility functions.

#### Phase 3: Production & Optimization (DevOps Optimizer Agent)

##### Stage 3.1: Testing & Validation

- [ ] **Task 3.1.1**: Unit tests for all service operation classes, business logic services, and `MemoryFactory`.
- [ ] **Task 3.1.2**: Integration tests for all Hono API routes.
- [ ] **Task 3.1.3**: (If applicable) End-to-end testing for critical user flows.
- [ ] **Task 3.1.4**: Load testing for key API endpoints.

##### Stage 3.2: Deployment & Monitoring

- [ ] **Task 3.2.1**: Document process for configuring production secrets with `wrangler secret put`.
- [ ] **Task 3.2.2**: Set up CI/CD pipelines with GitHub Actions.
- [ ] **Task 3.2.3**: Implement robust monitoring and logging (Cloudflare Worker Analytics, OpenTelemetry/Langfuse if specified).
- [ ] **Task 3.2.4**: Configure alerting for critical errors and performance degradation.

#### Phase 4: Documentation & Knowledge Transfer (Documentation Curator Agent)

##### Stage 4.1: Technical Documentation & Developer Experience

- [ ] **Task 4.1.1**: Update `#file:README_TYPES.MD` and main project `README.md` to reflect the new Cloudflare-based architecture.
- [ ] **Task 4.1.2**: Ensure all exported code has comprehensive TSDoc comments.
- [ ] **Task 4.1.3**: Generate API documentation for the Worker endpoints.
- [ ] **Task 4.1.4**: Update/create `#file:workers/.env.example` for all required Cloudflare/NextAuth/AI keys.
- [ ] **Task 4.1.5**: Update scripts in `workers/package.json` for clear DX (dev, test, deploy, migrate).
- [ ] **Task 4.1.6**: Ensure `#file:workers/tsconfig.json` is correct.

## 2025 GitHub Copilot Agent Integration

### Agent Mode Best Practices

#### Autonomous Iteration Patterns for Development

**Route Generation & API Development:**

```typescript
// Autonomous API Route Creation Pattern
// 1. Analyze existing API structure with bb7_read_context
// 2. Generate route file with proper Hono setup
// 3. Create associated service class in lib/
// 4. Generate Zod schemas in lib/shared/types/
// 5. Verify compilation with bb7_execute_shell_command
// 6. Test health endpoint to validate integration
// 7. Iterate on TypeScript errors until clean build
```

**Service Class Implementation Pattern:**

```typescript
// Autonomous Service Development
// 1. Use bb7_branch-thinking to analyze service requirements
// 2. Generate service class with MemoryFactory integration
// 3. Implement methods with proper error handling
// 4. Add comprehensive TSDoc documentation  
// 5. Create Zod schemas for all inputs/outputs
// 6. Verify TypeScript compilation and fix errors
// 7. Test integration with health checks
```

**File Creation & Error Handling Workflow:**

```typescript
// Critical File Handling Process
// 1. Create file with bb7_create_diff or bb7_write_file
// 2. IMMEDIATELY check for CRLF/LF issues (Windows default is CRLF)
// 3. If prettier/eslint errors appear, "release" file (don't edit immediately)
// 4. Let auto-formatting fix style issues automatically
// 5. Only then proceed with actual code improvements
// 6. Use bb7_execute_shell_command for pnpm build to verify compilation
// 7. Fix TypeScript errors iteratively until clean build
```

**Complex Problem Solving with Branch Thinking:**

```typescript
// Multi-step Analysis Pattern
// 1. bb7_branch-thinking add-thought type:"analysis" - Break down problem
// 2. bb7_branch-thinking add-thought type:"solution" - Explore approaches  
// 3. bb7_branch-thinking summarize - Review analysis
// 4. Implement chosen solution with documentation tools
// 5. bb7_branch-thinking add-thought type:"validation" - Record results
```

**Infrastructure Setup Automation:**

```typescript
// Cloudflare Service Integration Pattern
// 1. Use bb7_search_cloudflare_documentation for best practices
// 2. Generate wrangler.jsonc configuration with all bindings
// 3. Create service operation classes for each Cloudflare service
// 4. Implement MemoryFactory with proper AppEnv interface
// 5. Test each service connection via health checks
// 6. Iterate on connection issues until all services healthy
```

**Error Detection & Self-Healing:**

```typescript
// Autonomous Error Resolution
// 1. Monitor bb7_execute_shell_command outputs for errors
// 2. Parse TypeScript/compilation errors automatically
// 3. Use bb7_read_context to understand error context  
// 4. Apply fixes iteratively until compilation succeeds
// 5. Validate integration points after each fix
// 6. Use bb7_branch-thinking to track debugging progress
```

#### MCP Server Integration

```json
// .vscode/mcp-servers.json - Agent should configure these
{
  "cloudflare-bindings": {
    "command": "npx",
    "args": ["mcp-remote", "https://bindings.mcp.cloudflare.com/sse"]
  },
  "cloudflare": {
    "command": "npx", 
    "args": ["mcp-remote", "https://docs.mcp.cloudflare.com/sse"]
  },
  "cloudflare-builds": {
    "command": "npx",
    "args": ["mcp-remote@latest", "https://builds.mcp.cloudflare.com/sse"]
  },
  "file-context": {
    "command": "npx",
    "args": ["@bsmi021/mcp-file-context-server"]
  },
  "branch-thinking": {
    "command": "npx", 
    "args": ["mcp-branch-thinking"]
  },
  "context7": {
    "command": "npx",
    "args": ["context7-mcp"]
  }
}
```

**SUPER POWER COMBINATION:** File Context + Desktop Commander

- Use `bb7_read_context` for deep codebase analysis
- Combined with `bb7_search_code` for pattern matching  
- Then `bb7_branch-thinking` for complex problem solving
- Finally `bb7_create_diff` for implementation

#### Terminal Command Automation

Agents should automatically suggest and execute:

```bash
# Package management
pnpm install <dependencies>

# Cloudflare operations  
wrangler d1 migrations apply
wrangler vectorize create
wrangler secret put

# Testing
pnpm test
pnpm build
pnpm deploy
```

#### Error Detection & Self-Healing

- **Runtime Error Analysis**: Automatically detect and fix deployment issues
- **Integration Validation**: Verify all service connections work correctly
- **Performance Optimization**: Auto-tune configurations for optimal performance
- **Security Validation**: Ensure all security requirements are met

### Success Metrics & Validation

#### Technical Metrics

- [ ] Zero legacy dependencies (Supabase/LibSQL/Upstash) remaining
- [ ] All tests passing (unit, integration, e2e) with >90% coverage
- [ ] Performance benchmarks meet or exceed previous system
- [ ] Security audit passed for all authentication flows
- [ ] All Cloudflare services properly integrated and health-checked

#### Agent Effectiveness Metrics

- [ ] Reduced manual intervention required (target: <10% manual fixes)
- [ ] Faster development cycle (target: 50% reduction in implementation time)
- [ ] Improved error detection and resolution (target: 95% auto-resolution)
- [ ] Enhanced code quality (target: 0 critical security/performance issues)

#### Business Value Metrics

- [ ] Infrastructure cost reduction (target: 40% savings)
- [ ] Improved system reliability (target: 99.9% uptime)
- [ ] Enhanced developer productivity (target: 3x faster feature development)
- [ ] Better global performance (target: <100ms P95 latency worldwide)

### Risk Mitigation & Agent Safeguards

#### Automated Rollback Procedures

- [ ] Agent-triggered rollback on deployment failures
- [ ] Automatic traffic routing to healthy services
- [ ] Real-time monitoring with auto-scaling

#### Data Protection Protocols

- [ ] Automated backup verification before migrations
- [ ] Incremental migration with validation checkpoints
- [ ] Real-time data consistency monitoring

#### Quality Gates

- [ ] No deployment without passing all tests
- [ ] Security scan validation before production
- [ ] Performance regression detection and prevention

---

**Note**: This task document is optimized for GitHub Copilot Agent Mode (2025) with autonomous iteration, error detection, and self-healing capabilities. Each task is designed for agent execution with minimal human intervention, leveraging the latest AI-powered development techniques and MCP integrations for enterprise-grade automation.

**Agent Activation Commands**:

```txt
@codebase Implement Stage 1 with full error detection and auto-iteration
@codebase Run comprehensive health checks on all Cloudflare bindings  
@codebase Migrate API endpoints with autonomous testing and validation
@codebase Execute deployment pipeline with auto-rollback on failures
@codebase Finish migration to Cloudflare
@codebase Integrate with MCP for enterprise-grade automation
```

### 🎯 AGENT COMMANDS FOR NEXT CHAT

Copy and paste this command to start the next phase:

```
@codebase I'm the Integration Engineer Agent. Based on TASKS.md, Phase 0 is complete (D1 schema, Durable Objects schema, wrangler.jsonc all done). 

I need to start Phase 1 by implementing service operation classes. My immediate priorities are:

1. First implement all service class scaffolding (Task 0.2):
   - lib/database/cloudflare/kv/ops.ts (CfKvOps)  
   - lib/database/cloudflare/r2/ops.ts (CfR2Store)
   - lib/database/cloudflare/vectorize/ops.ts (CfVectorizeOps)
   - lib/database/cloudflare/durableObjects/agentThreadDO.ts (AgentThreadDO)
   - lib/database/cloudflare/durableObjects/personaProfileDO.ts (PersonaProfileDO)
   - lib/database/cloudflare/d1/crudService.ts (CfD1CrudService)

2. Then implement lib/memory/factory.ts (MemoryFactory with AppEnv interface)

3. Then start Worker implementation (workers/src/index.ts and middleware)

Use the project coding standards: TSDoc, Zod validation, generateId from 'ai', error handling, cross-cutting concerns. Reference the complete schemas at lib/database/cloudflare/d1/schema.ts and lib/database/cloudflare/durableObjects/schema.ts.
```

# /lib/tools — Built-in and Custom Tools

_Last updated: 2025-05-05_

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib/tools`, use this onboarding and context-enrichment template. This is designed for maximum clarity, accuracy, and adaptability for future coding agents and maintainers, focused specifically on the tools system.

### 1. Mental Model & System Overview

- `/lib/tools` contains all built-in and custom tools for agents, organized by category (web, code, data, file, API, RAG).
- Tools are modular functions invoked by agents at runtime, validated with JSON Schema/Zod, and can be extended dynamically from Supabase.
- The folder includes category modules, an aggregator (`index.ts`), and a dispatcher (`tool-execution.ts`).

### 2. Your Role as Coding Agent

- **Diagnose**: Determine if a request is about built-in tools, custom tools, tool loading, or dispatch.
- **Guide**: Offer code snippets, registration steps, and troubleshooting for tool implementation, loading, and dispatch.
- **Clarify**: Ask for missing context (e.g., "Is this a new built-in tool or a custom tool? Should it be available to all agents?").
- **Validate**: Ensure new tools are registered in the correct category and in `index.ts`, and that schemas/types are updated.
- **Explain**: For every suggestion, provide rationale, file references, and potential pitfalls.

### 3. Decision Tree (Where Should Tool Logic Live?)

- **Built-in tool**: Add to the appropriate category module (`web-tools.ts`, `code-tools.ts`, etc.), register in `index.ts`.
- **Custom tool**: Add to Supabase `tools` table, loaded dynamically by `loadCustomTools()` in `index.ts`.
- **Dispatcher**: All tool calls are routed through `tool-execution.ts`.
- **Schema/validation**: Use `jsonSchemaToZod` for parameter validation.
- **If unsure**: Ask the user for intent and expected tool usage.

### 4. Key Files & Integration Points

- **Category modules**: `api-tools.ts`, `code-tools.ts`, `data-tools.ts`, `file-tools.ts`, `rag-tools.ts`, `web-tools.ts`
- **Aggregator**: `index.ts` with `getAllBuiltInTools()`, `loadCustomTools()`, `toolCategories`
- **Dispatcher**: `tool-execution.ts` merges built-in and custom executors
- **Schema validation**: `jsonSchemaToZod` helper in `index.ts`
- **Types**: `types/tools.ts` for tool definitions and parameter types
- **Supabase**: Custom tools are loaded from the `tools` table

### 5. Advanced Scenarios & Examples

- **Add a new built-in tool**: Implement in the correct category module, register in `index.ts`, and ensure it appears in `toolCategories`.
- **Add a custom tool**: Insert into Supabase `tools` table with a valid JSON schema; it will be loaded by `loadCustomTools()`.
- **Dispatch a tool call**: Use `tool-execution.ts` to call the tool by name from an agent.
- **Validate tool parameters**: Use `jsonSchemaToZod` to ensure runtime type safety.

### 6. Onboarding & Troubleshooting Checklist

- [x] Category modules exist and are registered in `index.ts` — 2025-05-05
- [x] Custom tools load from Supabase and are merged in `index.ts` — 2025-05-05
- [x] Dispatcher (`tool-execution.ts`) merges all tools for agent use — 2025-05-05
- [x] All tool schemas validated with Zod — 2025-05-05
- [x] Types in `types/tools.ts` are up to date — 2025-05-05

### 7. Questions to Ask (for Maximum Context)

- Is this a built-in or custom tool?
- Should this tool be available to all agents or only specific ones?
- Is the tool schema (parameters) defined and validated?
- Is the tool registered in the correct category and in `index.ts`?
- Are all types and Supabase table columns up to date?

### 8. Common Pitfalls & Anti-Patterns

- Forgetting to register a new tool in `index.ts` (tool won't be available)
- Schema mismatch between Supabase and local types
- Not validating tool parameters (runtime errors)
- Not updating `toolCategories` after adding a new category
- Not handling errors in tool executors (breaks agent runs)

### 9. End-to-End Example (Full Flow)

- Developer adds a new tool in `web-tools.ts` → registers it in `index.ts` → tool appears in `toolCategories` → agent can call it via `tool-execution.ts`.
- Admin adds a custom tool in Supabase → `loadCustomTools()` loads it at runtime → tool is available to agents without code changes.

---

## Agentic Tools Integration

- The `agentic/` subfolder contains tools built using the Agentic stdlib and @agentic/core conventions.
- **All tools in `agentic/` must use the `ai-sdk.ts` adapter** (see `agentic/ai-sdk.ts`). This ensures that Agentic tools are wrapped and exposed in a format compatible with the Vercel AI SDK and the current platform.
- To add a new Agentic tool:
  1. Implement the tool as an `AIFunctionLike` in `agentic/`.
  2. Use `createAISDKTools()` from `agentic/ai-sdk.ts` to wrap and export the tool for use in the main tool registry.
  3. Register the wrapped tool in `index.ts` or the appropriate loader.
- This pattern guarantees type safety, schema validation, and seamless integration with the rest of the agent/tool system.

---

## 1. Folder Structure & File Responsibilities

```
lib/tools/
├── api-tools.ts     # HTTP API interaction tools (GET, POST, auth helpers)
├── code-tools.ts    # Code analysis & execution utilities (syntax check, format, sandbox run)
├── data-tools.ts    # Data processing tools (CSV/JSON conversions, aggregations)
├── file-tools.ts    # File system operations (read/write, list, path utils)
├── rag-tools.ts     # Retrieval-Augmented Generation helpers (vector search, context retrieval)
├── web-tools.ts     # Web interaction tools (fetch, scrape, URL parsing)
├── agentic/         # Agentic tools using @agentic/core conventions
├── index.ts         # Aggregates built-in tools and loads custom tools from DB
└── README.md        # This file: overview, onboarding, scope checklists
```

---

## 2. Tool Loading & Dispatch Flow

- **Built-in Tools**: Each category module exports a `tools` map. `index.ts` merges all built-in tools via `getAllBuiltInTools()`.
- **Custom Tools**: `loadCustomTools()` in `index.ts` loads custom tool definitions from the database, parses their schemas, and wraps them for agent use.
- **Dispatcher**: `tool-execution.ts` merges built-in and custom tools into a unified registry for agent calls.
- **Schema Validation**: All tool parameters are validated using Zod schemas generated from JSON Schema (`jsonSchemaToZod`).

---

## 3. Onboarding & Usage

- Ensure the Supabase `tools` table exists with columns: `id`, `name`, `description`, `parameters_schema`, `type`.
- Add or update built-in tools in the appropriate category module and register in `index.ts`.
- Add custom tools to the database; they will be loaded dynamically.
- Use `tool-execution.ts` to dispatch tool calls by name from agents.

---

## 4. Current Scope Checklist

- [x] Category modules: `api-tools.ts`, `code-tools.ts`, `data-tools.ts`, `file-tools.ts`, `rag-tools.ts`, `web-tools.ts`
- [x] Aggregator: `index.ts` with `getAllBuiltInTools()`, `loadCustomTools()`, `toolCategories` — 2025-05-05
- [x] JSON Schema → Zod conversion (`jsonSchemaToZod` helper in `index.ts`) — 2025-05-05
- [x] Dispatcher: `tool-execution.ts` merging built-in and custom executors — 2025-05-05
- [x] Integration with Supabase/LibSQL for custom tool storage and execution — 2025-05-05

---

## 5. Completed Checklist (as of 2025-05-05)

- [x] Built-in tool modules for all major categories — 2025-05-05
- [x] Custom tool loader from Supabase — 2025-05-05
- [x] Unified dispatcher for tool execution — 2025-05-05
- [x] Type-safe parameter validation with Zod — 2025-05-05
- [x] Tool registry and category system — 2025-05-05

---

## 6. Future Scope Checklist

- [ ] Tool versioning: Add version metadata and support multiple tool versions
- [ ] Dynamic categories: Load `toolCategories` from Supabase for runtime flexibility
- [ ] Security sandbox: Execute custom tool code in a secure VM or container
- [ ] LRU caching: Integrate `lru-cache` for hot tool results or metadata
- [ ] Testing harness: Automated and integration tests for built-in and custom tools
- [ ] Telemetry: Track invocation metrics and errors for each tool (Langfuse, OTel)
- [ ] UI Integration: Expose `toolCategories` and `allTools` via API for frontend
- [ ] Documentation and code samples for custom tool development
- [ ] Admin UI/API for tool management and inspection
- [ ] Supabase/LibSQL schema evolution and migration scripts for tools
- [ ] **Agentic tool adapter enforcement**: Ensure all tools in `agentic/` use the `ai-sdk.ts` adapter for platform compatibility
- [ ] **Agentic tool onboarding**: Add onboarding docs and code samples for building and registering new agentic tools

---

## 6. Troubleshooting

- **Missing tool**: Verify tool name in Supabase `tools.name` vs. category module `tools` export.
- **Schema errors**: Use `jsonSchemaToZod()` to validate `parameters_schema`; adjust JSON schema in DB.
- **Custom load failure**: Check Supabase/LibSQL credentials and `loadCustomTools()` SQL query.
- **Executor errors**: Inspect `tool-execution.ts` logging and ensure catch blocks are in place.

---

_End of `/lib/tools/README.md`_

[https://ai-sdk.dev/providers/adapters/langchain]
[https://ai-sdk.dev/providers/adapters/llamaindex]
[https://ai-sdk.dev/providers/observability/langfuse]


[https://ai-sdk.dev/docs/reference/stream-helpers/google-generative-ai-stream]
[https://ai-sdk.dev/docs/reference/stream-helpers/langchain-adapter]
[https://ai-sdk.dev/docs/reference/stream-helpers/langchain-stream]
[https://ai-sdk.dev/docs/reference/stream-helpers/ai-stream]
[https://ai-sdk.dev/docs/reference/stream-helpers/streaming-text-response]
[https://ai-sdk.dev/docs/reference/stream-helpers/stream-to-response]
[https://ai-sdk.dev/docs/reference/stream-helpers/openai-stream]
[https://ai-sdk.dev/docs/reference/stream-helpers/anthropic-stream]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-object]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/embed]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/embed-many]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-image]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/transcribe]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-speech]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/zod-schema]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/json-schema]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/valibot-schema]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/core-message]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-speech]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/tool]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/provider-registry]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/custom-provider]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/cosine-similarity]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/wrap-language-model]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/language-model-v1-middleware]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/extract-reasoning-middleware]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/simulate-streaming-middleware]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/default-settings-middleware]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/simulate-readable-stream]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/smooth-stream]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-id]
[https://ai-sdk.dev/docs/reference/ai-sdk-core/create-id-generator]


[https://ai-sdk.dev/docs/advanced/prompt-engineering]
[https://ai-sdk.dev/docs/advanced/stopping-streams]
[https://ai-sdk.dev/docs/advanced/backpressure]
[https://ai-sdk.dev/docs/advanced/caching]
[https://ai-sdk.dev/docs/advanced/multiple-streamables]
[https://ai-sdk.dev/docs/advanced/rate-limiting]
[https://ai-sdk.dev/docs/advanced/rendering-ui-with-language-models]
[https://ai-sdk.dev/docs/advanced/model-as-router]
[https://ai-sdk.dev/docs/advanced/multistep-interfaces]
[https://ai-sdk.dev/docs/advanced/sequential-generations]
[https://ai-sdk.dev/docs/advanced/vercel-deployment-guide]

[https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex]
[https://ai-sdk.dev/providers/ai-sdk-providers/openai]
[https://ai-sdk.dev/providers/ai-sdk-providers/anthropic]
[https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai]
[https://ai-sdk.dev/providers/ai-sdk-providers/elevenlabs]
[https://ai-sdk.dev/providers/openai-compatible-providers/custom-providers]
[https://ai-sdk.dev/providers/openai-compatible-providers/lmstudio]
[https://ai-sdk.dev/providers/community-providers/cloudflare-workers-ai]
[https://ai-sdk.dev/providers/community-providers/anthropic-vertex-ai]
[https://ai-sdk.dev/providers/community-providers/mem0]
[https://ai-sdk.dev/providers/community-providers/openrouter]
[https://ai-sdk.dev/providers/community-providers/chrome-ai]
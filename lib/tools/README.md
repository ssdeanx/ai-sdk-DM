# /lib/tools — Built-in and Custom Tools

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib/tools`, use this prompt-enrichment template:

1. **Background**: This folder provides built-in tools (web, code, data, file, API, RAG) and custom tools loaded from the database.
2. **Your Role**: Offer code snippets, registration steps, and troubleshooting for tool implementation and integration.
3. **Goals**:
   - Describe the file/module responsibilities and the tool loading flow.
   - Guide adding, updating, or debugging tools with Supabase and dispatcher in mind.
   - Maintain consistency with the `ai.tool()` wrapper, JSON schema validation, and TypeScript types (`types/tools.ts`).
4. **Constraints**:
   - Avoid proposing major refactors unless requested.
   - Align examples with `tool-execution.ts` dispatcher and `index.ts` loader.
   - Keep explanations concise and focused on tool logic.
5. **Example Prompt**:
   "Show how to add a new `tools.my_new_tool` function in `lib/tools`, register it in `index.ts`, and update `tool-execution.ts` for an agent to call it."

Use this template for all code and documentation suggestions in `lib/tools`.

---

# /lib/tools — Built-in and Custom Tools

This folder houses all built-in and dynamic custom tools for AI agents in the ai-sdk-DM framework. Tools are modular, reusable functions that agents invoke at runtime to extend capabilities (web access, code execution, data processing, file ops, RAG, etc.).

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
├── index.ts         # Aggregates built-in tools and loads custom tools from DB
└── README.md        # This file: overview, onboarding, scope checklists
```

---

## 2. Tool Loading Flow

1. **Built-in Tools**:
   - `index.ts` imports each category module:
     ```ts
     import * as apiTools from "./api-tools"
     import * as codeTools from "./code-tools"
     // ...
     ```
   - `getAllBuiltInTools()` merges all category `tools` exports into a single map.
   - `toolCategories` defines UI-friendly groupings (id, name, description).

2. **Custom Tools**:
   - `loadCustomTools()` in `index.ts`:
     - Queries LibSQL `tools` table (type 'custom').
     - Parses `parameters_schema` → Zod schema via `jsonSchemaToZod()`.
     - Wraps JS code from `apps` table into safe `ai.tool()` executors.
   - Returns a map of tool name → executor for dynamic use.

3. **Dispatcher**:
   - `tool-execution.ts` imports both built-in (`index.ts`) and custom (`loadCustomTools()`), creating a unified registry for agents to call.

---

## 3. Onboarding & Getting Started

1. **Supabase Setup**:
   - Ensure `tools` table exists with columns: `id`, `name`, `description`, `parameters_schema`, `type`.
   - Insert built-in entries (optional) and custom entries as needed.
2. **Environment**:
   - Verify LibSQL memory tables available for custom tools loading.
3. **Consume in Code**:
   ```ts
   import { getAllBuiltInTools, loadCustomTools, toolCategories } from "./lib/tools/index"

   const builtIns = getAllBuiltInTools()
   const customs = await loadCustomTools()
   const allTools = { ...builtIns, ...customs }
   ```
4. **Tool Executor**:
   - Use `tool-execution.ts` or agent service to dispatch tool calls by name.

---

## 4. Current Scope Checklist

- [x] Category modules: `api-tools.ts`, `code-tools.ts`, `data-tools.ts`, `file-tools.ts`, `rag-tools.ts`, `web-tools.ts`
- [x] Aggregator: `index.ts` with `getAllBuiltInTools()`, `loadCustomTools()`, `toolCategories`
- [x] JSON Schema → Zod conversion (`jsonSchemaToZod` helper in `index.ts`)
- [x] Dispatcher: `tool-execution.ts` merging built-in and custom executors
- [x] Integration with LibSQL for custom tool storage and execution

---

## 5. Future Scope Checklist

- [ ] **Tool versioning**: Add version metadata and support multiple tool versions
- [ ] **Dynamic categories**: Load `toolCategories` from Supabase for runtime flexibility
- [ ] **Security sandbox**: Execute custom tool code in a secure VM or container
- [ ] **LRU caching**: Integrate `lru-cache` for hot tool results or metadata
- [ ] **Testing harness**: Automated tests for built-in and custom tools
- [ ] **Telemetry**: Track invocation metrics and errors for each tool
- [ ] **UI Integration**: Expose `toolCategories` and `allTools` via API for frontend

---

## 6. Troubleshooting

- **Missing tool**: Verify tool name in Supabase `tools.name` vs. category module `tools` export.
- **Schema errors**: Use `jsonSchemaToZod()` to validate `parameters_schema`; adjust JSON schema in DB.
- **Custom load failure**: Check LibSQL credentials and `loadCustomTools()` SQL query.
- **Executor errors**: Inspect `tool-execution.ts` logging and ensure catch blocks are in place.

---

## Agentic Tools AI SDK Integration

- [x] All major agentic tool files in `lib/tools/agentic` export their tools using `createAISDKTools` and are compatible with the Vercel AI SDK:
  - [x] wikipedia-client.ts
  - [x] wikidata-client.ts
  - [x] reddit-client.ts
  - [x] arxiv-client.ts
  - [x] brave-search-client.ts
  - [x] calculator.ts
  - [x] e2b.ts
  - [x] firecrawl-client.ts
  - [x] google-custom-search-client.ts
  - [x] tavily-client.ts
  - [x] polygon-client.ts
  - [x] github-client.ts
- [x] All agentic tools are re-exported in `lib/tools/agentic/index.ts`.
- [x] All agentic tools are imported and exported in `lib/tools/index.ts` as `agenticTools`.
- [x] The `agentic` category is present in `toolCategories` in `lib/tools/index.ts`.
- [x] All agentic tools are included in `getAllBuiltInTools()` and available as built-in tools.
- [x] README documents onboarding and usage for agentic tools.

You can now access all agentic tools via the `agenticTools` export in `lib/tools/index.ts` and as part of the built-in registry (`getAllBuiltInTools`).

**To add a new agentic tool:**
1. Import `createAISDKTools` from `./ai-sdk` in your tool file.
2. Export your tool as `export const <name>Tools = createAISDKTools(new <ClassName>())` or similar.
3. Ensure it is re-exported in `lib/tools/agentic/index.ts` and available in the main `lib/tools/index.ts` aggregator.

---

*End of `/lib/tools/README.md`*

# /lib/tools/agentic — Agentic Tools Integration

_Last updated: 2025-05-05_

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib/tools/agentic`, use this advanced onboarding and context-enrichment template. This is designed for maximum clarity, accuracy, and adaptability for future coding agents and maintainers, focused specifically on the agentic tools system.

### 1. Mental Model & System Overview

- `/lib/tools/agentic` contains all tools built using the Agentic stdlib and @agentic/core conventions, providing a modular, type-safe, and schema-driven toolkit for agents.
- Each toolkit (e.g., Wikipedia, Wikidata, Polygon, Firecrawl, GitHub, Google Custom Search, Brave Search, Reddit, Paginate, Utils, E2B, Arxiv, Calculator, Tavily, MCP Filesystem) is implemented as a class or function set, with strong type support and Zod schemas for validation.
- All tools in this folder must be wrapped using the `ai-sdk.ts` adapter to ensure compatibility with the Vercel AI SDK and the main platform tool registry.
- Agentic tools are defined as `AIFunctionLike` functions and exported as a compatible object using `createAISDKTools()`.
- The agentic tools system enables rapid onboarding of new APIs, robust input validation, and seamless integration with the broader agent/tool/memory ecosystem.

### 2. Your Role as Coding Agent

- **Diagnose**: Determine if a request is about building, wrapping, or registering an Agentic tool, or expanding a toolkit.
- **Guide**: Offer code snippets, onboarding steps, and troubleshooting for implementing, validating, and exposing new Agentic tools.
- **Clarify**: Ask for missing context (e.g., "Is this tool meant for all agents or a specific workflow? Should it be exposed via the main registry?").
- **Validate**: Ensure all Agentic tools are wrapped with `ai-sdk.ts`, registered in `index.ts`, and have Zod schemas for input validation.
- **Explain**: For every suggestion, provide rationale, file references, and potential pitfalls.

### 3. Decision Tree (Where Should Agentic Tool Logic Live?)

- **New API/toolkit**: Create a new client file (e.g., `wikipedia-client.ts`) and implement as `AIFunctionLike`.
- **Adapter/wrapping**: Use `createAISDKTools()` from `ai-sdk.ts` to export the tool(s).
- **Registration**: Register the wrapped tool(s) in `index.ts` for use in the main tool registry.
- **Shared logic**: Place helpers in `utils.ts` or `paginate.ts` as appropriate.
- **If unsure**: Ask the user for intent, expected usage, and integration points.

### 4. Key Files & Integration Points

- **ai-sdk.ts**: Adapter to wrap Agentic tools for the Vercel AI SDK.
- **index.ts**: Register and export all wrapped tools for use in the main tool registry.
- **Each client file**: Implements a toolkit (e.g., Wikipedia, Wikidata, Polygon, Firecrawl, GitHub, Google Custom Search, Brave Search, Reddit, Paginate, Utils, E2B, Arxiv, Calculator, Tavily, MCP Filesystem).
- **@agentic/core**: Provides stdlib, schema helpers, and type definitions.
- **Zod**: Used for input validation and schema generation.

### 5. Advanced Scenarios & Examples

- **Add a new toolkit**: Create a new client file (e.g., `arxiv-client.ts`), implement as `AIFunctionLike`, wrap with `createAISDKTools()`, and register in `index.ts`.
- **Expand an existing toolkit**: Add new tool methods with the `aiFunction` decorator, update Zod schemas, and document usage.
- **Integrate with main registry**: Ensure all agentic tools are exported from `index.ts` and available to the main platform.
- **Validate tool parameters**: Use Zod schemas for all tool inputs and outputs.
- **Paginate large results**: Use helpers from `paginate.ts` for cursor-based or infinite scroll support.

### 6. Onboarding & Troubleshooting Checklist

- [x] All client/toolkit files use `AIFunctionLike` and Zod schemas — 2025-05-05
- [x] All tools are wrapped with `createAISDKTools()` in `ai-sdk.ts` — 2025-05-05
- [x] All tools are registered in `index.ts` — 2025-05-05
- [x] Example usage is provided for at least one tool in each toolkit — 2025-05-05
- [x] Utility helpers are in `utils.ts` or `paginate.ts` — 2025-05-05

### 7. Questions to Ask (for Maximum Context)

- Is this a new toolkit or an addition to an existing one?
- Should this tool be available to all agents or only specific workflows?
- Are Zod schemas and input validation implemented?
- Is the tool registered in `index.ts` and wrapped with `ai-sdk.ts`?
- Are all types and Supabase table columns up to date (if relevant)?
- Is there example usage or documentation for the tool?

### 8. Common Pitfalls & Anti-Patterns

- Forgetting to wrap a tool with `createAISDKTools()` (tool won't be available)
- Not registering a tool in `index.ts`
- Schema mismatch or missing Zod validation (runtime errors)
- Not updating documentation or onboarding after adding new tools
- Not handling errors or edge cases in tool logic

### 9. End-to-End Example (Full Flow)

- Developer creates a new toolkit in `arxiv-client.ts` → implements tool as `AIFunctionLike` → wraps with `createAISDKTools()` in `ai-sdk.ts` → registers in `index.ts` → tool is available in the main registry and can be called by agents.

---

## 1. Folder Structure & File Responsibilities

```
lib/tools/agentic/
├── ai-sdk.ts                  # Adapter: wraps Agentic tools for Vercel AI SDK
├── index.ts                   # Exports all wrapped agentic tools
├── wikipedia-client.ts        # Wikipedia API client (search, summary)
├── wikidata-client.ts         # Wikidata API client (entity search, lookup)
├── polygon-client.ts          # Polygon.io market data client
├── firecrawl-client.ts        # Firecrawl web scraping/crawling client
├── github-client.ts           # GitHub API client
├── google-custom-search-client.ts # Google Custom Search API client
├── brave-search-client.ts     # Brave Search API client
├── brave-search.ts            # Brave Search types and schemas
├── reddit-client.ts           # Reddit API client (search, posts, comments)
├── paginate.ts                # Pagination helpers for large result sets
├── utils.ts                   # Shared utility functions for agentic tools
├── e2b-client.ts              # E2B code interpreter and execution tools
├── arxiv-client.ts            # Arxiv scientific paper search tool
├── calculator.ts              # Calculator and math utilities
├── tavily.ts                  # Tavily search tool (example usage with OpenAI)
├── mcp-filesystem.ts          # MCP Filesystem tool (example usage)
└── README.md                  # This file: onboarding, usage, and integration
```

---

## 2. Onboarding & Usage

- Implement new tools as `AIFunctionLike` using @agentic/core.
- Wrap all tools with `createAISDKTools()` in `ai-sdk.ts`.
- Export all wrapped tools in `index.ts` for use in the main tool registry.
- Register agentic tools in the main `tools/index.ts` or loader as needed.
- Each toolkit (client) should:
  - Provide Zod schemas for input validation.
  - Use the `aiFunction` decorator for tool methods.
  - Document all available tool methods and their parameters.
  - Include example usage if possible.

---

## 3. Toolkits & Task Lists

### Wikipedia Toolkit (`wikipedia-client.ts`)

- [x] Search Wikipedia pages (`wikipedia_search`)
- [x] Get Wikipedia page summary (`wikipedia_get_page_summary`)
- [ ] Add support for multilingual search and summaries
- [ ] Add more advanced page parsing (e.g., infobox extraction)
- [ ] Add example usage in `index.ts`

### Wikidata Toolkit (`wikidata-client.ts`)

- [x] Entity search and lookup
- [ ] Add support for property queries and relationships
- [ ] Add more advanced entity linking
- [ ] Add example usage in `index.ts`

### Polygon Toolkit (`polygon-client.ts`)

- [x] Ticker details, daily open/close, previous close
- [x] Technical indicators (SMA, EMA, MACD, RSI)
- [x] Ticker/news/exchange queries
- [ ] Add more endpoints (e.g., options, forex, crypto)
- [ ] Add more tool methods with `aiFunction` decorator
- [ ] Add example usage in `index.ts`

### Firecrawl Toolkit (`firecrawl-client.ts`)

- [x] Scrape URL, search, crawl, extract, check status/errors
- [ ] Add more advanced extraction and schema support
- [ ] Add more tool methods with `aiFunction` decorator
- [ ] Add example usage in `index.ts`

### GitHub Toolkit (`github-client.ts`)

- [x] Get user by username
- [ ] Add repo, issue, PR, and org queries
- [ ] Add more tool methods with `aiFunction` decorator
- [ ] Add example usage in `index.ts`

### Google Custom Search Toolkit (`google-custom-search-client.ts`)

- [x] Google Custom Search (`google_custom_search`)
- [ ] Add more advanced search options (e.g., image, news, video)
- [ ] Add example usage in `index.ts`

### Brave Search Toolkit (`brave-search-client.ts`, `brave-search.ts`)

- [x] Brave web search (`brave_search`)
- [x] Brave local search (`brave_local_search`)
- [ ] Add more endpoints (e.g., news, images)
- [ ] Add example usage in `index.ts`

### Reddit Toolkit (`reddit-client.ts`)

- [x] Reddit search, post, and comment retrieval
- [ ] Add support for subreddit analytics and trending topics
- [ ] Add more tool methods with `aiFunction` decorator
- [ ] Add example usage in `index.ts`

### Paginate Helpers (`paginate.ts`)

- [x] Pagination helpers for large result sets
- [ ] Add cursor-based and infinite scroll support
- [ ] Add example usage in `index.ts`

### Utils (`utils.ts`)

- [x] Shared utility functions for agentic tools
- [ ] Add more helpers for error handling, formatting, and logging
- [ ] Add example usage in `index.ts`

### E2B Toolkit (`e2b-client.ts`)

- [x] Code interpreter and execution tools
- [ ] Add support for more languages and sandboxes
- [ ] Add example usage in `index.ts`

### Arxiv Toolkit (`arxiv-client.ts`)

- [x] Scientific paper search and retrieval
- [ ] Add support for advanced filters and metadata
- [ ] Add example usage in `index.ts`

### Calculator Toolkit (`calculator.ts`)

- [x] Calculator and math utilities
- [ ] Add support for advanced math functions and unit conversion
- [ ] Add example usage in `index.ts`

### Tavily Toolkit (`tavily.ts`)

- [x] Example usage with OpenAI and `createAISDKTools`
- [ ] Add more tool methods and documentation

### MCP Filesystem Toolkit (`mcp-filesystem.ts`)

- [x] Example usage with MCP server and `createAISDKTools`
- [ ] Add more file operations and tool methods
- [ ] Add onboarding docs for MCP integration

---

## 4. Example: Wrapping an Agentic Tool

Suppose you have an Agentic tool defined as an `AIFunctionLike`:

```typescript
// my-agentic-tool.ts
import { AIFunction } from '@agentic/core'

export const myAgenticTool = AIFunction({
  name: 'my_agentic_tool',
  description: 'A demo agentic tool',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    // ...tool logic...
    return { result: `Echo: ${query}` }
  }
})
```

To expose this tool to the main platform:

```typescript
// index.ts (in agentic/)
import { createAISDKTools } from './ai-sdk'
import { myAgenticTool } from './my-agentic-tool'

export const agenticTools = createAISDKTools(myAgenticTool)
```

This will produce an object compatible with the Vercel AI SDK's `tools` parameter, ready for registration in the main tool registry.

---

## 5. Completed Checklist (as of 2025-05-05)

- [x] ai-sdk.ts adapter for Agentic tools — 2025-05-05
- [x] Example Agentic tool and export pattern — 2025-05-05
- [x] Integration with main tool registry — 2025-05-05
- [x] Wikipedia, Wikidata, Polygon, Firecrawl, GitHub, Google Custom Search, Brave Search, Reddit, Paginate, Utils, E2B, Arxiv, Calculator, Tavily, MCP Filesystem toolkits — 2025-05-05

---

## 6. Future Scope Checklist

- [ ] Expand each toolkit with more endpoints and tool methods
- [ ] Add onboarding docs and code samples for more advanced Agentic tools
- [ ] Telemetry and analytics for Agentic tool usage (Langfuse, OTel)
- [ ] Automated and integration tests for Agentic tools
- [ ] Admin UI/API for Agentic tool management and inspection
- [ ] Documentation and code samples for custom Agentic tool development
- [ ] Ensure all toolkits have example usage in `index.ts`
- [ ] Add more Zod schemas and input validation for all tool methods

---

_End of `/lib/tools/agentic/README.md`_

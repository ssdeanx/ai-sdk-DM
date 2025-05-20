This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where empty lines have been removed, content has been formatted for parsing in markdown style, content has been compressed (code blocks are separated by ⋮---- delimiter).

# File Summary

## Purpose

This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format

The content is organized as follows:

1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
   a. A header with the file path (## File: path/to/file)
   b. The full contents of the file in a code block

## Usage Guidelines

- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes

- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: lib/tools
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Empty lines have been removed from all files
- Content has been formatted for parsing in markdown style
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure

```
lib/tools/agentic/ai-sdk.ts
lib/tools/agentic/arxiv-client.ts
lib/tools/agentic/brave-search-client.ts
lib/tools/agentic/brave-search.ts
lib/tools/agentic/calculator.ts
lib/tools/agentic/e2b.ts
lib/tools/agentic/firecrawl-client.ts
lib/tools/agentic/github-client.ts
lib/tools/agentic/google-custom-search-client.ts
lib/tools/agentic/index.ts
lib/tools/agentic/mcp-filesystem.ts
lib/tools/agentic/paginate.ts
lib/tools/agentic/polygon-client.ts
lib/tools/agentic/README.md
lib/tools/agentic/reddit-client.ts
lib/tools/agentic/tavily-client.ts
lib/tools/agentic/utils.ts
lib/tools/agentic/wikidata-client.ts
lib/tools/agentic/wikipedia-client.ts
lib/tools/api-tools.ts
lib/tools/api/constants.ts
lib/tools/api/tools.ts
lib/tools/api/types.ts
lib/tools/code-tools.ts
lib/tools/code/constants.ts
lib/tools/code/execute-worker.ts
lib/tools/code/types.ts
lib/tools/data-tools.ts
lib/tools/data/constants.ts
lib/tools/data/tools.ts
lib/tools/data/types.ts
lib/tools/file-tools.ts
lib/tools/file/constants.ts
lib/tools/file/tools.ts
lib/tools/file/types.ts
lib/tools/graphql-tools.ts
lib/tools/graphql/constants.ts
lib/tools/graphql/tools.ts
lib/tools/graphql/types.ts
lib/tools/index.ts
lib/tools/rag-tools.ts
lib/tools/rag/constants.ts
lib/tools/rag/index.ts
lib/tools/rag/tools.ts
lib/tools/rag/types.ts
lib/tools/README.md
lib/tools/toolInitializer.ts
lib/tools/toolRegistry.ts
lib/tools/tools.json
lib/tools/upstash-tool-execution-store.ts
lib/tools/web-tools.ts
lib/tools/web/constants.ts
lib/tools/web/index.ts
lib/tools/web/tools.ts
lib/tools/web/types.ts
```

# Files

## File: lib/tools/agentic/brave-search.ts

```typescript
import { z } from 'zod'
⋮----
export type SearchParams = z.infer<typeof SearchParamsSchema>
⋮----
export type LocalSearchParams = z.infer<typeof LocalSearchParamsSchema>
export interface SearchResponse {
    web?: {
      results?: Array<{
        title: string
        description: string
        url: string
        language?: string
        published?: string
        rank?: number
      }>
    }
    locations?: {
      results?: Array<{
        id: string // Required by API
        title?: string
      }>
    }
  }
⋮----
id: string // Required by API
⋮----
export interface Location {
    id: string
    name: string
    address: {
      streetAddress?: string
      addressLocality?: string
      addressRegion?: string
      postalCode?: string
    }
    coordinates?: {
      latitude: number
      longitude: number
    }
    phone?: string
    rating?: {
      ratingValue?: number
      ratingCount?: number
    }
    openingHours?: string[]
    priceRange?: string
  }
export interface PoiResponse {
    results: Location[]
  }
export interface Description {
    descriptions: { [id: string]: string }
  }
export type LocalSearchResponse = Array<Location & { description: string }>
```

## File: lib/tools/agentic/paginate.ts

```typescript
export interface PaginateInput<T, C> {
  size: number;
  handler: (data: {
    cursor?: C;
    limit: number;
  }) => Promise<{ data: T[]; nextCursor?: C }>;
}
export async function paginate<T, C = number>(
  input: PaginateInput<T, C>
): Promise<T[]>;
```

## File: lib/tools/agentic/tavily-client.ts

```typescript
import {
  aiFunction,
  AIFunctionsProvider,
  assert,
  getEnv,
  pruneNullOrUndefined,
  throttleKy
} from '@agentic/core'
import defaultKy, { type KyInstance } from 'ky'
import pThrottle from 'p-throttle'
import { z } from 'zod'
import { createAISDKTools } from './ai-sdk'
⋮----
// Allow up to 20 requests per minute by default.
⋮----
export interface SearchOptions {
    /** Search query. (required) */
    query: string
    /**
     * The category of the search.
     * This will determine which of our agents willbe used for the search.
     * Currently, only "general" and "news" are supported.
     * Default is "general".
     */
    topic?: string
    /**
     * The depth of the search. It can be basic or advanced. Default is basic
     * for quick results and advanced for indepth high quality results but
     * longer response time. Advanced calls equals 2 requests.
     */
    search_depth?: 'basic' | 'advanced'
    /** Include a synthesized answer in the search results. Default is `false`. */
    include_answer?: boolean
    /** Include a list of query related images in the response. Default is `false`. */
    include_images?: boolean
    /** Include raw content in the search results. Default is `false`. */
    include_raw_content?: boolean
    /** The number of maximum search results to return. Default is `5`. */
    max_results?: number
    /**
     * A list of domains to specifically include in the search results.
     * Default is `undefined`, which includes all domains.
     */
    include_domains?: string[]
    /**
     * A list of domains to specifically exclude from the search results.
     * Default is `undefined`, which doesn't exclude any domains.
     */
    exclude_domains?: string[]
  }
⋮----
/** Search query. (required) */
⋮----
/**
     * The category of the search.
     * This will determine which of our agents willbe used for the search.
     * Currently, only "general" and "news" are supported.
     * Default is "general".
     */
⋮----
/**
     * The depth of the search. It can be basic or advanced. Default is basic
     * for quick results and advanced for indepth high quality results but
     * longer response time. Advanced calls equals 2 requests.
     */
⋮----
/** Include a synthesized answer in the search results. Default is `false`. */
⋮----
/** Include a list of query related images in the response. Default is `false`. */
⋮----
/** Include raw content in the search results. Default is `false`. */
⋮----
/** The number of maximum search results to return. Default is `5`. */
⋮----
/**
     * A list of domains to specifically include in the search results.
     * Default is `undefined`, which includes all domains.
     */
⋮----
/**
     * A list of domains to specifically exclude from the search results.
     * Default is `undefined`, which doesn't exclude any domains.
     */
⋮----
export interface SearchResponse {
    /** The search query. */
    query: string
    /** A list of sorted search results ranked by relevancy. */
    results: SearchResult[]
    /** The answer to your search query. */
    answer?: string
    /** A list of query related image urls. */
    images?: string[]
    /** A list of suggested research follow up questions related to original query. */
    follow_up_questions?: string[]
    /** How long it took to generate a response. */
    response_time: string
  }
⋮----
/** The search query. */
⋮----
/** A list of sorted search results ranked by relevancy. */
⋮----
/** The answer to your search query. */
⋮----
/** A list of query related image urls. */
⋮----
/** A list of suggested research follow up questions related to original query. */
⋮----
/** How long it took to generate a response. */
⋮----
export interface SearchResult {
    /** The url of the search result. */
    url: string
    /** The title of the search result page. */
    title: string
    /**
     * The most query related content from the scraped url. We use proprietary
     * AI and algorithms to extract only the most relevant content from each
     * url, to optimize for context quality and size.
     */
    content: string
    /** The parsed and cleaned HTML of the site. For now includes parsed text only. */
    raw_content?: string
    /** The relevance score of the search result. */
    score: string
  }
⋮----
/** The url of the search result. */
⋮----
/** The title of the search result page. */
⋮----
/**
     * The most query related content from the scraped url. We use proprietary
     * AI and algorithms to extract only the most relevant content from each
     * url, to optimize for context quality and size.
     */
⋮----
/** The parsed and cleaned HTML of the site. For now includes parsed text only. */
⋮----
/** The relevance score of the search result. */
⋮----
/**
 * Tavily provides a web search API tailored for LLMs.
 *
 * @see https://tavily.com
 */
export class TavilyClient extends AIFunctionsProvider
⋮----
constructor({
    apiKey = getEnv('TAVILY_API_KEY'),
    apiBaseUrl = tavily.API_BASE_URL,
    throttle = true,
    ky = defaultKy
  }: {
    apiKey?: string
    apiBaseUrl?: string
    throttle?: boolean
    ky?: KyInstance
} =
/**
   * Searches the web for pages relevant to the given query and summarizes the results.
   */
⋮----
// include_domains: z
//   .array(z.string())
//   .optional()
//   .describe(
//     'List of domains to specifically include in the search results.'
//   ),
// exclude_domains: z
//   .array(z.string())
//   .optional()
//   .describe(
//     'List of domains to specifically exclude from the search results.'
//   )
⋮----
async search(queryOrOpts: string | tavily.SearchOptions)
```

## File: lib/tools/agentic/utils.ts

```typescript
export function hasProp<T>(target: T | undefined, key: keyof T): key is keyof T;
export function getProp(
  target: unknown,
  paths: readonly (keyof any)[],
  defaultValue: any = undefined
);
export function castArray<T>(arr: T);
```

## File: lib/tools/api/constants.ts

```typescript
/**
 * @file Constants shared by the "api" tool-suite.
 */
/**
 * Default timeout for API requests in milliseconds
 */
⋮----
/**
 * Maximum timeout allowed for API requests in milliseconds
 */
⋮----
/**
 * Minimum timeout allowed for API requests in milliseconds
 */
⋮----
/**
 * Default content type for API requests
 */
⋮----
/**
 * Supported HTTP methods
 */
⋮----
/**
 * Supported authentication types
 */
⋮----
/**
 * Supported API key locations
 */
⋮----
/**
 * Maximum response size in bytes (5MB)
 */
⋮----
/**
 * OAuth grant types
 */
⋮----
/**
 * Webhook methods
 */
⋮----
/**
 * Maximum number of webhook retry attempts
 */
⋮----
/**
 * Default webhook retry count
 */
```

## File: lib/tools/api/tools.ts

```typescript
/**
 * @file Vercel AI SDK "api" tools (request, auth, graphql, websocket, webhook).
 * @remarks
 *   • Provides tools for making API requests, handling authentication, and GraphQL queries.
 *   • Includes advanced features like WebSocket connections and webhook management.
 *   • Returns discriminated-union results for exhaustive type-checking.
 *   • Fully compatible with `generateText` / `streamText`.
 */
import { tool } from 'ai';
import { z } from 'zod';
import {
  HTTP_METHODS,
  AUTH_TYPES,
  API_KEY_LOCATIONS,
  DEFAULT_TIMEOUT,
  MIN_TIMEOUT,
  MAX_TIMEOUT,
  DEFAULT_CONTENT_TYPE,
  MAX_RESPONSE_SIZE,
  OAUTH_GRANT_TYPES,
  WEBHOOK_METHODS,
  MAX_WEBHOOK_RETRIES,
  DEFAULT_WEBHOOK_RETRIES
} from './constants';
import {
  ApiRequestResult,
  ApiAuthResult,
  ApiGraphQLResult,
  ApiWebhookResult,
  ApiOAuthResult,
  ToolFailure,
} from './types';
/* ─────────────────────────────  schemas  ────────────────────────────── */
⋮----
/* ─────────────────────────  implementations  ────────────────────────── */
/**
 * Make an HTTP request to an API endpoint
 */
async function apiRequest(params: z.infer<typeof apiRequestSchema>): Promise<ApiRequestResult>
⋮----
// Create AbortController for timeout
⋮----
// Build URL with query parameters
⋮----
// Prepare request options
⋮----
// Add body for non-GET requests
⋮----
// Record start time for performance measurement
⋮----
// Make the request
⋮----
// Calculate response time
⋮----
// Check response size
⋮----
// Get response data
⋮----
/**
 * Generate authentication headers for API requests
 */
async function apiAuth(params: z.infer<typeof apiAuthSchema>): Promise<ApiAuthResult>
/**
 * Execute a GraphQL query or mutation
 */
async function apiGraphQL(params: z.infer<typeof apiGraphQLSchema>): Promise<ApiGraphQLResult>
⋮----
// Create AbortController for timeout
⋮----
// Prepare GraphQL request body
⋮----
// Prepare request options
⋮----
// Record start time for performance measurement
⋮----
// Make the request
⋮----
// Calculate response time
⋮----
// Check if response is OK
⋮----
// Parse response
⋮----
/**
 * Send a webhook to a specified endpoint
 */
async function apiWebhook(params: z.infer<typeof apiWebhookSchema>): Promise<ApiWebhookResult>
⋮----
// Create AbortController for timeout
⋮----
// Prepare webhook payload
⋮----
// Prepare request options
⋮----
// Function to make the request with retry logic
const makeRequest = async (attempt: number): Promise<Response> =>
⋮----
// Exponential backoff: 2^attempt * 100ms
⋮----
// Exponential backoff for network errors
⋮----
// Make the request with retry logic
⋮----
// Generate a unique ID for this webhook
⋮----
/**
 * Obtain an OAuth access token
 */
async function apiOAuth(params: z.infer<typeof apiOAuthSchema>): Promise<ApiOAuthResult>
⋮----
// Create AbortController for timeout
⋮----
// Prepare form data based on grant type
⋮----
// Add grant type specific parameters
⋮----
// No additional parameters needed
⋮----
// Make the request
⋮----
/* ─────────────────────────────  exports  ────────────────────────────── */
/**
 * Public "api" tools object, ready for `generateText` / `streamText`.
 */
```

## File: lib/tools/api/types.ts

```typescript
/**
 * @file Strongly-typed result shapes returned by the API tools.
 *       Provides discriminated unions and type-guards.
 */
/* ------------------------------------------------------------------ */
/*                          generic failure                           */
/* ------------------------------------------------------------------ */
export interface ToolFailure {
  success: false;
  error: string;
}
/* ------------------------------------------------------------------ */
/*                           API REQUEST                              */
/* ------------------------------------------------------------------ */
export interface ApiRequestSuccess {
  success: true;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  url: string;
  method: string;
  responseTime?: number;
}
export type ApiRequestResult = ApiRequestSuccess | ToolFailure;
export const isApiRequestSuccess = (r: ApiRequestResult): r is ApiRequestSuccess
/* ------------------------------------------------------------------ */
/*                         API AUTHENTICATION                         */
/* ------------------------------------------------------------------ */
export interface ApiAuthBasicSuccess {
  success: true;
  type: 'basic';
  headers: Record<string, string>;
}
export interface ApiAuthBearerSuccess {
  success: true;
  type: 'bearer';
  headers: Record<string, string>;
}
export interface ApiAuthApiKeyHeaderSuccess {
  success: true;
  type: 'api-key';
  headers: Record<string, string>;
}
export interface ApiAuthApiKeyQuerySuccess {
  success: true;
  type: 'api-key';
  queryParams: Record<string, string>;
}
export type ApiAuthSuccess =
  | ApiAuthBasicSuccess
  | ApiAuthBearerSuccess
  | ApiAuthApiKeyHeaderSuccess
  | ApiAuthApiKeyQuerySuccess;
export type ApiAuthResult = ApiAuthSuccess | ToolFailure;
export const isApiAuthSuccess = (r: ApiAuthResult): r is ApiAuthSuccess
/* ------------------------------------------------------------------ */
/*                           API GRAPHQL                              */
/* ------------------------------------------------------------------ */
export interface ApiGraphQLSuccess {
  success: true;
  data: any;
  errors?: any[];
  extensions?: any;
  url: string;
  responseTime?: number;
}
export type ApiGraphQLResult = ApiGraphQLSuccess | ToolFailure;
export const isApiGraphQLSuccess = (r: ApiGraphQLResult): r is ApiGraphQLSuccess
/* ------------------------------------------------------------------ */
/*                           API WEBHOOK                              */
/* ------------------------------------------------------------------ */
export interface ApiWebhookSuccess {
  success: true;
  id: string;
  url: string;
  event: string;
  createdAt: string;
  headers?: Record<string, string>;
  payload?: any;
}
export type ApiWebhookResult = ApiWebhookSuccess | ToolFailure;
export const isApiWebhookSuccess = (r: ApiWebhookResult): r is ApiWebhookSuccess
/* ------------------------------------------------------------------ */
/*                           API OAUTH                                */
/* ------------------------------------------------------------------ */
export interface ApiOAuthSuccess {
  success: true;
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  refreshToken?: string;
  scope?: string;
  createdAt: string;
}
export type ApiOAuthResult = ApiOAuthSuccess | ToolFailure;
export const isApiOAuthSuccess = (r: ApiOAuthResult): r is ApiOAuthSuccess
```

## File: lib/tools/code/constants.ts

```typescript
/**
 * @file Centralised constants that are shared by both the validation
 *       schemas (Zod) and the implementation logic.  Keeping the literals
 *       here prevents the validator and the business rules from drifting
 *       apart.
 */
⋮----
/**
 * Pre-compiled dangerous-pattern matchers (compile-once on module load).
 */
```

## File: lib/tools/code/execute-worker.ts

```typescript
/**
 * @file Worker-thread entry point for sandboxing JavaScript execution.
 *
 * @remarks
 *   The worker receives `{ code: string }` via `workerData`, executes it,
 *   captures `console` output locally, and finally posts a message back to the
 *   parent thread in the shape:
 *
 *   • `{ result: unknown; output: string[] }`  – success
 *   • `{ error: string;  output: string[] }`  – failure
 *
 *   Although safer than `eval` in the main thread, this is **NOT** a fully
 *   hardened sandbox.  For production, consider `vm2`, Docker, Firecracker,
 *   etc.
 */
import { parentPort, workerData } from 'node:worker_threads';
import { Console as NodeConsole } from 'node:console';
/* -------------------------  capture console.log  -------------------------- */
⋮----
/* Make `console` inside the user script point to our local collector. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
⋮----
/* ---------------------------  run user script  ---------------------------- */
⋮----
// eslint-disable-next-line no-new-func
```

## File: lib/tools/code/types.ts

```typescript
/**
 * @file Strongly-typed result shapes returned from the tools.
 *       Consumers can rely on discriminated unions for exhaustive
 *       switch/case handling.
 */
/* ------------------------------------------------------------------ */
/*                               Execute                              */
/* ------------------------------------------------------------------ */
/** Successful execution result. */
export interface ExecuteSuccess {
  success: true;
  /** Concatenated `stdout` captured from `console.log` calls. */
  output: string;
  /** Optional explicit return value from the executed snippet. */
  result?: string;
}
⋮----
/** Concatenated `stdout` captured from `console.log` calls. */
⋮----
/** Optional explicit return value from the executed snippet. */
⋮----
/** Failed execution result. */
export interface ExecuteFailure {
  success: false;
  /** Human-readable error message. */
  error: string;
}
⋮----
/** Human-readable error message. */
⋮----
/** Union returned by `CodeExecute`. */
export type ExecuteResult = ExecuteSuccess | ExecuteFailure;
/* ------------------------------------------------------------------ */
/*                               Analyse                              */
/* ------------------------------------------------------------------ */
export interface AnalyzeSuccess {
  language: string;
  analysisTypes: string[];
  /** Arbitrary analysis artefacts keyed by analysis type. */
  results: Record<string, unknown>;
}
⋮----
/** Arbitrary analysis artefacts keyed by analysis type. */
⋮----
export interface AnalyzeFailure {
  /** Human-readable error message. */
  error: string;
}
⋮----
/** Human-readable error message. */
⋮----
export type AnalyzeResult = AnalyzeSuccess | AnalyzeFailure;
```

## File: lib/tools/data/constants.ts

```typescript
/**
 * @file Shared literals for the “data” tool-suite.
 */
```

## File: lib/tools/data/tools.ts

```typescript
/**
 * @file CSV / JSON / YAML / XML / Markdown-table transformations, filtering
 *       and aggregation – ready for Vercel AI SDK tool-calling.
 */
import { tool } from 'ai';
import { z } from 'zod';
import {
  DELIMITERS,
  LOGICAL_OPERATORS,
  AGG_FUNCTIONS,
} from './constants';
import {
  CsvToJsonResult,
  JsonToCsvResult,
  DataFilterResult,
  DataAggregationResult,
  YamlToJsonResult,
  JsonToYamlResult,
  XmlToJsonResult,
  JsonToXmlResult,
  MdTableToJsonResult,
  JsonToMdTableResult,
  ToolFailure,
} from './types';
import yaml from 'js-yaml';
import { parseStringPromise, Builder as XmlBuilder } from 'xml2js';
import { markdownTable } from 'markdown-table';
/* ──────────────────────────────  schemas  ───────────────────────────── */
⋮----
/* ────────────────────────────  helpers  ────────────────────────────── */
const safeJsonParse = <T = unknown>(text: string): T =>
/* ─────────────────────────  implementations  ───────────────────────── */
/* ------------- CSV → JSON ------------- */
async function csvToJson(params: z.infer<typeof csvToJsonSchema>): Promise<CsvToJsonResult>
/* ------------- JSON → CSV ------------- */
async function jsonToCsv(params: z.infer<typeof jsonToCsvSchema>): Promise<JsonToCsvResult>
/* ------------- Filter ------------- */
async function dataFilter(params: z.infer<typeof dataFilterSchema>): Promise<DataFilterResult>
⋮----
// dot-notation support
⋮----
/* ------------- Aggregate ------------- */
async function dataAggregation(
  params: z.infer<typeof dataAggregationSchema>,
): Promise<DataAggregationResult>
⋮----
// Grouping
⋮----
// Aggregation
⋮----
/* ------------- YAML → JSON ------------- */
async function yamlToJson(
  params: z.infer<typeof yamlToJsonSchema>,
): Promise<YamlToJsonResult>
/* ------------- JSON → YAML ------------- */
async function jsonToYaml(
  params: z.infer<typeof jsonToYamlSchema>,
): Promise<JsonToYamlResult>
/* ------------- XML → JSON ------------- */
async function xmlToJson(
  params: z.infer<typeof xmlToJsonSchema>,
): Promise<XmlToJsonResult>
/* ------------- JSON → XML ------------- */
async function jsonToXml(
  params: z.infer<typeof jsonToXmlSchema>,
): Promise<JsonToXmlResult>
/* ------------- Markdown-table → JSON ------------- */
async function mdTableToJson(
  params: z.infer<typeof mdTableToJsonSchema>,
): Promise<MdTableToJsonResult>
⋮----
// crude table parsing (header | separator | rows…)
⋮----
/* ------------- JSON → Markdown-table ------------- */
async function jsonToMdTable(
  params: z.infer<typeof jsonToMdTableSchema>,
): Promise<JsonToMdTableResult>
/* ─────────────────────────────  exports  ───────────────────────────── */
```

## File: lib/tools/data/types.ts

```typescript
/**
 * @file Discriminated-union result shapes plus handy type-guards for the
 *       CSV/JSON transformation & analytics tools.
 */
/* ------------------------------------------------------------------ */
/*                             Failure                                */
/* ------------------------------------------------------------------ */
export interface ToolFailure {
  success: false;
  error: string;
}
/* ------------------------------------------------------------------ */
/*                           CSV  ↔  JSON                             */
/* ------------------------------------------------------------------ */
export interface CsvToJsonSuccess {
  success: true;
  data: Record<string, string>[];
  rowCount: number;
  columnCount: number;
}
export type CsvToJsonResult = CsvToJsonSuccess | ToolFailure;
export const isCsvToJsonSuccess = (r: CsvToJsonResult): r is CsvToJsonSuccess
export interface JsonToCsvSuccess {
  success: true;
  csv: string;
  rowCount: number;
  columnCount: number;
}
export type JsonToCsvResult = JsonToCsvSuccess | ToolFailure;
export const isJsonToCsvSuccess = (r: JsonToCsvResult): r is JsonToCsvSuccess
/* ------------------------------------------------------------------ */
/*                               Filter                               */
/* ------------------------------------------------------------------ */
export interface DataFilterSuccess {
  success: true;
  data: unknown[];
  count: number;
  originalCount: number;
}
export type DataFilterResult = DataFilterSuccess | ToolFailure;
export const isDataFilterSuccess = (
  r: DataFilterResult,
): r is DataFilterSuccess
/* ------------------------------------------------------------------ */
/*                             Aggregate                              */
/* ------------------------------------------------------------------ */
export interface DataAggregationSuccess {
  success: true;
  data: Record<string, unknown>[];
  groupCount: number;
}
export type DataAggregationResult = DataAggregationSuccess | ToolFailure;
export const isDataAggregationSuccess = (
  r: DataAggregationResult,
): r is DataAggregationSuccess
/* ------------------------------------------------------------------ */
/*                          YAML  ↔  JSON                             */
/* ------------------------------------------------------------------ */
export interface YamlToJsonSuccess {
  success: true;
  data: unknown;
}
export type YamlToJsonResult = YamlToJsonSuccess | ToolFailure;
export const isYamlToJsonSuccess = (
  r: YamlToJsonResult,
): r is YamlToJsonSuccess
export interface JsonToYamlSuccess {
  success: true;
  yaml: string;
}
export type JsonToYamlResult = JsonToYamlSuccess | ToolFailure;
export const isJsonToYamlSuccess = (
  r: JsonToYamlResult,
): r is JsonToYamlSuccess
/* ------------------------------------------------------------------ */
/*                          XML  ↔  JSON                              */
/* ------------------------------------------------------------------ */
export interface XmlToJsonSuccess {
  success: true;
  data: unknown;
}
export type XmlToJsonResult = XmlToJsonSuccess | ToolFailure;
export const isXmlToJsonSuccess = (r: XmlToJsonResult): r is XmlToJsonSuccess
export interface JsonToXmlSuccess {
  success: true;
  xml: string;
}
export type JsonToXmlResult = JsonToXmlSuccess | ToolFailure;
export const isJsonToXmlSuccess = (r: JsonToXmlResult): r is JsonToXmlSuccess
/* ------------------------------------------------------------------ */
/*                      Markdown-table  ↔  JSON                       */
/* ------------------------------------------------------------------ */
export interface MdTableToJsonSuccess {
  success: true;
  rows: Record<string, string>[];
}
export type MdTableToJsonResult = MdTableToJsonSuccess | ToolFailure;
export const isMdTableToJsonSuccess = (
  r: MdTableToJsonResult,
): r is MdTableToJsonSuccess
export interface JsonToMdTableSuccess {
  success: true;
  markdown: string;
}
export type JsonToMdTableResult = JsonToMdTableSuccess | ToolFailure;
export const isJsonToMdTableSuccess = (
  r: JsonToMdTableResult,
): r is JsonToMdTableSuccess
```

## File: lib/tools/file/constants.ts

```typescript
/**
 * @file Constants shared by the “file” tool-suite.
 */
⋮----
/**
 * Absolute folder inside which every file operation **must** remain.
 * You can override the default via `FILE_ROOT` environment variable.
 */
```

## File: lib/tools/file/tools.ts

```typescript
/**
 * @file Vercel AI SDK “file” tools (read, write, list, info).
 * @remarks
 *   • Every path is resolved *within* `FILE_ROOT` to block path-traversal.
 *   • Returns discriminated-union results for exhaustive type-checking.
 *   • Fully compatible with `generateText` / `streamText`.
 */
import { tool } from 'ai';
import { z } from 'zod';
⋮----
import { ENCODINGS, FILE_ROOT } from './constants';
import {
  FileReadResult,
  FileWriteResult,
  FileListResult,
  FileInfoResult,
  ToolFailure,
} from './types';
/* ─────────────────────────────  helpers  ────────────────────────────── */
/**
 * Resolve a user-supplied path **inside** `FILE_ROOT`.
 * @throws if the resolved path escapes the root.
 */
function resolveWithinRoot(userPath: string): string
async function exists(p: string): Promise<boolean>
/* ─────────────────────────────  schemas  ────────────────────────────── */
⋮----
/* ─────────────────────────  implementations  ────────────────────────── */
/**
 * Read a file.
 */
async function fileRead(params: z.infer<typeof fileReadSchema>): Promise<FileReadResult>
/**
 * Write or append to a file.
 */
async function fileWrite(params: z.infer<typeof fileWriteSchema>): Promise<FileWriteResult>
/**
 * List files in a directory.
 */
async function fileList(params: z.infer<typeof fileListSchema>): Promise<FileListResult>
⋮----
const walk = async (d: string): Promise<string[]> =>
⋮----
/**
 * Get detailed information about a single file.
 */
async function fileInfo(params: z.infer<typeof fileInfoSchema>): Promise<FileInfoResult>
/* ─────────────────────────────  exports  ────────────────────────────── */
/**
 * Public “file” tools object, ready for `generateText` / `streamText`.
 */
```

## File: lib/tools/file/types.ts

```typescript
/**
 * @file Strongly-typed result shapes returned by the file tools.
 *       Provides discriminated unions **and** handy type-guards.
 */
/* ------------------------------------------------------------------ */
/*                          generic failure                           */
/* ------------------------------------------------------------------ */
export interface ToolFailure {
  success: false;
  error: string;
}
/* ------------------------------------------------------------------ */
/*                               READ                                 */
/* ------------------------------------------------------------------ */
export interface FileReadSuccess {
  success: true;
  filePath: string;
  content: string;
  encoding: BufferEncoding;
}
export type FileReadResult = FileReadSuccess | ToolFailure;
export const isFileReadSuccess = (r: FileReadResult): r is FileReadSuccess
/* ------------------------------------------------------------------ */
/*                               WRITE                                */
/* ------------------------------------------------------------------ */
export interface FileWriteSuccess {
  success: true;
  filePath: string;
  operation: 'write' | 'append';
}
export type FileWriteResult = FileWriteSuccess | ToolFailure;
export const isFileWriteSuccess = (r: FileWriteResult): r is FileWriteSuccess
/* ------------------------------------------------------------------ */
/*                               LIST                                 */
/* ------------------------------------------------------------------ */
export interface FileListSuccess {
  success: true;
  directoryPath: string;
  files: Array<{ path: string; name: string; extension: string }>;
  count: number;
}
export type FileListResult = FileListSuccess | ToolFailure;
export const isFileListSuccess = (r: FileListResult): r is FileListSuccess
/* ------------------------------------------------------------------ */
/*                               INFO                                 */
/* ------------------------------------------------------------------ */
export interface FileInfoSuccess {
  success: true;
  filePath: string;
  name: string;
  directory: string;
  extension: string;
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  created: Date;
  modified: Date;
  accessed: Date;
}
export type FileInfoResult = FileInfoSuccess | ToolFailure;
export const isFileInfoSuccess = (r: FileInfoResult): r is FileInfoSuccess
```

## File: lib/tools/graphql-tools.ts

```typescript
/**
 * @file Back-compat barrel.  Keep existing imports working.
 */
import { tools as gqlTools } from './graphql/tools';
```

## File: lib/tools/graphql/constants.ts

```typescript
/**
 * @file Shared literals for the GraphQL tool-suite.
 */
```

## File: lib/tools/graphql/tools.ts

```typescript
/**
 * @file Supabase GraphQL query tool with optional LibSQL + Vector
 *       caching.  Ready for Vercel AI SDK tool-calling.
 */
import { tool } from 'ai';
import { z } from 'zod';
import { request, Variables, gql, GraphQLClient, ClientError } from 'graphql-request';
import { eq } from 'drizzle-orm';
import * as libsqlSchema from '@/db/libsql/schema';     // sqlite
import * as pgSchema from '@/db/supabase/schema';       // postgres
import { getLibSQLClient } from '@/lib/memory/db';      // existing helper
import { getDrizzleClient as getPgDrizzle } from '@/lib/memory/supabase'; // pg
import { storeTextEmbedding } from '@/lib/memory/vector-store';
import {
  GqlQueryResult,
  ToolFailure
} from './types';
import { DEFAULT_SUPABASE_GRAPHQL_URL, DEFAULT_HEADERS, DATABASE_URL } from './constants';
const TTL_MIN = 60; // Cache Time-To-Live in minutes (e.g., 1 hour)
/* ── Zod Schema ───────────────────────────────────────────────────── */
⋮----
/* ── Helper: LibSQL upsert ─────────────────────────────────────────── */
async function cacheInLibSQL(
  query: string,
  variables: Variables | undefined,
  json: string,
): Promise<void>
⋮----
/* id */ `${query}:${JSON.stringify(variables)}`,
⋮----
/**
 * Execute a GraphQL query with caching support
 *
 * @param params - Query parameters
 * @returns Query result or error
 */
async function gqlQuery(
  params: z.infer<typeof gqlQuerySchema>,
): Promise<GqlQueryResult>
⋮----
/* ---------- 1.  try Supabase cache first ------------- */
⋮----
// Convert createdAt to Date safely
⋮----
/* ---------- 2.  perform real network request --------------- */
⋮----
// Cache in Supabase
⋮----
createdAt: new Date(), // Use Date object directly
⋮----
// Also store in vector store for semantic search
⋮----
// Optionally cache in LibSQL too
⋮----
/* ── export for AI SDK ─────────────────────────────────────────────── */
```

## File: lib/tools/graphql/types.ts

```typescript
/**
 * @file Discriminated-union results + type-guards for GraphQL tools.
 */
export interface ToolFailure {
  success: false;
  error: string;
}
export interface GqlQuerySuccess {
  success: true;
  query: string;
  variables?: Record<string, unknown>;
  data: unknown;
}
export type GqlQueryResult = GqlQuerySuccess | ToolFailure;
export const isGqlQuerySuccess = (
  r: GqlQueryResult,
): r is GqlQuerySuccess
```

## File: lib/tools/rag/index.ts

```typescript
/**
 * @file Barrel file for RAG tools.
 */
```

## File: lib/tools/rag/types.ts

```typescript
/**
 * @file Discriminated-union result shapes + handy type-guards for the RAG tools.
 */
import { VECTOR_PROVIDERS, CHUNKING_STRATEGIES, SIMILARITY_METRICS } from './constants';
/* ------------------------------------------------------------------ */
/*                             Failure                                */
/* ------------------------------------------------------------------ */
export interface ToolFailure {
  success: false;
  error: string;
}
/* ------------------------------------------------------------------ */
/*                         DocumentSearch                             */
/* ------------------------------------------------------------------ */
export interface DocumentSearchItem {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  similarity: number;
}
export interface DocumentSearchSuccess {
  success: true;
  query: string;
  results: DocumentSearchItem[];
}
export type DocumentSearchResult = DocumentSearchSuccess | ToolFailure;
export const isDocumentSearchSuccess = (r: DocumentSearchResult): r is DocumentSearchSuccess
/* ------------------------------------------------------------------ */
/*                          DocumentAdd                               */
/* ------------------------------------------------------------------ */
export interface DocumentAddSuccess {
  success: true;
  documentId: string;
  title: string;
}
export type DocumentAddResult = DocumentAddSuccess | ToolFailure;
export const isDocumentAddSuccess = (r: DocumentAddResult): r is DocumentAddSuccess
/* ------------------------------------------------------------------ */
/*                          ChunkDocument                             */
/* ------------------------------------------------------------------ */
export interface DocumentChunk {
  id: string;
  content: string;
  metadata: Record<string, any>;
}
export interface ChunkDocumentSuccess {
  success: true;
  documentId: string;
  chunks: DocumentChunk[];
}
export type ChunkDocumentResult = ChunkDocumentSuccess | ToolFailure;
export const isChunkDocumentSuccess = (r: ChunkDocumentResult): r is ChunkDocumentSuccess
/* ------------------------------------------------------------------ */
/*                       VectorStoreUpsert                            */
/* ------------------------------------------------------------------ */
export interface VectorStoreUpsertSuccess {
  success: true;
  ids: string[];
  provider: typeof VECTOR_PROVIDERS[number];
}
export type VectorStoreUpsertResult = VectorStoreUpsertSuccess | ToolFailure;
export const isVectorStoreUpsertSuccess = (r: VectorStoreUpsertResult): r is VectorStoreUpsertSuccess
/* ------------------------------------------------------------------ */
/*                       VectorStoreQuery                             */
/* ------------------------------------------------------------------ */
export interface VectorStoreQueryItem {
  id: string;
  metadata: Record<string, any>;
  score: number;
}
export interface VectorStoreQuerySuccess {
  success: true;
  query: string;
  results: VectorStoreQueryItem[];
  provider: typeof VECTOR_PROVIDERS[number];
}
export type VectorStoreQueryResult = VectorStoreQuerySuccess | ToolFailure;
export const isVectorStoreQuerySuccess = (r: VectorStoreQueryResult): r is VectorStoreQuerySuccess
```

## File: lib/tools/web/constants.ts

```typescript
/**
 * @file Shared literals & utility constants for the “web” tool-suite.
 */
⋮----
/**
 * User-Agent string sent with every outbound request.  Feel free to tweak /
 * replace with your product name.
 */
```

## File: lib/tools/web/index.ts

```typescript
/**
 * @file Barrel file for web tools.
 */
```

## File: lib/tools/web/tools.ts

```typescript
/**
 * @file Web-oriented tools (search, extract, scrape) for the Vercel AI SDK.
 *
 * @remarks
 *   • Uses the built-in `fetch` (Node ≥ 18) – no external HTTP client needed.
 *   • DOM parsing is done via `cheerio` – install with: `npm i cheerio`.
 *   • Each tool returns a discriminated union (`success: true | false`) that
 *     matches the shapes in `lib/tools/web/types.ts`.
 */
import { tool } from 'ai';
import { z } from 'zod';
⋮----
import { MAX_RESULTS, DEFAULT_UA } from './constants';
import {
  WebSearchResult,
  WebExtractResult,
  WebScrapeResult,
  ToolFailure,
} from './types';
/* ───────────────────────────────  schemas  ─────────────────────────────── */
⋮----
/* ────────────────────────────  helpers  ──────────────────────────────── */
/** Abort fetch after 10 s to avoid hanging requests. */
⋮----
/**
 * Fetch raw HTML with UA header, timeout and a single retry on network errors.
 */
const getHtml = async (url: string): Promise<string> =>
⋮----
const attempt = async (): Promise<string> =>
⋮----
/* one retry for transient network errors */
⋮----
/** Collapse repeated whitespace & trim long strings. */
const clean = (txt: string, max = 2_000): string
/* ────────────────────────────  executions  ───────────────────────────── */
/**
 * Light-weight search hitting DuckDuckGo’s HTML endpoint.
 * No API-key required (HTML output can change any time).
 */
async function webSearch(params: z.infer<typeof webSearchSchema>): Promise<WebSearchResult>
⋮----
if (results.length >= numResults) return false; // break
⋮----
/**
 * Fetch a page & optionally extract a specific selector’s text.
 */
async function webExtract(
  params: z.infer<typeof webExtractSchema>,
): Promise<WebExtractResult>
⋮----
? clean($(selector).first().text()) // if selector missing → empty string
⋮----
/**
 * Extract multiple selectors in a single request.
 */
async function webScrape(
  params: z.infer<typeof webScrapeSchema>,
): Promise<WebScrapeResult>
/* ─────────────────────────────  exports  ────────────────────────────── */
```

## File: lib/tools/web/types.ts

```typescript
/**
 * @file Discriminated-union result shapes + handy type-guards for the web tools.
 */
/* ------------------------------------------------------------------ */
/*                             Failure                                */
/* ------------------------------------------------------------------ */
export interface ToolFailure {
    success: false;
    error: string;
  }
/* ------------------------------------------------------------------ */
/*                            WebSearch                               */
/* ------------------------------------------------------------------ */
export interface WebSearchItem {
    title: string;
    snippet: string;
    url: string;
  }
export interface WebSearchSuccess {
    success: true;
    query: string;
    totalResults: number;
    results: WebSearchItem[];
  }
export type WebSearchResult = WebSearchSuccess | ToolFailure;
export const isWebSearchSuccess = (r: WebSearchResult): r is WebSearchSuccess
/* ------------------------------------------------------------------ */
/*                            WebExtract                              */
/* ------------------------------------------------------------------ */
export interface WebExtractSuccess {
  success: true;
  url: string;
  title: string;
  content: string;
}
export type WebExtractResult = WebExtractSuccess | ToolFailure;
export const isWebExtractSuccess = (r: WebExtractResult): r is WebExtractSuccess
/* ------------------------------------------------------------------ */
/*                             WebScrape                              */
/* ------------------------------------------------------------------ */
export interface WebScrapeSuccess {
  success: true;
  url: string;
  data: Record<string, string>;
}
export type WebScrapeResult = WebScrapeSuccess | ToolFailure;
export const isWebScrapeSuccess = (r: WebScrapeResult): r is WebScrapeSuccess
```

## File: lib/tools/agentic/ai-sdk.ts

```typescript
import {
  type AIFunctionLike,
  AIFunctionSet,
  asAgenticSchema,
  isZodSchema,
} from '@agentic/core';
import { jsonSchema, tool } from 'ai';
/**
 * Converts a set of Agentic stdlib AI functions to an object compatible with
 * the Vercel AI SDK's `tools` parameter.
 */
export function createAISDKTools(...aiFunctionLikeTools: AIFunctionLike[]);
```

## File: lib/tools/agentic/arxiv-client.ts

```typescript
import {
  aiFunction,
  AIFunctionsProvider,
  pruneEmpty,
  sanitizeSearchParams
} from '@agentic/core'
import { XMLParser } from 'fast-xml-parser'
import defaultKy, { type KyInstance } from 'ky'
import { z } from 'zod'
import { castArray, getProp } from './utils'
import { createAISDKTools } from './ai-sdk'
⋮----
export type ValueOf<T extends NonNullable<unknown>> = T[keyof T]
⋮----
export interface ArXivResponse {
    totalResults: number
    startIndex: number
    itemsPerPage: number
    entries: {
      id: string
      title: string
      summary: string
      published: string
      updated: string
      authors: { name: string; affiliation: string[] }[]
      doi: string
      comment: string
      journalReference: string
      primaryCategory: string
      categories: string[]
      links: string[]
    }[]
  }
export const extractId = (value: string)
⋮----
export type SearchParams = z.infer<typeof SearchParamsSchema>
⋮----
/**
 * Lightweight wrapper around ArXiv for academic / scholarly research articles.
 *
 * @see https://arxiv.org
 */
export class ArXivClient extends AIFunctionsProvider
⋮----
constructor({
    apiBaseUrl = arxiv.API_BASE_URL,
    ky = defaultKy
  }: {
    apiKey?: string
    apiBaseUrl?: string
    ky?: KyInstance
})
/**
   * Searches for research articles published on arXiv.
   */
⋮----
async search(queryOrOpts: string | arxiv.SearchParams)
```

## File: lib/tools/agentic/brave-search-client.ts

```typescript
import {
  aiFunction,
  AIFunctionsProvider,
  assert,
  getEnv,
  sanitizeSearchParams
} from '@agentic/core'
import defaultKy, { type KyInstance } from 'ky'
import { bravesearch } from './brave-search'
import { createAISDKTools } from './ai-sdk'
/**
 * Agentic client for the Brave search engine.
 *
 * @see https://brave.com/search/api
 */
export class BraveSearchClient extends AIFunctionsProvider
⋮----
constructor({
    apiKey = getEnv('BRAVE_SEARCH_API_KEY'),
    apiBaseUrl = bravesearch.apiBaseUrl,
    ky = defaultKy
  }: {
    apiKey?: string
    apiBaseUrl?: string
    ky?: KyInstance
} =
/**
   * Brave web search.
   */
⋮----
async search(
    queryOrParams: string | bravesearch.SearchParams
): Promise<bravesearch.SearchResponse>
/**
   * Brave local search for businesses and places.
   */
⋮----
async localSearch(
    queryOrParams: string | bravesearch.LocalSearchParams
): Promise<bravesearch.LocalSearchResponse | bravesearch.SearchResponse>
⋮----
// Get POI details and descriptions in parallel
⋮----
async getPoisData(ids: string[]): Promise<bravesearch.PoiResponse>
async getDescriptionsData(ids: string[]): Promise<bravesearch.Description>
```

## File: lib/tools/agentic/calculator.ts

```typescript
import { createAIFunction } from '@agentic/core'
import { evaluate } from 'mathjs'
import { z } from 'zod'
import { createAISDKTools } from './ai-sdk'
// TODO: ensure `expr` is sanitized to not run arbitrary code
⋮----
export type CalculatorInput = z.infer<typeof CalculatorInputSchema>
```

## File: lib/tools/agentic/e2b.ts

```typescript
import { createAIFunction, getEnv } from '@agentic/core';
import { Sandbox } from '@e2b/code-interpreter';
import { z } from 'zod';
import { createAISDKTools } from './ai-sdk';
/**
 * E2B Python code interpreter sandbox.
 *
 * @see https://e2b.dev
 */
```

## File: lib/tools/agentic/firecrawl-client.ts

```typescript
import {
  aiFunction,
  AIFunctionsProvider,
  assert,
  getEnv,
  throttleKy,
  zodToJsonSchema
} from '@agentic/core'
import defaultKy, { type KyInstance } from 'ky'
import pThrottle from 'p-throttle'
import { z } from 'zod'
import { createAISDKTools } from './ai-sdk'
⋮----
// Allow up to 50 request per minute by default.
⋮----
/**
   * Configuration interface for FirecrawlClient.
   */
export interface ClientConfig {
    apiKey?: string
    apiBaseUrl?: string
  }
/**
   * Metadata for a Firecrawl document.
   */
export interface DocumentMetadata {
    title?: string
    description?: string
    language?: string
    keywords?: string
    robots?: string
    ogTitle?: string
    ogDescription?: string
    ogUrl?: string
    ogImage?: string
    ogAudio?: string
    ogDeterminer?: string
    ogLocale?: string
    ogLocaleAlternate?: string[]
    ogSiteName?: string
    ogVideo?: string
    dctermsCreated?: string
    dcDateCreated?: string
    dcDate?: string
    dctermsType?: string
    dcType?: string
    dctermsAudience?: string
    dctermsSubject?: string
    dcSubject?: string
    dcDescription?: string
    dctermsKeywords?: string
    modifiedTime?: string
    publishedTime?: string
    articleTag?: string
    articleSection?: string
    sourceURL?: string
    statusCode?: number
    error?: string
    [key: string]: any
  }
/**
   * Document interface for Firecrawl.
   */
export interface Document<
    T = any,
    ActionsSchema extends ActionsResult | never = never
  > {
    url?: string
    markdown?: string
    html?: string
    rawHtml?: string
    links?: string[]
    extract?: T
    json?: T
    screenshot?: string
    metadata?: DocumentMetadata
    actions: ActionsSchema
    title?: string
    description?: string
  }
/**
   * Parameters for scraping operations.
   * Defines the options and configurations available for scraping web content.
   */
export interface ScrapeOptions {
    formats?: (
      | 'markdown'
      | 'html'
      | 'rawHtml'
      | 'content'
      | 'links'
      | 'screenshot'
      | 'screenshot@fullPage'
      | 'extract'
      | 'json'
    )[]
    headers?: Record<string, string>
    includeTags?: string[]
    excludeTags?: string[]
    onlyMainContent?: boolean
    waitFor?: number
    timeout?: number
    location?: {
      country?: string
      languages?: string[]
    }
    mobile?: boolean
    skipTlsVerification?: boolean
    removeBase64Images?: boolean
    blockAds?: boolean
    proxy?: 'basic' | 'stealth'
  }
/**
   * Parameters for scraping operations.
   */
export interface ScrapeParams<
    LLMSchema extends z.ZodSchema = any,
    ActionsSchema extends Action[] | undefined = undefined
  > {
    formats?: (
      | 'markdown'
      | 'html'
      | 'rawHtml'
      | 'content'
      | 'links'
      | 'screenshot'
      | 'screenshot@fullPage'
      | 'extract'
      | 'json'
    )[]
    headers?: Record<string, string>
    includeTags?: string[]
    excludeTags?: string[]
    onlyMainContent?: boolean
    waitFor?: number
    timeout?: number
    location?: {
      country?: string
      languages?: string[]
    }
    mobile?: boolean
    skipTlsVerification?: boolean
    removeBase64Images?: boolean
    blockAds?: boolean
    proxy?: 'basic' | 'stealth'
    extract?: {
      prompt?: string
      schema?: LLMSchema
      systemPrompt?: string
    }
    jsonOptions?: {
      prompt?: string
      schema?: LLMSchema
      systemPrompt?: string
    }
    actions?: ActionsSchema
  }
export type Action =
    | {
        type: 'wait'
        milliseconds?: number
        selector?: string
      }
    | {
        type: 'click'
        selector: string
      }
    | {
        type: 'screenshot'
        fullPage?: boolean
      }
    | {
        type: 'write'
        text: string
      }
    | {
        type: 'press'
        key: string
      }
    | {
        type: 'scroll'
        direction?: 'up' | 'down'
        selector?: string
      }
    | {
        type: 'scrape'
      }
    | {
        type: 'executeJavascript'
        script: string
      }
export interface ActionsResult {
    screenshots: string[]
  }
/**
   * Response interface for scraping operations.
   */
export interface ScrapeResponse<
    LLMResult = any,
    ActionsSchema extends ActionsResult | never = never
  > extends Document<LLMResult, ActionsSchema> {
    success: true
    warning?: string
    error?: string
  }
/**
   * Parameters for search operations.
   */
export interface SearchParams {
    limit?: number
    tbs?: string
    filter?: string
    lang?: string
    country?: string
    location?: string
    origin?: string
    timeout?: number
    scrapeOptions?: ScrapeParams
  }
/**
   * Response interface for search operations.
   */
export interface SearchResponse {
    success: boolean
    data: Document[]
    warning?: string
    error?: string
  }
/**
   * Parameters for crawling operations.
   */
export interface CrawlParams {
    includePaths?: string[]
    excludePaths?: string[]
    maxDepth?: number
    maxDiscoveryDepth?: number
    limit?: number
    allowBackwardLinks?: boolean
    allowExternalLinks?: boolean
    ignoreSitemap?: boolean
    scrapeOptions?: ScrapeParams
    webhook?:
      | string
      | {
          url: string
          headers?: Record<string, string>
          metadata?: Record<string, string>
          events?: ['completed', 'failed', 'page', 'started'][number][]
        }
    deduplicateSimilarURLs?: boolean
    ignoreQueryParameters?: boolean
    regexOnFullURL?: boolean
  }
/**
   * Response interface for crawling operations.
   */
export interface CrawlResponse {
    id?: string
    url?: string
    success: true
    error?: string
  }
/**
   * Response interface for job status checks.
   */
export interface CrawlStatusResponse {
    success: true
    status: 'scraping' | 'completed' | 'failed' | 'cancelled'
    completed: number
    total: number
    creditsUsed: number
    expiresAt: Date
    next?: string
    data: Document[]
  }
/**
   * Response interface for crawl errors.
   */
export interface CrawlErrorsResponse {
    errors: {
      id: string
      timestamp?: string
      url: string
      error: string
    }[]
    robotsBlocked: string[]
  }
/**
   * Error response interface.
   */
export interface ErrorResponse {
    success: false
    error: string
  }
/**
   * Custom error class for Firecrawl.
   */
export class FirecrawlError extends Error
⋮----
constructor(message: string, statusCode: number, details?: any)
⋮----
/**
   * Parameters for extracting information from URLs.
   */
export interface ExtractParams<T extends z.ZodSchema = any> {
    prompt: string
    schema?: T
    enableWebSearch?: boolean
    ignoreSitemap?: boolean
    includeSubdomains?: boolean
    showSources?: boolean
    scrapeOptions?: ScrapeOptions
  }
/**
   * Response interface for extracting information from URLs.
   * Defines the structure of the response received after extracting information from URLs.
   */
export interface ExtractResponse<T = any> {
    success: boolean
    id?: string
    data: T
    error?: string
    warning?: string
    sources?: string[]
  }
/**
   * Response interface for extract status operations.
   */
export interface ExtractStatusResponse<T = any> {
    success: boolean
    status: 'processing' | 'completed' | 'failed'
    data?: T
    error?: string
    expiresAt?: string
  }
/**
   * Parameters for LLMs.txt generation operations.
   */
export interface GenerateLLMsTextParams {
    /**
     * Maximum number of URLs to process (1-100)
     * @default 10
     */
    maxUrls?: number
    /**
     * Whether to show the full LLMs-full.txt in the response
     * @default false
     */
    showFullText?: boolean
  }
⋮----
/**
     * Maximum number of URLs to process (1-100)
     * @default 10
     */
⋮----
/**
     * Whether to show the full LLMs-full.txt in the response
     * @default false
     */
⋮----
/**
   * Response interface for LLMs.txt generation operations.
   */
export interface GenerateLLMsTextResponse {
    success: boolean
    id: string
  }
/**
   * Status response interface for LLMs.txt generation operations.
   */
export interface GenerateLLMsTextStatusResponse {
    success: boolean
    data: {
      llmstxt: string
      llmsfulltxt?: string
    }
    status: 'processing' | 'completed' | 'failed'
    error?: string
    expiresAt: string
  }
⋮----
/**
 * Turn websites into LLM-ready data. Crawl and convert any website into clean
 * markdown or structured data.
 *
 * @see https://www.firecrawl.dev
 * @see https://github.com/mendableai/firecrawl
 */
export class FirecrawlClient extends AIFunctionsProvider
⋮----
constructor({
    apiKey = getEnv('FIRECRAWL_API_KEY'),
    apiBaseUrl = getEnv('FIRECRAWL_API_BASE_URL') ?? firecrawl.BASE_URL,
    throttle = true,
    timeoutMs = 60_000,
    ky = defaultKy
  }: {
    apiKey?: string
    apiBaseUrl?: string
    throttle?: boolean
    timeoutMs?: number
    ky?: KyInstance
} =
/**
   * Scrape the contents of a URL.
   */
⋮----
async scrapeUrl<
    T extends z.ZodSchema,
    ActionsSchema extends firecrawl.Action[] | undefined = undefined
  >(
    orlOrOpts:
      | string
      | ({ url: string } & firecrawl.ScrapeParams<T, ActionsSchema>)
  ): Promise<
    | firecrawl.ScrapeResponse<
        z.infer<T>,
        ActionsSchema extends firecrawl.Action[]
          ? firecrawl.ActionsResult
          : never
      >
    | firecrawl.ErrorResponse
  > {
    const { url, ...params } =
      typeof orlOrOpts === 'string' ? { url: orlOrOpts } : orlOrOpts
    let jsonData: any = { url, ...params }
if (jsonData?.extract?.schema)
/**
   * Searches using the Firecrawl API.
   */
⋮----
async search(
    queryOrOpts: string | ({ query: string } & firecrawl.SearchParams)
): Promise<firecrawl.SearchResponse>
/**
   * Initiates a crawl job for a URL.
   */
⋮----
async crawlUrl(
    urlOrOpts: string | ({ url: string } & firecrawl.CrawlParams)
): Promise<firecrawl.CrawlResponse | firecrawl.ErrorResponse>
/**
   * Checks the status of a crawl job.
   */
async checkCrawlStatus(
    id: string
): Promise<firecrawl.CrawlStatusResponse | firecrawl.ErrorResponse>
/**
   * Returns information about crawl errors.
   */
async checkCrawlErrors(
    id: string
): Promise<firecrawl.CrawlErrorsResponse | firecrawl.ErrorResponse>
/**
   * Cancels a crawl job.
   */
async cancelCrawl(id: string): Promise<firecrawl.ErrorResponse>
/**
   * Extracts structured data from URLs using LLMs.
   *
   * @param urls - Array of URLs to extract data from
   * @param params - Additional parameters for the extract request
   * @returns The response from the extract operation
   */
async extract<T extends z.ZodSchema>(
    urls: string[],
    params: firecrawl.ExtractParams<T>
): Promise<firecrawl.ExtractResponse<z.infer<T>>>
/**
   * Checks the status of an extract operation.
   */
async checkExtractStatus<T = any>(
    id: string
): Promise<firecrawl.ExtractStatusResponse<T>>
/**
   * Generates LLMs.txt for a given URL.
   */
async generateLLMsText(
    url: string,
    params?: firecrawl.GenerateLLMsTextParams
  ): Promise<
    firecrawl.GenerateLLMsTextStatusResponse | firecrawl.ErrorResponse
  > {
    const jsonData = {
      url,
      ...params
    }
    try {
      const response = await this.postRequest('v1/llmstxt', jsonData)
      return response
} catch (err)
/**
   * Sends a POST request.
   */
protected async postRequest(path: string, data: any): Promise<any>
/**
   * Sends a GET request.
   */
protected async getRequest(path: string): Promise<any>
/**
   * Sends a DELETE request.
   */
protected async deleteRequest(path: string): Promise<any>
```

## File: lib/tools/agentic/github-client.ts

```typescript
import { aiFunction, AIFunctionsProvider, assert, getEnv } from '@agentic/core'
import { Octokit } from 'octokit'
import { z } from 'zod'
import { createAISDKTools } from './ai-sdk'
⋮----
export interface User {
    id: number
    login: string
    name: string
    bio: string
    node_id: string
    gravatar_id: string
    type: string
    site_admin: boolean
    company: string
    blog?: string
    location?: string
    hireable?: boolean
    twitter_username?: string
    email?: string
    public_repos: number
    public_gists: number
    followers: number
    following: number
    avatar_url: string
    url: string
    html_url: string
    followers_url: string
    following_url: string
    gists_url: string
    starred_url: string
    subscriptions_url: string
    organizations_url: string
    repos_url: string
    events_url: string
    received_events_url: string
    created_at: string
    updated_at: string
  }
⋮----
/**
 * Agentic GitHub client.
 */
export class GitHubClient extends AIFunctionsProvider
⋮----
constructor({
    apiKey = getEnv('GITHUB_API_KEY')
  }: {
    apiKey?: string
} =
/**
   * Get a user by username.
   */
⋮----
async getUserByUsername(
    usernameOrOpts: string | { username: string }
): Promise<github.User>
```

## File: lib/tools/agentic/google-custom-search-client.ts

```typescript
import { aiFunction, AIFunctionsProvider, assert, getEnv } from '@agentic/core'
import { customsearch_v1 as GoogleSearchAPI } from '@googleapis/customsearch'
import { z } from 'zod'
import { paginate } from './paginate'
import { createAISDKTools } from './ai-sdk'
⋮----
export type SearchParams = z.infer<typeof SearchParamsSchema>
⋮----
/**
 * Agentic client for the official Google Custom Search API.
 *
 * @see https://developers.google.com/custom-search/v1/overview
 */
export class GoogleCustomSearchClient extends AIFunctionsProvider
⋮----
constructor({
    apiKey = getEnv('GOOGLE_API_KEY'),
    cseId = getEnv('GOOGLE_CSE_ID')
  }: {
    /** Google API key */
    apiKey?: string
    /** Google Custom Search Engine ID */
    cseId?: string
} =
⋮----
/** Google API key */
⋮----
/** Google Custom Search Engine ID */
⋮----
/**
   * Google Custom Search for online trends, news, current events, real-time information, or research topics.
   */
⋮----
async search(
    queryOrParams: string | googleCustomSearch.SearchParams
): Promise<any>
```

## File: lib/tools/agentic/index.ts

```typescript
/**
 * This file exports the agentic tools and adapters for use with the AI SDK.
 */
import { createAISDKTools } from './ai-sdk'
import { WikipediaClient } from './wikipedia-client'
import { WikidataClient } from './wikidata-client'
import { RedditClient } from './reddit-client'
import { ArXivClient } from './arxiv-client'
import { BraveSearchClient } from './brave-search-client'
import { calculator } from './calculator'
import { e2b } from './e2b'
import { FirecrawlClient } from './firecrawl-client'
import { GitHubClient } from './github-client'
import { GoogleCustomSearchClient } from './google-custom-search-client'
import { TavilyClient } from './tavily-client'
⋮----
export type AgenticTools = typeof agenticTools
export type AgenticTool = keyof AgenticTools
```

## File: lib/tools/agentic/mcp-filesystem.ts

```typescript
import { createAISDKTools } from '@agentic/ai-sdk'
import { createMcpTools } from '@agentic/mcp'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { gracefulExit } from 'exit-hook'
async function main()
⋮----
// Create an MCP tools provider, which will start a local MCP server process
// and use the stdio transport to communicate with it.
⋮----
// Allow the MCP server to access the current working directory.
⋮----
// Feel free to add additional directories the tool should have access to.
```

## File: lib/tools/agentic/polygon-client.ts

```typescript
import { AIFunctionsProvider, assert, getEnv } from '@agentic/core'
import defaultKy, { type KyInstance } from 'ky'
import { createAISDKTools } from './ai-sdk'
// TODO: add aiFunction decorator to select methods
⋮----
/**
   * Asset classes available on Polygon.
   */
export type ASSET_CLASS = 'stocks' | 'options' | 'crypto' | 'fx'
/**
   * Supported time spans for Polygon's indicator APIs.
   */
export type TIMESPAN =
    | 'minute'
    | 'hour'
    | 'day'
    | 'week'
    | 'month'
    | 'quarter'
    | 'year'
/**
   * Supported series types for Polygon's indicator APIs.
   */
export type SERIES_TYPE = 'close' | 'open' | 'high' | 'low'
/**
   * Order types available on Polygon.
   */
export type ORDER_TYPE = 'asc' | 'desc'
/**
   * Input parameters for the aggregates API.
   */
export interface AggregatesInput {
    /** The ticker symbol of the stock/equity. */
    ticker: string
    /** The size of the timespan multiplier. */
    multiplier: number
    /** The size of the time window. */
    timespan: TIMESPAN
    /** The start of the aggregate time window. Either a date with the format YYYY-MM-DD or a millisecond timestamp. */
    from: string | number
    /** The end of the aggregate time window. Either a date with the format YYYY-MM-DD or a millisecond timestamp. */
    to: string | number
    /** Whether or not the results are adjusted for splits. By default, results are adjusted. Set this to false to get results that are NOT adjusted for splits. */
    adjusted?: boolean
    /** Sort the results by timestamp. "asc" will return results in ascending order (oldest at the top), "desc" will return results in descending order (newest at the top). */
    sort?: ORDER_TYPE
    /** Limits the number of base aggregates queried to create the aggregate results. Max 50000 and Default 5000. */
    limit?: number
  }
⋮----
/** The ticker symbol of the stock/equity. */
⋮----
/** The size of the timespan multiplier. */
⋮----
/** The size of the time window. */
⋮----
/** The start of the aggregate time window. Either a date with the format YYYY-MM-DD or a millisecond timestamp. */
⋮----
/** The end of the aggregate time window. Either a date with the format YYYY-MM-DD or a millisecond timestamp. */
⋮----
/** Whether or not the results are adjusted for splits. By default, results are adjusted. Set this to false to get results that are NOT adjusted for splits. */
⋮----
/** Sort the results by timestamp. "asc" will return results in ascending order (oldest at the top), "desc" will return results in descending order (newest at the top). */
⋮----
/** Limits the number of base aggregates queried to create the aggregate results. Max 50000 and Default 5000. */
⋮----
/**
   * Output parameters for the aggregates API.
   */
export interface AggregatesOutput {
    /** The exchange symbol that this item is traded under. */
    ticker: string
    /** Whether or not this response was adjusted for splits. */
    adjusted: boolean
    /** The number of aggregates (minute or day) used to generate the response. */
    queryCount: number
    /** A request id assigned by the server. */
    request_id: string
    /** The total number of results for this request. */
    resultsCount: number
    /** The status of this request's response. */
    status: string
    /** The results of the query. */
    results: Aggregate[]
    /** If present, this value can be used to fetch the next page of data. */
    next_url?: string
  }
⋮----
/** The exchange symbol that this item is traded under. */
⋮----
/** Whether or not this response was adjusted for splits. */
⋮----
/** The number of aggregates (minute or day) used to generate the response. */
⋮----
/** A request id assigned by the server. */
⋮----
/** The total number of results for this request. */
⋮----
/** The status of this request's response. */
⋮----
/** The results of the query. */
⋮----
/** If present, this value can be used to fetch the next page of data. */
⋮----
/**
   * Input parameters for the grouped daily API.
   */
export type GroupedDailyInput = {
    /** The beginning date for the aggregate window. */
    date: string
    /** Whether or not the results are adjusted for splits. By default, results are adjusted. Set this to false to get results that are NOT adjusted for splits. */
    adjusted?: boolean
  }
⋮----
/** The beginning date for the aggregate window. */
⋮----
/** Whether or not the results are adjusted for splits. By default, results are adjusted. Set this to false to get results that are NOT adjusted for splits. */
⋮----
/**
   * Input parameters for the grouped daily API for stocks.
   */
export interface GroupedDailyInputStocks extends GroupedDailyInput {
    /** Include OTC securities in the response. Default is false (don't include OTC securities). */
    include_otc?: boolean
  }
⋮----
/** Include OTC securities in the response. Default is false (don't include OTC securities). */
⋮----
/**
   * Output parameters for the grouped daily API.
   */
export interface GroupedDailyOutput {
    /** Whether or not this response was adjusted for splits. */
    adjusted: boolean
    /** The number of aggregates (minute or day) used to generate the response. */
    queryCount: number
    /** A request id assigned by the server. */
    request_id: string
    /** The total number of results for this request. */
    resultsCount: number
    /** The status of this request's response. */
    status: string
    /** The results of the query. */
    results: AggregateDaily[]
  }
⋮----
/** Whether or not this response was adjusted for splits. */
⋮----
/** The number of aggregates (minute or day) used to generate the response. */
⋮----
/** A request id assigned by the server. */
⋮----
/** The total number of results for this request. */
⋮----
/** The status of this request's response. */
⋮----
/** The results of the query. */
⋮----
/**
   * AggregateDaily parameters.
   */
export interface AggregateDaily extends Aggregate {
    /** The exchange symbol that this item is traded under. */
    T: string
  }
⋮----
/** The exchange symbol that this item is traded under. */
⋮----
/**
   * Ticker Details v3 input parameters.
   */
export type TickerDetailsInput = {
    /** The ticker symbol of the asset. */
    ticker: string
    /** Specify a point in time to get information about the ticker available on that date (formatted as YYYY-MM-DD). */
    date?: string
  }
⋮----
/** The ticker symbol of the asset. */
⋮----
/** Specify a point in time to get information about the ticker available on that date (formatted as YYYY-MM-DD). */
⋮----
/**
   * Daily Open/Close input parameters.
   */
export type DailyOpenCloseInput = {
    /** The ticker symbol */
    ticker: string
    /** The date of the requested open/close in the format YYYY-MM-DD. */
    date: string
    /** Whether or not the results are adjusted for splits. By default, results are adjusted. */
    adjusted?: boolean
  }
⋮----
/** The ticker symbol */
⋮----
/** The date of the requested open/close in the format YYYY-MM-DD. */
⋮----
/** Whether or not the results are adjusted for splits. By default, results are adjusted. */
⋮----
/**
   * Result returned by the Daily Open/Close API.
   */
export interface DailyOpenCloseOutput {
    /** The close price of the ticker symbol in after-hours trading. */
    afterHours: number
    /** The close price for the symbol in the given time period. */
    close: number
    /** The requested date. */
    from: string
    /** The highest price for the symbol in the given time period. */
    high: number
    /** The lowest price for the symbol in the given time period. */
    low: number
    /** The open price for the symbol in the given time period. */
    open: number
    /** The open price of the ticker symbol in pre-market trading. */
    preMarket: number
    /** The status of this request's response. */
    status: string
    /** The exchange symbol that this item is traded under. */
    symbol: string
    /** The trading volume of the symbol in the given time period. */
    volume: number
  }
⋮----
/** The close price of the ticker symbol in after-hours trading. */
⋮----
/** The close price for the symbol in the given time period. */
⋮----
/** The requested date. */
⋮----
/** The highest price for the symbol in the given time period. */
⋮----
/** The lowest price for the symbol in the given time period. */
⋮----
/** The open price for the symbol in the given time period. */
⋮----
/** The open price of the ticker symbol in pre-market trading. */
⋮----
/** The status of this request's response. */
⋮----
/** The exchange symbol that this item is traded under. */
⋮----
/** The trading volume of the symbol in the given time period. */
⋮----
/**
   * Result returned by the Previous Close API.
   */
export interface PreviousCloseOutput {
    /** Whether or not this response was adjusted for splits. */
    adjusted: boolean
    /** The number of aggregates (minute or day) used to generate the response. */
    queryCount: number
    /** A request id assigned by the server. */
    requestId: string
    /** Array of results, each containing details for the symbol in the given time period. */
    results: {
      /** The exchange symbol that this item is traded under. */
      T: string
      /** The close price for the symbol in the given time period. */
      c: number
      /** The highest price for the symbol in the given time period. */
      h: number
      /** The lowest price for the symbol in the given time period. */
      l: number
      /** The open price for the symbol in the given time period. */
      o: number
      /** The Unix Msec timestamp for the start of the aggregate window. */
      t: number
      /** The trading volume of the symbol in the given time period. */
      v: number
      /** The volume weighted average price. */
      vw: number
    }[]
    /** The total number of results for this request. */
    resultsCount: number
    /** The status of this request's response. */
    status: string
    /** The exchange symbol that this item is traded under. */
    ticker: string
  }
⋮----
/** Whether or not this response was adjusted for splits. */
⋮----
/** The number of aggregates (minute or day) used to generate the response. */
⋮----
/** A request id assigned by the server. */
⋮----
/** Array of results, each containing details for the symbol in the given time period. */
⋮----
/** The exchange symbol that this item is traded under. */
⋮----
/** The close price for the symbol in the given time period. */
⋮----
/** The highest price for the symbol in the given time period. */
⋮----
/** The lowest price for the symbol in the given time period. */
⋮----
/** The open price for the symbol in the given time period. */
⋮----
/** The Unix Msec timestamp for the start of the aggregate window. */
⋮----
/** The trading volume of the symbol in the given time period. */
⋮----
/** The volume weighted average price. */
⋮----
/** The total number of results for this request. */
⋮----
/** The status of this request's response. */
⋮----
/** The exchange symbol that this item is traded under. */
⋮----
/**
   * Result returned by the Ticker Details v3 API.
   */
export interface TickerDetailsOutput {
    /** A request id assigned by the server. */
    requestId: string
    /** Detailed results for the specific ticker. */
    results: {
      /** Whether the ticker is actively traded. */
      active: boolean
      /** Address of the company. */
      address: {
        /** The first line of the company's headquarters address. */
        address1: string
        /** The city of the company's headquarters address. */
        city: string
        /** The postal code of the company's headquarters address. */
        postalCode: string
        /** The state of the company's headquarters address. */
        state: string
      }
      /** Branding details of the company. */
      branding: {
        /** A link to this ticker's company's icon. Icon's are generally smaller, square images that represent the company at a glance. */
        iconUrl: string
        /** A link to this ticker's company's logo. Note that you must provide an API key when accessing this URL. See the "Authentication" section at the top of this page for more details. */
        logoUrl: string
      }
      /** Central Index Key (CIK) of the company. */
      cik: string
      /** Composite Financial Instrument Global Identifier (FIGI). */
      compositeFigi: string
      /** Name of the currency in which the company trades. */
      currencyName: string
      /** Date and time the company was delisted, if applicable. */
      delistedUtc?: string
      /** Description of the company. */
      description: string
      /** The company's homepage URL. */
      homepageUrl: string
      /** The date when the company was listed. */
      listDate: string
      /** Locale of the company. */
      locale: string
      /** Market in which the company trades. */
      market: string
      /** Market capitalization of the company. */
      marketCap: number
      /** Name of the company. */
      name: string
      /** Phone number of the company. */
      phoneNumber: string
      /** The primary exchange on which the company trades. */
      primaryExchange: string
      /** Round lot size for the company's stock. */
      roundLot: number
      /** Share class FIGI. */
      shareClassFigi: string
      /** The number of outstanding shares for the share class. */
      shareClassSharesOutstanding: number
      /** The Standard Industrial Classification (SIC) code of the company. */
      sicCode: string
      /** Description of the SIC code. */
      sicDescription: string
      /** The ticker symbol of the company. */
      ticker: string
      /** The root of the ticker symbol. */
      tickerRoot: string
      /** The suffix of the ticker symbol, if applicable. */
      tickerSuffix?: string
      /** The total number of employees in the company. */
      totalEmployees: number
      /** The type of the ticker (e.g., common stock, preferred stock, etc.). */
      type: string
      /** The number of weighted outstanding shares. */
      weightedSharesOutstanding: number
    }
    /** The status of this request's response. */
    status: string
  }
⋮----
/** A request id assigned by the server. */
⋮----
/** Detailed results for the specific ticker. */
⋮----
/** Whether the ticker is actively traded. */
⋮----
/** Address of the company. */
⋮----
/** The first line of the company's headquarters address. */
⋮----
/** The city of the company's headquarters address. */
⋮----
/** The postal code of the company's headquarters address. */
⋮----
/** The state of the company's headquarters address. */
⋮----
/** Branding details of the company. */
⋮----
/** A link to this ticker's company's icon. Icon's are generally smaller, square images that represent the company at a glance. */
⋮----
/** A link to this ticker's company's logo. Note that you must provide an API key when accessing this URL. See the "Authentication" section at the top of this page for more details. */
⋮----
/** Central Index Key (CIK) of the company. */
⋮----
/** Composite Financial Instrument Global Identifier (FIGI). */
⋮----
/** Name of the currency in which the company trades. */
⋮----
/** Date and time the company was delisted, if applicable. */
⋮----
/** Description of the company. */
⋮----
/** The company's homepage URL. */
⋮----
/** The date when the company was listed. */
⋮----
/** Locale of the company. */
⋮----
/** Market in which the company trades. */
⋮----
/** Market capitalization of the company. */
⋮----
/** Name of the company. */
⋮----
/** Phone number of the company. */
⋮----
/** The primary exchange on which the company trades. */
⋮----
/** Round lot size for the company's stock. */
⋮----
/** Share class FIGI. */
⋮----
/** The number of outstanding shares for the share class. */
⋮----
/** The Standard Industrial Classification (SIC) code of the company. */
⋮----
/** Description of the SIC code. */
⋮----
/** The ticker symbol of the company. */
⋮----
/** The root of the ticker symbol. */
⋮----
/** The suffix of the ticker symbol, if applicable. */
⋮----
/** The total number of employees in the company. */
⋮----
/** The type of the ticker (e.g., common stock, preferred stock, etc.). */
⋮----
/** The number of weighted outstanding shares. */
⋮----
/** The status of this request's response. */
⋮----
/**
   * Input parameters for technical indicators.
   */
export type IndicatorInput = {
    /** The ticker symbol for which to get data. */
    ticker: string
    /** Query by timestamp. Either a date with the format YYYY-MM-DD or a millisecond timestamp. */
    timestamp?: string
    /** The size of the aggregate time window. */
    timespan?: TIMESPAN
    /** Whether or not the aggregates are adjusted for splits. By default, aggregates are adjusted. Set this to false to get results that are NOT adjusted for splits. */
    adjusted?: boolean
    /** The window size used to calculate the indicator. i.e. a window size of 10 with daily aggregates would result in a 10 day moving average. */
    window?: number
    /** The price in the aggregate which will be used to calculate the indicator. */
    series_type?: SERIES_TYPE
    /** Whether or not to include the aggregates used to calculate this indicator in the response. */
    expand_underlying?: boolean
    /** The order in which to return the results, ordered by timestamp. */
    order?: ORDER_TYPE
    /** Limit the number of results returned, default is 10 and max is 5000 */
    limit?: number
  }
⋮----
/** The ticker symbol for which to get data. */
⋮----
/** Query by timestamp. Either a date with the format YYYY-MM-DD or a millisecond timestamp. */
⋮----
/** The size of the aggregate time window. */
⋮----
/** Whether or not the aggregates are adjusted for splits. By default, aggregates are adjusted. Set this to false to get results that are NOT adjusted for splits. */
⋮----
/** The window size used to calculate the indicator. i.e. a window size of 10 with daily aggregates would result in a 10 day moving average. */
⋮----
/** The price in the aggregate which will be used to calculate the indicator. */
⋮----
/** Whether or not to include the aggregates used to calculate this indicator in the response. */
⋮----
/** The order in which to return the results, ordered by timestamp. */
⋮----
/** Limit the number of results returned, default is 10 and max is 5000 */
⋮----
/**
   * Represents an aggregate, which includes data for a given time period.
   */
export interface Aggregate {
    /** The close price for the symbol in the given time period. */
    c: number
    /** The highest price for the symbol in the given time period. */
    h: number
    /** The lowest price for the symbol in the given time period. */
    l: number
    /** The number of transactions in the aggregate window. */
    n: number
    /** The open price for the symbol in the given time period. */
    o: number
    /** Whether or not this aggregate is for an OTC ticker. This field will be left off if false. */
    otc?: boolean
    /** The Unix Msec timestamp for the start of the aggregate window. */
    t: number
    /** The trading volume of the symbol in the given time period. */
    v: number
    /** The volume weighted average price. */
    vw?: number
  }
⋮----
/** The close price for the symbol in the given time period. */
⋮----
/** The highest price for the symbol in the given time period. */
⋮----
/** The lowest price for the symbol in the given time period. */
⋮----
/** The number of transactions in the aggregate window. */
⋮----
/** The open price for the symbol in the given time period. */
⋮----
/** Whether or not this aggregate is for an OTC ticker. This field will be left off if false. */
⋮----
/** The Unix Msec timestamp for the start of the aggregate window. */
⋮----
/** The trading volume of the symbol in the given time period. */
⋮----
/** The volume weighted average price. */
⋮----
/**
   * Represents a value of the indicator, which includes timestamp and value itself.
   */
export interface IndicatorValue {
    /** The Unix Msec timestamp from the last aggregate used in this calculation. */
    timestamp: number
    /** The indicator value for this period. */
    value: number
  }
⋮----
/** The Unix Msec timestamp from the last aggregate used in this calculation. */
⋮----
/** The indicator value for this period. */
⋮----
/**
   * The output response from the technical indicator API.
   */
export interface IndicatorOutput {
    /** If present, this value can be used to fetch the next page of data. */
    next_url: string
    /** A request id assigned by the server. */
    request_id: string
    /** Results object containing underlying aggregates and values array. */
    results: {
      /** Underlying object containing aggregates and a URL to fetch underlying data. */
      underlying: {
        /** Array of aggregates used for calculation. */
        aggregates: Aggregate[]
        /** The URL which can be used to request the underlying aggregates used in this request. */
        url: string
      }
      /** Array of calculated indicator values. */
      values: IndicatorValue[]
    }
    /** The status of this request's response. */
    status: string
  }
⋮----
/** If present, this value can be used to fetch the next page of data. */
⋮----
/** A request id assigned by the server. */
⋮----
/** Results object containing underlying aggregates and values array. */
⋮----
/** Underlying object containing aggregates and a URL to fetch underlying data. */
⋮----
/** Array of aggregates used for calculation. */
⋮----
/** The URL which can be used to request the underlying aggregates used in this request. */
⋮----
/** Array of calculated indicator values. */
⋮----
/** The status of this request's response. */
⋮----
/**
   * Input parameters for the /v3/reference/tickers API.
   */
export type TickerInput = {
    /** Specify a ticker symbol. Defaults to empty string which queries all tickers. */
    ticker?: string
    /** Specify the type of the tickers. */
    type?: string
    /** Filter by market type. */
    market?: 'crypto'
    /** Specify the primary exchange of the asset in the ISO code format. */
    exchange?: string
    /** Specify the CUSIP code of the asset you want to search for. */
    cusip?: string
    /** Specify the CIK of the asset you want to search for. */
    cik?: string
    /** Specify a point in time to retrieve tickers available on that date. */
    date?: string
    /** Search for terms within the ticker and/or company name. */
    search?: string
    /** Specify if the tickers returned should be actively traded on the queried date. */
    active?: boolean
    /** Order results based on the sort field. */
    order?: ORDER_TYPE
    /** Limit the number of results returned. */
    limit?: number
    /** Sort field used for ordering. */
    sort?: string
  }
⋮----
/** Specify a ticker symbol. Defaults to empty string which queries all tickers. */
⋮----
/** Specify the type of the tickers. */
⋮----
/** Filter by market type. */
⋮----
/** Specify the primary exchange of the asset in the ISO code format. */
⋮----
/** Specify the CUSIP code of the asset you want to search for. */
⋮----
/** Specify the CIK of the asset you want to search for. */
⋮----
/** Specify a point in time to retrieve tickers available on that date. */
⋮----
/** Search for terms within the ticker and/or company name. */
⋮----
/** Specify if the tickers returned should be actively traded on the queried date. */
⋮----
/** Order results based on the sort field. */
⋮----
/** Limit the number of results returned. */
⋮----
/** Sort field used for ordering. */
⋮----
/**
   * Represents a ticker that matches the query.
   */
export interface Ticker {
    /** Whether or not the asset is actively traded. */
    active: boolean
    /** The CIK number for this ticker. */
    cik: string
    /** The composite OpenFIGI number for this ticker. */
    composite_figi: string
    /** The name of the currency that this asset is traded with. */
    currency_name: string
    /** The last date that the asset was traded. */
    delisted_utc: string
    /** The information is accurate up to this time. */
    last_updated_utc: string
    /** The locale of the asset. */
    locale: 'us' | 'global'
    /** The market type of the asset. */
    market: 'stocks' | 'crypto' | 'fx' | 'otc' | 'indices'
    /** The name of the asset. */
    name: string
    /** The ISO code of the primary listing exchange for this asset. */
    primary_exchange: string
    /** The share Class OpenFIGI number for this ticker. */
    share_class_figi: string
    /** The exchange symbol that this item is traded under. */
    ticker: string
    /** The type of the asset. */
    type: string
  }
⋮----
/** Whether or not the asset is actively traded. */
⋮----
/** The CIK number for this ticker. */
⋮----
/** The composite OpenFIGI number for this ticker. */
⋮----
/** The name of the currency that this asset is traded with. */
⋮----
/** The last date that the asset was traded. */
⋮----
/** The information is accurate up to this time. */
⋮----
/** The locale of the asset. */
⋮----
/** The market type of the asset. */
⋮----
/** The name of the asset. */
⋮----
/** The ISO code of the primary listing exchange for this asset. */
⋮----
/** The share Class OpenFIGI number for this ticker. */
⋮----
/** The exchange symbol that this item is traded under. */
⋮----
/** The type of the asset. */
⋮----
/**
   * The output response from the /v3/reference/tickers API.
   */
export interface TickerOutput {
    /** The total number of results for this request. */
    count: number
    /** If present, this value can be used to fetch the next page of data. */
    next_url: string
    /** A request id assigned by the server. */
    request_id: string
    /** An array of tickers that match your query. */
    results: Ticker[]
    /** The status of this request's response. */
    status: string
  }
⋮----
/** The total number of results for this request. */
⋮----
/** If present, this value can be used to fetch the next page of data. */
⋮----
/** A request id assigned by the server. */
⋮----
/** An array of tickers that match your query. */
⋮----
/** The status of this request's response. */
⋮----
/**
   * Output parameters for the market status API.
   */
export interface MarketStatusOutput {
    /** Whether or not the market is in post-market hours. */
    afterHours: boolean
    /** The status of the crypto and forex markets. */
    currencies: {
      /** The status of the crypto market. */
      crypto: string
      /** The status of the forex market. */
      fx: string
    }
    /** Whether or not the market is in pre-market hours. */
    earlyHours: boolean
    /** The status of the Nasdaq, NYSE and OTC markets. */
    exchanges: {
      /** The status of the Nasdaq market. */
      nasdaq: string
      /** The status of the NYSE market. */
      nyse: string
      /** The status of the OTC market. */
      otc: string
    }
    /** The status of the market as a whole. */
    market: string
    /** The current time of the server. */
    serverTime: string
  }
⋮----
/** Whether or not the market is in post-market hours. */
⋮----
/** The status of the crypto and forex markets. */
⋮----
/** The status of the crypto market. */
⋮----
/** The status of the forex market. */
⋮----
/** Whether or not the market is in pre-market hours. */
⋮----
/** The status of the Nasdaq, NYSE and OTC markets. */
⋮----
/** The status of the Nasdaq market. */
⋮----
/** The status of the NYSE market. */
⋮----
/** The status of the OTC market. */
⋮----
/** The status of the market as a whole. */
⋮----
/** The current time of the server. */
⋮----
/**
   * Output parameters for the market holidays API.
   */
export interface MarketHolidayOutput {
    /** The market close time on the holiday (if it's not closed). */
    close?: string
    /** The date of the holiday. */
    date: string
    /** Which market the record is for. */
    exchange: string
    /** The name of the holiday. */
    name: string
    /** The market open time on the holiday (if it's not closed). */
    open?: string
    /** The status of the market on the holiday. */
    status: string
  }
⋮----
/** The market close time on the holiday (if it's not closed). */
⋮----
/** The date of the holiday. */
⋮----
/** Which market the record is for. */
⋮----
/** The name of the holiday. */
⋮----
/** The market open time on the holiday (if it's not closed). */
⋮----
/** The status of the market on the holiday. */
⋮----
/**
   * Input parameters for the ticker types API.
   */
export type TickerTypesInput = {
    /** Filter by asset class. */
    asset_class?: ASSET_CLASS
    /** Filter by locale. */
    locale?: string
  }
⋮----
/** Filter by asset class. */
⋮----
/** Filter by locale. */
⋮----
/**
   * Output parameters for the ticker types API.
   */
export interface TickerTypesOutput {
    /** The total number of results for this request. */
    count: number
    /** A request ID assigned by the server. */
    request_id: string
    /** The results of the query. */
    results: TickerType[]
    /** The status of this request's response. */
    status: string
  }
⋮----
/** The total number of results for this request. */
⋮----
/** A request ID assigned by the server. */
⋮----
/** The results of the query. */
⋮----
/** The status of this request's response. */
⋮----
/**
   * Ticker type parameters.
   */
export interface TickerType {
    /** An identifier for a group of similar financial instruments. */
    asset_class: ASSET_CLASS
    /** A code used by Polygon.io to refer to this ticker type. */
    code: string
    /** A short description of this ticker type. */
    description: string
    /** An identifier for a geographical location. */
    locale: string
  }
⋮----
/** An identifier for a group of similar financial instruments. */
⋮----
/** A code used by Polygon.io to refer to this ticker type. */
⋮----
/** A short description of this ticker type. */
⋮----
/** An identifier for a geographical location. */
⋮----
/**
   * Input parameters for the ticker news API.
   */
export type TickerNewsInput = {
    /** Ticker symbol to return results for. */
    ticker: string
    /** Date to return results published on, before, or after. */
    published_utc?: string
    /** Order results based on the sort field. */
    order?: ORDER_TYPE
    /** Limit the number of results returned, default is 10 and max is 1000. */
    limit?: number
    /** Sort field used for ordering. */
    sort?: string
  }
⋮----
/** Ticker symbol to return results for. */
⋮----
/** Date to return results published on, before, or after. */
⋮----
/** Order results based on the sort field. */
⋮----
/** Limit the number of results returned, default is 10 and max is 1000. */
⋮----
/** Sort field used for ordering. */
⋮----
/**
   * Output parameters for the ticker news API.
   */
export interface TickerNewsOutput {
    /** The total number of results for this request. */
    count: number
    /** If present, this value can be used to fetch the next page of data. */
    next_url: string
    /** A request id assigned by the server. */
    request_id: string
    /** The results of the query. */
    results: TickerNews[]
    /** The status of this request's response. */
    status: string
  }
⋮----
/** The total number of results for this request. */
⋮----
/** If present, this value can be used to fetch the next page of data. */
⋮----
/** A request id assigned by the server. */
⋮----
/** The results of the query. */
⋮----
/** The status of this request's response. */
⋮----
/**
   * Ticker news parameters.
   */
export interface TickerNews {
    /** The mobile friendly Accelerated Mobile Page (AMP) URL. */
    amp_url?: string
    /** A link to the news article. */
    article_url: string
    /** The article's author. */
    author: string
    /** A description of the article. */
    description?: string
    /** Unique identifier for the article. */
    id: string
    /** The article's image URL. */
    image_url?: string
    /** The keywords associated with the article (which will vary depending on the publishing source). */
    keywords?: string[]
    /** The date the article was published on. */
    published_utc: string
    /** The publisher's details. */
    publisher: Publisher
    /** The ticker symbols associated with the article. */
    tickers: string[]
    /** The title of the news article. */
    title: string
  }
⋮----
/** The mobile friendly Accelerated Mobile Page (AMP) URL. */
⋮----
/** A link to the news article. */
⋮----
/** The article's author. */
⋮----
/** A description of the article. */
⋮----
/** Unique identifier for the article. */
⋮----
/** The article's image URL. */
⋮----
/** The keywords associated with the article (which will vary depending on the publishing source). */
⋮----
/** The date the article was published on. */
⋮----
/** The publisher's details. */
⋮----
/** The ticker symbols associated with the article. */
⋮----
/** The title of the news article. */
⋮----
/**
   * Publisher parameters.
   */
export interface Publisher {
    /** The publisher's homepage favicon URL. */
    favicon_url?: string
    /** The publisher's homepage URL. */
    homepage_url: string
    /** The publisher's logo URL. */
    logo_url: string
    /** The publisher's name. */
    name: string
  }
⋮----
/** The publisher's homepage favicon URL. */
⋮----
/** The publisher's homepage URL. */
⋮----
/** The publisher's logo URL. */
⋮----
/** The publisher's name. */
⋮----
/**
   * Input parameters for the exchanges API.
   */
export type ExchangesInput = {
    /** Filter by asset class. */
    asset_class?: ASSET_CLASS
    /** Filter by locale. */
    locale?: string
  }
⋮----
/** Filter by asset class. */
⋮----
/** Filter by locale. */
⋮----
/**
   * Output parameters for the exchanges API.
   */
export interface ExchangesOutput {
    /** The total number of results for this request. */
    count: number
    /** A request ID assigned by the server. */
    request_id: string
    /** The results of the query. */
    results: Exchange[]
    /** The status of this request's response. */
    status: string
  }
⋮----
/** The total number of results for this request. */
⋮----
/** A request ID assigned by the server. */
⋮----
/** The results of the query. */
⋮----
/** The status of this request's response. */
⋮----
/**
   * Exchange parameters.
   */
export interface Exchange {
    /** A commonly used abbreviation for this exchange. */
    acronym?: string
    /** An identifier for a group of similar financial instruments. */
    asset_class: ASSET_CLASS
    /** A unique identifier used by Polygon.io for this exchange. */
    id: number
    /** An identifier for a geographical location. */
    locale: 'us' | 'global'
    /** The Market Identifer Code of this exchange (see ISO 10383). */
    mic: string
    /** Name of this exchange. */
    name: string
    /** The MIC of the entity that operates this exchange. */
    operating_mic: string
    /** The ID used by SIP's to represent this exchange. */
    participant_id?: string
    /** Represents the type of exchange. */
    type: 'exchange' | 'TRF' | 'SIP'
    /** A link to this exchange's website, if one exists. */
    url?: string
  }
⋮----
/** A commonly used abbreviation for this exchange. */
⋮----
/** An identifier for a group of similar financial instruments. */
⋮----
/** A unique identifier used by Polygon.io for this exchange. */
⋮----
/** An identifier for a geographical location. */
⋮----
/** The Market Identifer Code of this exchange (see ISO 10383). */
⋮----
/** Name of this exchange. */
⋮----
/** The MIC of the entity that operates this exchange. */
⋮----
/** The ID used by SIP's to represent this exchange. */
⋮----
/** Represents the type of exchange. */
⋮----
/** A link to this exchange's website, if one exists. */
⋮----
/**
 * Client for the Polygon.io API that lets you query the latest market data
 * from all US stock exchanges. You can also find data on company financials,
 * stock market holidays, corporate actions, and more.
 *
 * @see {@link https://polygon.io/docs}
 */
export class PolygonClient extends AIFunctionsProvider
⋮----
constructor({
    apiKey = getEnv('POLYGON_API_KEY'),
    apiBaseUrl = polygon.API_BASE_URL,
    ky = defaultKy
  }: {
    apiKey?: string
    apiBaseUrl?: string
    ky?: KyInstance
} =
/**
   * Returns detailed information about a single ticker.
   *
   * @param params - input parameters (`ticker` symbol and optional `date`)
   * @returns promise that resolves to detailed information about a single ticker
   */
async tickerDetails(params: polygon.TickerDetailsInput)
/**
   * Returns the open, close and after hours prices of a stock symbol on a certain date.
   *
   * @param params - input parameters (`ticker` symbol and `date`)
   * @returns promise that resolves to the open, close and after hours prices of a stock symbol on a certain date
   */
async dailyOpenClose(params: polygon.DailyOpenCloseInput)
/**
   * Returns the previous day's open, high, low, and close (OHLC) for the specified stock ticker.
   *
   * @param ticker - ticker symbol of the stock/equity
   * @param adjusted - whether or not the results are adjusted for splits
   * @returns promise that resolves to the previous day's open, high, low, and close (OHLC) for the specified stock ticker
   */
async previousClose(ticker: string, adjusted = true)
/**
   * Get the simple moving average (SMA) for a ticker symbol over a given time range.
   *
   * @param params - input parameters
   * @returns promise that resolves to the simple moving average (SMA) for a ticker symbol over a given time range
   */
async sma(params: polygon.IndicatorInput)
/**
   * Get the exponential moving average (EMA) for a ticker symbol over a given time range.
   *
   * @param params - input parameters
   * @returns promise that resolves to the exponential moving average (EMA) for a ticker symbol over a given time range
   */
async ema(params: polygon.IndicatorInput)
/**
   * Get moving average convergence/divergence (MACD) for a ticker symbol over a given time range.
   *
   * @param params - input parameters
   * @returns promise that resolves to the moving average convergence/divergence (MACD) for a ticker symbol over a given time range
   */
async macd(params: polygon.IndicatorInput)
/**
   * Get the relative strength index (RSI) for a ticker symbol over a given time range.
   *
   * @param params - input parameters
   * @returns promise that resolves to the relative strength index (RSI) for a ticker symbol over a given time range
   */
async rsi(params: polygon.IndicatorInput)
/**
   * Query all ticker symbols which are supported by Polygon.io. Currently includes Stocks/Equities, Indices, Forex, and Crypto.
   *
   * @param params - input parameters to filter the list of ticker symbols
   * @returns promise that resolves to a list of ticker symbols and their details
   */
async tickers(params: polygon.TickerInput): Promise<polygon.TickerOutput>
/**
   * List all ticker types that Polygon.io has.
   *
   * @param params - input parameters (`asset_class` and `locale`)
   * @returns promise that resolves to ticker types
   */
async tickerTypes(params: polygon.TickerTypesInput =
/**
   * Get the most recent news articles relating to a stock ticker symbol.
   *
   * @param params - input parameters (`ticker`, `published_utc`, `order`, `limit`, `sort`)
   * @returns promise that resolves to ticker news
   */
async tickerNews(params: polygon.TickerNewsInput)
/**
   * Returns the current trading status of the exchanges and overall financial markets.
   *
   * @returns promise that resolves to the market status
   */
async marketStatus()
/**
   * Gets upcoming market holidays and their open/close times.
   *
   * @returns promise that resolves to an array of market holidays
   */
async marketHolidays(): Promise<polygon.MarketHolidayOutput[]>
/**
   * List all exchanges that Polygon.io knows about.
   *
   * @param params - input parameters (`asset_class`, `locale`)
   * @returns promise that resolves to list of exchanges
   */
async exchanges(params: polygon.ExchangesInput =
/**
   * Get aggregate bars for a stock over a given date range in custom time window sizes.
   *
   * @param params - input parameters
   * @returns promise that resolves to list of aggregates
   */
async aggregates(params: polygon.AggregatesInput)
/**
   * Get the daily open, high, low, and close (OHLC) for the entire markets.
   *
   * @param assetClass - the asset class to get data for
   * @param params - input parameters (`date`, `adjusted`)
   * @returns promise that resolves to list of aggregates
   */
async groupedDaily(
    assetClass: polygon.ASSET_CLASS,
    params: polygon.GroupedDailyInput
)
```

## File: lib/tools/agentic/reddit-client.ts

```typescript
import {
  aiFunction,
  AIFunctionsProvider,
  pick,
  sanitizeSearchParams
} from '@agentic/core'
import defaultKy, { type KyInstance } from 'ky'
import { z } from 'zod'
import { createAISDKTools } from './ai-sdk'
⋮----
export interface Post {
    id: string
    name: string // name is `t3_<id>`
    title: string
    subreddit: string
    selftext?: string
    author: string
    author_fullname: string
    url: string
    permalink: string
    thumbnail?: string
    thumbnail_width?: number
    thumbnail_height?: number
    score: number
    ups: number
    downs: number
    num_comments: number
    created_utc: number
    is_self: boolean
    is_video: boolean
  }
⋮----
name: string // name is `t3_<id>`
⋮----
export interface FullPost {
    id: string
    name: string
    author: string
    title: string
    subreddit: string
    subreddit_name_prefixed: string
    score: number
    approved_at_utc: string | null
    selftext?: string
    author_fullname: string
    is_self: boolean
    saved: boolean
    url: string
    permalink: string
    mod_reason_title: string | null
    gilded: number
    clicked: boolean
    link_flair_richtext: any[]
    hidden: boolean
    pwls: number
    link_flair_css_class: string
    downs: number
    thumbnail_height: any
    top_awarded_type: any
    hide_score: boolean
    quarantine: boolean
    link_flair_text_color: string
    upvote_ratio: number
    author_flair_background_color: any
    subreddit_type: string
    ups: number
    total_awards_received: number
    media_embed?: any
    secure_media_embed?: any
    thumbnail_width: any
    author_flair_template_id: any
    is_original_content: boolean
    user_reports: any[]
    secure_media: any
    is_reddit_media_domain: boolean
    is_meta: boolean
    category: any
    link_flair_text: string
    can_mod_post: boolean
    approved_by: any
    is_created_from_ads_ui: boolean
    author_premium: boolean
    thumbnail?: string
    edited: boolean
    author_flair_css_class: any
    author_flair_richtext: any[]
    gildings?: any
    content_categories: any
    mod_note: any
    created: number
    link_flair_type: string
    wls: number
    removed_by_category: any
    banned_by: any
    author_flair_type: string
    domain: string
    allow_live_comments: boolean
    selftext_html: string
    likes: any
    suggested_sort: any
    banned_at_utc: any
    view_count: any
    archived: boolean
    no_follow: boolean
    is_crosspostable: boolean
    pinned: boolean
    over_18: boolean
    all_awardings: any[]
    awarders: any[]
    media_only: boolean
    link_flair_template_id: string
    can_gild: boolean
    spoiler: boolean
    locked: boolean
    author_flair_text: any
    treatment_tags: any[]
    visited: boolean
    removed_by: any
    num_reports: any
    distinguished: any
    subreddit_id: string
    author_is_blocked: boolean
    mod_reason_by: any
    removal_reason: any
    link_flair_background_color: string
    is_robot_indexable: boolean
    report_reasons: any
    discussion_type: any
    num_comments: number
    send_replies: boolean
    contest_mode: boolean
    mod_reports: any[]
    author_patreon_flair: boolean
    author_flair_text_color: any
    stickied: boolean
    subreddit_subscribers: number
    created_utc: number
    num_crossposts: number
    media?: any
    is_video: boolean
    // preview images
    preview?: {
      enabled: boolean
      images: Array<{
        id: string
        source: Image
        resolutions: Image[]
        variants?: Record<
          string,
          {
            id: string
            source: Image
            resolutions: Image[]
          }
        >
      }>
    }
  }
⋮----
// preview images
⋮----
export interface Image {
    url: string
    width: number
    height: number
  }
export interface PostT3 {
    kind: 't3'
    data: FullPost
  }
export interface PostListingResponse {
    kind: 'Listing'
    data: {
      after: string
      dist: number
      modhash: string
      geo_filter?: null
      children: PostT3[]
    }
    before?: null
  }
export type PostFilter = 'hot' | 'top' | 'new' | 'rising'
export type GeoFilter =
    | 'GLOBAL'
    | 'US'
    | 'AR'
    | 'AU'
    | 'BG'
    | 'CA'
    | 'CL'
    | 'CO'
    | 'HR'
    | 'CZ'
    | 'FI'
    | 'FR'
    | 'DE'
    | 'GR'
    | 'HU'
    | 'IS'
    | 'IN'
    | 'IE'
    | 'IT'
    | 'JP'
    | 'MY'
    | 'MX'
    | 'NZ'
    | 'PH'
    | 'PL'
    | 'PT'
    | 'PR'
    | 'RO'
    | 'RS'
    | 'SG'
    | 'ES'
    | 'SE'
    | 'TW'
    | 'TH'
    | 'TR'
    | 'GB'
    | 'US_WA'
    | 'US_DE'
    | 'US_DC'
    | 'US_WI'
    | 'US_WV'
    | 'US_HI'
    | 'US_FL'
    | 'US_WY'
    | 'US_NH'
    | 'US_NJ'
    | 'US_NM'
    | 'US_TX'
    | 'US_LA'
    | 'US_NC'
    | 'US_ND'
    | 'US_NE'
    | 'US_TN'
    | 'US_NY'
    | 'US_PA'
    | 'US_CA'
    | 'US_NV'
    | 'US_VA'
    | 'US_CO'
    | 'US_AK'
    | 'US_AL'
    | 'US_AR'
    | 'US_VT'
    | 'US_IL'
    | 'US_GA'
    | 'US_IN'
    | 'US_IA'
    | 'US_OK'
    | 'US_AZ'
    | 'US_ID'
    | 'US_CT'
    | 'US_ME'
    | 'US_MD'
    | 'US_MA'
    | 'US_OH'
    | 'US_UT'
    | 'US_MO'
    | 'US_MN'
    | 'US_MI'
    | 'US_RI'
    | 'US_KS'
    | 'US_MT'
    | 'US_MS'
    | 'US_SC'
    | 'US_KY'
    | 'US_OR'
    | 'US_SD'
export type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
export type GetSubredditPostsOptions = {
    subreddit: string
    type?: PostFilter
    // Pagination size and offset (count)
    limit?: number
    count?: number
    // Pagination by fullnames of posts
    before?: string
    after?: string
    /**
     * Geographical filter. Only applicable to 'hot' posts.
     */
    geo?: GeoFilter
    /**
     * Filter by time period. Only applicable to 'top' posts.
     */
    time?: TimePeriod
  }
⋮----
// Pagination size and offset (count)
⋮----
// Pagination by fullnames of posts
⋮----
/**
     * Geographical filter. Only applicable to 'hot' posts.
     */
⋮----
/**
     * Filter by time period. Only applicable to 'top' posts.
     */
⋮----
export interface PostListingResult {
    subreddit: string
    type: PostFilter
    geo?: GeoFilter
    time?: TimePeriod
    posts: Post[]
  }
⋮----
/**
 * Basic readonly Reddit API for fetching top/hot/new/rising posts from subreddits.
 *
 * Uses Reddit's legacy JSON API aimed at RSS feeds.
 *
 * @see https://old.reddit.com/dev/api
 */
export class RedditClient extends AIFunctionsProvider
⋮----
constructor({
    baseUrl = reddit.BASE_URL,
    userAgent = 'agentic-reddit-client/1.0.0',
    timeoutMs = 60_000,
    ky = defaultKy
  }: {
    baseUrl?: string
    userAgent?: string
    timeoutMs?: number
    ky?: KyInstance
} =
/**
   * Fetches posts from a subreddit.
   *
   * @see https://old.reddit.com/dev/api/#GET_hot
   */
⋮----
async getSubredditPosts(
    subredditOrOpts: string | reddit.GetSubredditPostsOptions
): Promise<reddit.PostListingResult>
⋮----
// Trim the post data to only include the bare minimum
// TODO: add preview images
// TODO: add video media info
```

## File: lib/tools/agentic/wikidata-client.ts

```typescript
import { AIFunctionsProvider, assert, getEnv, throttleKy } from '@agentic/core'
import defaultKy, { type KyInstance } from 'ky'
import pThrottle from 'p-throttle'
import wdk from 'wikibase-sdk/wikidata.org'
import { createAISDKTools } from './ai-sdk'
⋮----
// Allow up to 200 requests per second by default.
⋮----
export type SimplifiedEntityMap = Record<string, SimplifiedEntity>
export interface SimplifiedEntity {
    id: string
    type: string
    claims: Claims
    modified: string
    labels?: Descriptions
    descriptions?: Descriptions
    aliases?: any
    sitelinks?: Sitelinks
  }
export interface Claims {
    [key: string]: Claim[]
  }
export interface Claim {
    value: string
    qualifiers: Record<string, string[] | number[]>
    references: Record<string, string[]>[]
  }
export type Descriptions = Record<string, string>
export type Sitelinks = Record<string, string>
⋮----
/**
 * Basic Wikidata client.
 *
 * @see https://github.com/maxlath/wikibase-sdk
 *
 * TODO: support any wikibase instance
 */
export class WikidataClient extends AIFunctionsProvider
⋮----
constructor({
    apiUserAgent = getEnv('WIKIDATA_API_USER_AGENT') ??
      'Agentic (https://github.com/transitive-bullshit/agentic)',
    throttle = true,
    ky = defaultKy
  }: {
    apiBaseUrl?: string
    apiUserAgent?: string
    throttle?: boolean
    ky?: KyInstance
} =
async getEntityById(
    idOrOpts: string | { id: string; languages?: string[] }
): Promise<wikidata.SimplifiedEntity>
⋮----
// TODO: Make this configurable and double-check defaults.
⋮----
async getEntitiesByIds(
    idsOrOpts: string[] | { ids: string; languages?: string[] }
): Promise<wikidata.SimplifiedEntityMap>
⋮----
// TODO: Separate between wdk.getEntities and wdk.getManyEntities depending
// on how many `ids` there are.
```

## File: lib/tools/agentic/wikipedia-client.ts

```typescript
import {
  aiFunction,
  AIFunctionsProvider,
  assert,
  getEnv,
  throttleKy
} from '@agentic/core'
import defaultKy, { type KyInstance } from 'ky'
import pThrottle from 'p-throttle'
import { z } from 'zod'
import { createAISDKTools } from './ai-sdk'
⋮----
// Allow up to 200 requests per second by default.
⋮----
export interface SearchOptions {
    query: string
    limit?: number
  }
export interface PageSearchResponse {
    pages: Page[]
  }
export interface Page {
    id: number
    key: string
    title: string
    matched_title: null
    excerpt: string
    description: null | string
    thumbnail: Thumbnail | null
  }
export interface Thumbnail {
    url: string
    width: number
    height: number
    mimetype: string
    duration: null
  }
export interface PageSummaryOptions {
    title: string
    redirect?: boolean
    acceptLanguage?: string
  }
export interface PageSummaryResponse {
    ns?: number
    index?: number
    type: string
    title: string
    displaytitle: string
    namespace: { id: number; text: string }
    wikibase_item: string
    titles: { canonical: string; normalized: string; display: string }
    pageid: number
    thumbnail: {
      source: string
      width: number
      height: number
    }
    originalimage: {
      source: string
      width: number
      height: number
    }
    lang: string
    dir: string
    revision: string
    tid: string
    timestamp: string
    description: string
    description_source: string
    content_urls: {
      desktop: {
        page: string
        revisions: string
        edit: string
        talk: string
      }
      mobile: {
        page: string
        revisions: string
        edit: string
        talk: string
      }
    }
    extract: string
    extract_html: string
    normalizedtitle?: string
    coordinates?: {
      lat: number
      lon: number
    }
  }
⋮----
/**
 * Basic Wikipedia API client for searching wiki pages and resolving page data.
 *
 * @see https://www.mediawiki.org/wiki/API
 */
export class WikipediaClient extends AIFunctionsProvider
⋮----
constructor({
    apiBaseUrl = getEnv('WIKIPEDIA_API_BASE_URL') ??
      'https://en.wikipedia.org/api/rest_v1',
    apiUserAgent = getEnv('WIKIPEDIA_API_USER_AGENT') ??
      'Agentic (https://github.com/transitive-bullshit/agentic)',
    throttle = true,
    ky = defaultKy
  }: {
    apiBaseUrl?: string
    apiUserAgent?: string
    throttle?: boolean
    ky?: KyInstance
} =
/**
   * Searches Wikipedia for pages matching the given query. */
⋮----
async search(
⋮----
// https://www.mediawiki.org/wiki/API:REST_API
⋮----
/**
   * Gets a summary of the given Wikipedia page.
   */
⋮----
async getPageSummary({
    title,
    acceptLanguage = 'en-us',
    redirect = true,
    ...opts
}: wikipedia.PageSummaryOptions)
⋮----
// https://en.wikipedia.org/api/rest_v1/
```

## File: lib/tools/data-tools.ts

```typescript
/**
 * @file Back-compatibility barrel so existing imports such as
 *       `import { tools } from "@/lib/tools/data-tools"` keep working
 *       after the tool-suite was moved to `lib/tools/data/`.
 *
 * @remarks
 *   • The real implementation now lives in `lib/tools/data/tools.ts`.
 *   • We re-export its `tools` object plus the public `types` and
 *     `constants` modules for direct consumption when needed.
 */
import { tools as dataTools } from './data/tools';
```

## File: lib/tools/file-tools.ts

```typescript
/**
 * @file Backwards-compatibility barrel for the “file” tool-suite.
 *
 * @remarks
 *   • Consumers can continue to `import … from "@/lib/tools/file-tools"`
 *     while the real implementation lives in `lib/tools/file/`.
 *   • We simply import the symbols so that TypeScript resolves the files
 *     then we re-export what callers are expected to see.
 */
import { tools as fileTools } from './file/tools';
```

## File: lib/tools/rag-tools.ts

```typescript
/**
 * @file Back-compatibility barrel so existing imports such as
 *       `import { tools } from "@/lib/tools/rag-tools"` keep working
 *       after the tool-suite was moved to `lib/tools/rag/`.
 *
 * @remarks
 *   • The real implementation now lives in `lib/tools/rag/tools.ts`.
 *   • We re-export its `tools` object plus the public `types` and
 *     `constants` modules for direct consumption when needed.
 */
import { tools as ragTools } from './rag/tools';
```

## File: lib/tools/tools.json

```json
{
  "@context": [
    "https://schema.org",
    { "feature": "https://schema.org/hasFeature" }
  ],
  "@type": "Graph",
  "name": "DeanmachinesAI Tool System Knowledge Graph",
  "description": "Comprehensive, standards-compliant, agent-friendly knowledge graph for the /lib/tools backend, supporting onboarding, troubleshooting, and continuous improvement.",
  "version": "1.0.0",
  "generatedAt": "2025-05-14T00:00:00Z",
  "@graph": [
    {
      "@id": "lib/tools/agentic/ai-sdk.ts",
      "@type": ["CodeFile", "AgenticTool"],
      "path": "lib/tools/agentic/ai-sdk.ts",
      "exports": ["createAISDKTools"],
      "features": ["Converts Agentic AI functions to Vercel AI SDK-compatible tools object"],
      "status": "errors-present",
      "errors": [],
      "relationships": [
        { "type": "used-by", "target": "lib/tools/agentic/index.ts" }
      ],
      "observations": ["Always use createAISDKTools to wrap AIFunctionsProvider instances for agentic tools."],
      "mentalModels": [
        "First Principles: Define clear contracts for agentic tool conversion.",
        "Testability: Ensure all conversions are covered by tests for edge cases.",
        "Explicit Contracts: Document function signatures and expected tool shapes.",
        "Feedback Loops: Validate output with downstream consumers (SDK, registry).",
        "Pattern Recognition: Watch for subtle type mismatches and integration bugs."
      ],
      "wiringPatterns": [
        "Import via barrels and index.ts for unified access.",
        "Register in toolRegistry.ts and initialize in toolInitializer.ts.",
        "Wire into API routes (./app/api/ai-sdk/*) and SDK consumers.",
        "Document usage and integration in README and tools.json."
      ],
      "diagnostics": {
        "commonErrors": [
          "Missing Zod schema or discriminated union.",
          "Not registered in toolRegistry.ts or not initialized.",
          "Barrel or index.ts missing export.",
          "Type mismatch in API route wiring."
        ],
        "troubleshooting": [
          "Check get_errors output after every edit.",
          "Validate all exports and imports in barrels and index.ts.",
          "Ensure all types are Zod-validated and shared.",
          "Cross-reference README and tools.json for integration notes."
        ],
        "selfHealing": [
          "Fallback to default tool suite if custom tool fails.",
          "Auto-recover from transient registry/initializer errors."
        ]
      ],
      "testCoverage": {
        "status": "partial",
        "missingCases": ["Edge-case input validation", "Error propagation"],
        "testFiles": ["tests/tools/agentic/ai-sdk.test.ts"]
      },
      "changeHistory": [
        { "date": "2025-05-14", "change": "Initial refactor for knowledge graph compliance." },
        { "date": "2025-05-13", "change": "Added Zod validation and discriminated unions." }
      ],
      "riskAssessment": {
        "riskLevel": "high",
        "risks": ["Central registry failure impacts all tool flows."],
        "mitigations": ["Extensive tests, fallback logic, and observability."]
      },
      "mentalModelMap": [
        "First Principles", "Testability", "Explicit Contracts"
      ]
    },
    {
      "@id": "lib/tools/agentic/index.ts",
      "@type": ["BarrelFile"],
      "path": "lib/tools/agentic/index.ts",
      "exports": ["WikipediaTools", "RedditTools", "ArXivTools", "CalculatorTools"],
      "features": ["Provides stable import paths for agentic tools"],
      "status": "errors-present",
      "errors": [],
      "relationships": [
        { "type": "barrel-for", "target": "lib/tools/agentic/ai-sdk.ts" }
      ],
      "observations": ["Re-exports all agentic tools for unified access."],
      "mentalModels": [
        "Consistency: Ensure all agentic tools are re-exported and up to date.",
        "Layered Abstraction: Keep barrel logic separate from tool logic.",
        "Feedback Loops: Test all imports/exports after changes.",
        "Rubber Ducking: Explain the barrel's wiring to catch missing exports.",
        "Graceful Degradation: Handle missing or broken exports cleanly."
      ],
      "wiringPatterns": [
        "Import via barrels and index.ts for unified access.",
        "Register in toolRegistry.ts and initialize in toolInitializer.ts.",
        "Wire into API routes (./app/api/ai-sdk/*) and SDK consumers.",
        "Document usage and integration in README and tools.json."
      ],
      "diagnostics": {
        "commonErrors": [
          "Missing Zod schema or discriminated union.",
          "Not registered in toolRegistry.ts or not initialized.",
          "Barrel or index.ts missing export.",
          "Type mismatch in API route wiring."
        ],
        "troubleshooting": [
          "Check get_errors output after every edit.",
          "Validate all exports and imports in barrels and index.ts.",
          "Ensure all types are Zod-validated and shared.",
          "Cross-reference README and tools.json for integration notes."
        ],
        "selfHealing": [
          "Fallback to default tool suite if custom tool fails.",
          "Auto-recover from transient registry/initializer errors."
        ]
      ],
      "testCoverage": {
        "status": "partial",
        "missingCases": ["Edge-case input validation", "Error propagation"],
        "testFiles": ["tests/tools/agentic/index.test.ts"]
      },
      "changeHistory": [
        { "date": "2025-05-14", "change": "Initial refactor for knowledge graph compliance." },
        { "date": "2025-05-13", "change": "Added Zod validation and discriminated unions." }
      ]
    },
    {
      "@id": "lib/tools/api-tools.ts",
      "@type": ["BarrelFile"],
      "path": "lib/tools/api-tools.ts",
      "exports": ["ApiTools"],
      "features": ["Provides stable import paths for API tools"],
      "status": "errors-present",
      "errors": [],
      "relationships": [
        { "type": "barrel-for", "target": "lib/tools/api/tools.ts" }
      ],
      "observations": ["Re-exports all API tools for unified access."],
      "mentalModels": [
        "Consistency: Keep exports in sync with ./api/tools.ts.",
        "Explicit Contracts: Document all re-exported symbols.",
        "Feedback Loops: Test import paths in all consumers.",
        "Pattern Recognition: Watch for drift between barrels and source files.",
        "Layered Abstraction: Separate API tool logic from barrel wiring."
      ],
      "wiringPatterns": [
        "Import via barrels and index.ts for unified access.",
        "Register in toolRegistry.ts and initialize in toolInitializer.ts.",
        "Wire into API routes (./app/api/ai-sdk/*) and SDK consumers.",
        "Document usage and integration in README and tools.json."
      ],
      "diagnostics": {
        "commonErrors": [
          "Missing Zod schema or discriminated union.",
          "Not registered in toolRegistry.ts or not initialized.",
          "Barrel or index.ts missing export.",
          "Type mismatch in API route wiring."
        ],
        "troubleshooting": [
          "Check get_errors output after every edit.",
          "Validate all exports and imports in barrels and index.ts.",
          "Ensure all types are Zod-validated and shared.",
          "Cross-reference README and tools.json for integration notes."
        ],
        "selfHealing": [
          "Fallback to default tool suite if custom tool fails.",
          "Auto-recover from transient registry/initializer errors."
        ]
      ],
      "testCoverage": {
        "status": "partial",
        "missingCases": ["Edge-case input validation", "Error propagation"],
        "testFiles": ["tests/tools/api-tools.test.ts"]
      },
      "changeHistory": [
        { "date": "2025-05-14", "change": "Initial refactor for knowledge graph compliance." },
        { "date": "2025-05-13", "change": "Added Zod validation and discriminated unions." }
      ]
    },
    {
      "@id": "lib/tools/toolRegistry.ts",
      "@type": ["RegistryFile", "DiamondCore"],
      "path": "lib/tools/toolRegistry.ts",
      "exports": ["ToolRegistry", "toolRegistry"],
      "features": ["Central registry for managing, categorizing, and validating all tools"],
      "status": "errors-present",
      "errors": [],
      "dependencies": ["toolInitializer.ts", "upstash-tool-execution-store.ts", "zod", "ai"],
      "consumedBy": ["ai-sdk-integration.ts", "ai-sdk-tracing.ts", "ai-integration.ts", "./app/api/ai-sdk/*"],
      "relationships": [
        { "type": "registry-for", "target": "lib/tools/agentic/" },
        { "type": "registry-for", "target": "lib/tools/api/" },
        { "type": "registry-for", "target": "lib/tools/code/" },
        { "type": "registry-for", "target": "lib/tools/data/" },
        { "type": "registry-for", "target": "lib/tools/file/" },
        { "type": "registry-for", "target": "lib/tools/graphql/" },
        { "type": "registry-for", "target": "lib/tools/rag/" },
        { "type": "registry-for", "target": "lib/tools/web/" }
      ],
      "observations": ["Registry is critical for agent/SDK tool orchestration."],
      "mentalModels": [
        "Defensive Programming: Validate all tool registrations and lookups.",
        "Observability: Instrument registry operations for debugging.",
        "Explicit Contracts: Document registry APIs and expected behaviors.",
        "Feedback Loops: Test registry with all tool suites and consumers.",
        "Layered Abstraction: Keep registry logic distinct from tool logic."
      ],
      "wiringPatterns": [
        "Import via barrels and index.ts for unified access.",
        "Register in toolRegistry.ts and initialize in toolInitializer.ts.",
        "Wire into API routes (./app/api/ai-sdk/*) and SDK consumers.",
        "Document usage and integration in README and tools.json."
      ],
      "diagnostics": {
        "commonErrors": [
          "Missing Zod schema or discriminated union.",
          "Not registered in toolRegistry.ts or not initialized.",
          "Barrel or index.ts missing export.",
          "Type mismatch in API route wiring."
        ],
        "troubleshooting": [
          "Check get_errors output after every edit.",
          "Validate all exports and imports in barrels and index.ts.",
          "Ensure all types are Zod-validated and shared.",
          "Cross-reference README and tools.json for integration notes."
        ],
        "selfHealing": [
          "Fallback to default tool suite if custom tool fails.",
          "Auto-recover from transient registry/initializer errors."
        ]
      ],
      "testCoverage": {
        "status": "partial",
        "missingCases": ["Edge-case input validation", "Error propagation"],
        "testFiles": ["tests/tools/toolRegistry.test.ts"]
      },
      "changeHistory": [
        { "date": "2025-05-14", "change": "Initial refactor for knowledge graph compliance." },
        { "date": "2025-05-13", "change": "Added Zod validation and discriminated unions." }
      ],
      "riskAssessment": {
        "riskLevel": "high",
        "risks": ["Central registry failure impacts all tool flows."],
        "mitigations": ["Extensive tests, fallback logic, and observability."]
      }
    },
    {
      "@id": "lib/tools/toolInitializer.ts",
      "@type": ["InitializerFile", "DiamondCore"],
      "path": "lib/tools/toolInitializer.ts",
      "exports": [
        "initializeTools",
        "initializeBuiltInTools",
        "initializeCustomTools",
        "initializeAgenticTools"
      ],
      "features": [
        "Handles initialization of built-in, custom, and agentic tools",
        "Supports Upstash, Supabase, and future DBs via adapters",
        "Observability via tracing and event logging",
        "Type-safe, Zod-validated tool loading"
      ],
      "status": "diamond-core",
      "errors": [],
      "dependencies": [
        "web-tools.ts",
        "code-tools.ts",
        "data-tools.ts",
        "file-tools.ts",
        "api-tools.ts",
        "rag-tools.ts",
        "agentic/index.ts",
        "zod",
        "ai"
      ],
      "consumedBy": [
        "toolRegistry.ts",
        "index.ts",
        "ai-sdk-integration.ts",
        "ai-sdk-tracing.ts",
        "ai-integration.ts",
        "./app/api/ai-sdk/*"
      ],
      "relationships": [
        { "type": "initializer-for", "target": "lib/tools/agentic/" },
        { "type": "initializer-for", "target": "lib/tools/api/" },
        { "type": "initializer-for", "target": "lib/tools/code/" },
        { "type": "initializer-for", "target": "lib/tools/data/" },
        { "type": "initializer-for", "target": "lib/tools/file/" },
        { "type": "initializer-for", "target": "lib/tools/graphql/" },
        { "type": "initializer-for", "target": "lib/tools/rag/" },
        { "type": "initializer-for", "target": "lib/tools/web/" }
      ],
      "observations": [
        "Initializer wires up all tool suites for agentic and SDK use.",
        "Critical for onboarding new DB adapters (Upstash, Supabase, etc)."
      ],
      "mentalModels": [
        "Defensive Programming: Validate all tool initializations.",
        "Observability: Log initialization steps for debugging.",
        "Explicit Contracts: Document initialization APIs and expected behaviors.",
        "Feedback Loops: Test initialization with all tool suites and consumers.",
        "Layered Abstraction: Keep initialization logic distinct from tool logic."
      ],
      "wiringPatterns": [
        "Call from barrels and index.ts for unified access.",
        "Register all tools in toolRegistry.ts after initialization.",
        "Wire into API routes and SDK consumers.",
        "Document usage and integration in README and tools.json."
      ],
      "diagnostics": {
        "commonErrors": [
          "Missing or broken DB adapter integration (Upstash, Supabase, etc)",
          "Not all tool suites initialized or exported",
          "Type mismatch in tool loading or registry wiring"
        ],
        "troubleshooting": [
          "Check get_errors output after every edit.",
          "Validate all exports and imports in barrels and index.ts.",
          "Ensure all types are Zod-validated and shared.",
          "Cross-reference README and tools.json for integration notes."
        ],
        "selfHealing": [
          "Fallback to default tool suite if custom tool fails.",
          "Auto-recover from transient DB/adapter errors."
        ]
      ],
      "testCoverage": {
        "status": "partial",
        "missingCases": ["Adapter fallback logic", "Edge-case DB errors"],
        "testFiles": ["tests/tools/toolInitializer.test.ts"]
      ],
      "changeHistory": [
        { "date": "2025-05-14", "change": "Initial diamond core node for knowledge graph compliance." }
      ],
      "riskAssessment": {
        "riskLevel": "high",
        "risks": ["Initialization failure blocks all tool usage.", "Adapter bugs can break all DB-backed tools."],
        "mitigations": ["Extensive tests, fallback logic, and observability.", "Document adapter integration and error handling."]
      },
      "mentalModelMap": [
        "Defensive Programming", "Observability", "Explicit Contracts"
      ]
    },
    {
      "@id": "lib/tools/upstash-tool-execution-store.ts",
      "@type": ["AdapterFile", "DiamondCore"],
      "path": "lib/tools/upstash-tool-execution-store.ts",
      "exports": ["logToolExecution", "getToolExecution", "listToolExecutions", "getToolStats", "ToolExecutionDataSchema", "ToolStatsSchema", "ToolExecutionStoreError"],
      "features": [
        "Tool execution logging and analytics",
        "Zod schemas for execution data and stats",
        "Upstash Redis integration",
        "Observability and error tracking for all tool calls"
      ],
      "status": "diamond-core",
      "errors": [],
      "dependencies": ["zod", "upstash-redis", "toolRegistry.ts", "toolInitializer.ts"],
      "consumedBy": ["toolRegistry.ts", "toolInitializer.ts", "rag/tools.ts", "ai-sdk-integration.ts", "ai-sdk-tracing.ts"],
      "relationships": [
        { "type": "adapter-for", "target": "lib/tools/rag/" },
        { "type": "adapter-for", "target": "lib/tools/toolRegistry.ts" },
        { "type": "adapter-for", "target": "lib/tools/toolInitializer.ts" }
      ],
      "observations": [
        "Central for tool execution observability and error tracking.",
        "Upstash is the main DB for tool execution state and analytics."
      ],
      "mentalModels": [
        "Defensive Programming: Validate all execution logs and schemas.",
        "Observability: Instrument logging operations for debugging.",
        "Explicit Contracts: Document logging APIs and expected behaviors.",
        "Feedback Loops: Test logging with all tool suites and consumers.",
        "Layered Abstraction: Keep logging logic distinct from tool logic."
      ],
      "wiringPatterns": [
        "Call from registry, initializer, and tool suites for execution logging.",
        "Wire into API routes and SDK for analytics and observability.",
        "Document usage and integration in README and tools.json."
      ],
      "diagnostics": {
        "commonErrors": [
          "Upstash not available or misconfigured",
          "Zod schema validation errors",
          "Execution log not written or retrieved",
          "Type mismatch in analytics consumers"
        ],
        "troubleshooting": [
          "Check Upstash connection and credentials.",
          "Validate all Zod schemas and types.",
          "Cross-reference README and tools.json for integration notes."
        ],
        "selfHealing": [
          "Fallback to in-memory logging if Upstash is unavailable.",
          "Auto-recover from transient Redis errors."
        ]
      ],
      "testCoverage": {
        "status": "partial",
        "missingCases": ["Upstash outage handling", "Edge-case analytics errors"],
        "testFiles": ["tests/tools/upstash-tool-execution-store.test.ts"]
      ],
      "changeHistory": [
        { "date": "2025-05-14", "change": "Initial diamond core node for Upstash adapter and analytics." }
      ],
      "riskAssessment": {
        "riskLevel": "high",
        "risks": ["Upstash outage or adapter bug breaks all tool execution logging and analytics."],
        "mitigations": ["Extensive tests, fallback logic, and observability.", "Document Upstash integration and error handling."]
      },
      "mentalModelMap": [
        "Defensive Programming", "Observability", "Explicit Contracts"
      ]
    }
  ],
  "meta": {
    "source": { "@value": "auto-generated from README.md, error reports, and codebase as of 2025-05-14", "@language": "en" },
    "updateStrategy": { "@value": "automated extraction and continuous update via CI/CD and AI agent workflows", "@language": "en" },
    "automation": {
      "strategy": { "@value": "pre-commit hook + CI/CD bot", "@language": "en" },
      "lastAutomated": { "@value": "2025-05-14T00:00:00Z", "@type": "xsd:dateTime" }
    },
    "intendedUse": { "@value": [
      "AI agent onboarding and navigation",
      "Human contributor onboarding",
      "Feature coverage and TODO tracking",
      "Semantic/graph search for code and docs",
      "Continuous improvement and documentation enforcement"
    ], "@language": "en" },
    "diamondCore": { "@value": "A diamond core file is one that is absolutely central to the tool system's integrity, reliability, and extensibility. Bugs or design flaws here have system-wide impact. These files require the highest level of review, testing, and documentation.", "@language": "en" }
  },
  "onboarding": {
    "purpose": { "@value": "This onboarding is for AI agents and advanced human contributors. Its goal is to ensure robust, error-free, and continuously improving tool system development. All steps are designed for reliability, self-improvement, and persistent insight.", "@language": "en" },
    "audience": { "@value": "AI agents (Copilot, LLMs, automated CI/CD bots)", "@language": "en" },
    "corePrinciples": { "@value": [
      "Type safety and Zod validation are required for all tool modules.",
      "After every file edit, always use get_error to check for errors before considering the task complete.",
      "Always cross-reference changes with all consumer files (toolRegistry.ts, toolInitializer.ts, upstash-tool-execution-store.ts, barrels, and agentic tools).",
      "Update onboarding, knowledge graph, and README with new features, patterns, and lessons learned.",
      "Use semantic/graph search and mental models for navigation, troubleshooting, and continuous improvement."
    ], "@language": "en" },
    "steps": { "@value": [
      "Read the README.md in full, focusing on the Implementation Guide, Feature Table, and Best Practices.",
      "Review the entities and relationships in this tools.json knowledge graph for a map of the codebase.",
      "Use semantic/graph search to answer 'how do I...?' questions about types, modules, and workflows.",
      "Follow the Production Readiness Checklist in the README before merging changes.",
      "Update this knowledge graph and README with new features, patterns, and lessons learned.",
      "After editing any file, you must use get_error before considering the task complete to ensure the file is error-free.",
      "After any change, check all consumer files (toolRegistry.ts, toolInitializer.ts, upstash-tool-execution-store.ts, barrels, and agentic tools) for compatibility and update as needed.",
      "Wire up all tools in toolRegistry.ts and toolInitializer.ts for agentic and SDK use.",
      "Ensure all tools are accessible from ai-sdk-integration.ts, ai-sdk-tracing.ts, ai-integration.ts, and ./app/api/ai-sdk routes."
    ], "@language": "en" },
    "wiring": { "@value": [
      "Register every tool suite and tool in toolRegistry.ts for discoverability and agentic access.",
      "Initialize all built-in, custom, and agentic tools in toolInitializer.ts.",
      "Export all tools via barrels (e.g., api-tools.ts, code-tools.ts) and index.ts for stable imports.",
      "Integrate upstash-tool-execution-store.ts for execution logging and observability.",
      "Ensure all tools are available to ai-sdk-integration.ts, ai-sdk-tracing.ts, ai-integration.ts, and ./app/api/ai-sdk routes by exporting from index.ts and wiring in registry/initializer.",
      "For new tools, follow the README onboarding: implement with Zod schemas, discriminated-union result types, and robust error handling."
    ], "@language": "en" },
    "troubleshooting": { "@value": [
      "If a tool is not available in the SDK or API, check for missing registration in toolRegistry.ts or toolInitializer.ts.",
      "If execution logging is missing, ensure upstash-tool-execution-store.ts is integrated and schemas are correct.",
      "If type errors occur, check for missing or incorrect Zod schemas and discriminated-union result types.",
      "If barrels are missing exports, update the barrel files to re-export all expected symbols.",
      "For integration with ai-sdk-integration.ts, ai-sdk-tracing.ts, ai-integration.ts, and ./app/api/ai-sdk, ensure all tools are exported from index.ts and properly registered."
    ], "@language": "en" },
    "usageNotes": { "@value": "Use this knowledge graph for onboarding, troubleshooting, and wiring all tool modules for agentic and SDK use. Always validate with get_error and update documentation as you go.", "@language": "en" },
    "graphNotes": { "@value": "Critical for tool system wiring and agentic workflows. All AI SDK and API flows depend on correct tool registration and initialization.", "@language": "en" }
  },
  "navigation": {
    "byFile": { "@value": "Use the '@graph' array to locate files, their features, status, and relationships.", "@language": "en" },
    "byFeature": { "@value": "Search for features (e.g., web search, code execution, RAG, file ops) in the 'features' fields.", "@language": "en" },
    "byType": { "@value": "Find types and Zod schemas in each file and referenced in each file's 'exports'.", "@language": "en" },
    "byStatus": { "@value": "Track progress using the 'status' and 'todo' fields for each entity.", "@language": "en" },
    "crossref": { "@value": "Use 'relationships' to see which files import, use, or export others, and how tools are wired to ai-sdk-integration.ts, ai-sdk-tracing.ts, ai-integration.ts, and ./app/api/ai-sdk routes.", "@language": "en" },
    "insightAccumulation": { "@value": "Every time you reference or use this knowledge graph, you accumulate insights about file relationships, error patterns, and wiring strategies. This builds stronger context awareness for both agents and humans, enabling more accurate troubleshooting, smarter code navigation, and continuous improvement. Insight accumulation is a key differentiator of modern knowledge graphs (2025), supporting real-time decision making, error reduction, and adaptive learning across the tool system.", "@language": "en" },
    "integrationNotes": { "@value": "This is your personal notepad for integration and wiring insights. As you accumulate insights (see 'insightAccumulation'), you should adapt and update the mental models in this knowledge graph to reflect new patterns, lessons learned, and best practices. Use this section to jot down integration pain points, wiring tips, and any changes needed to mental models based on real-world experience.", "@language": "en" }
  },
  "mentalModels": {
    "coreModels": { "@value": [
      "Redundancy: Build in robustness and fallback (e.g., upstash fallback, error handling).",
      "Bottlenecks: Identify and address performance or architectural bottlenecks (e.g., tool registry, tool initialization, execution logging).",
      "Emergence: Expect non-linear behavior from tool/agent interactions (e.g., multi-tool chains, parallel execution).",
      "First Principles: Always define types and contracts first (see type exports, Zod schemas).",
      "Pattern Recognition: Use semantic/graph search to spot code smells, anti-patterns, and repeated errors.",
      "Continuous Learning: Update docs and knowledge graph as new best practices emerge.",
      "Layered Abstraction: Design each tool suite with clear boundaries and interfaces, enabling easy replacement or extension.",
      "Defensive Programming: Always validate inputs/outputs, handle unexpected states, and fail safely.",
      "Idempotency: Ensure repeated tool calls do not cause side effects or data corruption.",
      "Observability: Instrument all critical paths with tracing, logging, and metrics for rapid debugging and optimization.",
      "Testability: Write code that is easy to test in isolation, with clear contracts and minimal side effects.",
      "Separation of Concerns: Keep tool logic, registry, and API layers distinct for maintainability.",
      "Graceful Degradation: Ensure all features degrade cleanly if a backend (Supabase, LibSQL, Redis, Upstash) is unavailable.",
      "Human-in-the-Loop: Design for easy manual inspection, override, and debugging by human operators.",
      "Explicit Contracts: Document all function signatures, types, and error cases for every exported API.",
      "Fail Fast: Surface errors early and clearly, with actionable messages for both humans and agents.",
      "Self-Healing: Where possible, auto-recover from transient errors (e.g., reconnect, retry, fallback).",
      "Traceability: Every important operation should be traceable from input to output, with context for debugging.",
      "Least Privilege: Minimize access and permissions for each module, especially for DB and cache operations.",
      "Extensibility: Design APIs and data models to allow for future features (e.g., new tool types, new backends).",
      "Consistency: Ensure all modules follow the same conventions for error handling, logging, and type safety."
    ], "@language": "en" },
    "debugging": { "@value": [
      "Check the Feature Coverage Table in README to find missing type safety, logging, or advanced tool support.",
      "Use the Implementation Guide for step-by-step refactoring or feature addition.",
      "For new features, update both code and docs immediately."
    ], "@language": "en" },
    "semanticSearch": { "@value": [
      "Leverage this knowledge graph and README for semantic/graph search (for both AI and human agents).",
      "Use types, features, and relationships as search keys for onboarding and troubleshooting.",
      "Document new patterns and lessons in both README and tools.json for future searchability."
    ], "@language": "en" },
    "codeSmells": { "@value": [
      "Any use of 'any' is a code smell—replace with types/Zod.",
      "Unused imports, types, or variables should be implemented before being removed. Only remove if you are certain they are not needed (see TODOs in each entity).",
      "Missing or outdated documentation in README or tools.json is a process smell."
    ], "@language": "en" }
  },
  "notepad": {
    "purpose": { "@value": "Persistent notes, reminders, and troubleshooting tips for AI agents. Use this to record lessons learned, common pitfalls, and debugging strategies.", "@language": "en" },
    "entries": { "@value": [
      "Always check for type errors and remove all 'any' usage.",
      "If a change breaks a consumer (toolRegistry.ts, toolInitializer.ts, upstash-tool-execution-store.ts, barrels, or agentic tools), update onboarding and docs immediately.",
      "Document new patterns, fixes, and lessons here for future agent runs.",
      "If you encounter a recurring error, add a note here with the fix or workaround.",
      "Use this notepad to leave yourself reminders for long-term improvements or TODOs."
    ], "@language": "en" }
  },
  "taskList": {
    "completed": { "@value": [
      "Refactored all tool barrels and registry/initializer for type safety and error handling.",
      "Drafted comprehensive README.md with onboarding, advanced usage, and AI agent guidance.",
      "Created initial tools.json knowledge graph with entities, features, and relationships."
    ], "@language": "en" },
    "current": { "@value": [
      "Expand tools.json with onboarding, navigation, crossref, and mental models.",
      "Fix all outstanding type/lint errors and remove any from all modules.",
      "Implement and document advanced features (multi-tool chains, parallel execution, execution logging, etc.).",
      "For every tool file: strictly remove all 'any' types, unused imports/vars; ensure all types are Zod-validated and shared; add/expand tests for all modules, especially for advanced tool and registry logic; update and fix all broken exports in barrels and index.ts; add more usage examples and documentation for advanced features in README.md; keep README.md and tools.json in sync as features are added and errors are fixed.",
      "Automate extraction and continuous update of the knowledge graph via CI/CD and AI agent workflows.",
      "Continuously expand tests and documentation as features are added and errors are fixed.",
      "Incorporate new onboarding, semantic search, and mental model techniques as they emerge.",
      "Ensure all changes are validated with get_error after every file edit and before completion.",
      "Wire all tools for use in ai-sdk-integration.ts, ai-sdk-tracing.ts, ai-integration.ts, and ./app/api/ai-sdk routes."
    ], "@language": "en" },
    "longTerm": { "@value": [
      "Automate extraction and continuous update of the knowledge graph via CI/CD and AI agent workflows.",
      "Continuously expand tests and documentation as features are added and errors are fixed.",
      "Incorporate new onboarding, semantic search, and mental model techniques as they emerge.",
      "Achieve full-stack, production-grade wiring: ensure every tool is discoverable, validated, and functional from registry/initializer through API routes, memory, agent flows, and into ai/react frontend components and page files, with seamless error handling, observability, and test coverage.",
      "Ensure all tools, memory, and agent flows are robustly integrated and validated end-to-end, supporting advanced agentic workflows and memory persistence in production.",
      "Maintain flawless, professional-grade user and agent experience across all routes, SDK, and UI layers."
    ], "@language": "en" },
    "fileSpecific": {
      "toolRegistry.ts": { "@value": [
        "Fix all type errors in registry logic (see get_errors).",
        "Refine Tool generics and registry types for exhaustive type safety.",
        "Improve error handling for registration and lookup failures.",
        "Add/expand tests for registry and initialization logic.",
        "Document registry API and usage patterns in README and tools.json.",
        "Ensure registry supports dynamic tool loading and hot-reload for agent workflows."
      ], "@language": "en" },
      "toolInitializer.ts": { "@value": [
        "Remove all 'any' types and unused imports/vars.",
        "Add/expand tests for tool initialization and custom tool loading.",
        "Document initialization API and usage patterns in README and tools.json.",
        "Ensure initializer supports dynamic tool injection for agent and memory flows."
      ], "@language": "en" },
      "upstash-tool-execution-store.ts": { "@value": [
        "Fix all type errors in execution logging and schema logic (see get_errors).",
        "Refine Zod schemas for execution data and stats.",
        "Replace all direct console statements with structured logging or observability events.",
        "Add/expand tests for execution logging and error handling.",
        "Document logging and observability patterns in README and tools.json.",
        "Ensure execution store supports tracing and analytics for agent/memory workflows."
      ], "@language": "en" },
      "barrels and index.ts": { "@value": [
        "Ensure all barrels re-export all expected symbols.",
        "Fix any missing or broken exports in index.ts for unified tool access.",
        "Document barrel and index wiring patterns in README and tools.json.",
        "Ensure barrels and index.ts are always in sync with tool suite changes."
      ], "@language": "en" },
      "api routes (./app/api/ai-sdk/*)": { "@value": [
        "Map and document all API routes that consume tools, memory, or agent flows.",
        "Ensure all routes are robustly typed, validated, and error-handled.",
        "Add/expand tests for all API routes, especially for agent/memory integration.",
        "Document route-to-tool/agent/memory wiring in README and tools.json.",
        "Ensure all API routes are discoverable and testable from the knowledge graph."
      ], "@language": "en" },
      "ai/react frontend components": { "@value": [
        "Map and document all ai/react components that consume tools, memory, or agent flows.",
        "Ensure all components are robustly typed, validated, and error-handled.",
        "Add/expand tests for all components, especially for agent/memory/tool integration.",
        "Document component-to-tool/agent/memory wiring in README and tools.json.",
        "Ensure all frontend components are discoverable and testable from the knowledge graph."
      ], "@language": "en" },
      "page files": { "@value": [
        "Map and document all page files that consume ai/react components, tools, memory, or agent flows.",
        "Ensure all page files are robustly typed, validated, and error-handled.",
        "Add/expand tests for all page files, especially for agent/memory/tool integration.",
        "Document page-to-component/tool/agent/memory wiring in README and tools.json.",
        "Ensure all page files are discoverable and testable from the knowledge graph."
      ], "@language": "en" }
    }
  },
  "enhancements": {
    "@value": [
      "Add per-tool and per-suite usage examples, including advanced/edge-case scenarios, directly in the knowledge graph for agentic onboarding and troubleshooting.",
      "For each @graph node, include a 'wiringPatterns' field describing best-practice integration patterns (e.g., how to wire into API routes, SDK, and frontend).",
      "Add a 'diagnostics' field to each node for common error signatures, troubleshooting steps, and self-healing strategies.",
      "Include a 'testCoverage' field for each node, tracking test status, missing cases, and links to relevant test files.",
      "Add a 'changeHistory' field to each node, summarizing major changes, refactors, and lessons learned (auto-populated from git log or PRs).",
      "Integrate a 'riskAssessment' field for diamond core files, highlighting architectural risks, mitigation strategies, and review requirements.",
      "For agentic tools, add a 'mentalModelMap' linking each tool to the core mental models and onboarding steps it exemplifies.",
      "Add a 'quickStart' section at the top-level for new contributors/agents, with a 5-step guide to wiring, testing, and validating a new tool end-to-end.",
      "Include a 'glossary' section for all key terms, types, and patterns referenced in the knowledge graph, README, and codebase.",
      "Add a 'selfCheck' checklist for agents to run before/after any wiring or refactor, ensuring all best practices are followed and all diagnostics are green.",
      "ENFORCE: All @graph nodes must include wiringPatterns, diagnostics, testCoverage, changeHistory, and (if applicable) riskAssessment and mentalModelMap fields.",
      "ENFORCE: All usage examples, edge-cases, and advanced scenarios must be documented per tool and suite.",
      "ENFORCE: All onboarding, navigation, and glossary sections must be kept in sync with codebase and README changes.",
      "ENFORCE: All selfCheck items must be validated before merge or release."
    ],
    "@language": "en"
  },
  "quickStart": {
    "@value": [
      "1. Read the README and this knowledge graph's onboarding section.",
      "2. Add your new tool to the appropriate suite, with Zod schemas and discriminated-union result types.",
      "3. Register and initialize your tool in toolRegistry.ts and toolInitializer.ts, and export via barrels and index.ts.",
      "4. Wire your tool into API routes and/or SDK, and add usage examples and tests.",
      "5. Run get_error, check diagnostics, and update documentation, onboarding, and the knowledge graph as needed.",
      "6. For every new tool or change, update wiringPatterns, diagnostics, testCoverage, changeHistory, and riskAssessment/mentalModelMap as needed in the knowledge graph node."
    ],
    "@language": "en"
  },
  "glossary": {
    "@value": [
      "Diamond Core: A file or module that is central to the system's integrity and reliability.",
      "Barrel File: A file that re-exports modules for unified import paths.",
      "Agentic Tool: A tool designed for agent workflows, often with advanced orchestration or memory.",
      "Zod Schema: A runtime validation schema for type safety and input/output validation.",
      "Discriminated Union: A TypeScript pattern for robust, type-safe result handling.",
      "Observability: Instrumentation for tracing, logging, and debugging critical paths.",
      "Self-Healing: Code patterns that auto-recover from transient errors or failures.",
      "Wiring: The process of connecting tools, registries, initializers, and consumers (API, SDK, frontend)."
    ],
    "@language": "en"
  },
  "selfCheck": {
    "@value": [
      "[ ] All new/changed files are represented in @graph with actionable fields and mental models.",
      "[ ] All tools are registered, initialized, and exported via barrels and index.ts.",
      "[ ] All Zod schemas and discriminated unions are present and validated.",
      "[ ] All diagnostics and testCoverage fields are green or have actionable TODOs.",
      "[ ] All onboarding, navigation, and glossary sections are up to date.",
      "[ ] All API routes, SDK, and frontend integrations are documented and tested.",
      "[ ] All diamond core files have riskAssessment and changeHistory fields updated.",
      "[ ] All enhancements and best practices in this section are followed.",
      "[ ] All @graph nodes have wiringPatterns, diagnostics, testCoverage, changeHistory, and (if applicable) riskAssessment and mentalModelMap fields completed and up to date.",
      "[ ] All usage examples and edge-cases are documented per tool and suite.",
      "[ ] All onboarding, navigation, and glossary sections are in sync with codebase and README.",
      "[ ] All enhancements and ENFORCE items are validated before merge/release."
    ],
    "@language": "en"
  }
}
```

## File: lib/tools/upstash-tool-execution-store.ts

```typescript
import { getRedisClient } from '../memory/upstash/upstashClients';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { shouldUseUpstash } from '../memory/supabase';
import { trace, span, event } from '../tracing';
// --- Constants for Redis Keys ---
⋮----
const TOOL_EXECUTIONS_INDEX = "tool:executions"; // Sorted set for all tool executions, scored by timestamp
const TOOL_EXECUTIONS_BY_TOOL_PREFIX = "tool:executions:tool:"; // Sorted set of executions for a specific tool
const TOOL_EXECUTIONS_BY_THREAD_PREFIX = "tool:executions:thread:"; // Sorted set of executions for a specific thread
const TOOL_EXECUTIONS_BY_AGENT_PREFIX = "tool:executions:agent:"; // Sorted set of executions for a specific agent
const TOOL_STATS_PREFIX = "tool:stats:"; // Hash of statistics for a specific tool
// --- Zod Schemas ---
/**
 * Schema for tool execution data
 */
⋮----
/**
 * Schema for tool execution input (without id and created_at)
 */
⋮----
/**
 * Schema for tool statistics
 */
⋮----
// --- Types ---
export type ToolExecutionData = z.infer<typeof ToolExecutionDataSchema>;
export type ToolExecutionInput = z.infer<typeof ToolExecutionInputSchema>;
export type ToolStats = z.infer<typeof ToolStatsSchema>;
// --- Error Handling ---
export class ToolExecutionStoreError extends Error
⋮----
constructor(message: string, public cause?: any)
⋮----
/**
 * Creates a trace for a tool execution
 * @param executionData The tool execution data
 * @param userId Optional user ID for the trace
 * @returns A promise that resolves with the trace ID
 */
export async function traceToolExecution(
  executionData: ToolExecutionData,
  userId?: string
): Promise<string | undefined>
⋮----
// Create a trace for this tool execution
⋮----
// Create a span for the tool execution
⋮----
span_kind: 'internal' // Use string instead of enum
⋮----
// Log the result or error
⋮----
// End the span with success
⋮----
// End the span with error
⋮----
/**
 * Logs a tool execution to Redis and optionally creates a trace
 * @param executionData The tool execution data
 * @param options Optional configuration
 * @param options.userId Optional user ID for tracing
 * @param options.enableTracing Whether to enable tracing (default: true)
 * @returns A promise that resolves with the execution ID
 * @throws ToolExecutionStoreError if logging fails
 */
export async function logToolExecution(
  executionData: ToolExecutionInput,
  options?: {
    userId?: string;
    enableTracing?: boolean;
  }
): Promise<string>
⋮----
// Check if Upstash is available
⋮----
// Validate input with Zod
⋮----
// Complete the execution data
⋮----
// Validate complete data with Zod
⋮----
// Create trace if tracing is enabled
⋮----
// Add traceId to metadata if available
⋮----
// Serialize execution data
⋮----
// Use pipeline for atomic operations
⋮----
// Save execution data
⋮----
// Add to global index with timestamp
⋮----
// Add to tool-specific index
⋮----
// Add to thread-specific index if thread_id is provided
⋮----
// Add to agent-specific index if agent_id is provided
⋮----
// Update tool statistics
⋮----
// Increment total executions
⋮----
// Increment success/error count
⋮----
// Update average execution time if provided
⋮----
// Get current average and count
⋮----
// Calculate new average
⋮----
// First execution with time
⋮----
// Update last execution timestamp
⋮----
// Execute pipeline
⋮----
/**
 * Gets a tool execution from Redis
 * @param executionId The execution ID
 * @param options Optional configuration
 * @param options.userId Optional user ID for tracing
 * @param options.enableTracing Whether to enable tracing (default: true)
 * @returns A promise that resolves with the execution data, or null if not found
 * @throws ToolExecutionStoreError if retrieval fails
 */
export async function getToolExecution(
  executionId: string,
  options?: {
    userId?: string;
    enableTracing?: boolean;
  }
): Promise<ToolExecutionData | null>
⋮----
// Check if Upstash is available
⋮----
// Validate executionId
⋮----
// Parse JSON
⋮----
// Validate with Zod
⋮----
// Create trace if tracing is enabled
⋮----
// Create a trace event for retrieving the tool execution
⋮----
/**
 * Lists tool executions for a specific tool
 * @param toolName The tool name
 * @param limit Maximum number of executions to return
 * @param offset Offset for pagination
 * @param options Optional configuration
 * @param options.userId Optional user ID for tracing
 * @param options.enableTracing Whether to enable tracing (default: true)
 * @returns A promise that resolves with an array of execution data
 * @throws ToolExecutionStoreError if listing fails
 */
export async function listToolExecutions(
  toolName: string,
  limit: number = 10,
  offset: number = 0,
  options?: {
    userId?: string;
    enableTracing?: boolean;
  }
): Promise<ToolExecutionData[]>
⋮----
// Check if Upstash is available
⋮----
// Validate parameters
⋮----
// Validate limit and offset
⋮----
// Get execution IDs from tool-specific index
⋮----
// Get execution data for each ID
⋮----
// Parse and validate results
⋮----
// Parse JSON
⋮----
// Validate with Zod
⋮----
// Skip invalid entries but continue processing
⋮----
/**
 * Gets statistics for a specific tool
 * @param toolName The tool name
 * @returns A promise that resolves with the tool statistics
 * @throws ToolExecutionStoreError if retrieval fails
 */
export async function getToolStats(toolName: string): Promise<ToolStats>
⋮----
// Check if Upstash is available
⋮----
// Validate parameters
⋮----
// Default stats if none found
⋮----
// Convert numeric strings to numbers
⋮----
// Skip non-string values
⋮----
// Validate with Zod
⋮----
// Return default stats if validation fails
```

## File: lib/tools/web-tools.ts

```typescript
/**
 * @file Back-compatibility barrel so existing imports such as
 *       `import { tools } from "@/lib/tools/web-tools"` keep working
 *       after the tool-suite was moved to `lib/tools/web/`.
 *
 * @remarks
 *   • The real implementation now lives in `lib/tools/web/tools.ts`.
 *   • We re-export its `tools` object plus the public `types` and
 *     `constants` modules for direct consumption when needed.
 */
import { tools as webTools } from './web/tools';
```

## File: lib/tools/agentic/README.md

```markdown
# Agentic Tools AI SDK Integration

The following files in this folder have been patched to export their tools using `createAISDKTools` for Vercel AI SDK compatibility:

- wikipedia-client.ts
- wikidata-client.ts
- reddit-client.ts
- arxiv-client.ts
- brave-search-client.ts
- calculator.ts
- e2b.ts
- firecrawl-client.ts
- google-custom-search-client.ts
- tavily-client.ts
- polygon-client.ts
- github-client.ts

**If you add new tool files, follow this pattern:**

1. Import `createAISDKTools` from `./ai-sdk`.
2. Export your tool as `export const <name>Tools = createAISDKTools(new <ClassName>())` or similar.

All major agentic tool files are now patched and ready for use with the Vercel AI SDK.
```

## File: lib/tools/api-tools.ts

```typescript
/**
 * @file Backwards-compatibility barrel for the "api" tool-suite.
 *
 * @remarks
 *   • Consumers can continue to `import … from "@/lib/tools/api-tools"`
 *     while the real implementation lives in `lib/tools/api/`.
 *   • We simply import the symbols so that TypeScript resolves the files
 *     then we re-export what callers are expected to see.
 */
import { tools as apiTools } from './api/tools';
```

## File: lib/tools/code-tools.ts

```typescript
/**
 * @file Tool definitions (`CodeExecute`, `CodeAnalyze`) that are exposed to
 *       the AI SDK.  Each tool ships its Zod schema, a description, and an
 *       `execute` implementation.
 */
import { tool } from 'ai';
import { z } from 'zod';
import { Worker } from 'node:worker_threads';
import {
  LANG_EXECUTE,
  LANG_ANALYZE,
  ANALYSES,
  DANGEROUS_PATTERNS,
} from './code/constants';
import {
  ExecuteResult,
  AnalyzeResult,
  ExecuteFailure,
  ExecuteSuccess,
} from './code/types';
/* -------------------------------------------------------------------------- */
/*                             Zod schema definitions                         */
/* -------------------------------------------------------------------------- */
/**
 * Parameters accepted by the `CodeExecute` tool.
 */
⋮----
/**
 * Parameters accepted by the `CodeAnalyze` tool.
 */
⋮----
/* -------------------------------------------------------------------------- */
/*                                Code execute                                */
/* -------------------------------------------------------------------------- */
/**
 * Execute a code snippet in a worker thread with a hard timeout.
 *
 * @internal The sandbox currently supports JavaScript only.
 */
async function codeExecute(
  params: z.infer<typeof codeExecuteSchema>,
): Promise<ExecuteResult>
⋮----
/* -----------------------------  non-JS languages  ---------------------------- */
⋮----
/* ---------------------------  JS via worker thread  --------------------------- */
⋮----
/* eslint-disable @typescript-eslint/no-var-requires */
⋮----
/* eslint-enable @typescript-eslint/no-var-requires */
/* Force-terminate after `timeout` seconds. */
⋮----
/* -------------------------------------------------------------------------- */
/*                                Code analyse                                */
/* -------------------------------------------------------------------------- */
/**
 * Perform static analysis on the supplied code.
 */
async function codeAnalyze(
  params: z.infer<typeof codeAnalyzeSchema>,
): Promise<AnalyzeResult>
⋮----
/* --------------------------  complexity analysis  -------------------------- */
⋮----
/* ---------------------------  security analysis  --------------------------- */
⋮----
/* -------------------------------------------------------------------------- */
/*                                  Exports                                   */
/* -------------------------------------------------------------------------- */
/**
 * Bundles the two tools in the format expected by `generateText` / `streamText`.
 *
 * @example
 *
 * const result = await generateText({
 *   model,
 *   tools,
 *   prompt: '…',
 * });
 *
 */
```

## File: lib/tools/rag/constants.ts

```typescript
/**
 * @file Shared literals & utility constants for the "rag" tool-suite.
 */
```

## File: lib/tools/rag/tools.ts

```typescript
/**
 * @file RAG (Retrieval-Augmented Generation) tools for the Vercel AI SDK.
 *
 * @remarks
 *   • Provides document search, document addition, chunking, and vector store operations.
 *   • Supports multiple vector store providers (Supabase, LibSQL, Upstash).
 *   • Each tool returns a discriminated union (`success: true | false`) that
 *     matches the shapes in `lib/tools/rag/types.ts`.
 */
import { tool } from 'ai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getLibSQLClient } from '@/lib/memory/db';
import { generateEmbedding, saveEmbedding } from '@/lib/ai-integration';
// Import LibSQL vector store functions
import { storeTextEmbedding as libsqlStoreTextEmbedding, searchTextStore as libsqlSearchTextStore } from '@/lib/memory/vector-store';
// Import Upstash client utilities
import {
  getVectorClient,
  isUpstashVectorAvailable,
  shouldUseUpstashAdapter
} from '@/lib/memory/upstash/upstashClients';
// Import Upstash adapter functions
import {
  vectorSearch as upstashVectorSearch,
  upsertTexts as upstashUpsertTexts,
  semanticSearch as upstashSemanticSearch
} from '@/lib/memory/upstash/supabase-adapter';
// Import Upstash vector store functions
import {
  storeTextEmbedding as upstashStoreTextEmbedding,
  searchTextStore as upstashSearchTextStore,
  hybridSearch as upstashHybridSearch,
  EmbeddingMetadata
} from '@/lib/memory/upstash/vector-store';
import {
  VECTOR_PROVIDERS,
  CHUNKING_STRATEGIES,
  SIMILARITY_METRICS,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
} from './constants';
// Define hybrid vector search schema
⋮----
// Define hybrid vector search result type
type HybridVectorSearchResult = {
  success: true;
  query: string;
  results: Array<{
    id: string;
    metadata: Record<string, any>;
    score: number;
    content?: string;
  }>;
} | ToolFailure;
import {
  DocumentSearchResult,
  DocumentAddResult,
  ChunkDocumentResult,
  VectorStoreUpsertResult,
  VectorStoreQueryResult,
  ToolFailure,
  DocumentSearchItem,
  VectorStoreQueryItem,
} from './types';
/* ───────────────────────────────  schemas  ─────────────────────────────── */
⋮----
/* ────────────────────────────  helper functions  ───────────────────────────── */
/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number
/**
 * Chunk text using a fixed size strategy
 */
function chunkTextFixed(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[]
/**
 * Chunk text using a recursive strategy (split by sections, then paragraphs, then sentences)
 */
function chunkTextRecursive(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[]
⋮----
// Split by double newlines (sections)
⋮----
// Split by single newlines (paragraphs)
⋮----
// Add overlap by keeping the last part of the previous chunk
⋮----
// Paragraph is longer than chunk size, split by sentences
⋮----
// Add overlap
⋮----
// Sentence is too long, force split
⋮----
/**
 * Chunk text using the specified strategy
 */
function chunkText(
  text: string,
  strategy: typeof CHUNKING_STRATEGIES[number],
  chunkSize: number,
  chunkOverlap: number
): string[]
⋮----
// For semantic chunking, we'd ideally use a more sophisticated algorithm
// that understands semantic boundaries. For now, fall back to recursive.
⋮----
/* ────────────────────────────  executions  ───────────────────────────── */
/**
 * Search for documents using semantic similarity
 */
async function documentSearch(
  params: z.infer<typeof documentSearchSchema>
): Promise<DocumentSearchResult>
⋮----
// Generate embedding for the query
⋮----
// Search based on provider
⋮----
// Get all document embeddings
⋮----
// Calculate similarities
⋮----
// Handle vector data safely
⋮----
// Apply filter if provided
⋮----
// Sort by similarity (descending)
⋮----
// Return top results
⋮----
// Use searchTextStore from vector-store.ts
⋮----
// Format results based on the actual structure
// The vectorSearch function in lib/memory/db.ts returns Array<{ id: string; similarity: number }>
⋮----
title: 'Untitled', // Default title
content: '', // Default content
metadata: {}, // Default empty metadata
⋮----
// Check if Upstash Vector is available
⋮----
// Get vector client for direct operations
⋮----
// Try multiple search strategies for comprehensive results
⋮----
// Strategy 1: Use upstashVectorSearch for direct vector search
// Generate embedding for the query
⋮----
// Use upstashVectorSearch for direct vector search
⋮----
// Format results to match DocumentSearchItem
⋮----
// Strategy 2: Try using upstashSearchTextStore (from vector-store.ts)
⋮----
// Format results to match DocumentSearchItem
⋮----
// Strategy 3: Fall back to semanticSearch from supabase-adapter.ts
⋮----
// Format results to match DocumentSearchItem
⋮----
/**
 * Add a document to the knowledge base
 */
async function documentAdd(
  params: z.infer<typeof documentAddSchema>
): Promise<DocumentAddResult>
⋮----
// Check if Upstash is available and should be used
⋮----
// Use upsertTexts from upstash/supabase-adapter.ts
⋮----
// Fall back to LibSQL
⋮----
// Generate embedding if requested
⋮----
// Save the document
⋮----
/**
 * Chunk a document into smaller pieces
 */
async function chunkDocument(
  params: z.infer<typeof chunkDocumentSchema>
): Promise<ChunkDocumentResult>
⋮----
// Generate chunks
⋮----
// Create document chunks with IDs and metadata
⋮----
/**
 * Upsert texts and their embeddings to a vector store
 */
async function vectorStoreUpsert(
  params: z.infer<typeof vectorStoreUpsertSchema>
): Promise<VectorStoreUpsertResult>
⋮----
// Process each text
⋮----
// Generate embedding
⋮----
// Store document with reference to embedding
⋮----
// For each text, store embedding using storeTextEmbedding
⋮----
// Note: We're not using metadata directly here as storeTextEmbedding
// doesn't support metadata in its current implementation
⋮----
// Store additional metadata if needed
// This would depend on your implementation of vector-store.ts
⋮----
// Check if Upstash Vector is available
⋮----
// Ensure vector client is available
⋮----
// Try using upstashStoreTextEmbedding first for each text
⋮----
// Store with upstashStoreTextEmbedding
⋮----
// Fall back to upsertTexts from supabase-adapter.ts
// Prepare text items with IDs and metadata
⋮----
// Use upsertTexts from upstash/supabase-adapter.ts
⋮----
// Collect IDs
⋮----
// Also try direct vector upsert for future compatibility
⋮----
// Upsert vectors directly using the vector client
⋮----
/**
 * Query a vector store for similar items
 */
async function vectorStoreQuery(
  params: z.infer<typeof vectorStoreQuerySchema>
): Promise<VectorStoreQueryResult>
⋮----
// Generate embedding for the query
⋮----
// Get all document embeddings
⋮----
// Calculate similarities
⋮----
// Handle vector data safely
⋮----
// Filter by namespace if provided
⋮----
// Apply additional filters if provided
⋮----
// Calculate similarity based on the selected metric
⋮----
// Euclidean distance (converted to similarity)
⋮----
// Dot product
⋮----
// Sort by score (descending)
⋮----
// Return top results
⋮----
// Use searchTextStore from vector-store.ts
⋮----
// Format results based on the actual structure
// The vectorSearch function in lib/memory/db.ts returns Array<{ id: string; similarity: number }>
⋮----
metadata: {}, // Default empty metadata
⋮----
// Check if Upstash Vector is available
⋮----
// Use semanticSearch from upstash/supabase-adapter.ts
⋮----
// Format results to match VectorStoreQueryItem
⋮----
/**
 * Perform a hybrid search using Upstash Vector
 * This combines vector similarity with keyword matching for better results
 */
async function hybridVectorSearch(
  params: z.infer<typeof hybridVectorSearchSchema>
): Promise<HybridVectorSearchResult>
⋮----
// Check if Upstash Vector is available
⋮----
// Use hybridSearch from upstash/vector-store.ts
⋮----
// Format results
⋮----
/* ─────────────────────────────  exports  ────────────────────────────── */
```

## File: lib/tools/toolInitializer.ts

```typescript
/**
 * Tool Initializer for AI SDK
 *
 * This module handles the initialization of all tools in the system.
 * It provides functions to initialize built-in tools, custom tools,
 * and agentic tools with proper configuration.
 *
 * @module toolInitializer
 */
import { tool, type Tool } from "ai"; // Import Tool type
import { z } from "zod"
⋮----
import { getLibSQLClient } from "../memory/db"
import { getData, getItemById } from "../memory/supabase"
import { jsonSchemaToZod } from "./index"
import { createTrace, logEvent } from "../langfuse-integration"
/**
 * Configuration options for tool initialization
 */
export interface ToolInitializerOptions {
  /** Whether to include built-in tools */
  includeBuiltIn?: boolean
  /** Whether to include custom tools */
  includeCustom?: boolean
  /** Whether to include agentic tools */
  includeAgentic?: boolean
  /** Optional trace ID for observability */
  traceId?: string
  /** Optional user ID for observability */
  userId?: string
}
⋮----
/** Whether to include built-in tools */
⋮----
/** Whether to include custom tools */
⋮----
/** Whether to include agentic tools */
⋮----
/** Optional trace ID for observability */
⋮----
/** Optional user ID for observability */
⋮----
/**
 * Initialize all tools based on the provided options
 *
 * @param options - Configuration options
 * @returns Object containing all initialized tools, structured according to LoadedTools interface
 */
export async function initializeTools(options: ToolInitializerOptions =
⋮----
// Create trace for tool initialization
⋮----
// Initialize built-in tools
⋮----
// Initialize custom tools
⋮----
// Initialize agentic tools
⋮----
// Structure the tools according to the LoadedTools interface
⋮----
// Log success event
⋮----
// Log error event
⋮----
/**
 * Initialize built-in tools, grouped by their module/category.
 *
 * @returns Object where keys are module names (e.g., "web", "code")
 *          and values are records of tool names to tool instances.
 */
export function initializeBuiltInTools(): Record<string, Record<string, Tool<any, any> | undefined>>
/**
 * Initialize agentic tools.
 *
 * @returns Object containing all agentic tools.
 */
export function initializeAgenticTools(): Record<string, Tool<any, any> | undefined>
⋮----
// Check if agenticTools itself is a collection of tools (e.g. exported directly from ./agentic/index.ts)
// or if it has a .tools property like other modules.
⋮----
// Basic check for tool structure - adjust if needed
⋮----
/**
 * Initialize custom tools from the database
 *
 * @returns Object containing all custom tools, structured with instance and category
 */
export async function initializeCustomTools(): Promise<Record<string,
⋮----
const customTools: Record<string, { instance: any; category: string }> = {}; // Initialize customTools here
⋮----
// Fetch custom tools from Supabase, including their category
const toolsFromDb = await getData<any>("tools", { // Assuming 'tools' table has a 'category' column
match: { type: "custom" }, // Or however custom tools are identified
⋮----
return {}; // Return empty if no tools are found
⋮----
const category = (dbTool.category as string | undefined) || 'custom'; // Default to 'custom' if not specified
⋮----
execute: async (params: z.infer<typeof zodSchema>): Promise<any> => { // Return type changed to Promise<any> for simplicity, can be more specific
⋮----
} catch (error: unknown) { // Explicitly type error
⋮----
} catch (error: unknown) { // Explicitly type error
⋮----
return customTools; // Added return statement
} catch (error: unknown) { // Explicitly type error for the outer catch
⋮----
return {}; // Return empty object or rethrow, depending on desired error handling
```

## File: lib/tools/index.ts

```typescript
/**
 * AI SDK Tools - Main Barrel File
 *
 * This is the main entry point for all tools in the AI SDK.
 * It exports all tool modules, categories, and utility functions.
 *
 * @module tools
 */
import { z } from "zod"
// Import all tool modules
⋮----
// Import tool initialization and registry
import { initializeTools, initializeBuiltInTools, initializeCustomTools, initializeAgenticTools } from "./toolInitializer"
import { ToolRegistry, toolRegistry } from "./toolRegistry"
// Export all tool modules
⋮----
// Export tool initialization and registry
⋮----
// Tool categories
⋮----
/**
 * Get all built-in tools
 *
 * @returns Object containing all built-in tools
 */
export function getAllBuiltInTools()
/**
 * Load custom tools from Supabase
 *
 * @returns Object containing all custom tools
 */
export async function loadCustomTools()
/**
 * Helper to convert JSON schema to Zod schema
 *
 * @param schema - JSON schema to convert
 * @returns Zod schema
 */
export function jsonSchemaToZod(schema: any): z.ZodTypeAny
⋮----
// Make property optional if not in required array
```

## File: lib/tools/toolRegistry.ts

```typescript
/**
 * Tool Registry for AI SDK
 *
 * This module provides a registry for managing and accessing tools.
 * It allows registering, retrieving, and validating tools.
 *
 * @module toolRegistry
 */
import { tool, type Tool } from "ai";
import { z } from "zod";
import { initializeTools } from "./toolInitializer";
import { createTrace, logEvent } from "../langfuse-integration";
/**
 * Represents a tool along with its category.
 */
interface CategorizedTool {
  instance: Tool<any, any>;
  category: string;
}
/**
 * Describes the structure of tools loaded by `initializeTools`.
 */
interface LoadedTools {
  builtIn?: Record<string, Record<string, Tool<any, any> | undefined>>; // moduleName -> toolName -> toolInstance
  custom?: Record<string, { // Changed from Array to Record
    instance: Tool<any, any>;
    category: string;
    // is_enabled can be handled by initializeCustomTools by not returning disabled tools
  }>;
  agentic?: Record<string, Tool<any, any> | undefined>; // toolName -> toolInstance
}
⋮----
builtIn?: Record<string, Record<string, Tool<any, any> | undefined>>; // moduleName -> toolName -> toolInstance
custom?: Record<string, { // Changed from Array to Record
⋮----
// is_enabled can be handled by initializeCustomTools by not returning disabled tools
⋮----
agentic?: Record<string, Tool<any, any> | undefined>; // toolName -> toolInstance
⋮----
/**
 * Initialization options for the ToolRegistry.
 */
interface ToolRegistryOptions {
  autoInitialize?: boolean;
  includeBuiltIn?: boolean;
  includeCustom?: boolean;
  includeAgentic?: boolean;
}
/**
 * Tool registry class for managing AI SDK tools.
 * It loads tools from different sources (built-in, custom via Supabase, agentic)
 * and categorizes them.
 */
export class ToolRegistry
⋮----
// Singleton instance for static method access
⋮----
/**
   * Checks if a tool with the given name exists in the registry.
   *
   * @param toolName - The name of the tool to check.
   * @returns A promise that resolves to true if the tool exists, false otherwise.
   */
static async hasTool(toolName: string): Promise<boolean>
/**
   * Gets a tool by its name.
   *
   * @param toolName - The name of the tool to retrieve.
   * @returns A promise that resolves to the tool instance, or undefined if not found.
   */
static async getTool(toolName: string): Promise<Tool<any, any> | undefined>
/**
   * Executes a tool with the given parameters.
   *
   * @param toolName - The name of the tool to execute.
   * @param params - The parameters to pass to the tool.
   * @returns A promise that resolves to the result of the tool execution.
   * @throws Error if the tool is not found or execution fails.
   */
static async executeTool(toolName: string, params: any): Promise<any>
⋮----
// Create a trace for tool execution
⋮----
// Execute the tool - AI SDK tools have an execute method that takes params
// We need to handle both the AI SDK tool format and any custom formats
⋮----
// Handle different tool formats
⋮----
// Direct function tool
⋮----
// AI SDK tool format
⋮----
// AI SDK tools might expect (params, runId) signature
⋮----
// For compatibility with other tool formats
⋮----
// Log successful execution
⋮----
// Log execution error
⋮----
/**
   * Registers a new tool in the registry.
   *
   * @param toolName - The name of the tool.
   * @param description - The description of the tool.
   * @param zodSchema - The Zod schema for the tool parameters.
   * @param execute - The function to execute when the tool is called.
   * @returns A promise that resolves when the tool is registered.
   */
static async register(
    toolName: string,
    description: string,
    zodSchema: z.ZodTypeAny,
    execute: (params: any) => Promise<any>
): Promise<void>
⋮----
// Create the tool instance
⋮----
// Add the tool to the registry
⋮----
// Log tool registration
⋮----
/**
   * Creates a new tool registry.
   *
   * @param options - Initialization options.
   */
constructor(options: ToolRegistryOptions =
⋮----
// Assign to a local variable to avoid unhandled promise rejection in constructor if initialize throws sync
⋮----
// If initialization fails, it's important that this.initializationPromise is cleared
// so that subsequent calls to initialize() or ensureInitialized() can retry.
// The initialize() method itself handles setting this.initializationPromise to null on failure.
⋮----
/**
   * Initializes the tool registry by loading built-in, custom, and agentic tools.
   * It populates the `categorizedTools` map.
   * This method is idempotent and ensures that initialization occurs only once.
   *
   * @param traceId - Optional trace ID for observability.
   * @param userId - Optional user ID for observability.
   */
async initialize(traceId?: string, userId?: string): Promise<void>
⋮----
// Cast the result of initializeTools to LoadedTools
⋮----
// Process built-in tools
⋮----
// Process custom tools (loaded from Supabase)
⋮----
// Assuming initializeCustomTools now only returns enabled tools
// and provides the instance and category directly.
⋮----
// Process agentic tools
⋮----
// No need to set this.initializationPromise to null here, finally block handles it.
⋮----
// Whether success or failure, the current attempt is done. Clear the promise
// to allow future calls to re-attempt if it failed, or to bypass if succeeded.
⋮----
/**
   * Ensures the registry is initialized before performing operations.
   */
private async ensureInitialized(): Promise<void>
⋮----
// If initializationPromise is already set, it means initialization is in progress or was triggered.
// Awaiting it will ensure we don't try to initialize multiple times concurrently.
⋮----
// If not initialized and no promise exists, it means initialization hasn't been attempted yet
// or a previous attempt failed and cleared the promise. So, try to initialize.
⋮----
// After attempting to initialize (either by awaiting an existing promise or calling initialize()),
// check `initialized` flag again. If it's still false, initialization failed.
⋮----
/**
   * Gets a specific tool by its name.
   *
   * @param name - The name of the tool.
   * @returns The tool instance, or undefined if not found.
   */
async getTool(name: string): Promise<Tool<any, any> | undefined>
/**
   * Gets all tools as a flat record of tool names to tool instances.
   *
   * @returns A record containing all registered tool instances.
   */
async getAllTools(): Promise<Record<string, Tool<any, any>>>
/**
   * Gets tools belonging to a specific category.
   *
   * @param category - The category of tools to retrieve (e.g., "web", "custom", "rag"). Case-insensitive.
   * @returns A record containing tool instances for the specified category.
   */
async getToolsByCategory(category: string): Promise<Record<string, Tool<any, any>>>
/**
   * Gets all tools, categorized into a map where keys are category names
   * and values are records of tool names to tool instances within that category.
   *
   * @returns A Map of categorized tools.
   */
async getAllToolsCategorized(): Promise<Map<string, Record<string, Tool<any, any>>>>
/**
   * Gets a list of all unique available tool category names.
   *
   * @returns An array of unique category names (e.g., ["web", "custom", "rag"]).
   */
async getAvailableCategories(): Promise<string[]>
⋮----
/**
 * Singleton instance of the ToolRegistry.
 * Use this instance for direct method access.
 */
```

## File: lib/tools/README.md

`````markdown
## Chat Context & Prompt Guidelines 🤖 (☆ injected into the system prompt ☆)

Whenever the assistant is asked about **`/lib/tools`**, prepend a summary like
this to the existing system prompt. It steers answers toward _modular,
type-safe, AI-SDK-ready_ solutions and reduces follow-up questions.

The DeanmachinesAI project implements a sophisticated tool system that follows the Vercel AI SDK's tool pattern, with enhanced security, error handling, and observability. Tools are organized into specialized suites, each with a consistent structure and implementation pattern.

When helping with tools, focus on:

1. **Type safety**: All tools use Zod schemas for validation
2. **Error handling**: Consistent `{ success: true, data }` or `{ success: false, error }` pattern
3. **Security**: Path traversal prevention, input sanitization, and secure credential management
4. **Performance**: Parallel execution, caching, and efficient resource usage
5. **Observability**: Tracing and metrics for debugging and optimization

---

### 1 Folder Primer 📂

- Every **suite** lives in `lib/tools/<suite>/` → `constants.ts`, `types.ts`,
  `tools.ts` (+ barrel `<suite>-tools.ts` for legacy imports).
- Built-ins today: `code`, `file`, `data`, `web`.
- Active development: `api`, `rag` with advanced vector search capabilities.
- Custom tools are hydrated at runtime via **`loadCustomTools()`** from Supabase.
- Tool registration happens through `toolRegistry.ts` which provides centralized management.
- The `toolInitializer.ts` orchestrates loading of built-in, custom, and agentic tools.
- Each tool follows the AI SDK pattern with `description`, `parameters` (Zod schema), and `execute` function.

### 2 Assistant Mandate 🛠️

When helping with tools in the DeanmachinesAI project, you should:

1. **Recommend consistent patterns**: Follow the established 3-file suite pattern with constants, types, and tools.
2. **Enforce type safety**: Always use Zod schemas for validation and proper TypeScript typing.
3. **Prioritize security**: Implement input sanitization, path traversal prevention, and secure credential management.
4. **Optimize for performance**: Suggest parallel execution, caching, and efficient resource usage where appropriate.
5. **Integrate with observability**: Add tracing and metrics for debugging and optimization.
6. **Follow error handling conventions**: Use the `{ success: true, data }` or `{ success: false, error }` pattern.
7. **Ensure proper registration**: Guide on registering tools in `toolRegistry` and `toolInitializer`.
8. **Implement AI SDK compatibility**: Ensure tools work with the Vercel AI SDK's tool pattern.
9. **Consider multi-provider support**: Tools should work with Google AI, OpenAI, and Anthropic models.
10. **Document thoroughly**: Include clear descriptions, parameter documentation, and usage examples.

### 3 AI SDK Core ⛽ — Quick Reference

| Need                | API Call                                          | Note                            |
| ------------------- | ------------------------------------------------- | ------------------------------- |
| Single tool         | `generateText({ model, tools, prompt })`          | Basic tool execution            |
| Streaming           | `streamText({ … })` + `onToken` / `onFinish`      | Real-time responses             |
| Multi-step chain    | `maxSteps: N`                                     | LLM can call >1 tool            |
| Deterministic runs  | `seed: 42`, `temperature: 0`                      | Reproducible results            |
| Parallel tool calls | Return multiple objects inside `tool_calls` array | Concurrent execution            |
| Tool choice control | `toolChoice: 'tool_name'` or `'auto'` or `'none'` | Control tool selection          |
| Tool repair         | `experimental_repairToolCall: async ({...})`      | Fix invalid tool calls          |
| Middleware          | `wrapLanguageModel({ model, middleware })`        | Intercept and modify calls      |
| Caching             | Implement `wrapGenerate` middleware               | Cache responses for performance |
| Error handling      | Try/catch + return `{ success: false, error }`    | Consistent error pattern        |
| Observability       | Integrate with `ai-sdk-tracing.ts`                | Track performance and usage     |

### 4 Implementation Checklist ✔️

When implementing tools, ensure you follow these critical requirements:

- **Literal parity**: Enums in `constants.ts` must mirror `z.enum(...)` for type safety
- **Sandbox**: Dynamic code ⇒ Worker-thread or VM2; _never_ raw `eval` for security
- **Path safety**: Resolve inside `FILE_ROOT` only (`resolveWithinRoot`) to prevent traversal
- **Output hygiene**: Collapse whitespace; keep payload ≤ 8 KB/tool call for performance
- **Result shape**: `{ success: true, data }` or `{ success: false, error }` for consistency
- **Error handling**: Wrap execution in try/catch and return detailed error messages
- **Validation**: Use Zod schemas to validate all inputs before processing
- **Tracing**: Integrate with `ai-sdk-tracing.ts` for observability
- **Documentation**: Include clear descriptions and parameter documentation
- **Testing**: Write unit tests for each tool to ensure reliability

```bash
lib/tools/
├── api/               # (WIP) HTTP, GraphQL, OAuth helpers
├── code/              # JavaScript sandbox + static analysis
├── data/              # CSV, YAML, XML, Markdown-table, filtering, aggregation
├── file/              # Path-safe filesystem operations
├── rag/               # (WIP) Retrieval-Augmented Generation helpers
├── web/               # Web search, extraction, scraping
├── <suite>-tools.ts   # Back-compat barrel for each suite  ← NEW
├── index.ts           # Aggregates built-ins & lazy-loads custom tools
└── README.md          # This file
```

### 5 Advanced Patterns 🎛

| Goal              | Technique                                                                           |
| ----------------- | ----------------------------------------------------------------------------------- |
| Tool A ➜ Tool B   | Prompt: "First summarise with `DataAggregation`, **then** search with `WebSearch`." |
| Conditional calls | LLM decides; if not required, return _no_ `tool_calls`.                             |
| Parallel scraping | Send multiple `WebScrape` calls in a single step.                                   |
| Retry on failure  | On `{ success:false }`, invoke again (≤3 times, exponential back-off).              |
| Reflection        | After a tool step, ask the model to critique/improve its own output.                |

### 5.1 Secure Tool Implementation 🔒

#### Input Sanitization and Validation

Even when LLMs generate tool arguments based on a Zod schema, the execute function should treat these arguments as potentially untrusted inputs:

```typescript
// Example of secure tool implementation with input sanitization
const secureFileTool = tool({
  description: 'Read a file from a specified path',
  parameters: z.object({
    filePath: z.string().describe('Path to the file to read'),
  }),
  execute: async ({ filePath }) => {
    try {
      // Validate and sanitize the file path
      if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Invalid file path' };
      }

      // Prevent path traversal attacks
      const sanitizedPath = path
        .normalize(filePath)
        .replace(/^(\.\.(\/|\\|$))+/, '');
      const resolvedPath = path.resolve(FILE_ROOT, sanitizedPath);

      // Ensure the path is within the allowed directory
      if (!resolvedPath.startsWith(FILE_ROOT)) {
        return {
          success: false,
          error: 'Access denied: Path is outside of allowed directory',
        };
      }

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        return { success: false, error: 'File not found' };
      }

      // Read the file
      const content = await fs.promises.readFile(resolvedPath, 'utf-8');

      return { success: true, content };
    } catch (error) {
      console.error('Error reading file:', error);
      return {
        success: false,
        error:
          'Failed to read file: ' +
          (error instanceof Error ? error.message : String(error)),
      };
    }
  },
});
```

#### Mitigating Prompt Injection Risks

Defend against prompt injection attacks that might manipulate the LLM into misusing tools:

```typescript
// Example system prompt with security boundaries for tools
const secureSystemPrompt = `
You are a helpful assistant with access to various tools.

IMPORTANT SECURITY RULES:
1. Never use the 'executeCode' tool with untrusted or user-provided code.
2. Never use the 'sendEmail' tool unless explicitly requested by the user for legitimate purposes.
3. Always verify file paths are relative and within the project directory.
4. Do not use tools to access sensitive information unless necessary for the task.

When a user request seems to violate these rules, politely decline and explain why.

Available tools: [tool descriptions here]
`;
```

#### Secure API Key and Credential Management

Manage credentials securely for tools that access external services:

```typescript
// Example of secure credential management for a tool
const weatherTool = tool({
  description: 'Get current weather for a location',
  parameters: z.object({
    location: z.string().describe('City name or coordinates'),
  }),
  execute: async ({ location }) => {
    try {
      // Get API key from environment variable, never hardcode
      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) {
        return { success: false, error: 'Weather API key not configured' };
      }

      // Use HTTPS for all requests
      const response = await fetch(
        `https://api.weatherservice.com/current?location=${encodeURIComponent(location)}&key=${apiKey}`,
        { headers: { 'User-Agent': 'AI-SDK-Tool/1.0' } }
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, weather: data };
    } catch (error) {
      console.error('Weather API error:', error);
      return { success: false, error: 'Failed to fetch weather data' };
    }
  },
});
```

### 5.2 Advanced Tool Orchestration 🔄

#### Parallel Tool Execution

Execute multiple tools concurrently for improved performance:

```typescript
// Example of parallel tool execution
const parallelTools = {
  fetchMultipleData: tool({
    description: 'Fetch data from multiple sources in parallel',
    parameters: z.object({
      sources: z.array(z.string()).describe('List of data sources to query'),
    }),
    execute: async ({ sources }) => {
      try {
        // Execute multiple fetches in parallel
        const results = await Promise.all(
          sources.map(async (source) => {
            try {
              const response = await fetch(source);
              if (!response.ok) {
                return {
                  source,
                  success: false,
                  error: `HTTP error ${response.status}`,
                };
              }
              const data = await response.json();
              return { source, success: true, data };
            } catch (error) {
              return {
                source,
                success: false,
                error: String(error instanceof Error ? error.message : error),
              };
            }
          })
        );

        return { success: true, results };
      } catch (error) {
        return { success: false, error: 'Failed to execute parallel fetches' };
      }
    },
  }),
};
```

#### Tool Choice Control

Implement explicit control over which tools the model can use:

```typescript
// Example of tool choice control
const result = await generateText({
  model: openai('gpt-4o'),
  messages: [{ role: 'user', content: 'What's the weather in Paris?' }],
  tools: { getWeather, searchWeb },
  toolChoice: 'getWeather' // Force use of getWeather tool
});
```

#### Tool Repair

Implement tool repair to fix invalid tool calls:

````typescript
// Example of tool repair implementation
const result = await generateText({
  model,
  tools,
  prompt,
  experimental_repairToolCall: async ({
    toolCall,
    tools,
    parameterSchema,
    error,
  }) => {
    if (error instanceof AI_InvalidToolArgumentsError) {
      // Use the model to fix the tool call
      const result = await generateText({
        model,
        system: "You are a tool repair specialist. Fix the invalid tool call based on the error message.",
        messages: [
          {
            role: 'user',
            content: `The following tool call failed with error: ${error.message}\n\nTool call: ${JSON.stringify(toolCall)}\n\nPlease generate a fixed version of the tool call.`
          }
        ],
        tools,
      });

      // Extract the fixed tool call from the response
      const fixedToolCall = extractToolCallFromText(result.text);
      return fixedToolCall;
    }

    // For other types of errors, don't attempt repair
    return null;
  }
});

### 6 Tool Registration and Initialization 🔧

The DeanmachinesAI project implements a sophisticated system for tool registration, initialization, and management through two key files:

#### 6.1 toolRegistry.ts

The `toolRegistry.ts` file provides a centralized registry for all tools in the system:

```typescript
// Example of toolRegistry.ts implementation
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private initialized: boolean = false;

  // Register a single tool
  register(name: string, tool: Tool): void {
    if (this.tools.has(name)) {
      console.warn(`Tool with name ${name} already exists. Overwriting.`);
    }
    this.tools.set(name, tool);
  }

  // Register multiple tools
  registerMany(tools: Record<string, Tool>): void {
    for (const [name, tool] of Object.entries(tools)) {
      this.register(name, tool);
    }
  }

  // Get a tool by name
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // Get all registered tools
  getAllTools(): Record<string, Tool> {
    return Object.fromEntries(this.tools.entries());
  }

  // Initialize the registry with built-in tools
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Register built-in tools
    this.registerMany(await getAllBuiltInTools());

    // Register custom tools from database
    this.registerMany(await loadCustomTools());

    // Register agentic tools
    this.registerMany(await initializeAgenticTools());

    this.initialized = true;
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
````
`````

#### 6.2 toolInitializer.ts

The `toolInitializer.ts` file orchestrates the loading and initialization of different tool types:

```typescript
// Example of toolInitializer.ts implementation
export async function initializeTools(): Promise<Record<string, Tool>> {
  // Create trace for observability
  const trace = await createTrace({
    name: 'tool_initialization',
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });

  try {
    // Initialize built-in tools
    const builtInTools = await initializeBuiltInTools();
    trace.addEvent('built_in_tools_loaded', {
      count: Object.keys(builtInTools).length,
    });

    // Initialize custom tools from database
    const customTools = await initializeCustomTools();
    trace.addEvent('custom_tools_loaded', {
      count: Object.keys(customTools).length,
    });

    // Initialize agentic tools
    const agenticTools = await initializeAgenticTools();
    trace.addEvent('agentic_tools_loaded', {
      count: Object.keys(agenticTools).length,
    });

    // Combine all tools
    const allTools = {
      ...builtInTools,
      ...customTools,
      ...agenticTools,
    };

    trace.addEvent('all_tools_loaded', { count: Object.keys(allTools).length });
    return allTools;
  } catch (error) {
    trace.addEvent('tool_initialization_error', { error: String(error) });
    throw error;
  } finally {
    await trace.end();
  }
}

// Initialize built-in tools from suites
async function initializeBuiltInTools(): Promise<Record<string, Tool>> {
  return {
    ...webTools.tools,
    ...codeTools.tools,
    ...dataTools.tools,
    ...fileTools.tools,
    ...apiTools.tools,
    ...ragTools.tools,
  };
}

// Initialize custom tools from database
async function initializeCustomTools(): Promise<Record<string, Tool>> {
  // Get custom tool definitions from Supabase
  const { data: customToolDefs, error } = await supabase
    .from('tools')
    .select('*')
    .eq('is_custom', true);

  if (error) {
    console.error('Error loading custom tools:', error);
    return {};
  }

  // Convert JSON Schema to Zod and create tools
  const customTools: Record<string, Tool> = {};

  for (const toolDef of customToolDefs) {
    try {
      // Convert JSON Schema to Zod schema
      const zodSchema = jsonSchemaToZod(toolDef.parameters_schema);

      // Create sandboxed execute function
      const executeFn = createSandboxedExecute(toolDef.execute_code);

      // Create tool
      customTools[toolDef.name] = tool({
        description: toolDef.description,
        parameters: zodSchema,
        execute: executeFn,
      });
    } catch (error) {
      console.error(`Error creating custom tool ${toolDef.name}:`, error);
    }
  }

  return customTools;
}

// Initialize agentic tools
async function initializeAgenticTools(): Promise<Record<string, Tool>> {
  // Import and initialize agentic tools
  const { wikipediaTools, wikiDataTools, searchTools, calculatorTools } =
    await import('./agentic');

  return {
    ...wikipediaTools,
    ...wikiDataTools,
    ...searchTools,
    ...calculatorTools,
  };
}
```

#### 6.3 Usage Pattern

The recommended pattern for using these tools in the application is:

```typescript
// Initialize the tool registry once at application startup
await toolRegistry.initialize();

// Get all tools for an agent
const allTools = toolRegistry.getAllTools();

// Get specific tools for an agent based on tool_ids
const agentTools = agentConfig.tool_ids.reduce(
  (acc, toolId) => {
    const tool = toolRegistry.getTool(toolId);
    if (tool) {
      acc[toolId] = tool;
    }
    return acc;
  },
  {} as Record<string, Tool>
);

// Use tools with AI SDK
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Analyze this data and search for related information',
  tools: agentTools,
});
```

### 7 Gold-Standard Example 📑

<details><summary>Two-step plan (CSV ➜ summary ➜ web search)</summary>
...

2. **Custom DB tools**
   `toolInitializer.initializeCustomTools()` pulls rows from Supabase /
   LibSQL, converts their JSON-Schema → Zod (`jsonSchemaToZod`), wraps the
   code in `ai.tool()` and sandboxes it.

3. **Agentic tools**
   `initializeAgenticTools()` re-exports everything from `lib/tools/agentic`.

4. **toolInitializer.ts**
   Acts as a **factory** that orchestrates steps 1-3, emits observability
   traces via `langfuse`, and returns **one flat object** ready for AI SDK.
   ...

---

## ✅ Completed Checklist ("Done & Shipped")

| Area              | Item                                                     | Notes                                           |
| ----------------- | -------------------------------------------------------- | ----------------------------------------------- |
| **Architecture**  | 3-file suite pattern + barrels                           | `code`, `file`, `data`, `web`, `rag`, `graphql` |
|                   | `toolInitializer` orchestration                          | Built-in + custom + agentic                     |
|                   | `toolRegistry` singleton                                 | Lazy init, execution tracing                    |
| **Type-safety**   | Discriminated unions + type-guards everywhere            |                                                 |
| **Security**      | Path traversal guard; Worker thread sandbox              |                                                 |
| **Functionality** | YAML↔JSON, XML↔JSON, MD-Table↔JSON                    | Data suite                                      |
|                   | Timeout+retry web scraping                               | Web suite                                       |
|                   | Vector search with multiple providers                    | RAG suite                                       |
|                   | Document chunking with multiple strategies               | RAG suite                                       |
|                   | Multi-suite aggregation (`getAllBuiltInTools`)           |                                                 |
| **Docs**          | README rewrite w/ chat-context template & golden example |                                                 |

---

## 🔭 Future / In-Progress Checklist ("Next Up") ⭐

_To build a **production-grade**, "batteries-included" tool platform we need to
push far beyond the current feature-set. The matrix below is a living backlog
of ambitious—but realistic—enhancements. PRs are welcome; tick items as they
land!_

| Priority | Epic / Area                | Concrete Tasks & Ideas                                                                                                                                                                                                                                                                       | Pay-off                   |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 🚀       | **api/** suite             | • OpenAPI / Swagger → Zod auto-codegen<br>• REST helpers (`GET`, `POST`, retries, pagination)<br>• OAuth 2 / Bearer token flow<br>• GraphQL client with persisted queries                                                                                                                    | Unlock 1000s of SaaS APIs |
| 🚀       | **rag/** suite             | • Supabase Vector & Pinecone drivers<br>• Hybrid BM25 + vector search<br>• On-disk embedding cache (LRU)<br>• Auto-chunking & semantic deduplication<br>• Query transformation (HyDE)<br>• Re-ranking with cross-encoders<br>• Contextual chunking strategies<br>• Embedding model selection | First-class RAG workflows |
| 🚀       | **Security**               | • vm2 / Firecracker sandbox for **custom** code<br>• SecComp or eBPF syscall filter<br>• Secrets scanner (prevent accidental leaks)<br>• SAST / dependency-audit CI step                                                                                                                     | Enterprise trust          |
| 🌟       | **math/** suite            | • `MathEvaluate` (expr parser, Big.js)<br>• `StatsDescribe` (mean, median, SD)<br>• Unit conversion (`convert-units`)                                                                                                                                                                        | Analytics prompts         |
| 🌟       | **media/** suite           | • `ImageInfo` (EXIF via `exiftool`)<br>• `ImageResize` (sharp/Web-friendly)<br>• `AudioTranscribe` (whisper.cpp wrapper)                                                                                                                                                                     | Multimodal LLM use        |
| 🌟       | **lang/** suite            | • `Translate` (LibreTranslate / DeepL)<br>• `Summarise` (auto select model)<br>• `KeywordExtract`, `Sentiment`                                                                                                                                                                               | NLP utilities             |
| 🌟       | **shell/** suite           | • Safe Bash runner in Docker rootless<br>• Built-in time / memory quotas<br>• Interactive REPL capture                                                                                                                                                                                       | DevOps, CI agents         |
| 🌟       | **crypto/** suite          | • `Hash` (MD5/SHA256/BLAKE3)<br>• `Encrypt/Decrypt` (AES-256-GCM)<br>• `JWTParse` → header/payload inspect                                                                                                                                                                                   | Security & auditing       |
| 🌟       | **Tool versioning**        | • `version` field (semver)<br>• Dispatcher resolves major/minor<br>• Deprecation warnings                                                                                                                                                                                                    | Safe upgrades             |
| 🌟       | **Concurrency & QoS**      | • Per-tool rate-limits<br>• Circuit-breaker & bulk-head patterns<br>• Global concurrency cap via semaphore                                                                                                                                                                                   | Stability under load      |
| 🌟       | **Observability**          | • OpenTelemetry traces for each `execute`<br>• Prometheus exporter (p95 latency, error %)<br>• "Slow-tool" alerting in Grafana                                                                                                                                                               | Prod debugging            |
| 🌟       | **Caching**                | • Memory + Redis back-ends<br>• Cache-key derivation helper<br>• Stale-While-Revalidate strategy                                                                                                                                                                                             | –50 % token spend         |
| 🌟       | **Test harness**           | • Jest unit tests per tool<br>• Contract tests for barrels<br>• Golden-file diff tests (CSV↔JSON etc.)                                                                                                                                                                                      | CI confidence             |
| 🌟       | **CLI**                    | • `pnpm ai-tools new <suite>` scaffold<br>• `ai-tools lint` (validate schemas)<br>• `ai-tools exec <ToolName> --json`                                                                                                                                                                        | DX delight                |
| 🌟       | **Auto-docs**              | • Typedoc → Markdown → Docusaurus site<br>• Live schema viewer for every tool                                                                                                                                                                                                                | Onboarding                |
| 🌟       | **Dynamic categories**     | • CRUD UI in Supabase<br>• Runtime reload without redeploy                                                                                                                                                                                                                                   | Flexible UI               |
| 🌟       | **Fine-grained ACL**       | • JWT claims → tool allow/deny<br>• Usage quotas / billing hooks<br>• Tenant-aware `FILE_ROOT`                                                                                                                                                                                               | SaaS readiness            |
| 💡       | **Plugin marketplace**     | • NPM tag `ai-sdk-tool-suite` discovery<br>• Auto-install from UI<br>• Version gating + signature check                                                                                                                                                                                      | Ecosystem flywheel        |
| 💡       | **Graph analytics**        | • Visualize tool call graphs (d3.js)<br>• Suggest optimal `maxSteps`                                                                                                                                                                                                                         | Prompt ergonomics         |
| 💡       | **Self-optimizing agent**  | • Reinforcement learning to re-order tool suggestions based on success rate                                                                                                                                                                                                                  | Continual improvement     |
| 💡       | **Edge runtime**           | • Vercel Edge / Cloudflare Workers compatibility<br>• WASI shim for `data/` & `code/` suites                                                                                                                                                                                                 | Low-latency               |
| 💡       | **Multi-language support** | • Rust & Python "sibling" runtimes sharing the same Zod-like schemas (using `typia` / `pydantic`)                                                                                                                                                                                            | Polyglot stacks           |
| 💡       | **Cost awareness**         | • Token-cost estimator per call<br>• Budget guardrail that blocks expensive chains                                                                                                                                                                                                           | $$ savings                |
| 🧪       | **LLM eval harness**       | • Automated tool-call correctness using GPT-4 judge<br>• Regression baseline per release                                                                                                                                                                                                     | Safety net                |
| 🧪       | **Prompt compression**     | • Recursive summarisation for long tool outputs<br>• Hash-based deduplication                                                                                                                                                                                                                | Fit within context window |

_The list is intentionally extensive—treat it as inspiration and backlog. PRs
should reference an item ID (e.g. `rag-03`) and tick it here once merged._ 🚀

---

_Keep both lists synced with PRs: move items from ⭐ → ✅ once merged. Aim high,
iterate fast, and always keep the assistant's chat-context up to date._ 🚀

```

```

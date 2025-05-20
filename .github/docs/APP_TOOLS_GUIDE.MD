# Application Tools Guide: ai-sdk-dm

**Version:** 1.3 (Generated 2025-05-20)
**Intended Path in Repository:** `/.github/docs/APP_TOOLS_GUIDE.MD`

**Purpose:** This document provides GitHub Copilot (and human developers) with an exhaustive and deeply detailed understanding of the custom application tool framework within the `ai-sdk-dm` project. This framework, primarily located in `#file:../../lib/tools/`, defines a rich and diverse set of capabilities. These tools are designed to be invoked by the Vercel AI SDK backend (orchestrated via `#file:../../lib/ai-sdk-integration.ts`) and by the application's custom agents (defined in `#file:./APP_AGENTS_AND_PERSONAS_GUIDE.MD`). A meticulous understanding of these tools, their precise Zod-defined parameters (with descriptive annotations), expected outputs, and intended use-cases is absolutely critical for effective AI-assisted development, for the correct functioning of the platform's AI features, and especially for the dynamic composition of AI applications via the "App Builder" (`#file:../../app/(dashboard)/app-builder/page.tsx`).

**Related Core Context Documents:**

* Project Overview: `#file:./PROJECT_CONTEXT.MD` (Provides overall architectural and technological context)
* API & Data Contracts: `#file:./API_DEFINITIONS.MD` (Details backend API actions and Zod data schemas)
* Application Agents & Personas Guide: `#file:./APP_AGENTS_AND_PERSONAS_GUIDE.MD` (Explains the custom agent and persona framework that utilizes these tools)

**Note to Copilot (Critical):**

1. This guide explains the **application's own internal tool system**. Your primary role is to assist in writing code that *uses* these tools correctly or *extends* this tool framework according to the established patterns.
2. When an application agent or an AI SDK backend action needs to invoke a tool, the Vercel AI SDK's tool-calling feature requires **precise tool definitions**. This includes the tool's unique `name`, a highly descriptive `description` (for LLM understanding), and a Zod schema for its `parameters`.
3. **Parameter Schemas (Zod):** The Zod schemas for tool parameters are the **authoritative source of truth** for tool inputs. They are typically found in a `types.ts` file within each tool's specific directory (e.g., `#file:../../lib/tools/web/types.ts`). Every parameter in these Zod schemas **MUST** include a `.describe()` call to provide a clear explanation to the LLM.
4. **App Builder Integration:** The "App Builder" feature allows users to visually or programmatically select, configure, and chain these tools to create custom AI applications. Your understanding of these tools is therefore essential for assisting with App Builder development.
5. **Error Handling:** Assume all tool `execute` functions will handle their internal errors and return a structured response (e.g., `{ success: boolean, data?: any, error?: string }`). Code calling these tools must still handle potential failures in the tool invocation itself or unexpected structures in the `error` field.

## 1. Overview of the Application Tool Framework

The `ai-sdk-dm` platform's tool system is designed for modularity, extensibility, and robust integration with both the Vercel AI SDK and the custom application agent framework. It allows AI-driven components to perform a wide array of actions beyond simple text generation.

### Key Architectural Components

* **Tool Definitions (Located in `lib/tools/<category>/<toolName>/`):**
  * Each tool is a self-contained module.
  * **Standard Structure (using Vercel AI SDK `tool` helper):**
    * `name: string`: Unique programmatic ID (e.g., `web_performSearch`, `code_executePythonScript`). Used in the registry and for LLM invocation.
    * `description: string`: **Extremely Important.** A detailed natural language description for the LLM. Must clearly state:
      * What the tool does.
      * Its primary capabilities and limitations.
      * When it should be used (ideal scenarios).
      * Expected input types (briefly, complementing the Zod schema).
      * Nature of the output.
      * Any critical side effects or prerequisites.
    * `parameters: ZodObject`: A Zod schema object (e.g., `z.object({...})`) defining all input parameters.
      * Each field in the Zod schema **MUST** have a `.describe("...")` explaining its purpose, type, format, and if it's optional or has defaults.
      * Use Zod enums (`z.enum([...])`) for fixed sets of options.
      * Use `.optional()`, `.default()`, `.min()`, `.max()`, `.uuid()`, `.url()`, `.email()` etc., for robust validation.
      * Complex objects or arrays should also have their elements described.
    * `execute: async (validatedParams: z.infer<typeof parametersSchema>) => Promise<ToolOutput>`: The core asynchronous function.
      * Takes parameters already validated by the Zod schema.
      * Contains the tool's operational logic.
      * Should return a Promise resolving to a structured output (ideally also defined by a Zod schema, e.g., `MyToolOutputSchema`).
      * Must implement robust internal error handling and return clear error information in its output structure.
* **Tool Registry (`#file:../../lib/tools/toolRegistry.ts`):**
  * The central manifest where all tools are imported from their respective modules and aggregated into an object (e.g., `appTools`).
  * This object is used by `#file:../../lib/ai-sdk-integration.ts` to provide tool definitions to the Vercel AI SDK and by `#file:../../lib/agents/agent-service.ts` for application agents.
  * **Copilot Guidance:** When creating a new tool, it **MUST** be imported and added to the `appTools` collection in `toolRegistry.ts`, using its `name` property as the key. The `AppToolName` type (likely `keyof typeof appTools`) should update automatically.
* **Tool Initializer (`#file:../../lib/tools/toolInitializer.ts`):**
  * Manages any global or category-specific initialization logic required by tools (e.g., setting up shared API clients using environment variables, connecting to services).
  * **Copilot Guidance:** If a new tool depends on an external service requiring an API key or a shared client instance, its setup should be handled here. Ensure secrets are loaded from environment variables (e.g., `process.env.MY_TOOL_API_KEY`) and not hardcoded.
* **Tool Execution Store (`#file:../../lib/tools/upstash-tool-execution-store.ts`):**
  * Leverages Upstash Redis to log and manage tool execution details (invocation ID, tool name, parameters, user ID, thread ID, timestamp, status, result/error).
  * This is vital for observability (Langfuse), debugging, rate limiting, and potentially for advanced agentic reasoning about past tool usage or for implementing semantic caching of tool results.
  * **Copilot Guidance:** The primary interaction with this store is likely handled centrally by the AI SDK integration layer or the agent service after a tool's `execute` method returns. However, if a specific tool needs to record intermediate steps or has very complex state related to its execution, it might interact with this store directly (following established patterns).
* **Tool Configuration (`#file:../../lib/tools/tools.json` - For Non-Sensitive Defaults Only):**
  * May store non-sensitive default configurations, feature flags, or metadata for tools.
  * **Copilot Guidance:** **API keys, passwords, or any sensitive data MUST NOT be stored in this file.** These must be managed via environment variables and accessed securely, typically during tool initialization.

## 2. Defining a New Application Tool (Highly Detailed Pattern & Best Practices)

This pattern ensures tools are robust, well-described for LLM consumption, and integrate seamlessly into the platform.

1. **Directory Structure:**
    * Create: `lib/tools/<category>/<myNewToolName>/`
    * Inside, create:
        * `types.ts`: For Zod parameter and output schemas.
        * `index.ts` (or `tool.ts`): For the tool definition and execution logic.
        * `README.md` (Optional but Recommended): For detailed developer notes, advanced usage examples, or known limitations of this specific tool.

2. **Define Rigorous Zod Schemas (`types.ts`):**
    * **Parameter Schema (`<toolName>ParamsSchema`):**
        * Be exhaustive. Every piece of data the tool needs must be a parameter.
        * Use `z.object({})`.
        * For every field: `z.type().describe("Clear, concise explanation for the LLM: what it is, format, examples if non-obvious, if it's optional, any constraints.")`.
        * Use `.optional()`, `.default()`, `.min()`, `.max()`, `.uuid()`, `.url()`, `.email()`, `z.enum([...])`, `z.array()`, nested `z.object()` as appropriate.
        * Employ `.refine()` for complex cross-field validation with clear error messages.
    * **Output Schema (`<toolName>OutputSchema`):**
        * Define the expected structure of a successful tool execution. This helps in `generateObject` scenarios with the Vercel AI SDK and provides type safety.
        * Always include a `success: z.boolean()` field.
        * Include an `error: z.string().optional()` field for returning error messages.
        * Define specific data fields for the successful output.

    ```typescript
    // Example: lib/tools/dataProcessing/csvToJsonTool/types.ts
    import { z } from 'zod';

    export const csvToJsonToolParamsSchema = z.object({
      csvData: z.string().min(10) // Assuming CSV data is passed as a string
        .describe("The raw CSV data string to be converted. Must include a header row."),
      delimiter: z.string().max(1).optional().default(',')
        .describe("The delimiter used in the CSV data (e.g., ',', ';', '\\t'). Defaults to comma."),
      hasHeader: z.boolean().default(true).optional()
        .describe("Indicates if the first row of the CSV is a header row. Defaults to true."),
      // Example of a more complex parameter:
      columnTransformations: z.array(z.object({
        columnName: z.string().describe("The name of the column to transform."),
        transformType: z.enum(['toNumber', 'toDate', 'toLowerCase', 'toUpperCase'])
          .describe("The type of transformation to apply."),
        dateFormat: z.string().optional()
          .describe("Required if transformType is 'toDate'. The format of the date string (e.g., 'YYYY-MM-DD').")
      })).optional().describe("Optional array of transformations to apply to specific columns."),
    }).refine(data => !data.columnTransformations || data.columnTransformations.every(t => t.transformType === 'toDate' ? !!t.dateFormat : true), {
        message: "dateFormat is required for 'toDate' transformations.",
        path: ["columnTransformations"]
    });
    export type CsvToJsonToolParams = z.infer<typeof csvToJsonToolParamsSchema>;

    export const csvToJsonToolOutputSchema = z.object({
      success: z.boolean().describe("Indicates if the conversion was successful."),
      jsonData: z.array(z.record(z.any())).optional()
        .describe("The resulting array of JSON objects if successful."),
      rowCount: z.number().int().optional()
        .describe("Number of rows processed (excluding header if applicable)."),
      error: z.string().optional()
        .describe("Error message if the conversion failed."),
    });
    export type CsvToJsonToolOutput = z.infer<typeof csvToJsonToolOutputSchema>;
    ```

3. **Implement Execution Logic (`index.ts` or `tool.ts`):**
    * Import the `tool` helper from `ai`.
    * Import your Zod schemas and inferred types.
    * The `execute` function should:
        * Accept parameters of the inferred Zod schema type.
        * Contain clear, well-commented logic.
        * Perform any necessary internal operations (e.g., call other services, parse data).
        * Include comprehensive `try/catch` blocks for error handling.
        * Return a Promise resolving to an object that matches your defined output Zod schema.

    ```typescript
    // Example: lib/tools/dataProcessing/csvToJsonTool/index.ts
    import { tool } from 'ai';
    import { 
        csvToJsonToolParamsSchema, 
        type CsvToJsonToolParams,
        type CsvToJsonToolOutput 
    } from './types';
    // Assume a CSV parsing library like 'papaparse' is installed
    // import Papa from 'papaparse';

    async function executeCsvToJson(
        params: CsvToJsonToolParams
    ): Promise<CsvToJsonToolOutput> {
      console.log(`Executing csvToJsonTool with params:`, params);
      try {
        // const parseResult = Papa.parse(params.csvData, {
        //   header: params.hasHeader,
        //   delimiter: params.delimiter,
        //   skipEmptyLines: true,
        //   dynamicTyping: false, // Handle type conversion manually or via transformations
        // });

        // if (parseResult.errors.length > 0) {
        //   return { success: false, error: `CSV parsing error: ${parseResult.errors[0].message}` };
        // }

        // let jsonData = parseResult.data as Array<Record<string, any>>;
        let jsonData = [{mock: "data", from_csv: params.csvData.substring(0,10)}]; // MOCK IMPLEMENTATION

        // Apply columnTransformations if any
        if (params.columnTransformations && jsonData.length > 0) {
          jsonData = jsonData.map(row => {
            const newRow = { ...row };
            for (const transform of params.columnTransformations!) {
              if (newRow[transform.columnName]) {
                switch (transform.transformType) {
                  case 'toNumber':
                    newRow[transform.columnName] = Number(newRow[transform.columnName]);
                    break;
                  case 'toDate':
                    // newRow[transform.columnName] = new Date(newRow[transform.columnName]); // Needs date parsing library for formats
                    break;
                  case 'toLowerCase':
                    newRow[transform.columnName] = String(newRow[transform.columnName]).toLowerCase();
                    break;
                  case 'toUpperCase':
                    newRow[transform.columnName] = String(newRow[transform.columnName]).toUpperCase();
                    break;
                }
              }
            }
            return newRow;
          });
        }
        
        return { 
          success: true, 
          jsonData, 
          rowCount: jsonData.length,
          message: "CSV data successfully converted to JSON." 
        };

      } catch (error: any) {
        console.error(`Error in csvToJsonTool:`, error);
        return { success: false, error: error.message || "Failed to convert CSV to JSON." };
      }
    }

    export const csvToJsonTool = tool({
      description: "Converts CSV (Comma Separated Values) data string into an array of JSON objects. Supports custom delimiters, header detection, and basic column transformations (toNumber, toDate, toLowerCase, toUpperCase).",
      name: 'dataProcessing_csvToJson',
      parameters: csvToJsonToolParamsSchema,
      execute: executeCsvToJson,
    });
    ```

4. **Register in `#file:../../lib/tools/toolRegistry.ts`:**

    ```typescript
    // In lib/tools/toolRegistry.ts
    import { csvToJsonTool } from './dataProcessing/csvToJsonTool'; // Adjust path

    export const appTools = {
      // ... other tools
      [csvToJsonTool.name]: csvToJsonTool,
    };
    // ...
    ```

5. **Initialize in `#file:../../lib/tools/toolInitializer.ts`** (if the tool needs it, e.g., loading a large mapping file, setting up a singleton client).

## 3. Catalog of Key Application Tools (By Category - Highly Detailed Examples)

*(Copilot: This catalog is illustrative. Always refer to the tool's specific `types.ts` for the authoritative Zod parameter schema and its `index.ts` or `tools.ts` for the implementation and detailed `description` passed to the `tool()` helper. The "App Builder" feature relies on these precise definitions for user configuration.)*

---

### 3.1. Web Interaction Tools (`lib/tools/web/`)

* **Purpose:** Enable AI to interact with the internet for information retrieval, content extraction, and web-based research. Essential for agents that need up-to-date information or to interact with web content.
* **Key Files:** `#file:../../lib/tools/web/tools.ts`, `#file:../../lib/tools/web/types.ts`. Also relevant are clients in `lib/tools/agentic/` like `tavily-client.ts`, `brave-search-client.ts`, `firecrawl-client.ts`.

* **`web_performSearch` (Illustrative Name)**
  * **Description:** "Performs a web search using a configured search engine (e.g., Tavily for advanced research, Brave Search, or Google Custom Search). Returns a list of search result objects, each containing a title, URL, and snippet. Useful for initial information gathering or finding relevant web pages for further analysis."
  * **Parameters Schema (e.g., `WebPerformSearchParamsSchema` from `lib/tools/web/types.ts`):**

        ```typescript
        z.object({
          query: z.string().min(3).max(200).describe("The search query string. Should be specific and well-phrased for best results."),
          numResults: z.number().int().min(1).max(10).optional().default(5)
            .describe("Number of search results to return (default 5, max 10)."),
          searchEngine: z.enum(['tavily', 'brave', 'googleCustomSearch']).optional()
            .describe("Optional: Specify the search engine to use if multiple are configured and available. Defaults to the system's preferred engine."),
          includeDomains: z.array(z.string().url()).optional()
            .describe("Optional: A list of domains to prioritize or restrict search to."),
          excludeDomains: z.array(z.string().url()).optional()
            .describe("Optional: A list of domains to exclude from search results."),
        })
        ```

  * **Output Schema (Illustrative `WebPerformSearchOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean(),
          results: z.array(z.object({
            title: z.string(),
            url: z.string().url(),
            snippet: z.string(),
            source: z.string().optional().describe("Originating search engine or source name."),
          })).optional(),
          error: z.string().optional(),
        })
        ```

  * **Example Invocation Prompt for Agent:** "My task is to write a blog post about the future of AI in software development in 2025. First, use the `web_performSearch` tool with the Tavily engine to find 5 recent, authoritative articles or research papers on this topic. Focus on trends and predictions."

* **`web_scrapeUrlContent` (Illustrative Name)**
  * **Description:** "Fetches the content from a given URL and attempts to extract meaningful text or structured data. Can target the whole page's main content or specific elements using CSS selectors. Supports output as plain text, Markdown, or raw HTML. Useful for extracting information from web pages identified by `web_performSearch` or provided directly. Respects `robots.txt` if configured."
  * **Parameters Schema (e.g., `WebScrapeUrlContentParamsSchema` from `lib/tools/web/types.ts`):**

        ```typescript
        z.object({
          url: z.string().url().describe("The fully qualified URL of the web page to scrape."),
          selectors: z.array(z.string()).optional()
            .describe("Optional array of CSS selectors. If provided, extracts content only from these elements. If multiple, concatenates results."),
          outputFormat: z.enum(['text', 'markdown', 'html']).default('markdown').optional()
            .describe("Desired output format of the scraped content. 'markdown' is preferred for LLM consumption."),
          maxContentLength: z.number().int().positive().optional().default(10000)
            .describe("Maximum characters of content to return to prevent overly large outputs. Defaults to 10000."),
          useHeadlessBrowser: z.boolean().default(false).optional()
            .describe("Set to true if the page requires JavaScript execution for content rendering (e.g., SPAs). May use E2B or similar sandboxed browser. Slower and more resource-intensive."),
        })
        ```

  * **Output Schema (Illustrative `WebScrapeUrlContentOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean(),
          url: z.string().url(),
          title: z.string().optional().describe("The title of the web page, if found."),
          content: z.string().optional().describe("The extracted content in the specified format."),
          error: z.string().optional(),
        })
        ```

  * **Example Invocation Prompt for Agent:** "From the search result URL <https://community.weweb.io/t/tutorial-search-a-collection-list/196>, use `web_scrapeUrlContent` to extract the main article body as Markdown. If it's a React SPA, set `useHeadlessBrowser` to true."

---

### 3.2. RAG Tools (Retrieval Augmented Generation) (`lib/tools/rag/`)

* **Purpose:** To enable AI to query and retrieve information from your project's configured vector store(s) (e.g., Upstash Redis via `#file:../../lib/memory/upstash/vector-store.ts`) to provide contextually relevant, up-to-date answers based on private or specialized knowledge like project documentation, API specs, or user-specific data. This is fundamental for grounding LLM responses in factual, project-specific information.
* **Key Files:** `#file:../../lib/tools/rag/tools.ts`, `#file:../../lib/tools/rag/types.ts`, `#file:../../lib/tools/rag-tools.ts` (aggregator).
* **Core Interaction:** These tools interface with `#file:../../lib/memory/store-embedding.ts` (for creating embeddings if needed) and the vector store implementation (e.g., `#file:../../lib/memory/upstash/vector-store.ts`).

* **`rag_queryKnowledgeBase` (Illustrative Name)**
  * **Description:** "Queries the primary vector store with a natural language query. It retrieves the most semantically similar document chunks based on the query. Useful for answering questions based on ingested documentation, finding relevant code examples from an internal knowledge base, or providing context for other AI tasks. Supports filtering by metadata and targeting specific namespaces."
  * **Parameters Schema (e.g., `RagQueryKnowledgeBaseParamsSchema` from `lib/tools/rag/types.ts`):**

        ```typescript
        z.object({
          queryText: z.string().min(5).describe("The natural language query to search the knowledge base. Should be specific to elicit relevant chunks."),
          topK: z.number().int().min(1).max(10).optional().default(3)
            .describe("Number of relevant document chunks to retrieve (default 3, max 10)."),
          namespace: z.string().optional()
            .describe("Optional namespace within the vector store to target (e.g., 'project_docs', 'api_specs', 'user_guides_module_X'). If omitted, searches default/all accessible namespaces."),
          filterMetadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
            .describe("Optional key-value pairs to filter documents by their metadata (e.g., { 'category': 'API', 'version': '2.1' })."),
          minSimilarityScore: z.number().min(0).max(1).optional().default(0.7)
            .describe("Minimum similarity score for a chunk to be considered relevant (0.0 to 1.0). Default 0.7."),
        })
        ```

  * **Output Schema (Illustrative `RagQueryKnowledgeBaseOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean(),
          results: z.array(z.object({
            documentId: z.string().uuid(),
            contentChunk: z.string().describe("The retrieved text chunk."),
            score: z.number().describe("Similarity score of the chunk to the query."),
            metadata: z.record(z.string(), z.any()).optional().describe("Metadata of the source document."),
            source: z.string().optional().describe("Identifier of the source document (e.g., file path, URL)."),
          })).optional(),
          error: z.string().optional(),
        })
        ```

  * **Example Invocation Prompt for Agent:** "My user is asking how to configure the Upstash memory adapter. Use the `rag_queryKnowledgeBase` tool to search the 'project_docs' namespace for setup instructions related to 'Upstash' and 'memory adapter'. Return the top 2 most relevant sections."

* **`rag_addDocument` (Illustrative Name - Admin/Backend Tool)**
  * **Description:** "Adds or updates a document in the vector store. This involves chunking the document content, generating embeddings for each chunk, and storing them with associated metadata. Typically used by backend processes for indexing new documentation or data, not directly by conversational agents unless specifically designed for content ingestion workflows."
  * **Parameters Schema (e.g., `RagAddDocumentParamsSchema` from `lib/tools/rag/types.ts`):**

        ```typescript
        z.object({
          documentId: z.string().uuid().describe("A unique identifier for this document. If it exists, it might be updated or re-indexed."),
          textContent: z.string().min(100).describe("The full text content of the document to be indexed."),
          chunkingStrategy: z.object({
            type: z.enum(['fixedSize', 'semantic']).default('semantic').describe("Chunking strategy: 'fixedSize' or 'semantic' (requires sentence tokenizer)."),
            chunkSize: z.number().int().positive().optional().default(512).describe("Target chunk size in tokens/characters for 'fixedSize' or as a guideline for 'semantic'."),
            chunkOverlap: z.number().int().nonnegative().optional().default(50).describe("Overlap between chunks."),
          }).optional().describe("Optional chunking strategy configuration."),
          metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
            .describe("Key-value metadata to associate with all chunks of this document (e.g., 'source_url', 'document_type', 'tags')."),
          namespace: z.string().optional().default('default')
            .describe("Namespace in the vector store to add this document to."),
          embeddingModelId: z.string().optional()
            .describe("Optional ID of the embedding model to use (from ModelRegistry). Defaults to system default embedding model."),
        })
        ```

  * **Output Schema (Illustrative `RagAddDocumentOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean(),
          documentId: z.string().uuid(),
          chunksAdded: z.number().int().optional(),
          error: z.string().optional(),
        })
        ```

---

### 3.3. File System Tools (`lib/tools/file/` or `#file:../../lib/tools/agentic/mcp-filesystem.ts`)

* **Purpose:** Provide controlled access to the file system for reading, writing, and listing files/directories. **All operations MUST be strictly sandboxed and restricted to designated project areas to prevent security vulnerabilities.** The `mcp-filesystem.ts` might offer a more standardized or secure interface if it adheres to the Model Context Protocol.
* **Key Files:** `#file:../../lib/tools/file/tools.ts`, `#file:../../lib/tools/file/types.ts`.

* **`file_readFile` (Illustrative Name)**
  * **Description:** "Reads the content of a specified file within the project's allowed workspace. Can read entire files or specific line ranges. Returns content as a string."
  * **Parameters Schema (e.g., `FileReadFileParamsSchema` from `lib/tools/file/types.ts`):**

        ```typescript
        z.object({
          filePath: z.string().describe("Relative path to the file from the project root (e.g., 'src/utils/helpers.ts', 'docs/README.MD'). Access outside designated project areas is forbidden."),
          encoding: z.enum(['utf8', 'base64']).default('utf8').optional().describe("File encoding."),
          startLine: z.number().int().positive().optional().describe("Optional line number to start reading from (1-indexed)."),
          endLine: z.number().int().positive().optional().describe("Optional line number to end reading at (inclusive)."),
        })
        ```

  * **Output Schema (Illustrative `FileReadFileOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean(),
          filePath: z.string(),
          content: z.string().optional().describe("File content as a string, or null if error."),
          error: z.string().optional(),
        })
        ```

  * **Example Invocation Prompt:** "Read the content of `#file:./lib/agents/baseAgent.ts` from line 10 to 25 and tell me about the constructor."

* **`file_writeFile` (Illustrative Name)**
  * **Description:** "Writes or overwrites content to a specified file within the project's allowed workspace. Use with caution, especially `overwrite` flag. Backups should be considered by the calling agent or user."
  * **Parameters Schema (e.g., `FileWriteFileParamsSchema`):**

        ```typescript
        z.object({
          filePath: z.string().describe("Relative path to the file from the project root. New directories may not be created automatically unless specified."),
          content: z.string().describe("The content to write to the file."),
          overwrite: z.boolean().default(false).optional().describe("If true, overwrites the file if it exists. If false and file exists, returns an error unless `append` is true."),
          append: z.boolean().default(false).optional().describe("If true and file exists, appends content. Ignored if `overwrite` is true."),
          createPath: z.boolean().default(false).optional().describe("If true, attempts to create parent directories if they don't exist."),
        })
        ```

  * **Output Schema (Illustrative `FileWriteFileOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean(),
          filePath: z.string(),
          error: z.string().optional(),
        })
        ```

  * **Example Invocation Prompt:** "Create a new file at `src/services/newService.ts` with the following boilerplate code: [code snippet]. Ensure the path is created if it doesn't exist."

* **`file_listDirectory` (Illustrative Name)**
  * **Description:** "Lists files and subdirectories within a specified directory path. Can list recursively and show details like size and type."
  * **Parameters Schema (e.g., `FileListDirectoryParamsSchema`):**

        ```typescript
        z.object({
          directoryPath: z.string().describe("Relative path to the directory from project root."),
          recursive: z.boolean().default(false).optional().describe("List recursively into subdirectories."),
          includeDetails: z.boolean().default(false).optional().describe("Include item type (file/dir) and size."),
          globPattern: z.string().optional().describe("Optional glob pattern to filter results (e.g., '*.ts', '**/*.md')."),
        })
        ```

  * **Output Schema (Illustrative `FileListDirectoryOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean(),
          path: z.string(),
          items: z.array(z.object({
            name: z.string(),
            path: z.string(),
            type: z.enum(['file', 'directory']),
            size: z.number().optional(), // in bytes
          })).optional(),
          error: z.string().optional(),
        })
        ```

---

### 3.4. Data Tools (`lib/tools/data/`)

* **Purpose:** To enable AI to interact with the primary LibSQL/Turso database in a structured and safe manner, primarily through predefined CRUD operations or carefully controlled query mechanisms. Relies heavily on Zod schemas from `#file:../../db/libsql/validation.ts` for data integrity.
* **Key Files:** `#file:../../lib/tools/data/tools.ts`, `#file:../../lib/tools/data/types.ts`.

* **`data_getEntityById` (Illustrative Name)**
  * **Description:** "Retrieves a single entity instance from the database by its ID. Uses the project's Drizzle ORM and CRUD helpers (`#file:../../db/libsql/crud.ts`). The entity name must match a defined Zod schema in `validation.ts`."
  * **Parameters Schema (e.g., `DataGetEntityByIdParamsSchema`):**

        ```typescript
        z.object({
          entityName: z.string().describe("The programmatic name of the entity (must correspond to a table and Zod schema, e.g., 'user', 'agent', 'tool')."),
          id: z.string().uuid().describe("The UUID of the entity instance to retrieve."),
          // Example: Allow specifying which relations to include, if your ORM setup supports this easily
          // includeRelations: z.array(z.string()).optional().describe("Optional: Names of related entities to eager load (e.g., for an 'agent', could be ['tools', 'persona']).")
        })
        ```

  * **Output Schema (Illustrative `DataGetEntityByIdOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean(),
          entityName: z.string(),
          data: z.record(z.any()).nullable().optional().describe("The retrieved entity object, or null if not found. Structure matches the Zod schema for entityName."),
          error: z.string().optional(),
        })
        ```

  * **Example Invocation Prompt:** "Fetch the details for the application tool with ID 'tool-uuid-123' using the `data_getEntityById` tool."

* **`data_createEntity` (Illustrative Name)**
  * **Description:** "Creates a new entity instance in the database. The provided data **must** conform to the creation Zod schema for the specified entity type from `validation.ts`."
  * **Parameters Schema (e.g., `DataCreateEntityParamsSchema`):**

        ```typescript
        z.object({
          entityName: z.string().describe("The programmatic name of the entity to create (e.g., 'persona', 'workflowStep')."),
          data: z.record(z.any()).describe("The data object for the new entity. Must validate against the 'insert<EntityName>Schema' from validation.ts."),
        })
        ```

  * **Output Schema (Illustrative `DataCreateEntityOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean(),
          entityName: z.string(),
          id: z.string().uuid().optional().describe("The ID of the newly created entity if successful."),
          data: z.record(z.any()).optional().describe("The created entity object."),
          error: z.string().optional(),
          validationErrors: z.array(z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() })).optional().describe("Zod validation errors if data is invalid.")
        })
        ```

* **`data_updateEntity` (Illustrative Name)**
* **`data_deleteEntity` (Illustrative Name)**
* **`data_listEntities` (Illustrative Name)**
  * **Description:** "Lists multiple entity instances, with support for filtering, sorting, and pagination."
  * **Parameters Schema (e.g., `DataListEntitiesParamsSchema`):**

        ```typescript
        z.object({
          entityName: z.string().describe("Entity name."),
          filters: z.array(z.object({
            field: z.string().describe("Field name to filter on."),
            operator: z.enum(['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'like', 'in', 'notIn']).describe("Filter operator."),
            value: z.any().describe("Value for the filter."),
          })).optional().describe("Array of filter conditions."),
          sortBy: z.string().optional().describe("Field name to sort by."),
          sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
          limit: z.number().int().positive().max(100).optional().default(20),
          offset: z.number().int().nonnegative().optional().default(0),
        })
        ```

---

### 3.5. Code Tools (`lib/tools/code/`)

* **Purpose:** To allow AI to execute code snippets in various languages within a secure, sandboxed environment (via `#file:../../lib/tools/code/execute-worker.ts`), and to perform code analysis tasks like linting or formatting.
* **Key Files:** `#file:../../lib/tools/code/tools.ts`, `#file:../../lib/tools/code/types.ts`.

* **`code_executeSandboxedScript` (Illustrative Name)**
  * **Description:** "Executes a provided code snippet (e.g., Python, JavaScript/TypeScript) in a secure, isolated sandbox (likely using E2B via `#file:../../lib/tools/agentic/e2b.ts` or a custom worker). Returns stdout, stderr, and any execution result. Strict timeouts and resource limits are enforced."
  * **Parameters Schema (e.g., `CodeExecuteScriptParamsSchema`):**

        ```typescript
        z.object({
          language: z.enum(['python', 'javascript', 'typescript', 'bash'])
            .describe("The programming language of the code snippet."),
          code: z.string().min(1).describe("The code snippet to execute."),
          inputArgs: z.array(z.string()).optional()
            .describe("Optional array of string arguments to pass to the script."),
          timeoutMs: z.number().int().min(100).max(30000).optional().default(10000)
            .describe("Execution timeout in milliseconds (default 10s, max 30s)."),
          // environmentVariables: z.record(z.string()).optional()
          //   .describe("Optional key-value pairs for environment variables in the sandbox (use with extreme caution, filter sensitive vars).")
        })
        ```

  * **Output Schema (Illustrative `CodeExecuteScriptOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean().describe("True if execution completed without unhandled exceptions or timeout."),
          stdout: z.string().optional(),
          stderr: z.string().optional(),
          exitCode: z.number().int().optional(),
          durationMs: z.number().int().optional(),
          error: z.string().optional().describe("Error message if execution setup failed or an unhandled exception occurred."),
        })
        ```

  * **Example Invocation Prompt:** "Execute the following Python script to parse a simple JSON string and extract the 'name' field: `import json; data_str = '{\"name\": \"Test\", \"value\": 10}'; data = json.loads(data_str); print(data['name'])`. Return the stdout."

* **`code_lintFileContent` (Illustrative Name)**
  * **Description:** "Lints the provided code content using the project's configured linter (e.g., ESLint for TypeScript/JavaScript, Pylint/Flake8 for Python). Returns a list of linting issues found."
  * **Parameters Schema (e.g., `CodeLintFileParamsSchema`):**

        ```typescript
        z.object({
          filePath: z.string().describe("A representative file path (e.g., 'temp/code.ts') to help the linter determine context, even if content is passed directly."),
          content: z.string().describe("The code content to lint."),
          language: z.enum(['typescript', 'javascript', 'python']).optional()
            .describe("Optional: Specify language to select appropriate linter. If omitted, inferred from filePath extension."),
        })
        ```

  * **Output Schema (Illustrative `CodeLintFileOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean().describe("True if linting completed (does not mean no issues)."),
          issues: z.array(z.object({
            line: z.number().int(),
            column: z.number().int(),
            severity: z.enum(['error', 'warning', 'info']),
            ruleId: z.string().optional(),
            message: z.string(),
          })).describe("Array of linting issues found."),
          error: z.string().optional(),
        })
        ```

---

### 3.6. API Interaction Tools (`lib/tools/api/`)

* **Purpose:** To enable AI to make HTTP requests to external or internal RESTful APIs.
* **Key Files:** `#file:../../lib/tools/api/tools.ts`, `#file:../../lib/tools/api/types.ts`.

* **`api_httpRequest` (Illustrative Name)**
  * **Description:** "Makes a generic HTTP request (GET, POST, PUT, DELETE, PATCH) to a specified URL. Allows setting headers and a request body. Returns the response status, headers, and body. **Copilot: Exercise caution when constructing requests to external services, especially with POST/PUT/DELETE. Ensure URLs are trusted and payloads are correctly formatted and sanitized if they contain user input.**"
  * **Parameters Schema (e.g., `ApiHttpRequestParamsSchema`):**

        ```typescript
        z.object({
          method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
            .describe("The HTTP method to use."),
          url: z.string().url().describe("The fully qualified URL to make the request to."),
          headers: z.record(z.string()).optional()
            .describe("Optional: An object of HTTP headers (key-value pairs). Sensitive headers like 'Authorization' should be handled with care, potentially injected by the tool securely if pre-configured for specific domains."),
          body: z.any().optional()
            .describe("Optional: The request body. If an object, it will typically be JSON.stringify-ed. For form data, specific handling might be needed or a different tool."),
          responseType: z.enum(['json', 'text', 'arraybuffer', 'blob']).default('json').optional()
            .describe("Expected format of the response body. 'json' will attempt to parse, 'text' for raw text."),
          timeoutMs: z.number().int().positive().optional().default(15000)
            .describe("Request timeout in milliseconds (default 15s)."),
        })
        ```

  * **Output Schema (Illustrative `ApiHttpRequestOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean().describe("True if the request was made and a response received (not necessarily a 2xx status)."),
          statusCode: z.number().int().optional().describe("HTTP status code of the response."),
          headers: z.record(z.string()).optional().describe("Response headers."),
          body: z.any().optional().describe("Response body, parsed if 'json' was requested and successful, otherwise raw."),
          error: z.string().optional().describe("Error message if the request itself failed (e.g., network error, timeout)."),
        })
        ```

  * **Example Invocation Prompt:** "Make a GET request to `https://jsonplaceholder.typicode.com/todos/1` and return the JSON body."

---

### 3.7. GraphQL Tools (`lib/tools/graphql/`)

* **Purpose:** To enable AI to interact specifically with GraphQL APIs, by executing queries/mutations or introspecting schemas.
* **Key Files:** `#file:../../lib/tools/graphql/tools.ts`, `#file:../../lib/tools/graphql/types.ts`.

* **`graphql_executeQuery` (Illustrative Name)**
  * **Description:** "Executes a GraphQL query or mutation against a specified GraphQL endpoint. Requires the query string and an optional variables object."
  * **Parameters Schema (e.g., `GraphQLExecuteQueryParamsSchema`):**

        ```typescript
        z.object({
          endpoint: z.string().url().describe("The URL of the GraphQL API endpoint."),
          query: z.string().min(10).describe("The GraphQL query or mutation string (including `query MyQuery {...}` or `mutation MyMutation {...}`)."),
          variables: z.record(z.any()).optional()
            .describe("Optional: An object of variables to pass with the query/mutation."),
          operationName: z.string().optional()
            .describe("Optional: The name of the operation to execute if the query string contains multiple operations."),
          headers: z.record(z.string()).optional().describe("Optional: HTTP headers for the request (e.g., Authorization)."),
        })
        ```

  * **Output Schema (Illustrative `GraphQLExecuteQueryOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean(),
          data: z.record(z.any()).nullable().optional().describe("The 'data' field from the GraphQL response if successful."),
          errors: z.array(z.record(z.any())).optional().describe("The 'errors' field from the GraphQL response, if any."),
          httpStatusCode: z.number().int().optional(),
          error: z.string().optional().describe("Network or client-side error message."),
        })
        ```

  * **Example Invocation Prompt:** "Execute the GraphQL query `{ user(id: \"123\") { name email } }` against the endpoint `https://api.example.com/graphql`."

* **`graphql_introspectSchema` (Illustrative Name)**
  * **Description:** "Performs a GraphQL introspection query against a given endpoint. Can fetch the full schema or details for specific types, queries, or mutations. Useful for understanding an unfamiliar GraphQL API or for code generation tasks."
  * **Parameters Schema (e.g., `GraphQLIntrospectSchemaParamsSchema`):**

        ```typescript
        z.object({
          endpoint: z.string().url().describe("The GraphQL endpoint URL."),
          targetType: z.enum(['FULL_SCHEMA', 'QUERY_TYPE', 'MUTATION_TYPE', 'OBJECT_TYPE', 'INPUT_OBJECT_TYPE', 'ENUM_TYPE', 'SCALAR_TYPE', 'INTERFACE_TYPE', 'UNION_TYPE']).optional().default('FULL_SCHEMA')
            .describe("The part of the schema to introspect. 'FULL_SCHEMA' returns the complete schema in SDL or JSON."),
          typeName: z.string().optional()
            .describe("Required if targetType is not 'FULL_SCHEMA'. The name of the specific type, query, or mutation field to get details for."),
          outputFormat: z.enum(['SDL', 'JSON']).default('SDL').optional()
            .describe("Desired output format for 'FULL_SCHEMA'. SDL is generally more concise for LLMs."),
        })
        ```

  * **Output Schema (Illustrative `GraphQLIntrospectSchemaOutputSchema`):**

        ```typescript
        z.object({
          success: z.boolean(),
          schemaContent: z.string().optional().describe("The introspected schema content in the specified format."),
          error: z.string().optional(),
        })
        ```

---

### 3.8. Agentic Tools (`lib/tools/agentic/`)

* **Description:** This critical category houses more complex, often multi-step tools that act as clients to external services (like search engines, code repositories, academic paper archives, financial data providers) or provide advanced computational capabilities (like sandboxed code execution via E2B). These are fundamental for enabling sophisticated autonomous behaviors in your application agents and for providing rich, real-time information to the AI SDK backend.
* **Key Files:** Each client typically has its own `.ts` file (e.g., `#file:../../lib/tools/agentic/github-client.ts`, `#file:../../lib/tools/agentic/tavily-client.ts`) which exports one or more `tool` definitions. Parameter and output schemas are usually co-located or in a shared `types.ts` within `agentic/`.

* **GitHub Client Tools (from `#file:../../lib/tools/agentic/github-client.ts`)**
  * **`github_fetchIssueDetails`**
    * **Description:** "Fetches detailed information for a specific GitHub issue, including its title, body, labels, comments, status, and assignees."
    * **Parameters Schema (Illustrative):** `z.object({ owner: z.string().describe("Repository owner."), repo: z.string().describe("Repository name."), issueNumber: z.number().int().positive().describe("Issue number.") })`
  * **`github_searchCodeInRepo`**
    * **Description:** "Searches for code snippets or patterns within a specified GitHub repository (or across the user's accessible repositories if owner/repo are omitted)."
    * **Parameters Schema (Illustrative):** `z.object({ query: z.string().describe("Search query (can include code, keywords, language qualifiers like 'lang:typescript')."), owner: z.string().optional(), repo: z.string().optional(), perPage: z.number().int().optional().default(5) })`
  * **`github_getFileContent`**
    * **Description:** "Retrieves the content of a specific file from a GitHub repository at a given branch or commit SHA."
    * **Parameters Schema (Illustrative):** `z.object({ owner: z.string(), repo: z.string(), filePath: z.string().describe("Full path to the file within the repository."), ref: z.string().optional().describe("Branch name, tag, or commit SHA. Defaults to the default branch.") })`
  * **`github_createIssue`**
    * **Description:** "Creates a new issue in a specified GitHub repository."
    * **Parameters Schema (Illustrative):** `z.object({ owner: z.string(), repo: z.string(), title: z.string().min(5), body: z.string().optional(), labels: z.array(z.string()).optional(), assignees: z.array(z.string()).optional() })`

* **Tavily Search Client Tools (from `#file:../../lib/tools/agentic/tavily-client.ts`)**
  * **`tavily_advancedWebSearch`**
    * **Description:** "Performs an advanced, AI-optimized web search using the Tavily API. Good for in-depth research, finding specific facts, or getting comprehensive overviews on topics. Can specify search depth and domains."
    * **Parameters Schema (Illustrative):** `z.object({ query: z.string().describe("The research query."), search_depth: z.enum(['basic', 'advanced']).default('basic').optional().describe("'basic' for quick results, 'advanced' for more thorough research including crawling links."), max_results: z.number().int().optional().default(5), include_domains: z.array(z.string().url()).optional(), exclude_domains: z.array(z.string().url()).optional(), include_answer: z.boolean().default(false).optional().describe("Whether Tavily should attempt to provide a direct answer in addition to sources.") })`

* **E2B Sandboxed Environment Tools (from `#file:../../lib/tools/agentic/e2b.ts`)**
  * **`e2b_runCodeInSecureSandbox`**
    * **Description:** "Executes arbitrary code (Python, JavaScript/Node.js, Bash) in a secure, isolated cloud sandbox environment provided by E2B (e2b.dev). Allows installing packages, running commands, and interacting with a file system within the sandbox. Returns stdout, stderr, and any created artifacts."
    * **Parameters Schema (Illustrative):** `z.object({ language: z.enum(['python3', 'nodejs', 'bash']).describe("Programming language/runtime for the code."), code: z.string().describe("The code script to execute."), filesToUpload: z.array(z.object({ name: z.string(), content: z.string().base64() /* or path to local temp file */ })).optional().describe("Files to upload to the sandbox before execution."), commandsToRunBefore: z.array(z.string()).optional().describe("Shell commands to run before executing the main code (e.g., 'npm install some-package')."), artifactPathsToDownload: z.array(z.string()).optional().describe("Paths to files/directories within the sandbox to download after execution.") })`
  * **Output Schema (Illustrative):** Includes `stdout`, `stderr`, `exitCode`, `downloadedArtifacts: { name: string, content: string /* base64 */ }[]`.

* **Calculator Tool (from `#file:../../lib/tools/agentic/calculator.ts`)**
  * **`calculator_evaluateMathematicalExpression`**
    * **Description:** "Safely evaluates a mathematical expression string (e.g., '2 * (pi + 5^2) / sqrt(16)'). Supports common functions and constants."
    * **Parameters Schema (Illustrative):** `z.object({ expression: z.string().describe("The mathematical expression to evaluate.") })`
    * **Output Schema (Illustrative):** `{ success: boolean, result: number | null, error: string | null }`

* **(Other Agentic Clients like Wikipedia, Wikidata, Arxiv, Firecrawl, Polygon, Reddit, Google Custom Search, Brave Search would have similarly structured tools for their specific domains, e.g., `wikipedia_getArticleSummary`, `arxiv_findPapersByKeyword`, `firecrawl_scrapeUrlRecursively` etc., each with their own Zod parameter schemas.)**

## 4. Guidance for GitHub Copilot When Suggesting/Using Application Tools

* **Prioritize Tool Description & Parameter Schema:** The LLM's ability to choose and use tools correctly hinges on the quality of the tool's `description` and the clarity of its Zod `parametersSchema` (especially the `.describe()` calls for each parameter). When Copilot is generating a tool call, it must strictly adhere to this schema.
* **Explicit Tool Naming:** When appropriate, prompt Copilot to use a specific tool by its registered `name` if you know which one is best for the task (e.g., "Use the `tavily_advancedWebSearch` tool to...").
* **Tool Selection by LLM:** For more open-ended prompts, the LLM (guided by the AI SDK backend) will select the most appropriate tool(s) from the `toolRegistry.ts` based on your prompt and the tool descriptions. Your prompts should provide enough context for this selection to be accurate.
* **Parameter Generation:** Copilot must generate the `parameters` object for a tool call such that it perfectly matches the tool's Zod schema from its `types.ts` file. This includes all required fields and correct data types.
* **Handling Tool Output:** Code generated by Copilot should correctly handle the expected output structure of a tool (ideally defined by an output Zod schema for the tool) and manage potential error states (e.g., `success: false` in the tool's response).
* **Tool Chaining Orchestration:** For complex tasks requiring multiple tools, the "App Builder" is the primary interface for users to define such chains. When assisting with App Builder logic, or if directly prompting an agent for a multi-tool task, Copilot should understand how to structure prompts or generate code that calls tools sequentially, using the output of one as input for another.
* **Security with Tools:** Remind Copilot to be cautious when suggesting tools that interact with external services, execute code, or modify the file system. User confirmation or sandboxing (as with E2B) are key.
* **Awareness of `upstash-tool-execution-store.ts`:** Copilot should understand that tool executions are logged. While it won't directly write to this store, this implies a level of auditability and potential for stateful reasoning about tool use.

## 5. Best Practices for Developers Creating New Application Tools

* **Clear, Detailed Descriptions for LLMs:** Write the `description` field as if you are explaining it to another developer *and* to an LLM that needs to decide if this tool is the right one for a job. Be explicit about capabilities, limitations, and when to use it.
* **Rigorous and Descriptive Zod Schemas:** This cannot be overstated. Use Zod for all `parameters` and ideally for outputs. Every parameter in the Zod schema **must** have a `.describe()` string. This is what the Vercel AI SDK uses to inform the LLM about how to structure the arguments for your tool.
* **Single Responsibility Principle:** Design tools to perform one well-defined task effectively. Complex operations can be achieved by chaining multiple granular tools.
* **Idempotency:** If a tool has side effects, strive to make it idempotent where feasible.
* **Robust Error Handling:** Implement comprehensive error handling within each tool's `execute` function. Return a consistent error structure (e.g., `{ success: false, error: "Descriptive error message" }`).
* **Security is Paramount:**
  * Sanitize all inputs, especially those used in database queries, file paths, shell commands, or external API calls.
  * Handle API keys and other secrets exclusively through environment variables, loaded during `toolInitializer.ts` or within the tool's secure execution context. **Never hardcode secrets.**
  * For tools that execute code (e.g., `code_executeSandboxedScript`) or interact with the OS, ensure they run in a **strictly sandboxed and resource-limited environment** (e.g., using E2B, Docker, or WebAssembly runtimes).
* **Thorough Registration & Initialization:** Ensure every new tool is correctly registered in `toolRegistry.ts` and any necessary setup is handled in `toolInitializer.ts`.
* **Comprehensive Unit & Integration Testing:** Write tests for each tool, covering:
  * Successful execution paths with valid parameters.
  * Parameter validation failures (testing the Zod schema).
  * Internal error handling within the `execute` function.
  * Interactions with external services (using mocks where appropriate).
* **Developer Documentation (Internal `README.md`):** Create a `README.md` inside each tool's module directory (`lib/tools/<category>/<toolName>/README.md`) for detailed notes for human developers, including advanced usage examples, known issues, or design rationale.
* **Consider Observability:** Ensure tool execution (especially start, end, success/failure, key parameters) can be effectively logged to your observability systems (Langfuse via Upstash store).

This guide provides the foundational knowledge for GitHub Copilot to effectively understand, suggest, and assist in the development and utilization of the rich and complex tool ecosystem within the `ai-sdk-dm` project. It is designed to be a living document, updated as new tools are added or existing ones are modified.

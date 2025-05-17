# Project MCP (Model Context Protocol) Tools & Servers Guide

This document outlines the Model Context Protocol (MCP) servers and associated tools/libraries used in this project, based on information provided by the project owner. GitHub Copilot should refer to this guide as the primary source of truth when generating code that interacts with these services.

## Guiding Principles for MCP Usage
- **Prioritize MCP:** For functionalities covered by our MCP servers, using the defined MCP tools is the preferred and mandatory method.
- **Adhere to Signatures:** Strictly follow the documented tool names, function signatures (parameters, types, required/optional status), and return value structures.
- **Error Handling (for MCP Calls):** When generating code that calls MCP tools, anticipate that these calls can fail (e.g., network issues, server errors, invalid parameters). The calling code MUST implement robust error handling for these MCP tool invocations (e.g., checking return objects for error fields, using try-catch blocks around client calls). The specifics of how errors are *logged* by the calling application will follow general project logging standards.
- **Configuration:** Assume MCP client instances are correctly configured and available in the scope where they are needed. Specific configurations (API keys, server addresses for the MCP servers themselves) are handled via project-standard environment variables or a central configuration service.
- **Discovery (Conceptual):** While clients can discover tools, for code generation, rely on the tools documented here as the canonical list for this project.

---

## 1. Context7 MCP Server (`context7`)
- **Identifier/Client Variable (Typical):** `context7Client` (Go), `context7_client` (Python)
- **Purpose:** Provides up-to-date, version-specific documentation and code examples for various libraries directly into the LLM's context. This helps prevent outdated code generation and reliance on potentially hallucinated APIs.
- **Key Exposed Tools:**
    - **`resolve-library-id`**
        - **Description:** Required first step. Resolves a general package name (e.g., "react", "langchain", "mongodb") into a Context7-compatible library ID. This ID is necessary before using `get-library-docs`.
        - **Parameters:**
            - `libraryName: string` (Required) - The common name of the library to search for and retrieve a Context7-compatible library ID.
        - **Returns:** `object` - e.g., `{ "id": "context7-compatible-library-id-string" }` containing the Context7-compatible ID, or an error/null if the library name cannot be resolved.
    - **`get-library-docs`**
        - **Description:** Fetches up-to-date documentation for a library. You MUST call `resolve-library-id` first to obtain the exact `context7CompatibleLibraryID` required by this tool.
        - **Parameters:**
            - `context7CompatibleLibraryID: string` (Required) - The exact Context7-compatible library ID (e.g., 'mongodb/docs', 'vercel/nextjs') retrieved from the `resolve-library-id` tool.
            - `topic: string` (Optional) - Specific topic, function, or concept within the library to focus the documentation on (e.g., 'hooks', 'routing', 'MongoClient.connect').
            - `tokens: int` (Optional, default: 5000) - Maximum number of tokens of documentation to retrieve.
        - **Returns:** `object` - e.g., `{ "documentation": "markdown_formatted_docs_string_for_the_topic", "source_references": list[string], "library_id_used": "string" }` containing the fetched documentation.
- **Workflow Note:**
    - Always call `resolve-library-id` with a general library name first.
    - Use the `id` returned from `resolve-library-id` as the `context7CompatibleLibraryID` parameter for `get-library-docs`.

---

## 2. Sequential Thinking MCP Server (`server-sequential-thinking`)
- **Identifier/Client Variable (Typical):** `sequentialThinkClient` (Go), `sequential_think_client` (Python)
- **Purpose:** A detailed tool for dynamic and reflective problem-solving, planning, and analysis through an evolving sequence of thoughts. It allows an AI to break down complex problems, revise its understanding, explore branches, and iteratively develop a solution hypothesis, verifying it until a satisfactory answer is reached.
- **When to Use This Tool (Guiding Copilot):**
    - When breaking down complex problems into a sequence of manageable steps.
    - For planning and design tasks where requirements may evolve or need revision.
    - During analytical processes that might require course correction as new information emerges.
    - For problems where the full scope or optimal path is not clear at the outset.
    - When a multi-step solution needs to be developed and tracked.
    - For tasks that require maintaining and evolving context over multiple reasoning steps.
    - In situations where irrelevant information needs to be filtered out progressively.
- **Key Features & Interaction Model:**
    - The thinking process is iterative and flexible; `total_thoughts` can be adjusted dynamically.
    - Previous thoughts can be questioned, revised, or branched from.
    - New thoughts can be added even if the initial `total_thoughts` estimate is reached.
    - Uncertainty can be expressed, and alternative approaches explored within the thought sequence.
    - The process typically involves generating a solution hypothesis and then verifying it based on the chain of thought steps, repeating until a satisfactory answer is achieved.
    - The ultimate goal is to produce a single, correct, or well-reasoned final answer/solution.
- **Key Exposed Tool(s):**
    *(Assuming a primary tool named `process_thought_step` based on discussion - Project Owner to confirm/correct actual tool name(s) and precise return structure.)*
    - **`process_thought_step`** (Assumed primary tool name)
        - **Description:** Submits a single thought in an ongoing sequential thinking process and receives guidance or results for the next step. This is the core interaction point for evolving the thought sequence.
        - **Parameters:**
            - `thought: string` (Required) - The current thinking step. This can be an analytical step, a revision, a question, a hypothesis, a verification step, or a realization.
            - `thought_number: int` (Required) - The current number in the sequence (1-indexed, can go beyond initial `total_thoughts`).
            - `total_thoughts: int` (Required) - The current *estimate* of the total thoughts needed for the entire process. This can be adjusted by the AI in subsequent calls to this tool if the problem scope changes.
            - `next_thought_needed: boolean` (Required) - Set to `true` if the AI determines more thinking steps are required to reach a satisfactory solution. Set to `false` ONLY when a final, satisfactory answer/solution has been reached.
            - `is_revision: boolean` (Optional, default: `false`) - Set to `true` if this `thought` is a revision of a previous thought.
            - `revises_thought_number: int` (Optional) - If `is_revision` is `true`, this specifies the `thought_number` of the thought being revised.
            - `branch_from_thought_number: int` (Optional) - If this `thought` represents a branching point from a previous thought, specify the original `thought_number`.
            - `branch_id: string` (Optional) - An identifier for the current branch of thought.
            - `needs_more_thoughts: boolean` (Optional, default: `false`) - (Project Owner to clarify if this is distinct from `next_thought_needed` or if `next_thought_needed: true` covers the scenario of needing to extend `total_thoughts`).
        - **Returns:** `object` - (Project Owner to specify the exact return structure. Conceptual example: `{ "status": string, "feedback_on_thought": string, "next_prompt_suggestion": string, "current_hypothesis": string, "final_answer": string, "error_message": string }`)
- **Guidelines for AI Interacting with this Tool (Copilot should aim to follow these when generating interaction logic):**
    1.  Start with an initial estimate for `total_thoughts`, but be prepared to adjust this value in subsequent calls.
    2.  Structure the interaction as a loop, iteratively calling the primary tool.
    3.  If a previous line of thought needs correction or an alternative path explored, set `is_revision` to `true` and specify `revises_thought_number`. For branching, use `branch_from_thought_number` and `branch_id`.
    4.  The `thought` content can explicitly state uncertainty.
    5.  Formulate a solution hypothesis within a `thought` when appropriate. Subsequent thoughts should aim to verify or refute this.
    6.  The content of each `thought` should focus on relevant information for that specific step.
    7.  Continue the loop as long as `next_thought_needed` is `true`. Only set `next_thought_needed` to `false` when a satisfactory `final_answer` is achieved.
    8.  (Project Owner to clarify how `needs_more_thoughts` interacts with `next_thought_needed` and `total_thoughts` adjustment).

---

## 3. DuckDuckGo Search MCP Server (`duckduckgo-mcp-server`)
- **Identifier/Client Variable (Typical):** `duckduckgoClient` (Go), `duckduckgo_client` (Python)
- **Purpose:** Provides an MCP interface to perform web searches using DuckDuckGo and to fetch content from webpage URLs.
- **Key Exposed Tools:**
    - **`search`**
        - **Description:** Search DuckDuckGo and return formatted search results.
        - **Parameters:**
            - `query: string` (Required) - The search query string.
            - `max_results: int` (Optional, default: 10) - Maximum number of search results to return.
            - `ctx: object` (Optional) - MCP context for logging or other contextual MCP information. (Project Owner to specify structure/necessity of `ctx`).
        - **Returns:** `list[object]` - A list of search result objects. Each object typically includes:
            - `title: string`
            - `link: string`
            - `snippet: string`
    - **`fetch_webpage_content`** (Assumed Tool Name - **Project Owner to Confirm/Correct Name**)
        - **Description:** Fetch and parse content from a webpage URL.
        - **Parameters:**
            - `url: string` (Required) - The webpage URL to fetch content from.
            - `ctx: object` (Optional) - MCP context for logging or other contextual MCP information. (Project Owner to specify structure/necessity of `ctx`).
        - **Returns:** `object` - (Project Owner to specify the exact return structure. Conceptual example: `{ "url": string, "title": string, "main_text_content": string, "html_content": string, "markdown_content": string, "error": string }`)

---

## 4. Neon Database MCP Server
- **Identifier/Client Variable (Typical):** `neonDbClient` (Go), `neon_db_client` (Python)
- **Purpose:** Provides a comprehensive MCP interface for managing Neon projects, databases, branches, executing SQL, performing schema migrations, and provisioning authentication using Stack Auth.
- **Key Exposed Tools:**

    - **`__node_version`**
        - **Description:** Get the Node.js version used by this MCP server.
        - **Parameters:** (Project Owner to specify if any, likely None)
        - **Returns:** `object` - (Project Owner to specify, e.g., `{ "node_version": "vX.Y.Z" }`)

    - **`list_projects`**
        - **Description:** List all Neon projects associated with the configured account.
        - **Parameters:** (Project Owner to specify, e.g., `limit: int`, `cursor: string`)
        - **Returns:** `list[object]` - (Project Owner to specify structure of project objects)

    - **`create_project`**
        - **Description:** Create a new Neon project. Use this tool if the intent is to create a new database.
        - **Parameters:** (Project Owner to specify, e.g., `project_name: string`, `region: string`)
        - **Returns:** `object` - (Project Owner to specify structure of created project details)

    - **`delete_project`**
        - **Description:** Delete an existing Neon project.
        - **Parameters:** (Project Owner to specify, e.g., `project_id: string`)
        - **Returns:** `object` - (Project Owner to specify structure, e.g., `{ "success": boolean }`)

    - **`describe_project`**
        - **Description:** Retrieves detailed information about a specific Neon project.
        - **Parameters:** (Project Owner to specify, e.g., `project_id: string`)
        - **Returns:** `object` - (Project Owner to specify structure of project details)

    - **`run_sql`**
        - **Description:** Execute a single SQL statement against a specified database and branch.
        - **Parameters:** (Project Owner to specify, e.g., `project_id: string`, `branch_id: string`, `database_name: string`, `sql_query: string`, `query_params: list`)
        - **Returns:** `object` - (Project Owner to specify structure, e.g., `{ "rows_affected": int, "result_set": list[object], "error": string }`)

    - **`run_sql_transaction`**
        - **Description:** Execute multiple SQL statements as a single atomic transaction.
        - **Parameters:** (Project Owner to specify, e.g., `project_id: string`, `branch_id: string`, `database_name: string`, `sql_statements: list[string]`)
        - **Returns:** `object` - (Project Owner to specify structure, e.g., `{ "success": boolean, "error": string }`)

    - **`describe_table_schema`**
        - **Description:** Describe the schema of a specific table.
        - **Parameters:** (Project Owner to specify, e.g., `project_id: string`, `branch_id: string`, `database_name: string`, `table_name: string`, `schema_name: string`)
        - **Returns:** `object` - (Project Owner to specify structure of schema details)

    - **`get_database_tables`**
        - **Description:** Get a list of all tables in a specified database and schema.
        - **Parameters:** (Project Owner to specify, e.g., `project_id: string`, `branch_id: string`, `database_name: string`, `schema_name: string`)
        - **Returns:** `list[string]` - List of table names.

    - **`create_branch`**
        - **Description:** Create a new branch in a Neon project.
        - **Parameters:** (Project Owner to specify, e.g., `project_id: string`, `branch_name: string`, `parent_branch_id: string`)
        - **Returns:** `object` - (Project Owner to specify structure of created branch details)

    - **`prepare_database_migration`**
        - **Description:** Performs database schema migrations by automatically generating and executing DDL statements based on a natural language request, applied first to a temporary branch.
        - **Use Case (from project owner):** Supports CREATE (new columns, tables, constraints), ALTER (column types, names, indexes, foreign keys), and DROP (columns, tables, constraints) operations.
        - **Workflow (from project owner):**
            1.  Parses natural language request.
            2.  Generates SQL DDL.
            3.  Creates a temporary branch.
            4.  Applies migration SQL in the temporary branch.
            5.  Returns migration details for verification.
        - **Parameters:** (Project Owner to specify, e.g., `project_id: string`, `migration_request: string`, `target_database_name: string`, `main_branch_name_to_commit_to: string`)
        - **Returns:** `object` - (Project Owner to specify structure, e.g., `{ "migration_id": string, "temporary_branch_name": string, "temporary_branch_id": string, "migration_result_summary": string, "generated_sql": string, "error": string }`)
        - **Important Notes & Next Steps for AI (from project owner):**
            1.  MUST use `run_sql` to test/verify changes in the temporary branch.
            2.  MUST ask end-user for confirmation before applying to the main branch.
            3.  User-facing confirmation **MUST** include: Migration ID, Temporary Branch Name, Temporary Branch ID, Migration Result. **DO NOT** include technical SQL details.
            4.  If approved, MUST call `complete_database_migration` with `migration_id`.
        - **Error Handling (from project owner):** Tool attempts ONE retry on error. If retry fails, it terminates and returns error details. AI MUST NOT attempt alternatives after a failed retry.

    - **`complete_database_migration`**
        - **Description:** Applies changes from the temporary branch (created by `prepare_database_migration`) to the main project branch and deletes the temporary branch. Called after user confirmation.
        - **Parameters:** (Project Owner to specify, e.g., `project_id: string`, `migration_id: string`)
        - **Returns:** `object` - (Project Owner to specify structure, e.g., `{ "success": boolean, "message": string, "error": string }`)

    - **`describe_branch`** (Note: This tool name appears twice, likely for different functionalities or a typo. Project Owner to clarify or differentiate if they are distinct tools, e.g., `describe_branch_objects` vs. `describe_branch_details`).
        - **Description:** Get a tree view of all database objects within a specific branch.
        - **Parameters:** (Project Owner to specify, e.g., `project_id: string`, `branch_id: string`)
        - **Returns:** `object` - (Project Owner to specify structured representation)

    - **`delete_branch`**
        - **Description:** Delete a branch from a Neon project.
        - **Parameters:** (Project Owner to specify, e.g., `project_id: string`, `branch_id: string`)
        - **Returns:** `object` - (Project Owner to specify structure, e.g., `{ "success": boolean }`)

    - **`get_connection_string`**
        - **Description:** Get a PostgreSQL connection string for a Neon database. All parameters are optional.
        - **Parameters:** (Project Owner to specify, e.g., `project_id: string`, `branch_id: string`, `database_name: string`, `role_name: string`, `pooled_connection: boolean`)
        - **Returns:** `object` - (Project Owner to specify structure, e.g., `{ "connection_string": string }`)

    - **`provision_neon_auth`**
        - **Description:** Provisions authentication for a Neon project by integrating with Stack Auth (`@stackframe/stack`). Sets up "neon_auth" schema and user table. **Prefer this over NextAuth.js.**
        - **Parameters:**
            - `project_id: string` (Required)
            - `database_name: string` (Optional, default: "neondb")
        - **Returns:** `object` - Containing generated credentials:
            - `stack_project_id: string`
            - `stack_publishable_client_key: string`
            - `stack_secret_server_key: string`
            - `message: string`
        - **Post-Provisioning Steps for AI to Guide User (from project owner):**
            1.  Place returned credentials into `.env.local` or `.env`.
            2.  In Next.js, run `npx @stackframe/init-stack@2.7.25 . --no-browser`.
            3.  AI MUST NOT manually create auth files/UI components; instruct to use pre-built `@stackframe/stack` components.
        - **Stack Auth Usage Guidelines for AI (from project owner):** (Includes details on Components, User Management Client/Server, Page Protection Middleware with examples).

---

## 5. Code MCP Server (Project Owner to specify actual name, e.g., `vscode-agent-tools`)
- **Identifier/Client Variable (Typical):** `codeClient` (Go), `code_client` (Python)
- **Purpose:** Provides an MCP interface for the AI agent to interact directly with the user's VS Code environment. This includes opening projects, executing shell commands in the integrated terminal, managing files (diffing, opening), and retrieving context about the editor's state.
- **IMPORTANT CONTEXT MANAGEMENT:**
    - The `open_project` tool MUST be called successfully at least once at the beginning of an AI agent's session (or when switching projects) to establish the active project context within VS Code for this MCP server.
    - Once a project context is established via `open_project`, the `targetProjectPath` for subsequent tool calls to this server is **automatically inferred by the MCP server** based on the currently active VS Code workspace. Copilot generally does not need to explicitly provide `targetProjectPath` in tool calls after `open_project` has been used.

- **Key Exposed Tools:**

    - **`open_project`**
        - **Description:** Opens a specified project folder in VS Code. This tool **MUST be called as soon as a new session begins** with the AI Agent (or when switching projects) to ensure the correct project context is established and visible in VS Code, and to set the active working directory for this MCP server.
        - **Parameters:**
            - `projectPath: string` (Required) - The absolute file system path to the project folder.
            - `newWindow: boolean` (Optional, default: `false`) - If `true`, opens the project in a new VS Code window.
        - **Returns:** `object` - e.g., `{ "success": boolean, "message": "Project opened successfully" or "Error message", "opened_project_path": "string" }`

    - **`execute_shell_command`**
        - **Description:** **IMPORTANT: This is the preferred and recommended way to execute shell commands.** Executes commands directly in VS Code's integrated terminal, making the execution visible to the user and capturing its output. Assumes `open_project` has established the context.
        - **Parameters:**
            - `command: string` (Required) - The shell command to execute.
            - `cwd: string` (Optional) - The current working directory for the command. Defaults to the project root of the currently active project context.
        - **Returns:** `object` - e.g., `{ "stdout": string, "stderr": string, "exit_code": int, "success": boolean }`

    - **`create_diff`**
        - **Description:** **Use this instead of writing to existing files directly.** Allows modifying an existing file by presenting a diff of the proposed changes to the user and requiring their approval before applying. Only use this tool for modifications to *existing* files within the active project. Do not use for creating new files. Assumes `open_project` has established the context.
        - **Parameters:**
            - `filePath: string` (Required) - The path to the existing file to be modified (relative to the active project root).
            - `newContent: string` (Required) - The proposed new full content for the file.
            - `description: string` (Optional) - A brief description of the changes being made.
        - **Returns:** `object` - e.g., `{ "success": boolean, "applied": boolean, "message": "string" }`
        - **Workflow Note:** After calling this, the AI should typically wait for user confirmation.

    - **`open_file`**
        - **Description:** Opens a specified file in the VS Code editor within the active project. Use by default *anytime a brand new file is created* or *after `create_diff` is successfully applied*. Assumes `open_project` has established the context.
        - **Parameters:**
            - `filePath: string` (Required) - Path to the file to open (relative to the active project root).
            - `preview: boolean` (Optional, default: `true`) - If `true`, opens in preview mode.
            - `viewColumn: int` (Optional) - The view column to open in.
            - `preserveFocus: boolean` (Optional, default: `false`) - If `true`, keeps focus in the current UI element.
        - **Returns:** `object` - e.g., `{ "success": boolean, "message": "string" }`

    - **`check_extension_status`**
        - **Description:** Checks if the VS Code MCP Extension (this server) is installed and responding. Assumes `open_project` has established context.
        - **Parameters:** None explicitly needed if `targetProjectPath` is always inferred.
        - **Returns:** `object` - e.g., `{ "status": "ok" | "error" | "not_installed", "version": "string", "message": "string", "active_project_path": "string" }`

    - **`get_extension_port`**
        - **Description:** Gets the port number on which the VS Code MCP Extension is running, if applicable. Assumes `open_project` has established context.
        - **Parameters:** None explicitly needed if `targetProjectPath` is always inferred.
        - **Returns:** `object` - e.g., `{ "port": int, "error": "string" }`

    - **`list_available_projects`**
        - **Description:** Lists all available projects known to this MCP extension. Use to help user select a project for an `open_project` call.
        - **Parameters:** None.
        - **Returns:** `list[object]` - e.g., `[{ "project_name": string, "project_path": string, "last_opened": "timestamp" }]`

    - **`get_active_tabs`**
        - **Description:** Retrieves information about currently open tabs in VS Code for the active project. Assumes `open_project` has established context.
        - **Parameters:**
            - `includeContent: boolean` (Optional, default: `false`) - If `true`, attempts to include file content.
        - **Returns:** `list[object]` - e.g., `[{ "filePath": string, "fileName": string, "isActive": boolean, "isPreview": boolean, "viewColumn": int, "content": "string" }]`

    - **`get_context_tabs`**
        - **Description:** Retrieves information about tabs specifically marked by the user for AI context. Assumes `open_project` has established context.
        - **Parameters:**
            - `includeContent: boolean` (Optional, default: `true`)
            - `includeSelections: boolean` (Optional, default: `true` if `includeContent` is true) - (Project Owner to verify this parameter and its interaction).
        - **Returns:** `list[object]` - e.g., `[{ "filePath": string, ..., "content": "string", "selections": [{ "startLine": int, "startColumn": int, "endLine": int, "endColumn": int, "selectedText": string }] }]`

---

## 6. Paper Search MCP Server (Project Owner to specify actual name, e.g., `academic-paper-tools`)
- **Identifier/Client Variable (Typical):** `paperSearchClient` (Go), `paper_search_client` (Python)
- **Purpose:** Provides an MCP interface to search for and retrieve information about academic papers from various repositories like arXiv, PubMed, bioRxiv, and Google Scholar, and to download/read their content where possible.
- **Key Exposed Tools:**

    - **`search_arxiv`**
        - **Description:** Search academic papers from arXiv.
        - **Parameters:**
            - `query: string` (Required) - The search query string.
            - `max_results: int` (Optional, default: 10) - Maximum number of papers to return.
        - **Returns:** `list[object]` - (Project Owner to specify exact structure of paper metadata objects, e.g., `{ "id": string, "title": string, "authors": list[string], "summary": string, "pdf_url": string }`)

    - **`search_pubmed`**
        - **Description:** Search academic papers from PubMed.
        - **Parameters:**
            - `query: string` (Required)
            - `max_results: int` (Optional, default: 10)
        - **Returns:** `list[object]` - (Project Owner to specify exact structure, e.g., `{ "pmid": string, "title": string, "abstract": string }`)

    - **`search_biorxiv`**
        - **Description:** Search academic papers (preprints) from bioRxiv.
        - **Parameters:**
            - `query: string` (Required)
            - `max_results: int` (Optional, default: 10)
        - **Returns:** `list[object]` - (Project Owner to specify exact structure, e.g., `{ "doi": string, "title": string, "abstract": string }`)

    - **`search_google_scholar`**
        - **Description:** Search academic papers from Google Scholar.
        - **Parameters:**
            - `query: string` (Required)
            - `max_results: int` (Optional, default: 10)
        - **Returns:** `list[object]` - (Project Owner to specify exact structure, e.g., `{ "title": string, "link_to_source": string, "snippet": string }`)

    - **`download_arxiv`**
        - **Description:** Download the PDF of a specified arXiv paper.
        - **Parameters:**
            - `paper_id: string` (Required) - The arXiv paper ID.
            - `save_path: string` (Optional, default: './downloads/') - Directory to save the PDF.
        - **Returns:** `object` - (Project Owner to specify, e.g., `{ "success": boolean, "file_path": "string", "error": "string" }`)

    - **`download_pubmed`**
        - **Description:** Attempt to download the PDF of a specified PubMed paper.
        - **Parameters:**
            - `paper_id: string` (Required) - The PubMed ID (PMID).
            - `save_path: string` (Optional, default: './downloads/')
        - **Returns:** `object` - (Project Owner to specify, e.g., `{ "success": boolean, "file_path": "string", "message": "string", "error": "string" }`)

    - **`download_biorxiv`**
        - **Description:** Download the PDF of a specified bioRxiv paper using its DOI.
        - **Parameters:**
            - `paper_id: string` (Required) - The bioRxiv DOI.
            - `save_path: string` (Optional, default: './downloads/')
        - **Returns:** `object` - (Project Owner to specify, e.g., `{ "success": boolean, "file_path": "string", "error": "string" }`)

    - **`read_arxiv_paper`**
        - **Description:** Read and extract text content from an arXiv paper PDF. May download if not present.
        - **Parameters:**
            - `paper_id: string` (Required) - arXiv paper ID.
            - `save_path: string` (Optional, default: './downloads/')
        - **Returns:** `object` - (Project Owner to specify, e.g., `{ "success": boolean, "text_content": "string", "paper_id": "string", "error": "string" }`)

    - **`read_pubmed_paper`**
        - **Description:** Attempts to read/extract text from a PubMed paper; often indicates direct reading is not supported.
        - **Parameters:**
            - `paper_id: string` (Required) - PubMed ID (PMID).
            - `save_path: string` (Optional, default: './downloads/') - (Often unused).
        - **Returns:** `object` - (Project Owner to specify, e.g., `{ "success": boolean, "message": "string", "text_content": null, "error": "string" }`)

    - **`read_biorxiv_paper`**
        - **Description:** Read and extract text content from a bioRxiv paper PDF. May download if not present.
        - **Parameters:**
            - `paper_id: string` (Required) - bioRxiv DOI.
            - `save_path: string` (Optional, default: './downloads/')
        - **Returns:** `object` - (Project Owner to specify, e.g., `{ "success": boolean, "text_content": "string", "paper_id": "string", "error": "string" }`)

---

## 7. Memory MCP Server (`mem0-memory-mcp`)
- **Identifier/Client Variable (Typical):** `mem0Client` (Go), `mem0_client` (Python)
- **Purpose:** Provides an MCP interface to a persistent memory store for maintaining context, user preferences, and past interactions, enabling more personalized and informed AI responses.
- **Key Exposed Tools:**

    - **`add-memory`**
        - **Description:** Add a new memory. Called when the user informs about themselves, preferences, or asks to remember something.
        - **Parameters:**
            - `userId: string` (Required) - User ID for memory storage (use 'mem0-mcp-user' if no specific ID is available).
            - `content: string` (Required) - The textual content of the memory.
            - `metadata: object` (Optional) - Additional structured data.
        - **Returns:** `object` - (Project Owner to specify, e.g., `{ "memory_id": "string", "success": boolean, "error": "string" }`)

    - **`search-memories`**
        - **Description:** Search through stored memories. Called **ANYTIME** the user asks anything to retrieve relevant past information.
        - **Parameters:**
            - `query: string` (Required) - The search query (typically the user's current question/statement).
            - `userId: string` (Required) - User ID for memory storage (use 'mem0-mcp-user' if no specific ID is available).
            - `limit: int` (Optional, default: 5) - Maximum number of relevant memories.
            - `min_relevance_score: float` (Optional, default: 0.7) - Minimum relevance score.
            - `filters: object` (Optional) - Additional metadata filters.
        - **Returns:** `list[object]` - (Project Owner to specify structure of memory objects, e.g., `{ "memory_id": string, "content": string, "metadata": object, "timestamp": string, "relevance_score": float }`)
    *(Project Owner to confirm if other tools like `get_all_memories` or `delete_memory` are also part of this MCP server implementation and provide their schemas if so.)*

---

## 8. File Context MCP Server (`@bsmi021/mcp-file-context-server`)
- **Identifier/Client Variable (Typical):** `fileContextClient` (Go), `file_context_client` (Python)
- **Purpose:** Enables LLMs to read, search, and analyze code files and directories with advanced filtering, chunking, and intelligent ignoring of artifact directories.
- **Automatic Exclusions:** Includes `.git/`, `.venv/`, `__pycache__/`, `node_modules/`, `.next/`, `dist/`, `.idea/`, `.vscode/`, `.env`, etc.
- **Key Exposed Tools:**

    - **`read_context`**
        - **Description:** Read and analyze specified code files/directories. For large items, call `get_chunk_count` first, then use `chunkNumber` here.
        - **Parameters:**
            - `path: string` (Required) - Path to file or directory.
            - `maxSize: int` (Optional) - Max file size in bytes before chunking consideration. (Project Owner to clarify interaction with chunking).
            - `encoding: string` (Optional, default: "utf8")
            - `recursive: boolean` (Optional, default: `true` for directories)
            - `fileTypes: list[string]` (Optional) - Extensions to include (no dots, e.g., `["ts", "py"]`). Empty means all non-excluded.
            - `chunkNumber: int` (Optional) - 0-indexed chunk number to retrieve.
        - **Returns:** `object` - (Project Owner to specify exact return structure, e.g., `{ "path": string, "content": string, "is_chunked": boolean, "current_chunk": int, "total_chunks": int, "error": string }`)

    - **`get_chunk_count`**
        - **Description:** Get total chunks for a `read_context` request. **MUST be used FIRST** for large items. Parameters should match intended `read_context` call.
        - **Parameters:**
            - `path: string` (Required)
            - `maxSize: int` (Optional)
            - `encoding: string` (Optional, default: "utf8")
            - `recursive: boolean` (Optional, default: `true` for directories)
            - `fileTypes: list[string]` (Optional)
        - **Returns:** `object` - (Project Owner to specify exact return structure, e.g., `{ "path": string, "total_chunks": int }`)

    - **`set_profile`**
        - **Description:** Set the active profile for context generation (e.g., defining default include/exclude patterns).
        - **Parameters:**
            - `profile_name: string` (Required) - Name of the profile.
        - **Returns:** `object` - (Project Owner to specify, e.g., `{ "success": boolean, "active_profile": "string" }`)

    - **`get_profile_context`**
        - **Description:** Get repository context based on the currently active profile.
        - **Parameters:**
            - `refresh: boolean` (Optional, default: `false`) - If `true`, forces a refresh.
        - **Returns:** `object` - (Project Owner to specify structure based on profile definition)

    - **`generate_outline`**
        - **Description:** Generate a code outline (classes, functions, imports) for a TS/JS or Python file.
        - **Parameters:**
            - `path: string` (Required) - Path to the code file.
        - **Returns:** `object` - (Project Owner to specify structured outline, e.g., an AST-like JSON)

---

## 9. Git Ingest MCP Server (`gitingest`)
- **Identifier/Client Variable (Typical):** `gitIngestClient` (Go), `git_ingest_client` (Python)
- **Purpose:** Provides tools to retrieve summary information, directory structures, and specific file contents from GitHub repositories.

- **Key Exposed Tools:**

    - **`git_summary`**
        - **Description:** Get a summary of a specified GitHub repository. The summary includes the repository name, a list of files in the repository, the total number of tokens in the repository (if calculable by the server), and a summary extracted from the `README.md` file.
        - **Parameters:**
            - `owner: string` (Required) - The GitHub organization or username that owns the repository (e.g., "microsoft", "your-username").
            - `repo: string` (Required) - The name of the repository (e.g., "vscode", "ai-sdk-DM").
            - `branch: string` (Optional) - The specific branch name to summarize. If not provided (None), the server will likely use the repository's default branch.
        - **Returns:** `object` - An object containing the repository summary. (Project Owner to specify the exact structure, e.g.,
            ```json
            {
              "repository_name": "string",
              "full_name": "string (owner/repo)",
              "file_list": ["string"], // List of file paths
              "total_tokens": "int | string (e.g., 'approximate' or if not calculated)",
              "readme_summary": "string",
              "error": "string (if any)"
            }
            ```
          )

    - **`git_tree`**
        - **Description:** Get the tree structure (directory and file listing) of a specified GitHub repository for a given branch.
        - **Parameters:**
            - `owner: string` (Required) - The GitHub organization or username.
            - `repo: string` (Required) - The repository name.
            - `branch: string` (Optional) - The specific branch name. If not provided (None), uses the repository's default branch.
        - **Returns:** `object` or `list[object]` - A representation of the repository's file tree. This could be a nested object structure or a flat list of items with path and type. (Project Owner to specify the exact structure, e.g.,
            ```json
            // Example for a nested structure:
            // {
            //   "name": "root",
            //   "type": "tree",
            //   "children": [
            //     { "name": "src", "type": "tree", "children": [...] },
            //     { "name": "README.md", "type": "blob", "path": "README.md" }
            //   ]
            // }
            // Example for a flat list:
            // [
            //   { "path": "src/component.ts", "type": "blob", "size": 1024 },
            //   { "path": "docs/guide.md", "type": "blob", "size": 2048 }
            // ]
            ```
          )

    - **`git_files`**
        - **Description:** Get the content of one or more specific files from a GitHub repository for a given branch.
        - **Parameters:**
            - `owner: string` (Required) - The GitHub organization or username.
            - `repo: string` (Required) - The repository name.
            - `file_paths: list[string]` (Required) - A list of paths to the files within the repository whose content is to be retrieved (e.g., `["src/main.py", "docs/README.md"]`).
            - `branch: string` (Optional) - The specific branch name. If not provided (None), uses the repository's default branch.
        - **Returns:** `list[object]` or `map[string]string` - A structure containing the content of the requested files. (Project Owner to specify the exact structure, e.g.,
            ```json
            // Example for a list of objects:
            // [
            //   { "file_path": "src/main.py", "content": "string (file content)", "error": "string (if any for this file)" },
            //   { "file_path": "docs/README.md", "content": "string (file content)", "error": null }
            // ]
            // Example for a map:
            // {
            //   "src/main.py": "string (file content)",
            //   "docs/README.md": "string (file content)"
            //   // Errors might be handled differently, perhaps in a separate error field in a wrapper object
            // }
            ```
          )

---
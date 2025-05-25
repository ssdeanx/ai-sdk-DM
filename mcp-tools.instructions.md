---
description: "This document provides a comprehensive overview of the Model Context Protocol (MCP) tools and servers used in the ai-sdk-dm project."
mode: 'agent'
---

# Project MCP (Model Context Protocol) Tools & Servers Guide

> **Note on Branch Thinking & Planning Tools:**
>
> The `branch-thinking` and `branch-planning` tools are designed to work together:
> - Use `branch-thinking` to generate, evolve, and analyze thoughts, hypotheses, and reasoning about a problem or project. This is ideal for brainstorming, breaking down complex issues, and exploring alternative solutions.
> - Use `branch-planning` to extract actionable tasks from those thoughts, turning analysis into concrete project plans and next steps. This enables you to move seamlessly from high-level reasoning to implementation.
>
> **How to use them together:**
> 1. Start by capturing your ideas, questions, and analysis in `branch-thinking`—each thought is stored and can be revised or branched.
> 2. When ready to act, run `branch-planning` to automatically extract tasks from your thought branches, creating a structured plan.
> 3. This workflow supports iterative refinement: as you add or revise thoughts, you can re-extract and update your plan.
>
> **Data Storage:**
> - Both tools use a cache and database with a 1-day retention period for thoughts, branches, and plans. This means your work is available for a day, supporting short-term iterative workflows and collaboration, but is not intended for long-term archival.
>
> This enables a seamless transition from high-level reasoning to actionable implementation, supporting both agentic and human workflows.

This document outlines the Model Context Protocol (MCP) servers and associated tools/libraries used in this project, based on information provided by the project owner. GitHub Copilot should refer to this guide as the primary source of truth when generating code that interacts with these services.

## Guiding Principles for MCP Usage

- **Prioritize MCP:** For functionalities covered by our MCP servers, using the defined MCP tools is the preferred and mandatory method.
- **Adhere to Signatures:** Strictly follow the documented tool names, function signatures (parameters, types, required/optional status), and return value structures.
- **Error Handling (for MCP Calls):** When generating code that calls MCP tools, anticipate that these calls can fail (e.g., network issues, server errors, invalid parameters). The calling code MUST implement robust error handling for these MCP tool invocations (e.g., checking return objects for error fields, using try-catch blocks around client calls). The specifics of how errors are _logged_ by the calling application will follow general project logging standards.
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

## 2. Branch Thinking MCP Server (`branch-thinking`)

- **Identifier/Client Variable (Typical):** `branchThinkingClient` (Go), `branch_thinking_client` (Python)
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
  _(Assuming a primary tool named `process_thought_step` based on discussion - Project Owner to confirm/correct actual tool name(s) and precise return structure.)_
  - **`process_thought_step`** (Assumed primary tool name)
    - **Description:** Submits a single thought in an ongoing branch thinking process and receives guidance or results for the next step. This is the core interaction point for evolving the thought sequence.
    - **Parameters:**
      - `thought: string` (Required) - The current thinking step. This can be an analytical step, a revision, a question, a hypothesis, a verification step, or a realization.
      - `thought_number: int` (Required) - The current number in the sequence (1-indexed, can go beyond initial `total_thoughts`).
      - `total_thoughts: int` (Required) - The current _estimate_ of the total thoughts needed for the entire process. This can be adjusted by the AI in subsequent calls to this tool if the problem scope changes.
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

    - **Description:** **Use this instead of writing to existing files directly.** Allows modifying an existing file by presenting a diff of the proposed changes to the user and requiring their approval before applying. Only use this tool for modifications to _existing_ files within the active project. Do not use for creating new files. Assumes `open_project` has established the context.
    - **Parameters:**
      - `filePath: string` (Required) - The path to the existing file to be modified (relative to the active project root).
      - `newContent: string` (Required) - The proposed new full content for the file.
      - `description: string` (Optional) - A brief description of the changes being made.
    - **Returns:** `object` - e.g., `{ "success": boolean, "applied": boolean, "message": "string" }`
    - **Workflow Note:** After calling this, the AI should typically wait for user confirmation.

  - **`open_file`**

    - **Description:** Opens a specified file in the VS Code editor within the active project. Use by default _anytime a brand new file is created_ or _after `create_diff` is successfully applied_. Assumes `open_project` has established the context.
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

  - **`search-memories`** - **Description:** Search through stored memories. Called **ANYTIME** the user asks anything to retrieve relevant past information. - **Parameters:** - `query: string` (Required) - The search query (typically the user's current question/statement). - `userId: string` (Required) - User ID for memory storage (use 'mem0-mcp-user' if no specific ID is available). - `limit: int` (Optional, default: 5) - Maximum number of relevant memories. - `min_relevance_score: float` (Optional, default: 0.7) - Minimum relevance score. - `filters: object` (Optional) - Additional metadata filters. - **Returns:** `list[object]` - (Project Owner to specify structure of memory objects, e.g., `{ "memory_id": string, "content": string, "metadata": object, "timestamp": string, "relevance_score": float }`)
    _(Project Owner to confirm if other tools like `get_all_memories` or `delete_memory` are also part of this MCP server implementation and provide their schemas if so.)_

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

## 10. Desktop Commander MCP Server

- **Identifier/Client Variable (Typical):** `desktopCommanderClient` (Go), `desktop_commander_client` (Python)
- **Purpose:** Provides a comprehensive set of tools for interacting with the local file system, terminal, and VS Code environment. This includes reading/writing files, executing shell commands, managing directories, and more. All file/terminal operations for the agent should use these tools when possible.
- **Key Exposed Tools:**

  - **`get_config`**
    - **Description:** Get the complete server configuration as JSON. Includes fields for blocked commands, default shell, allowed directories, file read/write limits, and telemetry settings.
    - **Parameters:** None
    - **Returns:** `object` - Full config object.

  - **`set_config_value`**
    - **Description:** Set a specific configuration value by key. Should be used in a separate chat from file operations and command execution to prevent security issues.
    - **Parameters:**
      - `key: string` (Required)
      - `value: any` (Required)
    - **Returns:** `object` - Updated config object.

  - **`read_file`**
    - **Description:** Read the contents of a file from the file system or a URL with optional offset and length parameters. Prefer this over shell commands for viewing files. Supports partial file reading and image types.
    - **Parameters:**
      - `path: string` (Required)
      - `isUrl: boolean` (Optional)
      - `offset: int` (Optional)
      - `length: int` (Optional)
    - **Returns:** `object` - File content or image.

  - **`read_multiple_files`**
    - **Description:** Read the contents of multiple files simultaneously. Handles text and image files. Failed reads for individual files won't stop the entire operation.
    - **Parameters:**
      - `paths: string[]` (Required)
    - **Returns:** `object[]` - Array of file contents.

  - **`write_file`**
    - **Description:** Write or append to file contents with a configurable line limit per call (default: 50 lines). For large files, must be written in chunks. Only works within allowed directories.
    - **Parameters:**
      - `path: string` (Required)
      - `content: string` (Required)
      - `mode: 'rewrite' | 'append'` (Optional)
    - **Returns:** `object` - Write result.

  - **`create_directory`**
    - **Description:** Create a new directory or ensure a directory exists. Can create multiple nested directories in one operation.
    - **Parameters:**
      - `path: string` (Required)
    - **Returns:** `object` - Directory creation result.

  - **`list_directory`**
    - **Description:** Get a detailed listing of all files and directories in a specified path. Results distinguish between files and directories.
    - **Parameters:**
      - `path: string` (Required)
    - **Returns:** `object[]` - Directory listing.

  - **`move_file`**
    - **Description:** Move or rename files and directories. Can move files between directories and rename them in a single operation.
    - **Parameters:**
      - `source: string` (Required)
      - `destination: string` (Required)
    - **Returns:** `object` - Move result.

  - **`search_files`**
    - **Description:** Finds files by name using a case-insensitive substring matching. Searches through all subdirectories from the starting path.
    - **Parameters:**
      - `path: string` (Required)
      - `pattern: string` (Required)
      - `timeoutMs: int` (Optional)
    - **Returns:** `object[]` - Array of matching files.

  - **`search_code`**
    - **Description:** Search for text/code patterns within file contents using ripgrep. Fast and powerful search similar to VS Code search functionality.
    - **Parameters:**
      - `path: string` (Required)
      - `pattern: string` (Required)
      - `filePattern: string` (Optional)
      - `ignoreCase: boolean` (Optional)
      - `maxResults: int` (Optional)
      - `includeHidden: boolean` (Optional)
      - `contextLines: int` (Optional)
      - `timeoutMs: int` (Optional)
    - **Returns:** `object[]` - Array of code search results.

  - **`get_file_info`**
    - **Description:** Retrieve detailed metadata about a file or directory including size, creation time, last modified time, permissions, and type.
    - **Parameters:**
      - `path: string` (Required)
    - **Returns:** `object` - File/directory metadata.

  - **`edit_block`**
    - **Description:** Apply surgical text replacements to files. Make multiple small, focused edits rather than one large edit. Each call should change only what needs to be changed.
    - **Parameters:**
      - `file_path: string` (Required)
      - `old_string: string` (Required)
      - `new_string: string` (Required)
      - `expected_replacements: int` (Optional)
    - **Returns:** `object` - Edit result.

  - **`execute_command`**
    - **Description:** Execute a terminal command with timeout. Command will continue running in background if it doesn't complete within timeout.
    - **Parameters:**
      - `command: string` (Required)
      - `timeout_ms: int` (Optional)
      - `shell: string` (Optional)
    - **Returns:** `object` - Command execution result.

  - **`read_output`**
    - **Description:** Read new output from a running terminal session.
    - **Parameters:**
      - `pid: int` (Required)
    - **Returns:** `object` - Output result.

  - **`force_terminate`**
    - **Description:** Force terminate a running terminal session.
    - **Parameters:**
      - `pid: int` (Required)
    - **Returns:** `object` - Termination result.

  - **`list_sessions`**
    - **Description:** List all active terminal sessions.
    - **Parameters:** None
    - **Returns:** `object[]` - Array of session info.

  - **`list_processes`**
    - **Description:** List all running processes. Returns process information including PID, command name, CPU usage, and memory usage.
    - **Parameters:** None
    - **Returns:** `object[]` - Array of process info.

  - **`kill_process`**
    - **Description:** Terminate a running process by PID. Use with caution as this will forcefully terminate the specified process.
    - **Parameters:**
      - `pid: int` (Required)
    - **Returns:** `object` - Kill result.

---

## 11. Cloudflare Workers Bindings MCP Server (`cloudflare-bindings`)

- **Identifier/Client Variable (Typical):** `cloudflareBindingsClient` (Go), `cloudflare_bindings_client` (Python)
- **Purpose:** Provides comprehensive MCP interface for managing Cloudflare Workers Platform resources, including accounts, KV namespaces, R2 buckets, D1 databases, Workers, and Hyperdrive configurations. Features built-in Cloudflare OAuth for secure access.
- **Key Exposed Tools:**

  **Account Management:**
  - **`accounts_list`**
    - **Description:** List all accounts in your Cloudflare account.
    - **Parameters:** None
    - **Returns:** `list[object]` - Array of account objects with id, name, and other metadata.
  
  - **`set_active_account`**
    - **Description:** Set active account to be used for tool calls that require accountId.
    - **Parameters:**
      - `accountId: string` (Required) - The Cloudflare account ID to set as active.
    - **Returns:** `object` - Confirmation of active account setting.

  **KV Namespaces:**
  - **`kv_namespaces_list`**
    - **Description:** List all KV namespaces in your Cloudflare account.
    - **Parameters:** None (uses active account)
    - **Returns:** `list[object]` - Array of KV namespace objects.
  
  - **`kv_namespace_create`**
    - **Description:** Create a new KV namespace in your Cloudflare account.
    - **Parameters:**
      - `title: string` (Required) - The title/name for the new KV namespace.
    - **Returns:** `object` - Created KV namespace details including id and title.
  
  - **`kv_namespace_delete`**
    - **Description:** Delete a KV namespace in your Cloudflare account.
    - **Parameters:**
      - `namespaceId: string` (Required) - The ID of the KV namespace to delete.
    - **Returns:** `object` - Deletion confirmation.
  
  - **`kv_namespace_get`**
    - **Description:** Get details of a KV namespace in your Cloudflare account.
    - **Parameters:**
      - `namespaceId: string` (Required) - The ID of the KV namespace to retrieve.
    - **Returns:** `object` - KV namespace details.
  
  - **`kv_namespace_update`**
    - **Description:** Update the title of a KV namespace in your Cloudflare account.
    - **Parameters:**
      - `namespaceId: string` (Required) - The ID of the KV namespace to update.
      - `title: string` (Required) - The new title for the KV namespace.
    - **Returns:** `object` - Updated KV namespace details.

  **Workers:**
  - **`workers_list`**
    - **Description:** List all Workers in your Cloudflare account.
    - **Parameters:** None (uses active account)
    - **Returns:** `list[object]` - Array of Worker objects with script names and metadata.
  
  - **`workers_get_worker`**
    - **Description:** Get the details of a Cloudflare Worker.
    - **Parameters:**
      - `scriptName: string` (Required) - The name of the Worker script.
    - **Returns:** `object` - Worker details including metadata and configuration.
  
  - **`workers_get_worker_code`**
    - **Description:** Get the source code of a Cloudflare Worker.
    - **Parameters:**
      - `scriptName: string` (Required) - The name of the Worker script.
    - **Returns:** `object` - Worker source code and related files.

  **R2 Buckets:**
  - **`r2_buckets_list`**
    - **Description:** List R2 buckets in your Cloudflare account.
    - **Parameters:** None (uses active account)
    - **Returns:** `list[object]` - Array of R2 bucket objects.
  
  - **`r2_bucket_create`**
    - **Description:** Create a new R2 bucket in your Cloudflare account.
    - **Parameters:**
      - `name: string` (Required) - The name for the new R2 bucket.
      - `locationHint: string` (Optional) - Location hint for bucket placement.
    - **Returns:** `object` - Created R2 bucket details.
  
  - **`r2_bucket_get`**
    - **Description:** Get details about a specific R2 bucket.
    - **Parameters:**
      - `bucketName: string` (Required) - The name of the R2 bucket.
    - **Returns:** `object` - R2 bucket details and metadata.
  
  - **`r2_bucket_delete`**
    - **Description:** Delete an R2 bucket.
    - **Parameters:**
      - `bucketName: string` (Required) - The name of the R2 bucket to delete.
    - **Returns:** `object` - Deletion confirmation.

  **D1 Databases:**
  - **`d1_databases_list`**
    - **Description:** List all D1 databases in your Cloudflare account.
    - **Parameters:** None (uses active account)
    - **Returns:** `list[object]` - Array of D1 database objects.
  
  - **`d1_database_create`**
    - **Description:** Create a new D1 database in your Cloudflare account.
    - **Parameters:**
      - `name: string` (Required) - The name for the new D1 database.
      - `locationHint: string` (Optional) - Location hint for database placement.
    - **Returns:** `object` - Created D1 database details including database_id.
  
  - **`d1_database_delete`**
    - **Description:** Delete a D1 database in your Cloudflare account.
    - **Parameters:**
      - `databaseId: string` (Required) - The ID of the D1 database to delete.
    - **Returns:** `object` - Deletion confirmation.
  
  - **`d1_database_get`**
    - **Description:** Get a D1 database in your Cloudflare account.
    - **Parameters:**
      - `databaseId: string` (Required) - The ID of the D1 database to retrieve.
    - **Returns:** `object` - D1 database details and metadata.
  
  - **`d1_database_query`**
    - **Description:** Query a D1 database in your Cloudflare account.
    - **Parameters:**
      - `databaseId: string` (Required) - The ID of the D1 database to query.
      - `sql: string` (Required) - The SQL query to execute.
      - `params: list` (Optional) - Parameters for prepared statements.
    - **Returns:** `object` - Query results including rows, metadata, and execution details.

  **Hyperdrive:**
  - **`hyperdrive_configs_list`**
    - **Description:** List Hyperdrive configurations in your Cloudflare account.
    - **Parameters:** None (uses active account)
    - **Returns:** `list[object]` - Array of Hyperdrive configuration objects.
  
  - **`hyperdrive_config_create`**
    - **Description:** Create a new Hyperdrive configuration in your Cloudflare account.
    - **Parameters:**
      - `name: string` (Required) - The name for the new Hyperdrive configuration.
      - `origin: object` (Required) - Origin database configuration including host, port, database, user.
      - `caching: object` (Optional) - Caching configuration settings.
    - **Returns:** `object` - Created Hyperdrive configuration details.
  
  - **`hyperdrive_config_delete`**
    - **Description:** Delete a Hyperdrive configuration in your Cloudflare account.
    - **Parameters:**
      - `hyperdriveId: string` (Required) - The ID of the Hyperdrive configuration to delete.
    - **Returns:** `object` - Deletion confirmation.
  
  - **`hyperdrive_config_get`**
    - **Description:** Get details of a specific Hyperdrive configuration in your Cloudflare account.
    - **Parameters:**
      - `hyperdriveId: string` (Required) - The ID of the Hyperdrive configuration to retrieve.
    - **Returns:** `object` - Hyperdrive configuration details including origin and caching settings.
  
  - **`hyperdrive_config_edit`**
    - **Description:** Edit (patch) a Hyperdrive configuration in your Cloudflare account.
    - **Parameters:**
      - `hyperdriveId: string` (Required) - The ID of the Hyperdrive configuration to edit.
      - `name: string` (Optional) - New name for the configuration.
      - `origin: object` (Optional) - Updated origin database configuration.
      - `caching: object` (Optional) - Updated caching configuration.
    - **Returns:** `object` - Updated Hyperdrive configuration details.

---

## 12. Cloudflare Documentation MCP Server (`cloudflare`)

- **Identifier/Client Variable (Typical):** `cloudflareDocsClient` (Go), `cloudflare_docs_client` (Python)
- **Purpose:** Provides MCP interface to search Cloudflare documentation using Vectorize DB. The documentation is pre-indexed and available for semantic search queries.
- **Key Exposed Tools:**

  - **`search_cloudflare_documentation`**
    - **Description:** Search the Cloudflare documentation using semantic search via Vectorize DB.
    - **Parameters:**
      - `query: string` (Required) - The search query for finding relevant documentation.
      - `limit: int` (Optional, default: 5) - Maximum number of documentation results to return.
      - `similarity_threshold: float` (Optional, default: 0.7) - Minimum similarity score for results.
    - **Returns:** `list[object]` - Array of documentation search results with content, metadata, and relevance scores.

---

## 13. Cloudflare Workers Builds MCP Server (`cloudflare-builds`)

- **Identifier/Client Variable (Typical):** `cloudflareBuildsClient` (Go), `cloudflare_builds_client` (Python)
- **Purpose:** Provides MCP interface for managing and monitoring Cloudflare Workers builds, including build history, logs, and deployment tracking.
- **Key Exposed Tools:**

  - **`workers_builds_set_active_worker`**
    - **Description:** Sets the active Worker ID for subsequent calls.
    - **Parameters:**
      - `workerId: string` (Required) - The Worker ID to set as active for build operations.
    - **Returns:** `object` - Confirmation of active Worker setting.
  
  - **`workers_builds_list_builds`**
    - **Description:** Lists builds for a Cloudflare Worker.
    - **Parameters:**
      - `workerId: string` (Optional) - Worker ID (uses active worker if not provided).
      - `limit: int` (Optional, default: 10) - Maximum number of builds to return.
      - `offset: int` (Optional, default: 0) - Offset for pagination.
    - **Returns:** `list[object]` - Array of build objects with timestamps, status, and metadata.
  
  - **`workers_builds_get_build`**
    - **Description:** Retrieves details for a specific build by its UUID, including build and deploy commands.
    - **Parameters:**
      - `buildId: string` (Required) - The UUID of the build to retrieve.
    - **Returns:** `object` - Detailed build information including commands, status, timestamps, and configuration.
  
  - **`workers_builds_get_build_logs`**
    - **Description:** Fetches the logs for a Cloudflare Workers build by its UUID.
    - **Parameters:**
      - `buildId: string` (Required) - The UUID of the build to get logs for.
      - `logType: string` (Optional) - Type of logs to retrieve ('build', 'deploy', 'all').
    - **Returns:** `object` - Build logs with timestamps, log levels, and detailed output.

---

# Appendix: Desktop Commander (Winterm) Tool Summary & Usage Reference

```bash
Available Tools
Category	Tool	Description
Configuration	get_config	Get the complete server configuration as JSON (includes blockedCommands, defaultShell, allowedDirectories, fileReadLineLimit, fileWriteLineLimit, telemetryEnabled)
set_config_value	Set a specific configuration value by key. Available settings:
• blockedCommands: Array of shell commands that cannot be executed
• defaultShell: Shell to use for commands (e.g., bash, zsh, powershell)
• allowedDirectories: Array of filesystem paths the server can access for file operations (⚠️ terminal commands can still access files outside these directories)
• fileReadLineLimit: Maximum lines to read at once (default: 1000)
• fileWriteLineLimit: Maximum lines to write at once (default: 50)
• telemetryEnabled: Enable/disable telemetry (boolean)
Terminal	execute_command	Execute a terminal command with configurable timeout and shell selection
read_output	Read new output from a running terminal session
force_terminate	Force terminate a running terminal session
list_sessions	List all active terminal sessions
list_processes	List all running processes with detailed information
kill_process	Terminate a running process by PID
Filesystem	read_file	Read contents from local filesystem or URLs with line-based pagination (supports offset and length parameters)
read_multiple_files	Read multiple files simultaneously
write_file	Write file contents with options for rewrite or append mode (uses configurable line limits)
create_directory	Create a new directory or ensure it exists
list_directory	Get a detailed listing of files and directories
move_file	Move or rename files and directories
search_files	Find files by name using case-insensitive substring matching
search_code	Search for text/code patterns within file contents using ripgrep
get_file_info	Retrieve detailed metadata about a file or directory
Text Editing	edit_block	Apply targeted text replacements with enhanced prompting for smaller edits (includes character-level diff feedback)
```

## Tool Usage Examples

**Search/Replace Block Format:**

filepath.ext
<<<<<<< SEARCH
content to find
=======
new content
>>>>>>> REPLACE

**Example:**

src/main.js
<<<<<<< SEARCH
console.log("old message");
=======
console.log("new message");
>>>>>>> REPLACE

## Enhanced Edit Block Features

The edit_block tool includes several enhancements for better reliability:

- **Improved Prompting:** Tool descriptions now emphasize making multiple small, focused edits rather than one large change
- **Fuzzy Search Fallback:** When exact matches fail, it performs fuzzy search and provides detailed feedback
- **Character-level Diffs:** Shows exactly what's different using {-removed-}{+added+} format
- **Multiple Occurrence Support:** Can replace multiple instances with expected_replacements parameter
- **Comprehensive Logging:** All fuzzy searches are logged for analysis and debugging

When a search fails, you'll see detailed information about the closest match found, including similarity percentage, execution time, and character differences. All these details are automatically logged for later analysis using the fuzzy search log tools.

## URL Support

- `read_file` can now fetch content from both local files and URLs
- Example: `read_file` with `isUrl: true` parameter to read from web resources
- Handles both text and image content from remote sources
- Images (local or from URLs) are displayed visually in Claude's interface, not as text
- Claude can see and analyze the actual image content
- Default 30-second timeout for URL requests

## Fuzzy Search Log Analysis (npm scripts)

The fuzzy search logging system includes convenient npm scripts for analyzing logs outside of the MCP environment:

```bash
# View recent fuzzy search logs
npm run logs:view -- --count 20

# Analyze patterns and performance
npm run logs:analyze -- --threshold 0.8

# Export logs to CSV or JSON
npm run logs:export -- --format json --output analysis.json

# Clear all logs (with confirmation)
npm run logs:clear
```
For detailed documentation on these scripts, see `scripts/README.md`.

## Fuzzy Search Logs

Desktop Commander includes comprehensive logging for fuzzy search operations in the edit_block tool. When an exact match isn't found, the system performs a fuzzy search and logs detailed information for analysis.

### What Gets Logged
Every fuzzy search operation logs:
- Search and found text: The text you're looking for vs. what was found
- Similarity score: How close the match is (0-100%)
- Execution time: How long the search took
- Character differences: Detailed diff showing exactly what's different
- File metadata: Extension, search/found text lengths
- Character codes: Specific character codes causing differences

### Log Location
Logs are automatically saved to:
- macOS/Linux: `~/.claude-server-commander-logs/fuzzy-search.log`
- Windows: `%USERPROFILE%\.claude-server-commander-logs\fuzzy-search.log`

### What You'll Learn
The fuzzy search logs help you understand:
- Why exact matches fail: Common issues like whitespace differences, line endings, or character encoding
- Performance patterns: How search complexity affects execution time
- File type issues: Which file extensions commonly have matching problems
- Character encoding problems: Specific character codes that cause diffs

---

# Audit Logging & Configuration Management for Desktop Commander

```bash
Audit Logging
Desktop Commander now includes comprehensive logging for all tool calls:

What Gets Logged
Every tool call is logged with timestamp, tool name, and arguments (sanitized for privacy)
Logs are rotated automatically when they reach 10MB in size
Log Location
Logs are saved to:

macOS/Linux: ~/.claude-server-commander/claude_tool_call.log
Windows: %USERPROFILE%\.claude-server-commander\claude_tool_call.log
This audit trail helps with debugging, security monitoring, and understanding how Claude is interacting with your system.

Handling Long-Running Commands
For commands that may take a while:

Configuration Management
⚠️ Important Security Warnings
Always change configuration in a separate chat window from where you're doing your actual work. Claude may sometimes attempt to modify configuration settings (like allowedDirectories) if it encounters filesystem access restrictions.

The allowedDirectories setting currently only restricts filesystem operations, not terminal commands. Terminal commands can still access files outside allowed directories. Full terminal sandboxing is on the roadmap.

Configuration Tools
You can manage server configuration using the provided tools:

// Get the entire config
get_config({})

// Set a specific config value
set_config_value({ "key": "defaultShell", "value": "/bin/zsh" })

// Set multiple config values using separate calls
set_config_value({ "key": "defaultShell", "value": "/bin/bash" })
set_config_value({ "key": "allowedDirectories", "value": ["/Users/username/projects"] })
The configuration is saved to config.json in the server's working directory and persists between server restarts.

Best Practices
Create a dedicated chat for configuration changes: Make all your config changes in one chat, then start a new chat for your actual work.

Be careful with empty allowedDirectories: Setting this to an empty array ([]) grants access to your entire filesystem for file operations.

Use specific paths: Instead of using broad paths like /, specify exact directories you want to access.

Always verify configuration after changes: Use get_config({}) to confirm your changes were applied correctly.

Using Different Shells
You can specify which shell to use for command execution:

// Using default shell (bash or system default)
execute_command({ "command": "echo $SHELL" })

// Using zsh specifically
execute_command({ "command": "echo $SHELL", "shell": "/bin/zsh" })

// Using bash specifically
execute_command({ "command": "echo $SHELL", "shell": "/bin/bash" })
This allows you to use shell-specific features or maintain consistent environments across commands.

execute_command returns after timeout with initial output
Command continues in background
Use read_output with PID to get new output
Use force_terminate to stop if needed
```

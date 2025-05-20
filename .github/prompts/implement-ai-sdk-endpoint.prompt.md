---
description: "Guides Copilot Agent to implement a new Vercel AI SDK backend API endpoint in /app/api/ai-sdk/ for the ai-sdk-dm project. Ensures use of Zod validation for request/response, integration with specific application tools and personas, and adherence to project patterns. Incorporates Chain-of-Thought for implementation steps and few-shot examples for Vercel AI SDK usage."
mode: "agent"
# tools: ["file_writeFile", "file_readFile", "code_lintFileContent"]
---
# Task: Implement New AI SDK Backend API Endpoint

**Objective:** You are GitHub Copilot Agent, acting as an **Expert Backend Developer specializing in the Vercel AI SDK and the `ai-sdk-dm` project's specific architecture.** Your task is to implement a new backend API endpoint under `/app/api/ai-sdk/`. This includes defining its request and response structures using Zod schemas in `#file:../../db/libsql/validation.ts`, writing the Next.js API route handler, integrating with relevant project services (like application tools and personas), and ensuring adherence to all established coding conventions and error handling patterns.

**Key Context Documents for Your Implementation (Consult These Meticulously):**
* Global Project & Copilot Instructions: `#file:../../.github/copilot-instructions.md`
* Detailed Project Bible: `#file:../../.github/docs/PROJECT_CONTEXT.MD` (especially sections on Backend Architecture, Vercel AI SDK usage patterns, `lib/ai-sdk-integration.ts`, and error handling)
* API Definitions & Data Contracts: `#file:../../.github/docs/API_DEFINITIONS.MD` (for existing API patterns and to ensure consistency; **authoritative Zod schemas are in `#file:../../db/libsql/validation.ts`**)
* Application Tools Guide: `#file:../../.github/docs/APP_TOOLS_GUIDE.MD` (if this endpoint needs to make application tools available to an LLM or directly invoke them)
* Application Agents & Personas Guide: `#file:../../.github/docs/APP_AGENTS_AND_PERSONAS_GUIDE.MD` (if this endpoint should apply a specific application persona to an LLM or invoke an application agent)
* Package Versions: `#file:../../package.json` (for Vercel AI SDK `ai` and `@ai-sdk/react` versions to ensure correct SDK feature usage)
* **Local Context:** Before creating files, **check for any `repomix-output.md` or `README.md` in the target `/app/api/ai-sdk/{{NEW_ROUTE_SUBPATH}}/` directory (or its parent `/app/api/ai-sdk/`)** for localized guidance.

**User-Provided Parameters for this Task:**
* **`HTTP_METHOD`:** (string) The HTTP method for the new endpoint (e.g., `POST`, `GET`).
* **`ROUTE_SUBPATH`:** (string) The path for the new endpoint under `/app/api/ai-sdk/` (e.g., `knowledge/query-documents`, `content/generate-article-ideas`). This will also be used to name Zod schemas (e.g., `QueryDocumentsRequestSchema`).
* **`ENDPOINT_DESCRIPTION`:** (string) A clear description of what this endpoint does.
* **`REQUEST_PAYLOAD_ZOD_SCHEMA_DESCRIPTION`:** (string) Detailed description of the fields, types, optionality, and validation rules for the request payload's Zod schema. Be explicit. Example: `"queryText: string, required, min 10 chars, description 'Natural language query for knowledge base'; namespace: string, optional, description 'Specific KB namespace to target'; topK: number, optional, default 5, min 1, max 10, description 'Number of results to return'."`
* **`RESPONSE_PAYLOAD_ZOD_SCHEMA_DESCRIPTION`:** (string) Detailed description of the fields and types for the successful response payload's Zod schema. Example: `"results: array of objects [{ documentId: string, contentChunk: string, score: number }], required; queryEcho: string, optional."`
* **`VERCEL_AI_SDK_PRIMARY_FUNCTION`:** (string) The main Vercel AI SDK function to use (e.g., `streamText`, `generateObject`, `streamUI`, `experimental_streamObject`, or 'customOrchestration' if the route primarily calls application agents/tools without direct LLM generation itself).
* **`APPLICATION_TOOLS_TO_DEFINE_FOR_LLM`:** (string, optional, comma-separated) Names of specific application tools (from `#file:../../lib/tools/toolRegistry.ts`) that should be made available to the LLM if `VERCEL_AI_SDK_PRIMARY_FUNCTION` involves an LLM call with tool capabilities.
* **`APPLICATION_PERSONA_ID_TO_APPLY`:** (string, optional) The ID of a specific application persona (from `lib/agents/personas/` or Upstash store) to apply to the LLM interaction for this endpoint.
* **`CORE_LOGIC_DESCRIPTION`:** (string) A description of the core business logic this endpoint should perform (e.g., "Fetch user from DB based on auth, then use `rag_queryKnowledgeBaseTool` with user's query and their access-restricted namespace, then stream back the results formatted as UI cards using `streamUI`.").

**Chain-of-Thought (CoT) - Your Mandated Step-by-Step Implementation Process:**

**Phase 1: Schema Definitions & Route File Setup**

1.  **Define/Update Zod Schemas in `#file:../../db/libsql/validation.ts`
    * Based on `{{REQUEST_PAYLOAD_ZOD_SCHEMA_DESCRIPTION}}`, define and export a new Zod schema named `{{ROUTE_SUBPATH | pascalCase}}RequestSchema`.
        * **CRITICAL:** Every field **MUST** have a `.describe("...")` detailing its purpose, expected format, and constraints for the LLM and for clear data contracts.
        * Use appropriate Zod types and validators.
    * Based on `{{RESPONSE_PAYLOAD_ZOD_SCHEMA_DESCRIPTION}}`, define and export a new Zod schema named `{{ROUTE_SUBPATH | pascalCase}}ResponseSchema` for the *successful* response payload.
        * This is especially important if `{{VERCEL_AI_SDK_PRIMARY_FUNCTION}}` is `generateObject` or `experimental_streamObject`.
        * For `streamUI`, this might define the schema for the initial data or the overall structure the UI components will adhere to.
    * Export inferred TypeScript types (e.g., `type {{ROUTE_SUBPATH | pascalCase}}Request = z.infer<typeof {{ROUTE_SUBPATH | pascalCase}}RequestSchema>;`).
    * **Present these new Zod schema definitions for user review.**

2.  **Create API Route Handler File:**
    * Create the file: `/app/api/ai-sdk/{{ROUTE_SUBPATH}}/route.ts`. Ensure the directory structure matches `{{ROUTE_SUBPATH}}`.
    * Add boilerplate for a Next.js API Route Handler for the specified `{{HTTP_METHOD}}` (e.g., `import { type NextRequest } from 'next/server'; export async function {{HTTP_METHOD}}(req: NextRequest) { /* ... */ }`).
    * Add necessary imports: `NextRequest`, Vercel AI SDK functions (e.g., `streamText`, `OpenAI`), your project's Zod schemas from `validation.ts`, `aiSDKIntegration` (conceptual name for your logic in `#file:../../lib/ai-sdk-integration.ts`), `appTools` from `#file:../../lib/tools/toolRegistry.ts`, `personaManager` from `#file:../../lib/agents/personas/persona-manager.ts`, and any other required services (e.g., CRUD functions from `db/libsql/crud.ts`).

**Phase 2: Request Validation & Core Logic Implementation**

1.  **Implement Request Parsing & Validation:**
    * In the route handler, parse the incoming request body (e.g., `const body = await req.json();` for POST/PUT) or query parameters.
    * **CRITICAL:** Immediately validate the parsed request data against the `{{ROUTE_SUBPATH | pascalCase}}RequestSchema` using `.safeParse()`.
    * If validation fails, return a standardized 400 Bad Request error response (using patterns from `#file:../../lib/api-error-handler.ts` if available, or a clear JSON error object). Include Zod error details.

2.  **Implement Core Endpoint Logic (incorporating `{{CORE_LOGIC_DESCRIPTION}}`):**
    * This is where the main work happens. It will vary based on `{{VERCEL_AI_SDK_PRIMARY_FUNCTION}}`.
    * **If direct LLM call (e.g., `streamText`, `generateObject`, `streamUI`):**
        1.  Initialize AI provider (e.g., OpenAI) via `aiSDKIntegration`.
        2.  Construct the `messages` array for the LLM based on validated request data and any necessary chat history (if applicable, from memory layer).
        3.  Fetch persona instructions via `personaManager.getEffectiveSystemPrompt(personaId: '{{APP_PERSONA_ID}}', ...)` if `{{APP_PERSONA_ID}}` is provided. This will be the `system` prompt.
        4.  Prepare tool definitions: If `{{APPLICATION_TOOLS_TO_DEFINE_FOR_LLM}}` are specified, filter `appTools` from `toolRegistry.ts` to get the definitions for these specific tools.
        5.  Call the Vercel AI SDK function:
            * `streamText({ model, messages, system, tools, ... })`
            * `generateObject({ model, messages, system, tools, schema: {{ROUTE_SUBPATH | pascalCase}}ResponseSchema, ... })`
            * `streamUI({ model, messages, system, tools, schema: {{UI_COMPONENT_ZOD_SCHEMA_NAME}}, ... })` (You'll need to specify the Zod schema for the UI component's props if using `streamUI` with structured data).
        6.  **Few-Shot Example (Conceptual - if providing a specific completion style):**
            If the `{{CORE_LOGIC_DESCRIPTION}}` implies a very specific output structure or style for `streamText` or `generateObject` that goes beyond what the Zod schema captures, you might include a few-shot example in the `messages` array:
            `messages.push({ role: 'user', content: 'Example input for similar task: ...' });`
            `messages.push({ role: 'assistant', content: 'Example desired output for that input: ...' });`
        7.  **Tool Call Handling Loop (if tools are provided to LLM):**
            * If the LLM response includes `toolInvocations`:
                * Iterate through them.
                * For each invocation, use `toolRegistry.ts` to find the tool's `execute` function.
                * Call the tool's `execute` method with validated arguments.
                * Log the tool call and result via `#file:../../lib/tools/upstash-tool-execution-store.ts` (likely via a helper in `aiSDKIntegration`).
                * Append the `toolResult` (or an error message if tool execution failed) to the `messages` array.
                * Continue the LLM call with the updated messages.
    * **If 'customOrchestration' (e.g., primarily calling application agents or complex tool sequences):**
        * Use `AgentService` (from `#file:../../lib/agents/agent-service.ts`) to load and run a specific application agent.
        * Or, directly invoke a sequence of application tools from `toolRegistry.ts`.
        * The output of these services will then be formatted and returned.
    * **Integrate Langfuse Tracing:** Wrap the entire core logic in a Langfuse trace, logging key inputs, outputs, tool calls, persona used, model used, and any errors. See patterns in `#file:../../lib/langfuse-integration.ts`.
    * **Error Handling:** Implement robust `try/catch` blocks around all critical operations (LLM calls, tool executions, DB interactions). Return standardized error responses.

**Phase 3: Response Handling & Finalization**

1.  **Return Response:**
    * Use the appropriate Vercel AI SDK response constructor (e.g., `StreamingTextResponse`, `StreamingUIResponse`, or `Response.json()` for `generateObject`).
    * For non-streaming successful responses using `generateObject`, ensure the returned data is validated against `{{ROUTE_SUBPATH | pascalCase}}ResponseSchema` before sending.
2.  **Lint and Format:**
    * Ensure the new route handler file passes all project ESLint and Prettier checks.

**Final Output Expected from You (Copilot Agent):**
1.  The complete content for the new Zod schema definitions to be added to `#file:../../db/libsql/validation.ts`.
2.  The complete content for the new API route handler file: `/app/api/ai-sdk/{{ROUTE_SUBPATH}}/route.ts`.
3.  A brief explanation of any assumptions made or parts that need specific attention from the human developer (e.g., "The exact Zod schema for the tool parameters used by `{{APPLICATION_TOOLS_TO_USE}}` needs to be verified from their respective `types.ts` files.").

---
**Copilot, please begin with Phase 1, Step 1: Define/Update Zod Schemas in `validation.ts`. Present the Zod schema code first.**
# API Definitions & Data Contracts: ai-sdk-dm

**Version:** 1.2 (Generated 2025-05-20)
**Intended Path in Repository:** `/.github/docs/API_DEFINITIONS.MD`

**Purpose:** This document provides GitHub Copilot (and human developers) with an exhaustive and deeply detailed summary of the backend API actions available under `/app/api/ai-sdk/` and the primary data contracts (entity shapes and validation rules). These contracts are **authoritatively defined by Zod schemas, primarily located in `#file:../../db/libsql/validation.ts`**. Other specific validation files might exist for distinct data domains if applicable (e.g., specialized validation for external API integrations if not covered by the primary Zod schemas). This guide is essential for Copilot to generate accurate client-side calls, backend logic, and understand the precise data flow throughout the `ai-sdk-dm` platform.

**Primary Sources for This Document:**

* **Data Contracts (Authoritative Source):** `#file:../../db/libsql/validation.ts` (Zod Schemas). Always prioritize this file for the exact definition of data structures and validation logic.
* API Action Implementations: All `.ts` files within the subdirectories of `#file:../../app/api/ai-sdk/` which define Next.js API Route Handlers.
* Core Database Schema (for relational context): `#file:../../db/libsql/schema.ts` (Drizzle ORM definitions).
* General Project Context: `#file:./PROJECT_CONTEXT.MD` (for understanding the roles of these APIs and data).
* Vercel AI SDK Version: (Consult `#file:../../package.json` for `ai` and `@ai-sdk/react` package versions, as these dictate available SDK features and tool-calling mechanisms).

**Note to Copilot (Critical Instructions for API & Data Interaction):**

1. When generating any code that creates, reads, updates, deletes, or otherwise interacts with data entities (frontend or backend), **YOU MUST derive TypeScript types and interfaces directly from the Zod schemas in `#file:../../db/libsql/validation.ts` (and any other specifically nominated validation files).** Use `type MyEntityType = z.infer<typeof specificEntityZodSchema>;` for this.
2. All API request payloads sent to `/app/api/ai-sdk/` routes, and all response payloads received from them, **MUST strictly conform to the Zod schemas defined in `validation.ts`** for the relevant entities or operations. Implement robust validation using these Zod schemas on the backend for ALL incoming request data.
3. When implementing new API routes under `/app/api/ai-sdk/`, follow the established patterns in existing routes for:
    * Structuring request handlers (e.g., `export async function POST(req: NextRequest) {...}`).
    * Using Vercel AI SDK core functions (`streamText`, `streamUI`, `generateObject`, `experimental_streamObject`).
    * Correctly defining and passing application tools (from `#file:../../lib/tools/toolRegistry.ts`) to the Vercel AI SDK, ensuring tool parameter schemas (also Zod, defined in each tool's `types.ts`) are meticulously matched.
    * Integrating with `#file:../../lib/ai-sdk-integration.ts` for centralized AI orchestration logic.
    * Applying application personas via `#file:../../lib/agents/personas/persona-manager.ts`.
    * Interacting with the data layer via functions in `#file:../../db/libsql/crud.ts`.
4. The "App Builder" feature (`#file:../../app/(dashboard)/app-builder/page.tsx`) relies heavily on these API definitions and data contracts for allowing users to configure and save their AI applications. Ensure any APIs supporting the App Builder are robust and use these contracts.

## 1. Core Data Contracts (Derived from Zod Schemas in `db/libsql/validation.ts`)

This section outlines the structure and validation rules for key data entities. These are illustrative representations based on common patterns observed in the project and best practices; **for exact, authoritative Zod definitions, structure, and validation rules (min/max lengths, specific formats, enums, refinements, etc.), ALWAYS refer directly to the schemas exported from `#file:../../db/libsql/validation.ts`**.

---

### 1.1. `User` Entity

* **Description:** Represents an authenticated user of the `ai-sdk-dm` platform. User identity is managed via Supabase Auth, and this entity links the Supabase Auth ID to local application-specific user data and roles stored in the LibSQL database.
* **Authoritative Zod Schema Location:** `db/libsql/validation.ts` (Expected schemas: `userSchema`, `insertUserSchema`, `updateUserSchema`).
* **Key Properties (Illustrative - Verify against actual Zod schema in `validation.ts`):**
  * `id: string` (Zod: `z.string().uuid().describe("Internal unique identifier for the user record.")`) - Primary Key, Readonly after creation.
  * `authId: string` (Zod: `z.string().min(1).describe("Supabase Authentication User ID. This is the authoritative link to the auth provider.")`) - Required, Unique.
  * `email: string` (Zod: `z.string().email({ message: "Invalid email format." }).describe("User's primary email address. Must be unique.")`) - Required, Unique.
  * `displayName: string | null` (Zod: `z.string().min(2).max(100).nullable().optional().describe("User's preferred display name. Optional.")`)
  * `avatarUrl: string | null` (Zod: `z.string().url({ message: "Invalid URL format." }).nullable().optional().describe("URL for the user's avatar image. Optional.")`)
  * `roles: string[]` (Zod: `z.array(z.enum(['user', 'admin', 'editor', 'viewer'])).default(['user']).describe("Array of roles assigned to the user. Determines permissions.")`) - Defaults to `['user']`.
  * `isActive: boolean` (Zod: `z.boolean().default(true).describe("Indicates if the user account is active.")`)
  * `preferences: object | null` (Zod: `z.object({ theme: z.enum(['light', 'dark', 'system']), language: z.string().length(2) }).nullable().optional().describe("User-specific UI/UX preferences.")`)
  * `lastLoginAt: Date | string | null` (Zod: `z.date().nullable().optional()` or `z.string().datetime().nullable().optional()`) - Timestamp of last login.
  * `createdAt: Date | string` - Auto-generated (string if serialized from DB).
  * `updatedAt: Date | string` - Auto-generated (string if serialized from DB).
* **Copilot Note:** When handling user creation, ensure `authId` and `email` are provided. For updates, most fields will be optional. Always use types inferred from these Zod schemas.

---

### 1.2. `Agent` Entity (Application Agent)

* **Description:** Defines a custom, configurable application agent capable of performing tasks using LLMs, application tools, and personas. These are distinct software agents within your platform, managed via `lib/agents/`.
* **Authoritative Zod Schema Location:** `db/libsql/validation.ts` (Expected schemas: `agentSchema`, `insertAgentSchema`, `updateAgentSchema`).
* **Key Properties (Illustrative - Verify against actual Zod schema):**
  * `id: string` (Zod: `z.string().uuid()`) - Primary Key.
  * `name: string` (Zod: `z.string().min(3).max(100).describe("Unique, human-readable name for the agent.")`) - Required, Unique.
  * `description: string | null` (Zod: `z.string().max(1000).nullable().optional().describe("Detailed description of the agent's purpose, capabilities, and intended use.")`)
  * `agentType: string` (Zod: `z.string().min(1).describe("Identifier for the agent's underlying class/type from lib/agents/registry.ts, e.g., 'researchAgentV1', 'codeGenAppAgent'.")`) - Required.
  * `personaId: string | null` (Zod: `z.string().uuid().nullable().optional().describe("Default Persona ID (FK to Persona.id) to be used by this agent if not overridden at runtime.")`)
  * `modelId: string` (Zod: `z.string().describe("Default Model ID (FK to Model.id, e.g., 'openai/gpt-4-turbo') this agent will use.")`) - Required.
  * `modelSettingsId: string | null` (Zod: `z.string().uuid().nullable().optional().describe("Optional FK to ModelSetting.id for custom LLM parameters like temperature, topP.")`)
  * `toolIds: string[]` (Zod: `z.array(z.string().uuid()).optional().describe("Array of Tool.id strings that this agent is explicitly configured to use. If empty, might use all tools compatible with its persona/type, or no tools.")`)
  * `systemPromptOverride: string | null` (Zod: `z.string().max(4000).nullable().optional().describe("Optional: A specific system prompt that overrides or augments the persona's instructions for this agent instance.")`)
  * `isEnabled: boolean` (Zod: `z.boolean().default(true).describe("Is this agent configuration active and usable?")`)
  * `userId: string` (Zod: `z.string().uuid().describe("ID of the user who created/owns this agent configuration.")`) - Required.
  * `version: string` (Zod: `z.string().optional().describe("Version string for this agent configuration.")`)
  * `createdAt: Date | string`
  * `updatedAt: Date | string`
* **Copilot Note:** The `App Builder` feature will heavily rely on creating and configuring these `Agent` entities. Ensure API endpoints for agent CRUD use these Zod schemas.

---

### 1.3. `Persona` Entity (Application Persona)

* **Description:** Defines an AI personality, role, or behavioral guide for application agents, shaping their communication style, expertise, and decision-making. Managed via `lib/agents/personas/`.
* **Authoritative Zod Schema Location:** `db/libsql/validation.ts` (Expected schemas: `personaSchema`, `insertPersonaSchema`, `updatePersonaSchema`).
* **Key Properties (Illustrative - Verify against actual Zod schema and `#file:../../lib/agents/personas/templates/masterPersona.json` structure):**
  * `id: string` (Zod: `z.string().uuid()`) - Primary Key.
  * `name: string` (Zod: `z.string().min(3).max(100).regex(/^[a-zA-Z0-9_-]+$/).describe("Unique programmatic name, e.g., 'customerSupportPro_v2'.")`) - Required, Unique.
  * `displayName: string` (Zod: `z.string().min(3).max(100).describe("User-friendly name for display in UI (e.g., App Builder).")`) - Required.
  * `description: string` (Zod: `z.string().min(20).max(1000).describe("Detailed description of this persona's role, purpose, and when it's best used.")`) - Required.
  * `instructions: string` (Zod: `z.string().min(50).max(10000).describe("The core system prompt. Comprehensive details on identity, goals, knowledge, style, tool use, constraints, refusal protocols. See masterPersona.json for full structure.")`) - Required.
  * `avatarUrl: string | null` (Zod: `z.string().url().nullable().optional()`)
  * `tagsOrCategories: string[]` (Zod: `z.array(z.string().toLowerCase()).optional().describe("Lowercase tags for categorization and search.")`)
  * `defaultModelId: string | null` (Zod: `z.string().nullable().optional().describe("Preferred LLM model ID for this persona.")`)
  * `defaultModelSettings: object | null` (Zod: `z.object({ temperature: z.number().min(0).max(2).optional(), ... }).nullable().optional().describe("Specific LLM settings to use with this persona.")`)
  * `exampleInteractions: object[] | null` (Zod: `z.array(z.object({ userInput: z.string(), assistantOutput: z.string(), notes: z.string().optional() })).nullable().optional().describe("Few-shot examples guiding LLM behavior.")`)
  * `version: string` (Zod: `z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/).optional().describe("Semantic version of the persona definition.")`)
  * `isSystemPersona: boolean` (Zod: `z.boolean().default(false).describe("True if this is a core, non-user-editable system persona.")`)
  * `userId: string | null` (Zod: `z.string().uuid().nullable().optional().describe("ID of the user who created this persona, if not a system persona.")`)

---

### 1.4. `Tool` Entity (Application Tool)

* **Description:** Defines a specific capability or function that an application agent or the AI SDK backend can invoke. Managed via `lib/tools/`.
* **Authoritative Zod Schema Location:** `db/libsql/validation.ts` (Expected schemas: `toolSchema`, `insertToolSchema`, `updateToolSchema`).
* **Key Properties (Illustrative - Verify against actual Zod schema):**
  * `id: string` (Zod: `z.string().uuid()`) - Primary Key.
  * `name: string` (Zod: `z.string().min(3).max(100).regex(/^[a-zA-Z0-9_]+$/).describe("Unique programmatic identifier for the tool, e.g., 'webSearch', 'codeExecutor_python'. This is used for invocation.")`) - Required, Unique.
  * `displayName: string` (Zod: `z.string().min(3).max(100).describe("User-friendly name for display in UIs like the App Builder.")`) - Required.
  * `description: string` (Zod: `z.string().min(20).max(1000).describe("Crucial for LLM: Detailed description of the tool's purpose, capabilities, when to use it, expected inputs, and nature of output.")`) - Required.
  * `parametersSchema: string` (Zod: `z.string().describe("A JSON string representation of the Zod schema object that defines the input parameters for this tool. This schema string will be parsed back into a Zod schema at runtime for validation and for providing to the Vercel AI SDK. Each parameter within this schema MUST have a .describe() call.")`) - Required. *(Alternatively, this could be a `jsonb` type if your DB supports it well, storing the actual Zod schema structure as JSON.)*
  * `category: string` (Zod: `z.string().optional().describe("Tool category, e.g., 'web_interaction', 'data_analysis', 'code_execution', 'content_generation', 'agentic_research'. Used for organization in App Builder.")`)
  * `isAvailable: boolean` (Zod: `z.boolean().default(true).describe("Is this tool currently enabled and available for use?")`)
  * `userId: string | null` (Zod: `z.string().uuid().nullable().optional().describe("ID of the user who created this tool, if not a system tool.")`)

---

### 1.5. `Model` Entity (LLM Configuration)

* **Description:** Represents an available Large Language Model configuration, pointing to a specific provider and model name. Managed via `lib/models/`.
* **Authoritative Zod Schema Location:** `db/libsql/validation.ts` (Expected schemas: `modelSchema`, `insertModelSchema`).
* **Key Properties (Illustrative):**
  * `id: string` (Zod: `z.string().min(1).describe("Unique identifier for this model configuration, e.g., 'openai/gpt-4-turbo', 'google/gemini-1.5-pro-latest'.")`) - Primary Key, Required, Unique.
  * `provider: string` (Zod: `z.enum(['openai', 'google', 'anthropic', 'vertex-ai', 'custom_provider']).describe("The LLM provider.")`) - Required.
  * `modelName: string` (Zod: `z.string().min(1).describe("Provider-specific model name, e.g., 'gpt-4-turbo', 'gemini-1.5-pro-latest'.")`) - Required.
  * `displayName: string` (Zod: `z.string().min(1).describe("User-friendly display name for UIs like App Builder.")`) - Required.
  * `description: string | null` (Zod: `z.string().max(500).nullable().optional()`)
  * `contextWindow: number | null` (Zod: `z.number().int().positive().nullable().optional().describe("Maximum context window size in tokens.")`)
  * `capabilities: string[]` (Zod: `z.array(z.nativeEnum(ModelCapabilityEnum)).describe("List of capabilities like 'text-generation', 'tool-use', 'json-mode', 'image-input'. ModelCapabilityEnum defined in types/models.ts or validation.ts.")`) - Required.
  * `apiKeyId: string | null` (Zod: `z.string().uuid().nullable().optional().describe("FK to ApiKey.id if this model configuration requires a specific API key from the DB.")`)

---

### 1.6. `ModelSetting` Entity

* **Description:** Stores specific configurations/parameters (e.g., temperature, topP, maxOutputTokens) for a given `Model` to create reusable setting profiles.
* **Authoritative Zod Schema Location:** `db/libsql/validation.ts` (Expected schema: `modelSettingSchema`).
* **Key Properties (Illustrative):**
  * `id: string` (Zod: `z.string().uuid()`) - Primary Key.
  * `modelId: string` (Zod: `z.string().describe("FK to Model.id. This setting profile is primarily for this model, but might be usable by compatible models.")`) - Required.
  * `settingName: string` (Zod: `z.string().min(3).max(100).describe("User-friendly name for this setting profile, e.g., 'Creative Writing High Temp', 'Code Generation Strict', 'Default Chat Params'.")`) - Required.
  * `temperature: number | null` (Zod: `z.number().min(0).max(2).nullable().optional()`)
  * `maxTokens: number | null` (Zod: `z.number().int().positive().nullable().optional().describe("Maximum output tokens for this setting.")`)
  * `topP: number | null` (Zod: `z.number().min(0).max(1).nullable().optional()`)
  * `presencePenalty: number | null` (Zod: `z.number().min(-2).max(2).nullable().optional()`)
  * `frequencyPenalty: number | null` (Zod: `z.number().min(-2).max(2).nullable().optional()`)
  * `customParameters: string | null` (Zod: `z.string().nullable().optional().describe("JSON string of provider-specific parameters, e.g., '{\"stop_sequences\": [\"--END--\"]}'.")`)
  * `isDefaultForModel: boolean` (Zod: `z.boolean().default(false).describe("Is this the default setting profile for the associated modelId?")`)

---

### 1.7. `Thread` and `Message` Entities (Conversation Management)

* **Description:** Standard entities for managing conversational history, compatible with Vercel AI SDK patterns.
* **Authoritative Zod Schema Location:** `db/libsql/validation.ts` (Expected schemas: `threadSchema`, `messageSchema`, `insertMessageSchema`).
* **Key Properties for `Message` (Illustrative):**
  * `id: string` (uuid)
  * `threadId: string` (FK to `Thread.id`)
  * `role: z.enum(['user', 'assistant', 'system', 'tool'])`
  * `content: string`
  * `toolCalls: object[] | null` (Structure as per Vercel AI SDK for LLM-requested tool invocations)
  * `toolCallId: string | null` (For `role: 'tool'`, links to the `toolCalls` entry)
  * `toolResult: object | null` (For `role: 'tool'`, the result of the tool execution, including `isError` and `result` fields)
  * `ui: string | object | null` (For `role: 'assistant'` using `streamUI`, the streamed UI component state or JSX string)
  * `createdAt: Date | string`

---

### 1.8. `AppBuilderApp` Entity (Illustrative, for App Builder)

* **Description:** Represents an application or workflow designed and configured by a user via the "App Builder" feature. This entity ties together models, tools, agents, personas, and UI configurations.
* **Authoritative Zod Schema Location:** `db/libsql/validation.ts` (Expected schema: `appBuilderAppSchema`).
* **Key Properties (Illustrative):**
  * `id: string` (uuid) - Primary Key.
  * `userId: string` (FK to `User.id`) - Owner.
  * `name: string` (User-defined name for their app).
  * `description: string | null`.
  * `definition: object` (Zod: `z.object({ /* ... */ }).describe("The core JSON-based definition of the app created in App Builder. This would specify: selected agent(s), primary persona, chosen model(s) and settings, configured tool(s) with their parameters, UI layout if applicable, workflow steps if it's a workflow app.")`). This will be a complex nested Zod schema.
  * `status: z.enum(['draft', 'published', 'archived'])`.
  * `version: string`.
  * `createdAt: Date | string`.
  * `updatedAt: Date | string`.

---

### 1.9. Other Key Entities

*(Copilot: Consult `db/libsql/validation.ts` for Zod schemas related to `ApiKey`, general `Setting`s (app-wide), `MDXDocument`, `BlogPost`, `UIComponent` (general UI elements for App Builder), `AppCodeBlock` (reusable code snippets for App Builder), `Network` (for multi-agent systems), `ToolExecutionLog`, `AgentRunLog`, `Workflow`, `WorkflowStep`, etc. The principles of Zod definition and referencing apply to all.)*

## 2. AI SDK Backend Actions (under `/app/api/ai-sdk/`)

This section details key Vercel AI SDK backend API actions. These routes implement the core AI logic, interact with the platform's custom frameworks (agents, personas, tools, memory), and expose functionality to the frontend.

*(Copilot: When implementing new routes or modifying existing ones in `/app/api/ai-sdk/`:

1. Strictly validate ALL incoming request bodies and query parameters using Zod schemas from `#file:../../db/libsql/validation.ts` or route-specific Zod schemas.
2. Ensure all responses also conform to defined Zod schemas.
3. Follow Vercel AI SDK best practices for streaming (`streamText`, `streamUI`), object generation (`generateObject`, `experimental_streamObject`), and tool usage (defining tools with Zod parameter schemas, handling `toolInvocations` and `toolResults`).
4. Leverage `#file:../../lib/ai-sdk-integration.ts` for consistent AI provider initialization, model selection, and core LLM interaction logic.
5. Use `#file:../../lib/langfuse-integration.ts` for comprehensive tracing of all AI interactions.)*

---

### 2.1. Core Chat Interaction

* **Route:** `POST /api/ai-sdk/chat`
* **Description:** Primary endpoint for all conversational AI interactions. It processes user messages, orchestrates LLM calls (potentially using specific application agents and personas), manages tool invocations, and streams responses (text or generative UI) back to the client. This is central to the custom chat UI.
* **Request Body:** Defined by `chatRequestSchema` in `validation.ts`. Critical fields:
  * `messages: Message[]` (Conforming to `messageSchema` from `validation.ts` and Vercel AI SDK structure).
  * `threadId: string | null` (For maintaining conversation history via the memory layer).
  * `modelId: string | null` (To override default model for this interaction).
  * `personaId: string | null` (To apply a specific application persona via `PersonaManager`).
  * `agentId: string | null` (Optional: if this chat is intended to be handled by a specific pre-configured application agent instance).
  * `toolConfig: object | null` (Optional: configuration for how tools should be used or selected in this chat turn).
  * `streamMode: 'text' | 'ui' | 'object'` (To indicate desired Vercel AI SDK response type).
  * `data: object | null` (Additional data for `streamUI`).
* **Response:** Streaming response using Vercel AI SDK:
  * `streamText()`: For plain text or Markdown.
  * `streamUI()`: For streaming React components and associated data.
  * `generateObject()` / `experimental_streamObject()`: For structured JSON responses (output validated against a Zod schema).
* **Key Logic:**
    1. Authenticate user.
    2. Load chat history if `threadId` provided (via memory layer).
    3. Construct LLM prompt using `#file:../../lib/ai-sdk-integration.ts`, incorporating messages, selected persona (via `PersonaManager`), and available tools (from `ToolRegistry`).
    4. Call appropriate Vercel AI SDK function (e.g., `openai.generate(...)` or specific provider).
    5. Handle tool calls: provide tool definitions to LLM, receive `toolInvocations`, execute tools via `ToolRegistry` (logging via `UpstashToolExecutionStore`), send `toolResults` back to LLM.
    6. Stream response to client.
    7. Save updated messages and agent state to memory layer.
    8. Trace entire interaction with Langfuse.

---

### 2.2. Tool Management & Execution API

* **Routes for Tool Definitions (CRUD - likely admin protected):**
  * `GET /api/ai-sdk/tools`: Lists all registered application tools. Response: `Tool[]`.
  * `POST /api/ai-sdk/tools`: Creates a new tool definition. Request: `InsertToolSchema` (from `validation.ts`). Response: `Tool`.
  * `GET /api/ai-sdk/tools/[id]`: Gets a specific tool definition. Response: `Tool`.
  * `PUT /api/ai-sdk/tools/[id]`: Updates a tool definition. Request: `UpdateToolSchema`. Response: `Tool`.
  * `DELETE /api/ai-sdk/tools/[id]`: Deletes a tool definition.
* **Route for Direct Tool Execution (for testing, App Builder backend, or specific scenarios):**
  * `POST /api/ai-sdk/tools/execute`
  * **Description:** Securely executes a specific registered application tool by name.
  * **Request Body:** Defined by `executeToolRequestSchema` in `validation.ts`. Includes:
    * `toolName: string` (The unique programmatic name of the tool).
    * `parameters: object` (**MUST** match the Zod `parametersSchema` of the specified tool).
    * `execution_context: object | null` (Optional: user ID, session ID for logging via `UpstashToolExecutionStore`).
  * **Response:** Result of the tool execution (structure varies by tool, ideally also Zod-defined).
  * **Key Logic:** Uses `ToolRegistry` to find the tool, validates parameters against the tool's Zod schema, calls its `execute` method, logs to `UpstashToolExecutionStore`.

---

### 2.3. Application Agent Management & Execution API

* **Routes for Agent Definitions (CRUD - likely admin/App Builder backend):**
  * `GET /api/ai-sdk/agents`: Lists all defined application agent configurations. Response: `Agent[]`.
  * `POST /api/ai-sdk/agents`: Creates a new agent configuration. Request: `InsertAgentSchema`. Response: `Agent`.
  * `GET /api/ai-sdk/agents/[id]`: Gets a specific agent configuration. Response: `Agent`.
  * `PUT /api/ai-sdk/agents/[id]`: Updates an agent configuration. Request: `UpdateAgentSchema`. Response: `Agent`.
  * `DELETE /api/ai-sdk/agents/[id]`: Deletes an agent configuration.
* **Route for Running an Application Agent:**
  * `POST /api/ai-sdk/agents/[id]/run`
  * **Description:** Executes a specific configured application agent. This is a core endpoint for leveraging your custom agent framework.
  * **Path Parameter:** `id` (ID of the `Agent` entity configuration to run).
  * **Request Body:** Defined by `runAgentRequestSchema` in `validation.ts`. Includes:
    * `input: string | object` (The task, prompt, or structured data for the agent).
    * `threadId: string | null` (For conversational agents to load/save history).
    * `userId: string` (Context of the invoking user).
    * `overridePersonaId: string | null` (Optional: to use a different persona than the agent's default).
    * `overrideModelSettings: object | null` (Optional: to override model settings).
  * **Response:** Output from the agent's execution. This can be complex and streaming (text, UI via `streamUI`, structured objects), depending on the agent's task and how it uses the Vercel AI SDK for its output. Handled by `AgentService`.

---

### 2.4. Persona Management API

* **Routes for Persona Definitions (CRUD - likely admin/App Builder backend):**
  * `GET /api/ai-sdk/personas`: Lists all available application personas (from library and Upstash). Response: `Persona[]`.
  * `POST /api/ai-sdk/personas`: Creates a new dynamic persona (stored in Upstash). Request: `InsertPersonaSchema`. Response: `Persona`.
  * `GET /api/ai-sdk/personas/[id]`: Gets a specific persona. Response: `Persona`.
  * `PUT /api/ai-sdk/personas/[id]`: Updates a dynamic persona. Request: `UpdatePersonaSchema`. Response: `Persona`.
  * `DELETE /api/ai-sdk/personas/[id]`: Deletes a dynamic persona.
* **Routes for Persona Scoring & Recommendation:**
  * `GET /api/ai-sdk/personas/scores/recommend`: Recommends personas based on context (e.g., task description, user ID). Uses `PersonaScoreManager`.
  * `POST /api/ai-sdk/personas/scores/feedback`: Allows users to submit feedback on persona effectiveness, updating scores in Upstash. Request: `PersonaFeedbackSchema`.

---

### 2.5. App Builder API (Illustrative - for `/app/(dashboard)/app-builder/`)

* **Route:** `POST /api/ai-sdk/apps` (Create an "App Builder" application configuration)
  * **Description:** Saves a new application/workflow configuration designed by a user in the App Builder UI. This configuration details the selected models, tools, agents, personas, UI layout, and their interconnections.
  * **Request Body:** A complex object validated by `appBuilderAppSchema` from `validation.ts`. This schema will likely reference other Zod schemas (e.g., for tool parameters, agent configs).
  * **Response:** The created `AppBuilderApp` entity, including its ID.
* **Routes:** `GET /api/ai-sdk/apps`, `GET /api/ai-sdk/apps/[id]`, `PUT /api/ai-sdk/apps/[id]`, `DELETE /api/ai-sdk/apps/[id]`
  * **Description:** Standard CRUD for managing user-created App Builder applications.
* **Route (Conceptual):** `POST /api/ai-sdk/apps/[id]/run-instance`
  * **Description:** Executes a deployed App Builder application instance. This would internally use `AgentService`, `ToolRegistry`, etc., based on the app's saved definition.

---

### 2.6. Generic CRUD Interface

* **Route:** `GET, POST, PUT, DELETE /api/ai-sdk/crud/[table]`
* **Description:** As detailed in `PROJECT_CONTEXT.MD`. Provides validated CRUD access to core database tables. **All payloads are strictly validated against Zod schemas in `db/libsql/validation.ts`.**

---

### 2.7. Workflow Management & Execution API

* **Routes:** As detailed in `PROJECT_CONTEXT.MD` (`/api/ai-sdk/workflows`, `/execute`, `/pause`, `/resume`, `/steps`).
* **Request/Response:** All payloads are validated against relevant Zod schemas in `validation.ts` (e.g., `workflowSchema`, `workflowStepSchema`, `executeWorkflowRequestSchema`).

---

### 2.8. Other Key API Categories

* **Content Management (MDX, Blog):** CRUD routes under `/api/ai-sdk/mdx` and `/api/ai-sdk/blog`, using Zod schemas like `mdxDocumentSchema`, `blogPostSchema`.
* **Settings & Model Configuration:** CRUD routes under `/api/ai-sdk/settings` and `/api/ai-sdk/models`, using Zod schemas like `settingSchema`, `modelSchema`, `modelSettingSchema`.
* **Observability Data Endpoints:** Routes under `/api/ai-sdk/observability/` to fetch processed trace, metric, evaluation, and cost data (likely from Langfuse/OTEL backend), with responses defined by appropriate Zod schemas.
* **Authentication Routes:** Routes under `/api/ai-sdk/auth/` (e.g., `/signup`, `/signin`, `/callback/github`, `/callback/admin-github`) for user authentication, interfacing with Supabase Auth and local user DB records.

## 3. Guidance for Copilot When Working with APIs & Data

* **Authoritative Data Contracts are in `db/libsql/validation.ts` (Zod):**
  * When generating any code (frontend components, backend logic, tests, other context docs) that involves data entities, **YOU MUST derive TypeScript types and interfaces directly from the Zod schemas in `#file:../../db/libsql/validation.ts`**. Use the pattern: `import { someEntitySchema } from '../path/to/validation'; type SomeEntity = z.infer<typeof someEntitySchema>;`.
  * Ensure all data passed to API request bodies or received in API responses, or written to/read from the database, strictly conforms to these Zod schemas.
  * When implementing backend route handlers, the first step after parsing the request body should be to validate it using the relevant Zod schema from `validation.ts`. Return detailed validation errors if parsing fails.
* **API Interaction Patterns:**
  * **Frontend:** Utilize established custom hooks like `#file:../../hooks/use-executor.ts` (or other similar hooks you identify for specific API interactions) for making calls to these AI SDK backend actions. Ensure proper handling of Vercel AI SDK streaming responses (`streamUI`, `streamText`) and structured objects (`generateObject`). Implement robust loading and error states in UI components.
  * **Backend (`/app/api/ai-sdk/` routes):** Follow existing patterns for:
    * Structuring Next.js API Route Handlers (e.g., `export async function POST(req: NextRequest, { params }: { params: { id: string } }) {...}`).
    * Using Vercel AI SDK core functions effectively.
    * Correctly defining and passing application tools (from `#file:../../lib/tools/toolRegistry.ts`, with parameters matching their Zod schemas) to the Vercel AI SDK's tool-calling mechanisms.
    * Integrating with `#file:../../lib/ai-sdk-integration.ts` for centralized AI provider initialization, model selection, and core LLM interaction logic (e.g., prompt construction, persona application).
* **Tool and Persona Integration in API Actions:**
  * When an API action needs to enable an LLM to use application tools, it must retrieve the tool definitions (including their Zod `parametersSchema`) via `#file:../../lib/tools/toolRegistry.ts` and pass them correctly to the Vercel AI SDK.
  * When an API action needs to apply an application persona to guide an LLM's behavior, it must use the `#file:../../lib/agents/personas/persona-manager.ts` to fetch and apply the persona's `instructions` and `defaultModelSettings`.
* **App Builder Logic:**
  * The App Builder (`app/(dashboard)/app-builder/`) allows users to compose AI applications by selecting and configuring Models (from `lib/models/`), Tools (from `lib/tools/`), Application Agents (from `lib/agents/`), and Personas (from `lib/agents/personas/`).
  * API endpoints supporting the App Builder (e.g., for saving/loading app configurations, running app instances) **MUST** correctly handle the complex data structures (defined by Zod schemas like `appBuilderAppSchema` in `validation.ts`) that represent these user-defined AI applications.
  * Copilot should be particularly careful when generating code for the App Builder to ensure it correctly references and utilizes the registered components (tools, agents, personas) and their respective Zod schemas for configuration and invocation.

This `API_DEFINITIONS.MD` document aims to provide a clear, actionable, and authoritative reference for both GitHub Copilot and human developers regarding the API actions and data contracts of the `ai-sdk-dm` project. It must be treated as a living document and rigorously kept up-to-date, primarily by ensuring it always reflects the "source of truth" found in `#file:../../db/libsql/validation.ts` and the implementations in `/app/api/ai-sdk/`.

# /lib — Core Backend Library

## Chat Context & Prompt Guidelines

When you (AI assistant) join a new chat about `/lib`, use the following context-enrichment pattern:

1. **Background**: `/lib` contains the core backend modules for the DeanmachinesAI project (formerly ai-sdk-DM):
   - **AI Integration**: Provider abstraction, AI SDK integration, and tracing (`ai.ts`, `ai-sdk-integration.ts`, `ai-sdk-tracing.ts`)
   - **Agents**: Autonomous agent framework with multi-agent orchestration (`agents/`)
   - **Memory**: Sophisticated persistence layer with LibSQL, Supabase, and Redis integration (`memory/`)
   - **Tools**: Modular tool suites with AI SDK compatibility and advanced patterns (`tools/`)
   - **Middleware**: Language model and request-response middleware for enhanced capabilities
   - **Observability**: Comprehensive tracing and metrics for monitoring and optimization

2. **Your Role**: Provide code suggestions, documentation, and troubleshooting tailored to these modules, with focus on:
   - AI SDK integration patterns and best practices
   - Agent implementation and orchestration techniques
   - Memory and persistence strategies
   - Tool development and security considerations
   - Middleware implementation for enhanced capabilities
   - Observability and tracing integration

3. **Goals**:
   - Quickly orient on file responsibilities and folder structure
   - Offer actionable steps to add, update, or debug components
   - Maintain consistency with existing architecture and TypeScript conventions
   - Ensure all persistence is handled via Supabase (for config, models, agents, tools, content) and LibSQL (for agent memory, threads, messages, embeddings, state)
   - Reference Drizzle schemas and migrations for both DBs
   - Demonstrate advanced AI SDK features like middleware, tool repair, and generative UI
   - Explain multi-agent orchestration patterns and state management techniques
   - Illustrate advanced RAG techniques and vector search optimization

4. **Constraints**:
   - Do not propose refactors unless requested
   - Align examples with Supabase-driven config and LibSQL memory
   - Use clear, concise explanations and code snippets
   - Ensure compatibility with the AI SDK's patterns and conventions
   - Maintain proper error handling and observability integration
   - Follow the established security practices for tool implementation

5. **Example Prompt**:
   "You are a TypeScript coding assistant. Explain how to add a new tool in `/lib/tools`: include Supabase entry, module code, registration in index.ts, and assignment to an agent persona."

Use this pattern as a template when generating or updating code and documentation in `/lib`.

---

## 1. Folder Structure & File Responsibilities

```bash
lib/
├── agentic-integration.ts      # High-level hooks for agentic SDK flows (custom orchestration)
├── agents/                     # Agent framework: BaseAgent, registry, service, types, multi-agent orchestration
├── ai-integration.ts           # Low-level AI SDK streaming/generation, token count, embeddings, vector search
├── ai.ts                       # High-level provider/model abstraction loaded from Supabase
├── ai-sdk-integration.ts       # Unified interface for AI SDK with provider-specific configurations
├── ai-sdk-tracing.ts           # Comprehensive tracing and observability for AI operations
├── api-error-handler.ts        # Central error wrapper for API endpoints and service layers
├── google-ai.ts                # Google Generative AI integration with Supabase model config
├── langfuse-integration.ts     # Telemetry integration via Langfuse API for tracing and metrics
├── memory/                     # Memory & persistence: threads, messages, embeddings, state management
├── mock-data/                  # Seed data and examples for local development/testing
├── otel-tracing.ts             # OpenTelemetry integration for distributed tracing
├── tool-execution.ts           # Dispatcher mapping tool names to executor functions
├── tools/                      # Built-in tool modules categorized (web, code, data, file, api, rag)
├── tools.ts                    # Schema utilities: JSON Schema → Zod, tool validation helpers
├── tracing.ts                  # Core tracing utilities for spans, events, and metrics
├── utils.ts                    # General-purpose utilities (e.g., `cn` for class merging)
└── README.md                   # This file: lib overview, onboarding, scope checklists
```

- All config, models, agents, tools, and content are persisted in Supabase (Postgres) using Drizzle migrations (`db/supabase/schema.ts`).
- All agent memory (threads, messages, embeddings, state) is persisted in LibSQL (SQLite) using Drizzle migrations (`db/libsql/schema.ts`).

---

## 2. Persistence & Schema Management

- **Supabase (Postgres)**: Used for all configuration, models, agents, tools, content, and settings. See `db/supabase/schema.ts` and `types/supabase.ts` for schema and types.
- **LibSQL (SQLite)**: Used for agent memory, threads, messages, embeddings, and agent state. See `db/libsql/schema.ts` and `lib/memory/` for schema and logic.
- **Drizzle Migrations**: All schema changes are managed via Drizzle. Use separate config files for each DB (`drizzle.supabase.config.ts`, `drizzle.libsql.config.ts`).

---

## 3. Onboarding & Getting Started

1. **Environment Setup**:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase client)
   - `DATABASE_URL` (Supabase Postgres connection for Drizzle)
   - `LIBSQL_DATABASE_URL`, `LIBSQL_AUTH_TOKEN` (LibSQL memory)
   - `GOOGLE_API_KEY` (or other provider keys)
   - `REDIS_URL` (Optional, for Redis caching and real-time data)
   - `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` (Optional, for tracing)

2. **Database Initialization**:
   - Run Drizzle migrations for both databases:

   ```sh
   # Supabase migrations
   pnpm drizzle-kit generate --config drizzle.supabase.config.ts --name init
   pnpm drizzle-kit up --config drizzle.supabase.config.ts

   # LibSQL migrations
   pnpm drizzle-kit generate --config drizzle.libsql.config.ts --name init
   pnpm drizzle-kit up --config drizzle.libsql.config.ts
   ```

3. **Seed Data (Optional)**:
   - Use files in `lib/mock-data/` to populate baseline agents, models, and tools.
   - Run the seed script: `pnpm seed:dev` (creates sample agents, models, and tools)

4. **Load Agents**:
   - Initialize the agent registry to load configurations from Supabase:

   ```typescript
   import { agentRegistry } from "./agents/registry"
   await agentRegistry.init()
   ```

5. **Run an Agent**:
   - Execute an agent with a thread ID and input prompt:

   ```typescript
   import { runAgent } from "./agents/agent-service"
   const response = await runAgent("agent-id", "thread-id", "Your prompt here")
   ```

6. **Invoke Tools Directly** (for testing):
   - Load and execute tools without going through an agent:

   ```typescript
   import { getAllBuiltInTools, loadCustomTools } from "./tools/index"
   const tools = { ...getAllBuiltInTools(), ...(await loadCustomTools()) }
   const result = await tools.web_search({ query: "example" })
   ```

7. **Use Advanced Features**:
   - Implement middleware for enhanced capabilities:

   ```typescript
   import { wrapLanguageModel } from 'ai'
   import { google } from '@ai-sdk/google'

   const wrappedModel = wrapLanguageModel({
     model: google('gemini-1.5-pro'),
     middleware: {
       transformParams: ({ params }) => ({
         ...params,
         temperature: 0.3,
       })
     }
   })
   ```

---

## 4. Current Scope Checklist

- [x] **AI abstraction**: `ai.ts`, `ai-integration.ts`, `google-ai.ts`, `agentic-integration.ts`
- [x] **Agents**: BaseAgent, registry, service, types in `agents/`
- [x] **Memory**: Moved to `memory/`, high-level and raw APIs (LibSQL)
- [x] **Tools**: Built-in modules (`tools/`), dispatcher (`tool-execution.ts`), schema utils (`tools.ts`)
- [x] **Supabase Helper**: `supabase.ts`, generic CRUD and `getItemById`/`getData`
- [x] **Error Handling**: `api-error-handler.ts`
- [x] **Utilities**: `utils.ts`, placeholder mock data in `mock-data/`
- [x] **Drizzle Migrations**: Separate config and schema for Supabase and LibSQL
- [ ] **Advanced Middleware**: Implement language model and request-response middleware for AI SDK
  - Transform parameters before they're passed to language models
  - Wrap generate and stream methods for pre/post processing
  - Implement caching, simulation, and default settings middleware
  - Create request-response middleware for context injection and filtering
- [ ] **Provider Registry**: Create centralized provider registry with model aliases and custom settings
  - Implement `customProvider` for pre-configured model settings
  - Create model aliases for different personas and use cases
  - Set up `createProviderRegistry` for unified model access
  - Configure default parameters like temperature, structuredOutputs, and reasoningEffort
- [ ] **Multi-Agent Orchestration**: Implement orchestrator-worker pattern for complex workflows
  - Create dispatcher agent for routing queries to specialized agents
  - Implement parallel processing for independent sub-tasks
  - Develop central orchestrator for task planning and delegation
  - Build inter-agent communication protocol for collaborative problem-solving
- [ ] **Dynamic Persona Management**: Add system prompt generation based on user roles and context
  - Create prompt engine for dynamic system prompt generation
  - Implement persona libraries using `customProvider` aliases
  - Develop stateful adaptation based on interaction history
  - Build feedback loop for persona refinement from user interactions
- [ ] **Advanced RAG**: Implement query transformation, re-ranking, and hybrid search strategies
  - Add Hypothetical Document Embeddings (HyDE) for query transformation
  - Implement cross-encoder re-ranking for improved relevance
  - Create hybrid search combining vector similarity with keyword/BM25
  - Develop contextual chunking strategies based on document structure
  - Add embedding model selection based on content type
- [ ] **Observability Dashboard**: Create comprehensive visualization components for tracing and metrics
  - Implement OpenTelemetry integration for distributed tracing
  - Create visualization components using d3, recharts, and plotly
  - Add cost estimation and model evaluation features
  - Build real-time monitoring for system health and performance

---

## 5. Advanced AI SDK Features

### 5.1 Middleware System

The AI SDK supports middleware for intercepting and modifying requests and responses:

#### Language Model Middleware

Language model middleware enhances the behavior of language models by intercepting and modifying calls:

```typescript
import { wrapLanguageModel } from 'ai';

const wrappedLanguageModel = wrapLanguageModel({
  model: yourModel,
  middleware: yourLanguageModelMiddleware,
});
```

You can implement any of these functions to modify behavior:

1. **`transformParams`**: Transforms parameters before they're passed to the language model
2. **`wrapGenerate`**: Wraps the `doGenerate` method of the language model
3. **`wrapStream`**: Wraps the `doStream` method of the language model

Example of a caching middleware:

```typescript
import type { LanguageModelV1Middleware } from 'ai';

const cache = new Map<string, any>();

export const cacheMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const cacheKey = JSON.stringify(params);
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    const result = await doGenerate();
    cache.set(cacheKey, result);
    return result;
  }
};
```

#### Request-Response Middleware

This middleware intercepts and modifies requests and responses at the API level:

```typescript
const middleware = createMiddleware({
  name: 'context-injection',
  beforeRequest: async ({ messages }) => {
    // Add context to the first message
    return {
      messages: [
        { role: 'system', content: 'Additional context: ...' },
        ...messages
      ]
    };
  }
});
```

### 5.2 Advanced Tool Usage

#### Parallel Tool Execution

Execute multiple tools concurrently for improved performance:

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  messages: [{ role: 'user', content: 'Compare the weather in NYC and SF' }],
  tools: {
    getWeatherNYC: {
      description: 'Get weather in New York',
      parameters: z.object({}),
      execute: async () => fetchWeather('New York')
    },
    getWeatherSF: {
      description: 'Get weather in San Francisco',
      parameters: z.object({}),
      execute: async () => fetchWeather('San Francisco')
    }
  }
});
```

#### Tool Choice Control

Control which tools the model can use:

```typescript
// Force the model to use a specific tool
const result = await generateText({
  model: openai('gpt-4o'),
  messages: [{ role: 'user', content: 'What's the weather in Paris?' }],
  tools: { getWeather, searchWeb },
  toolChoice: 'getWeather' // Force use of getWeather tool
});
```

#### Tool Repair

The AI SDK supports repairing invalid tool calls:

```typescript
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
    // Use the model to fix the tool call
    const result = await generateText({
      model,
      system,
      messages: [
        // Previous messages and error context
      ],
      tools,
    });

    // Return the fixed tool call
    return result.toolCalls.find(
      newToolCall => newToolCall.toolName === toolCall.toolName
    );
  }
});
```

### 5.3 Generative User Interfaces

The AI SDK supports generative user interfaces, allowing the model to generate UI components:

```typescript
'use client';
import { useChat } from '@ai-sdk/react';
import { Weather } from '@/components/weather';
import { Stock } from '@/components/stock';

export default function Page() {
  const { messages, input, setInput, handleSubmit } = useChat();

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          {message.toolInvocations?.map(toolInvocation => {
            const { toolName, toolCallId, state } = toolInvocation;
            if (state === 'result') {
              if (toolName === 'displayWeather') {
                return <Weather key={toolCallId} {...toolInvocation.result} />;
              }
            }
            return null;
          })}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={e => setInput(e.target.value)} />
      </form>
    </div>
  );
}
```

## 6. Troubleshooting

- **Supabase failures**: Validate `SUPABASE_URL`/`SUPABASE_ANON_KEY`, inspect table schemas.
- **Memory errors**: Test `getLibSQLClient().isDatabaseAvailable()`, verify `memory_threads`, `messages`, `embeddings` tables.
- **Agent load issues**: Confirm `agentRegistry.init()` is called, inspect Supabase `agents` rows.
- **Tool not found**: Ensure name matches in `tools/` map and in Supabase `tools` table.
- **AI provider errors**: Verify model config in Supabase `models` table and provider API keys.
- **Migration issues**: Ensure Drizzle config files are correct and environment variables are set for both DBs.
- **Middleware errors**: Check middleware implementation for correct function signatures and error handling.
- **Tool execution failures**: Verify tool parameters match schema and implement proper error handling in execute functions.
- **Streaming issues**: Ensure proper handling of stream backpressure and client disconnections.

---

Refer to folder-specific READMEs (`agents/README.md`, `tools/README.md`, `memory/README.md`) for deeper context, or the top-level [docs/](../docs/) directory for detailed guides.

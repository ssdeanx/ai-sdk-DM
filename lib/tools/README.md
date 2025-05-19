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

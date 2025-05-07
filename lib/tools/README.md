## Chat Context & Prompt Guidelines 🤖  (☆ injected into the system prompt ☆)

Whenever the assistant is asked about **`/lib/tools`**, prepend a summary like
this to the existing system prompt. It steers answers toward _modular,
type-safe, AI-SDK-ready_ solutions and reduces follow-up questions.

---

### 1  Folder Primer 📂

* Every **suite** lives in `lib/tools/<suite>/` → `constants.ts`, `types.ts`,
 `tools.ts` (+ barrel `<suite>-tools.ts` for legacy imports).  
* Built-ins today: `code`, `file`, `data`, `web`.  
* Future/R&D: `api`, `rag`.  
* Custom tools are hydrated at runtime via **`loadCustomTools()`**.

### 2  Assistant Mandate 🛠️
...

### 3  AI SDK Core ⛽ — Quick Reference

| Need                | API Call                                             | Note |
|---------------------|------------------------------------------------------|------|
| Single tool         | `generateText({ model, tools, prompt })`             | |
| Streaming           | `streamText({ … })` + `onToken` / `onFinish`         | |
| Multi-step chain    | `maxSteps: N`                                        | LLM can call >1 tool |
| Deterministic runs  | `seed: 42`, `temperature: 0`                         | |
| Parallel tool calls | Return multiple objects inside `tool_calls` array    | |

### 4  Implementation Checklist ✔️

- **Literal parity**: Enums in `constants.ts` must mirror `z.enum(...)`.  
* **Sandbox**: Dynamic code ⇒ Worker-thread or VM2; _never_ raw `eval`.  
* **Path safety**: Resolve inside `FILE_ROOT` only (`resolveWithinRoot`).  
* **Output hygiene**: Collapse whitespace; keep payload ≤ 8 KB/tool call.  
* **Result shape**: `{ success: true, … } | { success: false, error }`.

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

### 5  Advanced Patterns 🎛

| Goal                | Technique |
|---------------------|-----------|
| Tool A ➜ Tool B     | Prompt: "First summarise with `DataAggregation`, **then** search with `WebSearch`." |
| Conditional calls   | LLM decides; if not required, return _no_ `tool_calls`. |
| Parallel scraping   | Send multiple `WebScrape` calls in a single step. |
| Retry on failure    | On `{ success:false }`, invoke again (≤3 times, exponential back-off). |
| Reflection          | After a tool step, ask the model to critique/improve its own output. |

### 6  Gold-Standard Example 📑

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

| Area | Item | Notes |
|------|------|-------|
| **Architecture** | 3-file suite pattern + barrels | `code`, `file`, `data`, `web`, `rag`, `graphql` |
| | `toolInitializer` orchestration | Built-in + custom + agentic |
| | `toolRegistry` singleton | Lazy init, execution tracing |
| **Type-safety** | Discriminated unions + type-guards everywhere | |
| **Security** | Path traversal guard; Worker thread sandbox | |
| **Functionality** | YAML↔JSON, XML↔JSON, MD-Table↔JSON | Data suite |
| | Timeout+retry web scraping | Web suite |
| | Vector search with multiple providers | RAG suite |
| | Document chunking with multiple strategies | RAG suite |
| | Multi-suite aggregation (`getAllBuiltInTools`) | |
| **Docs** | README rewrite w/ chat-context template & golden example | |

---

## 🔭 Future / In-Progress Checklist ("Next Up") ⭐

_To build a **production-grade**, "batteries-included" tool platform we need to
push far beyond the current feature-set.  The matrix below is a living backlog
of ambitious—but realistic—enhancements.  PRs are welcome; tick items as they
land!_

| Priority | Epic / Area | Concrete Tasks & Ideas | Pay-off |
|----------|-------------|------------------------|---------|
| 🚀 | **api/** suite | • OpenAPI / Swagger → Zod auto-codegen<br>• REST helpers (`GET`, `POST`, retries, pagination)<br>• OAuth 2 / Bearer token flow<br>• GraphQL client with persisted queries | Unlock 1000s of SaaS APIs |
| 🚀 | **rag/** suite | • Supabase Vector & Pinecone drivers<br>• Hybrid BM25 + vector search<br>• On-disk embedding cache (LRU)<br>• Auto-chunking & semantic deduplication | First-class RAG workflows |
| 🚀 | **Security** | • vm2 / Firecracker sandbox for **custom** code<br>• SecComp or eBPF syscall filter<br>• Secrets scanner (prevent accidental leaks)<br>• SAST / dependency-audit CI step | Enterprise trust |
| 🌟 | **math/** suite | • `MathEvaluate` (expr parser, Big.js)<br>• `StatsDescribe` (mean, median, SD)<br>• Unit conversion (`convert-units`) | Analytics prompts |
| 🌟 | **media/** suite | • `ImageInfo` (EXIF via `exiftool`)<br>• `ImageResize` (sharp/Web-friendly)<br>• `AudioTranscribe` (whisper.cpp wrapper) | Multimodal LLM use |
| 🌟 | **lang/** suite | • `Translate` (LibreTranslate / DeepL)<br>• `Summarise` (auto select model)<br>• `KeywordExtract`, `Sentiment` | NLP utilities |
| 🌟 | **shell/** suite | • Safe Bash runner in Docker rootless<br>• Built-in time / memory quotas<br>• Interactive REPL capture | DevOps, CI agents |
| 🌟 | **crypto/** suite | • `Hash` (MD5/SHA256/BLAKE3)<br>• `Encrypt/Decrypt` (AES-256-GCM)<br>• `JWTParse`  → header/payload inspect | Security & auditing |
| 🌟 | **Tool versioning** | • `version` field (semver)<br>• Dispatcher resolves major/minor<br>• Deprecation warnings | Safe upgrades |
| 🌟 | **Concurrency & QoS** | • Per-tool rate-limits<br>• Circuit-breaker & bulk-head patterns<br>• Global concurrency cap via semaphore | Stability under load |
| 🌟 | **Observability** | • OpenTelemetry traces for each `execute`<br>• Prometheus exporter (p95 latency, error %)<br>• "Slow-tool" alerting in Grafana | Prod debugging |
| 🌟 | **Caching** | • Memory + Redis back-ends<br>• Cache-key derivation helper<br>• Stale-While-Revalidate strategy | –50 % token spend |
| 🌟 | **Test harness** | • Jest unit tests per tool<br>• Contract tests for barrels<br>• Golden-file diff tests (CSV↔JSON etc.) | CI confidence |
| 🌟 | **CLI** | • `pnpm ai-tools new <suite>` scaffold<br>• `ai-tools lint` (validate schemas)<br>• `ai-tools exec <ToolName> --json` | DX delight |
| 🌟 | **Auto-docs** | • Typedoc → Markdown → Docusaurus site<br>• Live schema viewer for every tool | Onboarding |
| 🌟 | **Dynamic categories** | • CRUD UI in Supabase<br>• Runtime reload without redeploy | Flexible UI |
| 🌟 | **Fine-grained ACL** | • JWT claims → tool allow/deny<br>• Usage quotas / billing hooks<br>• Tenant-aware `FILE_ROOT` | SaaS readiness |
| 💡 | **Plugin marketplace** | • NPM tag `ai-sdk-tool-suite` discovery<br>• Auto-install from UI<br>• Version gating + signature check | Ecosystem flywheel |
| 💡 | **Graph analytics** | • Visualize tool call graphs (d3.js)<br>• Suggest optimal `maxSteps` | Prompt ergonomics |
| 💡 | **Self-optimizing agent** | • Reinforcement learning to re-order tool suggestions based on success rate | Continual improvement |
| 💡 | **Edge runtime** | • Vercel Edge / Cloudflare Workers compatibility<br>• WASI shim for `data/` & `code/` suites | Low-latency |
| 💡 | **Multi-language support** | • Rust & Python "sibling" runtimes sharing the same Zod-like schemas (using `typia` / `pydantic`) | Polyglot stacks |
| 💡 | **Cost awareness** | • Token-cost estimator per call<br>• Budget guardrail that blocks expensive chains | $$ savings |
| 🧪 | **LLM eval harness** | • Automated tool-call correctness using GPT-4 judge<br>• Regression baseline per release | Safety net |
| 🧪 | **Prompt compression** | • Recursive summarisation for long tool outputs<br>• Hash-based deduplication | Fit within context window |

_The list is intentionally extensive—treat it as inspiration and backlog.  PRs
should reference an item ID (e.g. `rag-03`) and tick it here once merged._ 🚀

---

_Keep both lists synced with PRs: move items from ⭐ → ✅ once merged.  Aim high,
iterate fast, and always keep the assistant's chat-context up to date._ 🚀

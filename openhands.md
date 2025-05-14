---
title: ai-sdk-DM Project Overview
microagent_type: repo
last_updated: 2025-05-14
authors:
  - DeanmachinesAI Team
project:
  name: ai-sdk-DM
  description: |
    ai-sdk-DM is a full-stack AI SDK platform built on Next.js, Supabase, LibSQL, and multi-provider AI SDKs. It features modular agent orchestration, advanced memory, tool integration, and a modern dashboard UI. This document provides OpenHands and other AI agents with all necessary project context, coding standards, and architectural guidance for effective automation and code generation.
  tech_stack:
    frontend:
      - Next.js (App Router)
      - React (with shadcn/ui, Tailwind CSS, Framer Motion)
      - Custom hooks for Supabase CRUD, direct, and fetch
    backend:
      - Node.js (TypeScript)
      - Drizzle ORM (Supabase & LibSQL)
      - Supabase (Postgres, Auth, Storage)
      - LibSQL (agent memory, threads, embeddings)
    ai:
      - AI SDK (OpenAI, Anthropic, Gemini, Vertex, local LLMs)
      - Multi-agent orchestration
      - Tool registry and dispatcher
  main_dirs:
    - app/
    - components/
    - lib/
    - db/
    - docs/
    - drizzle/
    - hooks/
    - public/
    - styles/
    - types/
    - utils/
  entrypoints:
    frontend: app/(dashboard)/, app/chat/, components/
    api: app/api/
    backend: lib/
    docs: docs/
  key_files:
    - lib/ai.ts
    - lib/ai-integration.ts
    - lib/agents/
    - lib/memory/
    - lib/tools/
    - app/api/agents/
    - app/api/chat/
    - components/chat/ai-sdk-chat.tsx
    - db/supabase/schema.ts
    - db/libsql/schema.ts
    - drizzle/*.ts
    - README.md
    - lib/README.md
    - docs/

coding_standards:
  typescript:
    - Use strict typing and interfaces for all modules
    - Prefer functional components and hooks in React
    - Follow Google TypeScript Style Guide
    - Use Prettier for formatting
  python:
    - PEP8, Black formatting (if used)
  api:
    - All endpoints must use centralized error handling
    - Validate all inputs and outputs
    - Document endpoints in OpenAPI/Swagger (if available)
  commit:
    - Use Conventional Commits
    - Reference related issues in commit messages

workflows:
  onboarding:
    - Review README.md and lib/README.md for architecture and onboarding
    - Use provided hooks and utilities for Supabase and LibSQL
    - Follow folder structure for new features
  agent:
    - Register new agents in Supabase and lib/agents/registry.ts
    - Use BaseAgent and lifecycle hooks for custom logic
    - Integrate tools via toolRegistry and toolInitializer
    - Persist agent memory in LibSQL
  tools:
    - Add new tools in lib/tools/ and register in toolRegistry
    - Use discriminated unions and type-guards for type safety
    - Document tool usage in lib/tools/README.md
  frontend:
    - Add new UI in components/ and app/(dashboard)/
    - Use shadcn/ui and Tailwind for styling
    - Add observability components in components/observability/
  testing:
    - Add unit/integration tests for all new features
    - Use mocks for external APIs and DB

observability:
  - Use Langfuse and OpenTelemetry for tracing and metrics
  - Add cost tracking and model evaluation dashboards

security:
  - Do not expose API or DB credentials in code
  - Harden Docker and follow OpenHands sandboxing best practices
  - Validate all user input and sanitize outputs

references:
  - README.md
  - lib/README.md
  - docs/
  - https://docs.all-hands.dev/modules/usage/prompting/microagents-overview
  - https://github.com/All-Hands-AI/OpenHands

---

# ai-sdk-DM Project Overview

This document provides OpenHands and other AI agents with a complete, structured overview of the ai-sdk-DM project. It includes architecture, coding standards, workflows, and integration points for backend, API, and frontend. Use this as the primary context for all automated coding, refactoring, and onboarding tasks.

## 1. Architecture & Tech Stack
- **Frontend**: Next.js (App Router), React, shadcn/ui, Tailwind CSS, Framer Motion
- **Backend**: Node.js (TypeScript), Drizzle ORM, Supabase, LibSQL
- **AI**: Multi-provider AI SDK (OpenAI, Anthropic, Gemini, Vertex, local LLMs), agent orchestration, tool registry

## 2. Folder Structure & Key Files
- See `main_dirs` and `key_files` in the YAML frontmatter for all major entrypoints and responsibilities.

## 3. Coding Standards
- TypeScript: strict types, functional components, hooks, Prettier
- API: centralized error handling, input/output validation
- Commits: Conventional Commits, reference issues

## 4. Workflows
- Onboarding: Start with README.md and lib/README.md
- Agent: Register in Supabase and lib/agents/registry.ts, use BaseAgent
- Tools: Add to lib/tools/, register in toolRegistry
- Frontend: Add UI in components/, app/(dashboard)/
- Testing: Add unit/integration tests, use mocks

## 5. Observability & Security
- Use Langfuse, OpenTelemetry, and cost dashboards
- Harden Docker, validate all inputs, never expose secrets

## 6. References
- See README.md, lib/README.md, docs/, and OpenHands documentation for more details.

---

This file is intended for `.openhands/microagents/repo.md` and should be kept up to date as the project evolves. All OpenHands agents should use this as the canonical source of project context and standards.
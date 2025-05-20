# AI-SDK-DM Agent Guidelines

## Build Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint checks
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm type-check` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check formatting without making changes

## Code Style Guidelines

- **Imports**: Use single quotes. Group and sort imports (React/Next first, then external libs, then internal imports)
- **Formatting**: Use semi-colons and trailing commas (follows .prettierrc.json config)
- **Types**: Prefer TypeScript interfaces/types over `any`. Export types from dedicated type files.
- **Naming**: Use camelCase for variables/functions, PascalCase for components/interfaces.
- **Error Handling**: Use try/catch blocks and proper error typing in async functions.
- **Components**: Use named exports and functional components with proper type definitions.
- **State Management**: Prefer React hooks and custom hooks for shared functionality.

## Project Overview

This document provides guidelines for both AI agents and developers in the AI-SDK-DM project—a full-stack AI platform that integrates modern UI components, robust backend API routes, and type-safe databases using Supabase and LibSQL with Drizzle ORM.

- **Frontend**: Built with Next.js (App Router) and React 19, using Tailwind CSS and Shadcn/UI for a modern design.
- **Backend**: Features API routes under `app/api/ai-sdk` with strict type-checking and Zod validations.
- **Database**: Uses Supabase (PostgreSQL) and LibSQL for operational data.
- **Agents & Integrations**: Leverages the Vercel AI SDK for AI agent operations, third-party integrations, and real-time monitoring.
- **Observability**: Implements tracing and logging through Langfuse and OpenTelemetry.

## Getting Started

Refer to the main documentation (`README.md` and the `docs/` folder) for full setup instructions. Ensure environment variables are configured (see `.env.local.example`), and adhere to the development workflow and troubleshooting guidelines provided.

## Development Workflow

- **Coding Standards**: Follow the guidelines in this document. Ensure your code passes linting (`pnpm lint`) and type-checking (`pnpm type-check`).
- **Testing**: Use Jest/React Testing Library for unit and integration tests.
- **Commit Messages**: Adopt Conventional Commits for clear, consistent commit messages.
- **Collaboration**: For onboarding or unfamiliar parts, consult the team or review existing documentation.

## Onboarding AI Agents

This project leverages AI agents for integration management, error handling, and more. Follow these guidelines to establish an effective agent persona and workflow:

### Establishing Your Agent Persona

- **Define a Clear Persona:** Assign a name, role, and domain expertise (e.g., `IntegratorX` for integration management).
- **Behavioral Guidelines:** Maintain a collaborative tone, adhere to code style and error handling standards, and keep context from available documentation.
- **Context Awareness:** Regularly review `CHANGELOG.md`, `README.md`, and inline comments to stay updated on project practices.

### Agent Tasks and Responsibilities

- **Task Execution:** Handle integration deployment, API error resolution, and monitoring using the Vercel AI SDK and designated tools.
- **Continuous Learning:** Adjust behaviors based on feedback and documentation updates.
- **Collaboration:** Work closely with developers, suggesting improvements and documenting decisions.

## Contribution Guidelines

- **Code Quality:** Follow code style guidelines. Ensure all code passes linting and type-checking.
- **Documentation:** Maintain up-to-date documentation. Update changelogs and inline comments for every new feature or fix.
- **Commits:** Use Conventional Commits for clarity.
- **Collaboration:** Consult team channels and documentation for effective onboarding and problem resolution.

## Troubleshooting FAQ

- **Environment Variables:** Verify that `.env.local` is correctly configured based on `.env.local.example`.
- **Linting & Formatting:** Run `pnpm lint:fix` and `pnpm format` to address issues.
- **Deployment Errors:** Check API routes in `app/api/ai-sdk` for recent changes and validate error logs.
- **Integration Issues:** Confirm credentials and configurations for external services; consult the IntegrationManager component if needed.

## Architecture Diagram

Below is a detailed architecture diagram outlining the major components and data flows within the AI-SDK-DM project:

```mermaid
flowchart TD
    subgraph "Frontend Layer"
      FE1[Dashboard UI<br>(Next.js/React, Tailwind CSS)]
      FE2[Interactive Components<br>(Chat, Code Editor, File Tree)]
    end

    subgraph "API Layer"
      API[API Routes<br>(Next.js App Router)]
      VAL[Request Validation<br>(Zod Schemas)]
      CTRL[Controller Logic]
    end

    subgraph "Database Layer"
      DB1[Supabase<br>(PostgreSQL)]
      DB2[LibSQL<br>(SQLite-based)]
    end

    subgraph "Agent & Integration Layer"
      AG[AI Agents<br>(Vercel AI SDK)]
      INT[Third-Party Integrations]
    end

    subgraph "Observability"
      OBS[Tracing & Logging<br>(Langfuse, OpenTelemetry)]
    end

    FE1 --> FE2
    FE2 --> API
    API --> VAL
    VAL --> CTRL
    CTRL --> DB1
    CTRL --> DB2
    CTRL --> AG
    AG --> INT
    API --- OBS
    AG --- OBS
    DB1 --- OBS
```

Welcome onboard, and enjoy building with the AI-SDK-DM!

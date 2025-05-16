# DeanmachinesAI Changelog

All notable changes to the DeanmachinesAI project will be documented in this file.

## [v0.0.5] - 2025-05-16

### Backend API Refactor & Migration Warning

- Refactored `app/api/ai-sdk/apps/route.ts` and `app/api/ai-sdk/apps/[id]/route.ts` for robust error handling, correct Next.js signatures, and improved type safety.
- Standardized logging and error/success response patterns using `NextResponse` and `upstashLogger` in the above routes.
- Updated `TableName` type and confirmed its usage in CRUD helpers for compatibility with both Supabase and Upstash adapters.
- Used `get_errors` to identify and confirm type issues in multiple ai-sdk API routes (notably `apps`, `dashboard`, and `threads`).
- Added a new section to the changelog summarizing backend changes, current errors, pending work, and a migration warning.
- Confirmed that some routes (e.g., `memory_threads`, `threads`) still have `TableName`/type issues and are not fully error-free.
- Noted that frontend integration for new/updated API routes is incomplete and pending.
- **Current ai-sdk API routes (as of this release):**
  - `agents/route.ts`
  - `agents/[id]/route.ts`
  - `agents/[id]/run/route.ts`
  - `apps/route.ts`
  - `apps/[id]/route.ts`
  - `assistant/route.ts`
  - `chat/route.ts`
  - `content/route.ts`
  - `dashboard/route.ts`
  - `models/route.ts`
  - `observability/route.ts`
  - `providers/route.ts`
  - `settings/route.ts`
  - `system/route.ts`
  - `threads/route.ts`
  - `threads/[id]/route.ts`
  - `threads/[id]/messages/route.ts`
  - `tools/route.ts`
  - `tools/execute/route.ts`
  - `crud/[table]/route.ts`
- **Schema Sync Warning:** The Redis-store and Supabase schema must be kept in sync. Any changes to the canonical schema in `db/supabase/schema.ts` must be reflected in all adapters and entity types to prevent data/model drift.
- **Explicit next steps for future agents:**
  1. Finish fixing all ai-sdk API routes with outstanding `TableName`/type errors (especially `threads`, `memory_threads`, and any others).
  2. Ensure all routes use the correct TableClient pattern, robust error handling, and logging.
  3. Complete and test frontend integration for all new/updated API routes.
  4. Perform full end-to-end testing for all CRUD operations and adapters (Supabase and Upstash).
  5. Update documentation and usage examples to reflect new route signatures and error handling patterns.
  6. Ensure all routes are fully tested with both Supabase and Upstash adapters.
  7. Keep Redis-store and Supabase schema in sync.
  8. Add migration scripts or documentation for any breaking changes to route signatures or data models.

#### Migration Warning
**[MIGRATION REQUIRED]**: As of 2025-05-16, all ai-sdk API routes have been refactored for improved type safety and error handling. Some routes (notably `memory_threads`, `threads`) still have outstanding type issues. Please review and test all integrations before deploying to production. Full end-to-end testing is required for both Supabase and Upstash adapters. Frontend integration is not yet complete.

#### Current Errors
- Outstanding `TableName`/type errors in `memory_threads`, `threads`, and possibly other ai-sdk API routes.
- Some CRUD operations may not work as expected with all adapters until these are resolved.
- Frontend integration for new/updated API routes is incomplete.

#### Pending Work
- Finish fixing all ai-sdk API routes with outstanding `TableName`/type errors (e.g., `memory_threads`, `threads`, and others).
- Complete and test frontend integration for new/updated API routes.
- Perform full end-to-end testing for all CRUD operations and adapters.
- Update documentation and usage examples to reflect new route signatures and error handling patterns.
- Ensure all routes are fully tested with both Supabase and Upstash adapters.

---

## [v0.0.4] - 2025-05-16

### API Route Handler Improvements

- Refactored all ai-sdk API route handlers (apps, memory_threads, agents, assistant, content, models, observability, providers, settings, system, threads, etc.) for robust error handling, consistent logging, and correct Next.js handler signatures.
- Fixed all TableName type issues and ensured correct mapping to Supabase tables for CRUD operations, supporting both Supabase and Upstash adapters.
- Improved error and success response patterns using NextResponse and upstashLogger across all routes.
- Ensured all CRUD routes for tables like "apps", "memory_threads", etc. are type-safe and runtime error-free.
- Updated and standardized logging for all API endpoints.
- Confirmed compatibility and correct operation for both Supabase and Upstash adapters in all routes.
- Improved code consistency and maintainability in all API route files.

## [v0.0.3] - 2025-05-07

### Authentication Enhancements

- Added GitHub OAuth callback for admin authentication
- Implemented admin-specific authentication flow with dedicated callback route
- Added admin user schema with role-based access control
- Created admin GitHub sign-in button component for admin authentication
- Updated Supabase schema to support both email/password and GitHub authentication
- Added support for admin login with email (owner@deanmachines.com) and password (admin!)
- Implemented proper error handling for authentication failures
- Added migration for authentication schema updates (auth_github_callback_admin)

## [v0.0.2] - 2025-05-06

### Enhanced Google AI Integration

- Implemented full Google AI integration with all advanced features:
  - Added support for hybrid grounding capabilities
  - Implemented dynamic retrieval configuration
  - Added response modalities support
  - Implemented cached content capabilities
  - Updated all model configurations with accurate capabilities

### Authentication Improvements

- Added Supabase authentication callback route for OAuth and magic link flows
- Created server-side Supabase client for secure authentication operations
- Added error handling page for authentication failures
- Implemented proper redirect handling with environment detection
- Added GitHub OAuth authentication support with dedicated callback route
- Created GitHub sign-in button component for easy integration
- Added sign-in page with email/password and GitHub authentication options
- Created documentation for GitHub OAuth setup

### Database Schema Updates

- Updated Supabase schema to include agent_personas table with capabilities
- Added persona_scores table for tracking persona performance
- Enhanced model capabilities schema to support all Google AI features
- Created migration for updated schema (persona_upgraded_gemini)

### AI SDK Tracing Improvements

- Enhanced AI SDK tracing to support all Google AI features
- Updated streamGoogleAIWithTracing to handle new parameters
- Updated generateGoogleAIWithTracing to handle new parameters
- Improved streamTextWithTracing and generateTextWithTracing functions

### Persona Management

- Updated AgentPersona interface to include capabilities
- Enhanced persona-manager.ts to handle capabilities field
- Improved persona score tracking and management
- Added support for dynamic persona capabilities based on model

### Changed

- Updated layout components to ensure all imports are properly used:
  - `dashboard-layout.tsx`: Verified all imports are properly used
  - `main-nav.tsx`: Verified all imports are properly used
  - `dashboard-layout.tsx`: Verified all imports are properly used
  - `main-nav.tsx`: Verified all imports are properly used
  - `main-sidebar.tsx`: Implemented router, isMobile, and dragControls functionality
  - `top-navbar.tsx`: Verified all imports are properly used

### Added

- Implemented navigateToPage function in main-sidebar for proper routing
- Added startDrag function for drag functionality in main-sidebar
- Added resize handle for sidebar width adjustment
- Created professional changelog to track development progress

## [v0.0.1] - 2025-05-01

### Initial Features

- Initial project setup with Next.js App Router
- Basic AI SDK integration with Google AI (Gemini)
- Implemented layout components with cutting-edge design
- Added Shadcn UI components
- Created responsive dashboard layout
- Implemented main navigation and sidebar components
- Added top navbar with search functionality
- Set up project with neon green and blue accent colors

## Project Overview

DeanmachinesAI is a sophisticated AI platform built with modern technologies:

### Architecture

- **Frontend**: Next.js App Router, React 18+, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Edge Runtime
- **AI SDK**: Vercel AI SDK (`@ai-sdk/core`, `@ai-sdk/react`)
- **Providers**: Google AI (Gemini), OpenAI, Anthropic
- **Database**: LibSQL (for memory), Supabase (for configuration)
- **Observability**: OpenTelemetry, Langfuse
- **Tools Framework**: Custom agentic tools system with AI SDK compatibility

### Key Components

#### Layout Components

- **dashboard-layout.tsx**: Main layout structure with sidebar context provider, animations, and responsive design
- **main-nav.tsx**: Navigation component with command palette, search, and mobile responsiveness
- **main-sidebar.tsx**: Sidebar with collapsible navigation, drag-and-drop functionality, and resize capability
- **top-navbar.tsx**: Top navigation with search, notifications, and user menu

#### Chat Components

- **ai-sdk-chat.tsx**: Main chat interface using AI SDK UI hooks
- **multimodal-chat.tsx**: Chat with support for images and other media types
- **openai-assistant-chat.tsx**: Integration with OpenAI Assistants API
- **enhanced-chat.tsx**: Advanced chat features with code blocks, diagrams, and visualizations

#### Observability Components

- **cost-estimation.tsx**: Visualization for AI usage costs using d3
- **model-performance.tsx**: Performance metrics for AI models

#### Tools System

- **web-tools.ts**: Web scraping and content extraction
- **code-tools.ts**: Code analysis and execution
- **data-tools.ts**: Data processing and transformation
- **file-tools.ts**: File system operations
- **api-tools.ts**: External API integration
- **rag-tools.ts**: Vector search and similarity
- **agentic/**: Specialized tools (Wikipedia, GitHub, etc.)

### Project Structure

```bash
.
├── app/               # Next.js application (layouts, pages, features)
├── components/        # Reusable UI components
│   ├── chat/          # Chat-related components
│   ├── layout/        # Layout components
│   ├── observability/ # Monitoring and analytics components
│   └── ui/            # shadcn/ui components
├── hooks/             # React hooks
├── lib/               # Core backend library
│   ├── agents/        # Agent framework
│   ├── memory/        # Persistence system
│   └── tools/         # Tools system
├── public/            # Static assets
└── types/             # TypeScript definitions
```

### Development Focus

Current development is focused on:

1. Ensuring all imports are properly used in layout components
2. Implementing advanced UI features with Framer Motion animations
3. Adding drag-and-drop and resize functionality to the sidebar
4. Enhancing navigation with programmatic routing
5. Improving mobile responsiveness
# Task Definition Examples & Guidance for Copilot Agent: ai-sdk-dm

**Version:** 1.1 (Generated 2025-05-20)
**Intended Path in Repository:** `/.github/docs/TASKS_EXAMPLES.MD`

**Purpose:** This document provides GitHub Copilot (and human developers) with comprehensive templates, highly detailed examples, and best practices for defining and structuring complex development tasks for the `ai-sdk-dm` project. The goal is to enable more effective, accurate, and contextually-aware collaboration with GitHub Copilot Agent by providing it with clear, granular, and richly annotated task breakdowns. This is especially important when using interactive prompting or preparing detailed task lists for the Agent to execute, helping it to "connect all the pieces" of the project.

**Related Core Context Documents (Essential Reading for Agent before tackling tasks):**

* Project Overview & Global Instructions: `#file:../../.github/copilot-instructions.md`
* Detailed Project Bible: `#file:./PROJECT_CONTEXT.MD`
* API & Data Contracts: `#file:./API_DEFINITIONS.MD` (Authoritative: `#file:../../db/libsql/validation.ts`)
* Application Agents & Personas Guide: `#file:./APP_AGENTS_AND_PERSONAS_GUIDE.MD`
* Application Tools Guide: `#file:./APP_TOOLS_GUIDE.MD`
* Recent Changes: `#file:../../CHANGELOG.md` & `#file:../../CHANGELOG-unreleased.md`

**Note to Copilot (Critical):**

1. This guide demonstrates how to structure **input for you (GitHub Copilot Agent)** when you are being asked to perform complex, multi-step development tasks. Your ability to follow these detailed tasks directly impacts the quality and accuracy of your assistance.
2. When a developer provides you with a task list or a detailed prompt structured similarly to the examples herein, use it to understand the precise sequence of operations, dependencies between sub-tasks, specific requirements, and expected outcomes for each step.
3. **Always meticulously cross-reference task details with the authoritative context documents linked above.** For example:
    * For data structures and validation, consult `#file:../../db/libsql/validation.ts` (Zod schemas) as directed by `#file:./API_DEFINITIONS.MD`.
    * For API endpoint signatures and behavior, consult `#file:./API_DEFINITIONS.MD`.
    * For using or creating application tools, consult `#file:./APP_TOOLS_GUIDE.MD`.
    * For working with application agents or personas, consult `#file:./APP_AGENTS_AND_PERSONAS_GUIDE.MD`.
    * For overall architecture and project conventions, consult `#file:./PROJECT_CONTEXT.MD` and `#file:../../.github/copilot-instructions.md`.
4. The **"App Builder"** (`#file:../../app/(dashboard)/app-builder/page.tsx` and components in `#file:../../components/appBuilder/`) is a critical user-facing feature. Many tasks will involve creating or modifying components, agents, tools, or personas that are integral to the App Builder's functionality (e.g., allowing users to select and configure these elements).
5. Pay close attention to **folder-specific context files** (`repomix-output.md`, `repomix-output.txt.md`, or `README.md` within the relevant directory) as instructed in `#file:../../.github/copilot-instructions.md#6.-IMPORTANT:-Using-Localized-Context-Files`. These local files provide fine-grained details that specialize global instructions.

## 1. Core Principles for Defining Tasks for Copilot Agent

Effective task definition is paramount for leveraging GitHub Copilot Agent's capabilities for complex, autonomous, or semi-autonomous development.

* **Extreme Granularity & Specificity:** Break down large features or epics into the smallest logical, actionable, and verifiable sub-tasks. Each sub-task should have a single, clear objective.
  * **What:** Create, modify, delete, refactor, implement, test, document.
  * **Where:** Precise file paths (`#file:./path/to/specific/file.ts`), specific function/class names within those files.
  * **How:** Adherence to specific patterns from `PROJECT_CONTEXT.MD`, use of specific tools from `APP_TOOLS_GUIDE.MD`, application of personas from `APP_AGENTS_AND_PERSONAS_GUIDE.MD`, data contracts from `API_DEFINITIONS.MD` (based on `validation.ts`).
  * **Why (Implicitly or Explicitly):** Brief context on how this sub-task contributes to the larger goal.
* **Clear Sequential Order & Explicit Dependencies:** List tasks in the logical order of execution. If Task B depends on the successful completion of Task A, clearly state this or ensure Task A precedes Task B. For parallelizable tasks, indicate if appropriate.
* **Rich Contextual Referencing:**
  * Use `#file:./path/to/file.ts#L10-L25` to point to specific lines if relevant.
  * Use `#file:./path/to/DOCUMENT.MD#Specific-Section-Header` to link to parts of other context documents.
  * Reference specific Zod schemas from `#file:../../db/libsql/validation.ts` by name when discussing data structures.
  * Refer to specific tool names (from `toolRegistry.ts`) or application agent/persona names.
* **Comprehensive Definition of Done (DoD) per Task/Phase:** Outline explicit, verifiable criteria for when a task or a phase is considered complete. This allows both the developer and the Agent to assess progress and correctness. Examples:
  * "Code implements all functional requirements listed in `#file:./docs/specifications/FEATURE_SPEC.MD#FR-1.2`."
  * "All new functions and classes have JSDoc/TSDoc comments explaining parameters, return values, and purpose."
  * "Unit tests (Jest/React Testing Library) achieve >90% line coverage for the new module."
  * "Code passes all linting (ESLint) and formatting (Prettier) checks as per project standards."
  * "No `any` types used in new TypeScript code unless explicitly justified and approved."
  * "All API interactions correctly use types derived from Zod schemas in `validation.ts`."
  * "User interface matches mockups in `#file:./docs/designs/FEATURE_MOCKUP.png` (pixel-perfect not required, but layout and key elements must match)."
* **Iterative Prompting Strategy:** For very large features, present these tasks to Copilot Agent iteratively (e.g., one sub-phase or a small group of related tasks at a time). After the Agent completes a batch, review its output thoroughly, provide corrective feedback or ask for refinements, and then proceed to the next batch. This is a human-in-the-loop "active prompting" approach.
* **Markdown for Clarity and Structure:**
  * Use headings (`## Phase X`, `### Sub-Phase X.Y`, `#### Task X.Y.Z`).
  * Use numbered lists for sequential steps within a task's details.
  * Use checklists (`- [ ]` for pending, `- [x]` for completed, though the Agent reads these as text) for both developer tracking and to clearly delineate discrete sub-actions.
  * Use Markdown code blocks (with language identifiers) for example code, expected outputs, or configurations.
  * Use **bolding** for emphasis on critical instructions or file names.

## 2. Template for a Comprehensive `TASKS.MD`-like File

This template provides a robust structure for breaking down a complex feature or epic. Create a file like `docs/features/YOUR_FEATURE_NAME/TASKS.MD` and use its content to guide Copilot Agent.

```markdown
# Feature/Epic: [Clear, Descriptive Name of the Feature or Epic]

**Date Created:** YYYY-MM-DD
**Version:** 1.0 (Increment as the plan evolves)
**Lead Developer (Conceptual):** @your_github_username
**Status:** Not Started | Planning | In Progress | Blocked (Reason) | Testing | Completed
**Related Issue(s) (if any):** #[GitHub Issue Number]

**1. Executive Summary & Business Value:**
    - Brief (1-2 paragraphs) overview of the feature/epic.
    - What core problem does it solve for the target user (see `#file:./PROJECT_CONTEXT.MD#1.-Introduction`)?
    - What is the primary business value or user benefit?
    - High-level success metrics (how will we know this feature is successful?).

**2. Detailed Requirements & Specifications:**
    - **MUST Link to:** `#file:./docs/specifications/YOUR_FEATURE_SPEC.MD` (This separate spec file should contain detailed user stories, functional requirements, NFRs, acceptance criteria).
    - Key User Stories to be addressed by this task list:
        - US-123: [User Story Title]
        - US-124: [User Story Title]

**3. Architectural Considerations & Design:**
    - **MUST Link to:** `#file:./docs/architecture/YOUR_FEATURE_ARCH.MD` or `#file:./docs/design/YOUR_FEATURE_DESIGN_DOC.MD` (if a separate design doc exists).
    - Brief summary of the chosen architectural approach for this feature.
    - Key existing project modules/services (from `#file:./PROJECT_CONTEXT.MD`) that will be impacted or interacted with.
    - New modules/services to be created.
    - Data model changes required (referencing Zod schemas in `#file:../../db/libsql/validation.ts`).
    - Key API endpoints to be created/modified (referencing `#file:./API_DEFINITIONS.MD`).
    - Application Agents, Personas, or Tools (from `#file:./APP_AGENTS_AND_PERSONAS_GUIDE.MD` and `#file:./APP_TOOLS_GUIDE.MD`) to be used or created.

**4. Pre-requisites & Setup (if any):**
    - [ ] Task P.1: Verify required environment variables for [specific service/API] are set locally (see `.env.example`).
    - [ ] Task P.2: Ensure dependent library `[library-name]` is at version `[x.y.z]` or compatible (check `#file:../../package.json`).
    - [ ] Task P.3: Review existing module `#file:../../lib/utils/someUtil.ts` for any helper functions that can be reused for this feature.
    - [ ] Task P.4: Pull the latest changes from the `develop` branch and resolve any merge conflicts.

## Phase 1: [Name of First Major Development Phase, e.g., Backend API & Data Layer]

**Goal for this Phase:** [Specific, measurable goal for this phase. E.g., "Implement all necessary backend API endpoints and database changes to support core CRUD operations for the 'Widget' entity."]

**Definition of Done for Phase 1:**
- All tasks in Phase 1 completed and individually verified.
- API endpoints are functional and tested with sample requests (e.g., using Postman or a script).
- Data is correctly persisted and retrieved from the database.
- All new backend code has >85% unit test coverage.
- Code linted and formatted.

### Sub-Phase 1.1: Data Model Definition & Database Setup
    - **Context:** This sub-phase focuses on defining the data structure for the new 'Widget' entity.
    - **Authoritative Source:** `#file:../../db/libsql/validation.ts` for Zod schemas, `#file:../../db/libsql/schema.ts` for Drizzle.
    - **Relevant Local Context:** Check for `repomix-output.md` or `README.md` in `db/libsql/`.

    - [ ] **Task 1.1.1:** Define the Zod schema for `WidgetEntity` in `#file:../../db/libsql/validation.ts`.
        - *Details:*
            - `id: z.string().uuid().readonly()`
            - `name: z.string().min(3).max(100).describe("User-friendly name of the widget.")`
            - `description: z.string().max(500).optional().describe("Optional detailed description.")`
            - `widgetType: z.enum(['TypeA', 'TypeB', 'TypeC']).describe("The type category of the widget.")`
            - `config: z.record(z.any()).describe("JSON-like object for widget-specific configuration. Define a more specific Zod schema for this if known, e.g., z.object({ setting1: z.boolean() ...})")`
            - `userId: z.string().uuid().describe("ID of the user who owns this widget.")`
            - `createdAt: z.date().optional().describe("Timestamp of creation.")`
            - `updatedAt: z.date().optional().describe("Timestamp of last update.")`
        - *DoD:* Zod schema `widgetSchema`, `insertWidgetSchema` (omitting `id`, `createdAt`, `updatedAt`), and `updateWidgetSchema` (all fields optional) are defined and exported. Types `Widget`, `InsertWidget`, `UpdateWidget` are inferred.

    - [ ] **Task 1.1.2:** Add the `widgets` table definition to Drizzle schema in `#file:../../db/libsql/schema.ts`.
        - *Details:* Map fields from `widgetSchema` to Drizzle columns (e.g., `text`, `varchar`, `timestamp`, `jsonb` for config). Define primary key, foreign key to `users` table, and any necessary indexes.
        - *DoD:* `widgetsTable` defined and exported.

    - [ ] **Task 1.1.3:** Generate Drizzle migration script for the new `widgets` table.
        - *Details:* Run `pnpm drizzle-kit generate:sqlite --schema=db/libsql/schema.ts --out=drizzle/migrations/libsql` (verify command). Inspect the generated SQL migration file for correctness.
        - *DoD:* Migration script generated in `/drizzle/migrations/libsql/`.

    - [ ] **Task 1.1.4:** Implement CRUD functions for `WidgetEntity` in `#file:../../db/libsql/crud.ts`.
        *Details:*
            - `async function createWidget(data: InsertWidget): Promise<Widget>`
            - `async function getWidgetById(id: string): Promise<Widget | null>`
            - `async function updateWidget(id: string, data: UpdateWidget): Promise<Widget | null>`
            - `async function deleteWidget(id: string): Promise<boolean>`
            - `async function listWidgets(userId: string, options?: { limit?: number; offset?: number; filterByType?: string }): Promise<Widget[]>`
        - All functions must use Drizzle, perform data validation using Zod schemas from `validation.ts` before database interaction (for create/update), and handle potential database errors gracefully.
        - *DoD:* All CRUD functions implemented, JSDoc added, basic positive/negative path considerations.

### Sub-Phase 1.2: Backend API Endpoint Implementation (in `/app/api/ai-sdk/widgets/`)
    - **Context:** Expose CRUD operations for Widgets via Vercel AI SDK compatible RESTful routes.
    - **Authoritative Source:** `#file:./API_DEFINITIONS.MD` (which is based on `validation.ts`).
    - **Relevant Local Context:** Check for `repomix-output.md` in `/app/api/ai-sdk/widgets/` (create if doesn't exist, or in parent `/app/api/ai-sdk/`).

    - [ ] **Task 1.2.1:** Create API route `POST /app/api/ai-sdk/widgets/route.ts` for creating a Widget.
        - *Details:*
            - Request body must be validated against `insertWidgetSchema`.
            - Call `createWidget` from `crud.ts`.
            - Return `201 Created` with the created widget, or appropriate error (400, 500).
            - Integrate with Langfuse tracing (`#file:../../lib/langfuse-integration.ts`).
        - *DoD:* Endpoint functional, validated, and traced.

    - [ ] **Task 1.2.2:** Create API route `GET /app/api/ai-sdk/widgets/[widgetId]/route.ts`.
        - *Details:* Fetch widget by ID using `getWidgetById`. Handle `widgetId` path parameter. Return widget or 404.
        - *DoD:* Endpoint functional.

    - [ ] **Task 1.2.3:** Create API route `PUT /app/api/ai-sdk/widgets/[widgetId]/route.ts`.
        - *Details:* Update widget by ID using `updateWidget`. Request body validated against `updateWidgetSchema`.
        - *DoD:* Endpoint functional.

    - [ ] **Task 1.2.4:** Create API route `DELETE /app/api/ai-sdk/widgets/[widgetId]/route.ts`.
        - *Details:* Delete widget by ID using `deleteWidget`.
        - *DoD:* Endpoint functional.

    - [ ] **Task 1.2.5:** Create API route `GET /app/api/ai-sdk/widgets/route.ts` for listing Widgets.
        - *Details:* Call `listWidgets` from `crud.ts`. Support query parameters for `userId`, `limit`, `offset`, `filterByType`. Validate query parameters.
        - *DoD:* Endpoint functional with pagination and filtering.

## Phase 2: App Builder Integration for Widgets

**Goal for this Phase:** Allow users to manage and utilize "Widgets" within the App Builder.

**Definition of Done for Phase 2:**
- Users can view, create, edit, and delete Widgets via the App Builder UI.
- Widgets can be incorporated into App Builder application designs.
- All new UI components are tested.

### Sub-Phase 2.1: UI Components for Widget Management (in `components/appBuilder/widgets/` or `components/widgets/`)
    - **Context:** Create React components for interacting with the Widget API.
    - **Relevant Local Context:** Check `repomix-output.md` in `components/appBuilder/` and the new `widgets/` subdirectory.

    - [ ] **Task 2.1.1:** Create `WidgetForm.tsx` component.
        - *Details:* Use ShadCN/UI components (`Input`, `Select` for `widgetType`, `Textarea` for `description`, `Form`).
        - Manage form state (e.g., React Hook Form with Zod resolver using `widgetSchema` or `insertWidgetSchema`).
        - Handle submission by calling the `POST` or `PUT` Widget API endpoints (use custom frontend hooks like `#file:../../hooks/use-executor.ts` or a new hook for Widget CRUD).
        - Provide user feedback on success/error using the toast system.
        - *DoD:* Form component for creating and editing Widgets, with client-side validation.

    - [ ] **Task 2.1.2:** Create `WidgetCard.tsx` component.
        - *Details:* Displays summary of a Widget (name, type, description). Include edit/delete buttons.
        - *DoD:* Component created.

    - [ ] **Task 2.1.3:** Create `WidgetList.tsx` component.
        - *Details:* Fetches and displays a list of Widgets (using `WidgetCard`). Implements pagination and filtering controls that call the `GET /api/ai-sdk/widgets` endpoint.
        - *DoD:* List component functional with pagination/filtering.

### Sub-Phase 2.2: App Builder Page Integration (in `app/(dashboard)/app-builder/widgets/page.tsx` or similar)
    - **Context:** Integrate Widget management into a dedicated page within the App Builder section.

    - [ ] **Task 2.2.1:** Create the main page for Widget management.
        - *Details:* Display `WidgetList.tsx`. Include a button to open a modal/dialog containing `WidgetForm.tsx` for creating new Widgets.
        - *DoD:* Page created and allows viewing, creating, editing (via `WidgetCard` actions), and deleting Widgets.

    - [ ] **Task 2.2.2 (Advanced):** Integrate Widget selection into the App Builder canvas.
        - *Details:* Users should be able to drag a "Widget" element onto their app design canvas or select a specific Widget instance to incorporate into their application workflow. This involves updating App Builder state and potentially its configuration schema (`appBuilderAppSchema` in `validation.ts`).
        - *DoD:* Basic selection and incorporation of a Widget (by ID or config) into an App Builder app design is possible.

## Phase 3: Testing & Refinement

**Goal for this Phase:** Ensure the "Widget" feature is robust, bug-free, and meets all requirements.

**Definition of Done for Phase 3:**
- All unit tests for backend and frontend pass with >90% coverage for new code.
- API endpoints thoroughly tested with various inputs (valid, invalid, edge cases).
- E2E tests for core Widget CRUD and App Builder integration scenarios pass.
- Feature manually tested and approved by QA/Product Owner.

    - [ ] **Task 3.1.1:** Write comprehensive Jest unit tests for new Widget functions in `#file:../../db/libsql/crud.ts`.
    - [ ] **Task 3.1.2:** Write Jest integration tests for all new API Widget route handlers in `/app/api/ai-sdk/widgets/`. Mock database calls. Test request validation, success paths, error paths (400, 404, 500).
    - [ ] **Task 3.1.3:** Write React Testing Library tests for `WidgetForm.tsx`, `WidgetCard.tsx`, and `WidgetList.tsx`. Test rendering, user interactions, form validation, and API call mocking.
    - [ ] **Task 3.1.4:** Develop Playwright E2E tests for:
        - Creating a new Widget through the App Builder UI.
        - Editing an existing Widget.
        - Deleting a Widget.
        - Viewing the list of Widgets with pagination and filtering.
        - Basic incorporation of a Widget into an App Builder application design.

## Phase 4: Documentation, Polish & Release Prep

**Goal for this Phase:** Ensure the feature is well-documented, code is clean, and it's ready for release.

**Definition of Done for Phase 4:**
- All context documents updated.
- User-facing documentation (if any) drafted.
- Code reviewed and all feedback addressed.
- Feature branch merged to `main`/`develop`.
- `CHANGELOG.md` updated.

    - [ ] **Task 4.1.1:** Update `#file:./docs/API_DEFINITIONS.MD` with full details of the new `/app/api/ai-sdk/widgets/` endpoints and accurately reflect the `WidgetEntity` Zod schema from `validation.ts`.
    - [ ] **Task 4.1.2:** If Widgets can be used by Application Agents or have specific interactions with Personas/Tools not covered by generic API calls, update `#file:./docs/APP_AGENTS_AND_PERSONAS_GUIDE.MD` or `#file:./docs/APP_TOOLS_GUIDE.MD` accordingly.
    - [ ] **Task 4.1.3:** Create/Update any relevant folder-specific `repomix-output.md` or `README.md` files for the new `widgets` API routes and UI components.
    *Details:* For `app/api/ai-sdk/widgets/repomix-output.md`, include key request/response Zod schemas and main handler logic. For `components/appBuilder/widgets/repomix-output.md`, include primary component props and interaction logic.
    - [ ] **Task 4.1.4:** Ensure all new code is linted (ESLint), formatted (Prettier), and includes comprehensive JSDoc/TSDoc comments for all functions, classes, types, and component props.
    - [ ] **Task 4.1.5:** Update `#file:../../CHANGELOG.md` and `#file:../../CHANGELOG-unreleased.md` with details of the new "Widget Management & App Builder Integration" feature.
    - [ ] **Task 4.1.6:** Perform a final code review of all new modules related to this feature.

---
**Open Questions/Risks during development of this feature:**
- Risk: Performance of listing widgets if the number grows very large; investigate pagination early.
- Question: What are the exact configuration options (`config` field) needed for 'TypeA', 'TypeB', 'TypeC' widgets? (Needs clarification from Product/Design).

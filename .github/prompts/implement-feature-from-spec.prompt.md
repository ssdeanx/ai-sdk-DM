---
description: 'Guides Copilot Agent to implement a new feature based on a detailed specification document, leveraging all relevant project context (ai-sdk-dm). Emphasizes planning, adherence to data contracts, use of existing frameworks (agents, tools, personas), and iterative review.'
mode: 'agent'
# tools: ["file_readFile", "file_writeFile", "code_lintFileContent", "code_formatFileContent", "code_runTests", "code_runLint", "code_runPrettier", "code_runTypeCheck", "code_runBuild", "code_runE2ETests"]
---

# Task: Implement New Feature from Specification

**Objective:** You are GitHub Copilot Agent, acting as a **Lead Full-Stack Developer** for the `ai-sdk-dm` project. Your task is to implement a new feature as detailed in the provided specification document. You must meticulously plan your approach, leverage all existing project context and frameworks, and implement the feature in an iterative manner, seeking clarification or presenting plans before significant code generation.

**Key Context Documents for Your Implementation (Consult These Meticulously & Comprehensively):**

- **Feature Specification (User Provided):** `#file:{{SPECIFICATION_FILE_PATH}}` (This is the primary driver for the feature)
- Global Project & Copilot Instructions: [`#file:../../.github/copilot-instructions.md`](#file:../../.github/copilot-instructions.md) (For overall project context and Copilot's role)
- Detailed Project Bible: [`#file:../../.github/docs/PROJECT_CONTEXT.MD`](#file:../../.github/docs/PROJECT_CONTEXT.MD) (For architecture, tech stack, conventions)
- API Definitions & Data Contracts: [`#file:../../.github/docs/API_DEFINITIONS.MD`](#file:../../.github/docs/API_DEFINITIONS.MD) (Crucial: **Authoritative Zod schemas are in `#file:../../db/libsql/validation.ts`**)
- Application Agents & Personas Guide: [`#file:../../.github/docs/APP_AGENTS_AND_PERSONAS_GUIDE.MD`](#file:../../.github/docs/APP_AGENTS_AND_PERSONAS_GUIDE.MD) (If the feature involves creating or using application agents/personas)
- Application Tools Guide: [`#file:../../.github/docs/APP_TOOLS_GUIDE.MD`](#file:../../.github/docs/APP_TOOLS_GUIDE.MD) (If the feature involves creating or using application tools)
- Task Structuring Examples (for your own internal planning): [`#file:../../.github/docs/TASKS_EXAMPLES.MD`](#file:../../.github/docs/TASKS_EXAMPLES.MD)
- Changelog (for context on recent project evolution): [`#file:../../CHANGELOG.md`](#file:../../CHANGELOG.md)
- Package Versions: [`#file:../../package.json`](#file:../../package.json)
- **Local Context:** For any specific module you touch, **you MUST check for and prioritize `repomix-output.md`, `repomix-output.txt.md`, or `README.MD` files in that module's directory or its parent** for highly localized, specialized guidance.

**User-Provided Parameters for this Task:**

- **`SPECIFICATION_FILE_PATH`:** (string) The full path to the Markdown file detailing the new feature's specifications, user stories, requirements, and acceptance criteria.
- **`PRIMARY_FOCUS_AREAS`:** (string, optional, comma-separated) Any specific areas of the specification the user wants you to prioritize or pay special attention to (e.g., "backend API endpoints," "frontend UI for App Builder integration," "data model changes").
- **`DESIRED_APPLICATION_PERSONA_ID_FOR_FEATURE`:** (string, optional) If this feature should embody or be primarily used by a specific application persona (from `lib/agents/personas/`), provide its ID.
- **`KEY_ACCEPTANCE_CRITERIA_HIGHLIGHTS`:** (string, optional) A few critical acceptance criteria from the specification document that absolutely must be met.

**Chain-of-Thought (CoT) - Your Mandated Step-by-Step Implementation Process:**

**Phase 1: Deep Understanding, Planning & Design Proposal**

1.  **Thoroughly Analyze Specification & Context:**
    - Read and deeply understand the entire content of [`#file:{{SPECIFICATION_FILE_PATH}}`](#file:{{SPECIFICATION_FILE_PATH}}).
    - Cross-reference requirements with all key context documents listed above to understand how this new feature fits into the existing architecture, data models, and UI/UX patterns.
    - Identify all affected areas of the codebase (frontend, backend, database, `lib/` modules).
2.  **Detailed Implementation Plan & Design Outline:**
    - Create a comprehensive, step-by-step implementation plan (similar in structure to examples in `#file:../../.github/docs/TASKS_EXAMPLES.MD`). This plan should cover:
      - **Data Model Changes:** Any new Zod schemas or modifications to existing ones in `#file:../../db/libsql/validation.ts`. Any Drizzle schema changes in `#file:../../db/libsql/schema.ts` and necessary migrations.
      - **Backend API Changes/Additions:** New routes in `/app/api/ai-sdk/`, modifications to existing ones. Detail request/response structures (linking to Zod schemas).
      - **Core Logic Implementation:** Changes to `lib/ai-sdk-integration.ts`, or new services/utilities in `lib/`. If application agents/tools/personas are involved, detail their creation or modification, referencing the relevant guides.
      - **Frontend UI Changes/Additions:** New Next.js pages, React components (ShadCN/UI based), custom hooks (e.g., extending `useExecutor.ts`), state management considerations.
      - **Testing Strategy:** Outline for unit, integration, and E2E tests for the new feature.
      - **Documentation Updates:** Note which context documents (`API_DEFINITIONS.MD`, etc.) will need updating.
    - For any significant new components or architectural decisions within the feature, briefly outline your proposed design.
3.  **Identify Potential Challenges & Ask Clarifying Questions:**
    - Based on your analysis, list any potential challenges, ambiguities in the specification, or technical trade-offs you foresee.
    - Formulate specific clarifying questions for the user if requirements are unclear _after consulting all documentation_.
4.  **Present Plan, Design Outline, and Questions:**
    - Output your detailed implementation plan, design outline (for major new parts), and any clarifying questions in clear Markdown.
    - **WAIT for user approval and answers before proceeding to code implementation.**

**Phase 2: Iterative Implementation (Based on Approved Plan)**

1.  **Implement in Logical Chunks:** Based on the user-approved plan, implement the feature one logical section or sub-phase at a time (e.g., data model first, then backend API, then frontend).
2.  **Adhere Strictly to "Source of Truth" and Project Standards:**
    - All data structures **MUST** use types derived from Zod schemas in `#file:../../db/libsql/validation.ts`.
    - All API interactions **MUST** conform to `#file:../../.github/docs/API_DEFINITIONS.MD`.
    - All application agent/persona/tool development **MUST** follow `#file:../../.github/docs/APP_AGENTS_AND_PERSONAS_GUIDE.MD` and `#file:../../.github/docs/APP_TOOLS_GUIDE.MD`.
    - Follow global and local coding conventions, error handling, logging, and testing patterns.
3.  **Provide Code & Explanation:**
    - For each implemented chunk, provide the generated/modified code (e.g., diffs or full file content for new files).
    - Briefly explain the changes made and how they align with the plan and specifications.
4.  **Iterative Feedback & Refinement:**
    - After each significant chunk, pause and present your work. Explicitly ask for user review and feedback (e.g., "Here is the implementation for the backend API endpoints for XYZ. Please review. Does this meet the requirements from section 3.2 of the specification?").
    - Incorporate user feedback before moving to the next chunk.

**Phase 3: Testing & Documentation**

1.  **Generate Unit/Integration Tests:**
    - As you implement logic, generate corresponding unit tests (Jest for backend, React Testing Library for frontend) aiming for high coverage (>85-90%) of new code.
    - Generate integration tests for API endpoints or key service interactions.
2.  **Update Context Documents:**
    - Draft updates for `API_DEFINITIONS.MD`, `APP_AGENTS_AND_PERSONAS_GUIDE.MD`, `APP_TOOLS_GUIDE.MD` if new APIs, agents, personas, or tools were created or significantly modified.
    - Update relevant folder-specific `repomix-output.md` or `README.MD` files.
    - Update `#file:../../CHANGELOG.md` and `#file:../../CHANGELOG-unreleased.md`.
3.  **Suggest E2E Test Scenarios:**
    - Based on the feature, propose key end-to-end scenarios that should be tested (manually or with Playwright).

**Phase 4: Final Review & Completion Summary**

1.  **Present All Artifacts:**
    - List all new/modified files with links or content.
    - Summarize the completed feature against the original specification.
2.  **Self-Correction/Code Smell Check:**
    - Perform a final review of all new code for any obvious code smells (see "Code Smell" types in `analyze-code-smells.prompt.md` if available, or general best practices). Suggest improvements if any are found.
3.  **Confirm All Acceptance Criteria Met:**
    - Explicitly state how the implementation meets the key acceptance criteria from the specification (and `{{KEY_ACCEPTANCE_CRITERIA_HIGHLIGHTS}}`).

---

**Copilot, when this prompt is invoked with a `{{SPECIFICATION_FILE_PATH}}`, please begin with Phase 1: Deep Understanding, Planning & Design Proposal. Present your detailed plan and any clarifying questions before generating any implementation code.**

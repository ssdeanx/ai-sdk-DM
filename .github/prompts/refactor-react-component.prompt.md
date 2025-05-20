---
description: 'Guides Copilot Agent to act as a Senior Frontend Specialist to analyze and refactor a specified React/TypeScript component for performance, readability, maintainability, and adherence to ai-sdk-dm project best practices. Incorporates Chain-of-Thought for analysis and refactoring, and awareness of common code smells.'
mode: 'agent'
# tools: ["file_readFile", "file_writeFile", "code_lintFileContent", "semantic_searchCodeExamples"]
---

# Task: Refactor React Component for Performance & Best Practices

**Objective:** You are GitHub Copilot Agent, embodying the persona of a **Senior Frontend Performance & Best Practices Specialist** deeply familiar with the `ai-sdk-dm` project. Your mission is to analyze the specified React/TypeScript component, identify areas for improvement, and refactor it to enhance performance, readability, and maintainability, while strictly adhering to all project-defined conventions and data contracts.

**Key Context Documents for Your Analysis & Actions (Consult These Thoroughly Before Starting):**

- Global Project & Copilot Instructions: `#file:../../.github/copilot-instructions.md` (for global coding conventions, error handling philosophy)
- Detailed Project Bible: `#file:../../.github/docs/PROJECT_CONTEXT.MD` (for frontend architecture, state management patterns, custom hook usage like `useExecutor.ts`, UI component library (ShadCN/UI), and Tailwind CSS conventions)
- API Definitions & Data Contracts: `#file:../../.github/docs/API_DEFINITIONS.MD` (especially if the component interacts with backend APIs; refer to Zod schemas in `#file:../../db/libsql/validation.ts` for payload structures)
- Application Tools Guide (if component uses UI-facing app tools): `#file:../../.github/docs/APP_TOOLS_GUIDE.MD`
- Changelog (for recent related changes that might affect this component): `#file:../../CHANGELOG.md`
- Package Versions (for library-specific optimizations, e.g., React, Next.js, Zustand, date libraries): `#file:../../package.json`\*
  **Local Context:** Before modifying, **you MUST check for any `repomix-output.md`, `repomix-output.txt.md`, or `README.md` file within the component's directory or its immediate parent directory.** These local files provide highly specific context or instructions for this module that supersede or specialize global guidelines.

**User-Provided Parameters for this Task (You will be prompted for these if not supplied when this prompt is run):**

- **`COMPONENT_FILE_PATH`:** (string) The full path to the React/TypeScript component file that needs refactoring (e.g., `components/dashboard/ComplexDataChart.tsx`).
- **`SPECIFIC_PERFORMANCE_CONCERNS`:** (string, optional) Any known performance issues or areas the user wants you to focus on (e.g., "Component re-renders too frequently when parent state changes," "Initial data processing in `useEffect` is blocking the main thread," "Users report lag when interacting with the date range filter").
- **`KEY_REFACTORING_GOALS`:** (string, optional) Specific refactoring objectives from the user (e.g., "Migrate local state for X and Y to use our project's Zustand store for shared dashboard state (see patterns in `PROJECT_CONTEXT.MD`)," "Replace custom `fetchData` logic with the standard `#file:../../hooks/use-executor.ts` hook," "Improve memoization of the `calculateDerivedData` function," "Ensure all event handlers are correctly using `useCallback` with proper dependencies.").
- **`TARGET_PERFORMANCE_METRICS`:** (string, optional) Any target metrics if applicable (e.g., "Reduce Web Vitals LCP for this component by X ms," "Ensure interaction latency for filter changes is below Y ms").

**Chain-of-Thought (CoT) - Your Mandated Step-by-Step Process:**

**Phase 1: Deep Analysis & Planning (Present this plan to the user before making code changes)**

1.  **Thoroughly Read and Understand Component & Context:**

    - Access and analyze the content of the component at `#file:{{COMPONENT_FILE_PATH}}`.
    - Cross-reference with all key context documents listed above, especially `PROJECT_CONTEXT.MD` for architectural patterns (e.g., state management with Zustand, data fetching with `useExecutor.ts`, ShadCN/UI usage) and `API_DEFINITIONS.MD` if the component interacts with backend APIs (validating against Zod schemas from `#file:../../db/libsql/validation.ts`).
    - Identify:
      - Props: Their types, how they are used, and if they cause unnecessary re-renders.
      - State Management: Local `useState`/`useReducer`, React Context, or global stores (e.g., Zustand).
      - Data Fetching: How data is fetched (e.g., `useEffect` with `fetch`, custom hooks, `@ai-sdk/react` action hooks if applicable to this component type). Check for correct dependency arrays.
      - Event Handlers: Identify all event handlers and check for proper memoization (`useCallback`) and efficient logic.
      - Effects (`useEffect`, `useLayoutEffect`): Analyze their dependencies, cleanup functions, and potential for causing performance issues or infinite loops.
      - Rendering Logic: Identify any complex or expensive computations happening directly in the render path.
      - List Rendering: Check for correct usage of `key` props and memoization of list items if they are complex components.
      - Library Usage: Note versions of React, Next.js, and other relevant frontend libraries from `#file:../../package.json` for version-specific best practices.

2.  **Identify Code Smells & Performance Bottlenecks:**

    - **Performance Issues (address `{{SPECIFIC_PERFORMANCE_CONCERNS}}` first):**
      - **Unnecessary Re-renders:** Use your understanding of React's rendering lifecycle. Look for props changing unnecessarily, functions being redefined on every render without `useCallback`, objects/arrays being created inline in props, or inefficient context usage.
      - **Expensive Computations:** Identify functions or calculations within the render method or `useEffect` hooks that could be costly. Suggest `useMemo` for these.
      - **Large Component Size/Bundle Impact:** Note if the component imports unusually large libraries or has a very large amount of its own code that could be split.
      - **Inefficient Data Structures/Algorithms:** If the component processes data, look for suboptimal algorithms or data structures.
      - **DOM Manipulations:** If any direct DOM manipulation is happening, question its necessity in a React context.
    - **General Code Smells & Maintainability Issues:**
      - **Prop Drilling:** Identify if props are being passed down through many intermediate components.
      - **Bloated Component:** Is the component doing too much? Could it be broken down into smaller, more focused components?
      - **Inconsistent Naming/Styling:** Check against conventions in `PROJECT_CONTEXT.MD` or global instructions.
      - **Poor Readability:** Complex conditional rendering, deeply nested JSX, unclear variable names.
      - **Improper Error Handling:** Especially for API calls or complex logic.
      - **Outdated Patterns:** Use of older React patterns if newer, more efficient ones are standard in the project (e.g., class components vs. functional components with hooks).
      - **Accessibility Issues (Basic Check):** Missing `alt` tags, improper ARIA attributes if obvious.
      - **TypeScript `any` Usage:** Flag any usage of `any` and suggest more specific types, potentially derived from Zod schemas in `validation.ts` if data-related.

3.  **Formulate a Refactoring Plan:**

    - Based on the analysis, create a detailed, step-by-step refactoring plan.
    - Prioritize addressing the `{{SPECIFIC_PERFORMANCE_CONCERNS}}` and `{{KEY_REFACTORING_GOALS}}` provided by the user.
    - For each identified issue, propose a specific solution (e.g., "Wrap `MyListItem` with `React.memo`," "Memoize `filteredData` using `useMemo` with dependencies [X, Y]," "Extract data fetching logic into a custom hook using `useExecutor.ts`," "Refactor conditional rendering of `SectionA` and `SectionB` for clarity using early returns or a dedicated sub-component.").
    - Specify which project patterns or libraries should be used for the refactoring (e.g., "Use Zustand store `dashboardStore` for managing `sharedFilterState`").
    - Outline any new helper functions or smaller components that might need to be created as part of the refactoring.
    - Consider the testing implications: what existing tests might break, and what new tests will be needed?

4.  **Present Analysis and Plan:**
    - Output your detailed analysis of the component's current state, identified issues (code smells, performance bottlenecks), and your proposed step-by-step refactoring plan in clear Markdown.
    - **Wait for user confirmation/feedback on the plan before proceeding to Phase 2.**

**Phase 2: Code Refactoring (Iterative, based on approved plan)**

1.  **Implement Refactoring Steps:**
    - Based on the user-approved plan, implement the refactoring changes one logical step or section at a time.
    - For each significant change, briefly explain what you did and why in a comment or as part of the interaction.
    - **Provide diffs or the complete refactored code for `#file:{{COMPONENT_FILE_PATH}}` after each major step or a logical group of changes.**
2.  **Adhere to Project Standards:**
    - Strictly follow coding conventions, type safety (using Zod-derived types where applicable), and error handling patterns defined in `PROJECT_CONTEXT.MD` and global instructions.
    - Ensure all new or modified code is well-commented (JSDoc/TSDoc).
3.  **Testing Considerations:**
    - As you refactor, note any existing unit tests that need updating.
    - If the plan included creating new tests, generate stubs or initial implementations for these tests.
4.  **Iterative Feedback:**
    - After presenting a set of changes, explicitly ask for user feedback (e.g., "Here is the refactored data fetching logic. Please review. Shall I proceed with memoizing the rendering of list items?").

**Phase 3: Final Review & Summary**

1.  **Final Code Presentation:**
    - Provide the complete, final refactored code for the component file path
    - If new helper files/components were created, provide their content as well.
2.  **Summary of Changes:**
    - List all significant changes made.
    - Explain how these changes address the initial performance concerns and refactoring goals.
    - Highlight any improvements in readability, maintainability, or performance.
3.  **Testing Recommendations:**
    - Suggest specific unit tests or integration tests that should be written or updated to cover the refactored code.
    - If possible, generate Jest/React Testing Library test stubs for these.
4.  **Potential Follow-up Actions:**
    - Note any further optimizations or refactoring that might be beneficial but were outside the scope of this task.

**Few-Shot Example (Illustrative - to be included in your prompt to the LLM if a specific pattern needs to be shown):**

- _(If a specific refactoring goal is, for example, to always use a custom error boundary)_
  // --- Few-Shot Example: Error Boundary Usage ---
  // BAD (Old Pattern):
  // try { /_ api call _/ } catch (e) { setLocalError('Failed'); }
  // GOOD (Project Pattern):
  // <ProjectErrorBoundary fallback={<p>Something went wrong</p>}>
  // <ComponentThatMightThrow />
  // </ProjectErrorBoundary>
  // Ensure new components that fetch data or perform risky operations are wrapped similarly.

---

**Copilot, please begin with Phase 1, Step 1: Understand Component & Context. Once you have analyzed the component and the provided context documents, present your findings and your proposed refactoring plan (Phase 1, Step 4) before making any code changes.**

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
- **Types**: Prefer TypeScript interfaces/types over any. Export types from dedicated type files
- **Naming**: Use camelCase for variables/functions, PascalCase for components/interfaces
- **Error Handling**: Use try/catch blocks and proper error typing in async functions
- **Components**: Use named exports and functional components with proper type definitions
- **State Management**: Prefer React hooks and custom hooks for shared functionality

## Project Structure

- Next.js App Router architecture with App Directory pattern
- Uses AI SDK for integrations with LLM models, tools, and agents
- Fullstack TypeScript with React 19 and Next.js 15

# AI SDK Integration

This document provides an overview of the AI SDK integration in our application, including how to use the various components, API routes, and tools.

## Overview

The AI SDK integration provides a unified interface for working with multiple AI providers (Google, OpenAI, Anthropic), tools, and tracing systems. It includes:

- API routes for chat, agents, tools, and threads
- Tracing and observability with Langfuse
- Memory management with LibSQL
- Tool execution and management
- Agent execution and management

## API Routes

### Chat

- `POST /api/chat/ai-sdk`: Main chat endpoint for AI SDK UI
- `GET /api/ai-sdk/threads`: List all chat threads
- `POST /api/ai-sdk/threads`: Create a new chat thread
- `GET /api/ai-sdk/threads/[id]`: Get a specific thread
- `PATCH /api/ai-sdk/threads/[id]`: Update a thread
- `DELETE /api/ai-sdk/threads/[id]`: Delete a thread
- `GET /api/ai-sdk/threads/[id]/messages`: Get messages for a thread
- `POST /api/ai-sdk/threads/[id]/messages`: Add a message to a thread

### Agents

- `GET /api/ai-sdk/agents`: List all agents
- `POST /api/ai-sdk/agents`: Create a new agent
- `POST /api/ai-sdk/agents/[id]/run`: Run an agent

### Tools

- `GET /api/ai-sdk/tools`: List all available tools
- `POST /api/ai-sdk/tools`: Create a new custom tool
- `POST /api/ai-sdk/tools/execute`: Execute a tool

## Components

### AI SDK Chat

The AI SDK Chat component (`components/chat/ai-sdk-chat.tsx`) provides a rich chat interface with:

- Thread management
- Message history
- File attachments
- Voice input
- Function calling
- Model configuration
- Tool selection

### AI SDK Tracing

The AI SDK Tracing module (`lib/ai-sdk-tracing.ts`) provides comprehensive tracing and observability for AI SDK operations, including:

- Trace creation and management
- Span creation and management
- Event logging
- Generation tracking
- Error handling

### AI SDK Integration

The AI SDK Integration module (`lib/ai-sdk-integration.ts`) provides a unified interface for working with the AI SDK, including:

- Tool management
- Text streaming
- Text generation
- Provider management

## Usage Examples

### Chat

```typescript
// Stream a chat response
const response = await fetch('/api/chat/ai-sdk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello, how are you?' }
    ],
    model: 'gemini-pro',
    temperature: 0.7,
    maxTokens: 1024,
    tools: []
  })
});

// Create a new thread
const thread = await fetch('/api/ai-sdk/threads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'New Chat'
  })
});
```

### Agents

```typescript
// Run an agent
const response = await fetch(`/api/ai-sdk/agents/${agentId}/run`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    input: 'What is the weather in New York?',
    threadId: 'optional-thread-id'
  })
});

// Create a new agent
const agent = await fetch('/api/ai-sdk/agents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Weather Agent',
    description: 'An agent that can check the weather',
    modelId: 'gemini-pro',
    toolIds: ['weather', 'web-search'],
    systemPrompt: 'You are a helpful weather assistant.'
  })
});
```

### Tools

```typescript
// Execute a tool
const result = await fetch('/api/ai-sdk/tools/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    toolName: 'weather',
    parameters: {
      location: 'New York'
    }
  })
});

// Create a custom tool
const tool = await fetch('/api/ai-sdk/tools', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'custom-tool',
    description: 'A custom tool',
    parametersSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Input for the tool'
        }
      },
      required: ['input']
    }
  })
});
```

## Integration with Existing Systems

The AI SDK integration works seamlessly with existing systems:

- **Memory**: Uses the existing LibSQL-based memory system for thread and message storage
- **Tracing**: Integrates with Langfuse for comprehensive tracing and observability
- **Tools**: Works with existing built-in tools, custom tools, and agentic tools
- **Models**: Supports Google AI, OpenAI, and Anthropic models

## Configuration

The AI SDK integration can be configured through environment variables:

```
# Google AI
GOOGLE_API_KEY=your-google-api-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key

# Langfuse (for tracing)
LANGFUSE_PUBLIC_KEY=your-langfuse-public-key
LANGFUSE_SECRET_KEY=your-langfuse-secret-key
LANGFUSE_HOST=https://cloud.langfuse.com
```

## Database Schema

The AI SDK integration uses the following database tables:

- `memory_threads`: Stores chat threads
- `messages`: Stores messages for threads
- `agents`: Stores agent configurations
- `tools`: Stores tool configurations
- `agent_tools`: Maps tools to agents
- `tool_executions`: Logs tool executions

## Security Considerations

- API keys are never exposed to the client
- All API routes include proper error handling
- Database queries are parameterized to prevent SQL injection
- Input validation is performed on all API routes
- Tracing includes sensitive data redaction

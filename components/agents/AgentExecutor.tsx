'use client';

import type React from 'react';

// Use canonical types from types/libsql and types/supabase
import type { Message as CanonicalMessage } from '@/lib/shared/types/libsql';
import type { Agent as CanonicalAgent, Tool } from '@/lib/shared/types/supabase';
import { generateId } from 'ai';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAgentExecutor } from '@/lib/shared/hooks/use-executor';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { useSupabaseCrud } from '@/lib/shared/hooks/use-supabase-crud';
import { useSupabaseRealtime } from '@/lib/shared/hooks/use-supabase-realtime';

/**
 * Renders the result of a tool call, using a local mapping or fallback pretty-print.
 * @param toolResult - The result returned by the tool.
 * @param toolCall - The tool call info (name, parameters).
 * @param tools - List of tools fetched from the database.
 */
function ToolResultRenderer({
  toolResult,
  toolCall,
  tools,
}: {
  toolResult: string | null | undefined;
  toolCall?: { name: string };
  tools: Tool[];
}): React.ReactElement | null {
  if (!toolResult || !toolCall?.name) return null;
  // Find the tool definition by name
  const tool = tools.find((t) => t.name === toolCall.name);
  // Local custom renderers by tool name (extend as needed)
  const customRenderers: Record<
    string,
    (result: unknown, tool: Tool) => React.ReactElement
  > = {
    // Example: 'my-special-tool': (result, tool) => <div>Custom: {result}</div>,
  };
  if (tool && customRenderers[tool.name]) {
    return customRenderers[tool.name](toolResult, tool);
  }
  // Fallback: pretty-print JSON with tool metadata
  return (
    <div className="mt-2 p-2 border rounded-md bg-background/80">
      <div className="text-xs font-medium mb-1">
        Tool result from <b>{toolCall.name}</b>:
      </div>
      {tool && (
        <div className="text-xs mb-1 text-muted-foreground">
          <span className="font-semibold">Description:</span> {tool.description}
        </div>
      )}
      <div className="text-xs overflow-x-auto">
        <pre className="text-xs">{JSON.stringify(toolResult, null, 2)}</pre>
      </div>
    </div>
  );
}

// UI extension of canonical types
export type Message = CanonicalMessage & {
  toolCall?: {
    name: string;
    parameters: Record<string, unknown>;
  };
  toolResult?: string | null;
};

export type AgentExecutorProps = {
  agent: CanonicalAgent & {
    // Optionally allow UI fields for display, but not required by canonical type
    tool_ids?: string[];
    tools?: string[];
    model?: string;
  };
  onExecutionComplete?: (messages: Message[]) => void;
};

export function AgentExecutor({
  agent,
  onExecutionComplete,
}: AgentExecutorProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateId(),
      memory_thread_id: 'ui-thread',
      created_at: new Date().toISOString(),
      role: 'assistant',
      content: `Hello! I'm ${agent.name}. How can I help you today?`,
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add hooks for CRUD and realtime (for future extensibility)
  const agentCrud = useSupabaseCrud({ table: 'agents' });
  const toolCrud = useSupabaseCrud({ table: 'tools' });
  const [tools, setTools] = useState<Tool[]>([]);
  useSupabaseRealtime({ table: 'agents', event: '*', enabled: true });

  // Use our custom hook for agent execution
  const { executeAgent, isExecuting } = useAgentExecutor({
    agentId: agent.id,
    onError: () => {
      // Add an error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content:
            'Sorry, I encountered an error while processing your request.',
          id: generateId(),
          memory_thread_id: 'ui-thread',
          created_at: new Date().toISOString(),
        },
      ]);
    },
  });

  // Fetch tools from the database
  useEffect(() => {
    if (toolCrud && toolCrud.fetchAll) {
      toolCrud.fetchAll().then((data) => {
        if (Array.isArray(data)) setTools(data as Tool[]);
      });
    }
  }, [toolCrud]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // agentCrud: log the number of agents in the table
  useEffect(() => {
    async function fetchAgentsCount() {
      if (agentCrud && agentCrud.fetchAll) {
        try {
          const agents = await agentCrud.fetchAll();
          // This is just to ensure agentCrud is used
          // You can replace this with any real logic as needed
          // eslint-disable-next-line no-console
          console.log(
            'Agent count:',
            Array.isArray(agents) ? agents.length : agents
          );
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch agents:', e);
        }
      }
    }
    fetchAgentsCount();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isExecuting) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      id: generateId(),
      memory_thread_id: 'ui-thread',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const data = await executeAgent(input, [...messages, userMessage]);
      if (
        typeof data === 'object' &&
        data &&
        'role' in data &&
        'content' in data
      ) {
        setMessages((prev) => [...prev, data as Message]);
        if (onExecutionComplete) {
          onExecutionComplete([...messages, userMessage, data as Message]);
        }
      }
    } catch (error) {
      await upstashLogger.error(
        'AgentExecutor',
        'Error executing agent',
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { error: String(error) }
      );
      // Error handling is done in the hook
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Bot className="mr-2 h-5 w-5" />
            {agent.name}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{agent.model || 'Unknown Model'}</Badge>
            {agent.tools && agent.tools.length > 0 && (
              <Badge variant="secondary">{agent.tools.length} Tools</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full max-h-[500px] p-4">
          <div className="space-y-4">
            {messages.map((message: Message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {message.role === 'user'
                        ? 'U'
                        : message.role === 'system'
                          ? 'S'
                          : 'A'}
                    </AvatarFallback>
                    <AvatarImage
                      src={
                        message.role === 'user'
                          ? '/placeholder.svg?height=32&width=32'
                          : '/placeholder.svg?height=32&width=32&text=AI'
                      }
                    />
                  </Avatar>
                  <div
                    className={`mx-2 rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.role === 'system'
                          ? 'bg-muted/50 border'
                          : 'bg-muted'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">
                      {message.content?.toString() || ''}
                    </div>
                    {message.toolCall && (
                      <div className="mt-2 p-2 border rounded-md bg-background/80">
                        <div className="text-xs font-medium mb-1">
                          Using tool: {message.toolCall.name}
                        </div>
                        <div className="text-xs overflow-x-auto">
                          <pre className="text-xs">
                            {JSON.stringify(
                              message.toolCall.parameters,
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      </div>
                    )}
                    {message.toolResult && (
                      <ToolResultRenderer
                        toolResult={message.toolResult}
                        toolCall={message.toolCall}
                        tools={tools}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            {isExecuting && (
              <div className="flex justify-start">
                <div className="flex max-w-[80%]">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>A</AvatarFallback>
                    <AvatarImage src="/placeholder.svg?height=32&width=32&text=AI" />
                  </Avatar>
                  <div className="mx-2 rounded-lg p-3 bg-muted">
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t p-3">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isExecuting}
            className="flex-1"
          />
          <Button type="submit" disabled={isExecuting || !input.trim()}>
            {isExecuting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

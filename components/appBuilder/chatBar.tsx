'use client';

import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useChat, Message as AIChatMessage } from '@ai-sdk/react'; // Import useChat and Message type
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';

// Re-export Message type for external use if needed, or align with AI SDK's type
export type Message = AIChatMessage;

/**
 * Props for the ChatBar component.
 */
export interface ChatBarProps {
  /**
   * API endpoint for the AI SDK chat route.
   * Defaults to '/api/ai-sdk/chat'.
   */
  apiEndpoint?: string;

  /**
   * Initial messages to populate the chat.
   */
  initialMessages?: Message[];

  /**
   * Model ID for the AI SDK.
   */
  modelId?: string;

  /**
   * Provider for the AI SDK.
   */
  provider?: string;

  /**
   * System prompt for the AI SDK.
   */
  systemPrompt?: string;

  /**
   * Tools for the AI SDK.
   */
  tools?: string[];

  /**
   * Additional class names for the ChatBar component.
   */
  className?: string;

  /**
   * Callback function triggered when an assistant message is sent.
   */
  onMessageSend?: (assistantMessage: string, fullResponse?: Message) => void;
}

// Remove generateId as AI SDK handles IDs

export function ChatBar({
  apiEndpoint = '/api/ai-sdk/chat', // Default API endpoint for AI SDK
  initialMessages = [],
  modelId,
  provider,
  systemPrompt,
  tools,
  className,
  onMessageSend,
}: ChatBarProps) {
  const { messages, input, handleInputChange, isLoading, append } = useChat({
    api: apiEndpoint,
    initialMessages: initialMessages as AIChatMessage[], // Cast to AI SDK's Message type
    // Pass advanced config if provided
    body: {
      ...(modelId && { modelId }),
      ...(provider && { provider }),
      ...(systemPrompt && { systemPrompt }),
      ...(tools && { tools }),
    },
    onFinish: (message) => {
      // onFinish is called when the assistant message is complete
      if (onMessageSend && message.role === 'assistant') {
        onMessageSend(message.content, message as Message);
      }
    },
    onError: (error) => {
      upstashLogger.error('chatBar', 'AI SDK Chat Error', error);
      // useChat automatically adds error messages to the messages array
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // messages state is now managed by useChat

  // Modify handleSubmit to use append from useChat
  const handleSend = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // useChat's append function sends the user message and handles the assistant response
    await append({
      role: 'user',
      content: input,
    });

    // useChat manages the input state internally, so no need to clear manually here
    // setInput(''); // This line is removed
  };

  return (
    <div className={className}>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-72">
        {messages.map(
          (
            m: AIChatMessage,
            idx: number // Use AIChatMessage type from useChat
          ) => (
            <div
              key={m.id || idx}
              className={`text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              {m.content}
            </div>
          )
        )}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSend}
        className="flex gap-2 items-end p-2 border-t bg-background"
      >
        <Textarea
          value={input} // input state is managed by useChat
          onChange={handleInputChange} // handleInputChange is provided by useChat
          placeholder="Type a message..."
          className="min-h-[40px] max-h-[120px] flex-1 resize-none"
          disabled={isLoading || input.trim() === ''}
          onKeyDown={(e) => {
            // Changed from onKeyPress to onKeyDown
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || input.trim() === ''}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

export default ChatBar;

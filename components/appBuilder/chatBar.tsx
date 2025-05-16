import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatBarProps {
  apiEndpoint?: string;
  initialMessages?: Message[];
  modelId?: string;
  provider?: string;
  systemPrompt?: string;
  tools?: string[];
  className?: string;
  onMessageSend?: (assistantMessage: string, fullResponse?: Message) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ChatBar({
  apiEndpoint = '/api/ai-sdk/chat',
  initialMessages = [],
  modelId = 'gemini-2.0-flash-exp',
  provider = 'google',
  systemPrompt,
  tools = [],
  className,
  onMessageSend,
}: ChatBarProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage: Message = { id: generateId(), role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model: modelId,
          provider,
          systemPrompt,
          tools,
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      // Expecting { role, content } or similar from backend
      const assistantMessage: Message = {
        id: generateId(),
        role: data.role || 'assistant',
        content: data.content || (typeof data === 'string' ? data : ''),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (onMessageSend) onMessageSend(assistantMessage.content, assistantMessage);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'assistant', content: 'Error: ' + (err instanceof Error ? err.message : String(err)) },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-72">
        {messages.map((m: Message, idx: number) => (
          <div key={m.id || idx} className={`text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}>{m.content}</div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 items-end p-2 border-t bg-background">
        <Textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="min-h-[40px] max-h-[120px] flex-1 resize-none"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || input.trim() === ''}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

export default ChatBar;

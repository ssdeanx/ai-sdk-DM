'use client';

import { useState, useRef, useEffect } from 'react';
import { useAssistant, Message } from '@ai-sdk/react';
import {
  Bot, User, Send, Loader2, RefreshCw, XCircle, Paperclip,
  FileText, Code, Mic, Copy, Check, Eraser,
  Maximize2, Minimize2, ThumbsUp, ThumbsDown,
  Zap, Settings, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CodeBlock } from './code-block';
import { MermaidDiagram } from './mermaid-diagram';
import { nanoid } from 'nanoid';

interface OpenAIAssistantChatProps {
  apiEndpoint?: string;
  initialThreadId?: string;
  className?: string;
}

export function OpenAIAssistantChat({
  apiEndpoint = '/api/assistant',
  initialThreadId,
  className,
}: OpenAIAssistantChatProps) {
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // State
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [threadName, setThreadName] = useState('Assistant Chat');

  // Use the AI SDK useAssistant hook
  const {
    messages,
    input,
    handleInputChange,
    status,
    submitMessage,
    error,
    reload,
    stop
  } = useAssistant({
    api: apiEndpoint,
    threadId: initialThreadId,
    onError: (error) => {
      console.error('Assistant error:', error);
    }
  });

  // Derived state
  const isLoading = status === 'in_progress';

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Copy conversation to clipboard
  const copyConversation = () => {
    const text = messages.map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Toggle fullscreen
  const toggleFullScreen = () => {
    setIsFullScreen(prev => !prev);
    // In a real app, you would implement actual fullscreen functionality
  };

  // Handle form submission
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === '') return;
    submitMessage(e);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  // Render content with code blocks
  const renderContent = (content: string) => {
    const parts = [];
    
    // Check for code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(
          <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {content.slice(lastIndex, match.index)}
          </p>
        );
      }

      const language = match[1] || 'plaintext';
      const code = match[2];

      // Handle special code blocks
      if (language === 'mermaid') {
        parts.push(<MermaidDiagram key={`mermaid-${match.index}`} code={code} />);
      } else {
        parts.push(
          <CodeBlock key={`code-${match.index}`} language={language} code={code} />
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {content.slice(lastIndex)}
        </p>
      );
    }

    return parts.length > 0 ? parts : <p className="whitespace-pre-wrap">{content}</p>;
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border rounded-lg overflow-hidden",
      isFullScreen ? "fixed inset-0 z-50" : "relative",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{threadName}</h2>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={copyConversation}>
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCopied ? 'Copied!' : 'Copy conversation'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleFullScreen}>
                  {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg",
                message.role === 'user' ? "bg-muted/50 ml-6" : "bg-primary/5 mr-6"
              )}
            >
              <Avatar className={cn(
                "h-8 w-8",
                message.role === 'user' ? "bg-primary" : "bg-primary/20"
              )}>
                <AvatarFallback>
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                {message.role === 'data' ? (
                  <div>
                    <p className="font-medium">{(message.data as any)?.description || 'Data'}</p>
                    <pre className="bg-muted p-2 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(message.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>{renderContent(message.content)}</div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form ref={formRef} onSubmit={onSubmit} className="relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[60px] w-full resize-none pr-16 py-3"
            disabled={isLoading}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            {isLoading ? (
              <Button type="button" size="icon" variant="ghost" onClick={() => stop()}>
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={input.trim() === ''}>
                <Send className="h-5 w-5" />
              </Button>
            )}
          </div>
        </form>
        {isLoading && (
          <div className="flex items-center justify-center mt-2">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Assistant is thinking...</span>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-between mt-2 p-2 bg-destructive/10 text-destructive rounded">
            <span className="text-sm">Error: {error.message || 'Something went wrong'}</span>
            <Button size="sm" variant="ghost" onClick={reload}>
              <RefreshCw className="h-4 w-4 mr-1" /> Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

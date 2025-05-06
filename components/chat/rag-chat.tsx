'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { Bot, User, Send, Loader2, RefreshCw, XCircle, Search, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CodeBlock } from './code-block';
import { MermaidDiagram } from './mermaid-diagram';

interface RagChatProps {
  apiEndpoint?: string;
  className?: string;
}

export function RagChat({
  apiEndpoint = '/api/chat/rag',
  className,
}: RagChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // State for document retrieval
  const [searchQuery, setSearchQuery] = useState('');
  const [retrievedDocs, setRetrievedDocs] = useState<{
    id: string;
    title: string;
    content: string;
    score: number;
  }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  // Use the AI SDK useChat hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
    reload,
    stop,
    setInput,
  } = useChat({
    api: apiEndpoint,
    body: {
      // Include selected documents in the context
      documents: selectedDocs,
    },
  });

  // Derived state
  const isLoading = status === 'streaming' || status === 'submitted';

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

  // Simulate document retrieval
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    try {
      // Simulate API call to retrieve documents
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock retrieved documents
      const mockDocs = [
        {
          id: '1',
          title: 'Introduction to RAG',
          content: 'Retrieval-Augmented Generation (RAG) is a technique that combines retrieval-based and generation-based approaches for natural language processing tasks.',
          score: 0.92
        },
        {
          id: '2',
          title: 'Implementing RAG with AI SDK',
          content: 'The AI SDK provides tools to easily implement RAG in your applications by connecting to vector databases and document stores.',
          score: 0.85
        },
        {
          id: '3',
          title: 'Advanced RAG Techniques',
          content: 'Advanced RAG techniques include query reformulation, multi-step retrieval, and hybrid search methods.',
          score: 0.78
        }
      ];
      
      setRetrievedDocs(mockDocs);
    } catch (error) {
      console.error('Error searching documents:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle document selection
  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  // Handle form submission
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === '') return;
    handleSubmit(e);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  // Render code blocks with syntax highlighting
  const renderContent = (content: string) => {
    // Check for code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
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
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex-1 flex">
        {/* Document retrieval sidebar */}
        <div className="w-80 border-r p-4 flex flex-col">
          <h3 className="font-medium mb-2">Document Retrieval</h3>
          
          <div className="flex gap-2 mb-4">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !searchQuery.trim()}
              size="icon"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {retrievedDocs.map(doc => (
              <Card 
                key={doc.id} 
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedDocs.includes(doc.id) ? "border-primary" : ""
                )}
                onClick={() => toggleDocSelection(doc.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm">{doc.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{doc.content}</p>
                      <div className="flex items-center mt-1">
                        <div className="text-xs text-muted-foreground">Score: {doc.score.toFixed(2)}</div>
                        {selectedDocs.includes(doc.id) && (
                          <div className="ml-auto text-xs text-primary">Selected</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {retrievedDocs.length === 0 && !isSearching && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Search for documents to include in your chat context
              </div>
            )}
            
            {isSearching && (
              <div className="text-center text-muted-foreground text-sm py-8 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </div>
            )}
          </div>
        </div>
        
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
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
                  className="flex items-start gap-3"
                >
                  {message.role === 'user' ? (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-blue-600 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <Card className={cn('flex-1 p-3', 
                    message.role === 'user' 
                      ? 'bg-muted' 
                      : 'bg-card border-blue-100 dark:border-blue-900'
                  )}>
                    <CardContent className="p-0 space-y-2">
                      {renderContent(message.content)}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3"
              >
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="bg-blue-600 text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <Card className="flex-1 p-3 bg-card border-blue-100 dark:border-blue-900">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3"
              >
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="bg-red-600 text-white">
                    <XCircle className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <Card className="flex-1 p-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <CardContent className="p-0 space-y-2">
                    <p className="font-medium text-red-600 dark:text-red-400">Error</p>
                    <p className="text-sm">{error.message || 'Something went wrong. Please try again.'}</p>
                    <Button variant="outline" size="sm" onClick={() => reload()} className="mt-2">
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <div className="border-t p-4">
            <form ref={formRef} onSubmit={onSubmit} className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="min-h-[60px] max-h-[200px] resize-none"
                disabled={isLoading === true}
              />
              <div className="flex flex-col gap-2">
                {isLoading ? (
                  <Button type="button" variant="destructive" size="icon" onClick={stop}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" size="icon" disabled={input.trim() === ''}>
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

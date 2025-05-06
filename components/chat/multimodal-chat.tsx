'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { 
  Bot, User, Send, Loader2, RefreshCw, XCircle, 
  Image as ImageIcon, Paperclip, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CodeBlock } from './code-block';
import { MermaidDiagram } from './mermaid-diagram';
import { nanoid } from 'nanoid';

interface MultimodalChatProps {
  apiEndpoint?: string;
  className?: string;
}

interface ImageAttachment {
  id: string;
  url: string;
  file: File;
  previewUrl: string;
}

export function MultimodalChat({
  apiEndpoint = '/api/chat/multimodal',
  className,
}: MultimodalChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for image attachments
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
      // Include image attachments in the request
      images: imageAttachments.map(img => ({
        id: img.id,
        url: img.url,
        type: 'image'
      }))
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

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const newAttachments: ImageAttachment[] = [];
      
      Array.from(files).forEach(file => {
        // Check if file is an image
        if (!file.type.startsWith('image/')) return;
        
        const id = nanoid();
        const previewUrl = URL.createObjectURL(file);
        
        // In a real app, you would upload the image to a server and get a URL
        // For this example, we'll use the object URL
        newAttachments.push({
          id,
          url: previewUrl, // In a real app, this would be the URL from your server
          file,
          previewUrl
        });
      });
      
      setImageAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove an image attachment
  const removeImageAttachment = (id: string) => {
    setImageAttachments(prev => {
      const filtered = prev.filter(img => img.id !== id);
      // Revoke object URLs to prevent memory leaks
      const removed = prev.find(img => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return filtered;
    });
  };

  // Handle form submission
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === '' && imageAttachments.length === 0) return;
    
    // Submit the form
    handleSubmit(e);
    
    // Clear image attachments after sending
    setImageAttachments([]);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  // Render content with images and code blocks
  const renderContent = (content: string, messageImages?: { id: string, url: string }[]) => {
    const parts = [];
    
    // Add images if present
    if (messageImages && messageImages.length > 0) {
      parts.push(
        <div key="images" className="flex flex-wrap gap-2 mb-3">
          {messageImages.map(img => (
            <div key={img.id} className="relative rounded-md overflow-hidden border">
              <img src={img.url} alt="Attached image" className="max-w-xs max-h-48 object-contain" />
            </div>
          ))}
        </div>
      );
    }
    
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
    <div className={cn('flex flex-col h-full', className)}>
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
                  {renderContent(
                    message.content,
                    // @ts-ignore - In a real app, you would properly type this
                    message.images
                  )}
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

      {/* Image attachments */}
      {imageAttachments.length > 0 && (
        <div className="border-t p-2">
          <div className="flex flex-wrap gap-2">
            {imageAttachments.map(img => (
              <div key={img.id} className="relative group">
                <div className="w-20 h-20 rounded-md overflow-hidden border">
                  <img src={img.previewUrl} alt="Attachment" className="w-full h-full object-cover" />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImageAttachment(img.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input form */}
      <div className="border-t p-4">
        <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message or upload an image..."
              className="min-h-[60px] max-h-[200px] resize-none"
              disabled={isLoading === true}
            />
            <div className="flex flex-col gap-2">
              {isLoading ? (
                <Button type="button" variant="destructive" size="icon" onClick={stop}>
                  <XCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={input.trim() === '' && imageAttachments.length === 0}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs flex items-center gap-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <ImageIcon className="h-4 w-4" />
              <span>Add image</span>
            </Button>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={isLoading}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

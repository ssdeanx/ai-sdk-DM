'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat, Message } from '@ai-sdk/react';
import {
  Bot, User, Send, Loader2, RefreshCw, XCircle, Paperclip,
  FileText, Code, Mic, Copy, Check, Eraser,
  Maximize2, Minimize2, ThumbsUp, ThumbsDown,
  Zap, Settings, MessageSquare, Image as ImageIcon,
  Terminal, BarChart, Table, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// Import components
import { ImageDisplay } from './image-display';
import { AIImageGenerator } from './ai-image-generator';
import { ComputerUse } from './computer-use';
import { DataVisualization } from './data-visualization';
import { VisualizationWithTracing } from './visualization-with-tracing';
import { DataTable } from './data-table';
import { BrowserDisplay } from './browser-display';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CodeBlock } from './code-block';
import { MermaidDiagram } from './mermaid-diagram';
import { nanoid } from 'nanoid';

interface AiSdkChatProps {
  apiEndpoint?: string;
  initialMessages?: Message[];
  initialThreadId?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  className?: string;
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}



export function AiSdkChat({
  apiEndpoint = '/api/chat',
  initialMessages = [],
  initialThreadId,
  modelId = 'gemini-2.0-flash',
  temperature = 0.7,
  maxTokens = 8192,
  tools = [],
  className,
}: AiSdkChatProps) {
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSpeechRecording, setIsSpeechRecording] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [threadName, setThreadName] = useState('New Chat');
  const [selectedModel, setSelectedModel] = useState(modelId);
  const [selectedTemperature, setSelectedTemperature] = useState(temperature);
  const [selectedMaxTokens, setSelectedMaxTokens] = useState(maxTokens);
  const [enabledTools, setEnabledTools] = useState<string[]>(tools);
  const [isCopied, setIsCopied] = useState(false);

  // Define available tools/functions
  const availableFunctions = {
    'web-search': {
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        required: ['query']
      },
      execute: async (args: { query: string }) => {
        console.log('Searching for:', args.query);
        // In a real implementation, this would call an actual search API
        return `Results for "${args.query}": Found relevant information about this topic.`;
      }
    },
    'weather': {
      description: 'Get current weather information',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city or location'
          }
        },
        required: ['location']
      },
      execute: async (args: { location: string }) => {
        console.log('Getting weather for:', args.location);
        // In a real implementation, this would call a weather API
        return `Weather in ${args.location}: 72°F, Partly Cloudy`;
      }
    },
    'image-generation': {
      description: 'Generate an image based on a description',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Description of the image to generate'
          },
          style: {
            type: 'string',
            description: 'Style of the image (vivid, natural, cinematic, anime, digital-art)',
            enum: ['vivid', 'natural', 'cinematic', 'anime', 'digital-art'],
            default: 'vivid'
          }
        },
        required: ['prompt']
      },
      execute: async (args: { prompt: string, style?: string }) => {
        console.log('Generating image for:', args.prompt, 'with style:', args.style || 'vivid');
        // In a real implementation, this would call an image generation API
        return `<AIImageGenerator prompt="${args.prompt}" style="${args.style || 'vivid'}" />`;
      }
    },
    'computer-use': {
      description: 'Execute a computer task or command',
      parameters: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'The task or command to execute'
          },
          showSteps: {
            type: 'boolean',
            description: 'Whether to show the execution steps',
            default: false
          }
        },
        required: ['task']
      },
      execute: async (args: { task: string, showSteps?: boolean }) => {
        console.log('Executing computer task:', args.task, 'with showSteps:', args.showSteps);
        // In a real implementation, this would execute the task
        return `<ComputerUse task="${args.task}" showSteps="${args.showSteps ? 'true' : 'false'}" />`;
      }
    },
    'data-visualization': {
      description: 'Create a data visualization',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            description: 'The data to visualize',
            items: {
              type: 'object'
            }
          },
          type: {
            type: 'string',
            description: 'The type of visualization',
            enum: ['bar', 'line', 'pie', 'scatter'],
            default: 'bar'
          }
        },
        required: ['data']
      },
      execute: async (args: { data: any[], type?: string }) => {
        console.log('Creating visualization for data with type:', args.type || 'bar');
        // In a real implementation, this would create a visualization
        return `<DataVisualization data='${JSON.stringify(args.data)}' type="${args.type || 'bar'}" />`;
      }
    },
    'browser-display': {
      description: 'Display a webpage in an iframe',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL of the webpage to display'
          },
          height: {
            type: 'string',
            description: 'The height of the iframe',
            default: '400px'
          }
        },
        required: ['url']
      },
      execute: async (args: { url: string, height?: string }) => {
        console.log('Displaying webpage:', args.url, 'with height:', args.height || '400px');
        // In a real implementation, this would display the webpage
        return `<BrowserDisplay url="${args.url}" height="${args.height || '400px'}" />`;
      }
    }
  };

  // Track function calls
  const [functionCalls, setFunctionCalls] = useState<{
    id: string;
    name: string;
    args: any;
    result?: string;
    status: 'pending' | 'completed' | 'error';
  }[]>([]);

  // Fetch threads
  const [threads, setThreads] = useState<{ id: string; name: string; updatedAt: string }[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  // Fetch threads on component mount
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setIsLoadingThreads(true);
        const response = await fetch('/api/chat/ai-sdk/threads');
        const data = await response.json();
        setThreads(data.threads);
      } catch (error) {
        console.error('Error fetching threads:', error);
      } finally {
        setIsLoadingThreads(false);
      }
    };

    fetchThreads();
  }, []);

  // Create a new thread
  const createThread = async (name: string = 'New Chat') => {
    try {
      const response = await fetch('/api/chat/ai-sdk/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      const thread = await response.json();
      setThreads(prev => [thread, ...prev]);
      return thread.id;
    } catch (error) {
      console.error('Error creating thread:', error);
      return null;
    }
  };

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
    setMessages
  } = useChat({
    api: apiEndpoint,
    initialMessages,
    id: initialThreadId,
    body: {
      model: selectedModel,
      temperature: selectedTemperature,
      maxTokens: selectedMaxTokens,
      threadId: initialThreadId,
      tools: enabledTools.map(toolName => ({
        type: 'function',
        function: {
          name: toolName,
          description: availableFunctions[toolName as keyof typeof availableFunctions]?.description || '',
          parameters: availableFunctions[toolName as keyof typeof availableFunctions]?.parameters || {}
        }
      }))
    },
    onResponse: (response) => {
      // Extract thread ID from response headers
      const threadId = response.headers.get('x-thread-id');
      if (threadId && !initialThreadId) {
        // Update URL with thread ID
        const url = new URL(window.location.href);
        url.searchParams.set('thread', threadId);
        window.history.pushState({}, '', url.toString());
      }
    },
    onFinish: (message) => {
      // Handle any post-completion actions
      console.log('Chat completed:', message);

      // Refresh threads list to update last activity
      fetch('/api/chat/ai-sdk/threads')
        .then(res => res.json())
        .then(data => setThreads(data.threads))
        .catch(err => console.error('Error refreshing threads:', err));

      // In a real implementation, you would parse the message content
      // to look for function calls and handle them
      const content = message.content;
      if (content.includes('function call')) {
        // This is just a placeholder - in a real app, you would parse the actual function call
        console.log('Function call detected in message');
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  // Load thread messages
  const loadThread = async (threadId: string) => {
    try {
      const response = await fetch(`/api/chat/ai-sdk/threads/${threadId}?messages=true`);
      const data = await response.json();

      if (data.messages) {
        // Format messages for AI SDK
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt
        }));

        // Set messages in the chat
        setMessages(formattedMessages);

        // Update thread name
        setThreadName(data.name);

        // Update URL with thread ID
        const url = new URL(window.location.href);
        url.searchParams.set('thread', threadId);
        window.history.pushState({}, '', url.toString());
      }
    } catch (error) {
      console.error('Error loading thread:', error);
    }
  };

  // Handle function calls
  const handleFunctionCall = async (functionCall: any) => {
    // Track this function call
    const callId = nanoid();
    const newFunctionCall = {
      id: callId,
      name: functionCall.name,
      args: functionCall.arguments,
      status: 'pending' as const
    };

    setFunctionCalls(prev => [...prev, newFunctionCall]);

    try {
      // Execute the function
      const fn = availableFunctions[functionCall.name as keyof typeof availableFunctions];
      if (!fn) {
        throw new Error(`Function ${functionCall.name} not found`);
      }

      const result = await fn.execute(JSON.parse(functionCall.arguments));

      // Update the function call with the result
      setFunctionCalls(prev =>
        prev.map(call =>
          call.id === callId
            ? { ...call, result, status: 'completed' as const }
            : call
        )
      );

      // In a real implementation, you would send the result back to continue the conversation
      console.log('Function result:', result);

      return result;
    } catch (error) {
      // Update the function call with the error
      setFunctionCalls(prev =>
        prev.map(call =>
          call.id === callId
            ? { ...call, result: String(error), status: 'error' as const }
            : call
        )
      );

      console.error('Function error:', error);
    }
  };

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

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 100);

      // Process each file
      const newAttachments: FileAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // In a real app, you would upload the file to a server here
        // For this example, we'll create a fake URL
        const fileId = nanoid();
        const fileType = file.type.startsWith('image/') ? 'image' : 'file';

        newAttachments.push({
          id: fileId,
          name: file.name,
          type: fileType,
          url: URL.createObjectURL(file),
          size: file.size
        });
      }

      // Complete the upload
      clearInterval(interval);
      setUploadProgress(100);

      // Add attachments
      setAttachments(prev => [...prev, ...newAttachments]);

      // Update the input to mention the attachments
      if (newAttachments.length > 0) {
        const fileNames = newAttachments.map(a => a.name).join(', ');
        const fileType = newAttachments[0].type === 'image' ? 'image' : 'file';
        const message = `I'm sending you ${newAttachments.length > 1 ? 'these' : 'this'} ${fileType}${newAttachments.length > 1 ? 's' : ''}: ${fileNames}. `;
        setInput(prev => message + prev);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file selection
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Handle speech input
  const handleSpeechInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isSpeechRecording) {
      // If already recording, stop recording
      setIsSpeechRecording(false);
      return;
    }

    setIsSpeechRecording(true);

    // This is a simplified example - in a real app, you would use the Web Speech API
    setTimeout(() => {
      setInput(prev => prev + 'This is a speech input example. ');
      setIsSpeechRecording(false);
    }, 2000);
  };

  // Copy conversation to clipboard
  const copyConversation = () => {
    const text = messages.map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Clear conversation
  const clearConversation = async () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      if (initialThreadId) {
        try {
          // Delete the thread via API
          await fetch(`/api/chat/ai-sdk/threads/${initialThreadId}`, {
            method: 'DELETE'
          });

          // Refresh the threads list
          const response = await fetch('/api/chat/ai-sdk/threads');
          const data = await response.json();
          setThreads(data.threads);

          // Clear messages and create a new thread
          setMessages([]);
          const newThreadId = await createThread('New Chat');
          if (newThreadId) {
            setThreadName('New Chat');
            const url = new URL(window.location.href);
            url.searchParams.set('thread', newThreadId);
            window.history.pushState({}, '', url.toString());
          }
        } catch (error) {
          console.error('Error deleting thread:', error);
        }
      } else {
        // Just clear the messages if no thread ID
        setMessages([]);
      }
    }
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

    // Clear attachments after sending
    setAttachments([]);

    // Submit the form
    handleSubmit(e);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  // Render content with special components
  const renderContent = (content: string) => {
    // Check for special components and code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

    // Special component regex patterns
    const imageDisplayRegex = /<ImageDisplay\s+src="([^"]+)"(?:\s+alt="([^"]+)")?(?:\s+width="([^"]+)")?(?:\s+height="([^"]+)")?\s*\/>/g;
    const aiImageGeneratorRegex = /<AIImageGenerator\s+prompt="([^"]+)"(?:\s+style="([^"]+)")?\s*\/>/g;
    const computerUseRegex = /<ComputerUse\s+task="([^"]+)"(?:\s+showSteps="(true|false)")?\s*\/>/g;
    const dataVisualizationRegex = /<DataVisualization\s+data="([^"]+)"(?:\s+type="([^"]+)")?\s*\/>/g;
    const visualizationWithTracingRegex = /<VisualizationWithTracing\s+data="([^"]+)"(?:\s+type="([^"]+)")?\s*\/>/g;
    const dataTableRegex = /<DataTable\s+data="([^"]+)"(?:\s+columns="([^"]+)")?\s*\/>/g;
    const browserDisplayRegex = /<BrowserDisplay\s+url="([^"]+)"(?:\s+height="([^"]+)")?\s*\/>/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    // Helper function to process text before a match
    const processTextBeforeMatch = (matchIndex: number) => {
      if (matchIndex > lastIndex) {
        // Process the text segment for code blocks
        const textSegment = content.slice(lastIndex, matchIndex);
        const codeMatches = [...textSegment.matchAll(codeBlockRegex)];

        if (codeMatches.length > 0) {
          let textLastIndex = 0;

          for (const codeMatch of codeMatches) {
            const codeMatchIndex = codeMatch.index || 0;

            // Add text before code block
            if (codeMatchIndex > textLastIndex) {
              parts.push(
                <p key={`text-${lastIndex + textLastIndex}`} className="whitespace-pre-wrap">
                  {textSegment.slice(textLastIndex, codeMatchIndex)}
                </p>
              );
            }

            const language = codeMatch[1] || 'plaintext';
            const code = codeMatch[2];

            // Handle special code blocks
            if (language === 'mermaid') {
              parts.push(<MermaidDiagram key={`mermaid-${lastIndex + codeMatchIndex}`} code={code} />);
            } else {
              parts.push(
                <CodeBlock key={`code-${lastIndex + codeMatchIndex}`} language={language} code={code} />
              );
            }

            textLastIndex = codeMatchIndex + codeMatch[0].length;
          }

          // Add remaining text
          if (textLastIndex < textSegment.length) {
            parts.push(
              <p key={`text-${lastIndex + textLastIndex}`} className="whitespace-pre-wrap">
                {textSegment.slice(textLastIndex)}
              </p>
            );
          }
        } else {
          // No code blocks, just add the text
          parts.push(
            <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
              {textSegment}
            </p>
          );
        }
      }
    };

    // Process ImageDisplay components
    while ((match = imageDisplayRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const src = match[1];
      const alt = match[2] || '';
      const width = match[3] || 'auto';
      const height = match[4] || 'auto';

      parts.push(
        <ImageDisplay
          key={`image-${match.index}`}
          src={src}
          alt={alt}
          className={`max-w-full ${width !== 'auto' ? `w-[${width}]` : ''} ${height !== 'auto' ? `h-[${height}]` : ''}`}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Process AIImageGenerator components
    while ((match = aiImageGeneratorRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const prompt = match[1];
      // Style is not used in the current component implementation
      // const style = match[2] || 'vivid';

      parts.push(
        <AIImageGenerator
          key={`ai-image-${match.index}`}
          initialPrompt={prompt}
          title={`Generated Image: ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}`}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Process ComputerUse components
    while ((match = computerUseRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const task = match[1];
      const showSteps = match[2] === 'true';

      parts.push(
        <ComputerUse
          key={`computer-${match.index}`}
          title={`Computer Task: ${task.substring(0, 30)}${task.length > 30 ? '...' : ''}`}
          content={task}
          isTerminal={true}
          isRunnable={showSteps}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Process DataVisualization components
    while ((match = dataVisualizationRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const data = match[1];
      const type = match[2] || 'bar';

      try {
        const parsedData = JSON.parse(data);
        parts.push(
          <DataVisualization
            key={`viz-${match.index}`}
            data={parsedData}
            type={type as any}
          />
        );
      } catch (e) {
        parts.push(
          <p key={`viz-error-${match.index}`} className="text-red-500">
            Error parsing data visualization: {String(e)}
          </p>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Process VisualizationWithTracing components
    while ((match = visualizationWithTracingRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const data = match[1];
      const type = match[2] || 'bar';

      try {
        const parsedData = JSON.parse(data);
        parts.push(
          <VisualizationWithTracing
            key={`viz-trace-${match.index}`}
            data={parsedData}
            type={type as any}
          />
        );
      } catch (e) {
        parts.push(
          <p key={`viz-trace-error-${match.index}`} className="text-red-500">
            Error parsing visualization with tracing: {String(e)}
          </p>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Process DataTable components
    while ((match = dataTableRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const data = match[1];
      const columns = match[2] || '';

      try {
        const parsedData = JSON.parse(data);
        const parsedColumns = columns ? JSON.parse(columns) : null;
        parts.push(
          <DataTable
            key={`table-${match.index}`}
            data={parsedData}
            columns={parsedColumns}
          />
        );
      } catch (e) {
        parts.push(
          <p key={`table-error-${match.index}`} className="text-red-500">
            Error parsing data table: {String(e)}
          </p>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Process BrowserDisplay components
    while ((match = browserDisplayRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const url = match[1];
      const height = match[2] || '400px';

      parts.push(
        <BrowserDisplay
          key={`browser-${match.index}`}
          url={url}
          title={`Browser: ${url}`}
          className={`h-[${height}]`}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Process remaining content
    if (lastIndex < content.length) {
      const remainingContent = content.slice(lastIndex);
      const codeMatches = [...remainingContent.matchAll(codeBlockRegex)];

      if (codeMatches.length > 0) {
        let textLastIndex = 0;

        for (const codeMatch of codeMatches) {
          const codeMatchIndex = codeMatch.index || 0;

          // Add text before code block
          if (codeMatchIndex > textLastIndex) {
            parts.push(
              <p key={`text-${lastIndex + textLastIndex}`} className="whitespace-pre-wrap">
                {remainingContent.slice(textLastIndex, codeMatchIndex)}
              </p>
            );
          }

          const language = codeMatch[1] || 'plaintext';
          const code = codeMatch[2];

          // Handle special code blocks
          if (language === 'mermaid') {
            parts.push(<MermaidDiagram key={`mermaid-${lastIndex + codeMatchIndex}`} code={code} />);
          } else {
            parts.push(
              <CodeBlock key={`code-${lastIndex + codeMatchIndex}`} language={language} code={code} />
            );
          }

          textLastIndex = codeMatchIndex + codeMatch[0].length;
        }

        // Add remaining text
        if (textLastIndex < remainingContent.length) {
          parts.push(
            <p key={`text-${lastIndex + textLastIndex}`} className="whitespace-pre-wrap">
              {remainingContent.slice(textLastIndex)}
            </p>
          );
        }
      } else {
        // No code blocks, just add the text
        parts.push(
          <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {remainingContent}
          </p>
        );
      }
    }

    return parts.length > 0 ? parts : <p className="whitespace-pre-wrap">{content}</p>;
  };

  return (
    <div className={cn('flex h-full', className, isFullScreen && 'fixed inset-0 z-50 bg-background')}>
      {/* Thread Sidebar */}
      <div className="w-64 border-r h-full flex flex-col bg-muted/30">
        <div className="p-3 border-b flex justify-between items-center">
          <h3 className="font-medium text-sm">Chat History</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => createThread('New Chat').then(id => {
              if (id) {
                setMessages([]);
                setThreadName('New Chat');
                const url = new URL(window.location.href);
                url.searchParams.set('thread', id);
                window.history.pushState({}, '', url.toString());
              }
            })}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {isLoadingThreads ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : threads.length > 0 ? (
            threads.map(thread => (
              <Button
                key={thread.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left font-normal truncate h-auto py-2",
                  initialThreadId === thread.id && "bg-accent"
                )}
                onClick={() => loadThread(thread.id)}
              >
                <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{thread.name}</span>
              </Button>
            ))
          ) : (
            <div className="text-center p-4 text-sm text-muted-foreground">
              No chat history
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-600 text-white">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="cursor-pointer" onClick={() => {
              const newName = prompt("Enter a new name for this chat:", threadName);
              if (newName && newName.trim() !== "") {
                setThreadName(newName.trim());

                // Update thread name in the database if we have a thread ID
                if (initialThreadId) {
                  fetch(`/api/chat/ai-sdk/threads/${initialThreadId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName.trim() })
                  }).catch(err => console.error('Error updating thread name:', err));
                }
              }
            }}>
              <h3 className="font-medium hover:underline">{threadName}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedModel} • {selectedTemperature.toFixed(1)} temperature
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={copyConversation}>
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy conversation</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={clearConversation}>
                    <Eraser className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear conversation</p>
                </TooltipContent>
              </Tooltip>

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

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
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
              className="flex items-start gap-3 group"
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
              <div className="flex-1">
                <Card className={cn('p-3 mb-1',
                  message.role === 'user'
                    ? 'bg-muted'
                    : 'bg-card border-blue-100 dark:border-blue-900'
                )}>
                  <CardContent className="p-0 space-y-2">
                    {renderContent(message.content)}
                  </CardContent>
                </Card>

                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Good response</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Bad response</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Copy</span>
                    </Button>
                  </div>
                )}
              </div>
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

        {/* Function calls */}
        {functionCalls.length > 0 && (
          <div className="space-y-2 mt-2">
            <h4 className="text-sm font-medium">Function Calls</h4>
            {functionCalls.map((call) => (
              <div key={call.id} className="border rounded-md p-2 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={cn(
                      "h-4 w-4",
                      call.status === 'pending' ? "text-yellow-500" :
                      call.status === 'completed' ? "text-green-500" :
                      "text-red-500"
                    )} />
                    <span className="font-medium">{call.name}</span>
                  </div>
                  <Badge variant={
                    call.status === 'pending' ? "outline" :
                    call.status === 'completed' ? "success" :
                    "destructive"
                  }>
                    {call.status}
                  </Badge>
                </div>
                <div className="mt-1 text-xs">
                  <p className="text-muted-foreground">Arguments: {JSON.stringify(call.args)}</p>
                  {call.result && (
                    <p className="mt-1">
                      Result: <span className={call.status === 'error' ? "text-red-500" : ""}>{call.result}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* File attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative group">
                {attachment.type === 'image' ? (
                  <div className="relative w-24 h-24 rounded-md overflow-hidden border">
                    <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setAttachments(prev => prev.filter(a => a.id !== attachment.id))}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center p-2 border rounded-md bg-muted">
                    <FileText className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="text-xs truncate max-w-[100px]">{attachment.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setAttachments(prev => prev.filter(a => a.id !== attachment.id))}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="mt-2">
            <Progress value={uploadProgress} className="h-1" />
            <p className="text-xs text-muted-foreground mt-1">Uploading... {uploadProgress}%</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <div className="border-t p-4">
        <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
          <div className="flex items-end gap-2">
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
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleFileSelect}>
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Attach files</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={isSpeechRecording ? "secondary" : "ghost"}
                      size="icon"
                      className={`h-8 w-8 ${isSpeechRecording ? "animate-pulse" : ""}`}
                      onClick={handleSpeechInput}
                    >
                      <Mic className={`h-4 w-4 ${isSpeechRecording ? "text-red-500" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isSpeechRecording ? "Stop recording" : "Voice input"}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Code className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Format as code</p>
                  </TooltipContent>
                </Tooltip>

                {/* Test function call button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        // Simulate a function call for testing
                        handleFunctionCall({
                          name: 'weather',
                          arguments: JSON.stringify({ location: 'New York' })
                        });
                      }}
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Test function call</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              {enabledTools.length > 0 && (
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>Using {enabledTools.length} tools</span>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
      </div>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chat Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <select
                id="model"
                className="w-full p-2 border rounded-md"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="llama-3-70b">Llama 3 70B</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="temperature">Temperature: {selectedTemperature.toFixed(1)}</Label>
              </div>
              <input
                id="temperature"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={selectedTemperature}
                onChange={(e) => setSelectedTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower values produce more focused and deterministic responses.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="max-tokens">Max Tokens: {selectedMaxTokens}</Label>
              </div>
              <input
                id="max-tokens"
                type="range"
                min={256}
                max={4096}
                step={256}
                value={selectedMaxTokens}
                onChange={(e) => setSelectedMaxTokens(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of tokens to generate in the response.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tools</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="web-search" className="cursor-pointer">Web Search</Label>
                  <Switch
                    id="web-search"
                    checked={enabledTools.includes('web-search')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'web-search']
                          : prev.filter(t => t !== 'web-search')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="weather" className="cursor-pointer">Weather</Label>
                  <Switch
                    id="weather"
                    checked={enabledTools.includes('weather')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'weather']
                          : prev.filter(t => t !== 'weather')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="image-generation" className="cursor-pointer">Image Generation</Label>
                  <Switch
                    id="image-generation"
                    checked={enabledTools.includes('image-generation')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'image-generation']
                          : prev.filter(t => t !== 'image-generation')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="computer-use" className="cursor-pointer">Computer Use</Label>
                  <Switch
                    id="computer-use"
                    checked={enabledTools.includes('computer-use')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'computer-use']
                          : prev.filter(t => t !== 'computer-use')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="data-visualization" className="cursor-pointer">Data Visualization</Label>
                  <Switch
                    id="data-visualization"
                    checked={enabledTools.includes('data-visualization')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'data-visualization']
                          : prev.filter(t => t !== 'data-visualization')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="browser-display" className="cursor-pointer">Browser Display</Label>
                  <Switch
                    id="browser-display"
                    checked={enabledTools.includes('browser-display')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'browser-display']
                          : prev.filter(t => t !== 'browser-display')
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

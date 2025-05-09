'use client';

import React, { useState, useRef, useEffect } from 'react';
// Import from the AI SDK
import { CreateMessage, type UseChatHelpers, Message as AIMessage } from 'ai/react';
import { LanguageModelV1 } from 'ai';
// Import components
import { ChatSidebar } from './chat-sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import { renderContent } from './ai-sdk-chatHelper';
// Import your custom hooks
import { useChat } from '@/hooks/use-chat';
import { useAgentExecutor, useToolExecutor } from '@/hooks/use-executor';
import { useSupabaseFetch } from '@/hooks/use-supabase-fetch';
import { useSupabaseCrud } from '@/hooks/use-supabase-crud';
import { RequestMiddleware, ResponseMiddleware } from '@/lib/middleware';
import { LanguageModelV1Middleware } from 'ai';
import { MODEL_REGISTRY } from '@/lib/model-registry';
import {
  Bot, User, Send, Loader2, RefreshCw, XCircle, Paperclip,
  FileText, Code, Mic, Copy, Check, Eraser,
  Maximize2, Minimize2, ThumbsUp, ThumbsDown,
  Zap, Settings, MessageSquare, Image as ImageIcon,
  Terminal, BarChart, Table, Globe, Monitor,
  MapPin, FormInput, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';

export interface AiSdkChatProps {
  apiEndpoint?: string;
  initialMessages?: AIMessage[];
  initialThreadId?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  className?: string;
  provider?: string;
  systemPrompt?: string;
  personaId?: string;
  streamProtocol?: 'text' | 'data';
  toolChoice?: 'auto' | 'none' | string;
  maxSteps?: number;
  middleware?: {
    caching?: {
      enabled?: boolean
      ttl?: number
      maxSize?: number
    }
    reasoning?: {
      enabled?: boolean
      tagName?: string
      startWithReasoning?: boolean
    }
    simulation?: {
      enabled?: boolean
    }
    logging?: {
      enabled?: boolean
      logParams?: boolean
      logResults?: boolean
    }
    defaultSettings?: {
      temperature?: number
      maxTokens?: number
      providerMetadata?: Record<string, any>
    }
  }
  useCustomHooks?: boolean;
  agentId?: string;
  onThreadChange?: (threadId: string) => void;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface ImageAttachment {
  id: string;
  url: string;
  type: 'image';
  width?: number;
  height?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  args: any;
  result?: string;
  status: 'pending' | 'completed' | 'error';
}

export function AiSdkChat({
  apiEndpoint = '/api/chat/ai-sdk',
  initialMessages = [],
  initialThreadId,
  modelId = 'gemini-2.0-flash-exp',
  temperature = 0.7,
  maxTokens = 8192,
  tools = [],
  className,
  provider = 'google',
  systemPrompt,
  personaId,
  streamProtocol = 'data',
  toolChoice = 'auto',
  maxSteps = 5,
  middleware,
  useCustomHooks = false,
  agentId,
  onThreadChange
}: AiSdkChatProps) {
  // Initialize chat hook directly
  const chatHook = useChat({
    apiEndpoint: agentId ? `/api/agents/${agentId}/run` : apiEndpoint,
    initialMessages,
    initialThreadId,
    modelId,
    temperature,
    maxTokens,
    tools,
  });

  // Destructure common chatHook values
  const { messages, input, isLoading, threadId, stop, setMessages: setChatMessages, append } = chatHook;
  const setInput = chatHook.setInput;
  const handleInputChange = chatHook.handleInputChange;
  const handleSubmit = chatHook.handleSubmit;

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSpeechRecording, setIsSpeechRecording] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [threadName, setThreadName] = useState('New Chat');

  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState(systemPrompt || '');
  const [selectedPersonaId, setSelectedPersonaId] = useState(personaId || '');

  // Critical state variables
  const [isConnected, setIsConnected] = useState(true);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [lastSuccessfulResponse, setLastSuccessfulResponse] = useState<Date | null>(null);

  const [modelAvailability, setModelAvailability] = useState<Record<string, boolean>>({});
  const [fallbackModelId, setFallbackModelId] = useState<string>('gemini-2.0-flash');
  const [isUsingFallbackModel, setIsUsingFallbackModel] = useState(false);
  const [errorRecoveryMode, setErrorRecoveryMode] = useState<'none' | 'retry' | 'fallback'>('none');
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryDelay, setRetryDelay] = useState(1000);
  const [streamInterrupted, setStreamInterrupted] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Use model registry for providers, allModels, and modelSettings
  const providers = Object.entries(MODEL_REGISTRY).map(([id]) => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1) }));
  const allModels = Object.values(MODEL_REGISTRY).flatMap(models => Object.entries(models).map(([id, cfg]: any) => ({ id, name: cfg.name })));
  const modelSettings = Object.values(MODEL_REGISTRY).reduce((acc, models) => ({ ...acc, ...models }), {} as Record<string, any>);

  const [selectedModel, setSelectedModel] = useState(modelId);
  const [selectedProvider, setSelectedProvider] = useState<string>(provider);
  const [selectedTemperature, setSelectedTemperature] = useState(temperature);
  const [selectedMaxTokens, setSelectedMaxTokens] = useState(maxTokens);
  const [enabledTools, setEnabledTools] = useState<string[]>(tools);
  const [isCopied, setIsCopied] = useState(false);

  const { executeTool, isExecuting: isToolExecuting, error: toolError } = useToolExecutor({
    toolId: 'default-tool-id', // Replace with the actual tool ID
    onSuccess: (data) => {
      console.log('Tool executed successfully:', data);
    },
    onError: (err) => {
      console.error('Error executing tool:', err.message);
    },
  });

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
      execute: async (args: { query: string }) => executeTool({ toolName: 'web-search', args })
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
      execute: async (args: { location: string }) => executeTool({ toolName: 'weather', args })
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
      execute: async (args: { prompt: string, style?: string }) => executeTool({ toolName: 'image-generation', args })
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
      execute: async (args: { task: string, showSteps?: boolean }) => executeTool({ toolName: 'computer-use', args })
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
      execute: async (args: { data: any[], type?: string }) => executeTool({ toolName: 'data-visualization', args })
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
      execute: async (args: { url: string, height?: string }) => executeTool({ toolName: 'browser-display', args })
    },
    'screen-share': {
      description: 'Display a screen recording or screenshot',
      parameters: {
        type: 'object',
        properties: {
          src: {
            type: 'string',
            description: 'The URL of the screen recording or screenshot'
          },
          title: {
            type: 'string',
            description: 'The title of the screen recording or screenshot',
            default: 'Screen Recording'
          },
          isVideo: {
            type: 'boolean',
            description: 'Whether the source is a video or an image',
            default: true
          }
        },
        required: ['src']
      },
      execute: async (args: { src: string, title?: string, isVideo?: boolean }) => executeTool({ toolName: 'screen-share', args })
    },
    'interactive-map': {
      description: 'Display an interactive map',
      parameters: {
        type: 'object',
        properties: {
          center: {
            type: 'array',
            description: 'The center coordinates of the map [latitude, longitude]',
            items: {
              type: 'number'
            },
            minItems: 2,
            maxItems: 2
          },
          zoom: {
            type: 'number',
            description: 'The zoom level of the map',
            default: 13
          },
          locations: {
            type: 'array',
            description: 'The locations to display on the map',
            items: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
                title: { type: 'string' },
                description: { type: 'string' }
              },
              required: ['lat', 'lng']
            },
            default: []
          }
        },
        required: ['center']
      },
      execute: async (args: { center: [number, number], zoom?: number, locations?: any[] }) => executeTool({ toolName: 'interactive-map', args })
    },
    'interactive-form': {
      description: 'Display an interactive form',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the form',
            default: 'Feedback Form'
          },
          fields: {
            type: 'array',
            description: 'The fields to display in the form',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: {
                  type: 'string',
                  enum: ['text', 'textarea', 'number', 'email', 'checkbox', 'radio', 'select', 'date']
                },
                label: { type: 'string' },
                placeholder: { type: 'string' },
                required: { type: 'boolean' },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      value: { type: 'string' },
                      label: { type: 'string' }
                    },
                    required: ['value', 'label']
                  }
                }
              },
              required: ['id', 'type', 'label']
            }
          },
          submitLabel: {
            type: 'string',
            description: 'The label for the submit button',
            default: 'Submit'
          }
        },
        required: ['title', 'fields']
      },
      execute: async (args: { title: string, fields: any[], submitLabel?: string }) => executeTool({ toolName: 'interactive-form', args })
    }
  };

  // Track function calls
  const [functionCalls, setFunctionCalls] = useState<ToolCall[]>([]);

  // Fetch threads
  const [threads, setThreads] = useState<{ id: string; name: string; updatedAt: string }[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  // Fetch threads on component mount
  useEffect(() => { /* TODO: Implement thread fetching */ }, []);

  // Create a new message using CreateMessage type
  const createNewMessage = (role: 'user' | 'assistant' | 'system', content: string): CreateMessage => {
    return { id: nanoid(), role, content };
  };

  // Create a new thread
  const createThread = async (name: string = 'New Chat') => { /* TODO: Implement thread creation */ };

  // Track current thread ID
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(initialThreadId);

  // Effect to scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle file selection and upload (placeholder implementations)
  const handleFileSelect = () => fileInputRef.current?.click();
  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await new Promise(resolve => setTimeout(resolve, 500));
      setUploadProgress((prev) => prev + (100 / files.length));
      const newAttachment: FileAttachment = {
        id: nanoid(),
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        url: URL.createObjectURL(file),
        size: file.size,
      };
      if (newAttachment.type === 'image') {
        setImageAttachments(prev => [...prev, newAttachment as unknown as ImageAttachment]);
      } else {
        setAttachments(prev => [...prev, newAttachment]);
      }
    }
    setIsUploading(false);
    setUploadProgress(0);
    toast({ title: 'Files uploaded', description: `${files.length} file(s) processed.` });
  };

  // Handle speech input (placeholder)
  const handleSpeechInput = () => {
    setIsSpeechRecording(!isSpeechRecording);
    toast({ title: isSpeechRecording ? 'Recording stopped' : 'Recording started...' });
  };

  // Handle key down for sending message with Enter
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  // Handle function call button click (for testing)
  const handleFunctionCall = async (toolName: string, args: any) => {
    if (!append) {
      toast({ title: 'Error', description: 'Append function not available.', variant: 'destructive' });
      return;
    }
    const toolCallId = nanoid();
    setFunctionCalls(prev => [...prev, { id: toolCallId, name: toolName, args, status: 'pending' }]);
    let result;
    let status: 'completed' | 'error' = 'completed';
    try {
      if (availableFunctions[toolName as keyof typeof availableFunctions]) {
        result = await availableFunctions[toolName as keyof typeof availableFunctions].execute(args);
        toast({ title: `Tool ${toolName} executed`, description: `Result: ${JSON.stringify(result)}` });
      } else {
        throw new Error(`Tool ${toolName} not found`);
      }
    } catch (e: any) {
      result = e.message || 'Error executing tool';
      status = 'error';
      setLastError(e);
      toast({ title: `Tool ${toolName} error`, description: result, variant: 'destructive' });
    }
    setFunctionCalls(prev => prev.map(call => call.id === toolCallId ? { ...call, result, status } : call));

    if (messages.length > 0 && messages[messages.length -1].role === 'assistant' && messages[messages.length -1].tool_calls ) {
        append({
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: toolCallId,
            tool_name: toolName
        } as AIMessage & { tool_call_id: string, tool_name: string});
    }
  };

  // UI Rendering (JSX)
  return (
    <div className={cn('flex h-full', className, isFullScreen ? 'fixed inset-0 z-50 bg-background' : '')}>
      <ChatSidebar
        threads={threads}
        isLoadingThreads={isLoadingThreads}
        currentThreadId={threadId}
        onNewChat={() => {
          if (setChatMessages) setChatMessages([]);
          setFunctionCalls([]);
          setAttachments([]);
          setImageAttachments([]);
          setThreadName('New Chat');
        }}
        onSelectThread={(id) => {
          setCurrentThreadId(id);
        }}
        onDeleteThread={(id) => { /* TODO: Implement thread deletion */ }}
        onRenameThread={(id, newName) => { /* TODO: Implement thread rename */ }}
      />
      <div className="flex flex-col flex-1 h-full bg-muted/50 dark:bg-muted/20">
        <header className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => { /* TODO: Toggle sidebar */ }}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">{threadName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                    <Settings className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Chat Settings</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(!isFullScreen)}>
                    {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m: AIMessage, index: number) => (
            <div key={m.id || `message-${index}`} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <Card className={cn('max-w-[75%]', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card')}>
                <CardContent className="p-3">
                  <div className="text-sm">
                    {renderContent(m.content, m.tool_calls)}
                  </div>
                  {m.role === 'assistant' && (
                    <div className="flex items-center justify-end gap-1 mt-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Good response</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Bad response</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => { navigator.clipboard.writeText(m.content); setIsCopied(true); setTimeout(() => setIsCopied(false), 1500); }}>
                              {isCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>{isCopied ? 'Copied!' : 'Copy text'}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}

          {functionCalls.map((call) => (
            <div key={call.id} className="border rounded-md p-2 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className={cn(
                    'h-4 w-4',
                    call.status === 'pending' ? 'text-yellow-500 animate-pulse' :
                    call.status === 'completed' ? 'text-green-500' :
                    'text-red-500'
                  )} />
                  <span className="font-medium">{call.name}</span>
                </div>
                <Badge variant={
                  call.status === 'completed' ? 'success' :
                  call.status === 'error' ? 'destructive' :
                  'secondary'
                }>{call.status}</Badge>
              </div>
              <div className="mt-1 text-xs">
                <p className="text-muted-foreground">Arguments: {JSON.stringify(call.args)}</p>
                {call.result && (
                  <p className="mt-1">
                    Result: <span className={call.status === 'error' ? 'text-red-500' : ''}>{call.result}</span>
                  </p>
                )}
              </div>
            </div>
          ))}

          {(attachments.length > 0 || imageAttachments.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {imageAttachments.map((attachment) => (
                <div key={attachment.id} className="relative group">
                  <div className="relative w-24 h-24 rounded-md overflow-hidden border">
                    <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setImageAttachments(prev => prev.filter(a => a.id !== attachment.id))}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {attachments.filter(att => att.type !== 'image').map((attachment) => (
                <div key={attachment.id} className="relative group">
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
                </div>
              ))}
            </div>
          )}

          {isUploading && (
            <div className="mt-2">
              <Progress value={uploadProgress} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">Uploading... {uploadProgress.toFixed(0)}%</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t p-4 bg-background">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="min-h-[60px] max-h-[200px] resize-none flex-1 p-2 border rounded-md focus:ring-ring focus:ring-1"
                disabled={isLoading || isToolExecuting}
              />
              <div className="flex flex-col gap-2">
                {isLoading || isToolExecuting ? (
                  <Button type="button" variant="destructive" size="icon" onClick={stop}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" size="icon" disabled={input.trim() === '' && attachments.length === 0 && imageAttachments.length === 0}>
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
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleFileSelect} disabled={isUploading}>
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Attach files</p></TooltipContent>
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
                    <TooltipContent><p>{isSpeechRecording ? "Stop recording" : "Voice input"}</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleFunctionCall('web-search', { query: 'latest AI news' })}
                      >
                        <Zap className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Test web-search</p></TooltipContent>
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
                    <span>Using {enabledTools.length} tool(s)</span>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Chat Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                className="w-full p-2 border rounded-md bg-background text-foreground"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                <option value="all">All Providers</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <select
                id="model"
                className="w-full p-2 border rounded-md bg-background text-foreground"
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  if (modelSettings[e.target.value]?.max_tokens) {
                    const modelMaxTokens = modelSettings[e.target.value].max_tokens;
                    if (selectedMaxTokens > modelMaxTokens) {
                      setSelectedMaxTokens(modelMaxTokens);
                    }
                  }
                }}
              >
                {selectedProvider === 'all' ? (
                  allModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                      {modelSettings[model.id]?.supports_vision && " (Vision)"}
                      {modelSettings[model.id]?.supports_functions && " (Functions)"}
                    </option>
                  ))
                ) : (
                  Object.entries(MODEL_REGISTRY[selectedProvider as keyof typeof MODEL_REGISTRY] || {}).map(([id, cfg]: [string, any]) => (
                    <option key={id} value={id}>
                      {cfg.name}
                      {cfg.supports_vision && " (Vision)"}
                      {cfg.supports_functions && " (Functions)"}
                    </option>
                  ))
                )}
              </select>
              {modelSettings[selectedModel] && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>Max Tokens: {modelSettings[selectedModel].max_tokens?.toLocaleString()}</p>
                  <p>Context Window: {modelSettings[selectedModel].context_window?.toLocaleString()} tokens</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {modelSettings[selectedModel].supports_vision && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs">Vision</span>
                    )}
                    {modelSettings[selectedModel].supports_functions && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs">Functions</span>
                    )}
                    {modelSettings[selectedModel].supports_streaming && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full text-xs">Streaming</span>
                    )}
                  </div>
                </div>
              )}
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
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
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
                max={modelSettings[selectedModel]?.max_tokens || 8192}
                step={256}
                value={selectedMaxTokens}
                onChange={(e) => setSelectedMaxTokens(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of tokens to generate in the response.
              </p>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label className="font-medium text-base">Error Recovery</Label>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="fallbackModel">Fallback Model</Label>
                  <select
                    id="fallbackModel"
                    className="w-full p-2 border rounded-md bg-background text-foreground"
                    value={fallbackModelId}
                    onChange={(e) => setFallbackModelId(e.target.value)}
                  >
                    {allModels.filter(m => m.id.includes('flash') || m.id.includes('mini') || m.id.includes('haiku')).map(model => (
                        <option key={`fallback-${model.id}`} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Model to use if the primary model fails.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="max-retries">Max Retries: {maxRetries}</Label>
                  </div>
                  <input id="max-retries" type="range" min={0} max={10} step={1} value={maxRetries} onChange={(e) => setMaxRetries(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                  <p className="text-xs text-muted-foreground">
                    Number of times to retry before using fallback model.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="retry-delay">Retry Delay (ms): {retryDelay}</Label>
                  </div>
                  <input id="retry-delay" type="range" min={500} max={10000} step={500} value={retryDelay} onChange={(e) => setRetryDelay(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                  <p className="text-xs text-muted-foreground">
                    Delay between retry attempts (milliseconds).
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label className="font-medium text-base">Tools</Label>
              <div className="space-y-2 grid grid-cols-2 gap-x-4 gap-y-2">
                {Object.entries(availableFunctions).map(([toolKey, toolConfig]) => (
                  <div key={toolKey} className="flex items-center justify-between">
                    <Label htmlFor={toolKey} className="cursor-pointer text-sm">{toolConfig.description.split(' ')[0]} {toolConfig.description.split(' ')[1]}</Label>
                    <Switch
                      id={toolKey}
                      checked={tools.includes(toolKey)}
                      onCheckedChange={(checked) => {
                        setEnabledTools(prev =>
                          checked
                            ? [...prev, toolKey]
                            : prev.filter(t => t !== toolKey)
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}





'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat, Message } from '@ai-sdk/react';
import { ChatSidebar } from './chat-sidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import { renderContent } from './ai-sdk-chatHelper';
import { useToolExecutor } from '@/hooks/use-executor';
import { useSupabaseFetch } from '@/hooks/use-supabase-fetch';
import { useUpstashAdapter } from '@/hooks/use-upstash-adapter';
import {
  Send,
  XCircle,
  Paperclip,
  FileText,
  Mic,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';

export interface AiSdkChatProps {
  apiEndpoint?: string;
  initialMessages?: Message[];
  initialThreadId?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  className?: string;
  provider?: string;
  systemPrompt?: string;
  personaId?: string;
  streamProtocol?: 'data' | 'text';
  toolChoice?: string;
  maxSteps?: number;
  middleware?: unknown;
  agentId?: string;
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
  name?: string; // Add name for compatibility with alt text
  width?: number;
  height?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
  result?: string;
  status: 'pending' | 'completed' | 'error';
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  model_id: string;
}

interface ToolOption {
  id: string;
  name: string;
  description: string;
  parameters_schema?: string;
}

// Use a robust error boundary pattern
function ChatErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error] = useState<Error | null>(null);
  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
        <h2 className="font-bold mb-2">Something went wrong in chat</h2>
        <pre className="text-xs whitespace-pre-wrap">{error.message}</pre>
        <button
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
  return <React.Fragment>{children}</React.Fragment>;
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
  agentId,
}: AiSdkChatProps) {
  const [enabledTools, setEnabledTools] = useState<string[]>(tools);
  const [selectedMaxTokens, setSelectedMaxTokens] = useState(maxTokens);
  const [isCopied, setIsCopied] = useState(false);

  const upstashConfig = useUpstashAdapter();

  const {
    data: modelsData,
    isLoading: isLoadingModels,
    error: modelsError,
  } = useSupabaseFetch<ModelOption>({
    endpoint: '/api/models',
    resourceName: 'Models',
    dataKey: 'models',
    upstash: { forceUse: upstashConfig.enabled },
  });
  const {
    data: toolsData,
    isLoading: isLoadingTools,
    error: toolsError,
  } = useSupabaseFetch<ToolOption>({
    endpoint: '/api/tools',
    resourceName: 'Tools',
    dataKey: 'tools',
    upstash: { forceUse: upstashConfig.enabled },
  });

  const models: ModelOption[] = Array.isArray(modelsData)
    ? modelsData.map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        model_id: m.model_id,
      }))
    : [];
  const toolsList: ToolOption[] = Array.isArray(toolsData)
    ? toolsData.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        parameters_schema: t.parameters_schema,
      }))
    : [];

  const [selectedModel, setSelectedModel] = useState(modelId);
  const [selectedProvider, setSelectedProvider] = useState<string>(provider);
  const [selectedTemperature, setSelectedTemperature] = useState(temperature);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: baseHandleSubmit,
    isLoading,
    stop,
  } = useChat({
    api: agentId ? `/api/agents/${agentId}/run` : apiEndpoint,
    id: initialThreadId,
    initialMessages,
    body: {
      modelId: selectedModel,
      temperature: selectedTemperature,
      maxTokens: selectedMaxTokens,
      tools: enabledTools,
      provider: selectedProvider,
      systemPrompt,
      personaId,
      streamProtocol,
      toolChoice,
      maxSteps,
      middleware,
      agentId,
    },
    streamProtocol,
    onError: (err) => {
      toast({
        title: 'Chat error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>(
    []
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSpeechRecording, setIsSpeechRecording] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { executeTool, isExecuting: isToolExecuting } = useToolExecutor({
    toolId: 'default-tool-id',
    onSuccess: (_data) => {
      // Optionally handle tool success
    },
    onError: (err) => {
      toast({
        title: 'Tool execution error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const [functionCalls, setFunctionCalls] = useState<ToolCall[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = () => fileInputRef.current?.click();
  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUploadProgress((prev) => prev + 100 / files.length);
      const newAttachment: FileAttachment = {
        id: nanoid(),
        name: file.name || 'Unnamed File',
        type: file.type.startsWith('image/') ? 'image' : 'file',
        url: URL.createObjectURL(file),
        size: file.size,
      };
      if (newAttachment.type === 'image') {
        setImageAttachments((prev) => [
          ...prev,
          { ...newAttachment, type: 'image', name: newAttachment.name },
        ]);
      } else {
        setAttachments((prev) => [...prev, newAttachment]);
      }
    }
    setIsUploading(false);
    setUploadProgress(0);
    toast({
      title: 'Files uploaded',
      description: `${files.length} file(s) processed.`,
    });
  };

  const handleSpeechInput = () => {
    setIsSpeechRecording(!isSpeechRecording);
    toast({
      title: isSpeechRecording ? 'Recording stopped' : 'Recording started...',
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      await baseHandleSubmit();
    } catch (err) {
      toast({
        title: 'Send error',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    }
  };

  const handleFunctionCall = async (
    toolName: string,
    args: Record<string, unknown>
  ) => {
    const toolCallId = nanoid();
    setFunctionCalls((prev) => [
      ...prev,
      { id: toolCallId, name: toolName, args, status: 'pending' },
    ]);
    let result: string | undefined;
    let status: 'completed' | 'error' = 'completed';
    try {
      const tool = toolsList.find((t) => t.name === toolName);
      if (tool) {
        result = await executeTool({ toolName: toolName, args });
        toast({
          title: `Tool ${toolName} executed`,
          description: `Result: ${JSON.stringify(result)}`,
        });
      } else {
        throw new Error(`Tool ${toolName} not found`);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      result = errMsg || 'Error executing tool';
      status = 'error';
      toast({
        title: `Tool ${toolName} error`,
        description: result,
        variant: 'destructive',
      });
    }
    setFunctionCalls((prev) =>
      prev.map((call) =>
        call.id === toolCallId ? { ...call, result, status } : call
      )
    );
  };

  return (
    <ChatErrorBoundary>
      <div
        className={cn(
          'flex h-full',
          className,
          isFullScreen ? 'fixed inset-0 z-50 bg-background' : ''
        )}
      >
        {/* Upstash status indicator */}
        {upstashConfig.enabled && (
          <div className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-green-100 text-green-800 px-2 py-1 rounded shadow text-xs">
            <span>Upstash Adapter</span>
            {upstashConfig.isReady ? (
              <span className="font-bold">Ready</span>
            ) : (
              <span className="text-yellow-600">Connecting...</span>
            )}
            {upstashConfig.error && (
              <span className="text-red-600">{upstashConfig.error}</span>
            )}
          </div>
        )}
        <ChatSidebar
          models={models}
          tools={toolsList}
          threads={[]}
          selectedModelId={selectedModel}
          selectedThreadId={initialThreadId || ''}
          selectedTools={enabledTools}
          temperature={selectedTemperature}
          maxTokens={selectedMaxTokens}
          onModelChange={setSelectedModel}
          onThreadChange={() => {}}
          onToolToggle={() => {}}
          onTemperatureChange={setSelectedTemperature}
          onMaxTokensChange={setSelectedMaxTokens}
          onCreateThread={() => {}}
        />
        <div className="flex flex-col flex-1 h-full bg-muted/50 dark:bg-muted/20">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => {}}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold">New Chat</h2>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSettings(true)}
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Chat Settings</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsFullScreen(!isFullScreen)}
                    >
                      {isFullScreen ? (
                        <Minimize2 className="h-5 w-5" />
                      ) : (
                        <Maximize2 className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m: Message, index: number) => (
              <div
                key={m.id || `message-${index}`}
                className={cn(
                  'flex',
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <Card
                  className={cn(
                    'max-w-[75%]',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card'
                  )}
                >
                  <CardContent className="p-3">
                    <div className="text-sm">{renderContent(m.content)}</div>
                    {m.role === 'assistant' && (
                      <div className="flex items-center justify-end gap-1 mt-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Good response</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Bad response</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  navigator.clipboard.writeText(m.content);
                                  setIsCopied(true);
                                  setTimeout(() => setIsCopied(false), 1500);
                                }}
                              >
                                {isCopied ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{isCopied ? 'Copied!' : 'Copy text'}</p>
                            </TooltipContent>
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
                    <Zap
                      className={cn(
                        'h-4 w-4',
                        call.status === 'pending'
                          ? 'text-yellow-500 animate-pulse'
                          : call.status === 'completed'
                            ? 'text-green-500'
                            : 'text-red-500'
                      )}
                    />
                    <span className="font-medium">{call.name}</span>
                  </div>
                  <Badge
                    variant={
                      call.status === 'completed'
                        ? 'success'
                        : call.status === 'error'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {call.status}
                  </Badge>
                </div>
                <div className="mt-1 text-xs">
                  <p className="text-muted-foreground">
                    Arguments: {JSON.stringify(call.args)}
                  </p>
                  {call.result && (
                    <p className="mt-1">
                      Result:{' '}
                      <span
                        className={
                          call.status === 'error' ? 'text-red-500' : ''
                        }
                      >
                        {call.result}
                      </span>
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
                      <img
                        src={attachment.url}
                        alt={attachment.name || 'Image'}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          setImageAttachments((prev) =>
                            prev.filter((a) => a.id !== attachment.id)
                          )
                        }
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {attachments
                  .filter((att) => att.type !== 'image')
                  .map((attachment) => (
                    <div key={attachment.id} className="relative group">
                      <div className="flex items-center p-2 border rounded-md bg-muted">
                        <FileText className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="text-xs truncate max-w-[100px]">
                          {attachment.name || 'File'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            setAttachments((prev) =>
                              prev.filter((a) => a.id !== attachment.id)
                            )
                          }
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
                <p className="text-xs text-muted-foreground mt-1">
                  Uploading... {uploadProgress.toFixed(0)}%
                </p>
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
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={stop}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="icon"
                      disabled={
                        input.trim() === '' &&
                        attachments.length === 0 &&
                        imageAttachments.length === 0
                      }
                    >
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleFileSelect}
                          disabled={isUploading}
                        >
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
                          variant={isSpeechRecording ? 'secondary' : 'ghost'}
                          size="icon"
                          className={`h-8 w-8 ${isSpeechRecording ? 'animate-pulse' : ''}`}
                          onClick={handleSpeechInput}
                        >
                          <Mic
                            className={`h-4 w-4 ${isSpeechRecording ? 'text-red-500' : ''}`}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isSpeechRecording ? 'Stop recording' : 'Voice input'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            handleFunctionCall('web-search', {
                              query: 'latest AI news',
                            })
                          }
                        >
                          <Zap className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Test web-search</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    title="Attach files"
                    placeholder="Attach files"
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
                  aria-label="Select Provider"
                >
                  <option value="google">Google</option>
                  <option value="openai">OpenAI</option>
                  <option value="all">All Providers</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <select
                  id="model"
                  className="w-full p-2 border rounded-md bg-background text-foreground"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  aria-label="Select Model"
                  title="Select a model"
                >
                  {isLoadingModels && <option>Loading models...</option>}
                  {modelsError && <option>Error loading models</option>}
                  {models.map((m) => (
                    <option key={m.id} value={m.model_id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="temperature">
                    Temperature: {selectedTemperature.toFixed(1)}
                  </Label>{' '}
                </div>
                <input
                  id="temperature"
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={selectedTemperature}
                  onChange={(e) =>
                    setSelectedTemperature(parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  title="Temperature"
                  aria-label="Temperature"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="max-tokens">
                    Max Tokens: {selectedMaxTokens}
                  </Label>
                </div>
                <input
                  id="max-tokens"
                  type="range"
                  min={256}
                  max={8192}
                  step={256}
                  value={selectedMaxTokens}
                  onChange={(e) =>
                    setSelectedMaxTokens(parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  title="Max tokens"
                  aria-label="Max tokens"
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label className="font-medium text-base">Tools</Label>
                <div className="space-y-2 grid grid-cols-2 gap-x-4 gap-y-2">
                  {isLoadingTools && <div>Loading tools...</div>}
                  {toolsError && <div>Error loading tools</div>}
                  {toolsList.map((tool) => (
                    <div
                      key={tool.id}
                      className="flex items-center justify-between"
                    >
                      <Label
                        htmlFor={tool.id}
                        className="cursor-pointer text-sm"
                      >
                        {tool.name}
                      </Label>
                      <Switch
                        id={tool.id}
                        checked={enabledTools.includes(tool.id)}
                        onCheckedChange={(checked) => {
                          setEnabledTools((prev) =>
                            checked
                              ? [...prev, tool.id]
                              : prev.filter((t) => t !== tool.id)
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
    </ChatErrorBoundary>
  );
}

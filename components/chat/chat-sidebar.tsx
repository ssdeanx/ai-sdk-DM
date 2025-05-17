'use client';

import { useState } from 'react';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  History,
  LineChart,
  PenToolIcon as Tool,
  Settings,
  Sparkles,
  Plus,
  MessageSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GradientCard } from '@/components/ui/gradient-card';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatSidebarProps {
  className?: string;
  models: Array<{ id: string; name: string }>;
  tools: Array<{ id: string; name: string; description: string }>;
  threads: Array<{ id: string; name: string; updated_at: string }>;
  selectedModelId: string;
  selectedThreadId: string;
  selectedTools: string[];
  temperature: number;
  maxTokens: number;
  onModelChange: (modelId: string) => void;
  onThreadChange: (threadId: string) => void;
  onToolToggle: (toolId: string) => void;
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
  onCreateThread: () => void;
}

export function ChatSidebar({
  className,
  models = [],
  tools = [],
  threads = [],
  selectedModelId,
  selectedThreadId,
  selectedTools,
  temperature,
  maxTokens,
  onModelChange,
  onThreadChange,
  onToolToggle,
  onTemperatureChange,
  onMaxTokensChange,
  onCreateThread,
}: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('history');
  const [messages, setMessages] = useState<any[]>([]); // Initialize messages state

  // Animation variants
  const sidebarVariants = {
    expanded: { width: 280, transition: { duration: 0.2, ease: 'easeInOut' } },
    collapsed: { width: 64, transition: { duration: 0.2, ease: 'easeInOut' } },
  };

  const textVariants = {
    expanded: { opacity: 1, x: 0, display: 'block' },
    collapsed: {
      opacity: 0,
      x: -10,
      display: 'none',
      transition: { duration: 0.1 },
    },
  };

  return (
    <motion.div
      initial={false}
      animate={collapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      className={cn(
        'border-l border-border/40 bg-background/80 backdrop-blur-sm z-10 shadow-sm',
        collapsed ? 'w-[64px]' : 'w-[280px]',
        className
      )}
    >
      {/* Collapse toggle */}
      <div className="flex h-12 items-center justify-between border-b px-3">
        <motion.h3 variants={textVariants} className="text-sm font-medium">
          Chat Settings
        </motion.h3>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            'h-7 w-7 rounded-full hover:bg-accent/50',
            collapsed && 'ml-auto'
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
          <span className="sr-only">{collapsed ? 'Expand' : 'Collapse'}</span>
        </Button>
      </div>

      {collapsed ? (
        <TooltipProvider delayDuration={0}>
          <div className="flex flex-col items-center gap-4 py-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === 'history' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setActiveTab('history')}
                >
                  <History className="h-4 w-4" />
                  <span className="sr-only">History</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">History</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === 'tools' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setActiveTab('tools')}
                >
                  <Tool className="h-4 w-4" />
                  <span className="sr-only">Tools</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Tools</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === 'trace' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setActiveTab('trace')}
                >
                  <LineChart className="h-4 w-4" />
                  <span className="sr-only">Trace</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Trace</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === 'context' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setActiveTab('context')}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="sr-only">Context</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Context</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 overflow-hidden"
        >
          <TabsList className="w-full grid grid-cols-5 p-1">
            <TabsTrigger value="history" className="rounded-md">
              <History className="h-3.5 w-3.5 mr-2" />
              <span className="text-xs">History</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="rounded-md">
              <Tool className="h-3.5 w-3.5 mr-2" />
              <span className="text-xs">Tools</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-md">
              <Settings className="h-3.5 w-3.5 mr-2" />
              <span className="text-xs">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="trace" className="rounded-md">
              <LineChart className="h-3.5 w-3.5 mr-2" />
              <span className="text-xs">Trace</span>
            </TabsTrigger>
            <TabsTrigger value="context" className="rounded-md">
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              <span className="text-xs">Context</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="history"
            className="p-4 h-[calc(100vh-8.5rem)] overflow-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium">Chat History</h3>
              <Button
                variant="gradient"
                size="sm"
                onClick={onCreateThread}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                New Chat
              </Button>
            </div>
            {threads.length > 0 ? (
              <div className="space-y-3">
                {threads.map((thread) => (
                  <GradientCard
                    key={thread.id}
                    variant={
                      selectedThreadId === thread.id ? 'default' : 'subtle'
                    }
                    gradientFrom={
                      selectedThreadId === thread.id
                        ? 'from-blue-500'
                        : 'from-gray-500'
                    }
                    gradientTo={
                      selectedThreadId === thread.id
                        ? 'to-violet-500'
                        : 'to-gray-600'
                    }
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => onThreadChange(thread.id)}
                  >
                    <div className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-background/80 p-1.5 flex-shrink-0">
                          <MessageSquare className="h-3.5 w-3.5 text-foreground/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {thread.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(thread.updated_at).toLocaleString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </GradientCard>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 mb-4">
                  <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-muted-foreground mb-4">
                  No chat history yet
                </p>
                <Button
                  variant="gradient"
                  onClick={onCreateThread}
                  className="gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Start a new chat
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent
            value="tools"
            className="p-4 h-[calc(100vh-8.5rem)] overflow-auto"
          >
            <h3 className="text-lg font-medium mb-4">Available Tools</h3>
            {tools.length > 0 ? (
              <div className="space-y-2">
                {tools.map((tool) => (
                  <Card key={tool.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{tool.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {tool.description}
                          </div>
                        </div>
                        <Switch
                          checked={selectedTools.includes(tool.id)}
                          onCheckedChange={() => onToolToggle(tool.id)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No tools available</p>
              </div>
            )}
            {selectedTools.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Selected Tools</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTools.map((toolId) => {
                    const tool = tools.find((t) => t.id === toolId);
                    return (
                      <Badge
                        key={toolId}
                        variant="outline"
                        className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                      >
                        {tool?.name || toolId}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent
            value="settings"
            className="p-4 h-[calc(100vh-8.5rem)] overflow-auto"
          >
            <h3 className="text-lg font-medium mb-4">Model Settings</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Model</label>
                <Select
                  value={selectedModelId}
                  onValueChange={onModelChange}
                  disabled={models.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {models.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No models available. Please add models in the settings.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Temperature: {temperature}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {temperature < 0.3
                      ? 'More deterministic'
                      : temperature > 0.7
                        ? 'More creative'
                        : 'Balanced'}
                  </span>
                </div>
                <Slider
                  value={[temperature]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={(value) => onTemperatureChange(value[0])}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Max Tokens: {maxTokens}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {maxTokens < 500
                      ? 'Short responses'
                      : maxTokens > 1500
                        ? 'Long responses'
                        : 'Medium responses'}
                  </span>
                </div>
                <Slider
                  value={[maxTokens]}
                  min={100}
                  max={2000}
                  step={100}
                  onValueChange={(value) => onMaxTokensChange(value[0])}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent
            value="trace"
            className="p-4 h-[calc(100vh-8.5rem)] overflow-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Agent Tracing</h3>
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-500 border-green-500/20"
              >
                Langfuse Enabled
              </Badge>
            </div>
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Agent Execution</span>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Trace ID:{' '}
                    <span className="font-mono">trace_abc123def456</span>
                  </div>
                </CardContent>
              </Card>
              <div className="text-center text-muted-foreground py-4">
                <p>Tracing data will appear here during agent execution</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent
            value="context"
            className="p-4 h-[calc(100vh-8.5rem)] overflow-auto"
          >
            <h3 className="text-lg font-medium mb-4">Context & Memory</h3>
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <Badge variant="outline">2 KB / 16 KB</Badge>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: '12.5%' }}
                    />
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Active Context</h4>
                <Card>
                  <CardContent className="p-3 text-sm text-muted-foreground">
                    <p>
                      Current conversation ({messages?.length || 0} messages)
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Upload Context</h4>
                  <Button variant="outline" size="sm">
                    Upload File
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload documents to provide additional context to the AI.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  );
}

"use client"

import { useState } from "react"
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  History,
  LineChart,
  PenToolIcon as Tool,
  Settings,
  Sparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ChatSidebarProps {
  className?: string
  models: Array<{ id: string; name: string }>
  tools: Array<{ id: string; name: string; description: string }>
  threads: Array<{ id: string; name: string; updated_at: string }>
  selectedModelId: string
  selectedThreadId: string
  selectedTools: string[]
  temperature: number
  maxTokens: number
  onModelChange: (modelId: string) => void
  onThreadChange: (threadId: string) => void
  onToolToggle: (toolId: string) => void
  onTemperatureChange: (value: number) => void
  onMaxTokensChange: (value: number) => void
  onCreateThread: () => void
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
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState("history")
  const [messages, setMessages] = useState<any[]>([]) // Initialize messages state

  return (
    <div
      className={cn(
        "border-l border-border/40 transition-all duration-300 ease-in-out",
        collapsed ? "w-12" : "w-80",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center justify-between border-b border-border/40 px-4">
          <div className={cn("font-medium text-sm transition-opacity", collapsed ? "opacity-0" : "opacity-100")}>
            Chat Settings
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {collapsed ? (
          <div className="flex flex-col items-center py-4 space-y-4">
            <Button
              variant={activeTab === "history" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9"
              onClick={() => setActiveTab("history")}
            >
              <History className="h-5 w-5" />
              <span className="sr-only">History</span>
            </Button>
            <Button
              variant={activeTab === "tools" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9"
              onClick={() => setActiveTab("tools")}
            >
              <Tool className="h-5 w-5" />
              <span className="sr-only">Tools</span>
            </Button>
            <Button
              variant={activeTab === "settings" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9"
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
            <Button
              variant={activeTab === "trace" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9"
              onClick={() => setActiveTab("trace")}
            >
              <LineChart className="h-5 w-5" />
              <span className="sr-only">Trace</span>
            </Button>
            <Button
              variant={activeTab === "context" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9"
              onClick={() => setActiveTab("context")}
            >
              <Sparkles className="h-5 w-5" />
              <span className="sr-only">Context</span>
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
              <TabsTrigger value="tools">
                <Tool className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Tools</span>
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
              <TabsTrigger value="trace">
                <LineChart className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Trace</span>
              </TabsTrigger>
              <TabsTrigger value="context">
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Context</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="p-4 h-[calc(100vh-8.5rem)] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Chat History</h3>
                <Button variant="outline" size="sm" onClick={onCreateThread}>
                  New Chat
                </Button>
              </div>
              {threads.length > 0 ? (
                <div className="space-y-2">
                  {threads.map((thread) => (
                    <Card
                      key={thread.id}
                      className={`cursor-pointer hover:bg-accent transition-colors ${
                        selectedThreadId === thread.id ? "border-blue-500 dark:border-blue-400" : ""
                      }`}
                      onClick={() => onThreadChange(thread.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium truncate">{thread.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(thread.updated_at).toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>No chat history yet</p>
                  <Button variant="outline" className="mt-2" onClick={onCreateThread}>
                    Create New Chat
                  </Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="tools" className="p-4 h-[calc(100vh-8.5rem)] overflow-auto">
              <h3 className="text-lg font-medium mb-4">Available Tools</h3>
              {tools.length > 0 ? (
                <div className="space-y-2">
                  {tools.map((tool) => (
                    <Card key={tool.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{tool.name}</div>
                            <div className="text-xs text-muted-foreground">{tool.description}</div>
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
                      const tool = tools.find((t) => t.id === toolId)
                      return (
                        <Badge
                          key={toolId}
                          variant="outline"
                          className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                        >
                          {tool?.name || toolId}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="settings" className="p-4 h-[calc(100vh-8.5rem)] overflow-auto">
              <h3 className="text-lg font-medium mb-4">Model Settings</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model</label>
                  <Select value={selectedModelId} onValueChange={onModelChange} disabled={models.length === 0}>
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
                    <label className="text-sm font-medium">Temperature: {temperature}</label>
                    <span className="text-xs text-muted-foreground">
                      {temperature < 0.3 ? "More deterministic" : temperature > 0.7 ? "More creative" : "Balanced"}
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
                    <label className="text-sm font-medium">Max Tokens: {maxTokens}</label>
                    <span className="text-xs text-muted-foreground">
                      {maxTokens < 500 ? "Short responses" : maxTokens > 1500 ? "Long responses" : "Medium responses"}
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
            <TabsContent value="trace" className="p-4 h-[calc(100vh-8.5rem)] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Agent Tracing</h3>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
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
                      Trace ID: <span className="font-mono">trace_abc123def456</span>
                    </div>
                  </CardContent>
                </Card>
                <div className="text-center text-muted-foreground py-4">
                  <p>Tracing data will appear here during agent execution</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="context" className="p-4 h-[calc(100vh-8.5rem)] overflow-auto">
              <h3 className="text-lg font-medium mb-4">Context & Memory</h3>
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <Badge variant="outline">2 KB / 16 KB</Badge>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: "12.5%" }} />
                    </div>
                  </CardContent>
                </Card>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Active Context</h4>
                  <Card>
                    <CardContent className="p-3 text-sm text-muted-foreground">
                      <p>Current conversation ({messages?.length || 0} messages)</p>
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
      </div>
    </div>
  )
}

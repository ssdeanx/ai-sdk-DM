"use client"

import { SelectItem } from "@/components/ui/select"
import { SelectContent } from "@/components/ui/select"
import { SelectValue } from "@/components/ui/select"
import { SelectTrigger } from "@/components/ui/select"
import { Select } from "@/components/ui/select"
import type React from "react"

import { useRef, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bot, Send, Loader2, Code, FileText, Image, BarChart, Globe, Monitor,
  Terminal, Music, MapPin, Table, FormInput, Wand2, Box
} from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { nanoid } from "nanoid"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatSidebar } from "./chat-sidebar"
import { ChatMessage } from "./chat-message"
import { CodeBlock } from "./code-block"
import { MermaidDiagram } from "./mermaid-diagram"
import { ImageDisplay } from "./image-display"
import { BrowserDisplay } from "./browser-display"
import { ScreenShare } from "./screen-share"
import { ComputerUse } from "./computer-use"
import { DataVisualization } from "./data-visualization"
import { InteractiveMap } from "./interactive-map"
import { ModelViewer } from "./model-viewer"
import { DataTable } from "./data-table"
import { InteractiveForm } from "./interactive-form"
import { AIImageGenerator } from "./ai-image-generator"
import { AudioPlayer } from "./audio-player"
import { FileUpload } from "./file-upload"
import { useSupabaseFetch } from "@/hooks/use-supabase-fetch"
import { useChat, type Message } from "@/hooks/use-chat"
import { renderContent } from "./ai-sdk-chatHelper"

interface EnhancedChatProps {
  initialThreadId?: string
  initialModelId?: string
  initialMessages?: Message[]
  agentId?: string
  className?: string
}

export function EnhancedChat({
  initialThreadId,
  initialModelId,
  initialMessages = [],
  agentId,
  className,
}: EnhancedChatProps) {
  const router = useRouter()
  const [selectedModelId, setSelectedModelId] = useState<string>(initialModelId || "")
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1000)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [activeTab, setActiveTab] = useState<string>("chat")

  // Use our custom chat hook
  const {
    messages,
    input,
    setInput,
    isLoading,
    threadId,
    setThreadId,
    attachments,
    setAttachments,
    sendMessage,
    fetchMessages,
    runSequentialGenerations,
  } = useChat({
    initialMessages,
    initialThreadId,
    apiEndpoint: agentId ? `/api/agents/${agentId}/run` : "/api/chat",
    onFinish: () => {
      // Refresh threads to update the list
      refreshThreads()
    }
  })

  // Fetch models from Supabase
  const { data: modelsData, isLoading: isLoadingModels } = useSupabaseFetch({
    endpoint: "/api/models",
    resourceName: "Models",
    dataKey: "models",
  })

  // Type the models data
  const models: { id: string; name: string }[] = Array.isArray(modelsData)
    ? modelsData.map((model: any) => ({
        id: String(model?.id || ''),
        name: String(model?.name || '')
      }))
    : []

  // Fetch tools from Supabase
  const { data: toolsData, isLoading: isLoadingTools } = useSupabaseFetch({
    endpoint: "/api/tools",
    resourceName: "Tools",
    dataKey: "tools",
  })

  // Type the tools data
  const tools: { id: string; name: string; description: string }[] = Array.isArray(toolsData)
    ? toolsData.map((tool: any) => ({
        id: String(tool?.id || ''),
        name: String(tool?.name || ''),
        description: String(tool?.description || '')
      }))
    : []

  // Fetch threads from LibSQL
  const {
    data: threadsData,
    isLoading: isLoadingThreads,
    refetch: refreshThreads,
  } = useSupabaseFetch({
    endpoint: "/api/memory_threads",
    resourceName: "Threads",
    dataKey: "threads",
  })

  // Type the threads data
  const threads: { id: string; name: string; updated_at: string }[] = Array.isArray(threadsData)
    ? threadsData.map((thread: any) => ({
        id: String(thread?.id || ''),
        name: String(thread?.name || ''),
        updated_at: String(thread?.updated_at || new Date().toISOString())
      }))
    : []

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await sendMessage({
      message: input,
      attachments,
      modelId: selectedModelId,
      tools: selectedTools,
      temperature,
      maxTokens,
      agentId
    })
  }

  // Handle file upload
  const handleFileUpload = (files: File[]) => {
    // Process each file
    files.forEach((file) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const fileType = file.type.split("/")[0]
        const fileUrl = e.target?.result as string

        setAttachments((prev) => [
          ...prev,
          {
            type: fileType,
            url: fileUrl,
            name: file.name,
          },
        ])
      }

      if (file.type.startsWith("image/")) {
        reader.readAsDataURL(file)
      } else {
        reader.readAsText(file)
      }
    })
  }

  // Create a new thread
  const handleCreateThread = async () => {
    const newThreadId = nanoid()
    setThreadId(newThreadId)
    router.push(`/chat?thread=${newThreadId}`)
    // Refresh the threads list
    await refreshThreads()
  }

  // Switch to a different thread
  const handleThreadChange = (id: string) => {
    setThreadId(id)
    router.push(`/chat?thread=${id}`)
  }

  // Toggle a tool
  const handleToolToggle = (toolId: string) => {
    setSelectedTools((prev) => (prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]))
  }

  // Render message content with support for code blocks, mermaid diagrams, browser displays, etc.
  const renderMessageContent = (content: string) => {
    // Split content by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g)

    return parts.map((part, index) => {
      // Check if this part is a code block
      if (part.startsWith("```") && part.endsWith("```")) {
        // Extract language and code
        const match = part.match(/```(\w+)?\s*([\s\S]*?)```/)

        if (match) {
          const language = match[1] || "text"
          const code = match[2]

          // Check for special block types
          if (language === "mermaid") {
            return <MermaidDiagram key={index} code={code} />
          } else if (language === "browser") {
            try {
              const browserData = JSON.parse(code)
              return <BrowserDisplay key={index} url={browserData.url} title={browserData.title} />
            } catch (e) {
              return <CodeBlock key={index} language="json" code={code} />
            }
          } else if (language === "screen") {
            try {
              const screenData = JSON.parse(code)
              return <ScreenShare key={index} src={screenData.src} title={screenData.title} isVideo={screenData.isVideo} />
            } catch (e) {
              return <CodeBlock key={index} language="json" code={code} />
            }
          } else if (language === "terminal" || language === "shell") {
            return <ComputerUse key={index} title="Terminal Output" content={code} isTerminal={true} />
          } else if (language === "chart" || language === "graph") {
            try {
              const chartData = JSON.parse(code)
              return <DataVisualization
                key={index}
                title={chartData.title}
                data={chartData.data}
                type={chartData.type || "bar"}
                labels={chartData.labels}
                xAxisLabel={chartData.xAxisLabel}
                yAxisLabel={chartData.yAxisLabel}
              />
            } catch (e) {
              return <CodeBlock key={index} language="json" code={code} />
            }
          } else if (language === "map") {
            try {
              const mapData = JSON.parse(code)
              return <InteractiveMap
                key={index}
                title={mapData.title}
                center={mapData.center}
                zoom={mapData.zoom}
                locations={mapData.locations}
              />
            } catch (e) {
              return <CodeBlock key={index} language="json" code={code} />
            }
          } else if (language === "3d" || language === "model") {
            try {
              const modelData = JSON.parse(code)
              return <ModelViewer
                key={index}
                title={modelData.title}
                modelUrl={modelData.url}
                format={modelData.format}
                autoRotate={modelData.autoRotate}
              />
            } catch (e) {
              return <CodeBlock key={index} language="json" code={code} />
            }
          } else if (language === "table") {
            try {
              const tableData = JSON.parse(code)
              return <DataTable
                key={index}
                title={tableData.title}
                data={tableData.data}
                columns={tableData.columns}
                pagination={tableData.pagination}
              />
            } catch (e) {
              return <CodeBlock key={index} language="json" code={code} />
            }
          } else if (language === "form") {
            try {
              const formData = JSON.parse(code)
              return <InteractiveForm
                key={index}
                title={formData.title}
                description={formData.description}
                fields={formData.fields}
                submitLabel={formData.submitLabel}
                onSubmit={(data) => console.log('Form submitted:', data)}
              />
            } catch (e) {
              return <CodeBlock key={index} language="json" code={code} />
            }
          } else if (language === "image-generator") {
            try {
              const imageGenData = JSON.parse(code)
              return <AIImageGenerator
                key={index}
                title={imageGenData.title}
                initialPrompt={imageGenData.prompt}
                generatedImage={imageGenData.image}
                onGenerate={async (prompt, settings) => {
                  console.log('Generate image with:', prompt, settings)
                  // This would call an actual API in production
                  return imageGenData.image || ''
                }}
              />
            } catch (e) {
              return <CodeBlock key={index} language="json" code={code} />
            }
          } else if (language === "audio") {
            try {
              const audioData = JSON.parse(code)
              return <AudioPlayer
                key={index}
                title={audioData.title}
                src={audioData.src}
                waveform={audioData.waveform}
              />
            } catch (e) {
              return <CodeBlock key={index} language="json" code={code} />
            }
          }

          // Regular code block
          return <CodeBlock key={index} language={language} code={code} />
        }
      }

      // Regular text
      return (
        <p key={index} className="whitespace-pre-wrap">
          {part}
        </p>
      )
    })
  }

  return (
    <div className={cn("flex h-[calc(100vh-4rem)]", className)}>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b px-4">
            <TabsList className="h-12 flex-wrap">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Code
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Files
              </TabsTrigger>
              <TabsTrigger value="visualize" className="flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                Visualize
              </TabsTrigger>
              <TabsTrigger value="browser" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Browser
              </TabsTrigger>
              <TabsTrigger value="screen" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Screen
              </TabsTrigger>
              <TabsTrigger value="terminal" className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Terminal
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Table className="h-4 w-4" />
                Data
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Map
              </TabsTrigger>
              <TabsTrigger value="form" className="flex items-center gap-2">
                <FormInput className="h-4 w-4" />
                Form
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Audio
              </TabsTrigger>
              <TabsTrigger value="3d" className="flex items-center gap-2">
                <Box className="h-4 w-4" />
                3D
              </TabsTrigger>
              <TabsTrigger value="ai-image" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                AI Image
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="border-t p-4">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Attachments preview */}
                {attachments.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {attachments.map((attachment, i) => (
                      <div key={i} className="border rounded-md p-2 flex items-center gap-2">
                        {attachment.type === "image" ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        <span className="text-sm truncate max-w-[100px]">{attachment.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          &times;
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <FileUpload onUpload={handleFileUpload} />

                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 min-h-[60px] resize-none rounded-xl border-border/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e)
                      }
                    }}
                  />

                  <Button
                    type="submit"
                    variant="gradient"
                    size="icon"
                    disabled={isLoading || (!input.trim() && attachments.length === 0)}
                    className="rounded-full shadow-sm"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="sr-only">Send message</span>
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="code" className="flex-1 flex flex-col p-0 m-0">
            <div className="flex-1 p-4">
              <Card className="h-full">
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">Code Execution</h2>
                  <p className="text-muted-foreground mb-4">
                    Write and execute code in various languages. Results will be displayed below.
                  </p>

                  <Textarea placeholder="// Write your code here" className="font-mono h-64 mb-4" />

                  <div className="flex justify-between">
                    <Select>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="sql">SQL</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button>
                      <Code className="mr-2 h-4 w-4" />
                      Execute
                    </Button>
                  </div>

                  <div className="mt-4 p-4 border rounded-md bg-muted font-mono">
                    <p className="text-sm">Output will appear here</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="files" className="flex-1 flex flex-col p-0 m-0">
            <div className="flex-1 p-4">
              <Card className="h-full">
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">File Management</h2>
                  <p className="text-muted-foreground mb-4">
                    Upload, view, and manage files for your AI assistant to use as context.
                  </p>

                  <FileUpload onUpload={handleFileUpload} />

                  <div className="mt-4 border rounded-md">
                    <div className="p-4 border-b bg-muted">
                      <h3 className="font-medium">Uploaded Files</h3>
                    </div>
                    <div className="p-4">
                      {attachments.length > 0 ? (
                        <div className="space-y-2">
                          {attachments.map((file, i) => (
                            <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                              <div className="flex items-center gap-2">
                                {file.type === "image" ? (
                                  <Image className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                                <span>{file.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No files uploaded yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="visualize" className="flex-1 flex flex-col p-0 m-0">
            <div className="flex-1 p-4">
              <Card className="h-full">
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">Data Visualization</h2>
                  <p className="text-muted-foreground mb-4">
                    Create charts, diagrams, and visualizations from your data.
                  </p>

                  <Textarea
                    placeholder="```mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
```"
                    className="font-mono h-64 mb-4"
                  />

                  <div className="flex justify-between">
                    <Select>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mermaid">Mermaid</SelectItem>
                        <SelectItem value="chart">Chart.js</SelectItem>
                        <SelectItem value="table">Table</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button>
                      <BarChart className="mr-2 h-4 w-4" />
                      Render
                    </Button>
                  </div>

                  <div className="mt-4 p-4 border rounded-md bg-white">
                    <p className="text-center text-muted-foreground py-8">Visualization will appear here</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="browser" className="flex-1 flex flex-col p-0 m-0">
            <div className="flex-1 p-4">
              <Card className="h-full">
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">Web Browser</h2>
                  <p className="text-muted-foreground mb-4">
                    Browse websites and interact with web content directly in the chat.
                  </p>

                  <div className="flex gap-2 mb-4">
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      className="flex-1 rounded-md border-border/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <Button variant="gradient">
                      <Globe className="mr-2 h-4 w-4" />
                      Browse
                    </Button>
                  </div>

                  <div className="mt-4 border rounded-md overflow-hidden">
                    <div className="p-4 border-b bg-muted">
                      <h3 className="font-medium">Browser Preview</h3>
                    </div>
                    <div className="h-[400px] bg-white flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Globe className="mx-auto h-8 w-8 mb-2" />
                        <p>Enter a URL above to start browsing</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="screen" className="flex-1 flex flex-col p-0 m-0">
            <div className="flex-1 p-4">
              <Card className="h-full">
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">Screen Sharing</h2>
                  <p className="text-muted-foreground mb-4">
                    Share your screen or record your screen to share with the AI assistant.
                  </p>

                  <div className="flex gap-2 mb-4">
                    <Button variant="gradient" className="flex-1">
                      <Monitor className="mr-2 h-4 w-4" />
                      Share Screen
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Image className="mr-2 h-4 w-4" />
                      Take Screenshot
                    </Button>
                  </div>

                  <div className="mt-4 border rounded-md overflow-hidden">
                    <div className="p-4 border-b bg-muted">
                      <h3 className="font-medium">Screen Preview</h3>
                    </div>
                    <div className="h-[400px] bg-black flex items-center justify-center">
                      <div className="text-center text-white/70">
                        <Monitor className="mx-auto h-8 w-8 mb-2" />
                        <p>Click 'Share Screen' to start sharing</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="terminal" className="flex-1 flex flex-col p-0 m-0">
            <div className="flex-1 p-4">
              <Card className="h-full">
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">Terminal Access</h2>
                  <p className="text-muted-foreground mb-4">
                    Execute commands and view terminal output directly in the chat.
                  </p>

                  <div className="flex gap-2 mb-4">
                    <Input
                      type="text"
                      placeholder="Enter command..."
                      className="flex-1 font-mono rounded-md border-border/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <Button variant="gradient">
                      <Terminal className="mr-2 h-4 w-4" />
                      Execute
                    </Button>
                  </div>

                  <div className="mt-4 border rounded-md overflow-hidden">
                    <div className="p-4 border-b bg-muted">
                      <h3 className="font-medium">Terminal Output</h3>
                    </div>
                    <div className="h-[400px] bg-black p-4 font-mono text-green-400 text-sm overflow-auto">
                      <p>$ _</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="data" className="flex-1 flex flex-col p-0 m-0">
            <div className="flex-1 p-4">
              <Card className="h-full">
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">Data Tables & Charts</h2>
                  <p className="text-muted-foreground mb-4">
                    Create interactive data tables and visualizations from your data.
                  </p>

                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium mb-2">Chart Type</h3>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select chart type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Bar Chart</SelectItem>
                          <SelectItem value="line">Line Chart</SelectItem>
                          <SelectItem value="pie">Pie Chart</SelectItem>
                          <SelectItem value="table">Data Table</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-sm font-medium mb-2">Data Source</h3>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select data source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paste">Paste Data</SelectItem>
                          <SelectItem value="upload">Upload CSV</SelectItem>
                          <SelectItem value="api">API Endpoint</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Textarea
                    placeholder="Paste your data here in CSV or JSON format..."
                    className="h-[200px] mb-4 font-mono text-sm"
                  />

                  <Button variant="gradient">
                    <BarChart className="mr-2 h-4 w-4" />
                    Generate Visualization
                  </Button>

                  <div className="mt-4 border rounded-md overflow-hidden bg-white p-4 h-[200px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <BarChart className="mx-auto h-8 w-8 mb-2" />
                      <p>Your visualization will appear here</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="map" className="flex-1 flex flex-col p-0 m-0">
            <div className="flex-1 p-4">
              <Card className="h-full">
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">Interactive Maps</h2>
                  <p className="text-muted-foreground mb-4">
                    Create and interact with maps to visualize geographic data.
                  </p>

                  <div className="flex gap-2 mb-4">
                    <Input
                      type="text"
                      placeholder="Search location or address..."
                      className="flex-1 rounded-md border-border/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <Button variant="secondary">
                      <MapPin className="mr-2 h-4 w-4" />
                      Search
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Map Type</h3>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Map type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="satellite">Satellite</SelectItem>
                          <SelectItem value="terrain">Terrain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Data Points</h3>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Data points" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="markers">Markers</SelectItem>
                          <SelectItem value="heatmap">Heat Map</SelectItem>
                          <SelectItem value="routes">Routes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 border rounded-md overflow-hidden bg-muted h-[300px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="mx-auto h-8 w-8 mb-2" />
                      <p>Map will appear here</p>
                      <p className="text-xs mt-1">Search for a location to get started</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="form" className="flex-1 flex flex-col p-0 m-0">
            <div className="flex-1 p-4">
              <Card className="h-full">
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">Interactive Forms</h2>
                  <p className="text-muted-foreground mb-4">
                    Create custom forms for gathering user input and feedback.
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Form Title</h3>
                      <Input
                        type="text"
                        placeholder="Enter form title..."
                        className="w-full"
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Form Type</h3>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select form type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feedback">Feedback Form</SelectItem>
                          <SelectItem value="survey">Survey</SelectItem>
                          <SelectItem value="contact">Contact Form</SelectItem>
                          <SelectItem value="custom">Custom Form</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border rounded-md p-4 mb-4">
                    <h3 className="text-sm font-medium mb-2">Form Fields</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <FormInput className="h-4 w-4" />
                          <span className="text-sm">Text Field</span>
                        </div>
                        <Button variant="ghost" size="sm">Add</Button>
                      </div>

                      <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <FormInput className="h-4 w-4" />
                          <span className="text-sm">Multiple Choice</span>
                        </div>
                        <Button variant="ghost" size="sm">Add</Button>
                      </div>

                      <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <FormInput className="h-4 w-4" />
                          <span className="text-sm">Checkbox</span>
                        </div>
                        <Button variant="ghost" size="sm">Add</Button>
                      </div>
                    </div>
                  </div>

                  <Button variant="gradient">
                    <FormInput className="mr-2 h-4 w-4" />
                    Create Form
                  </Button>

                  <div className="mt-4 border rounded-md overflow-hidden p-4 bg-muted/30">
                    <p className="text-center text-muted-foreground py-8">Form preview will appear here</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audio" className="flex-1 flex flex-col p-0 m-0">
            <div className="flex-1 p-4">
              <Card className="h-full">
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">Audio Tools</h2>
                  <p className="text-muted-foreground mb-4">
                    Record, upload, and analyze audio content.
                  </p>

                  <div className="flex gap-2 mb-6">
                    <Button variant="gradient" className="flex-1">
                      <Music className="mr-2 h-4 w-4" />
                      Record Audio
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Upload Audio
                    </Button>
                  </div>

                  <div className="border rounded-md p-4 mb-4">
                    <h3 className="text-sm font-medium mb-4">Audio Processing</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium mb-2">Transcription</h4>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <h4 className="text-xs font-medium mb-2">Analysis</h4>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Analysis type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sentiment">Sentiment Analysis</SelectItem>
                            <SelectItem value="keywords">Keyword Extraction</SelectItem>
                            <SelectItem value="summary">Summarization</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border rounded-md overflow-hidden">
                    <div className="p-4 border-b bg-muted">
                      <h3 className="font-medium">Audio Player</h3>
                    </div>
                    <div className="h-[200px] bg-muted/30 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Music className="mx-auto h-8 w-8 mb-2" />
                        <p>Record or upload audio to get started</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="3d" className="flex-1 flex flex-col p-0 m-0">
            <div className="flex-1 p-4">
              <Card className="h-full">
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">3D Model Viewer</h2>
                  <p className="text-muted-foreground mb-4">
                    View and interact with 3D models in various formats.
                  </p>

                  <div className="flex gap-2 mb-4">
                    <Button variant="gradient" className="flex-1">
                      <Box className="mr-2 h-4 w-4" />
                      Upload 3D Model
                    </Button>
                    <Select>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="glb">GLB</SelectItem>
                        <SelectItem value="gltf">GLTF</SelectItem>
                        <SelectItem value="obj">OBJ</SelectItem>
                        <SelectItem value="stl">STL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-4 border rounded-md overflow-hidden">
                    <div className="p-4 border-b bg-muted">
                      <h3 className="font-medium">3D Viewer</h3>
                    </div>
                    <div className="h-[300px] bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Box className="mx-auto h-8 w-8 mb-2" />
                        <p>Upload a 3D model to view it here</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai-image" className="flex-1 flex flex-col p-0 m-0">
            <div className="flex-1 p-4">
              <Card className="h-full">
                <div className="p-4">
                  <h2 className="text-lg font-medium mb-4">AI Image Generator</h2>
                  <p className="text-muted-foreground mb-4">
                    Generate images using AI based on your text descriptions.
                  </p>

                  <Textarea
                    placeholder="Describe the image you want to generate in detail..."
                    className="h-[100px] mb-4"
                  />

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Model</h3>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                          <SelectItem value="stable-diffusion">Stable Diffusion</SelectItem>
                          <SelectItem value="midjourney">Midjourney</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Style</h3>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realistic">Realistic</SelectItem>
                          <SelectItem value="artistic">Artistic</SelectItem>
                          <SelectItem value="cartoon">Cartoon</SelectItem>
                          <SelectItem value="abstract">Abstract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button variant="gradient" className="w-full">
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Image
                  </Button>

                  <div className="mt-4 border rounded-md overflow-hidden">
                    <div className="p-4 border-b bg-muted">
                      <h3 className="font-medium">Generated Image</h3>
                    </div>
                    <div className="h-[300px] bg-muted/30 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Wand2 className="mx-auto h-8 w-8 mb-2" />
                        <p>Your generated image will appear here</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar */}
      <ChatSidebar
        models={models}
        tools={tools}
        threads={threads}
        selectedModelId={selectedModelId}
        selectedThreadId={threadId}
        selectedTools={selectedTools}
        temperature={temperature}
        maxTokens={maxTokens}
        onModelChange={setSelectedModelId}
        onThreadChange={handleThreadChange}
        onToolToggle={handleToolToggle}
        onTemperatureChange={setTemperature}
        onMaxTokensChange={setMaxTokens}
        onCreateThread={handleCreateThread}
      />
    </div>
  )
}

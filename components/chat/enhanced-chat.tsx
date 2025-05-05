"use client"

import { SelectItem } from "@/components/ui/select"

import { SelectContent } from "@/components/ui/select"

import { SelectValue } from "@/components/ui/select"

import { SelectTrigger } from "@/components/ui/select"

import { Select } from "@/components/ui/select"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bot, Send, Loader2, Code, FileText, Image, BarChart } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { nanoid } from "nanoid"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatSidebar } from "./chat-sidebar"
import { CodeBlock } from "./code-block"
import { MermaidDiagram } from "./mermaid-diagram"
import { ImageDisplay } from "./image-display"
import { FileUpload } from "./file-upload"
import { useSupabaseFetch } from "@/hooks/use-supabase-fetch"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: string
  isLoading?: boolean
  attachments?: Array<{
    type: string
    url: string
    name: string
  }>
}

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
  const [threadId, setThreadId] = useState<string>(initialThreadId || nanoid())
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState<string>(initialModelId || "")
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1000)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [attachments, setAttachments] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<string>("chat")

  // Fetch models from Supabase
  const { data: models, isLoading: isLoadingModels } = useSupabaseFetch({
    endpoint: "/api/models",
    resourceName: "Models",
    dataKey: "models",
  })

  // Fetch tools from Supabase
  const { data: tools, isLoading: isLoadingTools } = useSupabaseFetch({
    endpoint: "/api/tools",
    resourceName: "Tools",
    dataKey: "tools",
  })

  // Fetch threads from LibSQL
  const {
    data: threads,
    isLoading: isLoadingThreads,
    refetch: refetchThreads,
  } = useSupabaseFetch({
    endpoint: "/api/threads",
    resourceName: "Threads",
    dataKey: "threads",
  })

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

  // Load messages for the current thread
  useEffect(() => {
    if (threadId) {
      fetchMessages(threadId)
    }
  }, [threadId])

  // Fetch messages for a thread
  const fetchMessages = async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads/${threadId}/messages`)
      if (!response.ok) throw new Error("Failed to fetch messages")

      const data = await response.json()

      if (data.messages) {
        setMessages(
          data.messages.map((msg: any) => ({
            id: msg.id || nanoid(),
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
          })),
        )
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast.error("Failed to load messages")
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() && attachments.length === 0) return

    // Add user message to the UI immediately
    const userMessage: Message = {
      id: nanoid(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    }

    setMessages((prev) => [...prev, userMessage])

    // Add loading message
    const loadingMessage: Message = {
      id: nanoid(),
      role: "assistant",
      content: "",
      isLoading: true,
    }

    setMessages((prev) => [...prev, loadingMessage])
    setInput("")
    setAttachments([])
    setIsLoading(true)

    try {
      // Format messages for the API
      const apiMessages = messages
        .filter((m) => !m.isLoading)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }))

      // Add the new user message
      apiMessages.push({
        role: "user",
        content: input,
      })

      // Determine which API endpoint to use
      const apiEndpoint = agentId ? `/api/agents/${agentId}/run` : "/api/chat"

      // Prepare request body
      const requestBody: any = {
        messages: apiMessages,
        threadId,
      }

      // Add model ID if not using an agent
      if (!agentId && selectedModelId) {
        requestBody.modelId = selectedModelId
      }

      // Add tools if selected
      if (selectedTools.length > 0) {
        requestBody.tools = selectedTools
      }

      // Add temperature and max tokens
      requestBody.temperature = temperature
      requestBody.maxTokens = maxTokens

      // Make API request
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let responseText = ""

      if (reader) {
        // Remove loading message
        setMessages((prev) => prev.filter((m) => !m.isLoading))

        // Add assistant message that will be updated
        const assistantMessageId = nanoid()
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
          },
        ])

        // Process the stream
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          // Decode the chunk and update the message
          const chunk = decoder.decode(value, { stream: true })
          responseText += chunk

          // Update the assistant message with the accumulated text
          setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? { ...m, content: responseText } : m)))
        }
      }

      // Refetch threads to update the list
      refetchThreads()
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Failed to send message")

      // Remove loading message
      setMessages((prev) => prev.filter((m) => !m.isLoading))
    } finally {
      setIsLoading(false)
    }
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
  const handleCreateThread = () => {
    const newThreadId = nanoid()
    setThreadId(newThreadId)
    setMessages([])
    router.push(`/chat?thread=${newThreadId}`)
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

  // Render message content with support for code blocks, mermaid diagrams, etc.
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

          // Check if it's a mermaid diagram
          if (language === "mermaid") {
            return <MermaidDiagram key={index} code={code} />
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
            <TabsList className="h-12">
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
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className={cn("p-4", message.role === "assistant" ? "bg-secondary" : "bg-background")}>
                      <div className="flex items-start gap-4">
                        <Avatar className={cn("h-8 w-8", message.role === "assistant" ? "bg-primary" : "bg-muted")}>
                          {message.role === "assistant" ? (
                            <Bot className="h-4 w-4 text-primary-foreground" />
                          ) : (
                            <div className="h-4 w-4 rounded-full bg-foreground" />
                          )}
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          {message.isLoading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm text-muted-foreground">Thinking...</span>
                            </div>
                          ) : (
                            <>
                              <div className="prose dark:prose-invert max-w-none">
                                {renderMessageContent(message.content)}
                              </div>

                              {/* Render attachments if any */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  {message.attachments.map((attachment, i) => (
                                    <div key={i} className="border rounded-md p-2">
                                      {attachment.type === "image" ? (
                                        <ImageDisplay
                                          src={attachment.url || "/placeholder.svg"}
                                          alt={attachment.name}
                                        />
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-4 w-4" />
                                          <span className="text-sm truncate">{attachment.name}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {message.timestamp && (
                                <div className="text-xs text-muted-foreground">
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
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
                    className="flex-1 min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e)
                      }
                    }}
                  />

                  <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && attachments.length === 0)}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span />) : (
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

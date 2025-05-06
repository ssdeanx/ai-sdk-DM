"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAgentExecutor } from "@/hooks/use-executor"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
  toolCall?: {
    name: string
    parameters: Record<string, any>
  }
  toolResult?: any
}

interface AgentExecutorProps {
  agent: {
    id: string
    name: string
    description: string
    model_id: string
    tool_ids: string[]
    system_prompt?: string
    model?: string
    tools?: string[]
  }
  onExecutionComplete?: (messages: Message[]) => void
}

export function AgentExecutor({ agent, onExecutionComplete }: AgentExecutorProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I'm ${agent.name}. How can I help you today?`,
    },
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use our custom hook for agent execution
  const { executeAgent, isExecuting } = useAgentExecutor({
    agentId: agent.id,
    onError: () => {
      // Add an error message
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "Sorry, I encountered an error while processing your request.",
        },
      ])
    }
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isExecuting) return

    const userMessage: Message = {
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    try {
      // Use our custom hook to execute the agent
      const data = await executeAgent(input, messages)

      // Add the agent's response to messages
      setMessages((prev) => [...prev, ...data.messages])

      if (onExecutionComplete) {
        onExecutionComplete([...messages, userMessage, ...data.messages])
      }
    } catch (error) {
      console.error("Error executing agent:", error)
      // Error handling is done in the hook
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Bot className="mr-2 h-5 w-5" />
            {agent.name}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{agent.model || "Unknown Model"}</Badge>
            {agent.tools && agent.tools.length > 0 && <Badge variant="secondary">{agent.tools.length} Tools</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full max-h-[500px] p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {message.role === "user" ? "U" : message.role === "system" ? "S" : "A"}
                    </AvatarFallback>
                    <AvatarImage
                      src={
                        message.role === "user"
                          ? "/placeholder.svg?height=32&width=32"
                          : "/placeholder.svg?height=32&width=32&text=AI"
                      }
                    />
                  </Avatar>
                  <div
                    className={`mx-2 rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.role === "system"
                          ? "bg-muted/50 border"
                          : "bg-muted"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>

                    {message.toolCall && (
                      <div className="mt-2 p-2 border rounded-md bg-background/80">
                        <div className="text-xs font-medium mb-1">Using tool: {message.toolCall.name}</div>
                        <div className="text-xs overflow-x-auto">
                          <pre className="text-xs">{JSON.stringify(message.toolCall.parameters, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {message.toolResult && (
                      <div className="mt-2 p-2 border rounded-md bg-background/80">
                        <div className="text-xs font-medium mb-1">Tool result:</div>
                        <div className="text-xs overflow-x-auto">
                          <pre className="text-xs">{JSON.stringify(message.toolResult, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />

            {isExecuting && (
              <div className="flex justify-start">
                <div className="flex max-w-[80%]">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>A</AvatarFallback>
                    <AvatarImage src="/placeholder.svg?height=32&width=32&text=AI" />
                  </Avatar>
                  <div className="mx-2 rounded-lg p-3 bg-muted">
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t p-3">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isExecuting}
            className="flex-1"
          />
          <Button type="submit" disabled={isExecuting || !input.trim()}>
            {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

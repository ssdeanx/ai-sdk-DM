"use client"

import { useState, useCallback, useEffect } from "react"
import { nanoid } from "nanoid"
import { toast } from "sonner"

export interface Message {
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

interface UseChatOptions {
  initialMessages?: Message[]
  initialThreadId?: string
  onError?: (error: Error) => void
  onResponse?: (response: any) => void
  onFinish?: (messages: Message[]) => void
  apiEndpoint?: string
}

export function useChat({
  initialMessages = [],
  initialThreadId,
  onError,
  onResponse,
  onFinish,
  apiEndpoint = "/api/chat",
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [threadId, setThreadId] = useState<string>(initialThreadId || nanoid())
  const [attachments, setAttachments] = useState<any[]>([])

  // Reset messages when threadId changes
  useEffect(() => {
    if (initialThreadId !== threadId) {
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
          }))
        )
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast.error("Failed to load messages")
      if (onError && error instanceof Error) {
        onError(error)
      }
    }
  }

  // Send a message
  const sendMessage = useCallback(
    async (options: {
      message?: string
      attachments?: any[]
      modelId?: string
      tools?: string[]
      temperature?: number
      maxTokens?: number
      agentId?: string
    } = {}) => {
      const {
        message = input,
        attachments: messageAttachments = attachments,
        modelId,
        tools = [],
        temperature = 0.7,
        maxTokens = 1000,
        agentId,
      } = options

      if (!message.trim() && messageAttachments.length === 0) return

      // Add user message to the UI immediately
      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
        attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
      }

      setMessages((prev) => [...prev, userMessage])

      // Add loading message
      const loadingMessageId = nanoid()
      setMessages((prev) => [
        ...prev,
        {
          id: loadingMessageId,
          role: "assistant",
          content: "",
          isLoading: true,
        },
      ])

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
          content: message,
        })

        // Determine which API endpoint to use
        const endpoint = agentId ? `/api/agents/${agentId}/run` : apiEndpoint

        // Prepare request body
        const requestBody: any = {
          messages: apiMessages,
          threadId,
        }

        // Add model ID if not using an agent
        if (!agentId && modelId) {
          requestBody.modelId = modelId
        }

        // Add tools if selected
        if (tools.length > 0) {
          requestBody.tools = tools
        }

        // Add temperature and max tokens
        requestBody.temperature = temperature
        requestBody.maxTokens = maxTokens

        // Make API request
        const response = await fetch(endpoint, {
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
          setMessages((prev) => prev.filter((m) => m.id !== loadingMessageId))

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
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMessageId ? { ...m, content: responseText } : m))
            )

            // Call onResponse callback if provided
            if (onResponse) {
              onResponse({ text: responseText, chunk })
            }
          }

          // Call onFinish callback if provided
          if (onFinish) {
            onFinish([...messages, userMessage, { id: assistantMessageId, role: "assistant", content: responseText }])
          }
        }
      } catch (error) {
        console.error("Error sending message:", error)
        toast.error("Failed to send message")

        // Remove loading message
        setMessages((prev) => prev.filter((m) => !m.isLoading))

        // Add error message
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "system",
            content: "Sorry, I encountered an error while processing your request.",
            timestamp: new Date().toISOString(),
          },
        ])

        if (onError && error instanceof Error) {
          onError(error)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [messages, input, threadId, attachments, apiEndpoint, onError, onResponse, onFinish]
  )

  return {
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
  }
}

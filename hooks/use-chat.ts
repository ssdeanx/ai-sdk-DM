
"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { nanoid } from "nanoid"
import { toast } from "sonner"
import { LRUCache } from "lru-cache"
import { LanguageModelV1Middleware } from "ai";
import { RequestMiddleware, ResponseMiddleware } from "@/lib/middleware";

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
  cacheOptions?: {
    enabled?: boolean
    ttl?: number
    maxSize?: number
  }
  streamables?: {
    [key: string]: {
      initialValue?: React.ReactNode
      onUpdate?: (value: React.ReactNode) => void
    }
  }
  multistepOptions?: {
    enableToolComposition?: boolean
    contextWindow?: number
    maxSteps?: number
  }
  middleware?: {
    languageModel?: LanguageModelV1Middleware | LanguageModelV1Middleware[]
    request?: any[] // RequestMiddleware | RequestMiddleware[]
    response?: any[] // ResponseMiddleware | ResponseMiddleware[]
  }
  extractReasoning?: boolean
  simulateStreaming?: boolean
  defaultSettings?: {
    temperature?: number
    maxTokens?: number
    providerMetadata?: Record<string, any>
  }
}

export function useChat({
  initialMessages = [],
  initialThreadId,
  onError,
  onResponse,
  onFinish,
  apiEndpoint = "/api/chat",
  cacheOptions = {
    enabled: true,
    ttl: 60_000, // 1 minute default
    maxSize: 100,
  },
  streamables,
  middleware,
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [threadId, setThreadId] = useState<string>(initialThreadId || nanoid())
  const [attachments, setAttachments] = useState<any[]>([])
  const [streamableValues, setStreamableValues] = useState<Record<string, React.ReactNode>>({})
  const abortControllerRef = useRef<AbortController | null>(null)

  const cache = useRef(
    new LRUCache<string, any>({
      max: cacheOptions.maxSize ?? 100,
      ttl: cacheOptions.ttl ?? 60_000,
      updateAgeOnGet: true,
      ttlAutopurge: true,
    })
  )

  // Initialize streamable values
  useEffect(() => {
    if (streamables) {
      const initialValues: Record<string, React.ReactNode> = {}
      Object.entries(streamables).forEach(([key, config]) => {
        initialValues[key] = config.initialValue || null
      })
      setStreamableValues(initialValues)
    }
  }, [streamables])

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
      middleware?: {
        languageModel?: LanguageModelV1Middleware | LanguageModelV1Middleware[]
        request?: RequestMiddleware | RequestMiddleware[]
        response?: ResponseMiddleware | ResponseMiddleware[]
      }
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

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController()

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

        // Generate cache key based on messages and other parameters
        const cacheKey = JSON.stringify({
          messages: apiMessages,
          modelId: modelId,
          temperature: temperature,
          maxTokens: maxTokens,
          tools: tools
        })

        // Check cache if enabled
        if (cacheOptions.enabled && cache.current.has(cacheKey)) {
          const cachedResponse = cache.current.get(cacheKey)
          // Use cached response
          setMessages((prev) => [
            ...prev.filter((m) => !m.isLoading),
            {
              id: nanoid(),
              role: "assistant",
              content: cachedResponse,
              timestamp: new Date().toISOString(),
            },
          ])

          if (onFinish) {
            onFinish([...messages, userMessage, {
              id: nanoid(),
              role: "assistant",
              content: cachedResponse
            }])
          }

          return cachedResponse
        }

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

        // Add middleware if provided
        if (options.middleware) {
          requestBody.middleware = options.middleware;
        } else if (middleware) {
          requestBody.middleware = middleware;
        }

        // Make API request
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal
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

          try {
            // Process the stream with proper backpressure handling
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

              // Add a small delay to prevent UI blocking
              await new Promise(resolve => setTimeout(resolve, 0))

              // Handle streamable updates
              if (chunk.includes('__STREAMABLE_UPDATE__')) {
                try {
                  const streamableUpdate = JSON.parse(chunk.split('__STREAMABLE_UPDATE__')[1])
                  if (streamableUpdate && streamableUpdate.key && streamables?.[streamableUpdate.key]) {
                    setStreamableValues(prev => ({
                      ...prev,
                      [streamableUpdate.key]: streamableUpdate.value
                    }))

                    // Call onUpdate if provided
                    streamables[streamableUpdate.key].onUpdate?.(streamableUpdate.value)
                  }
                } catch (e) {
                  console.error('Error parsing streamable update:', e)
                }
              }
            }
          } catch (error) {
            // Check if error is due to abort
            if (error instanceof Error && error.name === 'AbortError') {
              console.log('Stream was aborted')
            } else {
              throw error
            }
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
        abortControllerRef.current = null
      }
    },
    [messages, input, threadId, attachments, apiEndpoint, onError, onResponse, onFinish, cacheOptions, streamables]
  )

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null

      // Remove loading message
      setMessages((prev) => prev.filter((m) => !m.isLoading))
      setIsLoading(false)
    }
  }, [])

  // Add step management functions
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [steps, setSteps] = useState<Array<{
    id: string
    name: string
    status: 'pending' | 'in_progress' | 'completed' | 'error'
    result?: any
  }>>([])

  const addStep = useCallback((name: string) => {
    const stepId = nanoid()
    setSteps(prev => [...prev, {
      id: stepId,
      name,
      status: 'pending'
    }])
    return stepId
  }, [])

  const updateStepStatus = useCallback((stepId: string, status: 'pending' | 'in_progress' | 'completed' | 'error', result?: any) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId
        ? { ...step, status, ...(result ? { result } : {}) }
        : step
    ))
  }, [])

  const goToNextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1)
  }, [])

  const goToPreviousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1))
  }, [])

  const runSequentialGenerations = useCallback(async (
    prompts: string[],
    options?: {
      modelId?: string
      temperature?: number
      maxTokens?: number
      tools?: string[]
      onProgress?: (index: number, result: string) => void
    }
  ) => {
    const results: string[] = []

    for (let i = 0; i < prompts.length; i++) {
      let prompt = prompts[i]

      // Replace placeholders with previous results
      for (let j = 0; j < i; j++) {
        prompt = prompt.replace(`{${j}}`, results[j])
      }

      // Send the message
      const result = await sendMessage({
        message: prompt,
        modelId: options?.modelId,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        tools: options?.tools
      })

      results.push(result)

      // Call progress callback if provided
      options?.onProgress?.(i, result)
    }

    return results
  }, [sendMessage])

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
    stop,
    streamableValues,
    currentStep,
    steps,
    addStep,
    updateStepStatus,
    goToNextStep,
    goToPreviousStep,
    runSequentialGenerations,
  }
}

// Export middleware creation functions for use in the application
export {
  createCachingMiddleware,
  createLoggingMiddleware,
  createMiddlewareFromOptions
} from '@/lib/middleware';




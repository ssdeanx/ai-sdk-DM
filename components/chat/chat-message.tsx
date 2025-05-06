"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Bot, Copy, Check, User, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GradientCard } from "@/components/ui/gradient-card"
import { CodeBlock } from "./code-block"
import { MermaidDiagram } from "./mermaid-diagram"
import { ImageDisplay } from "./image-display"

interface ChatMessageProps {
  message: {
    id: string
    role: "user" | "assistant" | "system" | "tool"
    content: string
    attachments?: Array<{
      type: string
      name: string
      url?: string
    }>
    timestamp?: string
    isLoading?: boolean
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  // Determine gradient colors based on role
  const getGradientColors = () => {
    switch (message.role) {
      case "assistant":
        return {
          from: "from-blue-500",
          to: "to-violet-500",
        }
      case "user":
        return {
          from: "from-emerald-500",
          to: "to-teal-500",
        }
      case "system":
        return {
          from: "from-amber-500",
          to: "to-orange-500",
        }
      default:
        return {
          from: "from-gray-500",
          to: "to-gray-600",
        }
    }
  }

  const { from, to } = getGradientColors()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GradientCard 
        variant="subtle" 
        gradientFrom={from} 
        gradientTo={to}
        className={cn(
          "p-0 overflow-hidden",
          message.role === "user" ? "ml-12" : "mr-12"
        )}
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div 
              className={cn(
                "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                message.role === "assistant" 
                  ? "bg-gradient-to-br from-blue-500 to-violet-500" 
                  : message.role === "user"
                    ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                    : "bg-gradient-to-br from-amber-500 to-orange-500"
              )}
            >
              {message.role === "assistant" ? (
                <Bot className="h-4 w-4 text-white" />
              ) : message.role === "user" ? (
                <User className="h-4 w-4 text-white" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-white" />
              )}
            </div>

            {/* Message content */}
            <div className="flex-1 space-y-2">
              {message.isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  <span className="text-sm text-muted-foreground ml-1">Thinking...</span>
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
                        <div key={i} className="border rounded-md p-2 bg-background/50">
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
                </>
              )}
            </div>

            {/* Copy button */}
            {!message.isLoading && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="sr-only">Copy message</span>
              </Button>
            )}
          </div>

          {/* Timestamp */}
          {message.timestamp && (
            <div className="text-xs text-muted-foreground mt-2 text-right">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </GradientCard>
    </motion.div>
  )
}

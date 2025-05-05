"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Button } from "@/components/ui/button"

interface CodeBlockProps {
  language: string
  code: string
}

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative my-4 rounded-md overflow-hidden">
      <div className="flex items-center justify-between bg-zinc-800 px-4 py-2 text-xs text-zinc-100">
        <span>{language}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-100 hover:text-white hover:bg-zinc-700"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span className="sr-only">Copy code</span>
        </Button>
      </div>
      <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ margin: 0, borderRadius: 0 }}>
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

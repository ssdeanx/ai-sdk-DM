"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Copy, Check, Maximize, Minimize, Download } from "lucide-react"
import mermaid from "mermaid"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface MermaidDiagramProps {
  code: string
  className?: string
}

export function MermaidDiagram({ code, className }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        setLoading(true)
        setError(null)

        // Initialize mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains("dark") ? "dark" : "default",
          securityLevel: "loose",
          fontFamily: "inherit",
        })

        // Render the diagram
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, code)
        setSvg(svg)
        setLoading(false)
      } catch (err) {
        console.error("Failed to render mermaid diagram:", err)
        setError("Failed to render diagram. Please check your syntax.")
        setLoading(false)
      }
    }

    renderDiagram()
  }, [code])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!svg) return

    const blob = new Blob([svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "diagram.svg"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className={cn(
        "relative my-4 rounded-lg overflow-hidden border border-border/50 shadow-md transition-all duration-300 bg-background",
        expanded && "fixed inset-4 z-50 bg-background flex flex-col",
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      ref={containerRef}
    >
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 px-4 py-2 text-xs text-white">
        <span className="font-mono">Mermaid Diagram</span>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered || expanded ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="sr-only">Copy code</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only">Download SVG</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            <span className="sr-only">{expanded ? "Minimize" : "Maximize"}</span>
          </Button>
        </motion.div>
      </div>

      <div className={cn("p-4 bg-white dark:bg-zinc-900", expanded && "flex-1 overflow-auto")}>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
            <p className="font-medium">Error</p>
            <p>{error}</p>
            <pre className="mt-2 p-2 bg-background rounded overflow-x-auto text-xs">{code}</pre>
          </div>
        ) : (
          <div
            className="flex justify-center"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
    </div>
  )
}

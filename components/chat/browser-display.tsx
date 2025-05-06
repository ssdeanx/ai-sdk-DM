"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, RefreshCw, ExternalLink, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BrowserDisplayProps {
  url: string
  title?: string
  className?: string
}

export function BrowserDisplay({ url, title, className }: BrowserDisplayProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
      setLoading(true)
    }
  }

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenExternal = () => {
    window.open(url, "_blank")
  }

  return (
    <div 
      className={cn(
        "relative rounded-lg overflow-hidden border border-border/50 shadow-md transition-all duration-300 bg-background",
        expanded && "fixed inset-4 z-50 bg-background flex flex-col",
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Browser chrome */}
      <div className="flex items-center bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 px-3 py-2 border-b border-border/50">
        {/* URL bar */}
        <div className="flex-1 flex items-center bg-background/80 backdrop-blur-sm rounded-md px-3 py-1.5 text-sm border border-border/30 mr-2">
          <div className="w-full truncate text-muted-foreground">{url}</div>
        </div>
        
        {/* Controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered || expanded ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full hover:bg-accent/50"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full hover:bg-accent/50"
            onClick={handleCopyUrl}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="sr-only">Copy URL</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full hover:bg-accent/50"
            onClick={handleOpenExternal}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="sr-only">Open in new tab</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full hover:bg-accent/50"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            <span className="sr-only">{expanded ? "Minimize" : "Maximize"}</span>
          </Button>
        </motion.div>
      </div>
      
      {/* Browser content */}
      <div className={cn(
        "relative bg-white",
        expanded ? "flex-1" : "h-[400px]"
      )}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          </div>
        )}
        <iframe 
          ref={iframeRef}
          src={url} 
          title={title || "Browser content"} 
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  )
}

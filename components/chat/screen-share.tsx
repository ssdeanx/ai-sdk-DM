"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, Play, Pause, Download, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ScreenShareProps {
  src: string
  title?: string
  isVideo?: boolean
  className?: string
}

export function ScreenShare({ src, title, isVideo = true, className }: ScreenShareProps) {
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [hovered, setHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
        setPlaying(true)
      } else {
        videoRef.current.pause()
        setPlaying(false)
      }
    }
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = src
    link.download = title || "screen-recording"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    const videoElement = videoRef.current
    if (videoElement) {
      const handlePlay = () => setPlaying(true)
      const handlePause = () => setPlaying(false)
      
      videoElement.addEventListener("play", handlePlay)
      videoElement.addEventListener("pause", handlePause)
      
      return () => {
        videoElement.removeEventListener("play", handlePlay)
        videoElement.removeEventListener("pause", handlePause)
      }
    }
  }, [])

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
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-gray-900/90 to-gray-800/90 px-3 py-2 text-white">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">{title || "Screen Recording"}</span>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered || expanded ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1"
        >
          {isVideo && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={handlePlayPause}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span className="sr-only">{playing ? "Pause" : "Play"}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only">Download</span>
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
      
      {/* Content */}
      <div className={cn(
        "relative bg-black",
        expanded ? "flex-1" : "h-[400px]"
      )}>
        {isVideo ? (
          <video 
            ref={videoRef}
            src={src} 
            className="w-full h-full object-contain"
            controls={false}
            playsInline
          />
        ) : (
          <img 
            src={src} 
            alt={title || "Screen capture"} 
            className="w-full h-full object-contain"
          />
        )}
        
        {/* Video controls overlay (visible on hover) */}
        {isVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: hovered ? 0.8 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4"
          >
            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/20 text-white hover:bg-white/30"
                onClick={handlePlayPause}
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

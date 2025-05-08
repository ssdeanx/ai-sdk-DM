"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, Download, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface AudioPlayerProps {
  title?: string
  src: string
  waveform?: boolean
  className?: string
}

export function AudioPlayer({ 
  title, 
  src,
  waveform = true,
  className
}: AudioPlayerProps) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [audioData, setAudioData] = useState<Uint8Array | null>(null)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  
  // Initialize audio context and analyser
  useEffect(() => {
    if (typeof window !== 'undefined' && waveform) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      const context = new AudioContext()
      const analyserNode = context.createAnalyser()
      analyserNode.fftSize = 256
      const bufferLength = analyserNode.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      setAudioContext(context)
      setAnalyser(analyserNode)
      setAudioData(dataArray)
      
      return () => {
        if (context.state !== 'closed') {
          context.close()
        }
      }
    }
  }, [waveform])
  
  // Connect audio element to analyser when both are available
  useEffect(() => {
    if (audioRef.current && audioContext && analyser && waveform) {
      const source = audioContext.createMediaElementSource(audioRef.current)
      source.connect(analyser)
      analyser.connect(audioContext.destination)
    }
  }, [audioRef.current, audioContext, analyser, waveform])
  
  // Draw waveform visualization
  const drawWaveform = () => {
    if (!analyser || !audioData || !canvasRef.current) return
    
    animationRef.current = requestAnimationFrame(drawWaveform)
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    analyser.getByteFrequencyData(audioData)
    
    const width = canvas.width
    const height = canvas.height
    const barWidth = width / audioData.length
    
    ctx.clearRect(0, 0, width, height)
    
    // Get theme colors
    const isDarkMode = document.documentElement.classList.contains('dark')
    const primaryColor = isDarkMode ? '#8b5cf6' : '#6d28d9' // purple-500/600
    const secondaryColor = isDarkMode ? '#4c1d95' : '#ddd6fe' // purple-900/purple-100
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, primaryColor)
    gradient.addColorStop(1, secondaryColor)
    
    for (let i = 0; i < audioData.length; i++) {
      const barHeight = (audioData[i] / 255) * height
      
      ctx.fillStyle = gradient
      ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight)
    }
  }
  
  // Start/stop visualization based on playing state
  useEffect(() => {
    if (playing && waveform) {
      drawWaveform()
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [playing, waveform])
  
  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }
    
    const handleEnded = () => {
      setPlaying(false)
      setCurrentTime(0)
      audio.currentTime = 0
    }
    
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])
  
  // Handle play/pause
  const togglePlay = () => {
    if (!audioRef.current) return
    
    if (playing) {
      audioRef.current.pause()
    } else {
      // Resume AudioContext if it was suspended
      if (audioContext?.state === 'suspended') {
        audioContext.resume()
      }
      audioRef.current.play()
    }
    
    setPlaying(!playing)
  }
  
  // Handle seek
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return
    
    const newTime = value[0]
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }
  
  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return
    
    const newVolume = value[0]
    audioRef.current.volume = newVolume
    setVolume(newVolume)
    
    if (newVolume === 0) {
      setMuted(true)
    } else if (muted) {
      setMuted(false)
    }
  }
  
  // Handle mute toggle
  const toggleMute = () => {
    if (!audioRef.current) return
    
    if (muted) {
      audioRef.current.volume = volume
      setMuted(false)
    } else {
      audioRef.current.volume = 0
      setMuted(true)
    }
  }
  
  // Format time (seconds to MM:SS)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  
  // Handle download
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = src
    link.download = title ? `${title.replace(/\s+/g, '-').toLowerCase()}.mp3` : 'audio.mp3'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-800 to-indigo-800 px-4 py-2 text-white">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4" />
          <span className="font-medium">{title || "Audio Player"}</span>
        </div>
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
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only">Download audio</span>
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
      
      <div className={cn(
        "p-4",
        expanded ? "flex-1" : ""
      )}>
        {/* Waveform visualization */}
        {waveform && (
          <div className={cn(
            "mb-4 bg-muted/30 rounded-md overflow-hidden",
            expanded ? "h-[200px]" : "h-[100px]"
          )}>
            <canvas 
              ref={canvasRef} 
              width={expanded ? 800 : 400} 
              height={expanded ? 200 : 100}
              className="w-full h-full"
            />
          </div>
        )}
        
        {/* Audio element (hidden) */}
        <audio ref={audioRef} src={src} preload="metadata" />
        
        {/* Controls */}
        <div className="space-y-2">
          {/* Time slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>
          
          {/* Playback controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 rounded-full"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = 0
                    setCurrentTime(0)
                  }
                }}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={togglePlay}
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 rounded-full"
                onClick={() => {
                  if (audioRef.current && duration) {
                    audioRef.current.currentTime = Math.min(duration, currentTime + 10)
                  }
                }}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Volume control */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 rounded-full"
                onClick={toggleMute}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[muted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-24"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, Download, Copy, Check, Sparkles, RefreshCw, Image as ImageIcon, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface AIImageGeneratorProps {
  title?: string
  initialPrompt?: string
  generatedImage?: string
  className?: string
  onGenerate?: (prompt: string, settings: ImageGenerationSettings) => Promise<string>
}

interface ImageGenerationSettings {
  model: string
  style: string
  size: string
  quality: number
  seed?: number
}

export function AIImageGenerator({
  title = "AI Image Generator",
  initialPrompt = "",
  generatedImage = "",
  className,
  onGenerate
}: AIImageGeneratorProps) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const [prompt, setPrompt] = useState(initialPrompt)
  const [image, setImage] = useState(generatedImage)
  const [generating, setGenerating] = useState(false)
  const [settings, setSettings] = useState<ImageGenerationSettings>({
    model: "dall-e-3",
    style: "vivid",
    size: "1024x1024",
    quality: 75,
    seed: undefined
  })

  // Handle copy prompt
  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle download image
  const handleDownload = () => {
    if (!image) return

    const link = document.createElement("a")
    link.href = image
    link.download = `ai-image-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle generate image
  const handleGenerate = async () => {
    if (!prompt.trim() || !onGenerate) return

    setGenerating(true)
    try {
      const newImage = await onGenerate(prompt, settings)
      setImage(newImage)
    } catch (error) {
      console.error("Failed to generate image:", error)
      // Show error message
    } finally {
      setGenerating(false)
    }
  }

  // Handle setting change
  const handleSettingChange = (key: keyof ImageGenerationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Handle random seed
  const handleRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 1000000)
    handleSettingChange('seed', randomSeed)
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
      <div className="flex items-center justify-between bg-gradient-to-r from-fuchsia-700 to-pink-700 px-4 py-2 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="font-medium">{title}</span>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered || expanded ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1"
        >
          {image && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={handleCopyPrompt}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="sr-only">Copy prompt</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={handleDownload}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="sr-only">Download image</span>
              </Button>
            </>
          )}
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
        "flex flex-col",
        expanded ? "flex-1" : "max-h-[600px]"
      )}>
        <div className="p-4 border-b">
          <Textarea
            placeholder="Describe the image you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[80px] resize-none"
          />

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="model">Model</Label>
              <Select
                value={settings.model}
                onValueChange={(value) => handleSettingChange('model', value)}
              >
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                  <SelectItem value="dall-e-2">DALL-E 2</SelectItem>
                  <SelectItem value="stable-diffusion">Stable Diffusion</SelectItem>
                  <SelectItem value="midjourney">Midjourney</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="style">Style</Label>
              <Select
                value={settings.style}
                onValueChange={(value) => handleSettingChange('style', value)}
              >
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vivid">Vivid</SelectItem>
                  <SelectItem value="natural">Natural</SelectItem>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                  <SelectItem value="digital-art">Digital Art</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="size">Size</Label>
              <Select
                value={settings.size}
                onValueChange={(value) => handleSettingChange('size', value)}
              >
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">1024x1024 (Square)</SelectItem>
                  <SelectItem value="1792x1024">1792x1024 (Landscape)</SelectItem>
                  <SelectItem value="1024x1792">1024x1792 (Portrait)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="seed" className="flex items-center justify-between">
                <span>Seed</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleRandomSeed}
                  className="h-5 w-5"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="seed"
                  type="number"
                  value={settings.seed || ''}
                  onChange={(e) => handleSettingChange('seed', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Random"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="quality" className="flex items-center justify-between">
              <span>Quality: {settings.quality}%</span>
            </Label>
            <Slider
              id="quality"
              min={25}
              max={100}
              step={25}
              value={[settings.quality]}
              onValueChange={(value) => handleSettingChange('quality', value[0])}
              className="mt-2"
            />
          </div>

          <Button
            variant="gradient"
            className="w-full mt-4"
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
          >
            {generating ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Image
              </>
            )}
          </Button>
        </div>

        <div className={cn(
          "flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30",
          !image && "min-h-[300px]"
        )}>
          {image ? (
            <img
              src={image}
              alt={prompt}
              className="max-w-full max-h-full object-contain rounded-md shadow-md"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Generated image will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Input component for seed
function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

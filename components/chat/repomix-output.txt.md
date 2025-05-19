# File Summary

## Purpose

This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format

The content is organized as follows:

1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
   a. A header with the file path (## File: path/to/file)
   b. The full contents of the file in a code block

## Usage Guidelines

- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes

- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: components/chat
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Empty lines have been removed from all files
- Content has been formatted for parsing in markdown style
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure

```
components/chat/ai-image-generator.tsx
components/chat/ai-sdk-chat.tsx
components/chat/ai-sdk-chatHelper.module.css
components/chat/ai-sdk-chatHelper.tsx
components/chat/audio-player.tsx
components/chat/browser-display.tsx
components/chat/canvasDisplay.module.css
components/chat/canvasDisplay.tsx
components/chat/chat-message.tsx
components/chat/chat-sidebar.tsx
components/chat/code-block.tsx
components/chat/computer-use.tsx
components/chat/data-table.tsx
components/chat/data-visualization.tsx
components/chat/enhanced-chat.tsx
components/chat/file-upload.tsx
components/chat/image-display.tsx
components/chat/interactive-form.tsx
components/chat/interactive-map.tsx
components/chat/mermaid-diagram.tsx
components/chat/middleware-config.tsx
components/chat/model-viewer.tsx
components/chat/openai-assistant-chat.tsx
components/chat/screen-share.tsx
components/chat/three-viewer.tsx
components/chat/tracing-visualization.tsx
components/chat/visualization-with-tracing.tsx
```

# Files

## File: components/chat/ai-sdk-chatHelper.module.css

```css
.parseErrorRoot {
.parseErrorTitle {
.parseErrorMessage {
.parseErrorPre {
.parseErrorOriginalLabel {
.parseErrorCode {
```

## File: components/chat/canvasDisplay.module.css

```css
.canvasDisplayRoot {
.canvas {
.terminal {
.drawingStatus {
```

## File: components/chat/file-upload.tsx

```typescript
import type React from "react"
import { useRef } from "react"
import { Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
interface FileUploadProps {
  onUpload: (files: File[]) => void
  maxSize?: number // in MB
  accept?: string
}
⋮----
maxSize?: number // in MB
⋮----
export function FileUpload({
  onUpload,
  maxSize = 10, // Default 10MB
  accept = "image/*,text/*,application/pdf,application/json",
}: FileUploadProps)
⋮----
maxSize = 10, // Default 10MB
⋮----
const handleClick = () =>
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
⋮----
// Check file size
⋮----
// Filter out oversized files
⋮----
// Reset input
```

## File: components/chat/middleware-config.tsx

```typescript
// components/chat/middleware-config.tsx
import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
interface MiddlewareConfigProps {
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  }
  reasoning: {
    enabled: boolean;
    tagName: string;
    startWithReasoning: boolean;
  }
  simulation: {
    enabled: boolean;
  };
  logging: {
    enabled: boolean;
    logParams: boolean;
    logResults: boolean;
  }
  onChange: (config: any) => void;
}
⋮----
{/* Similar sections for reasoning, simulation, and logging */}      </CardContent>
```

## File: components/chat/three-viewer.tsx

```typescript
import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
// Import Three.js dynamically to avoid SSR issues
⋮----
interface ThreeViewerProps {
  modelUrl: string
  format: string
  backgroundColor?: string
  autoRotate?: boolean
  className?: string
}
⋮----
// Initialize Three.js
⋮----
const initThree = async () =>
⋮----
// Dynamically import Three.js modules
⋮----
// Import loaders based on format
⋮----
// Initialize scene, camera, renderer
⋮----
// Load model
⋮----
// Set up event listeners
⋮----
// Start animation loop
⋮----
// Clean up
⋮----
// Set up scene, camera, renderer
const setupScene = () =>
⋮----
// Create scene
⋮----
// Create camera
⋮----
// Create renderer
⋮----
// Create controls
⋮----
// Add lights
⋮----
// Create clock for animations
⋮----
// Load 3D model
const loadModel = (loader: any) =>
⋮----
// Handle different formats
⋮----
// Center model
⋮----
// Add model to scene
⋮----
// Set up animations if available
⋮----
// Handle progress
⋮----
// Center model
⋮----
// Add model to scene
⋮----
// Handle progress
⋮----
// Center model
⋮----
// Add model to scene
⋮----
// Handle progress
⋮----
// Set up event listeners
const setupEventListeners = () =>
⋮----
// Handle resize
const handleResize = () =>
⋮----
// Handle reset view
const handleResetView = () =>
⋮----
// Handle zoom
const handleZoom = (event: any) =>
⋮----
// Clean up event listeners
⋮----
// Animation loop
const animate = () =>
⋮----
// Update controls
⋮----
// Update animations
⋮----
// Render scene
⋮----
// Dispose of Three.js objects
const disposeScene = (scene: any) =>
// Dispose of material and its textures
const disposeMaterial = (material: any) =>
⋮----
className=
```

## File: components/chat/tracing-visualization.tsx

```typescript
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Maximize, Minimize, Download, RefreshCw, Copy, Check, BarChart,
  PieChart, LineChart, Activity, Zap, Clock, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { createTrace, createSpan, logEvent } from "@/lib/langfuse-integration"
// Import Chart.js dynamically to avoid SSR issues
⋮----
interface TracingEvent {
  id: string
  name: string
  timestamp: string
  metadata: any
}
interface TracingSpan {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
  metadata: any
}
interface TracingData {
  traceId: string
  events: TracingEvent[]
  spans: TracingSpan[]
}
interface TracingVisualizationProps {
  traceId?: string
  title?: string
  className?: string
  showControls?: boolean
  refreshInterval?: number
}
⋮----
// Fetch tracing data
const fetchTracingData = async (id: string) =>
⋮----
// This is a mock implementation - in a real app, you would fetch from your Langfuse backend
// const response = await fetch(`/api/tracing/${id}`)
// const data = await response.json()
// For demo purposes, we'll create mock data
⋮----
// Fetch data when traceId changes or on refresh
⋮----
// Set up refresh interval
⋮----
// Render timeline chart
⋮----
const renderTimelineChart = async () =>
⋮----
// Dynamically import Chart.js
⋮----
// Destroy existing chart
⋮----
// Get canvas element
⋮----
// Prepare data
⋮----
// Create chart
⋮----
// Handle refresh
const handleRefresh = () =>
// Handle expand/collapse
const handleExpandCollapse = () =>
⋮----
className=
⋮----
<td className="p-2">
⋮----
```

## File: components/chat/ai-image-generator.tsx

```typescript
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
⋮----
// Handle copy prompt
const handleCopyPrompt = async () =>
// Handle download image
const handleDownload = () =>
// Handle generate image
const handleGenerate = async () =>
⋮----
// Show error message
⋮----
// Handle setting change
const handleSettingChange = (key: keyof ImageGenerationSettings, value: any) =>
// Handle random seed
const handleRandomSeed = () =>
⋮----
className=
⋮----
onValueChange=
⋮----
disabled=
⋮----
// Input component for seed
```

## File: components/chat/browser-display.tsx

```typescript
import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, RefreshCw, ExternalLink, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
export interface BrowserDisplayProps {
  url: string
  title?: string
  className?: string
}
⋮----
const handleRefresh = () =>
const handleCopyUrl = async () =>
const handleOpenExternal = () =>
⋮----
className=
⋮----
{/* Browser chrome */}
⋮----
{/* URL bar */}
⋮----
{/* Controls */}
⋮----
{/* Browser content */}
⋮----
onLoad=
```

## File: components/chat/canvasDisplay.tsx

```typescript
import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import styles from './canvasDisplay.module.css';
// Import xterm.js and the canvas addon
import { Terminal } from "@xterm/xterm";
import { CanvasAddon } from "@xterm/addon-canvas";
⋮----
export interface CanvasDisplayProps {
  width?: number;
  height?: number;
  className?: string;
  draw?: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;
  children?: React.ReactNode;
  terminal?: boolean; // If true, show a terminal in the canvas
  terminalOptions?: ConstructorParameters<typeof Terminal>[0];
  terminalWelcomeMessage?: string;
}
⋮----
terminal?: boolean; // If true, show a terminal in the canvas
⋮----
/**
 * CanvasDisplay: Renders a live HTML5 canvas and allows custom drawing via a draw callback.
 * You can use this to render code, terminal, or even a VSCode-like UI in the canvas.
 *
 * Example usage:
 * <CanvasDisplay width={600} height={400} draw={(ctx, canvas) => { ctx.fillStyle = '#222'; ctx.fillRect(0,0,canvas.width,canvas.height); }} />
 */
export function CanvasDisplay({
  width = 600,
  height = 400,
  className,
  draw,
  children,
  terminal = false,
  terminalOptions,
  terminalWelcomeMessage = 'Welcome to the AI SDK Canvas Terminal!',
}: CanvasDisplayProps)
⋮----
// Canvas drawing effect
⋮----
// Terminal effect
⋮----
const prompt = () =>
```

## File: components/chat/chat-sidebar.tsx

```typescript
import { useState } from "react"
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  History,
  LineChart,
  PenToolIcon as Tool,
  Settings,
  Sparkles,
  Plus,
  MessageSquare,
} from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GradientCard } from "@/components/ui/gradient-card"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
interface ChatSidebarProps {
  className?: string
  models: Array<{ id: string; name: string }>
  tools: Array<{ id: string; name: string; description: string }>
  threads: Array<{ id: string; name: string; updated_at: string }>
  selectedModelId: string
  selectedThreadId: string
  selectedTools: string[]
  temperature: number
  maxTokens: number
  onModelChange: (modelId: string) => void
  onThreadChange: (threadId: string) => void
  onToolToggle: (toolId: string) => void
  onTemperatureChange: (value: number) => void
  onMaxTokensChange: (value: number) => void
  onCreateThread: () => void
}
⋮----
const [messages, setMessages] = useState<any[]>([]) // Initialize messages state
// Animation variants
⋮----
{/* Collapse toggle */}
⋮----
checked=
⋮----
onValueChange=
```

## File: components/chat/computer-use.tsx

```typescript
import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, Terminal, Copy, Check, Play, Pause, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
export interface ComputerUseProps {
  title: string
  content: string
  isTerminal?: boolean
  isRunnable?: boolean
  className?: string
  onRun?: () => void
}
⋮----
const handleCopy = async () =>
const handleRunToggle = () =>
⋮----
className=
⋮----
{/* Header */}
⋮----
{/* Content */}
⋮----
{/* Simulated output could go here */}
```

## File: components/chat/data-table.tsx

```typescript
import { useState } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, Download, Copy, Check, Table, Search, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
export interface Column {
  key: string
  title: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: any) => React.ReactNode
}
export interface DataTableProps {
  title?: string
  data: any[]
  columns: Column[]
  className?: string
  pagination?: boolean
  pageSize?: number
}
⋮----
// Handle copy data
const handleCopyData = async () =>
// Handle download CSV
const handleDownloadCSV = () =>
⋮----
// Create CSV content
⋮----
// Handle values with commas by wrapping in quotes
⋮----
// Create and trigger download
⋮----
// Handle sort
const handleSort = (key: string) =>
// Handle filter change
const handleFilterChange = (key: string, value: string) =>
⋮----
setCurrentPage(1) // Reset to first page when filtering
⋮----
// Handle search
const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) =>
⋮----
setCurrentPage(1) // Reset to first page when searching
⋮----
// Apply sorting, filtering and pagination
⋮----
// First apply search across all columns
⋮----
// Then apply column-specific filters
⋮----
// Then apply sorting
⋮----
// Calculate pagination
⋮----
className=
⋮----
{/* Search bar */}
⋮----
{/* Table */}
⋮----
onChange=
⋮----
? column.render(row[column.key], row)
⋮----
{/* Pagination */}
```

## File: components/chat/data-visualization.tsx

```typescript
import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Maximize, Minimize, Download, RefreshCw, Copy, Check, BarChart,
  PieChart, LineChart, AreaChart, ScatterPlot, Activity, Grid3X3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { createTrace, createSpan, logEvent } from "@/lib/langfuse-integration"
// Import libraries dynamically to avoid SSR issues
⋮----
// Import Recharts components dynamically - we'll use these in a future implementation
import dynamic from "next/dynamic"
⋮----
export interface DataPoint {
  label: string
  value: number
  color?: string
  x?: number | string
  y?: number
  z?: number
  size?: number
  [key: string]: any
}
export interface DataSeries {
  name: string
  data: DataPoint[] | number[]
  color?: string
  type?: string
}
export interface DataVisualizationProps {
  title?: string
  data: DataPoint[] | DataSeries[]
  type?: "bar" | "line" | "pie" | "doughnut" | "radar" | "polarArea" | "scatter" | "area" | "heatmap" | "bubble" | "radialBar" | "treemap"
  labels?: string[]
  className?: string
  xAxisLabel?: string
  yAxisLabel?: string
  stacked?: boolean
  is3D?: boolean
  isMultiSeries?: boolean
  theme?: "light" | "dark" | "colorful" | "monochrome"
  showLegend?: boolean
  showGrid?: boolean
  showTooltip?: boolean
  showAnimation?: boolean
  library?: "chartjs" | "plotly" | "recharts"
}
⋮----
// Create a trace when the component mounts
⋮----
async function initTrace()
⋮----
// Log visualization initialization event
⋮----
// Cleanup function
⋮----
// Log component unmount if we have a trace
⋮----
}, []) // Empty dependency array means this runs once on mount
// Default colors if not provided
⋮----
// Theme colors
⋮----
// Determine if data is multi-series
⋮----
// Prepare chart data for Chart.js
const prepareChartJsData = () =>
⋮----
// Multi-series data
⋮----
// Single series data
⋮----
// Prepare data for Plotly
const preparePlotlyData = () =>
⋮----
// Multi-series data
⋮----
// Default to bar
⋮----
// Single series data
⋮----
// Default to bar
⋮----
// Prepare data for Recharts
const prepareRechartsData = () =>
⋮----
// Multi-series data
⋮----
// Create a combined dataset for Recharts
⋮----
// Add values from each series
⋮----
// Single series data
⋮----
...item // Include all original properties
⋮----
// Create or update Chart.js chart
⋮----
async function loadAndDrawChartJs()
⋮----
// Log chart rendering start
⋮----
// Dynamically import Chart.js only on client
⋮----
// Destroy existing chart
⋮----
// Create new chart
⋮----
// Log successful chart rendering
⋮----
// Log chart rendering error
⋮----
// Cleanup
⋮----
// Create or update Plotly chart
⋮----
async function loadAndDrawPlotly()
⋮----
// Dynamically import Plotly.js only on client
⋮----
// Create new plot
⋮----
// Clear previous plot
⋮----
// Create new plot
⋮----
// Cleanup
⋮----
// Handle copy data
const handleCopyData = async () =>
⋮----
// Log copy data event
⋮----
// Log copy error
⋮----
// Handle download chart
const handleDownload = () =>
⋮----
// Log download event
⋮----
// Log download error
⋮----
// Handle chart type change with tracing
const handleChartTypeChange = (type: string) =>
⋮----
// Log chart type change
⋮----
// Handle expand/collapse with tracing
const handleExpandCollapse = () =>
⋮----
// Log expand/collapse event
⋮----
className=
```

## File: components/chat/interactive-form.tsx

```typescript
import { useState } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, FormInput, Check, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
export interface FormField {
  id: string
  type: 'text' | 'textarea' | 'number' | 'email' | 'checkbox' | 'radio' | 'select' | 'date'
  label: string
  placeholder?: string
  required?: boolean
  options?: { value: string, label: string }[] // For radio and select
  validation?: {
    pattern?: string
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    errorMessage?: string
  }
}
⋮----
options?: { value: string, label: string }[] // For radio and select
⋮----
export interface InteractiveFormProps {
  title?: string
  description?: string
  fields: FormField[]
  submitLabel?: string
  cancelLabel?: string
  onSubmit?: (data: Record<string, any>) => void
  onCancel?: () => void
  className?: string
}
⋮----
// Handle form input change
const handleChange = (id: string, value: any) =>
⋮----
// Clear error when field is changed
⋮----
// Validate a single field
const validateField = (field: FormField, value: any): string | null =>
⋮----
// Required check
⋮----
// Type-specific validation
⋮----
// Pattern validation
⋮----
// Number range validation
⋮----
// String length validation
⋮----
// Validate all fields
const validateForm = (): boolean =>
// Handle form submission
const handleSubmit = (e: React.FormEvent) =>
⋮----
// Simulate API call
⋮----
// Reset form
const resetForm = () =>
// Render form field based on type
⋮----
onChange=
className=
⋮----
onCheckedChange=
⋮----
<SelectTrigger id=
```

## File: components/chat/interactive-map.tsx

```typescript
import { useState, useRef, useEffect, useLayoutEffect } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, Download, MapPin, Search, Plus, Minus, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import L from "leaflet"
// Import Leaflet CSS statically to ensure it's bundled correctly
⋮----
// Import Leaflet dynamically to avoid SSR issues
import dynamic from "next/dynamic"
⋮----
export interface Location {
  lat: number
  lng: number
  title?: string
  description?: string
}
export interface InteractiveMapProps {
  title?: string
  center?: [number, number]
  zoom?: number
  locations?: Location[]
  className?: string
}
⋮----
center = [51.505, -0.09], // Default to London
⋮----
// Leaflet CSS is now imported statically above
// Fix marker icon issues
⋮----
// Handle copy locations
const handleCopyLocations = async () =>
// Handle download map (screenshot)
const handleDownload = () =>
⋮----
// This is a placeholder - actual implementation would require html2canvas or similar
⋮----
// Handle zoom in
const handleZoomIn = () =>
// Handle zoom out
const handleZoomOut = () =>
// Handle search
const handleSearch = (e: React.FormEvent) =>
⋮----
// This is a placeholder - actual implementation would use a geocoding service
⋮----
className=
⋮----
{/* Search bar */}
⋮----
{/* Zoom controls */}
⋮----
{/* Map */}
⋮----
zoomControl={false} // Set to false as a separate ZoomControl component is used
```

## File: components/chat/openai-assistant-chat.tsx

```typescript
import { useState, useRef, useEffect } from 'react';
import { useAssistant, Message } from '@ai-sdk/react';
import {
  Bot, User, Send, Loader2, RefreshCw, XCircle, Paperclip,
  FileText, Code, Mic, Copy, Check, Eraser,
  Maximize2, Minimize2, ThumbsUp, ThumbsDown,
  Zap, Settings, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CodeBlock } from './code-block';
import { MermaidDiagram } from './mermaid-diagram';
import { nanoid } from 'nanoid';
export interface OpenAIAssistantChatProps {
  apiEndpoint?: string;
  initialThreadId?: string;
  className?: string;
}
export function OpenAIAssistantChat({
  apiEndpoint = '/api/assistant',
  initialThreadId,
  className,
}: OpenAIAssistantChatProps)
⋮----
// Refs
⋮----
// State
⋮----
// Use the AI SDK useAssistant hook
⋮----
// reload, (removed as it does not exist on UseAssistantHelpers)
⋮----
// Derived state
⋮----
// Auto-scroll to bottom of messages
⋮----
// Auto-resize textarea based on content
⋮----
// Copy conversation to clipboard
const copyConversation = () =>
// Toggle fullscreen
const toggleFullScreen = () =>
⋮----
// In a real app, you would implement actual fullscreen functionality
⋮----
// Handle form submission
const onSubmit = (e: React.FormEvent<HTMLFormElement>) =>
// Handle keyboard shortcuts
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) =>
// Render content with code blocks
const renderContent = (content: string) =>
⋮----
// Check for code blocks
⋮----
// Add text before code block
⋮----
// Handle special code blocks
⋮----
// Add remaining text
⋮----
{/* Header */}
⋮----
{/* Messages */}
⋮----
{/* Input */}
⋮----
{/* <Button size="sm" variant="ghost" onClick={reload}>
              <RefreshCw className="h-4 w-4 mr-1" /> Retry
            </Button> */}
```

## File: components/chat/screen-share.tsx

```typescript
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
⋮----
const handlePlayPause = () =>
const handleDownload = () =>
⋮----
const handlePlay = ()
const handlePause = ()
⋮----
className=
⋮----
{/* Header */}
⋮----
{/* Content */}
⋮----
{/* Video controls overlay (visible on hover) */}
```

## File: components/chat/visualization-with-tracing.tsx

```typescript
import { useState, useEffect } from "react"
import { DataVisualization } from "./data-visualization"
import { TracingVisualization } from "./tracing-visualization"
import { createTrace, logEvent } from "@/lib/langfuse-integration"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Activity, RefreshCw } from "lucide-react"
export interface VisualizationWithTracingProps {
  title?: string
  data: any
  type?: string
  className?: string
}
⋮----
// Initialize tracing
⋮----
async function initTracing()
⋮----
// Create a parent trace for the visualization
⋮----
// Log initialization event
⋮----
// Handle tab change
const handleTabChange = (value: string) =>
⋮----
// Log tab change event
⋮----
// Handle refresh
const handleRefresh = async () =>
⋮----
// Create a new trace
⋮----
// Log refresh event
```

## File: components/chat/audio-player.tsx

```typescript
import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, Download, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
export interface AudioPlayerProps {
  title?: string
  src: string
  waveform?: boolean
  className?: string
}
⋮----
// Initialize audio context and analyser
⋮----
// Connect audio element to analyser when both are available
⋮----
// Draw waveform visualization
const drawWaveform = () =>
⋮----
// Get theme colors
⋮----
const primaryColor = isDarkMode ? '#8b5cf6' : '#6d28d9' // purple-500/600
const secondaryColor = isDarkMode ? '#4c1d95' : '#ddd6fe' // purple-900/purple-100
// Create gradient
⋮----
// Start/stop visualization based on playing state
⋮----
// Handle audio events
⋮----
const handleTimeUpdate = () =>
const handleLoadedMetadata = () =>
const handleEnded = () =>
⋮----
// Handle play/pause
const togglePlay = () =>
⋮----
// Resume AudioContext if it was suspended
⋮----
// Handle seek
const handleSeek = (value: number[]) =>
// Handle volume change
const handleVolumeChange = (value: number[]) =>
// Handle mute toggle
const toggleMute = () =>
// Format time (seconds to MM:SS)
const formatTime = (time: number) =>
// Handle download
const handleDownload = () =>
⋮----
className=
⋮----
{/* Waveform visualization */}
⋮----
{/* Audio element (hidden) */}
⋮----
{/* Controls */}
⋮----
{/* Time slider */}
⋮----
{/* Playback controls */}
⋮----
{/* Volume control */}
```

## File: components/chat/chat-message.tsx

```typescript
import { useState } from "react"
import { motion } from "framer-motion"
import { Bot, Copy, Check, User, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GradientCard } from "@/components/ui/gradient-card"
import { CodeBlock } from "./code-block"
import { MermaidDiagram } from "./mermaid-diagram"
import { ImageDisplay } from "./image-display"
import { renderContent } from "./ai-sdk-chatHelper"
export interface ChatMessageProps {
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
⋮----
const handleCopy = async () =>
// Render message content with support for code blocks, mermaid diagrams, etc.
const renderMessageContent = (content: string) =>
⋮----
// Split content by code blocks
⋮----
// Check if this part is a code block
⋮----
// Extract language and code
⋮----
// Check if it's a mermaid diagram
⋮----
// Regular code block
⋮----
// Regular text
⋮----
// Determine gradient colors based on role
const getGradientColors = () =>
⋮----
{/* Avatar */}
⋮----
{/* Message content */}
⋮----

⋮----
{/* Render attachments if any */}
⋮----
{/* Copy button */}
⋮----
{/* Timestamp */}
```

## File: components/chat/code-block.tsx

```typescript
import { useState } from "react"
import { Check, Copy, Terminal } from "lucide-react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
export interface CodeBlockProps {
  language: string
  code: string
}
⋮----
const handleCopy = async () =>
⋮----
onMouseLeave=
⋮----
className=
```

## File: components/chat/image-display.tsx

```typescript
import { useState } from "react"
import { motion } from "framer-motion"
import { Download, Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
export interface ImageDisplayProps {
  src: string
  alt: string
  className?: string
}
⋮----
const handleDownload = () =>
⋮----
className=
⋮----
{/* eslint-disable-next-line @next/next/no-img-element */}
```

## File: components/chat/mermaid-diagram.tsx

```typescript
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
⋮----
const renderDiagram = async () =>
⋮----
// Initialize mermaid
⋮----
// Render the diagram
⋮----
const handleCopy = async () =>
const handleDownload = () =>
⋮----
className=
```

## File: components/chat/model-viewer.tsx

```typescript
import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, Download, Box, RotateCcw, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
// Import Three.js dynamically to avoid SSR issues
import dynamic from "next/dynamic"
⋮----
export interface ModelViewerProps {
  title?: string
  modelUrl: string
  format?: "gltf" | "glb" | "obj" | "stl"
  className?: string
  backgroundColor?: string
  autoRotate?: boolean
}
⋮----
// Handle download model
const handleDownload = () =>
// Handle toggle rotation
const handleToggleRotation = () =>
// Handle reset view
const handleResetView = () =>
⋮----
// This would be implemented in the ThreeViewer component
⋮----
// Handle zoom change
const handleZoomChange = (value: number[]) =>
⋮----
// This would be implemented in the ThreeViewer component
⋮----
className=
⋮----
{/* This is a placeholder for the actual Three.js component */}
⋮----
{/* Controls overlay */}
```

## File: components/chat/ai-sdk-chatHelper.tsx

```typescript
// Helper for chat content rendering and parsing
import React from 'react';
import { z } from 'zod';
import { CodeBlock } from './code-block';
import { MermaidDiagram } from './mermaid-diagram';
import { ImageDisplay, type ImageDisplayProps } from './image-display';
import { AIImageGenerator, type AIImageGeneratorProps } from './ai-image-generator';
import { ComputerUse, type ComputerUseProps } from './computer-use';
import { DataVisualization, type DataPoint, type DataSeries, type DataVisualizationProps } from './data-visualization';
import { VisualizationWithTracing, type VisualizationWithTracingProps } from './visualization-with-tracing';
import { DataTable, type Column as DataTableColumn, type DataTableProps } from './data-table';
import { BrowserDisplay, type BrowserDisplayProps } from './browser-display';
import { ScreenShare, type ScreenShareProps } from './screen-share';
import { InteractiveMap, type Location as InteractiveMapLocation, type InteractiveMapProps } from './interactive-map';
import { InteractiveForm, type FormField as InteractiveFormField, type InteractiveFormProps } from './interactive-form';
import { AudioPlayer, type AudioPlayerProps } from './audio-player';
import { ModelViewer, type ModelViewerProps } from './model-viewer';
import { CanvasDisplay } from './canvasDisplay';
import styles from './ai-sdk-chatHelper.module.css';
// --- Zod Schemas for Component Props ---
⋮----
// --- Error Display Component ---
export interface ParseErrorDisplayProps {
  componentName: string;
  errorMessage: string;
  originalText: string;
  validationErrors?: z.ZodFormattedError<unknown>;
}
const ParseErrorDisplay: React.FC<ParseErrorDisplayProps> = ({ componentName, errorMessage, originalText, validationErrors }) => (
  <div className={styles.parseErrorRoot}>
    <p className={styles.parseErrorTitle}>
      Error rendering &lt;{componentName}&gt;:
    </p>
    <p className={styles.parseErrorMessage}>{errorMessage}</p>
    {validationErrors && (
      <pre className={styles.parseErrorPre}>
        {JSON.stringify(validationErrors, null, 2)}
      </pre>
    )}
    <p className={styles.parseErrorOriginalLabel}>
      Original text:
      <code className={styles.parseErrorCode}>{originalText}</code>
    </p>
  </div>
);
/**
 * Render message content by parsing code blocks and special component tags
 */
```

## File: components/chat/enhanced-chat.tsx

```typescript
import { SelectItem } from "@/components/ui/select"
import { SelectContent } from "@/components/ui/select"
import { SelectValue } from "@/components/ui/select"
import { SelectTrigger } from "@/components/ui/select"
import { Select } from "@/components/ui/select"
import type React from "react"
import { useRef, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bot, Send, Loader2, Code, FileText, Image, BarChart, Globe, Monitor,
  Terminal, Music, MapPin, Table, FormInput, Wand2, Box
} from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { nanoid } from "nanoid"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatSidebar } from "./chat-sidebar"
import { ChatMessage } from "./chat-message"
import { CodeBlock } from "./code-block"
import { MermaidDiagram } from "./mermaid-diagram"
import { ImageDisplay } from "./image-display"
import { BrowserDisplay } from "./browser-display"
import { ScreenShare } from "./screen-share"
import { ComputerUse } from "./computer-use"
import { DataVisualization } from "./data-visualization"
import { InteractiveMap } from "./interactive-map"
import { ModelViewer } from "./model-viewer"
import { DataTable } from "./data-table"
import { InteractiveForm } from "./interactive-form"
import { AIImageGenerator } from "./ai-image-generator"
import { AudioPlayer } from "./audio-player"
import { FileUpload } from "./file-upload"
import { useSupabaseFetch } from "@/hooks/use-supabase-fetch"
import { useChat, type Message } from "@/hooks/use-chat"
import { renderContent } from "./ai-sdk-chatHelper"
interface EnhancedChatProps {
  initialThreadId?: string
  initialModelId?: string
  initialMessages?: Message[]
  agentId?: string
  className?: string
}
⋮----
// Use our custom chat hook
⋮----
// Refresh threads to update the list
⋮----
// Fetch models from Supabase
⋮----
// Type the models data
⋮----
// Fetch tools from Supabase
⋮----
// Type the tools data
⋮----
// Fetch threads from LibSQL
⋮----
// Type the threads data
⋮----
// Scroll to bottom when messages change
⋮----
// Auto-resize textarea
⋮----
// Handle form submission
const handleSubmit = async (e: React.FormEvent) =>
// Handle file upload
const handleFileUpload = (files: File[]) =>
⋮----
// Process each file
⋮----
// Create a new thread
const handleCreateThread = async () =>
⋮----
// Refresh the threads list
⋮----
// Switch to a different thread
const handleThreadChange = (id: string) =>
// Toggle a tool
const handleToolToggle = (toolId: string) =>
// Render message content with support for code blocks, mermaid diagrams, browser displays, etc.
⋮----
// Split content by code blocks
⋮----
// Check if this part is a code block
⋮----
// Extract language and code
⋮----
// Check for special block types
⋮----
onGenerate=
⋮----
// This would call an actual API in production
⋮----
// Regular code block
⋮----
// Regular text
⋮----
{/* Main Chat Area */}
⋮----
{/* Messages */}
⋮----
{/* Input Form */}
⋮----
{/* Attachments preview */}
⋮----
onChange=
⋮----
placeholder="https://example.com"
⋮----
{/* Sidebar */}
```

## File: components/chat/ai-sdk-chat.tsx

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useChat, Message } from 'ai/react';
import { ChatSidebar } from './chat-sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import { renderContent } from './ai-sdk-chatHelper';
import { useToolExecutor } from '@/hooks/use-executor';
import {
  Send, XCircle, Paperclip,
  FileText, Mic, Copy, Check,
  Maximize2, Minimize2, ThumbsUp, ThumbsDown,
  Zap, Settings, ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
export interface AiSdkChatProps {
  apiEndpoint?: string;
  initialMessages?: Message[];
  initialThreadId?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  className?: string;
  provider?: string;
  systemPrompt?: string;
  personaId?: string;
  streamProtocol?: 'data' | 'text';
  toolChoice?: string;
  maxSteps?: number;
  middleware?: unknown;
  agentId?: string;
}
export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}
export interface ImageAttachment {
  id: string;
  url: string;
  type: 'image';
  name?: string; // Add name for compatibility with alt text
  width?: number;
  height?: number;
}
⋮----
name?: string; // Add name for compatibility with alt text
⋮----
export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
  result?: string;
  status: 'pending' | 'completed' | 'error';
}
⋮----
// Optionally handle tool success
⋮----
const handleFileSelect = ()
const handleFileUpload = async (files: FileList | null) =>
const handleSpeechInput = () =>
const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) =>
const handleFunctionCall = async (toolName: string, args: Record<string, unknown>) =>
⋮----
// Type-safe call
```

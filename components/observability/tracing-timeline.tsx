"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import * as d3 from "d3"
import { 
  Activity, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Download, 
  Filter, 
  Info, 
  Layers, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Search, 
  Zap 
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface Trace {
  id: string
  name: string
  startTime: string
  endTime?: string
  duration?: number
  status: string
  userId?: string
  metadata?: any
}

interface TracingTimelineProps {
  traces: Trace[]
  isLoading: boolean
  selectedTraceId: string | null
  onSelectTrace: (traceId: string) => void
}

export function TracingTimeline({ 
  traces, 
  isLoading, 
  selectedTraceId,
  onSelectTrace
}: TracingTimelineProps) {
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [timeScale, setTimeScale] = useState<string>("relative")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [hoveredTrace, setHoveredTrace] = useState<string | null>(null)
  
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  
  // Process traces for timeline visualization
  useEffect(() => {
    if (!traces || traces.length === 0) return
    
    // Filter traces based on status and search query
    const filteredTraces = traces.filter(trace => {
      const matchesStatus = filterStatus === "all" || trace.status === filterStatus
      const matchesSearch = !searchQuery || 
        trace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trace.id.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesStatus && matchesSearch
    })
    
    // Sort traces by start time
    const sortedTraces = [...filteredTraces].sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    })
    
    // Process for timeline visualization
    const timelineItems = sortedTraces.map((trace, index) => {
      const startTime = new Date(trace.startTime).getTime()
      const endTime = trace.endTime ? new Date(trace.endTime).getTime() : startTime + (trace.duration || 1000)
      
      return {
        id: trace.id,
        name: trace.name,
        startTime,
        endTime,
        duration: trace.duration || (endTime - startTime),
        status: trace.status,
        index,
        metadata: trace.metadata
      }
    })
    
    setTimelineData(timelineItems)
  }, [traces, filterStatus, searchQuery])
  
  // D3 Timeline Visualization
  useEffect(() => {
    if (!svgRef.current || timelineData.length === 0) return
    
    const svg = d3.select(svgRef.current)
    const tooltip = d3.select(tooltipRef.current)
    
    // Clear previous visualization
    svg.selectAll("*").remove()
    
    // Set dimensions
    const margin = { top: 20, right: 30, bottom: 40, left: 100 }
    const width = svgRef.current.clientWidth - margin.left - margin.right
    const height = Math.max(500, timelineData.length * 30) - margin.top - margin.bottom
    
    // Create scales
    const y = d3.scaleBand()
      .domain(timelineData.map(d => d.id))
      .range([0, height])
      .padding(0.2)
    
    // Determine time range for x-axis
    let minTime, maxTime
    
    if (timeScale === "relative") {
      // Relative time scale - normalize to the earliest trace
      minTime = d3.min(timelineData, d => d.startTime) || 0
      maxTime = d3.max(timelineData, d => d.endTime) || 0
      
      // Add padding
      const timeRange = maxTime - minTime
      minTime = minTime - timeRange * 0.05
      maxTime = maxTime + timeRange * 0.05
    } else {
      // Absolute time scale - use actual timestamps
      minTime = d3.min(timelineData, d => d.startTime) || 0
      maxTime = d3.max(timelineData, d => d.endTime) || 0
    }
    
    const x = d3.scaleTime()
      .domain([new Date(minTime), new Date(maxTime)])
      .range([0, width * zoomLevel])
    
    // Create axes
    const xAxis = d3.axisBottom(x)
      .ticks(10)
      .tickFormat(d => {
        if (timeScale === "relative") {
          // Show time relative to first trace
          const relativeMs = (d as Date).getTime() - minTime
          return `${Math.floor(relativeMs / 1000)}s`
        } else {
          // Show actual time
          return d3.timeFormat("%H:%M:%S")(d as Date)
        }
      })
    
    const yAxis = d3.axisLeft(y)
      .tickFormat(d => {
        const trace = timelineData.find(t => t.id === d)
        return trace ? `${trace.name.substring(0, 15)}${trace.name.length > 15 ? '...' : ''}` : ''
      })
    
    // Create container group with margin
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
    
    // Add axes
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "var(--muted-foreground)")
      .attr("font-size", "10px")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
    
    g.append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .selectAll("text")
      .attr("fill", "var(--muted-foreground)")
      .attr("font-size", "10px")
    
    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .ticks(10)
          .tickSize(-height)
          .tickFormat(() => '')
      )
      .selectAll("line")
      .attr("stroke", "rgba(255,255,255,0.1)")
    
    // Add timeline bars
    const bars = g.selectAll(".bar")
      .data(timelineData)
      .enter()
      .append("g")
      .attr("class", "bar")
      .attr("transform", d => `translate(0,${y(d.id)})`)
    
    // Add background for bars
    bars.append("rect")
      .attr("class", "bar-bg")
      .attr("x", d => x(new Date(d.startTime)))
      .attr("width", d => Math.max(2, x(new Date(d.endTime)) - x(new Date(d.startTime))))
      .attr("height", y.bandwidth())
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", d => {
        if (d.status === "success") return "url(#successGradient)"
        if (d.status === "error") return "url(#errorGradient)"
        return "url(#pendingGradient)"
      })
      .attr("stroke", d => d.id === selectedTraceId ? "var(--primary)" : "rgba(255,255,255,0.2)")
      .attr("stroke-width", d => d.id === selectedTraceId ? 2 : 1)
      .attr("opacity", d => d.id === hoveredTrace || d.id === selectedTraceId ? 1 : 0.7)
      .on("mouseover", (event, d) => {
        setHoveredTrace(d.id)
        
        // Show tooltip
        tooltip
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`)
          .html(`
            <div class="font-medium">${d.name}</div>
            <div class="text-xs text-muted-foreground">ID: ${d.id}</div>
            <div class="text-xs">Duration: ${d.duration}ms</div>
            <div class="text-xs">Status: ${d.status}</div>
          `)
      })
      .on("mouseout", () => {
        setHoveredTrace(null)
        tooltip.style("opacity", 0)
      })
      .on("click", (_, d) => {
        onSelectTrace(d.id)
      })
    
    // Add gradients
    const defs = svg.append("defs")
    
    // Success gradient
    const successGradient = defs.append("linearGradient")
      .attr("id", "successGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%")
    
    successGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#10b981")
      .attr("stop-opacity", 0.8)
    
    successGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#059669")
      .attr("stop-opacity", 0.8)
    
    // Error gradient
    const errorGradient = defs.append("linearGradient")
      .attr("id", "errorGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%")
    
    errorGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#ef4444")
      .attr("stop-opacity", 0.8)
    
    errorGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#dc2626")
      .attr("stop-opacity", 0.8)
    
    // Pending gradient
    const pendingGradient = defs.append("linearGradient")
      .attr("id", "pendingGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%")
    
    pendingGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.8)
    
    pendingGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#2563eb")
      .attr("stop-opacity", 0.8)
    
  }, [timelineData, selectedTraceId, hoveredTrace, timeScale, zoomLevel, onSelectTrace])
  
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search traces..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={timeScale} onValueChange={setTimeScale}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Time Scale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relative">Relative Time</SelectItem>
            <SelectItem value="absolute">Absolute Time</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.5))}
            disabled={zoomLevel <= 0.5}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.5))}
            disabled={zoomLevel >= 5}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Timeline Visualization */}
      <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Trace Timeline
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    This timeline shows traces over time. Click on a trace to select it.
                    Use the controls above to filter, search, and adjust the view.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <CardDescription>
            Visualize traces over time with their duration and status
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-[500px] flex items-center justify-center">
              <Skeleton className="h-[400px] w-full m-6" />
            </div>
          ) : timelineData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">No traces found matching the criteria</p>
            </div>
          ) : (
            <div className="relative">
              <svg 
                ref={svgRef} 
                className="w-full" 
                style={{ 
                  height: `${Math.max(500, timelineData.length * 30)}px`,
                  overflow: "visible"
                }}
              />
              <div 
                ref={tooltipRef} 
                className="absolute pointer-events-none opacity-0 bg-background/95 backdrop-blur-sm p-3 border border-border rounded-lg shadow-lg z-50 transition-opacity"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

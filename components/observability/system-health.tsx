"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import * as d3 from "d3"
import {
  Activity,
  AlertCircle,
  BarChart,
  CheckCircle,
  Clock,
  Database,
  Download,
  Filter,
  Info,
  Layers,
  RefreshCw,
  Search,
  Server,
  Zap
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  ZAxis,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBarChart,
  RadialBar
} from "recharts"
import { cn } from "@/lib/utils"

interface SystemMetric {
  timeRange: string
  dataPoints: Array<{
    id: string
    timestamp: string
    cpu_usage: number
    memory_usage: number
    database_connections: number
    api_requests_per_minute: number
    average_response_time_ms: number
    active_users: number
  }>
  summary: {
    avgCpuUsage: number
    avgMemoryUsage: number
    avgResponseTime: number
    peakApiRequests: number
    totalRequests: number
    avgActiveUsers: number
  }
}

interface SystemHealthProps {
  metrics: SystemMetric | null
  isLoading: boolean
}

export function SystemHealth({
  metrics,
  isLoading
}: SystemHealthProps) {
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [selectedMetric, setSelectedMetric] = useState<string>("cpu")
  const [chartType, setChartType] = useState<string>("line")
  const [timeRange, setTimeRange] = useState<string>("24h")

  const gaugeRef = useRef<SVGSVGElement>(null)

  // D3 Gauge Chart
  useEffect(() => {
    if (!gaugeRef.current || !metrics?.summary) return

    const svg = d3.select(gaugeRef.current)
    svg.selectAll("*").remove()

    const width = gaugeRef.current.clientWidth
    const height = gaugeRef.current.clientHeight
    const radius = Math.min(width, height) / 2

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`)

    // Create gauge background
    const backgroundArc = d3.arc()
      .innerRadius(radius * 0.7)
      .outerRadius(radius * 0.9)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2)

    g.append("path")
      .attr("d", backgroundArc as any)
      .style("fill", "#1e293b")

    // Create value arc
    const valueScale = d3.scaleLinear()
      .domain([0, 100])
      .range([-Math.PI / 2, Math.PI / 2])

    const valueArc = d3.arc()
      .innerRadius(radius * 0.7)
      .outerRadius(radius * 0.9)
      .startAngle(-Math.PI / 2)
      .endAngle((d: any) => valueScale(d.value))

    // Determine color based on value
    const getColor = (value: number) => {
      if (value < 50) return "#10b981" // Green
      if (value < 80) return "#f59e0b" // Yellow
      return "#ef4444" // Red
    }

    // Add value arc
    g.append("path")
      .datum({ value: metrics.summary.avgCpuUsage })
      .attr("d", valueArc as any)
      .style("fill", getColor(metrics.summary.avgCpuUsage))

    // Add text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.5em")
      .attr("class", "text-4xl font-bold")
      .text(`${metrics.summary.avgCpuUsage}%`)
      .style("fill", "white")

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "3em")
      .attr("class", "text-sm")
      .text("CPU Usage")
      .style("fill", "var(--muted-foreground)")

    // Add ticks
    const ticks = [0, 25, 50, 75, 100]
    const tickArc = d3.arc()
      .innerRadius(radius * 0.9)
      .outerRadius(radius * 0.95)
      .startAngle((d: any) => valueScale(d) - 0.01)
      .endAngle((d: any) => valueScale(d) + 0.01)

    g.selectAll(".tick")
      .data(ticks)
      .enter()
      .append("path")
      .attr("d", tickArc as any)
      .style("fill", "white")

    g.selectAll(".tick-text")
      .data(ticks)
      .enter()
      .append("text")
      .attr("x", (d: any) => (radius * 1.05) * Math.cos(valueScale(d) - Math.PI / 2))
      .attr("y", (d: any) => (radius * 1.05) * Math.sin(valueScale(d) - Math.PI / 2))
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("class", "text-xs")
      .text((d: any) => d)
      .style("fill", "var(--muted-foreground)")

  }, [metrics?.summary])

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color || entry.stroke }}>
              {entry.name}: {entry.value} {entry.unit || ''}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    }
  }

  // Get metric display name
  const getMetricDisplayName = (metric: string) => {
    switch (metric) {
      case "cpu": return "CPU Usage"
      case "memory": return "Memory Usage"
      case "database": return "Database Connections"
      case "api": return "API Requests/Min"
      case "response": return "Response Time"
      case "users": return "Active Users"
      default: return metric
    }
  }

  // Get metric data key
  const getMetricDataKey = (metric: string) => {
    switch (metric) {
      case "cpu": return "cpu_usage"
      case "memory": return "memory_usage"
      case "database": return "database_connections"
      case "api": return "api_requests_per_minute"
      case "response": return "average_response_time_ms"
      case "users": return "active_users"
      default: return metric
    }
  }

  // Get metric color
  const getMetricColor = (metric: string) => {
    switch (metric) {
      case "cpu": return "#ef4444"
      case "memory": return "#3b82f6"
      case "database": return "#8b5cf6"
      case "api": return "#10b981"
      case "response": return "#f59e0b"
      case "users": return "#ec4899"
      default: return "#64748b"
    }
  }

  // Get metric unit
  const getMetricUnit = (metric: string) => {
    switch (metric) {
      case "cpu": return "%"
      case "memory": return "%"
      case "database": return ""
      case "api": return "/min"
      case "response": return "ms"
      case "users": return ""
      default: return ""
    }
  }

  // Get health status
  const getHealthStatus = (metric: string, value: number) => {
    switch (metric) {
      case "avgCpuUsage":
        return value < 50 ? "good" : value < 80 ? "warning" : "critical"
      case "avgMemoryUsage":
        return value < 60 ? "good" : value < 85 ? "warning" : "critical"
      case "avgResponseTime":
        return value < 300 ? "good" : value < 500 ? "warning" : "critical"
      default:
        return "good"
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "good":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Good
          </Badge>
        )
      case "warning":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Warning
          </Badge>
        )
      case "critical":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Critical
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Info className="h-3 w-3 mr-1" />
            Unknown
          </Badge>
        )
    }
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cpu">CPU Usage</SelectItem>
            <SelectItem value="memory">Memory Usage</SelectItem>
            <SelectItem value="database">Database Connections</SelectItem>
            <SelectItem value="api">API Requests</SelectItem>
            <SelectItem value="response">Response Time</SelectItem>
            <SelectItem value="users">Active Users</SelectItem>
          </SelectContent>
        </Select>

        <Select value={chartType} onValueChange={setChartType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Chart Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="line">Line Chart</SelectItem>
            <SelectItem value="bar">Bar Chart</SelectItem>
            <SelectItem value="area">Area Chart</SelectItem>
          </SelectContent>
        </Select>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid grid-cols-3 w-[300px] ml-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="gauge">Gauge</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <TabsContent value="overview" className="m-0">
        {isLoading || !metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CPU Usage */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Server className="h-5 w-5 text-red-500" />
                      CPU Usage
                    </CardTitle>
                    {getStatusBadge(getHealthStatus("avgCpuUsage", metrics.summary.avgCpuUsage))}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.summary.avgCpuUsage}%</div>
                  <div className="text-sm text-muted-foreground mt-1">Average utilization</div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Memory Usage */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-5 w-5 text-blue-500" />
                      Memory Usage
                    </CardTitle>
                    {getStatusBadge(getHealthStatus("avgMemoryUsage", metrics.summary.avgMemoryUsage))}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.summary.avgMemoryUsage}%</div>
                  <div className="text-sm text-muted-foreground mt-1">Average utilization</div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Response Time */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      Response Time
                    </CardTitle>
                    {getStatusBadge(getHealthStatus("avgResponseTime", metrics.summary.avgResponseTime))}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.summary.avgResponseTime} ms</div>
                  <div className="text-sm text-muted-foreground mt-1">Average response time</div>
                </CardContent>
              </Card>
            </motion.div>

            {/* API Requests */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    API Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.summary.totalRequests.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total requests</div>
                  <div className="text-sm text-muted-foreground">Peak: {metrics.summary.peakApiRequests}/min</div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Active Users */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="h-5 w-5 text-pink-500" />
                    Active Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.summary.avgActiveUsers}</div>
                  <div className="text-sm text-muted-foreground mt-1">Average active users</div>
                </CardContent>
              </Card>
            </motion.div>

            {/* System Status */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Service</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Operational
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Operational
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI Models</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Operational
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="metrics" className="m-0">
        {isLoading || !metrics ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {getMetricDisplayName(selectedMetric)} Over Time
              </CardTitle>
              <CardDescription>
                Time series data showing system metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart data={metrics.dataPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="timestamp"
                        tick={{ fill: 'var(--muted-foreground)' }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      />
                      <YAxis
                        tick={{ fill: 'var(--muted-foreground)' }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey={getMetricDataKey(selectedMetric)}
                        name={getMetricDisplayName(selectedMetric)}
                        stroke={getMetricColor(selectedMetric)}
                        strokeWidth={2}
                        dot={{ r: 1 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  ) : chartType === 'bar' ? (
                    <RechartsBarChart data={metrics.dataPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="timestamp"
                        tick={{ fill: 'var(--muted-foreground)' }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      />
                      <YAxis
                        tick={{ fill: 'var(--muted-foreground)' }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey={getMetricDataKey(selectedMetric)}
                        name={getMetricDisplayName(selectedMetric)}
                        fill={getMetricColor(selectedMetric)}
                        radius={[4, 4, 0, 0]}
                      />
                    </RechartsBarChart>
                  ) : (
                    <AreaChart data={metrics.dataPoints}>
                      <defs>
                        <linearGradient id={`${selectedMetric}Gradient`} x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={getMetricColor(selectedMetric)}
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor={getMetricColor(selectedMetric)}
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="timestamp"
                        tick={{ fill: 'var(--muted-foreground)' }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      />
                      <YAxis
                        tick={{ fill: 'var(--muted-foreground)' }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey={getMetricDataKey(selectedMetric)}
                        name={getMetricDisplayName(selectedMetric)}
                        stroke={getMetricColor(selectedMetric)}
                        fillOpacity={1}
                        fill={`url(#${selectedMetric}Gradient)`}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="gauge" className="m-0">
        {isLoading || !metrics ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">System Health Gauge</CardTitle>
              <CardDescription>
                Visual representation of system health metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center">
                <svg ref={gaugeRef} width="400" height="300" />
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </motion.div>
  )
}

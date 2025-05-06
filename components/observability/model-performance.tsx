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
  Download,
  Filter,
  Info,
  Layers,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface ModelPerformanceData {
  modelId: string
  provider: string
  displayName: string
  timeSeriesData: any[]
  metrics: {
    avgLatency: number
    avgTokensPerSecond: number
    totalRequests: number
    totalTokens: number
    successRate: number
  }
}

interface ModelPerformanceProps {
  performance: ModelPerformanceData[]
  isLoading: boolean
}

export function ModelPerformance({
  performance,
  isLoading
}: ModelPerformanceProps) {
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<string>("latency")
  const [chartType, setChartType] = useState<string>("line")

  // Set the first model as selected when data loads
  useEffect(() => {
    if (performance && performance.length > 0 && !selectedModel) {
      setSelectedModel(performance[0].modelId)
    }
  }, [performance, selectedModel])

  // Get the selected model data
  const selectedModelData = performance?.find(m => m.modelId === selectedModel)

  // Prepare data for comparison chart
  const comparisonData = performance?.map(model => ({
    name: model.displayName,
    latency: model.metrics.avgLatency,
    tokensPerSecond: model.metrics.avgTokensPerSecond,
    successRate: model.metrics.successRate,
    requests: model.metrics.totalRequests,
    tokens: model.metrics.totalTokens,
    provider: model.provider
  }))

  // Prepare time series data for the selected model
  const timeSeriesData = selectedModelData?.timeSeriesData.map(point => ({
    timestamp: new Date(point.timestamp).toLocaleTimeString(),
    latency: point.latency_ms,
    tokensPerSecond: point.tokens_per_second,
    successRate: point.success_rate,
    requests: point.request_count,
    tokens: point.total_tokens,
    errors: point.error_count
  }))

  // Get provider color
  const getProviderColor = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case "google": return "#4285F4"
      case "openai": return "#10a37f"
      case "anthropic": return "#b668ff"
      default: return "#64748b"
    }
  }

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

  // Format metric value
  const formatMetricValue = (metric: string, value: number) => {
    switch (metric) {
      case "latency": return `${value} ms`
      case "tokensPerSecond": return `${value} t/s`
      case "successRate": return `${value}%`
      case "requests": return value.toLocaleString()
      case "tokens": return value.toLocaleString()
      default: return value
    }
  }

  // Get metric display name
  const getMetricDisplayName = (metric: string) => {
    switch (metric) {
      case "latency": return "Latency"
      case "tokensPerSecond": return "Tokens Per Second"
      case "successRate": return "Success Rate"
      case "requests": return "Total Requests"
      case "tokens": return "Total Tokens"
      default: return metric
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
        <Select value={selectedModel || ""} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent>
            {performance?.map(model => (
              <SelectItem key={model.modelId} value={model.modelId}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getProviderColor(model.provider) }}
                  />
                  {model.displayName}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latency">Latency (ms)</SelectItem>
            <SelectItem value="tokensPerSecond">Tokens Per Second</SelectItem>
            <SelectItem value="successRate">Success Rate (%)</SelectItem>
            <SelectItem value="requests">Request Count</SelectItem>
            <SelectItem value="tokens">Token Count</SelectItem>
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
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="timeseries">Time Series</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <TabsContent value="overview" className="m-0">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Model Cards */}
            {performance?.map(model => (
              <motion.div key={model.modelId} variants={itemVariants}>
                <Card
                  className={cn(
                    "overflow-hidden border-opacity-40 backdrop-blur-sm cursor-pointer transition-all",
                    selectedModel === model.modelId && "border-primary/50 bg-primary/5"
                  )}
                  onClick={() => setSelectedModel(model.modelId)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="px-2 py-1"
                        style={{
                          backgroundColor: `${getProviderColor(model.provider)}20`,
                          color: getProviderColor(model.provider),
                          borderColor: `${getProviderColor(model.provider)}40`
                        }}
                      >
                        {model.provider}
                      </Badge>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {model.metrics.successRate}% Success
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{model.displayName}</CardTitle>
                    <CardDescription>{model.modelId}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Latency:</span>
                      </div>
                      <div className="font-medium text-right">{model.metrics.avgLatency} ms</div>

                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Tokens/sec:</span>
                      </div>
                      <div className="font-medium text-right">{model.metrics.avgTokensPerSecond}</div>

                      <div className="flex items-center gap-1">
                        <BarChart className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Requests:</span>
                      </div>
                      <div className="font-medium text-right">{model.metrics.totalRequests.toLocaleString()}</div>

                      <div className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Tokens:</span>
                      </div>
                      <div className="font-medium text-right">{model.metrics.totalTokens.toLocaleString()}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="comparison" className="m-0">
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Model Comparison</CardTitle>
              <CardDescription>
                Comparing {getMetricDisplayName(selectedMetric)} across all models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={comparisonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tick={{ fill: 'var(--muted-foreground)' }}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey={selectedMetric}
                      name={getMetricDisplayName(selectedMetric)}
                      radius={[0, 4, 4, 0]}
                    >
                      {comparisonData?.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getProviderColor(entry.provider)}
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth={1}
                        />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="timeseries" className="m-0">
        {isLoading || !selectedModelData ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {selectedModelData.displayName} - {getMetricDisplayName(selectedMetric)} Over Time
              </CardTitle>
              <CardDescription>
                Time series data showing performance trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart data={timeSeriesData}>
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
                        dataKey={selectedMetric}
                        name={getMetricDisplayName(selectedMetric)}
                        stroke={getProviderColor(selectedModelData.provider)}
                        strokeWidth={2}
                        dot={{ r: 1 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  ) : chartType === 'bar' ? (
                    <RechartsBarChart data={timeSeriesData}>
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
                        dataKey={selectedMetric}
                        name={getMetricDisplayName(selectedMetric)}
                        fill={getProviderColor(selectedModelData.provider)}
                        radius={[4, 4, 0, 0]}
                      />
                    </RechartsBarChart>
                  ) : (
                    <AreaChart data={timeSeriesData}>
                      <defs>
                        <linearGradient id={`${selectedMetric}Gradient`} x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={getProviderColor(selectedModelData.provider)}
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor={getProviderColor(selectedModelData.provider)}
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
                        dataKey={selectedMetric}
                        name={getMetricDisplayName(selectedMetric)}
                        stroke={getProviderColor(selectedModelData.provider)}
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
    </motion.div>
  )
}

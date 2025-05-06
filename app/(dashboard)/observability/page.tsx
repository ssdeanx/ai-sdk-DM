"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  BarChart,
  Clock,
  Database,
  DollarSign,
  Layers,
  LineChart,
  Network,
  RefreshCw,
  Search,
  Star,
  Zap
} from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useSupabaseFetch } from "@/hooks/use-supabase-fetch"

import { TracingOverview } from "@/components/observability/tracing-overview"
import { TracingTimeline } from "@/components/observability/tracing-timeline"
import { TracingDetails } from "@/components/observability/tracing-details"
import { ModelPerformance } from "@/components/observability/model-performance"
import { SystemHealth } from "@/components/observability/system-health"
import { CostEstimation } from "@/components/observability/cost-estimation"
import { ModelEvaluation } from "@/components/observability/model-evaluation"

export default function ObservabilityPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [timeRange, setTimeRange] = useState("24h")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch recent traces
  const { data: recentTraces, isLoading: tracesLoading, refetch: refetchTraces } = useSupabaseFetch({
    endpoint: "/api/observability/traces",
    resourceName: "Recent Traces",
    dataKey: "traces",
    queryParams: { limit: "50", timeRange }
  })

  // Fetch system metrics
  const { data: systemMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useSupabaseFetch({
    endpoint: "/api/observability/metrics",
    resourceName: "System Metrics",
    dataKey: "metrics",
    queryParams: { timeRange }
  })

  // Fetch model performance data
  const { data: modelPerformance, isLoading: performanceLoading, refetch: refetchPerformance } = useSupabaseFetch({
    endpoint: "/api/observability/performance",
    resourceName: "Model Performance",
    dataKey: "performance",
    queryParams: { timeRange }
  })

  // Fetch cost data
  const { data: costData, isLoading: costLoading, refetch: refetchCost } = useSupabaseFetch({
    endpoint: "/api/observability/costs",
    resourceName: "Cost Data",
    dataKey: "costData",
    queryParams: { timeRange }
  })

  // Fetch evaluation data
  const { data: evaluationData, isLoading: evaluationLoading, refetch: refetchEvaluation } = useSupabaseFetch({
    endpoint: "/api/observability/evaluations",
    resourceName: "Evaluation Data",
    dataKey: "evaluations",
    queryParams: { timeRange }
  })

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([
      refetchTraces(),
      refetchMetrics(),
      refetchPerformance(),
      refetchCost(),
      refetchEvaluation()
    ])
    setIsRefreshing(false)
  }

  // Filter traces based on search query
  const filteredTraces = searchQuery
    ? recentTraces?.filter(trace =>
        trace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trace.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (trace.metadata && JSON.stringify(trace.metadata).toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : recentTraces

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Observability"
        subtitle="Monitor and analyze your AI system's performance, tracing, and metrics"
        highlightedText="Dashboard"
      >
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search traces by name or ID..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </DashboardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="traces" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Traces</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
          <TabsTrigger value="cost" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Cost</span>
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Evaluation</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <TracingOverview
            traces={filteredTraces || []}
            isLoading={tracesLoading}
            onSelectTrace={setSelectedTraceId}
            systemMetrics={systemMetrics}
            modelPerformance={modelPerformance}
          />
        </TabsContent>

        <TabsContent value="traces" className="space-y-4">
          <TracingDetails
            traces={filteredTraces || []}
            isLoading={tracesLoading}
            selectedTraceId={selectedTraceId}
            onSelectTrace={setSelectedTraceId}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <TracingTimeline
            traces={filteredTraces || []}
            isLoading={tracesLoading}
            selectedTraceId={selectedTraceId}
            onSelectTrace={setSelectedTraceId}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <ModelPerformance
            performance={modelPerformance || []}
            isLoading={performanceLoading}
          />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <SystemHealth
            metrics={systemMetrics || null}
            isLoading={metricsLoading}
          />
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <CostEstimation
            costData={costData || []}
            isLoading={costLoading}
            timeRange={timeRange}
          />
        </TabsContent>

        <TabsContent value="evaluation" className="space-y-4">
          <ModelEvaluation
            evaluations={evaluationData || []}
            isLoading={evaluationLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

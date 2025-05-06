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
  DollarSign, 
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
import { cn } from "@/lib/utils"

interface ModelCostData {
  modelId: string
  provider: string
  displayName: string
  costPerInputToken: number
  costPerOutputToken: number
  timeSeriesData: any[]
  metrics: {
    totalInputTokens: number
    totalOutputTokens: number
    totalCost: number
    avgCostPerRequest: number
    dailyAverage: number
    projectedMonthlyCost: number
  }
}

interface CostEstimationProps {
  costData: ModelCostData[]
  isLoading: boolean
  timeRange?: string
}

export function CostEstimation({ 
  costData, 
  isLoading,
  timeRange = '30d'
}: CostEstimationProps) {
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [chartType, setChartType] = useState<string>("bar")
  
  // Set the first model as selected when data loads
  useEffect(() => {
    if (costData && costData.length > 0 && !selectedModel) {
      setSelectedModel(costData[0].modelId)
    }
  }, [costData, selectedModel])
  
  // Get the selected model data
  const selectedModelData = costData?.find(m => m.modelId === selectedModel)
  
  // Calculate total cost across all models
  const totalCost = costData?.reduce((sum, model) => sum + model.metrics.totalCost, 0) || 0
  const projectedMonthlyCost = costData?.reduce((sum, model) => sum + model.metrics.projectedMonthlyCost, 0) || 0
  
  // Prepare data for cost breakdown chart
  const costBreakdownData = costData?.map(model => ({
    name: model.displayName,
    value: model.metrics.totalCost,
    provider: model.provider,
    color: getProviderColor(model.provider)
  }))
  
  // Prepare time series data for the selected model
  const timeSeriesData = selectedModelData?.timeSeriesData.map(point => ({
    date: new Date(point.date).toLocaleDateString(),
    cost: point.cost,
    inputTokens: point.inputTokens,
    outputTokens: point.outputTokens,
    requests: point.requests
  }))
  
  // Get provider color
  function getProviderColor(provider: string) {
    switch (provider?.toLowerCase()) {
      case "google": return "#4285F4"
      case "openai": return "#10a37f"
      case "anthropic": return "#b668ff"
      default: return "#64748b"
    }
  }
  
  // Format currency
  function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color || entry.stroke }}>
              {entry.name}: {entry.name === 'Cost' ? formatCurrency(entry.value) : entry.value.toLocaleString()}
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
  
  // Generate mock data if needed for demo
  const generateMockCostData = () => {
    if (costData && costData.length > 0) return costData
    
    const mockModels = [
      { modelId: "gemini-1.5-pro", provider: "google", displayName: "Gemini 1.5 Pro", costPerInputToken: 0.00001, costPerOutputToken: 0.00002 },
      { modelId: "gpt-4o", provider: "openai", displayName: "GPT-4o", costPerInputToken: 0.00001, costPerOutputToken: 0.00003 },
      { modelId: "claude-3-opus", provider: "anthropic", displayName: "Claude 3 Opus", costPerInputToken: 0.000015, costPerOutputToken: 0.000075 },
      { modelId: "gemini-1.5-flash", provider: "google", displayName: "Gemini 1.5 Flash", costPerInputToken: 0.000003, costPerOutputToken: 0.000006 },
      { modelId: "gpt-3.5-turbo", provider: "openai", displayName: "GPT-3.5 Turbo", costPerInputToken: 0.0000015, costPerOutputToken: 0.000002 }
    ]
    
    return mockModels.map(model => {
      // Generate random usage data
      const totalInputTokens = Math.floor(Math.random() * 10000000) + 1000000
      const totalOutputTokens = Math.floor(totalInputTokens * 0.3)
      const totalCost = (totalInputTokens * model.costPerInputToken) + (totalOutputTokens * model.costPerOutputToken)
      const avgCostPerRequest = totalCost / (Math.floor(Math.random() * 10000) + 1000)
      
      // Generate time series data
      const timeSeriesData = []
      const days = timeRange === '7d' ? 7 : 30
      const now = new Date()
      
      for (let i = 0; i < days; i++) {
        const date = new Date(now)
        date.setDate(date.getDate() - (days - i))
        
        const dailyInputTokens = Math.floor(Math.random() * (totalInputTokens / days * 1.5)) + (totalInputTokens / days * 0.5)
        const dailyOutputTokens = Math.floor(dailyInputTokens * 0.3)
        const dailyCost = (dailyInputTokens * model.costPerInputToken) + (dailyOutputTokens * model.costPerOutputToken)
        
        timeSeriesData.push({
          date: date.toISOString(),
          cost: dailyCost,
          inputTokens: dailyInputTokens,
          outputTokens: dailyOutputTokens,
          requests: Math.floor(Math.random() * 1000) + 100
        })
      }
      
      // Calculate daily average and projected monthly cost
      const dailyAverage = timeSeriesData.reduce((sum, day) => sum + day.cost, 0) / timeSeriesData.length
      const projectedMonthlyCost = dailyAverage * 30
      
      return {
        ...model,
        timeSeriesData,
        metrics: {
          totalInputTokens,
          totalOutputTokens,
          totalCost,
          avgCostPerRequest,
          dailyAverage,
          projectedMonthlyCost
        }
      }
    })
  }
  
  // Use mock data if no real data is provided
  const displayData = costData?.length > 0 ? costData : generateMockCostData()
  
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
            {displayData?.map(model => (
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
        
        <Select value={chartType} onValueChange={setChartType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Chart Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bar">Bar Chart</SelectItem>
            <SelectItem value="line">Line Chart</SelectItem>
            <SelectItem value="area">Area Chart</SelectItem>
            <SelectItem value="pie">Pie Chart</SelectItem>
          </SelectContent>
        </Select>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid grid-cols-3 w-[300px] ml-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Content */}
      <TabsContent value="overview" className="m-0">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Cost */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    Total Cost
                  </CardTitle>
                  <CardDescription>
                    {timeRange === '7d' ? 'Last 7 days' : 'Last 30 days'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(totalCost)}</div>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Projected Monthly Cost */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-blue-500" />
                    Projected Monthly
                  </CardTitle>
                  <CardDescription>
                    Based on current usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(projectedMonthlyCost)}</div>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Total Tokens */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="h-5 w-5 text-purple-500" />
                    Total Tokens
                  </CardTitle>
                  <CardDescription>
                    Input and output combined
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {displayData.reduce((sum, model) => 
                      sum + model.metrics.totalInputTokens + model.metrics.totalOutputTokens, 0
                    ).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Cost Per Request */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-yellow-500" />
                    Avg Cost/Request
                  </CardTitle>
                  <CardDescription>
                    Across all models
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(
                      displayData.reduce((sum, model) => sum + model.metrics.avgCostPerRequest, 0) / displayData.length
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="breakdown" className="m-0">
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Cost Breakdown by Model</CardTitle>
              <CardDescription>
                Distribution of costs across different models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={costBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {costBreakdownData?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        content={<CustomTooltip />} 
                      />
                    </PieChart>
                  ) : (
                    <RechartsBarChart data={costBreakdownData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={120}
                        tick={{ fill: 'var(--muted-foreground)' }}
                      />
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        content={<CustomTooltip />} 
                      />
                      <Bar 
                        dataKey="value" 
                        name="Cost"
                        radius={[0, 4, 4, 0]}
                      >
                        {costBreakdownData?.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth={1}
                          />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
      
      <TabsContent value="trends" className="m-0">
        {isLoading || !selectedModelData ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {selectedModelData.displayName} - Cost Trends
              </CardTitle>
              <CardDescription>
                Daily cost trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="date" 
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
                        dataKey="cost" 
                        name="Cost"
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
                        dataKey="date" 
                        tick={{ fill: 'var(--muted-foreground)' }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      />
                      <YAxis 
                        tick={{ fill: 'var(--muted-foreground)' }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="cost" 
                        name="Cost"
                        fill={getProviderColor(selectedModelData.provider)}
                        radius={[4, 4, 0, 0]}
                      />
                    </RechartsBarChart>
                  ) : (
                    <AreaChart data={timeSeriesData}>
                      <defs>
                        <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
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
                        dataKey="date" 
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
                        dataKey="cost" 
                        name="Cost"
                        stroke={getProviderColor(selectedModelData.provider)}
                        fillOpacity={1}
                        fill="url(#costGradient)"
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

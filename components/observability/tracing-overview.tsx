'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  Database,
  Layers,
  Maximize2,
  Minimize2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  RadialBar,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface Trace {
  id: string;
  name: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: string;
  userId?: string;
  metadata?: any;
}

interface SystemMetric {
  timeRange: string;
  dataPoints: any[];
  summary: {
    avgCpuUsage: number;
    avgMemoryUsage: number;
    avgResponseTime: number;
    peakApiRequests: number;
    totalRequests: number;
    avgActiveUsers: number;
  };
}

interface ModelPerformance {
  modelId: string;
  provider: string;
  displayName: string;
  timeSeriesData: any[];
  metrics: {
    avgLatency: number;
    avgTokensPerSecond: number;
    totalRequests: number;
    totalTokens: number;
    successRate: number;
  };
}

interface TracingOverviewProps {
  traces: Trace[];
  isLoading: boolean;
  onSelectTrace: (traceId: string) => void;
  systemMetrics?: SystemMetric;
  modelPerformance?: ModelPerformance[];
}

export function TracingOverview({
  traces,
  isLoading,
  onSelectTrace,
  systemMetrics,
  modelPerformance,
}: TracingOverviewProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeMetricsTab, setActiveMetricsTab] = useState('system');
  const [hoveredTrace, setHoveredTrace] = useState<string | null>(null);

  // Calculate statistics
  const totalTraces = traces.length;
  const successfulTraces = traces.filter((t) => t.status === 'success').length;
  const failedTraces = traces.filter((t) => t.status === 'error').length;
  const avgDuration =
    traces.length > 0
      ? Math.round(
          traces.reduce((sum, t) => sum + (t.duration || 0), 0) / traces.length
        )
      : 0;

  // Group traces by type
  const tracesByType = traces.reduce(
    (acc, trace) => {
      const type = trace.name || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(trace);
      return acc;
    },
    {} as Record<string, Trace[]>
  );

  // Prepare data for charts
  const statusData = [
    { name: 'Success', value: successfulTraces, color: '#10b981' },
    { name: 'Failed', value: failedTraces, color: '#ef4444' },
  ];

  const typeData = Object.entries(tracesByType).map(([type, traces]) => ({
    name: type,
    count: traces.length,
    avgDuration: Math.round(
      traces.reduce((sum, t) => sum + (t.duration || 0), 0) / traces.length
    ),
  }));

  // Prepare model performance data
  const modelData =
    modelPerformance?.map((model) => ({
      name: model.displayName,
      latency: model.metrics.avgLatency,
      tps: model.metrics.avgTokensPerSecond,
      success: model.metrics.successRate,
      requests: model.metrics.totalRequests,
      provider: model.provider,
    })) || [];

  // Custom tooltip styles
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
      );
    }
    return null;
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    },
  };

  // Color functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'google':
        return '#4285F4';
      case 'openai':
        return '#10a37f';
      case 'anthropic':
        return '#b668ff';
      default:
        return '#64748b';
    }
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Total Traces
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{totalTraces}</span>
                  <span className="text-muted-foreground text-sm mb-1">
                    traces
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">
                    {totalTraces > 0
                      ? Math.round((successfulTraces / totalTraces) * 100)
                      : 0}
                    %
                  </span>
                  <span className="text-muted-foreground text-sm mb-1">
                    ({successfulTraces}/{totalTraces})
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Avg Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{avgDuration}</span>
                  <span className="text-muted-foreground text-sm mb-1">ms</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Error Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">
                    {totalTraces > 0
                      ? Math.round((failedTraces / totalTraces) * 100)
                      : 0}
                    %
                  </span>
                  <span className="text-muted-foreground text-sm mb-1">
                    ({failedTraces}/{totalTraces})
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm h-[350px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                Trace Status Distribution
              </CardTitle>
              <CardDescription>
                Success vs. error rate visualization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[250px] flex items-center justify-center">
                  <Skeleton className="h-[200px] w-[200px] rounded-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <defs>
                      <linearGradient
                        id="successGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor="#059669"
                          stopOpacity={1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="errorGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor="#dc2626"
                          stopOpacity={1}
                        />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {statusData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0
                              ? 'url(#successGradient)'
                              : 'url(#errorGradient)'
                          }
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Trace Types */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm h-[350px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Trace Types</CardTitle>
              <CardDescription>
                Distribution of trace types and average duration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[250px] flex items-center justify-center">
                  <Skeleton className="h-[200px] w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={typeData} barSize={20}>
                    <defs>
                      <linearGradient
                        id="countGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#3b82f6"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="100%"
                          stopColor="#2563eb"
                          stopOpacity={0.8}
                        />
                      </linearGradient>
                      <linearGradient
                        id="durationGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="100%"
                          stopColor="#7c3aed"
                          stopOpacity={0.8}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'var(--muted-foreground)' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      stroke="#3b82f6"
                      tick={{ fill: 'var(--muted-foreground)' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#8b5cf6"
                      tick={{ fill: 'var(--muted-foreground)' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="count"
                      name="Count"
                      fill="url(#countGradient)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="avgDuration"
                      name="Avg Duration (ms)"
                      fill="url(#durationGradient)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

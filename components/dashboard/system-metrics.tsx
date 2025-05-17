'use client';

import { motion } from 'framer-motion';
import { useSupabaseFetch } from '@/hooks/use-supabase-fetch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Cpu, Database, Server, User } from 'lucide-react';

interface SystemMetrics {
  id: string;
  cpu_usage: number;
  memory_usage: number;
  database_connections: number;
  api_requests_per_minute: number;
  average_response_time_ms: number;
  active_users: number;
  timestamp: string;
}

export function SystemMetrics() {
  // Fetch system metrics from Supabase
  const { data: metrics, isLoading } = useSupabaseFetch<SystemMetrics>({
    endpoint: '/api/dashboard/metrics',
    resourceName: 'System Metrics',
    dataKey: 'metrics',
  });

  // Get the latest metrics
  const latestMetrics = metrics?.[0];

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { y: 10, opacity: 0 },
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

  // Get color based on usage percentage
  const getColorClass = (percentage: number) => {
    if (percentage < 50) return 'text-green-500';
    if (percentage < 80) return 'text-amber-500';
    return 'text-red-500';
  };

  // Get progress color based on usage percentage
  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Card className="overflow-hidden backdrop-blur-sm border-opacity-40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          System Performance
        </CardTitle>
        <CardDescription>
          Real-time system metrics and performance data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="resources" className="space-y-4">
          <TabsList className="grid grid-cols-2 h-9">
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="api">API Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="resources" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {/* CPU Usage */}
                <motion.div variants={item} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">CPU Usage</span>
                    </div>
                    <span
                      className={`text-sm font-bold ${getColorClass(latestMetrics?.cpu_usage || 0)}`}
                    >
                      {latestMetrics?.cpu_usage || 0}%
                    </span>
                  </div>
                  <Progress
                    value={latestMetrics?.cpu_usage || 0}
                    className="h-2 bg-muted"
                    indicatorClassName={getProgressColor(
                      latestMetrics?.cpu_usage || 0
                    )}
                  />
                </motion.div>

                {/* Memory Usage */}
                <motion.div variants={item} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Memory Usage</span>
                    </div>
                    <span
                      className={`text-sm font-bold ${getColorClass(latestMetrics?.memory_usage || 0)}`}
                    >
                      {latestMetrics?.memory_usage || 0}%
                    </span>
                  </div>
                  <Progress
                    value={latestMetrics?.memory_usage || 0}
                    className="h-2 bg-muted"
                    indicatorClassName={getProgressColor(
                      latestMetrics?.memory_usage || 0
                    )}
                  />
                </motion.div>

                {/* Database Connections */}
                <motion.div variants={item} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Database Connections
                      </span>
                    </div>
                    <span className="text-sm font-bold">
                      {latestMetrics?.database_connections || 0}
                    </span>
                  </div>
                  <Progress
                    value={(latestMetrics?.database_connections || 0) / 2}
                    className="h-2 bg-muted"
                    indicatorClassName="bg-blue-500"
                  />
                </motion.div>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {/* API Requests */}
                <motion.div variants={item} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        API Requests (per min)
                      </span>
                    </div>
                    <span className="text-sm font-bold">
                      {latestMetrics?.api_requests_per_minute || 0}
                    </span>
                  </div>
                  <Progress
                    value={(latestMetrics?.api_requests_per_minute || 0) / 2}
                    className="h-2 bg-muted"
                    indicatorClassName="bg-violet-500"
                  />
                </motion.div>

                {/* Response Time */}
                <motion.div variants={item} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Avg Response Time
                      </span>
                    </div>
                    <span className="text-sm font-bold">
                      {latestMetrics?.average_response_time_ms || 0} ms
                    </span>
                  </div>
                  <Progress
                    value={(latestMetrics?.average_response_time_ms || 0) / 10}
                    className="h-2 bg-muted"
                    indicatorClassName="bg-cyan-500"
                  />
                </motion.div>

                {/* Active Users */}
                <motion.div variants={item} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Active Users</span>
                    </div>
                    <span className="text-sm font-bold">
                      {latestMetrics?.active_users || 0}
                    </span>
                  </div>
                  <Progress
                    value={(latestMetrics?.active_users || 0) * 5}
                    className="h-2 bg-muted"
                    indicatorClassName="bg-green-500"
                  />
                </motion.div>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

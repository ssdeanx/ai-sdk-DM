'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Maximize,
  Minimize,
  Download,
  RefreshCw,
  Copy,
  Check,
  BarChart,
  PieChart,
  LineChart,
  Activity,
  Zap,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { createTrace, createSpan, logEvent } from '@/lib/langfuse-integration';

// Import Chart.js dynamically to avoid SSR issues
let Chart: any = null;

interface TracingEvent {
  id: string;
  name: string;
  timestamp: string;
  metadata: any;
}

interface TracingSpan {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  metadata: any;
}

interface TracingData {
  traceId: string;
  events: TracingEvent[];
  spans: TracingSpan[];
}

interface TracingVisualizationProps {
  traceId?: string;
  title?: string;
  className?: string;
  showControls?: boolean;
  refreshInterval?: number;
}

export function TracingVisualization({
  traceId,
  title = 'Tracing Visualization',
  className,
  showControls = true,
  refreshInterval = 5000,
}: TracingVisualizationProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [activeView, setActiveView] = useState<string>('timeline');
  const [tracingData, setTracingData] = useState<TracingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartInstance, setChartInstance] = useState<any>(null);

  // Fetch tracing data
  const fetchTracingData = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // This is a mock implementation - in a real app, you would fetch from your Langfuse backend
      // const response = await fetch(`/api/tracing/${id}`)
      // const data = await response.json()

      // For demo purposes, we'll create mock data
      const mockData: TracingData = {
        traceId: id,
        events: [
          {
            id: 'evt1',
            name: 'visualization_initialized',
            timestamp: new Date(Date.now() - 5000).toISOString(),
            metadata: { chartType: 'bar', dataSize: 1024 },
          },
          {
            id: 'evt2',
            name: 'chart_render_start',
            timestamp: new Date(Date.now() - 4000).toISOString(),
            metadata: { chartType: 'bar', library: 'chartjs' },
          },
          {
            id: 'evt3',
            name: 'chart_render_complete',
            timestamp: new Date(Date.now() - 3500).toISOString(),
            metadata: {
              chartType: 'bar',
              library: 'chartjs',
              renderTimeMs: 500,
            },
          },
          {
            id: 'evt4',
            name: 'chart_type_changed',
            timestamp: new Date(Date.now() - 2000).toISOString(),
            metadata: { previousType: 'bar', newType: 'line' },
          },
        ],
        spans: [
          {
            id: 'spn1',
            name: 'chart_rendering',
            startTime: new Date(Date.now() - 4000).toISOString(),
            endTime: new Date(Date.now() - 3500).toISOString(),
            duration: 500,
            metadata: { chartType: 'bar', library: 'chartjs' },
          },
          {
            id: 'spn2',
            name: 'data_processing',
            startTime: new Date(Date.now() - 4500).toISOString(),
            endTime: new Date(Date.now() - 4100).toISOString(),
            duration: 400,
            metadata: {
              dataPoints: 50,
              operations: ['normalize', 'transform'],
            },
          },
        ],
      };

      setTracingData(mockData);
    } catch (err) {
      setError('Failed to fetch tracing data');
      console.error('Error fetching tracing data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when traceId changes or on refresh
  useEffect(() => {
    if (traceId) {
      fetchTracingData(traceId);

      // Set up refresh interval
      const intervalId = setInterval(() => {
        fetchTracingData(traceId);
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [traceId, refreshInterval]);

  // Render timeline chart
  useEffect(() => {
    if (activeView !== 'timeline' || !tracingData || !document) return;

    const renderTimelineChart = async () => {
      try {
        // Dynamically import Chart.js
        if (!Chart) {
          const mod = await import('chart.js/auto');
          Chart = mod.Chart;
        }

        // Destroy existing chart
        if (chartInstance) {
          chartInstance.destroy();
        }

        // Get canvas element
        const canvas = document.getElementById(
          'tracing-timeline'
        ) as HTMLCanvasElement;
        if (!canvas) return;

        // Prepare data
        const events = tracingData.events.map((event) => ({
          x: new Date(event.timestamp),
          y: 1,
          name: event.name,
          metadata: event.metadata,
        }));

        const spans = tracingData.spans.map((span) => ({
          x: new Date(span.startTime),
          y: 0,
          name: span.name,
          duration: span.duration,
          metadata: span.metadata,
        }));

        // Create chart
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const newChart = new Chart(ctx, {
          type: 'scatter',
          data: {
            datasets: [
              {
                label: 'Events',
                data: events,
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                pointRadius: 8,
                pointHoverRadius: 10,
              },
              {
                label: 'Spans',
                data: spans,
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                pointRadius: 8,
                pointHoverRadius: 10,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                type: 'time',
                time: {
                  unit: 'second',
                  displayFormats: {
                    second: 'HH:mm:ss',
                  },
                },
                title: {
                  display: true,
                  text: 'Time',
                },
              },
              y: {
                type: 'category',
                labels: ['Spans', 'Events'],
                title: {
                  display: true,
                  text: 'Type',
                },
              },
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const point = context.raw as any;
                    let label = point.name || '';

                    if (point.duration) {
                      label += ` (${point.duration}ms)`;
                    }

                    return label;
                  },
                  afterLabel: (context) => {
                    const point = context.raw as any;
                    if (point.metadata) {
                      return Object.entries(point.metadata).map(
                        ([key, value]) => `${key}: ${value}`
                      );
                    }
                    return [];
                  },
                },
              },
            },
          },
        });

        setChartInstance(newChart);
      } catch (error) {
        console.error('Error rendering timeline chart:', error);
      }
    };

    renderTimelineChart();

    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [activeView, tracingData, chartInstance]);

  // Handle refresh
  const handleRefresh = () => {
    if (traceId) {
      fetchTracingData(traceId);
    }
  };

  // Handle expand/collapse
  const handleExpandCollapse = () => {
    setExpanded(!expanded);
  };

  if (!traceId) {
    return (
      <div className="p-4 border border-border/50 rounded-lg bg-background">
        <p className="text-center text-muted-foreground">
          No trace ID provided
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden border border-border/50 shadow-md transition-all duration-300 bg-background',
        expanded && 'fixed inset-4 z-50 bg-background flex flex-col',
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-900 to-indigo-900 px-4 py-2 text-white">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="font-medium">{title}</span>
          {loading && <span className="text-xs opacity-70">(Loading...)</span>}
        </div>
        {showControls && (
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
              onClick={handleRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={handleExpandCollapse}
            >
              {expanded ? (
                <Minimize className="h-3.5 w-3.5" />
              ) : (
                <Maximize className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">
                {expanded ? 'Minimize' : 'Maximize'}
              </span>
            </Button>
          </motion.div>
        )}
      </div>

      <div
        className={cn(
          'p-4 bg-white dark:bg-zinc-900',
          expanded ? 'flex-1' : 'h-[300px]'
        )}
      >
        <Tabs
          value={activeView}
          onValueChange={setActiveView}
          className="h-full flex flex-col"
        >
          <TabsList className="mb-4 grid grid-cols-3">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="spans">Spans</TabsTrigger>
          </TabsList>

          <div className="flex-1 relative min-h-[200px]">
            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {activeView === 'timeline' && !error && (
              <canvas id="tracing-timeline" className="w-full h-full" />
            )}

            {activeView === 'events' && !error && tracingData && (
              <div className="h-full overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Event</th>
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tracingData.events.map((event) => (
                      <tr key={event.id} className="border-b border-border/20">
                        <td className="p-2">{event.name}</td>
                        <td className="p-2">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-2">
                          <pre className="text-xs overflow-auto max-w-xs">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeView === 'spans' && !error && tracingData && (
              <div className="h-full overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Span</th>
                      <th className="text-left p-2">Duration</th>
                      <th className="text-left p-2">Start Time</th>
                      <th className="text-left p-2">End Time</th>
                      <th className="text-left p-2">Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tracingData.spans.map((span) => (
                      <tr key={span.id} className="border-b border-border/20">
                        <td className="p-2">{span.name}</td>
                        <td className="p-2">{span.duration}ms</td>
                        <td className="p-2">
                          {new Date(span.startTime).toLocaleTimeString()}
                        </td>
                        <td className="p-2">
                          {new Date(span.endTime).toLocaleTimeString()}
                        </td>
                        <td className="p-2">
                          <pre className="text-xs overflow-auto max-w-xs">
                            {JSON.stringify(span.metadata, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
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
  AreaChart,
  ScatterPlot,
  Activity,
  Grid3X3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { createTrace, createSpan, logEvent } from '@/lib/langfuse-integration';

// Import libraries dynamically to avoid SSR issues
let Chart: any = null;
let Plotly: any = null;

// Import Recharts components dynamically - we'll use these in a future implementation
import dynamic from 'next/dynamic';
const RechartsResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
  x?: number | string;
  y?: number;
  z?: number;
  size?: number;
  [key: string]: any;
}

export interface DataSeries {
  name: string;
  data: DataPoint[] | number[];
  color?: string;
  type?: string;
}

export interface DataVisualizationProps {
  title?: string;
  data: DataPoint[] | DataSeries[];
  type?:
    | 'bar'
    | 'line'
    | 'pie'
    | 'doughnut'
    | 'radar'
    | 'polarArea'
    | 'scatter'
    | 'area'
    | 'heatmap'
    | 'bubble'
    | 'radialBar'
    | 'treemap';
  labels?: string[];
  className?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  stacked?: boolean;
  is3D?: boolean;
  isMultiSeries?: boolean;
  theme?: 'light' | 'dark' | 'colorful' | 'monochrome';
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  showAnimation?: boolean;
  library?: 'chartjs' | 'plotly' | 'recharts';
}

export function DataVisualization({
  title = 'Data Visualization',
  data,
  type = 'bar',
  labels,
  className,
  xAxisLabel,
  yAxisLabel,
  stacked = false,
  is3D = false,
  isMultiSeries = false,
  theme = 'light',
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  showAnimation = true,
  library = 'chartjs',
}: DataVisualizationProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeChart, setActiveChart] = useState<string>(type);
  const [activeLibrary, setActiveLibrary] = useState<string>(library);
  const [chartInstance, setChartInstance] = useState<any>(null);
  const [plotlyInstance, setPlotlyInstance] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [chartSettings, setChartSettings] = useState({
    stacked,
    is3D,
    showLegend,
    showGrid,
    showTooltip,
    showAnimation,
    theme,
  });
  const [traceId, setTraceId] = useState<string | null>(null);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const plotlyRef = useRef<HTMLDivElement>(null);

  // Create a trace when the component mounts
  useEffect(() => {
    async function initTrace() {
      try {
        const trace = await createTrace({
          name: 'data_visualization',
          metadata: {
            title,
            type,
            dataPoints: Array.isArray(data) ? data.length : 0,
            chartLibrary: library,
          },
        });

        if (trace?.id) {
          setTraceId(trace.id);

          // Log visualization initialization event
          await logEvent({
            traceId: trace.id,
            name: 'visualization_initialized',
            metadata: {
              chartType: type,
              dataSize: JSON.stringify(data).length,
              settings: chartSettings,
            },
          });
        }
      } catch (error) {
        console.error('Error creating trace:', error);
      }
    }

    initTrace();

    // Cleanup function
    return () => {
      // Log component unmount if we have a trace
      if (traceId) {
        logEvent({
          traceId,
          name: 'visualization_unmounted',
          metadata: {
            duration: 'component_lifetime',
          },
        }).catch(console.error);
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Default colors if not provided
  const defaultColors = [
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
    'rgba(199, 199, 199, 0.8)',
    'rgba(83, 102, 255, 0.8)',
    'rgba(40, 159, 64, 0.8)',
    'rgba(210, 199, 199, 0.8)',
  ];

  // Theme colors
  const themeColors = {
    light: defaultColors,
    dark: [
      'rgba(32, 156, 238, 0.8)',
      'rgba(235, 77, 112, 0.8)',
      'rgba(255, 193, 7, 0.8)',
      'rgba(0, 230, 118, 0.8)',
      'rgba(156, 39, 176, 0.8)',
      'rgba(255, 87, 34, 0.8)',
      'rgba(84, 110, 122, 0.8)',
      'rgba(63, 81, 181, 0.8)',
      'rgba(0, 188, 212, 0.8)',
      'rgba(205, 220, 57, 0.8)',
    ],
    colorful: [
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(255, 0, 255, 0.8)',
      'rgba(0, 255, 255, 0.8)',
      'rgba(128, 0, 128, 0.8)',
      'rgba(0, 128, 128, 0.8)',
    ],
    monochrome: [
      'rgba(44, 62, 80, 0.9)',
      'rgba(44, 62, 80, 0.8)',
      'rgba(44, 62, 80, 0.7)',
      'rgba(44, 62, 80, 0.6)',
      'rgba(44, 62, 80, 0.5)',
      'rgba(44, 62, 80, 0.4)',
      'rgba(44, 62, 80, 0.3)',
      'rgba(44, 62, 80, 0.2)',
      'rgba(44, 62, 80, 0.15)',
      'rgba(44, 62, 80, 0.1)',
    ],
  };

  // Determine if data is multi-series
  const isDataMultiSeries =
    Array.isArray(data) &&
    data.length > 0 &&
    'name' in data[0] &&
    'data' in data[0];

  // Prepare chart data for Chart.js
  const prepareChartJsData = () => {
    if (isDataMultiSeries) {
      // Multi-series data
      const multiSeriesData = data as DataSeries[];
      const chartLabels =
        labels ||
        (multiSeriesData[0].data as DataPoint[]).map(
          (item) => item.label || item.x || ''
        );

      return {
        labels: chartLabels,
        datasets: multiSeriesData.map((series, seriesIndex) => {
          const color =
            series.color ||
            themeColors[chartSettings.theme][
              seriesIndex % themeColors[chartSettings.theme].length
            ];

          return {
            label: series.name,
            data: (series.data as DataPoint[]).map((item) =>
              typeof item === 'number' ? item : item.value || item.y
            ),
            backgroundColor: color,
            borderColor: color.replace('0.8', '1'),
            borderWidth: 1,
            fill: activeChart === 'area',
            tension: 0.4,
          };
        }),
      };
    } else {
      // Single series data
      const singleSeriesData = data as DataPoint[];
      const chartLabels =
        labels || singleSeriesData.map((item) => item.label || item.x || '');
      const chartValues = singleSeriesData.map((item) => item.value || item.y);
      const chartColors = singleSeriesData.map(
        (item, index) =>
          item.color ||
          themeColors[chartSettings.theme][
            index % themeColors[chartSettings.theme].length
          ]
      );

      return {
        labels: chartLabels,
        datasets: [
          {
            label: title,
            data: chartValues,
            backgroundColor: chartColors,
            borderColor: chartColors.map((color) => color.replace('0.8', '1')),
            borderWidth: 1,
            fill: activeChart === 'area',
            tension: 0.4,
          },
        ],
      };
    }
  };

  // Prepare data for Plotly
  const preparePlotlyData = () => {
    if (isDataMultiSeries) {
      // Multi-series data
      const multiSeriesData = data as DataSeries[];

      return multiSeriesData.map((series, seriesIndex) => {
        const color =
          series.color ||
          themeColors[chartSettings.theme][
            seriesIndex % themeColors[chartSettings.theme].length
          ];
        const seriesData = series.data as DataPoint[];

        const baseTrace = {
          name: series.name,
          marker: { color },
        };

        if (activeChart === 'bar') {
          return {
            ...baseTrace,
            type: 'bar',
            x: seriesData.map((item) => item.label || item.x),
            y: seriesData.map((item) => item.value || item.y),
          };
        } else if (activeChart === 'line' || activeChart === 'area') {
          return {
            ...baseTrace,
            type: 'scatter',
            mode: 'lines+markers',
            x: seriesData.map((item) => item.label || item.x),
            y: seriesData.map((item) => item.value || item.y),
            fill: activeChart === 'area' ? 'tozeroy' : 'none',
          };
        } else if (activeChart === 'pie') {
          return {
            ...baseTrace,
            type: 'pie',
            labels: seriesData.map((item) => item.label || item.x),
            values: seriesData.map((item) => item.value || item.y),
          };
        } else if (activeChart === 'scatter') {
          return {
            ...baseTrace,
            type: 'scatter',
            mode: 'markers',
            x: seriesData.map((item) => item.x),
            y: seriesData.map((item) => item.y),
            marker: {
              color,
              size: seriesData.map((item) => item.size || 10),
            },
          };
        } else if (activeChart === 'bubble') {
          return {
            ...baseTrace,
            type: 'scatter',
            mode: 'markers',
            x: seriesData.map((item) => item.x),
            y: seriesData.map((item) => item.y),
            marker: {
              color,
              size: seriesData.map((item) => item.size || 10),
              opacity: 0.7,
            },
          };
        } else if (activeChart === 'radar') {
          return {
            ...baseTrace,
            type: 'scatterpolar',
            r: seriesData.map((item) => item.value || item.y),
            theta: seriesData.map((item) => item.label || item.x),
            fill: 'toself',
          };
        } else {
          // Default to bar
          return {
            ...baseTrace,
            type: 'bar',
            x: seriesData.map((item) => item.label || item.x),
            y: seriesData.map((item) => item.value || item.y),
          };
        }
      });
    } else {
      // Single series data
      const singleSeriesData = data as DataPoint[];

      if (activeChart === 'bar') {
        return [
          {
            type: 'bar',
            x: singleSeriesData.map((item) => item.label || item.x),
            y: singleSeriesData.map((item) => item.value || item.y),
            marker: {
              color: singleSeriesData.map(
                (item, index) =>
                  item.color ||
                  themeColors[chartSettings.theme][
                    index % themeColors[chartSettings.theme].length
                  ]
              ),
            },
          },
        ];
      } else if (activeChart === 'line' || activeChart === 'area') {
        return [
          {
            type: 'scatter',
            mode: 'lines+markers',
            x: singleSeriesData.map((item) => item.label || item.x),
            y: singleSeriesData.map((item) => item.value || item.y),
            fill: activeChart === 'area' ? 'tozeroy' : 'none',
            line: { color: themeColors[chartSettings.theme][0] },
          },
        ];
      } else if (activeChart === 'pie') {
        return [
          {
            type: 'pie',
            labels: singleSeriesData.map((item) => item.label || item.x),
            values: singleSeriesData.map((item) => item.value || item.y),
            marker: {
              colors: singleSeriesData.map(
                (item, index) =>
                  item.color ||
                  themeColors[chartSettings.theme][
                    index % themeColors[chartSettings.theme].length
                  ]
              ),
            },
          },
        ];
      } else if (activeChart === 'scatter') {
        return [
          {
            type: 'scatter',
            mode: 'markers',
            x: singleSeriesData.map((item) => item.x),
            y: singleSeriesData.map((item) => item.y),
            marker: {
              color: themeColors[chartSettings.theme][0],
              size: singleSeriesData.map((item) => item.size || 10),
            },
          },
        ];
      } else if (activeChart === 'bubble') {
        return [
          {
            type: 'scatter',
            mode: 'markers',
            x: singleSeriesData.map((item) => item.x),
            y: singleSeriesData.map((item) => item.y),
            marker: {
              color: singleSeriesData.map(
                (item, index) =>
                  item.color ||
                  themeColors[chartSettings.theme][
                    index % themeColors[chartSettings.theme].length
                  ]
              ),
              size: singleSeriesData.map((item) => item.size || 10),
              opacity: 0.7,
            },
          },
        ];
      } else if (activeChart === 'radar') {
        return [
          {
            type: 'scatterpolar',
            r: singleSeriesData.map((item) => item.value || item.y),
            theta: singleSeriesData.map((item) => item.label || item.x),
            fill: 'toself',
            line: { color: themeColors[chartSettings.theme][0] },
          },
        ];
      } else {
        // Default to bar
        return [
          {
            type: 'bar',
            x: singleSeriesData.map((item) => item.label || item.x),
            y: singleSeriesData.map((item) => item.value || item.y),
            marker: {
              color: singleSeriesData.map(
                (item, index) =>
                  item.color ||
                  themeColors[chartSettings.theme][
                    index % themeColors[chartSettings.theme].length
                  ]
              ),
            },
          },
        ];
      }
    }
  };

  // Prepare data for Recharts
  const prepareRechartsData = () => {
    if (isDataMultiSeries) {
      // Multi-series data
      const multiSeriesData = data as DataSeries[];
      const seriesNames = multiSeriesData.map((series) => series.name);
      const firstSeries = multiSeriesData[0].data as DataPoint[];

      // Create a combined dataset for Recharts
      return firstSeries.map((item, index) => {
        const dataPoint: any = {
          name: item.label || item.x || `Item ${index + 1}`,
        };

        // Add values from each series
        multiSeriesData.forEach((series) => {
          const seriesData = series.data as DataPoint[];
          dataPoint[series.name] =
            seriesData[index]?.value || seriesData[index]?.y || 0;
        });

        return dataPoint;
      });
    } else {
      // Single series data
      const singleSeriesData = data as DataPoint[];

      return singleSeriesData.map((item) => ({
        name: item.label || item.x || '',
        ...item, // Include all original properties
      }));
    }
  };

  // Create or update Chart.js chart
  useEffect(() => {
    if (activeLibrary !== 'chartjs') return;

    let isMounted = true;
    let startTime: Date | null = null;

    async function loadAndDrawChartJs() {
      if (!chartRef.current) return;

      startTime = new Date();

      // Log chart rendering start
      if (traceId) {
        await logEvent({
          traceId,
          name: 'chart_render_start',
          metadata: {
            chartType: activeChart,
            library: 'chartjs',
          },
        });
      }

      try {
        // Dynamically import Chart.js only on client
        const mod = await import('chart.js/auto');
        Chart = mod.Chart;

        // Destroy existing chart
        if (chartInstance) {
          chartInstance.destroy();
        }

        // Create new chart
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        const newChart = new Chart(ctx, {
          type: activeChart === 'area' ? 'line' : (activeChart as any),
          data: prepareChartJsData(),
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: chartSettings.showAnimation ? 1000 : 0,
            },
            plugins: {
              legend: {
                display: chartSettings.showLegend,
                position: 'top',
              },
              title: {
                display: !!title,
                text: title,
              },
              tooltip: {
                enabled: chartSettings.showTooltip,
              },
            },
            scales: {
              x: {
                stacked: chartSettings.stacked,
                title: {
                  display: !!xAxisLabel,
                  text: xAxisLabel,
                },
                grid: {
                  display: chartSettings.showGrid,
                },
              },
              y: {
                stacked: chartSettings.stacked,
                title: {
                  display: !!yAxisLabel,
                  text: yAxisLabel,
                },
                grid: {
                  display: chartSettings.showGrid,
                },
              },
            },
          },
        });

        if (isMounted) {
          setChartInstance(newChart);

          // Log successful chart rendering
          if (traceId && startTime) {
            const endTime = new Date();
            const renderTime = endTime.getTime() - startTime.getTime();

            await logEvent({
              traceId,
              name: 'chart_render_complete',
              metadata: {
                chartType: activeChart,
                library: 'chartjs',
                renderTimeMs: renderTime,
                success: true,
              },
            });
          }
        }
      } catch (error) {
        console.error('Error rendering chart:', error);

        // Log chart rendering error
        if (traceId && startTime) {
          const endTime = new Date();
          const renderTime = endTime.getTime() - startTime.getTime();

          await logEvent({
            traceId,
            name: 'chart_render_error',
            metadata: {
              chartType: activeChart,
              library: 'chartjs',
              renderTimeMs: renderTime,
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }
    }

    loadAndDrawChartJs();

    // Cleanup
    return () => {
      isMounted = false;
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [
    activeChart,
    activeLibrary,
    data,
    title,
    labels,
    xAxisLabel,
    yAxisLabel,
    chartSettings,
    traceId,
  ]);

  // Create or update Plotly chart
  useEffect(() => {
    if (activeLibrary !== 'plotly') return;

    let isMounted = true;

    async function loadAndDrawPlotly() {
      if (!plotlyRef.current) return;

      // Dynamically import Plotly.js only on client
      const mod = await import('plotly.js-dist');
      Plotly = mod.default;

      // Create new plot
      const plotData = preparePlotlyData();

      const layout = {
        title: title,
        showlegend: chartSettings.showLegend,
        xaxis: {
          title: xAxisLabel,
          showgrid: chartSettings.showGrid,
        },
        yaxis: {
          title: yAxisLabel,
          showgrid: chartSettings.showGrid,
        },
        hovermode: chartSettings.showTooltip ? 'closest' : false,
        barmode: chartSettings.stacked ? 'stack' : 'group',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 50, r: 50, b: 50, l: 50 },
        font: {
          family: 'system-ui, sans-serif',
        },
      };

      const config = {
        responsive: true,
        displayModeBar: false,
      };

      // Clear previous plot
      plotlyRef.current.innerHTML = '';

      // Create new plot
      Plotly.newPlot(plotlyRef.current, plotData, layout, config);

      if (isMounted) setPlotlyInstance(plotlyRef.current);
    }

    loadAndDrawPlotly();

    // Cleanup
    return () => {
      isMounted = false;
      if (plotlyInstance && Plotly) {
        Plotly.purge(plotlyInstance);
      }
    };
  }, [
    activeChart,
    activeLibrary,
    data,
    title,
    labels,
    xAxisLabel,
    yAxisLabel,
    chartSettings,
  ]);

  // Handle copy data
  const handleCopyData = async () => {
    try {
      const dataString = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(dataString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Log copy data event
      if (traceId) {
        await logEvent({
          traceId,
          name: 'chart_data_copied',
          metadata: {
            dataSize: dataString.length,
            chartType: activeChart,
          },
        });
      }
    } catch (error) {
      console.error('Error copying data:', error);

      // Log copy error
      if (traceId) {
        await logEvent({
          traceId,
          name: 'chart_data_copy_error',
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  };

  // Handle download chart
  const handleDownload = () => {
    if (!chartRef.current) return;

    try {
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-chart.png`;
      link.href = chartRef.current.toDataURL('image/png');
      link.click();

      // Log download event
      if (traceId) {
        logEvent({
          traceId,
          name: 'chart_downloaded',
          metadata: {
            chartType: activeChart,
            format: 'png',
            title,
          },
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Error downloading chart:', error);

      // Log download error
      if (traceId) {
        logEvent({
          traceId,
          name: 'chart_download_error',
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        }).catch(console.error);
      }
    }
  };

  // Handle chart type change with tracing
  const handleChartTypeChange = (type: string) => {
    setActiveChart(type);

    // Log chart type change
    if (traceId) {
      logEvent({
        traceId,
        name: 'chart_type_changed',
        metadata: {
          previousType: activeChart,
          newType: type,
        },
      }).catch(console.error);
    }
  };

  // Handle expand/collapse with tracing
  const handleExpandCollapse = () => {
    setExpanded(!expanded);

    // Log expand/collapse event
    if (traceId) {
      logEvent({
        traceId,
        name: expanded ? 'chart_collapsed' : 'chart_expanded',
        metadata: {
          chartType: activeChart,
        },
      }).catch(console.error);
    }
  };

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
      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-900 to-purple-900 px-4 py-2 text-white">
        <div className="flex items-center gap-2">
          {activeChart === 'bar' && <BarChart className="h-4 w-4" />}
          {activeChart === 'pie' && <PieChart className="h-4 w-4" />}
          {activeChart === 'line' && <LineChart className="h-4 w-4" />}
          {activeChart === 'area' && <AreaChart className="h-4 w-4" />}
          {activeChart === 'scatter' && <ScatterPlot className="h-4 w-4" />}
          <span className="font-medium">{title}</span>
        </div>
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
            onClick={handleCopyData}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">Copy data</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only">Download chart</span>
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
      </div>

      <div
        className={cn(
          'p-4 bg-white dark:bg-zinc-900',
          expanded ? 'flex-1' : 'h-[300px]'
        )}
      >
        <Tabs
          value={activeChart}
          onValueChange={handleChartTypeChange}
          className="h-full flex flex-col"
        >
          <TabsList className="mb-4 grid grid-cols-5">
            <TabsTrigger value="bar">Bar</TabsTrigger>
            <TabsTrigger value="line">Line</TabsTrigger>
            <TabsTrigger value="pie">Pie</TabsTrigger>
            <TabsTrigger value="area">Area</TabsTrigger>
            <TabsTrigger value="scatter">Scatter</TabsTrigger>
          </TabsList>

          <div className="flex-1 relative min-h-[200px]">
            <canvas ref={chartRef} className="w-full h-full" />
            <div
              ref={plotlyRef}
              className="w-full h-full"
              style={{ display: activeLibrary === 'plotly' ? 'block' : 'none' }}
            />
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default DataVisualization;

export type { DataPoint, DataSeries, DataVisualizationProps };

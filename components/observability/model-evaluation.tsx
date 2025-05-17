'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
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
  Star,
  Zap,
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  RadialBar,
} from 'recharts';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface EvaluationMetric {
  name: string;
  description: string;
  value: number;
  threshold: number;
  weight: number;
}

interface ModelEvaluation {
  modelId: string;
  provider: string;
  displayName: string;
  version: string;
  evaluationDate: string;
  datasetName: string;
  datasetSize: number;
  metrics: EvaluationMetric[];
  overallScore: number;
  previousScore?: number;
  examples: Array<{
    id: string;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    scores: Record<string, number>;
  }>;
}

interface ModelEvaluationProps {
  evaluations: ModelEvaluation[];
  isLoading: boolean;
}

export function ModelEvaluation({
  evaluations,
  isLoading,
}: ModelEvaluationProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  // Set the first model as selected when data loads
  useEffect(() => {
    if (evaluations && evaluations.length > 0 && !selectedModel) {
      setSelectedModel(evaluations[0].modelId);

      // Set the first metric as selected
      if (evaluations[0].metrics.length > 0 && !selectedMetric) {
        setSelectedMetric(evaluations[0].metrics[0].name);
      }

      // Set the first example as selected
      if (evaluations[0].examples.length > 0 && !selectedExample) {
        setSelectedExample(evaluations[0].examples[0].id);
      }
    }
  }, [evaluations, selectedModel, selectedMetric, selectedExample]);

  // Get the selected model data
  const selectedModelData = evaluations?.find(
    (m) => m.modelId === selectedModel
  );

  // Get the selected example
  const selectedExampleData = selectedModelData?.examples.find(
    (e) => e.id === selectedExample
  );

  // Prepare data for radar chart
  const radarData = selectedModelData?.metrics.map((metric) => ({
    metric: metric.name,
    value: metric.value,
    threshold: metric.threshold,
  }));

  // Prepare data for comparison chart
  const comparisonData = evaluations?.map((model) => {
    const metricValues: Record<string, number> = {};
    model.metrics.forEach((metric) => {
      metricValues[metric.name] = metric.value;
    });

    return {
      name: model.displayName,
      ...metricValues,
      overallScore: model.overallScore,
      provider: model.provider,
    };
  });

  // Get provider color
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

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return '#10b981'; // Green
    if (score >= 0.6) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  // Format score as percentage
  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color || entry.stroke }}>
              {entry.name}:{' '}
              {typeof entry.value === 'number'
                ? formatScore(entry.value)
                : entry.value}
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

  // Generate mock data if needed for demo
  const generateMockEvaluations = () => {
    if (evaluations && evaluations.length > 0) return evaluations;

    const mockModels = [
      {
        modelId: 'gemini-1.5-pro',
        provider: 'google',
        displayName: 'Gemini 1.5 Pro',
        version: '2024-06-01',
      },
      {
        modelId: 'gpt-4o',
        provider: 'openai',
        displayName: 'GPT-4o',
        version: '2024-05-15',
      },
      {
        modelId: 'claude-3-opus',
        provider: 'anthropic',
        displayName: 'Claude 3 Opus',
        version: '2024-04-20',
      },
      {
        modelId: 'gemini-1.5-flash',
        provider: 'google',
        displayName: 'Gemini 1.5 Flash',
        version: '2024-06-01',
      },
      {
        modelId: 'gpt-4-turbo',
        provider: 'openai',
        displayName: 'GPT-4 Turbo',
        version: '2024-03-10',
      },
    ];

    const metricNames = [
      { name: 'accuracy', description: 'Correctness of responses' },
      { name: 'relevance', description: 'Relevance to the query' },
      { name: 'coherence', description: 'Logical flow and consistency' },
      { name: 'conciseness', description: 'Brevity and clarity' },
      { name: 'harmlessness', description: 'Avoidance of harmful content' },
    ];

    return mockModels.map((model) => {
      // Generate random metrics
      const metrics = metricNames.map((metric) => ({
        name: metric.name,
        description: metric.description,
        value: Math.random() * 0.4 + 0.6, // Between 0.6 and 1.0
        threshold: 0.7,
        weight: 1.0 / metricNames.length,
      }));

      // Calculate overall score
      const overallScore = metrics.reduce(
        (sum, metric) => sum + metric.value * metric.weight,
        0
      );

      // Generate example evaluations
      const examples = Array.from({ length: 5 }, (_, i) => {
        const exampleScores: Record<string, number> = {};
        metricNames.forEach((metric) => {
          exampleScores[metric.name] = Math.random() * 0.4 + 0.6; // Between 0.6 and 1.0
        });

        return {
          id: `example-${i + 1}`,
          input: `Example query ${i + 1} for testing the model's capabilities.`,
          expectedOutput: `Expected response for example ${i + 1} that demonstrates ideal behavior.`,
          actualOutput: `Actual model response for example ${i + 1} that may or may not match expectations.`,
          scores: exampleScores,
        };
      });

      return {
        ...model,
        evaluationDate: new Date().toISOString(),
        datasetName: 'Evaluation Dataset v1.0',
        datasetSize: 100,
        metrics,
        overallScore,
        previousScore: overallScore - (Math.random() * 0.1 - 0.05), // Slight variation from current
        examples,
      };
    });
  };

  // Use mock data if no real data is provided
  const displayData =
    evaluations?.length > 0 ? evaluations : generateMockEvaluations();

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedModel || ''} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent>
            {displayData?.map((model) => (
              <SelectItem key={model.modelId} value={model.modelId}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getProviderColor(model.provider),
                    }}
                  />
                  {model.displayName}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedModelData && (
          <Select
            value={selectedMetric || ''}
            onValueChange={setSelectedMetric}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Metric" />
            </SelectTrigger>
            <SelectContent>
              {selectedModelData.metrics.map((metric) => (
                <SelectItem key={metric.name} value={metric.name}>
                  {metric.name.charAt(0).toUpperCase() + metric.name.slice(1)}
                </SelectItem>
              ))}
              <SelectItem value="overallScore">Overall Score</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid grid-cols-3 w-[300px] ml-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <TabsContent value="overview" className="m-0">
        {isLoading || !selectedModelData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full col-span-2" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Model Info Card */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="px-2 py-1"
                      style={{
                        backgroundColor: `${getProviderColor(selectedModelData.provider)}20`,
                        color: getProviderColor(selectedModelData.provider),
                        borderColor: `${getProviderColor(selectedModelData.provider)}40`,
                      }}
                    >
                      {selectedModelData.provider}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="px-2 py-1"
                      style={{
                        backgroundColor: `${getScoreColor(selectedModelData.overallScore)}20`,
                        color: getScoreColor(selectedModelData.overallScore),
                        borderColor: `${getScoreColor(selectedModelData.overallScore)}40`,
                      }}
                    >
                      {formatScore(selectedModelData.overallScore)}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">
                    {selectedModelData.displayName}
                  </CardTitle>
                  <CardDescription>
                    Version: {selectedModelData.version}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Evaluation Date
                    </div>
                    <div className="font-medium">
                      {new Date(
                        selectedModelData.evaluationDate
                      ).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground">Dataset</div>
                    <div className="font-medium">
                      {selectedModelData.datasetName} (
                      {selectedModelData.datasetSize} examples)
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground">
                      Overall Score
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="text-2xl font-bold"
                        style={{
                          color: getScoreColor(selectedModelData.overallScore),
                        }}
                      >
                        {formatScore(selectedModelData.overallScore)}
                      </div>

                      {selectedModelData.previousScore && (
                        <div
                          className={cn(
                            'text-xs',
                            selectedModelData.overallScore >
                              selectedModelData.previousScore
                              ? 'text-green-500'
                              : 'text-red-500'
                          )}
                        >
                          {selectedModelData.overallScore >
                          selectedModelData.previousScore
                            ? '↑'
                            : '↓'}
                          {formatScore(
                            Math.abs(
                              selectedModelData.overallScore -
                                selectedModelData.previousScore
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Metrics</div>
                    {selectedModelData.metrics.map((metric) => (
                      <div
                        key={metric.name}
                        className="flex items-center justify-between"
                      >
                        <div className="text-sm capitalize">{metric.name}</div>
                        <div
                          className="font-medium"
                          style={{ color: getScoreColor(metric.value) }}
                        >
                          {formatScore(metric.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Radar Chart */}
            <motion.div variants={itemVariants} className="md:col-span-2">
              <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Evaluation Metrics</CardTitle>
                  <CardDescription>
                    Radar chart showing performance across all metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        data={radarData}
                      >
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{ fill: 'var(--muted-foreground)' }}
                          tickFormatter={(value) =>
                            value.charAt(0).toUpperCase() + value.slice(1)
                          }
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 1]}
                          tick={{ fill: 'var(--muted-foreground)' }}
                          tickFormatter={(value) => `${value * 100}%`}
                        />
                        <Radar
                          name="Threshold"
                          dataKey="threshold"
                          stroke="rgba(255,255,255,0.5)"
                          fill="rgba(255,255,255,0.1)"
                          fillOpacity={0.3}
                        />
                        <Radar
                          name="Score"
                          dataKey="value"
                          stroke={getProviderColor(selectedModelData.provider)}
                          fill={getProviderColor(selectedModelData.provider)}
                          fillOpacity={0.5}
                        />
                        <Legend />
                        <RechartsTooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
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
                {selectedMetric
                  ? `Comparing ${selectedMetric === 'overallScore' ? 'Overall Score' : selectedMetric} across all models`
                  : 'Comparing overall scores across all models'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={comparisonData} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis
                      type="number"
                      domain={[0, 1]}
                      tickFormatter={(value) => `${value * 100}%`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tick={{ fill: 'var(--muted-foreground)' }}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey={selectedMetric || 'overallScore'}
                      name={
                        selectedMetric === 'overallScore'
                          ? 'Overall Score'
                          : selectedMetric || 'Overall Score'
                      }
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

      <TabsContent value="examples" className="m-0">
        {isLoading || !selectedModelData ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Example List */}
            <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Evaluation Examples</CardTitle>
                <CardDescription>
                  Individual examples from the evaluation dataset
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="divide-y divide-border/30">
                    {selectedModelData.examples.map((example) => (
                      <div
                        key={example.id}
                        className={cn(
                          'p-3 hover:bg-muted/50 cursor-pointer transition-colors',
                          selectedExample === example.id &&
                            'bg-muted/70 border-l-4 border-primary'
                        )}
                        onClick={() => setSelectedExample(example.id)}
                      >
                        <div className="font-medium truncate">
                          Example {example.id.split('-')[1]}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {example.input.substring(0, 50)}...
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs">
                            Avg Score:{' '}
                            {formatScore(
                              Object.values(example.scores).reduce(
                                (sum, score) => sum + score,
                                0
                              ) / Object.values(example.scores).length
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Example Details */}
            <Card className="overflow-hidden border-opacity-40 backdrop-blur-sm md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Example Details</CardTitle>
                <CardDescription>
                  Detailed view of the selected example
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedExampleData ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Input</div>
                      <div className="p-3 bg-muted/30 rounded-md mt-1">
                        {selectedExampleData.input}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Expected Output
                        </div>
                        <div className="p-3 bg-muted/30 rounded-md mt-1">
                          {selectedExampleData.expectedOutput}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground">
                          Actual Output
                        </div>
                        <div className="p-3 bg-muted/30 rounded-md mt-1">
                          {selectedExampleData.actualOutput}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Scores
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(selectedExampleData.scores).map(
                          ([metric, score]) => (
                            <div
                              key={metric}
                              className="flex items-center justify-between p-2 bg-muted/20 rounded-md"
                            >
                              <div className="text-sm capitalize">{metric}</div>
                              <div
                                className="font-medium"
                                style={{ color: getScoreColor(score) }}
                              >
                                {formatScore(score)}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">
                      Select an example to view details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </TabsContent>
    </motion.div>
  );
}

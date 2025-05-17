'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Info,
  Layers,
  List,
  MoreHorizontal,
  RefreshCw,
  Search,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupabaseFetch } from '@/hooks/use-supabase-fetch';
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
  spans?: Array<{
    id: string;
    name: string;
    startTime: string;
    duration: number;
    status: string;
  }>;
  events?: Array<{
    id: string;
    name: string;
    timestamp: string;
    metadata?: any;
  }>;
}

interface TracingDetailsProps {
  traces: Trace[];
  isLoading: boolean;
  selectedTraceId: string | null;
  onSelectTrace: (traceId: string) => void;
}

export function TracingDetails({
  traces,
  isLoading,
  selectedTraceId,
  onSelectTrace,
}: TracingDetailsProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedMetadata, setExpandedMetadata] = useState<
    Record<string, boolean>
  >({});
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Use effect to reset copied state after 2 seconds
  useEffect(() => {
    if (copiedId) {
      const timer = setTimeout(() => {
        setCopiedId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedId]);

  // Fetch detailed trace data when a trace is selected
  const { data: traceDetailsArray, isLoading: detailsLoading } =
    useSupabaseFetch<Trace>({
      endpoint: '/api/observability/traces',
      resourceName: 'Trace Details',
      dataKey: 'trace',
      queryParams: { traceId: selectedTraceId || '' },
      enabled: !!selectedTraceId,
    });

  // Get the first trace from the array (should be only one)
  const traceDetails = traceDetailsArray?.[0];

  // Filter traces based on search query
  const filteredTraces = searchQuery
    ? traces.filter(
        (trace) =>
          trace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trace.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (trace.metadata &&
            JSON.stringify(trace.metadata)
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      )
    : traces;

  // Toggle metadata expansion
  const toggleMetadata = (traceId: string) => {
    setExpandedMetadata((prev) => ({
      ...prev,
      [traceId]: !prev[traceId],
    }));

    // Show toast notification when metadata is expanded/collapsed
    toast({
      title: expandedMetadata[traceId]
        ? 'Metadata collapsed'
        : 'Metadata expanded',
      description: `Metadata for ${traceId.substring(0, 8)}... has been ${expandedMetadata[traceId] ? 'collapsed' : 'expanded'}`,
      duration: 2000,
    });
  };

  // Copy trace ID to clipboard
  const copyToClipboard = (text: string, type: string = 'ID') => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);

    toast({
      title: `${type} copied to clipboard`,
      description: `${text.substring(0, 15)}${text.length > 15 ? '...' : ''} has been copied to your clipboard.`,
      duration: 2000,
    });
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Format duration
  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-500 border-green-500/20"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case 'error':
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-500 border-red-500/20"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-500 border-blue-500/20"
          >
            <Activity className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Traces List */}
        <Card className="lg:col-span-1 overflow-hidden border-opacity-40 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Traces
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Select a trace to view detailed information. You can
                        search traces by name or ID.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20"
              >
                {filteredTraces.length}
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search traces..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </div>
              ) : filteredTraces.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No traces found</p>
                </div>
              ) : (
                <motion.div
                  className="divide-y divide-border/30"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {filteredTraces.map((trace) => (
                    <motion.div
                      key={trace.id}
                      variants={itemVariants}
                      className={cn(
                        'p-3 hover:bg-muted/50 cursor-pointer transition-colors',
                        selectedTraceId === trace.id &&
                          'bg-muted/70 border-l-4 border-primary'
                      )}
                      onClick={() => onSelectTrace(trace.id)}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{trace.name}</h3>
                        {getStatusBadge(trace.status)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {formatTime(trace.startTime)}
                        <span>•</span>
                        <span>{formatDuration(trace.duration)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <span>ID: {trace.id}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(trace.id);
                                }}
                              >
                                {copiedId === trace.id ? (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                              {copiedId === trace.id ? 'Copied!' : 'Copy ID'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {trace.metadata && (
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMetadata(trace.id);
                            }}
                          >
                            {expandedMetadata[trace.id] ? (
                              <ChevronDown className="h-3 w-3 mr-1" />
                            ) : (
                              <ChevronRight className="h-3 w-3 mr-1" />
                            )}
                            Metadata
                          </Button>
                          <AnimatePresence>
                            {expandedMetadata[trace.id] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 text-xs bg-muted/50 p-2 rounded-md">
                                  <pre className="whitespace-pre-wrap break-all">
                                    {JSON.stringify(trace.metadata, null, 2)}
                                  </pre>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Trace Details */}
        <Card className="lg:col-span-2 overflow-hidden border-opacity-40 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Trace Details
              </span>
              {traceDetails && (
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const dataStr = JSON.stringify(
                              traceDetails,
                              null,
                              2
                            );
                            const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
                            const downloadAnchorNode =
                              document.createElement('a');
                            downloadAnchorNode.setAttribute('href', dataUri);
                            downloadAnchorNode.setAttribute(
                              'download',
                              `trace-${traceDetails.id}.json`
                            );
                            document.body.appendChild(downloadAnchorNode);
                            downloadAnchorNode.click();
                            downloadAnchorNode.remove();

                            toast({
                              title: 'Trace downloaded',
                              description: `Trace ${traceDetails.id.substring(0, 8)}... has been downloaded as JSON.`,
                              duration: 3000,
                            });
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download trace as JSON</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            // Open trace in new window/tab
                            window.open(
                              `/observability/traces/${traceDetails.id}`,
                              '_blank'
                            );

                            toast({
                              title: 'Trace opened in new tab',
                              description: `Trace ${traceDetails.id.substring(0, 8)}... has been opened in a new tab.`,
                              duration: 2000,
                            });
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open trace in new tab</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            // Toggle code view
                            setActiveTab('metadata');

                            toast({
                              title: 'Viewing trace code',
                              description:
                                'Switched to metadata view to see the raw trace data.',
                              duration: 2000,
                            });
                          }}
                        >
                          <Code className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View trace code</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </CardTitle>
            <CardDescription>
              {selectedTraceId
                ? 'Detailed information about the selected trace'
                : 'Select a trace to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedTraceId ? (
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-center">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select a trace from the list to view details
                  </p>
                </div>
              </div>
            ) : detailsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            ) : !traceDetails ? (
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Failed to load trace details
                  </p>
                </div>
              </div>
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-4"
              >
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="spans">Spans</TabsTrigger>
                  <TabsTrigger value="events">Events</TabsTrigger>
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="font-medium">{traceDetails.name}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Status
                      </div>
                      <div>{getStatusBadge(traceDetails.status)}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Start Time
                      </div>
                      <div className="font-medium">
                        {new Date(traceDetails.startTime).toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        End Time
                      </div>
                      <div className="font-medium">
                        {traceDetails.endTime
                          ? new Date(traceDetails.endTime).toLocaleString()
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Duration
                      </div>
                      <div className="font-medium">
                        {formatDuration(traceDetails.duration)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        User ID
                      </div>
                      <div className="font-medium">
                        {traceDetails.userId || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="text-sm text-muted-foreground">Summary</div>
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {traceDetails.spans?.length || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Spans
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {traceDetails.events?.length || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Events
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {formatDuration(traceDetails.duration)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total Duration
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="spans">
                  {(traceDetails.spans?.length ?? 0) > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {traceDetails.spans?.map((span: any) => (
                          <TableRow key={span.id}>
                            <TableCell className="font-medium">
                              {span.name}
                            </TableCell>
                            <TableCell>
                              {formatDuration(span.duration)}
                            </TableCell>
                            <TableCell>{formatTime(span.startTime)}</TableCell>
                            <TableCell>{getStatusBadge(span.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-muted-foreground">No spans found</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="events">
                  {(traceDetails.events?.length ?? 0) > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Metadata</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {traceDetails.events?.map((event: any) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">
                              {event.name}
                            </TableCell>
                            <TableCell>{formatTime(event.timestamp)}</TableCell>
                            <TableCell>
                              {event.metadata && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => toggleMetadata(event.id)}
                                >
                                  {expandedMetadata[event.id] ? (
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 mr-1" />
                                  )}
                                  View
                                </Button>
                              )}
                              <AnimatePresence>
                                {expandedMetadata[event.id] &&
                                  event.metadata && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="mt-2 text-xs bg-muted/50 p-2 rounded-md">
                                        <pre className="whitespace-pre-wrap break-all">
                                          {JSON.stringify(
                                            event.metadata,
                                            null,
                                            2
                                          )}
                                        </pre>
                                      </div>
                                    </motion.div>
                                  )}
                              </AnimatePresence>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-muted-foreground">No events found</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="metadata">
                  {traceDetails.metadata ? (
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <pre className="whitespace-pre-wrap break-all text-sm">
                          {JSON.stringify(traceDetails.metadata, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-muted-foreground">
                        No metadata available
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
          <CardFooter className="flex justify-end pt-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      if (selectedTraceId) {
                        // Refetch trace details
                        toast({
                          title: 'Refreshing trace details',
                          description:
                            'Fetching the latest trace information...',
                          duration: 2000,
                        });
                      }
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Refresh</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh trace details</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

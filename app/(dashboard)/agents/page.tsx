'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash,
  MoreHorizontal,
  Play,
  Copy,
  Bot,
  Wrench,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/shared/hooks/use-toast';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { DataTable } from '@/components/ui/data-table';
import { useSupabaseFetch } from '@/lib/shared/hooks/use-supabase-fetch';
import { useSupabaseCrud } from '@/lib/shared/hooks/use-supabase-crud';
import { useSupabaseRealtime } from '@/lib/shared/hooks/use-supabase-realtime';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CreateAgentDialog } from '@/components/agents/CreateAgentDialog';
import { EditAgentDialog } from '@/components/agents/EditAgentDialog';
import { AgentExecutor } from '@/components/agents/AgentExecutor';
import type { ColumnDef } from '@tanstack/react-table';

interface Agent {
  id: string;
  name: string;
  description?: string;
  model_id: string;
  tool_ids?: string[];
  system_prompt?: string;
  persona_id?: string;
  created_at?: string;
  updated_at?: string;
}

export default function AgentsPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Fetch agents (live-updating)
  const {
    data: agents = [],
    isLoading,
    refetch,
  } = useSupabaseFetch<Agent>({
    endpoint: '/api/ai-sdk/agents',
    resourceName: 'Agents',
    dataKey: 'agents',
    realtime: true,
  });

  // CRUD hook for agents
  const {
    create: createAgent,
    update: updateAgent,
    remove: deleteAgent,
    loading: isCrudLoading,
    error: crudError,
  } = useSupabaseCrud({ table: 'agents' });

  // Realtime updates for agents
  useSupabaseRealtime({
    table: 'agents',
    event: '*',
    enabled: true,
    onChange: refetch,
  });

  async function handleDelete(id: string) {
    try {
      await deleteAgent(id);
      await refetch();
      toast({ title: 'Success', description: 'Agent deleted.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete agent.' });
    }
  }

  function handleRun(agent: Agent) {
    setSelectedAgent(agent);
    toast({
      title: 'Running agent',
      description: `Started ${agent.name}`,
    });
  }

  async function handleDuplicate(agent: Agent) {
    try {
      await createAgent({
        name: `${agent.name} (Copy)`,
        description: agent.description ?? '',
        model_id: agent.model_id,
        tool_ids: agent.tool_ids,
        system_prompt: agent.system_prompt,
        persona_id: agent.persona_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await refetch();
      toast({
        title: 'Agent duplicated',
        description: `Created a copy of ${agent.name}`,
      });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to duplicate agent.' });
    }
  }

  const getSafeAgent = (agent: Agent): Required<Agent> => ({
    ...agent,
    description: agent.description ?? '',
    created_at: agent.created_at ?? '',
    updated_at: agent.updated_at ?? '',
  });

  const columns: ColumnDef<Agent>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div
          className="max-w-[300px] truncate"
          title={row.original.description}
        >
          {row.original.description}
        </div>
      ),
    },
    {
      accessorKey: 'model_id',
      header: 'Model',
      cell: ({ row }) => <div>{row.original.model_id}</div>,
    },
    {
      accessorKey: 'tool_ids',
      header: 'Tools',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tool_ids && row.original.tool_ids.length > 0 ? (
            row.original.tool_ids.map((toolId, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {toolId}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-xs">No tools</span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingAgent(row.original)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRun(row.original)}>
                <Play className="mr-2 h-4 w-4" />
                Run
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicate(row.original)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(row.original.id)}>
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
              <p className="text-muted-foreground">
                Create and manage AI agents
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('grid')}
                    >
                      <div className="grid grid-cols-2 gap-1">
                        <div className="h-1.5 w-1.5 rounded-sm bg-current" />
                        <div className="h-1.5 w-1.5 rounded-sm bg-current" />
                        <div className="h-1.5 w-1.5 rounded-sm bg-current" />
                        <div className="h-1.5 w-1.5 rounded-sm bg-current" />
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grid view</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('table')}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="h-1 w-4 rounded-sm bg-current" />
                        <div className="h-1 w-4 rounded-sm bg-current" />
                        <div className="h-1 w-4 rounded-sm bg-current" />
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Table view</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </div>
          </div>
        </motion.div>

        {viewMode === 'table' ? (
          <Card>
            <CardHeader>
              <CardTitle>Agents</CardTitle>
              <CardDescription>
                Manage AI agents that can perform tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={agents}
                isLoading={isLoading}
                searchKey="name"
                searchPlaceholder="Search agents..."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={`skeleton-${index}`} className="overflow-hidden">
                  <div className="p-6">
                    <div className="h-5 w-1/3 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-full bg-muted rounded animate-pulse mb-4"></div>
                    <div className="h-4 w-2/3 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="bg-muted/20 p-4 flex justify-between items-center">
                    <div className="h-4 w-1/4 bg-muted rounded animate-pulse"></div>
                    <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div>
                  </div>
                </Card>
              ))
            ) : agents.length > 0 ? (
              agents.map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden h-full flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center">
                            <span className="mr-2">{agent.name}</span>
                          </CardTitle>
                          <CardDescription>{agent.description}</CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditingAgent(agent)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRun(agent)}>
                              <Play className="mr-2 h-4 w-4" />
                              Run
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(agent)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(agent.id)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2 flex-1">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Database className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-muted-foreground">Model:</span>
                          <span className="ml-1 font-medium">
                            {agent.model_id || 'None'}
                          </span>
                        </div>

                        <div className="flex items-start text-sm">
                          <Wrench className="h-4 w-4 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <span className="text-muted-foreground">
                              Tools:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {agent.tool_ids && agent.tool_ids.length > 0 ? (
                                agent.tool_ids.map((toolId, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {toolId}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  No tools
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 mt-auto">
                      <div className="flex w-full justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          Updated{' '}
                          {agent.updated_at
                            ? new Date(agent.updated_at).toLocaleDateString()
                            : ''}
                        </span>
                        <Button size="sm" onClick={() => handleRun(agent)}>
                          <Play className="h-4 w-4 mr-2" />
                          Run
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center h-40 border rounded-lg">
                <div className="text-center">
                  <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <h3 className="text-lg font-medium">No agents found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first agent to get started
                  </p>
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Agent
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Agent Dialog */}
        <CreateAgentDialog
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreateAgent={async (agent) => {
            await refetch();
            toast({ title: 'Success', description: 'Agent created.' });
            setCreateOpen(false);
          }}
        />

        {/* Edit Agent Dialog */}
        {editingAgent && (
          <EditAgentDialog
            isOpen={true}
            onClose={() => {
              setEditOpen(false);
              setEditingAgent(null);
            }}
            agent={getSafeAgent(editingAgent)}
            onUpdateAgent={async (agent) => {
              await refetch();
              toast({ title: 'Success', description: 'Agent updated.' });
              setEditOpen(false);
              setEditingAgent(null);
            }}
          />
        )}

        {/* Agent Executor Dialog */}
        {selectedAgent && (
          <Card>
            <CardHeader>
              <CardTitle>Running Agent: {selectedAgent.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <AgentExecutor agent={getSafeAgent(selectedAgent)} />
            </CardContent>
          </Card>
        )}
      </div>
    </ErrorBoundary>
  );
}

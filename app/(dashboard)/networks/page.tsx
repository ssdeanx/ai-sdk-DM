'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Loader2,
  Network as NetworkIcon,
  Plus,
  Play,
  Settings,
  Trash,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useSupabaseFetch } from '@/hooks/use-supabase-fetch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define the form schema
const networkFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
});

// Define the agent assignment form schema
const agentAssignmentSchema = z.object({
  agentId: z.string({
    required_error: 'Please select an agent.',
  }),
  role: z.string().min(2, {
    message: 'Role must be at least 2 characters.',
  }),
});

interface Network {
  id: string;
  name: string;
  description: string;
  agent_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  model_id: string;
  created_at: string;
  updated_at: string;
}

interface NetworkAgent {
  id: string;
  network_id: string;
  agent_id: string;
  role: string;
  created_at: string;
  updated_at: string;
  agents: {
    id: string;
    name: string;
    description: string;
  };
}

export default function NetworksPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [networkAgents, setNetworkAgents] = useState<NetworkAgent[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [isRemovingAgent, setIsRemovingAgent] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Fetch networks from the API
  const {
    data: networks,
    isLoading,
    error,
    connectionError,
    refresh: refreshNetworks,
  } = useSupabaseFetch<Network>({
    endpoint: '/api/networks',
    resourceName: 'Networks',
    dataKey: 'networks',
  });

  // Fetch agents from the API
  const {
    data: agents,
    isLoading: isLoadingAgentsList,
    error: agentsError,
  } = useSupabaseFetch<Agent>({
    endpoint: '/api/agents',
    resourceName: 'Agents',
    dataKey: 'agents',
  });

  const form = useForm<z.infer<typeof networkFormSchema>>({
    resolver: zodResolver(networkFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const agentForm = useForm<z.infer<typeof agentAssignmentSchema>>({
    resolver: zodResolver(agentAssignmentSchema),
    defaultValues: {
      agentId: '',
      role: '',
    },
  });

  async function onSubmit(values: z.infer<typeof networkFormSchema>) {
    setIsSubmitting(true);

    try {
      const networkData = {
        name: values.name,
        description: values.description,
      };

      if (editingNetwork) {
        // Update existing network
        const response = await fetch(`/api/networks/${editingNetwork.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(networkData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update network');
        }

        toast({
          title: 'Network updated',
          description: `${values.name} has been updated successfully.`,
        });
      } else {
        // Create new network
        const response = await fetch('/api/networks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(networkData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create network');
        }

        toast({
          title: 'Network created',
          description: `${values.name} has been created successfully.`,
        });
      }

      // Refresh the networks list
      refreshNetworks();

      // Close the dialog and reset form
      setOpen(false);
      form.reset();
      setEditingNetwork(null);
    } catch (error) {
      console.error('Error saving network:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'An error occurred while saving the network',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onAgentSubmit(values: z.infer<typeof agentAssignmentSchema>) {
    if (!selectedNetwork) return;

    setIsAddingAgent(true);

    try {
      // Find the agent
      const agent = agents.find((a) => a.id === values.agentId);

      if (!agent) {
        throw new Error('Selected agent not found');
      }

      // Add agent to network via API
      const response = await fetch(
        `/api/networks/${selectedNetwork.id}/agents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: values.agentId,
            role: values.role,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add agent to network');
      }

      toast({
        title: 'Agent added to network',
        description: `${agent.name} has been added to ${selectedNetwork.name} as ${values.role}.`,
      });

      // Refresh the networks list and fetch updated agents
      refreshNetworks();
      fetchNetworkAgents(selectedNetwork.id);

      setAgentDialogOpen(false);
      agentForm.reset();
    } catch (error) {
      console.error('Error adding agent to network:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'An error occurred while adding the agent',
        variant: 'destructive',
      });
    } finally {
      setIsAddingAgent(false);
    }
  }

  function handleEdit(network: Network) {
    setEditingNetwork(network);
    form.reset({
      name: network.name,
      description: network.description,
    });
    setOpen(true);
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/networks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete network');
      }

      toast({
        title: 'Network deleted',
        description: 'The network has been deleted successfully.',
      });

      // Refresh the networks list
      refreshNetworks();
    } catch (error) {
      console.error('Error deleting network:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'An error occurred while deleting the network',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function fetchNetworkAgents(networkId: string) {
    setIsLoadingAgents(true);

    try {
      const response = await fetch(`/api/networks/${networkId}/agents`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch network agents');
      }

      const data = await response.json();
      setNetworkAgents(data.agents || []);
    } catch (error) {
      console.error('Error fetching network agents:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'An error occurred while fetching network agents',
        variant: 'destructive',
      });
      setNetworkAgents([]);
    } finally {
      setIsLoadingAgents(false);
    }
  }

  function handleManageAgents(network: Network) {
    setSelectedNetwork(network);
    fetchNetworkAgents(network.id);
  }

  async function handleRemoveAgent(agentId: string) {
    if (!selectedNetwork) return;

    setIsRemovingAgent(true);

    try {
      const response = await fetch(
        `/api/networks/${selectedNetwork.id}/agents/${agentId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove agent from network');
      }

      toast({
        title: 'Agent removed',
        description: 'The agent has been removed from the network.',
      });

      // Refresh the networks list and fetch updated agents
      refreshNetworks();
      fetchNetworkAgents(selectedNetwork.id);
    } catch (error) {
      console.error('Error removing agent from network:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'An error occurred while removing the agent',
        variant: 'destructive',
      });
    } finally {
      setIsRemovingAgent(false);
    }
  }

  async function handleRunNetwork(id: string) {
    const network = networks.find((n) => n.id === id);

    if (!network) return;

    toast({
      title: 'Network started',
      description: `${network.name} is now running.`,
    });

    // Here you would normally trigger the network run via API
    console.log('Running network:', id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Networks</h1>
          <p className="text-muted-foreground">
            Create and manage multi-agent networks
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingNetwork(null);
                form.reset({
                  name: '',
                  description: '',
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Network
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>
                {editingNetwork ? 'Edit Network' : 'Create New Network'}
              </DialogTitle>
              <DialogDescription>
                {editingNetwork
                  ? 'Update the network configuration'
                  : 'Create a new network of collaborating agents'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Research Team" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this network
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A network of agents that collaborate on research tasks"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A detailed description of what this network does
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingNetwork ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        {editingNetwork ? 'Update Network' : 'Create Network'}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error message */}
      {connectionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not connect to the backend. Please check your connection and
            ensure the backend is running.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading networks...</p>
        </div>
      ) : connectionError ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Show empty state when there's a connection error */}
          <Card className="col-span-full p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-4" />
              <h3 className="text-lg font-medium">Could not load networks</h3>
              <p className="text-muted-foreground mt-1">
                There was an error connecting to the backend. Please try again
                later.
              </p>
              <Button onClick={refreshNetworks} className="mt-4">
                Retry
              </Button>
            </div>
          </Card>
        </div>
      ) : networks.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Show empty state when there are no networks */}
          <Card className="col-span-full p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <NetworkIcon className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No networks found</h3>
              <p className="text-muted-foreground mt-1">
                You haven't created any networks yet. Click the "Create New
                Network" button to get started.
              </p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {networks.map((network) => (
            <Card key={network.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <NetworkIcon className="h-5 w-5" />
                    {network.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(network)}
                    >
                      <Settings className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(network.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash className="h-4 w-4" />
                      )}
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {network.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Agents:</span>
                    <span className="font-medium">{network.agent_count}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        network.status === 'Active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}
                    >
                      {network.status}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleManageAgents(network)}
                >
                  Manage Agents
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleRunNetwork(network.id)}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Run Network
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {selectedNetwork && (
        <Dialog open={true} onOpenChange={() => setSelectedNetwork(null)}>
          <DialogContent className="sm:max-w-[725px]">
            <DialogHeader>
              <DialogTitle>
                Manage Agents for {selectedNetwork.name}
              </DialogTitle>
              <DialogDescription>
                Add or remove agents from this network
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Current Agents</h3>
                <Dialog
                  open={agentDialogOpen}
                  onOpenChange={setAgentDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Agent to Network</DialogTitle>
                      <DialogDescription>
                        Select an agent and define its role in the network
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...agentForm}>
                      <form
                        onSubmit={agentForm.handleSubmit(onAgentSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={agentForm.control}
                          name="agentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agent</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an agent" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingAgentsList ? (
                                    <div className="flex items-center justify-center p-2">
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Loading agents...
                                    </div>
                                  ) : agents.length === 0 ? (
                                    <div className="p-2 text-center text-muted-foreground">
                                      No agents available
                                    </div>
                                  ) : (
                                    agents.map((agent) => (
                                      <SelectItem
                                        key={agent.id}
                                        value={agent.id}
                                      >
                                        {agent.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                The agent to add to this network
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={agentForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Lead Researcher"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                The role this agent will play in the network
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={isAddingAgent}>
                            {isAddingAgent ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              'Add Agent'
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {isLoadingAgents ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Loading agents...
                  </p>
                </div>
              ) : networkAgents.length > 0 ? (
                <div className="border rounded-md">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left font-medium">
                          Agent
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Role
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {networkAgents.map((agent) => (
                        <tr key={agent.id} className="border-b last:border-0">
                          <td className="px-4 py-2">
                            {agent.agents?.name || 'Unknown Agent'}
                          </td>
                          <td className="px-4 py-2">{agent.role}</td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAgent(agent.id)}
                              disabled={isRemovingAgent}
                            >
                              {isRemovingAgent ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash className="h-4 w-4" />
                              )}
                              <span className="sr-only">Remove</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No agents in this network yet. Add some agents to get started.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedNetwork(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

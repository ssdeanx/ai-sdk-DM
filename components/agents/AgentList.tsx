'use client';

import { useState } from 'react';
import { AgentCard } from '@/components/agents/AgentCard';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateAgentDialog } from '@/components/agents/CreateAgentDialog';
import { type Agent } from 'types/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useSupabaseFetch } from '@/hooks/use-supabase-fetch';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';

export function AgentsList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Use the standardized hook for fetching agents
  const {
    data: agents = [],
    isLoading,
    error,
    refetch: fetchAgents, // canonicalize to 'refetch'
  } = useSupabaseFetch<Agent>({
    endpoint: '/api/ai-sdk/agents', // updated to canonical endpoint
    resourceName: 'Agents',
    dataKey: 'agents',
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAgents().finally(() => setIsRefreshing(false));
  };

  const handleCreateAgent = async (newAgent: Omit<Agent, 'id'>) => {
    try {
      const response = await fetch('/api/ai-sdk/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAgent),
      });

      if (!response.ok) {
        throw new Error(`Error creating agent: ${response.statusText}`);
      }

      // Refresh the agents list after creating a new agent
      fetchAgents();

      toast({
        title: 'Success',
        description: 'Agent created successfully!',
      });

      setIsDialogOpen(false);
    } catch (err) {
      await upstashLogger.error(
        'AgentList',
        'Failed to create agent',
        err instanceof Error
          ? { message: err.message, stack: err.stack }
          : { error: String(err) }
      );
      toast({
        title: 'Error',
        description: 'Failed to create agent. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      const response = await fetch(`/api/ai-sdk/agents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Error deleting agent: ${response.statusText}`);
      }

      // Refresh the agents list after deleting an agent
      fetchAgents();

      toast({
        title: 'Success',
        description: 'Agent deleted successfully!',
      });
    } catch (err) {
      await upstashLogger.error(
        'AgentList',
        'Failed to delete agent',
        err instanceof Error
          ? { message: err.message, stack: err.stack }
          : { error: String(err) }
      );
      toast({
        title: 'Error',
        description: 'Failed to delete agent. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAgent = async (updatedAgent: Agent) => {
    try {
      const response = await fetch(`/api/ai-sdk/agents/${updatedAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedAgent),
      });

      if (!response.ok) {
        throw new Error(`Error updating agent: ${response.statusText}`);
      }

      // Refresh the agents list after updating an agent
      fetchAgents();

      toast({
        title: 'Success',
        description: 'Agent updated successfully!',
      });
    } catch (err) {
      await upstashLogger.error(
        'AgentList',
        'Failed to update agent',
        err instanceof Error
          ? { message: err.message, stack: err.stack }
          : { error: String(err) }
      );
      toast({
        title: 'Error',
        description: 'Failed to update agent. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={fetchAgents}
        >
          Try Again
        </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Available Agents</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New Agent
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 bg-gray-900 border-gray-800"
            >
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <div className="flex justify-between mt-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="text-xl font-medium text-gray-300 mb-2">
            No agents found
          </h3>
          <p className="text-gray-400 mb-6">
            Create your first agent to get started
          </p>
          <Button variant="default" onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onDelete={handleDeleteAgent}
              onUpdate={handleUpdateAgent}
            />
          ))}
        </div>
      )}

      <CreateAgentDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreateAgent={handleCreateAgent}
      />
    </div>
  );
}

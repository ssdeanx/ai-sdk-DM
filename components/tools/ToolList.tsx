'use client';

import { useState } from 'react';
import { ToolCard } from '@/components/tools/ToolCard';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/lib/shared/hooks/use-toast';
import { CreateToolDialog } from '@/components/tools/CreateToolDialog';
import type { Tool } from '@/lib/shared/types/tools';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useSupabaseFetch } from '@/lib/shared/hooks/use-supabase-fetch';

export function ToolsList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Use the standardized hook for fetching tools
  const {
    data: tools,
    isLoading,
    error,
    refresh: fetchTools,
  } = useSupabaseFetch<Tool>({
    endpoint: '/api/tools',
    resourceName: 'Tools',
    dataKey: 'tools',
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTools().finally(() => setIsRefreshing(false));
  };

  const handleCreateTool = async (newTool: Omit<Tool, 'id'>) => {
    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTool),
      });

      if (!response.ok) {
        throw new Error(`Error creating tool: ${response.statusText}`);
      }

      // Refresh the tools list after creating a new tool
      fetchTools();

      toast({
        title: 'Success',
        description: 'Tool created successfully!',
      });

      setIsDialogOpen(false);
    } catch (err) {
      console.error('Failed to create tool:', err);
      toast({
        title: 'Error',
        description: 'Failed to create tool. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTool = async (id: string) => {
    try {
      const response = await fetch(`/api/tools/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Error deleting tool: ${response.statusText}`);
      }

      // Refresh the tools list after deleting a tool
      fetchTools();

      toast({
        title: 'Success',
        description: 'Tool deleted successfully!',
      });
    } catch (err) {
      console.error('Failed to delete tool:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete tool. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTool = async (updatedTool: Tool) => {
    try {
      const response = await fetch(`/api/tools/${updatedTool.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTool),
      });

      if (!response.ok) {
        throw new Error(`Error updating tool: ${response.statusText}`);
      }

      // Refresh the tools list after updating a tool
      fetchTools();

      toast({
        title: 'Success',
        description: 'Tool updated successfully!',
      });
    } catch (err) {
      console.error('Failed to update tool:', err);
      toast({
        title: 'Error',
        description: 'Failed to update tool. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleExecuteTool = async (id: string, params: Record<string, any>) => {
    try {
      const response = await fetch(`/api/tools/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toolId: id, params }),
      });

      if (!response.ok) {
        throw new Error(`Error executing tool: ${response.statusText}`);
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: 'Tool executed successfully!',
      });

      return result;
    } catch (err) {
      console.error('Failed to execute tool:', err);
      toast({
        title: 'Error',
        description: 'Failed to execute tool. Please try again.',
        variant: 'destructive',
      });
      throw err;
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
          onClick={fetchTools}
        >
          Try Again
        </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Available Tools</h2>
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
            New Tool
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
      ) : tools.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="text-xl font-medium text-gray-300 mb-2">
            No tools found
          </h3>
          <p className="text-gray-400 mb-6">
            Create your first tool to get started
          </p>
          <Button variant="default" onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Tool
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onDelete={handleDeleteTool}
              onUpdate={handleUpdateTool}
              onExecute={handleExecuteTool}
            />
          ))}
        </div>
      )}

      <CreateToolDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreateTool={handleCreateTool}
      />
    </div>
  );
}

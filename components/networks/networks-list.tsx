'use client';

import { useEffect, useState } from 'react';
import { NetworkCard } from '@/components/networks/network-card';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/lib/shared/hooks/use-toast';
import { CreateNetworkDialog } from '@/components/networks/create-network-dialog';
import type { Network } from '@/types/networks';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useSupabaseFetch } from '@/lib/shared/hooks/use-supabase-fetch';

export function NetworksList() {
  const [filteredNetworks, setFilteredNetworks] = useState<Network[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { toast } = useToast();

  // Use the standardized hook for fetching networks
  const {
    data: networks,
    isLoading,
    error,
    refresh: fetchNetworks,
  } = useSupabaseFetch<Network>({
    endpoint: '/api/networks',
    resourceName: 'Networks',
    dataKey: 'networks',
  });

  useEffect(() => {
    if (debouncedSearchQuery.trim() === '') {
      setFilteredNetworks(networks);
    } else {
      const query = debouncedSearchQuery.toLowerCase();
      const filtered = networks.filter(
        (network) =>
          network.name.toLowerCase().includes(query) ||
          network.description.toLowerCase().includes(query)
      );
      setFilteredNetworks(filtered);
    }
  }, [debouncedSearchQuery, networks]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNetworks().finally(() => setIsRefreshing(false));
  };

  const handleCreateNetwork = async (newNetwork: Omit<Network, 'id'>) => {
    try {
      const response = await fetch('/api/networks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newNetwork),
      });

      if (!response.ok) {
        throw new Error(`Error creating network: ${response.statusText}`);
      }

      // Refresh the networks list after creating a new network
      fetchNetworks();

      toast({
        title: 'Success',
        description: 'Network created successfully!',
      });

      setIsDialogOpen(false);
    } catch (err) {
      console.error('Failed to create network:', err);
      toast({
        title: 'Error',
        description: 'Failed to create network. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNetwork = async (id: string) => {
    try {
      const response = await fetch(`/api/networks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Error deleting network: ${response.statusText}`);
      }

      // Refresh the networks list after deleting a network
      fetchNetworks();

      // Also update filtered networks
      setFilteredNetworks((prevNetworks) =>
        prevNetworks.filter((network) => network.id !== id)
      );

      toast({
        title: 'Success',
        description: 'Network deleted successfully!',
      });
    } catch (err) {
      console.error('Failed to delete network:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete network. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateNetwork = async (updatedNetwork: Network) => {
    try {
      const response = await fetch(`/api/networks/${updatedNetwork.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedNetwork),
      });

      if (!response.ok) {
        throw new Error(`Error updating network: ${response.statusText}`);
      }

      // Refresh the networks list after updating a network
      fetchNetworks();

      // Also update filtered networks if needed
      const updated = await response.json();
      setFilteredNetworks((prevNetworks) =>
        prevNetworks.map((network) =>
          network.id === updated.id ? updated : network
        )
      );

      toast({
        title: 'Success',
        description: 'Network updated successfully!',
      });
    } catch (err) {
      console.error('Failed to update network:', err);
      toast({
        title: 'Error',
        description: 'Failed to update network. Please try again.',
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
          onClick={fetchNetworks}
        >
          Try Again
        </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-64 md:w-80">
          <Input
            type="text"
            placeholder="Search networks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-900 border-gray-800"
          />
        </div>
        <div className="flex space-x-2 w-full sm:w-auto justify-end">
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
            New Network
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
      ) : filteredNetworks.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="text-xl font-medium text-gray-300 mb-2">
            {networks.length === 0
              ? 'No networks found'
              : 'No matching networks found'}
          </h3>
          <p className="text-gray-400 mb-6">
            {networks.length === 0
              ? 'Create your first network to get started'
              : 'Try adjusting your search criteria'}
          </p>
          {networks.length === 0 && (
            <Button variant="default" onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Network
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNetworks.map((network) => (
            <NetworkCard
              key={network.id}
              network={network}
              onDelete={handleDeleteNetwork}
              onUpdate={handleUpdateNetwork}
            />
          ))}
        </div>
      )}

      <CreateNetworkDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreateNetwork={handleCreateNetwork}
      />
    </div>
  );
}

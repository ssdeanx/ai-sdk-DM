'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: string;
  currentStepIndex: number;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStep {
  id: string;
  workflowId: string;
  agentId: string;
  input?: string;
  threadId: string;
  status: string;
  result?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    agentId: '',
    input: '',
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch workflows
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workflows');
      const data = await response.json();
      setWorkflows(data.workflows);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch workflows',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch a specific workflow
  const fetchWorkflow = async (id: string) => {
    try {
      const response = await fetch(`/api/workflows/${id}`);
      const data = await response.json();
      setSelectedWorkflow(data.workflow);
    } catch (error) {
      console.error(`Error fetching workflow ${id}:`, error);
      toast({
        title: 'Error',
        description: 'Failed to fetch workflow details',
        variant: 'destructive',
      });
    }
  };

  // Create a new workflow
  const createWorkflow = async () => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newWorkflow.name,
          description: newWorkflow.description,
          steps: [
            {
              agentId: newWorkflow.agentId,
              input: newWorkflow.input,
            },
          ],
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create workflow');
      }
      
      toast({
        title: 'Success',
        description: 'Workflow created successfully',
      });
      
      setIsCreateDialogOpen(false);
      setNewWorkflow({
        name: '',
        description: '',
        agentId: '',
        input: '',
      });
      
      fetchWorkflows();
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create workflow',
        variant: 'destructive',
      });
    }
  };

  // Execute a workflow
  const executeWorkflow = async (id: string) => {
    try {
      const response = await fetch(`/api/workflows/${id}/execute`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute workflow');
      }
      
      toast({
        title: 'Success',
        description: 'Workflow execution started',
      });
      
      fetchWorkflow(id);
    } catch (error) {
      console.error(`Error executing workflow ${id}:`, error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to execute workflow',
        variant: 'destructive',
      });
    }
  };

  // Delete a workflow
  const deleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete workflow');
      }
      
      toast({
        title: 'Success',
        description: 'Workflow deleted successfully',
      });
      
      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow(null);
      }
      
      fetchWorkflows();
    } catch (error) {
      console.error(`Error deleting workflow ${id}:`, error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete workflow',
        variant: 'destructive',
      });
    }
  };

  // Load workflows on component mount
  useEffect(() => {
    fetchWorkflows();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Workflows</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>Create Workflow</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Workflow List</CardTitle>
              <CardDescription>Select a workflow to view details</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading workflows...</p>
              ) : workflows.length === 0 ? (
                <p>No workflows found</p>
              ) : (
                <ul className="space-y-2">
                  {workflows.map((workflow) => (
                    <li key={workflow.id} className="border rounded p-3 hover:bg-gray-50 cursor-pointer" onClick={() => fetchWorkflow(workflow.id)}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{workflow.name}</span>
                        <Badge variant={
                          workflow.status === 'completed' ? 'default' :
                          workflow.status === 'running' ? 'secondary' :
                          workflow.status === 'failed' ? 'destructive' :
                          'outline'
                        }>
                          {workflow.status}
                        </Badge>
                      </div>
                      {workflow.description && (
                        <p className="text-sm text-gray-500 mt-1">{workflow.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={fetchWorkflows}>Refresh</Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          {selectedWorkflow ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{selectedWorkflow.name}</CardTitle>
                    <CardDescription>{selectedWorkflow.description}</CardDescription>
                  </div>
                  <Badge variant={
                    selectedWorkflow.status === 'completed' ? 'default' :
                    selectedWorkflow.status === 'running' ? 'secondary' :
                    selectedWorkflow.status === 'failed' ? 'destructive' :
                    'outline'
                  }>
                    {selectedWorkflow.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="steps">
                  <TabsList>
                    <TabsTrigger value="steps">Steps</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>
                  <TabsContent value="steps">
                    <div className="space-y-4">
                      {selectedWorkflow.steps.map((step, index) => (
                        <Card key={step.id}>
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">Step {index + 1}</CardTitle>
                              <Badge variant={
                                step.status === 'completed' ? 'default' :
                                step.status === 'running' ? 'secondary' :
                                step.status === 'failed' ? 'destructive' :
                                'outline'
                              }>
                                {step.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div>
                                <Label>Agent ID</Label>
                                <p className="text-sm">{step.agentId}</p>
                              </div>
                              {step.input && (
                                <div>
                                  <Label>Input</Label>
                                  <p className="text-sm whitespace-pre-wrap">{step.input}</p>
                                </div>
                              )}
                              {step.result && (
                                <div>
                                  <Label>Result</Label>
                                  <p className="text-sm whitespace-pre-wrap">{step.result}</p>
                                </div>
                              )}
                              {step.error && (
                                <div>
                                  <Label>Error</Label>
                                  <p className="text-sm text-red-500">{step.error}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="details">
                    <div className="space-y-4">
                      <div>
                        <Label>ID</Label>
                        <p className="text-sm">{selectedWorkflow.id}</p>
                      </div>
                      <div>
                        <Label>Created At</Label>
                        <p className="text-sm">{new Date(selectedWorkflow.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <Label>Updated At</Label>
                        <p className="text-sm">{new Date(selectedWorkflow.updatedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <Label>Current Step Index</Label>
                        <p className="text-sm">{selectedWorkflow.currentStepIndex}</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div>
                  <Button 
                    variant="default" 
                    onClick={() => executeWorkflow(selectedWorkflow.id)}
                    disabled={selectedWorkflow.status === 'running' || selectedWorkflow.status === 'completed'}
                  >
                    Execute
                  </Button>
                </div>
                <div>
                  <Button 
                    variant="destructive" 
                    onClick={() => deleteWorkflow(selectedWorkflow.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select a Workflow</CardTitle>
                <CardDescription>Click on a workflow from the list to view its details</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
      
      {/* Create Workflow Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>
              Create a new workflow with an initial step
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={newWorkflow.name} 
                onChange={(e) => setNewWorkflow({...newWorkflow, name: e.target.value})}
                placeholder="Workflow name"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                value={newWorkflow.description} 
                onChange={(e) => setNewWorkflow({...newWorkflow, description: e.target.value})}
                placeholder="Workflow description"
              />
            </div>
            
            <div>
              <Label htmlFor="agentId">Agent ID</Label>
              <Input 
                id="agentId" 
                value={newWorkflow.agentId} 
                onChange={(e) => setNewWorkflow({...newWorkflow, agentId: e.target.value})}
                placeholder="Agent ID for the first step"
              />
            </div>
            
            <div>
              <Label htmlFor="input">Input</Label>
              <Textarea 
                id="input" 
                value={newWorkflow.input} 
                onChange={(e) => setNewWorkflow({...newWorkflow, input: e.target.value})}
                placeholder="Input for the first step"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={createWorkflow}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

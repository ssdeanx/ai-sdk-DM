"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { Network, Plus, Play, Settings, Trash } from "lucide-react"
import { useForm } from "react-hook-form"
import * as z from "zod"

// Define the form schema
const networkFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
})

// Define the agent assignment form schema
const agentAssignmentSchema = z.object({
  agentId: z.string({
    required_error: "Please select an agent.",
  }),
  role: z.string().min(2, {
    message: "Role must be at least 2 characters.",
  }),
})

// Mock data for networks
const mockNetworks = [
  {
    id: "1",
    name: "Research Team",
    description: "A network of agents that collaborate on research tasks",
    agentCount: 3,
    status: "Active",
  },
  {
    id: "2",
    name: "Content Creation Pipeline",
    description: "A network that generates, edits, and publishes content",
    agentCount: 4,
    status: "Active",
  },
]

// Mock data for agents
const mockAgents = [
  { id: "1", name: "Research Assistant" },
  { id: "2", name: "Data Analyzer" },
  { id: "3", name: "Content Generator" },
  { id: "4", name: "Editor" },
  { id: "5", name: "Fact Checker" },
]

export default function NetworksPage() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [agentDialogOpen, setAgentDialogOpen] = useState(false)
  const [networks, setNetworks] = useState(mockNetworks)
  const [editingNetwork, setEditingNetwork] = useState<any>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null)
  const [networkAgents, setNetworkAgents] = useState<any[]>([])

  const form = useForm<z.infer<typeof networkFormSchema>>({
    resolver: zodResolver(networkFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const agentForm = useForm<z.infer<typeof agentAssignmentSchema>>({
    resolver: zodResolver(agentAssignmentSchema),
    defaultValues: {
      agentId: "",
      role: "",
    },
  })

  function onSubmit(values: z.infer<typeof networkFormSchema>) {
    // Here you would normally send this to your API
    console.log(values)

    if (editingNetwork) {
      // Update existing network
      setNetworks(networks.map((network) => (network.id === editingNetwork.id ? { ...network, ...values } : network)))
      toast({
        title: "Network updated",
        description: `${values.name} has been updated successfully.`,
      })
    } else {
      // Add new network
      setNetworks([
        ...networks,
        {
          id: (networks.length + 1).toString(),
          name: values.name,
          description: values.description,
          agentCount: 0,
          status: "Active",
        },
      ])
      toast({
        title: "Network created",
        description: `${values.name} has been created successfully.`,
      })
    }

    setOpen(false)
    form.reset()
    setEditingNetwork(null)
  }

  function onAgentSubmit(values: z.infer<typeof agentAssignmentSchema>) {
    // Here you would normally send this to your API
    console.log(values)

    // Find the agent
    const agent = mockAgents.find((a) => a.id === values.agentId)

    if (agent && selectedNetwork) {
      // Add agent to network
      const newAgent = {
        id: crypto.randomUUID(),
        agentId: values.agentId,
        name: agent.name,
        role: values.role,
        networkId: selectedNetwork.id,
      }

      setNetworkAgents([...networkAgents, newAgent])

      // Update agent count in network
      setNetworks(
        networks.map((network) =>
          network.id === selectedNetwork.id ? { ...network, agentCount: network.agentCount + 1 } : network,
        ),
      )

      toast({
        title: "Agent added to network",
        description: `${agent.name} has been added to ${selectedNetwork.name} as ${values.role}.`,
      })
    }

    setAgentDialogOpen(false)
    agentForm.reset()
  }

  function handleEdit(network: any) {
    setEditingNetwork(network)
    form.reset({
      name: network.name,
      description: network.description,
    })
    setOpen(true)
  }

  function handleDelete(id: string) {
    setNetworks(networks.filter((network) => network.id !== id))
    toast({
      title: "Network deleted",
      description: "The network has been deleted successfully.",
    })
  }

  function handleManageAgents(network: any) {
    setSelectedNetwork(network)
    // In a real app, you would fetch the agents for this network from the API
    setNetworkAgents([
      {
        id: "1",
        agentId: "1",
        name: "Research Assistant",
        role: "Lead Researcher",
        networkId: network.id,
      },
      {
        id: "2",
        agentId: "2",
        name: "Data Analyzer",
        role: "Data Processor",
        networkId: network.id,
      },
    ])
  }

  function handleRemoveAgent(agentId: string) {
    setNetworkAgents(networkAgents.filter((agent) => agent.id !== agentId))

    // Update agent count in network
    if (selectedNetwork) {
      setNetworks(
        networks.map((network) =>
          network.id === selectedNetwork.id ? { ...network, agentCount: network.agentCount - 1 } : network,
        ),
      )
    }

    toast({
      title: "Agent removed",
      description: "The agent has been removed from the network.",
    })
  }

  function handleRunNetwork(id: string) {
    const network = networks.find((n) => n.id === id)
    toast({
      title: "Network started",
      description: `${network?.name} is now running.`,
    })
    // Here you would normally trigger the network run via API
    console.log("Running network:", id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Networks</h1>
          <p className="text-muted-foreground">Create and manage multi-agent networks</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingNetwork(null)
                form.reset({
                  name: "",
                  description: "",
                })
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Network
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>{editingNetwork ? "Edit Network" : "Create New Network"}</DialogTitle>
              <DialogDescription>
                {editingNetwork ? "Update the network configuration" : "Create a new network of collaborating agents"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Research Team" {...field} />
                      </FormControl>
                      <FormDescription>A descriptive name for this network</FormDescription>
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
                      <FormDescription>A detailed description of what this network does</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">{editingNetwork ? "Update Network" : "Create Network"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {networks.map((network) => (
          <Card key={network.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  {network.name}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(network)}>
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(network.id)}>
                    <Trash className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
              <CardDescription className="mt-2">{network.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Agents:</span>
                  <span className="font-medium">{network.agentCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      network.status === "Active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                    }`}
                  >
                    {network.status}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button className="flex-1" onClick={() => handleManageAgents(network)}>
                Manage Agents
              </Button>
              <Button className="flex-1" onClick={() => handleRunNetwork(network.id)}>
                <Play className="mr-2 h-4 w-4" />
                Run Network
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {selectedNetwork && (
        <Dialog open={true} onOpenChange={() => setSelectedNetwork(null)}>
          <DialogContent className="sm:max-w-[725px]">
            <DialogHeader>
              <DialogTitle>Manage Agents for {selectedNetwork.name}</DialogTitle>
              <DialogDescription>Add or remove agents from this network</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Current Agents</h3>
                <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Agent to Network</DialogTitle>
                      <DialogDescription>Select an agent and define its role in the network</DialogDescription>
                    </DialogHeader>
                    <Form {...agentForm}>
                      <form onSubmit={agentForm.handleSubmit(onAgentSubmit)} className="space-y-4">
                        <FormField
                          control={agentForm.control}
                          name="agentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agent</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an agent" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {mockAgents.map((agent) => (
                                    <SelectItem key={agent.id} value={agent.id}>
                                      {agent.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>The agent to add to this network</FormDescription>
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
                                <Input placeholder="Lead Researcher" {...field} />
                              </FormControl>
                              <FormDescription>The role this agent will play in the network</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit">Add Agent</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {networkAgents.length > 0 ? (
                <div className="border rounded-md">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left font-medium">Agent</th>
                        <th className="px-4 py-2 text-left font-medium">Role</th>
                        <th className="px-4 py-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {networkAgents.map((agent) => (
                        <tr key={agent.id} className="border-b last:border-0">
                          <td className="px-4 py-2">{agent.name}</td>
                          <td className="px-4 py-2">{agent.role}</td>
                          <td className="px-4 py-2 text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveAgent(agent.id)}>
                              <Trash className="h-4 w-4" />
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
              <Button variant="outline" onClick={() => setSelectedNetwork(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

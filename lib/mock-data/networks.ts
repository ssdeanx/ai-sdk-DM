export interface Network {
  id: string
  name: string
  description: string
  agent_count: number
  status: string
  created_at: string
  updated_at: string
}

export const mockNetworks: Network[] = [
  {
    id: "1",
    name: "Research Team",
    description: "A network of agents that collaborate on research tasks",
    agent_count: 3,
    status: "Active",
    created_at: "2023-12-01T00:00:00.000Z",
    updated_at: "2023-12-01T00:00:00.000Z",
  },
  {
    id: "2",
    name: "Content Creation Pipeline",
    description: "A network that generates, edits, and publishes content",
    agent_count: 4,
    status: "Active",
    created_at: "2023-12-02T00:00:00.000Z",
    updated_at: "2023-12-02T00:00:00.000Z",
  },
]

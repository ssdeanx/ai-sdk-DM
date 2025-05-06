"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Github, Database, Rocket, Search, Plus, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IntegrationCard } from "@/components/integrations/integration-card"
import { ConnectedIntegration } from "@/components/integrations/connected-integration"

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  
  // Mock data for available integrations
  const availableIntegrations = [
    {
      id: "github",
      name: "GitHub",
      description: "Connect your GitHub repositories to deploy, manage code, and trigger workflows.",
      icon: <Github className="h-6 w-6" />,
      category: "code",
      popular: true,
    },
    {
      id: "supabase",
      name: "Supabase",
      description: "Connect your Supabase projects to access databases, authentication, and storage.",
      icon: <Database className="h-6 w-6" />,
      category: "database",
      popular: true,
    },
    {
      id: "vercel",
      name: "Vercel",
      description: "Deploy and host your applications with Vercel's global edge network.",
      icon: <Rocket className="h-6 w-6" />,
      category: "hosting",
      popular: true,
    },
  ]
  
  // Mock data for connected integrations
  const connectedIntegrations = [
    {
      id: "github-1",
      name: "GitHub",
      accountName: "acme-org",
      connectedAt: "2023-05-15T10:30:00Z",
      status: "active",
      icon: <Github className="h-6 w-6" />,
    }
  ]
  
  // Filter integrations based on search query and active tab
  const filteredIntegrations = availableIntegrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (activeTab === "all") return matchesSearch
    if (activeTab === "popular") return matchesSearch && integration.popular
    return matchesSearch && integration.category === activeTab
  })

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your AI SDK Framework with external services and tools
        </p>
      </div>
      
      {/* Connected integrations section */}
      {connectedIntegrations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Connected Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedIntegrations.map(integration => (
              <ConnectedIntegration
                key={integration.id}
                name={integration.name}
                accountName={integration.accountName}
                connectedAt={integration.connectedAt}
                status={integration.status}
                icon={integration.icon}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Available integrations section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:w-64 md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search integrations..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-4 sm:grid-cols-4 w-full sm:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIntegrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              name={integration.name}
              description={integration.description}
              icon={integration.icon}
              href={`/integrations/${integration.id}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

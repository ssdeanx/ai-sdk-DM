"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Github, ArrowLeft, Check, X, AlertCircle, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { IntegrationSteps } from "@/components/integrations/integration-steps"

export default function GitHubIntegrationPage() {
  const [activeTab, setActiveTab] = useState("setup")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  
  const handleConnect = () => {
    setIsConnecting(true)
    // Simulate connection process
    setTimeout(() => {
      setIsConnecting(false)
      setIsConnected(true)
    }, 2000)
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/integrations">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">GitHub Integration</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Github className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>GitHub</CardTitle>
                <CardDescription>
                  Connect your GitHub repositories to deploy, manage code, and trigger workflows.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="setup">Setup</TabsTrigger>
                  <TabsTrigger value="repositories">Repositories</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <div className="mt-6">
                  <TabsContent value="setup" className="space-y-4">
                    {isConnected ? (
                      <Alert className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                        <Check className="h-4 w-4" />
                        <AlertTitle>Connected to GitHub</AlertTitle>
                        <AlertDescription>
                          Your GitHub account has been successfully connected. You can now select repositories to sync.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="github-token">GitHub Personal Access Token</Label>
                          <Input id="github-token" type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
                          <p className="text-xs text-muted-foreground">
                            Create a token with <code>repo</code>, <code>read:user</code>, and <code>read:org</code> scopes.
                          </p>
                        </div>
                        
                        <Button 
                          onClick={handleConnect} 
                          disabled={isConnecting}
                          className="gap-2"
                        >
                          {isConnecting ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                              />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Github className="h-4 w-4" />
                              Connect to GitHub
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="repositories" className="space-y-4">
                    {!isConnected ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Not Connected</AlertTitle>
                        <AlertDescription>
                          Please connect your GitHub account first to view repositories.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Select repositories to sync with your AI SDK Framework.
                        </p>
                        
                        <div className="space-y-2">
                          {["acme/project-a", "acme/project-b", "acme/project-c"].map((repo) => (
                            <Card key={repo} className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-2">
                                <Github className="h-4 w-4" />
                                <span>{repo}</span>
                              </div>
                              <Button variant="outline" size="sm">
                                Sync
                              </Button>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="settings" className="space-y-4">
                    {!isConnected ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Not Connected</AlertTitle>
                        <AlertDescription>
                          Please connect your GitHub account first to configure settings.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Configure your GitHub integration settings.
                        </p>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="webhook-url">Webhook URL</Label>
                            <Input id="webhook-url" value="https://ai-sdk-framework.example.com/api/webhooks/github" readOnly />
                          </div>
                          
                          <Button variant="destructive" size="sm" className="gap-2">
                            <X className="h-4 w-4" />
                            Disconnect GitHub
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integration Steps</CardTitle>
              <CardDescription>
                Follow these steps to set up your GitHub integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IntegrationSteps
                steps={[
                  {
                    title: "Create a GitHub token",
                    description: "Generate a personal access token with the required scopes",
                    status: "complete"
                  },
                  {
                    title: "Connect your account",
                    description: "Enter your token to authenticate with GitHub",
                    status: isConnected ? "complete" : "current"
                  },
                  {
                    title: "Select repositories",
                    description: "Choose which repositories to sync",
                    status: isConnected ? "current" : "upcoming"
                  },
                  {
                    title: "Configure webhooks",
                    description: "Set up webhooks for real-time updates",
                    status: "upcoming"
                  }
                ]}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link 
                href="#" 
                className="flex items-center justify-between p-2 text-sm rounded-md hover:bg-accent"
              >
                <span>Getting Started Guide</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link 
                href="#" 
                className="flex items-center justify-between p-2 text-sm rounded-md hover:bg-accent"
              >
                <span>API Reference</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link 
                href="#" 
                className="flex items-center justify-between p-2 text-sm rounded-md hover:bg-accent"
              >
                <span>Troubleshooting</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

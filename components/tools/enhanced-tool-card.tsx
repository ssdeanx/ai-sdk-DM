"use client"

import { useState } from "react"
import { MoreHorizontal, Trash2, Edit, Play, Code, Copy, Check } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToolExecutor } from "./tool-executor"

interface ToolCardProps {
  tool: {
    id: string
    name: string
    description: string
    parameters_schema: string
    category?: string
    implementation?: string
    is_enabled?: boolean
    created_at: string
    updated_at: string
  }
  onEdit: (tool: any) => void
  onDelete: (id: string) => void
  onDuplicate?: (tool: any) => void
}

export function EnhancedToolCard({ tool, onEdit, onDelete, onDuplicate }: ToolCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showExecutor, setShowExecutor] = useState(false)
  const [showImplementation, setShowImplementation] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await onDelete(tool.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(tool)
    }
  }

  const copyImplementation = () => {
    if (tool.implementation) {
      navigator.clipboard.writeText(tool.implementation)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Parse the schema to display parameter info
  let parametersCount = 0
  let requiredParams: string[] = []
  try {
    const schema = JSON.parse(tool.parameters_schema)
    parametersCount = schema.properties ? Object.keys(schema.properties).length : 0
    requiredParams = schema.required || []
  } catch (e) {
    console.error("Error parsing schema:", e)
  }

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case "web":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "code":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      case "data":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "ai":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      case "custom":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className={`overflow-hidden h-full flex flex-col ${!tool.is_enabled ? "opacity-70" : ""}`}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center">
                  <span className="mr-2">{tool.name}</span>
                  {!tool.is_enabled && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-500 ml-2">
                            Disabled
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>This tool is currently disabled</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(tool)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowExecutor(true)}>
                    <Play className="mr-2 h-4 w-4" />
                    Test
                  </DropdownMenuItem>
                  {tool.implementation && (
                    <DropdownMenuItem onClick={() => setShowImplementation(true)}>
                      <Code className="mr-2 h-4 w-4" />
                      View Implementation
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pb-2 flex-1">
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <span className="text-muted-foreground">Parameters:</span>
                <span className="ml-1 font-medium">{parametersCount}</span>
                {requiredParams.length > 0 && (
                  <span className="ml-1 text-muted-foreground">({requiredParams.length} required)</span>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 mt-auto">
            <div className="flex w-full justify-between items-center">
              <Badge variant="outline" className={getCategoryColor(tool.category)}>
                {tool.category || "Unknown"}
              </Badge>
              <Button size="sm" onClick={() => setShowExecutor(true)}>
                <Play className="h-4 w-4 mr-2" />
                Test
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Tool Executor Dialog */}
      <Dialog open={showExecutor} onOpenChange={setShowExecutor}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Test Tool: {tool.name}</DialogTitle>
          </DialogHeader>
          <ToolExecutor tool={tool} onExecutionComplete={() => {}} />
        </DialogContent>
      </Dialog>

      {/* Implementation Viewer Dialog */}
      <Dialog open={showImplementation} onOpenChange={setShowImplementation}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Implementation: {tool.name}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyImplementation}>
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(tool)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="code">
            <TabsList>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="docs">Documentation</TabsTrigger>
            </TabsList>
            <TabsContent value="code" className="p-0">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[400px] text-sm font-mono">
                  {tool.implementation || "// No implementation available"}
                </pre>
              </div>
            </TabsContent>
            <TabsContent value="docs">
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Description</h3>
                  <p className="text-muted-foreground">{tool.description}</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium">Parameters</h3>
                  <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[200px] text-sm font-mono">
                    {tool.parameters_schema}
                  </pre>
                </div>
                <div>
                  <h3 className="text-lg font-medium">Usage</h3>
                  <p className="text-muted-foreground">This tool can be used by agents or directly through the API.</p>
                  <div className="mt-2">
                    <h4 className="font-medium">API Endpoint</h4>
                    <code className="bg-muted p-2 rounded-md text-sm block">POST /api/tools/execute</code>
                    <h4 className="font-medium mt-2">Request Body</h4>
                    <pre className="bg-muted p-2 rounded-md text-sm overflow-auto">
                      {JSON.stringify(
                        {
                          toolId: tool.id,
                          parameters: "/* Your parameters here */",
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

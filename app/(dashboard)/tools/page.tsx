"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Plus, Wrench, Filter, Grid3X3, List, FileJson, Upload, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { useSupabaseFetch } from "@/hooks/use-supabase-fetch"
import { useSupabaseCrud } from "@/hooks/use-supabase-crud"
import type { ColumnDef } from "@tanstack/react-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

interface Tool {
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

// Define the form schema
const toolFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  parametersSchema: z.string().refine(
    (value) => {
      try {
        JSON.parse(value)
        return true
      } catch {
        return false
      }
    },
    {
      message: "Parameters schema must be valid JSON",
    },
  ),
  category: z.string().default("custom"),
  implementation: z.string().optional(),
  isEnabled: z.boolean().default(true),
})

// Tool categories
const toolCategories = [
  { value: "web", label: "Web Tools" },
  { value: "code", label: "Code Tools" },
  { value: "data", label: "Data Tools" },
  { value: "ai", label: "AI Tools" },
  { value: "custom", label: "Custom Tools" },
]

export default function ToolsPage() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isImporting, setIsImporting] = useState(false)

  const form = useForm<z.infer<typeof toolFormSchema>>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: {
      name: "",
      description: "",
      parametersSchema: JSON.stringify(
        {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query",
            },
          },
          required: ["query"],
        },
        null,
        2
      ),
      category: "custom",
      implementation: "",
      isEnabled: true,
    },
  })

  const {
    data: allTools,
    isLoading,
    refresh,
    isMockData,
  } = useSupabaseFetch<Tool>({
    endpoint: "/api/tools",
    resourceName: "Tools",
    dataKey: "tools",
  })

  // Filter tools based on category and search query
  const tools = allTools.filter(tool => {
    const matchesCategory = !categoryFilter || tool.category === categoryFilter
    const matchesSearch = !searchQuery || 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const { create, update, remove } = useSupabaseCrud<Tool>({
    resourceName: "Tool",
    endpoint: "/api/tools",
    onSuccess: () => {
      setOpen(false)
      form.reset()
      setEditingTool(null)
      refresh()
    },
  })

  async function onSubmit(values: z.infer<typeof toolFormSchema>) {
    if (editingTool) {
      await update(editingTool.id, {
        name: values.name,
        description: values.description,
        parameters_schema: values.parametersSchema,
        category: values.category,
        implementation: values.implementation,
        is_enabled: values.isEnabled,
      })
      toast({
        title: "Tool updated",
        description: `${values.name} has been updated successfully.`,
      })
    } else {
      await create({
        name: values.name,
        description: values.description,
        parameters_schema: values.parametersSchema,
        category: values.category,
        implementation: values.implementation,
        is_enabled: values.isEnabled,
      })
      toast({
        title: "Tool created",
        description: `${values.name} has been created successfully.`,
      })
    }
  }

  function handleEdit(tool: Tool) {
    setEditingTool(tool)
    form.reset({
      name: tool.name,
      description: tool.description,
      parametersSchema: JSON.stringify(JSON.parse(tool.parameters_schema), null, 2),
      category: tool.category || "custom",
      implementation: tool.implementation || "",
      isEnabled: tool.is_enabled !== false, // Default to true if undefined
    })
    setOpen(true)
  }

  async function handleDelete(id: string) {
    try {
      await remove(id)
      toast({
        title: "Tool deleted",
        description: "The tool has been deleted successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete tool",
        variant: "destructive",
      })
    }
  }

  async function handleDuplicate(tool: Tool) {
    try {
      const newName = `${tool.name} (Copy)`
      await create({
        name: newName,
        description: tool.description,
        parameters_schema: tool.parameters_schema,
        category: tool.category,
        implementation: tool.implementation,
        is_enabled: tool.is_enabled,
      })
      toast({
        title: "Tool duplicated",
        description: `${newName} has been created successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to duplicate tool",
        variant: "destructive",
      })
    }
  }

  function handleTest(tool: Tool) {
    setSelectedTool(tool)
  }

  function handleImport() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsImporting(true)
      try {
        const content = await file.text()
        const tools = JSON.parse(content)
        
        if (!Array.isArray(tools)) {
          throw new Error("Invalid format: Expected an array of tools")
        }
        
        let successCount = 0
        let errorCount = 0
        
        for (const tool of tools) {
          try {
            // Validate required fields
            if (!tool.name || !tool.description || !tool.parameters_schema) {
              errorCount++
              continue
            }
            
            // Check if tool already exists
            const existingTool = allTools.find(t => t.name === tool.name)
            if (existingTool) {
              // Update existing tool
              await update(existingTool.id, {
                description: tool.description,
                parameters_schema: typeof tool.parameters_schema === 'string' 
                  ? tool.parameters_schema 
                  : JSON.stringify(tool.parameters_schema),
                category: tool.category || "custom",
                implementation: tool.implementation || "",
                is_enabled: tool.is_enabled !== false,
              })
            } else {
              // Create new tool
              await create({
                name: tool.name,
                description: tool.description,
                parameters_schema: typeof tool.parameters_schema === 'string' 
                  ? tool.parameters_schema 
                  : JSON.stringify(tool.parameters_schema),
                category: tool.category || "custom",
                implementation: tool.implementation || "",
                is_enabled: tool.is_enabled !== false,
              })
            }
            successCount++
          } catch (error) {
            console.error("Error importing tool:", error)
            errorCount++
          }
        }
        
        toast({
          title: "Import complete",
          description: `Successfully imported ${successCount} tools. ${errorCount > 0 ? `Failed to import ${errorCount} tools.` : ''}`,
          variant: errorCount > 0 ? "default" : "default",
        })
        
        refresh()
      } catch (error) {
        toast({
          title: "Import failed",
          description: error instanceof Error ? error.message : "Failed to import tools",
          variant: "destructive",
        })
      } finally {
        setIsImporting(false)
      }
    }
    input.click()
  }

  function handleExport() {
    const toolsToExport = categoryFilter 
      ? tools 
      : allTools
    
    const exportData = toolsToExport.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters_schema: JSON.parse(tool.parameters_schema),
      category: tool.category,
      implementation: tool.implementation,
      is_enabled: tool.is_enabled,
    }))
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tools-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "Export complete",
      description: `Exported ${exportData.length} tools.`,
    })
  }

  const columns: ColumnDef<Tool>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate" title={row.original.description}>
          {row.original.description}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className={getCategoryColor(row.original.category)}>
          {row.original.category || "Unknown"}
        </Badge>
      ),
    },
    {
      accessorKey: "is_enabled",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_enabled !== false ? "default" : "outline"}>
          {row.original.is_enabled !== false ? "Enabled" : "Disabled"}
        </Badge>
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Last Updated",
      cell: ({ row }) => <div>{new Date(row.original.updated_at).toLocaleDateString()}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Filter className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                <Plus className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTest(row.original)}>
                <Wrench className="mr-2 h-4 w-4" />
                Test
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicate(row.original)}>
                <Plus className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(row.original.id)} className="text-destructive">
                <Plus className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

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
    <ErrorBoundary>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
              <p className="text-muted-foreground">Manage and create tools for your AI agents</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search tools..."
                className="w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              <Select value={categoryFilter || "all"} onValueChange={(value) => setCategoryFilter(value === "all" ? null : value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {toolCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grid view</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "table" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("table")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Table view</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <FileJson className="h-4 w-4 mr-2" />
                    Import/Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Tools Management</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleImport} disabled={isImporting}>
                    <Upload className="h-4 w-4 mr-2" />
                    {isImporting ? "Importing..." : "Import Tools"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Tools
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingTool(null)
                      form.reset({
                        name: "",
                        description: "",
                        parametersSchema: JSON.stringify(
                          {
                            type: "object",
                            properties: {
                              query: {
                                type: "string",
                                description: "The search query",
                              },
                            },
                            required: ["query"],
                          },
                          null,
                          2
                        ),
                        category: "custom",
                        implementation: "",
                        isEnabled: true,
                      })
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Tool
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px]">
                  <DialogHeader>
                    <DialogTitle>{editingTool ? "Edit Tool" : "Create Tool"}</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="basic">Basic Info</TabsTrigger>
                          <TabsTrigger value="schema">Schema</TabsTrigger>
                          <TabsTrigger value="implementation">Implementation</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Web Search" {...field} />
                                  </FormControl>
                                  <FormDescription>A descriptive name for this tool</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {toolCategories.map((category) => (
                                        <SelectItem key={category.value} value={category.value}>
                                          {category.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>The category this tool belongs to</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Search the web for real-time information"
                                    className="min-h-[80px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Describe what this tool does and how it should be used
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="isEnabled"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">
                                    Enabled
                                  </FormLabel>
                                  <FormDescription>
                                    When disabled, this tool will not be available for use
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TabsContent>

                        <TabsContent value="schema" className="space-y-4 pt-4">
                          <FormField
                            control={form.control}
                            name="parametersSchema"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Parameters Schema (JSON)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder={`{\n  "type": "object",\n  "properties": {\n    "query": {\n      "type": "string",\n      "description": "The search query"\n    }\n  },\n  "required": ["query"]\n}`}
                                    className="min-h-[300px] font-mono text-sm"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Define the parameters this tool accepts using JSON
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>

                        <TabsContent value="implementation" className="space-y-4 pt-4">
                          <FormField
                            control={form.control}
                            name="implementation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Implementation Code</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="// Code to execute the tool"
                                    className="min-h-[300px] font-mono text-sm"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Write the code that will be executed when this tool is called.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                      </Tabs>

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">{editingTool ? "Update Tool" : "Create Tool"}</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
</ErrorBoundary>
);
}

export default ToolsPage;

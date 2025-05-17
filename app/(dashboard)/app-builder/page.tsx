"use client"

import { useState, useEffect } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Code, Loader2, Play, Plus, Save, Trash } from "lucide-react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import ChatBar from '@/components/appBuilder/chatBar';
import { CanvasDisplay } from '@/components/appBuilder/canvasDisplay';
import { AppBuilderContainer } from '@/components/appBuilder/appBuilderContainer';

// Define the form schema
const appFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  type: z.enum(["tool", "workflow", "agent"]),
})

interface App {
  id: string
  name: string
  description: string
  type: string
  code: string
  parameters_schema?: string
  created_at: string
  updated_at: string
}

export default function AppBuilderPage() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<App | null>(null)
  const [code, setCode] = useState("")
  const [testInput, setTestInput] = useState("")
  const [testOutput, setTestOutput] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState("code")
  const [parametersSchema, setParametersSchema] = useState(`{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The search query"
    }
  },
  "required": ["query"]
}`)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Add state for canvas/terminal/code output
  const [displayMode, setDisplayMode] = useState<'terminal' | 'canvas' | 'code'>('terminal');
  const [displayContent, setDisplayContent] = useState('');

  // App CRUD state
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<boolean>(false);

  // Example: handle chat message to update display (now used for output)
  function handleChatMessage(message: string, _fullResponse?: { role: string; content: string }) {
    setDisplayContent(message);
    setDisplayMode('terminal'); // You can switch mode based on content if needed
  }

  // Fetch apps from the new API
  async function fetchApps() {
    setIsLoading(true);
    setConnectionError(false);
    try {
      const res = await fetch('/api/ai-sdk/apps');
      if (!res.ok) throw new Error('Failed to fetch apps');
      const data = await res.json();
      setApps(data.apps || []);
    } catch {
      setConnectionError(true);
      setApps([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchApps();
  }, []);

  const form = useForm<z.infer<typeof appFormSchema>>({
    resolver: zodResolver(appFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "tool",
    },
  })

  useEffect(() => {
    if (editingApp) {
      setCode(editingApp.code)

      // Set parameters schema based on type and existing schema
      if (editingApp.parameters_schema) {
        setParametersSchema(editingApp.parameters_schema)
      } else if (editingApp.type === "tool") {
        setParametersSchema(`{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The search query"
    }
  },
  "required": ["query"]
}`)
      } else {
        setParametersSchema(`{}`)
      }
    } else {
      setCode(`// Write your code here
async function execute(params) {
  // Implementation goes here
  return {
    result: "Success"
  };
}`)

      setParametersSchema(`{
  "type": "object",
  "properties": {},
  "required": []
}`)
    }
  }, [editingApp])

  async function onSubmit(values: z.infer<typeof appFormSchema>) {
    setIsSubmitting(true)

    try {
      const appData = {
        name: values.name,
        description: values.description,
        type: values.type,
        code,
        parametersSchema,
      }

      if (editingApp) {
        // Update existing app
        const response = await fetch(`/api/ai-sdk/apps/${editingApp.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(appData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to update app")
        }

        toast({
          title: "App updated",
          description: `${values.name} has been updated successfully.`,
        })
      } else {
        // Create new app
        const response = await fetch("/api/ai-sdk/apps", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(appData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to create app")
        }

        toast({
          title: "App created",
          description: `${values.name} has been created successfully.`,
        })
      }

      // Refresh the apps list
      fetchApps()

      // Close the dialog and reset form
      setOpen(false)
      form.reset()
      setEditingApp(null)
      setCode("")
    } catch (error) {
      // Optionally log error to a remote logger here
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while saving the app",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleEdit(app: App) {
    setEditingApp(app)
    form.reset({
      name: app.name,
      description: app.description,
      type: app.type === "tool" || app.type === "workflow" || app.type === "agent" ? app.type : "tool",
    })
    setOpen(true)
  }

  async function handleDelete(id: string) {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/ai-sdk/apps/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete app")
      }

      toast({
        title: "App deleted",
        description: "The app has been deleted successfully.",
      })

      // Refresh the apps list
      fetchApps()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while deleting the app",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleTest() {
    setIsRunning(true)
    setTestOutput("")
    try {
      // Parse the test input
      const input = testInput ? JSON.parse(testInput) : {}
      // Create a safe execution environment
      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
      // Capture logs without using console.log
      const logs: string[] = [];
      const logProxy = (...args: unknown[]) => {
        logs.push(args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" "))
      }
      try {
        // Create a function from the code
        const executeFunction = AsyncFunction("params", "log", code)
        // Execute the function with the input and logProxy
        const result = await executeFunction(input, logProxy)
        // Format the result
        setTestOutput(
          JSON.stringify(
            {
              result,
              logs
            },
            null,
            2,
          ),
        )
      } catch (error) {
        setTestOutput(
          JSON.stringify(
            {
              error: error && (error as Error).message ? (error as Error).message : String(error),
            },
            null,
            2,
          ),
        )
      }
    } finally {
      setIsRunning(false)
    }
  }

  // Add a refreshApps function for retry button
  function refreshApps() {
    fetchApps();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* --- AI Chat + Output Section --- */}
      <div className="h-[calc(100vh-4rem)] mb-6">
        <AppBuilderContainer />
      </div>
      {/* --- Existing App Builder UI --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">App Builder</h1>
          <p className="text-muted-foreground">Create and manage custom tools, workflows, and agents</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingApp(null)
                form.reset({
                  name: "",
                  description: "",
                  type: "tool",
                })
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New App
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[80vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingApp ? "Edit App" : "Create New App"}</DialogTitle>
              <DialogDescription>
                {editingApp ? "Update the app configuration" : "Create a new custom app"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="WebSearchTool" {...field} />
                          </FormControl>
                          <FormDescription>A unique name for this app (camelCase preferred)</FormDescription>
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
                            <Textarea placeholder="A tool for searching the web" className="min-h-[80px]" {...field} />
                          </FormControl>
                          <FormDescription>A detailed description of what this app does</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="tool">Tool</SelectItem>
                              <SelectItem value="workflow">Workflow</SelectItem>
                              <SelectItem value="agent">Agent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>The type of app you want to create</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="code">Code</TabsTrigger>
                        <TabsTrigger value="parameters" disabled={form.watch("type") !== "tool"}>
                          Parameters Schema
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="code" className="border rounded-md p-0 mt-2">
                        <CodeMirror
                          value={code}
                          height="400px"
                          theme={vscodeDark}
                          extensions={[javascript()]}
                          onChange={setCode}
                        />
                      </TabsContent>
                      <TabsContent value="parameters" className="border rounded-md p-0 mt-2">
                        <CodeMirror
                          value={parametersSchema}
                          height="400px"
                          theme={vscodeDark}
                          extensions={[json()]}
                          onChange={setParametersSchema}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingApp ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>{editingApp ? "Update App" : "Create App"}</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error message */}
      {connectionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not connect to the backend. Please check your connection and ensure the backend is running.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading apps...</p>
        </div>
      ) : connectionError ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Show empty state when there's a connection error */}
          <Card className="col-span-full p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-4" />
              <h3 className="text-lg font-medium">Could not load apps</h3>
              <p className="text-muted-foreground mt-1">
                There was an error connecting to the backend. Please try again later.
              </p>
              <Button onClick={refreshApps} className="mt-4">
                Retry
              </Button>
            </div>
          </Card>
        </div>
      ) : apps.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Show empty state when there are no apps */}
          <Card className="col-span-full p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <Code className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No apps found</h3>
              <p className="text-muted-foreground mt-1">
                You haven&apos;t created any apps yet. Click the &quot;Create New App&quot; button to get started.
              </p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    {app.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(app)}>
                      <Save className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(app.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash className="h-4 w-4" />
                      )}
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
                <CardDescription className="mt-2">{app.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium capitalize">{app.type}</span>
                  </div>
                  <div className="border rounded-md p-2 bg-muted">
                    <pre className="text-xs overflow-auto max-h-[100px]">
                      <code>{app.code.slice(0, 150)}...</code>
                    </pre>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Play className="mr-2 h-4 w-4" />
                      Test App
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[725px]">
                    <DialogHeader>
                      <DialogTitle>Test {app.name}</DialogTitle>
                      <DialogDescription>Test your app with custom input</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Input</h3>
                        <CodeMirror
                          value={testInput}
                          height="300px"
                          theme={vscodeDark}
                          extensions={[json()]}
                          onChange={setTestInput}
                        />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Output</h3>
                        <CodeMirror
                          value={testOutput}
                          height="300px"
                          theme={vscodeDark}
                          extensions={[json()]}
                          editable={false}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleTest} disabled={isRunning}>
                        {isRunning ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running...
                          </>
                        ) : (
                          "Run Test"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

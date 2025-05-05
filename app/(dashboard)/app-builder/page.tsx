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
import { Code, Play, Plus, Save, Trash } from "lucide-react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"

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

// Mock data for apps
const mockApps = [
  {
    id: "1",
    name: "WebSearchTool",
    description: "A tool for searching the web",
    type: "tool",
    code: `// Web search tool implementation
async function execute(params) {
  const { query } = params;
  
  console.log(\`Searching for: \${query}\`);
  
  // This is a placeholder implementation
  // In a real app, you would integrate with a search API
  
  return {
    results: [
      {
        title: \`Result for "\${query}"\`,
        snippet: \`This is information about \${query}\`,
        url: \`https://example.com/search?q=\${encodeURIComponent(query)}\`
      }
    ]
  };
}`,
  },
  {
    id: "2",
    name: "ResearchWorkflow",
    description: "A workflow for conducting research",
    type: "workflow",
    code: `// Research workflow implementation
async function execute(input) {
  // Step 1: Search for information
  const searchResults = await tools.WebSearchTool({
    query: input
  });
  
  // Step 2: Analyze the results
  const analysis = await agent.DataAnalyzer({
    input: JSON.stringify(searchResults)
  });
  
  // Step 3: Generate a summary
  const summary = await agent.ContentGenerator({
    input: analysis
  });
  
  return {
    searchResults,
    analysis,
    summary
  };
}`,
  },
]

export default function AppBuilderPage() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [apps, setApps] = useState(mockApps)
  const [editingApp, setEditingApp] = useState<any>(null)
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

      // Set parameters schema based on type
      if (editingApp.type === "tool") {
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

  function onSubmit(values: z.infer<typeof appFormSchema>) {
    // Here you would normally send this to your API
    console.log(values)
    console.log("Code:", code)
    console.log("Parameters Schema:", parametersSchema)

    if (editingApp) {
      // Update existing app
      setApps(
        apps.map((app) =>
          app.id === editingApp.id
            ? {
                ...app,
                ...values,
                code,
              }
            : app,
        ),
      )
      toast({
        title: "App updated",
        description: `${values.name} has been updated successfully.`,
      })
    } else {
      // Add new app
      setApps([
        ...apps,
        {
          id: (apps.length + 1).toString(),
          ...values,
          code,
        },
      ])
      toast({
        title: "App created",
        description: `${values.name} has been created successfully.`,
      })
    }

    setOpen(false)
    form.reset()
    setEditingApp(null)
    setCode("")
  }

  function handleEdit(app: any) {
    setEditingApp(app)
    form.reset({
      name: app.name,
      description: app.description,
      type: app.type,
    })
    setOpen(true)
  }

  function handleDelete(id: string) {
    setApps(apps.filter((app) => app.id !== id))
    toast({
      title: "App deleted",
      description: "The app has been deleted successfully.",
    })
  }

  async function handleRunTest() {
    setIsRunning(true)
    setTestOutput("")

    try {
      // Parse the test input
      const input = testInput ? JSON.parse(testInput) : {}

      // Create a safe execution environment
      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor

      // Capture console output
      const originalConsoleLog = console.log
      const logs = []
      console.log = (...args) => {
        logs.push(args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" "))
        originalConsoleLog(...args)
      }

      try {
        // Create a function from the code
        const executeFunction = AsyncFunction("params", code)

        // Execute the function with the input
        const result = await executeFunction(input)

        // Format the result
        setTestOutput(
          JSON.stringify(
            {
              result,
              logs,
            },
            null,
            2,
          ),
        )
      } finally {
        // Restore console.log
        console.log = originalConsoleLog
      }
    } catch (error) {
      setTestOutput(
        JSON.stringify(
          {
            error: error.message,
          },
          null,
          2,
        ),
      )
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
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
                  <Button type="submit">{editingApp ? "Update App" : "Create App"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

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
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(app.id)}>
                    <Trash className="h-4 w-4" />
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
                    <Button onClick={handleRunTest} disabled={isRunning}>
                      {isRunning ? "Running..." : "Run Test"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

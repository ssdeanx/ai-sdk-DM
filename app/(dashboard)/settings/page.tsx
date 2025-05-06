"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Save, Database, Wrench, Sparkles, Key, Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useSupabaseFetch } from "@/hooks/use-supabase-fetch"

// Define model interface
interface Model {
  id: string
  name: string
  provider: string
  modelId: string
  baseUrl?: string
  status: string
}

// Define the form schema for API settings
const apiSettingsSchema = z.object({
  google_api_key: z.string().optional(),
  default_model_id: z.string().optional(),
})

// Define the form schema for appearance settings
const appearanceSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  enable_animations: z.boolean().default(true),
  accent_color: z.string().default("violet"),
})

// Define the form schema for advanced settings
const advancedSettingsSchema = z.object({
  token_limit_warning: z.string().transform((val) => Number.parseInt(val) || 3500),
  enable_embeddings: z.boolean().default(true),
  enable_token_counting: z.boolean().default(true),
  streaming_responses: z.boolean().default(true),
})

// Define the form schema for notification settings
const notificationSettingsSchema = z.object({
  email_notifications: z.boolean().default(false),
  agent_completion_notifications: z.boolean().default(true),
  system_notifications: z.boolean().default(true),
})

export default function SettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("api")

  // Fetch models from Supabase
  const { data: models, isLoading: isLoadingModels } = useSupabaseFetch<Model>({
    endpoint: "/api/models",
    resourceName: "Models",
    dataKey: "models",
  })

  // API settings form
  const apiForm = useForm<z.infer<typeof apiSettingsSchema>>({
    resolver: zodResolver(apiSettingsSchema),
    defaultValues: {
      google_api_key: "",
      default_model_id: "",
    },
  })

  // Appearance settings form
  const appearanceForm = useForm<z.infer<typeof appearanceSettingsSchema>>({
    resolver: zodResolver(appearanceSettingsSchema),
    defaultValues: {
      theme: "system",
      enable_animations: true,
      accent_color: "violet",
    },
  })

  // Advanced settings form
  const advancedForm = useForm<z.infer<typeof advancedSettingsSchema>>({
    resolver: zodResolver(advancedSettingsSchema),
    defaultValues: {
      token_limit_warning: "3500",
      enable_embeddings: true,
      enable_token_counting: true,
      streaming_responses: true,
    },
  })

  // Notification settings form
  const notificationForm = useForm<z.infer<typeof notificationSettingsSchema>>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      email_notifications: false,
      agent_completion_notifications: true,
      system_notifications: true,
    },
  })

  // Fetch settings using the standardized hook
  const {
    data: settingsData,
    isLoading: isLoadingSettings,
  } = useSupabaseFetch<any>({
    endpoint: "/api/settings",
    resourceName: "Settings",
    dataKey: "settings",
  })

  // Update form values when settings data is loaded
  useEffect(() => {
    if (settingsData && settingsData.length > 0) {
      const data = settingsData[0]

      // Update API form
      apiForm.reset({
        google_api_key: data?.api?.google_api_key || "",
        default_model_id: data?.api?.default_model_id || "",
      })

      // Update appearance form
      appearanceForm.reset({
        theme: data?.appearance?.theme || "system",
        enable_animations: data?.appearance?.enable_animations !== false,
        accent_color: data?.appearance?.accent_color || "violet",
      })

      // Update advanced form
      advancedForm.reset({
        token_limit_warning: String(data?.advanced?.token_limit_warning || 3500),
        enable_embeddings: data?.advanced?.enable_embeddings !== false,
        enable_token_counting: data?.advanced?.enable_token_counting !== false,
        streaming_responses: data?.advanced?.streaming_responses !== false,
      })

      // Update notification form
      notificationForm.reset({
        email_notifications: data?.notifications?.email_notifications || false,
        agent_completion_notifications: data?.notifications?.agent_completion_notifications !== false,
        system_notifications: data?.notifications?.system_notifications !== false,
      })
    }
  }, [settingsData])

  // Handle API settings submission
  async function onApiSubmit(values: z.infer<typeof apiSettingsSchema>) {
    setIsLoading(true)
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "api",
          settings: values,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save API settings")
      }

      toast({
        title: "Settings saved",
        description: "API settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving API settings:", error)
      toast({
        title: "Error",
        description: "Failed to save API settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle appearance settings submission
  async function onAppearanceSubmit(values: z.infer<typeof appearanceSettingsSchema>) {
    setIsLoading(true)
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "appearance",
          settings: values,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save appearance settings")
      }

      toast({
        title: "Settings saved",
        description: "Appearance settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving appearance settings:", error)
      toast({
        title: "Error",
        description: "Failed to save appearance settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle advanced settings submission
  async function onAdvancedSubmit(values: z.infer<typeof advancedSettingsSchema>) {
    setIsLoading(true)
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "advanced",
          settings: values,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save advanced settings")
      }

      toast({
        title: "Settings saved",
        description: "Advanced settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving advanced settings:", error)
      toast({
        title: "Error",
        description: "Failed to save advanced settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle notification settings submission
  async function onNotificationSubmit(values: z.infer<typeof notificationSettingsSchema>) {
    setIsLoading(true)
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "notifications",
          settings: values,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save notification settings")
      }

      toast({
        title: "Settings saved",
        description: "Notification settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving notification settings:", error)
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your AI SDK Framework</p>
      </motion.div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col">
                <button
                  className={`flex items-center gap-2 p-3 text-left transition-colors hover:bg-accent ${
                    activeTab === "api" ? "bg-accent" : ""
                  }`}
                  onClick={() => setActiveTab("api")}
                >
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">API Settings</div>
                    <div className="text-xs text-muted-foreground">Configure API keys and models</div>
                  </div>
                </button>
                <button
                  className={`flex items-center gap-2 p-3 text-left transition-colors hover:bg-accent ${
                    activeTab === "appearance" ? "bg-accent" : ""
                  }`}
                  onClick={() => setActiveTab("appearance")}
                >
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Appearance</div>
                    <div className="text-xs text-muted-foreground">Customize the look and feel</div>
                  </div>
                </button>
                <button
                  className={`flex items-center gap-2 p-3 text-left transition-colors hover:bg-accent ${
                    activeTab === "advanced" ? "bg-accent" : ""
                  }`}
                  onClick={() => setActiveTab("advanced")}
                >
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Advanced</div>
                    <div className="text-xs text-muted-foreground">Configure advanced features</div>
                  </div>
                </button>
                <button
                  className={`flex items-center gap-2 p-3 text-left transition-colors hover:bg-accent ${
                    activeTab === "notifications" ? "bg-accent" : ""
                  }`}
                  onClick={() => setActiveTab("notifications")}
                >
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Notifications</div>
                    <div className="text-xs text-muted-foreground">Manage notification preferences</div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="col-span-12 md:col-span-9">
          {/* API Settings */}
          {activeTab === "api" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="mr-2 h-5 w-5" />
                  API Settings
                </CardTitle>
                <CardDescription>Configure your API keys and default models</CardDescription>
              </CardHeader>
              <Form {...apiForm}>
                <form onSubmit={apiForm.handleSubmit(onApiSubmit)}>
                  <CardContent className="space-y-6">
                    <Alert>
                      <Database className="h-4 w-4" />
                      <AlertTitle>Connected to Supabase</AlertTitle>
                      <AlertDescription>
                        Your application is successfully connected to the Supabase database.
                      </AlertDescription>
                    </Alert>

                    <FormField
                      control={apiForm.control}
                      name="google_api_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google API Key</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your Google API key" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your Google API key for accessing Gemini models. This will be stored securely.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={apiForm.control}
                      name="default_model_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Model</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a default model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingModels ? (
                                <SelectItem value="loading" disabled>
                                  Loading models...
                                </SelectItem>
                              ) : models.length > 0 ? (
                                models.map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-models" disabled>
                                  No models available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>The default model to use when not specified</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Available Models</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {isLoadingModels ? (
                          Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="p-3 border rounded-md animate-pulse">
                              <div className="h-5 w-1/3 bg-muted rounded mb-2"></div>
                              <div className="h-4 w-2/3 bg-muted rounded"></div>
                            </div>
                          ))
                        ) : models.length > 0 ? (
                          models.map((model) => (
                            <div key={model.id} className="p-3 border rounded-md">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium">{model.name}</div>
                                <Badge variant={model.status === "active" ? "default" : "outline"}>
                                  {model.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">{model.provider}</div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center p-4 text-muted-foreground">No models available</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isLoading}>
                      <Save className="mr-2 h-4 w-4" />
                      {isLoading ? "Saving..." : "Save Settings"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          )}

          {/* Appearance Settings */}
          {activeTab === "appearance" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Appearance
                </CardTitle>
                <CardDescription>Customize the look and feel of the application</CardDescription>
              </CardHeader>
              <Form {...appearanceForm}>
                <form onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)}>
                  <CardContent className="space-y-6">
                    <FormField
                      control={appearanceForm.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a theme" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                              <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Set the application theme</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={appearanceForm.control}
                      name="accent_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accent Color</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an accent color" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="violet">Violet</SelectItem>
                              <SelectItem value="blue">Blue</SelectItem>
                              <SelectItem value="green">Green</SelectItem>
                              <SelectItem value="orange">Orange</SelectItem>
                              <SelectItem value="red">Red</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Set the accent color for the application</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={appearanceForm.control}
                      name="enable_animations"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Animations</FormLabel>
                            <FormDescription>Enable or disable animations throughout the application</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Preview</h3>
                      <div className="border rounded-md p-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className={`p-3 rounded-md bg-${appearanceForm.watch("accent_color")}-500 text-white`}>
                            Primary Button
                          </div>
                          <div className="p-3 rounded-md border">Secondary Button</div>
                          <div className="p-3 rounded-md bg-muted">Muted Background</div>
                          <div className="p-3 rounded-md border">
                            <div className="h-4 w-full bg-muted rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isLoading}>
                      <Save className="mr-2 h-4 w-4" />
                      {isLoading ? "Saving..." : "Save Settings"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          )}

          {/* Advanced Settings */}
          {activeTab === "advanced" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wrench className="mr-2 h-5 w-5" />
                  Advanced Settings
                </CardTitle>
                <CardDescription>Configure advanced features and performance options</CardDescription>
              </CardHeader>
              <Form {...advancedForm}>
                <form onSubmit={advancedForm.handleSubmit(onAdvancedSubmit)}>
                  <CardContent className="space-y-6">
                    <FormField
                      control={advancedForm.control}
                      name="token_limit_warning"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token Limit Warning</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>Show a warning when the token count approaches this limit</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={advancedForm.control}
                      name="streaming_responses"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Streaming Responses</FormLabel>
                            <FormDescription>Enable streaming for real-time responses from AI models</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={advancedForm.control}
                      name="enable_embeddings"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Embeddings</FormLabel>
                            <FormDescription>
                              Generate embeddings for messages to enable semantic search
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={advancedForm.control}
                      name="enable_token_counting"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Token Counting</FormLabel>
                            <FormDescription>Count tokens for messages to track usage</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Database Configuration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="p-3 border rounded-md">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium">Supabase</div>
                            <Badge variant="default">Connected</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">Application data storage</div>
                        </div>
                        <div className="p-3 border rounded-md">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium">LibSQL</div>
                            <Badge variant="default">Connected</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">Agent memory and threads</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isLoading}>
                      <Save className="mr-2 h-4 w-4" />
                      {isLoading ? "Saving..." : "Save Settings"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          )}

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>Configure how and when you receive notifications</CardDescription>
              </CardHeader>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)}>
                  <CardContent className="space-y-6">
                    <FormField
                      control={notificationForm.control}
                      name="email_notifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>Receive email notifications for important events</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="agent_completion_notifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Agent Completion Notifications</FormLabel>
                            <FormDescription>Receive notifications when agents complete their tasks</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="system_notifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">System Notifications</FormLabel>
                            <FormDescription>
                              Receive notifications about system updates and maintenance
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Notification Channels</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="p-3 border rounded-md">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium">In-App</div>
                            <Badge variant="default">Enabled</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">Notifications within the application</div>
                        </div>
                        <div className="p-3 border rounded-md">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium">Email</div>
                            <Badge variant={notificationForm.watch("email_notifications") ? "default" : "outline"}>
                              {notificationForm.watch("email_notifications") ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">Notifications sent to your email</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isLoading}>
                      <Save className="mr-2 h-4 w-4" />
                      {isLoading ? "Saving..." : "Save Settings"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

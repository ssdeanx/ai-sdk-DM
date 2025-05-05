"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Save } from "lucide-react"
import { MDXRemote } from "next-mdx-remote"
import { serialize } from "next-mdx-remote/serialize"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  content: z.string().min(10, {
    message: "Content must be at least 10 characters.",
  }),
})

export default function MdxBuilderPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [mdxSource, setMdxSource] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("edit")
  const [previewError, setPreviewError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content:
        '# Hello, World!\n\nThis is a **markdown** document with _formatting_.\n\n## Features\n\n- Lists\n- **Bold text**\n- *Italic text*\n- [Links](https://example.com)\n\n```js\n// Code blocks\nfunction hello() {\n  console.log("Hello, world!");\n}\n```',
    },
  })

  const watchContent = form.watch("content")

  // Update preview when content changes
  useEffect(() => {
    const updatePreview = async () => {
      if (watchContent) {
        try {
          setPreviewError(null)
          const mdxSource = await serialize(watchContent, {
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              // Remove any estree-related options that might be causing issues
              format: "mdx",
              development: false,
            },
          })
          setMdxSource(mdxSource)
        } catch (error) {
          console.error("Error serializing MDX:", error)
          setPreviewError("Error rendering preview. Your markdown might contain syntax errors.")
        }
      }
    }

    updatePreview()
  }, [watchContent])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Here you would normally save to the database
      // const response = await fetch('/api/mdx', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(values)
      // })
      // const data = await response.json()

      toast({
        title: "Document saved",
        description: `"${values.title}" has been saved successfully.`,
      })
    } catch (error) {
      console.error("Error saving document:", error)
      toast({
        title: "Error saving document",
        description: "There was a problem saving your document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">MDX Builder</h1>
        <p className="text-muted-foreground">Create and edit MDX documents with live preview</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Document Title</FormLabel>
                <FormControl>
                  <Input placeholder="My Awesome Document" className="text-lg py-6" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="hidden md:block">
            <ResizablePanelGroup direction="horizontal" className="min-h-[600px] border rounded-lg overflow-hidden">
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex flex-col">
                  <div className="p-3 border-b bg-muted/30">
                    <h3 className="font-medium">Editor</h3>
                  </div>
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Textarea
                            placeholder="# Start writing..."
                            className="h-full min-h-[550px] rounded-none border-0 resize-none font-mono text-sm focus-visible:ring-0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex flex-col">
                  <div className="p-3 border-b bg-muted/30">
                    <h3 className="font-medium">Preview</h3>
                  </div>
                  <div className="p-4 overflow-auto prose dark:prose-invert max-w-none h-full">
                    {previewError ? (
                      <div className="p-4 text-red-500 border border-red-300 rounded-md bg-red-50 dark:bg-red-900/20">
                        {previewError}
                      </div>
                    ) : mdxSource ? (
                      <MDXRemote {...mdxSource} />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          <div className="md:hidden">
            <Tabs defaultValue="edit" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit">Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="border rounded-md mt-2">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="# Start writing..."
                          className="min-h-[400px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              <TabsContent
                value="preview"
                className="border rounded-md p-4 mt-2 min-h-[400px] prose dark:prose-invert max-w-none"
              >
                {previewError ? (
                  <div className="p-4 text-red-500 border border-red-300 rounded-md bg-red-50 dark:bg-red-900/20">
                    {previewError}
                  </div>
                ) : mdxSource ? (
                  <MDXRemote {...mdxSource} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset()
                toast({
                  title: "Document reset",
                  description: "Your changes have been discarded.",
                })
              }}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 border-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Document
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>MDX Tips</CardTitle>
          <CardDescription>Some helpful tips for writing MDX documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium">Markdown Basics</h3>
            <p className="text-sm text-muted-foreground">
              Use # for headings, * for italic, ** for bold, - for lists, and [text](url) for links.
            </p>
          </div>
          <div>
            <h3 className="font-medium">Code Blocks</h3>
            <p className="text-sm text-muted-foreground">Use ```language for syntax-highlighted code blocks.</p>
          </div>
          <div>
            <h3 className="font-medium">React Components</h3>
            <p className="text-sm text-muted-foreground">
              You can use React components directly in your MDX: {"<Button>Click me</Button>"}.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="link" className="text-blue-500 dark:text-blue-400" asChild>
            <a href="https://mdxjs.com/docs/" target="_blank" rel="noopener noreferrer">
              Learn more about MDX
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

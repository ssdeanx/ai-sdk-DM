"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Check, ChevronRight, Code, FileText, MessageSquare, Search, ShoppingCart, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Default use cases data
const defaultUseCases = [
  {
    id: "customer-support",
    title: "Customer Support",
    description: "Build AI agents that can handle customer inquiries, troubleshoot issues, and provide personalized support 24/7.",
    icon: Users,
    features: [
      "Handle multiple customer inquiries simultaneously",
      "Access knowledge bases and documentation",
      "Escalate complex issues to human agents",
      "Personalize responses based on customer history",
    ],
    code: `import { openai } from '@ai-sdk/openai';
import { createAgent } from '@ai-sdk/agent';

// Create a customer support agent
const supportAgent = createAgent({
  name: 'Customer Support',
  model: openai('gpt-4o'),
  tools: [
    knowledgeBaseTool,
    ticketingSystemTool,
    escalationTool
  ],
  systemPrompt: \`You are a helpful customer support agent.
  Answer customer questions based on the knowledge base.
  If you can't help, create a support ticket.\`
});

// Handle customer inquiry
const response = await supportAgent.execute({
  messages: [
    { role: 'user', content: customerInquiry }
  ]
});`,
  },
  {
    id: "content-generation",
    title: "Content Generation",
    description: "Create AI agents that can generate blog posts, product descriptions, social media content, and more.",
    icon: FileText,
    features: [
      "Generate SEO-optimized content",
      "Create content in different tones and styles",
      "Research topics and incorporate facts",
      "Edit and refine existing content",
    ],
    code: `import { anthropic } from '@ai-sdk/anthropic';
import { createAgent } from '@ai-sdk/agent';

// Create a content generation agent
const contentAgent = createAgent({
  name: 'Content Generator',
  model: anthropic('claude-3-opus-20240229'),
  tools: [
    researchTool,
    seoAnalysisTool,
    imageGenerationTool
  ],
  systemPrompt: \`You are a skilled content creator.
  Generate engaging, well-researched content
  that matches the requested style and tone.\`
});

// Generate a blog post
const blogPost = await contentAgent.execute({
  messages: [
    { role: 'user', content: 'Write a blog post about AI trends in 2024' }
  ]
});`,
  },
  {
    id: "research-assistant",
    title: "Research Assistant",
    description: "Build AI agents that can search the web, analyze data, and synthesize information to help with research tasks.",
    icon: Search,
    features: [
      "Search the web for relevant information",
      "Analyze and summarize research papers",
      "Extract key insights from large datasets",
      "Generate research reports and presentations",
    ],
    code: `import { google } from '@ai-sdk/google';
import { createAgent } from '@ai-sdk/agent';

// Create a research assistant agent
const researchAgent = createAgent({
  name: 'Research Assistant',
  model: google('gemini-1.5-pro'),
  tools: [
    webSearchTool,
    pdfExtractorTool,
    dataAnalysisTool,
    citationGeneratorTool
  ],
  systemPrompt: \`You are a research assistant.
  Search for information, analyze data,
  and synthesize findings into clear reports.\`
});

// Research a topic
const researchReport = await researchAgent.execute({
  messages: [
    { role: 'user', content: 'Research the impact of AI on healthcare' }
  ]
});`,
  },
  {
    id: "code-assistant",
    title: "Code Assistant",
    description: "Create AI agents that can help developers write, debug, and optimize code across multiple programming languages.",
    icon: Code,
    features: [
      "Generate code based on requirements",
      "Debug and fix code issues",
      "Explain complex code snippets",
      "Optimize code for performance",
    ],
    code: `import { openai } from '@ai-sdk/openai';
import { createAgent } from '@ai-sdk/agent';

// Create a code assistant agent
const codeAgent = createAgent({
  name: 'Code Assistant',
  model: openai('gpt-4o'),
  tools: [
    codeAnalysisTool,
    gitTool,
    testGeneratorTool,
    documentationTool
  ],
  systemPrompt: \`You are a coding assistant.
  Help write, debug, and optimize code.
  Explain concepts clearly and follow best practices.\`
});

// Generate code
const generatedCode = await codeAgent.execute({
  messages: [
    { role: 'user', content: 'Write a React component for a todo list' }
  ]
});`,
  },
]

export default function UseCasesSection() {
  const [useCases, setUseCases] = useState(defaultUseCases)
  const [activeTab, setActiveTab] = useState(defaultUseCases[0].id)

  useEffect(() => {
    // Fetch use cases content from API
    const fetchUseCasesContent = async () => {
      try {
        const response = await fetch("/api/content/use-cases")
        if (response.ok) {
          const data = await response.json()
          if (data && Array.isArray(data)) {
            // Map API data to use cases format
            const mappedUseCases = data.map((item: any) => ({
              id: item.data?.id || item.id,
              title: item.title || "",
              description: item.description || "",
              icon: getIconByName(item.data?.icon || ""),
              features: item.data?.features || [],
              code: item.data?.code || "",
            }))
            setUseCases(mappedUseCases)
            if (mappedUseCases.length > 0) {
              setActiveTab(mappedUseCases[0].id)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching use cases content:", error)
      }
    }

    fetchUseCasesContent()
  }, [])

  // Helper function to get icon component by name
  function getIconByName(name: string) {
    const iconMap: Record<string, any> = {
      Users: Users,
      FileText: FileText,
      Search: Search,
      Code: Code,
      MessageSquare: MessageSquare,
      ShoppingCart: ShoppingCart,
    }
    return iconMap[name] || Users
  }

  return (
    <section className="py-20 bg-gray-950 relative">
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-4">
            Use Cases
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Discover how AI SDK Framework can be used to build a wide range of AI-powered applications.
          </p>
        </motion.div>

        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-8 bg-gray-900 p-1 rounded-lg">
            {useCases.map((useCase) => (
              <TabsTrigger
                key={useCase.id}
                value={useCase.id}
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
              >
                <useCase.icon className="mr-2 h-4 w-4" />
                {useCase.title}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {useCases.map((useCase) => (
            <TabsContent key={useCase.id} value={useCase.id} className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h3 className="text-2xl font-bold text-white mb-4">{useCase.title}</h3>
                  <p className="text-gray-400 mb-6">{useCase.description}</p>
                  
                  <div className="space-y-3 mb-8">
                    {useCase.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="mt-1 text-green-500">
                          <Check className="h-4 w-4" />
                        </div>
                        <p className="text-gray-300">{feature}</p>
                      </div>
                    ))}
                  </div>
                  
                  <Button asChild variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                    <Link href="/docs/use-cases">
                      View Documentation
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="text-xs text-gray-400">example.ts</div>
                      <div></div>
                    </div>
                    <div className="p-4 font-mono text-sm text-gray-300 overflow-x-auto">
                      <pre className="whitespace-pre-wrap">
                        <code>{useCase.code}</code>
                      </pre>
                    </div>
                  </div>
                </motion.div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}

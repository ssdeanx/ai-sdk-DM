"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Bot, Brain, Code, Database, Layers, MessageSquare, Network, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Default features data
const defaultFeatures = [
  {
    title: "AI Agents",
    description: "Create and manage AI agents with different capabilities and personalities.",
    icon: Bot,
    color: "from-blue-500 to-blue-600",
  },
  {
    title: "Tools Integration",
    description: "Connect your agents to external tools and APIs for enhanced capabilities.",
    icon: Zap,
    color: "from-purple-500 to-purple-600",
  },
  {
    title: "Memory & Context",
    description: "Persistent memory and context management for more coherent conversations.",
    icon: Brain,
    color: "from-green-500 to-green-600",
  },
  {
    title: "Multi-Agent Networks",
    description: "Create networks of agents that collaborate to solve complex problems.",
    icon: Network,
    color: "from-orange-500 to-orange-600",
  },
  {
    title: "Model Flexibility",
    description: "Support for multiple AI models from different providers (OpenAI, Google, Anthropic).",
    icon: Layers,
    color: "from-red-500 to-red-600",
  },
  {
    title: "Structured Data",
    description: "Extract and work with structured data from unstructured text inputs.",
    icon: Database,
    color: "from-teal-500 to-teal-600",
  },
]

export default function FeaturesSection() {
  const [features, setFeatures] = useState(defaultFeatures)

  useEffect(() => {
    // Fetch features content from API
    const fetchFeaturesContent = async () => {
      try {
        const response = await fetch("/api/content/features")
        if (response.ok) {
          const data = await response.json()
          if (data && Array.isArray(data)) {
            // Map API data to features format
            const mappedFeatures = data.map((item: any) => ({
              title: item.title || "",
              description: item.description || "",
              icon: getIconByName(item.data?.icon || ""),
              color: item.data?.color || "from-blue-500 to-blue-600",
            }))
            setFeatures(mappedFeatures)
          }
        }
      } catch (error) {
        console.error("Error fetching features content:", error)
      }
    }

    fetchFeaturesContent()
  }, [])

  // Helper function to get icon component by name
  function getIconByName(name: string) {
    const iconMap: Record<string, any> = {
      Bot: Bot,
      Brain: Brain,
      Code: Code,
      Database: Database,
      Layers: Layers,
      MessageSquare: MessageSquare,
      Network: Network,
      Zap: Zap,
    }
    return iconMap[name] || Zap
  }

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  return (
    <section className="py-20 bg-gray-950 relative">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      <div className="container relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-4">
            Powerful Features
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Everything you need to build sophisticated AI applications with agents, tools, and memory.
          </p>
        </motion.div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={item}>
              <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-300 h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full bg-gradient-to-br ${feature.color}`}>
                      <feature.icon className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-400">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

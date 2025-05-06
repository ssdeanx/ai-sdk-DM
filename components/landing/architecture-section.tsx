"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Bot, Brain, Database, Layers, MessageSquare, Zap } from "lucide-react"

export default function ArchitectureSection() {
  const [architectureData, setArchitectureData] = useState({
    title: "Modern Architecture",
    subtitle: "Built for AI-native applications",
    description: "The AI SDK Framework provides a modular architecture that makes it easy to build, deploy, and scale AI applications.",
    components: [
      {
        title: "AI Models",
        description: "Connect to OpenAI, Google, Anthropic, and other AI providers.",
        icon: "Layers",
      },
      {
        title: "Agents",
        description: "Create specialized AI agents with different capabilities.",
        icon: "Bot",
      },
      {
        title: "Tools",
        description: "Extend agent capabilities with custom tools and integrations.",
        icon: "Zap",
      },
      {
        title: "Memory",
        description: "Persistent storage for conversations and agent state.",
        icon: "Database",
      },
      {
        title: "Chat Interface",
        description: "Ready-to-use UI components for chat applications.",
        icon: "MessageSquare",
      },
      {
        title: "Reasoning Engine",
        description: "Advanced reasoning capabilities for complex tasks.",
        icon: "Brain",
      },
    ],
  })

  useEffect(() => {
    // Fetch architecture content from API
    const fetchArchitectureContent = async () => {
      try {
        const response = await fetch("/api/content/architecture")
        if (response.ok) {
          const data = await response.json()
          if (data) {
            // Update with API data if available
            setArchitectureData({
              title: data.title || architectureData.title,
              subtitle: data.subtitle || architectureData.subtitle,
              description: data.description || architectureData.description,
              components: data.data?.components || architectureData.components,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching architecture content:", error)
      }
    }

    fetchArchitectureContent()
  }, [])

  // Helper function to get icon component by name
  function getIconByName(name: string) {
    const iconMap: Record<string, any> = {
      Bot: Bot,
      Brain: Brain,
      Database: Database,
      Layers: Layers,
      MessageSquare: MessageSquare,
      Zap: Zap,
    }
    return iconMap[name] || Layers
  }

  return (
    <section className="py-20 bg-gray-900 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950"></div>
      
      <div className="container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-4">
              {architectureData.title}
            </h2>
            <p className="text-xl text-gray-400 mb-4">
              {architectureData.subtitle}
            </p>
            <p className="text-gray-500 mb-8">
              {architectureData.description}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {architectureData.components.map((component, index) => {
                const Icon = getIconByName(component.icon)
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-1 p-1.5 rounded-full bg-gray-800 text-blue-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{component.title}</h3>
                      <p className="text-sm text-gray-400">{component.description}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
          
          {/* Architecture diagram */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-xl">
              <div className="relative aspect-square">
                {/* Central hub */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center border-2 border-blue-500/50 z-20">
                  <div className="text-center">
                    <Layers className="w-8 h-8 text-blue-400 mx-auto" />
                    <div className="text-xs font-medium text-blue-300 mt-1">AI SDK Core</div>
                  </div>
                </div>
                
                {/* Connecting lines */}
                <svg className="absolute inset-0 w-full h-full z-10" viewBox="0 0 400 400">
                  <line x1="200" y1="200" x2="100" y2="100" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" />
                  <line x1="200" y1="200" x2="300" y2="100" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" />
                  <line x1="200" y1="200" x2="100" y2="300" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" />
                  <line x1="200" y1="200" x2="300" y2="300" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" />
                  <line x1="200" y1="200" x2="100" y2="200" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" />
                  <line x1="200" y1="200" x2="300" y2="200" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" />
                </svg>
                
                {/* Component nodes */}
                <div className="absolute top-[25%] left-[25%] transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/50 z-20">
                  <div className="text-center">
                    <Bot className="w-6 h-6 text-purple-400 mx-auto" />
                    <div className="text-xs font-medium text-purple-300 mt-1">Agents</div>
                  </div>
                </div>
                
                <div className="absolute top-[25%] left-[75%] transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50 z-20">
                  <div className="text-center">
                    <Zap className="w-6 h-6 text-green-400 mx-auto" />
                    <div className="text-xs font-medium text-green-300 mt-1">Tools</div>
                  </div>
                </div>
                
                <div className="absolute top-[75%] left-[25%] transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center border border-orange-500/50 z-20">
                  <div className="text-center">
                    <Database className="w-6 h-6 text-orange-400 mx-auto" />
                    <div className="text-xs font-medium text-orange-300 mt-1">Memory</div>
                  </div>
                </div>
                
                <div className="absolute top-[75%] left-[75%] transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/50 z-20">
                  <div className="text-center">
                    <Brain className="w-6 h-6 text-red-400 mx-auto" />
                    <div className="text-xs font-medium text-red-300 mt-1">Reasoning</div>
                  </div>
                </div>
                
                <div className="absolute top-[50%] left-[12.5%] transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center border border-teal-500/50 z-20">
                  <div className="text-center">
                    <Layers className="w-6 h-6 text-teal-400 mx-auto" />
                    <div className="text-xs font-medium text-teal-300 mt-1">Models</div>
                  </div>
                </div>
                
                <div className="absolute top-[50%] left-[87.5%] transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center border border-pink-500/50 z-20">
                  <div className="text-center">
                    <MessageSquare className="w-6 h-6 text-pink-400 mx-auto" />
                    <div className="text-xs font-medium text-pink-300 mt-1">Chat UI</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating particles */}
            <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="absolute top-3/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }}></div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

"use client"

import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { Activity, Brain, Code, MessageSquare, Network, Settings, Sparkles, Zap } from "lucide-react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardPage() {
  const { theme } = useTheme()

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
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  }

  const stats = [
    { label: "Active Agents", value: "12", icon: Brain, color: "text-green-500" },
    { label: "Models", value: "8", icon: Sparkles, color: "text-violet-500" },
    { label: "Tools", value: "24", icon: Code, color: "text-blue-500" },
    { label: "Conversations", value: "156", icon: MessageSquare, color: "text-amber-500" },
  ]

  const features = [
    {
      title: "AI Models",
      description: "Configure and manage AI models from various providers",
      icon: Sparkles,
      color: "from-violet-500 to-purple-600",
      link: "/models",
    },
    {
      title: "Tools",
      description: "Create and manage tools for your AI agents",
      icon: Code,
      color: "from-blue-500 to-cyan-600",
      link: "/tools",
    },
    {
      title: "Agents",
      description: "Build intelligent agents with custom workflows",
      icon: Brain,
      color: "from-green-500 to-emerald-600",
      link: "/agents",
    },
    {
      title: "Networks",
      description: "Create multi-agent networks for complex tasks",
      icon: Network,
      color: "from-orange-500 to-amber-600",
      link: "/networks",
    },
    {
      title: "Chat",
      description: "Interact with your AI models and agents",
      icon: MessageSquare,
      color: "from-pink-500 to-rose-600",
      link: "/chat",
    },
    {
      title: "Settings",
      description: "Configure your AI SDK Framework",
      icon: Settings,
      color: "from-gray-500 to-slate-600",
      link: "/settings",
    },
  ]

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col gap-2">
        <motion.h1
          className="text-3xl font-bold tracking-tight"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Welcome to <span className="gradient-text">AI SDK Framework</span>
        </motion.h1>
        <motion.p
          className="text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Build, manage, and deploy sophisticated AI systems with ease
        </motion.p>
      </div>

      <motion.div className="grid gap-4 md:grid-cols-4" variants={container} initial="hidden" animate="show">
        {stats.map((stat, i) => (
          <motion.div key={i} variants={item}>
            <Card className="overflow-hidden gradient-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                  </div>
                  <div className={`p-2 rounded-full bg-background ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div className="grid gap-4 md:grid-cols-3" variants={container} initial="hidden" animate="show">
        {features.map((feature, i) => (
          <motion.div key={i} variants={item}>
            <Link href={feature.link} className="block h-full">
              <Card className="h-full overflow-hidden hover:shadow-md transition-shadow duration-300 gradient-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full bg-gradient-to-br ${feature.color}`}>
                      <feature.icon className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" size="sm" className="ml-auto text-xs animated-underline">
                    Explore
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-violet-500/20 dark:from-blue-500/10 dark:to-violet-500/10" />
            <CardContent className="p-6 relative">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Ready to get started?</h3>
                  <p className="text-muted-foreground mb-4">
                    Explore our documentation to learn how to build powerful AI applications with the AI SDK Framework.
                  </p>
                  <div className="flex gap-3">
                    <Button className="btn-3d bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600">
                      <Zap className="mr-2 h-4 w-4" />
                      Quick Start
                    </Button>
                    <Button variant="outline" className="btn-3d">
                      View Docs
                    </Button>
                  </div>
                </div>
                <div className="w-full md:w-1/3 aspect-video rounded-lg overflow-hidden glass-card">
                  <div className="w-full h-full bg-gradient-to-br from-blue-500/20 via-violet-500/20 to-pink-500/20 dark:from-blue-500/10 dark:via-violet-500/10 dark:to-pink-500/10 flex items-center justify-center">
                    <Activity className="w-12 h-12 text-primary/50" />
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

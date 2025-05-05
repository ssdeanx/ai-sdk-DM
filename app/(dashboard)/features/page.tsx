"use client"

import { motion } from "framer-motion"
import {
  Bot,
  Cpu,
  PenToolIcon as Tool,
  Network,
  Code2,
  FileText,
  Zap,
  Shield,
  Layers,
  CheckCircle2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: <Bot className="h-10 w-10 text-blue-500" />,
    title: "AI Agents",
    description: "Create and deploy intelligent agents that can perform complex tasks autonomously.",
  },
  {
    icon: <Cpu className="h-10 w-10 text-violet-500" />,
    title: "Multiple Models",
    description: "Connect to various AI models from Google, OpenAI, Anthropic, and more.",
  },
  {
    icon: <Tool className="h-10 w-10 text-green-500" />,
    title: "Extensible Tools",
    description: "Extend your agents with a wide range of tools for web search, code execution, and more.",
  },
  {
    icon: <Network className="h-10 w-10 text-orange-500" />,
    title: "Agent Networks",
    description: "Connect multiple agents together to solve complex problems collaboratively.",
  },
  {
    icon: <Code2 className="h-10 w-10 text-red-500" />,
    title: "App Builder",
    description: "Build custom applications powered by AI with our intuitive app builder.",
  },
  {
    icon: <FileText className="h-10 w-10 text-teal-500" />,
    title: "MDX Builder",
    description: "Create rich, interactive content with our MDX builder and editor.",
  },
  {
    icon: <Zap className="h-10 w-10 text-yellow-500" />,
    title: "High Performance",
    description: "Optimized for speed and efficiency, even with complex agent workflows.",
  },
  {
    icon: <Shield className="h-10 w-10 text-indigo-500" />,
    title: "Secure & Private",
    description: "Enterprise-grade security and privacy controls for your AI applications.",
  },
  {
    icon: <Layers className="h-10 w-10 text-pink-500" />,
    title: "Agentic Toolkit",
    description: "Leverage the power of the Agentic Toolkit with built-in adapters and integrations.",
  },
]

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Basic features for individuals and small projects",
    features: ["3 AI Agents", "5 Basic Tools", "Standard Models", "Community Support", "1,000 API Calls/month"],
  },
  {
    name: "Pro",
    price: "$29",
    description: "Advanced features for professionals and teams",
    features: [
      "Unlimited AI Agents",
      "All Tools",
      "Premium Models",
      "Priority Support",
      "50,000 API Calls/month",
      "Agent Networks",
      "Custom Tools",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Custom solutions for large organizations",
    features: [
      "Everything in Pro",
      "Dedicated Support",
      "Custom Integrations",
      "SLA Guarantees",
      "Unlimited API Calls",
      "On-premises Option",
      "SSO & Advanced Security",
    ],
  },
]

export default function FeaturesPage() {
  return (
    <div className="container py-12 space-y-20">
      <div className="text-center space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-5xl font-bold tracking-tight"
        >
          Powerful Features for AI Development
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-xl text-muted-foreground max-w-3xl mx-auto"
        >
          Build, deploy, and manage intelligent AI agents and applications with our comprehensive platform
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * index }}
          >
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="space-y-8">
        <div className="text-center space-y-4">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight"
          >
            Choose the Right Plan for You
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Flexible pricing options to meet your needs
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {tiers.map((tier, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
              className="relative"
            >
              <Card className={`h-full ${tier.highlighted ? "border-primary shadow-lg" : ""}`}>
                {tier.highlighted && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{tier.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    {tier.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
                  </div>
                  <CardDescription className="text-base mt-2">{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full mt-4 ${tier.highlighted ? "bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 border-none" : ""}`}
                    variant={tier.highlighted ? "default" : "outline"}
                  >
                    {tier.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 rounded-xl p-8 md:p-12">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight"
          >
            Ready to build powerful AI applications?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Get started today and join thousands of developers building the future with our AI SDK Framework.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 border-none"
            >
              Get Started for Free
            </Button>
            <Button size="lg" variant="outline">
              Schedule a Demo
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

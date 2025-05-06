"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Code, Sparkles, Zap } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HeroSection() {
  const [heroData, setHeroData] = useState({
    title: "Build Powerful AI Applications with AI SDK",
    subtitle: "The open-source framework for building AI applications with agents, tools, and memory",
    description: "Create, deploy, and manage AI agents with a powerful toolkit designed for developers.",
    cta: "Get Started",
    secondaryCta: "View Documentation",
  })

  useEffect(() => {
    // Fetch hero content from API
    const fetchHeroContent = async () => {
      try {
        const response = await fetch("/api/content/hero")
        if (response.ok) {
          const data = await response.json()
          if (data) {
            setHeroData({
              title: data.title || heroData.title,
              subtitle: data.subtitle || heroData.subtitle,
              description: data.description || heroData.description,
              cta: data.data?.cta || heroData.cta,
              secondaryCta: data.data?.secondaryCta || heroData.secondaryCta,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching hero content:", error)
      }
    }

    fetchHeroContent()
  }, [])

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950"></div>
      
      {/* Animated grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>
      
      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full filter blur-[128px] opacity-20 animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500 rounded-full filter blur-[128px] opacity-20 animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
      
      <div className="container relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-gradient-to-r from-blue-500/10 to-violet-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/20 mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              AI SDK Framework
            </span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-6"
          >
            {heroData.title}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-400 mb-4"
          >
            {heroData.subtitle}
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-gray-500 mb-8 max-w-2xl"
          >
            {heroData.description}
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700">
              <Link href="/dashboard">
                {heroData.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <Link href="/docs">
                <Code className="mr-2 h-4 w-4" />
                {heroData.secondaryCta}
              </Link>
            </Button>
          </motion.div>
          
          {/* Code preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-16 w-full max-w-3xl mx-auto"
          >
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-xs text-gray-400">example.tsx</div>
                <div></div>
              </div>
              <div className="p-4 text-left font-mono text-sm text-gray-300 overflow-x-auto">
                <pre>
                  <code>
                    <span className="text-blue-400">import</span> <span className="text-gray-300">{'{ openai }'}</span> <span className="text-blue-400">from</span> <span className="text-green-400">'@ai-sdk/openai'</span><span className="text-gray-300">;</span>
                    <br />
                    <span className="text-blue-400">import</span> <span className="text-gray-300">{'{ streamText }'}</span> <span className="text-blue-400">from</span> <span className="text-green-400">'ai'</span><span className="text-gray-300">;</span>
                    <br /><br />
                    <span className="text-blue-400">const</span> <span className="text-yellow-400">stream</span> <span className="text-gray-300">=</span> <span className="text-blue-400">await</span> <span className="text-yellow-400">streamText</span><span className="text-gray-300">{'({'}</span>
                    <br />
                    <span className="text-gray-300">{'  '}model:</span> <span className="text-yellow-400">openai</span><span className="text-gray-300">{'('}</span><span className="text-green-400">'gpt-4o'</span><span className="text-gray-300">{'),'}</span>
                    <br />
                    <span className="text-gray-300">{'  '}prompt:</span> <span className="text-green-400">'Write a short poem about AI'</span>
                    <br />
                    <span className="text-gray-300">{'})'}</span>
                    <br /><br />
                    <span className="text-blue-400">for await</span> <span className="text-gray-300">(</span><span className="text-blue-400">const</span> <span className="text-yellow-400">chunk</span> <span className="text-blue-400">of</span> <span className="text-yellow-400">stream</span><span className="text-gray-300">) {'{'}</span>
                    <br />
                    <span className="text-gray-300">{'  '}process.stdout.write(chunk);</span>
                    <br />
                    <span className="text-gray-300">{'}'}</span>
                  </code>
                </pre>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

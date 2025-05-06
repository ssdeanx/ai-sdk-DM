"use client"

import { motion } from "framer-motion"
import { Brain, Code, MessageSquare, Network, Database, Bot, Sparkles, Zap } from "lucide-react"
import { useSupabaseFetch } from "@/hooks/use-supabase-fetch"
import { StatCard } from "@/components/dashboard/stat-card"

interface DashboardStatsProps {
  className?: string
}

interface StatsData {
  agents: number
  models: number
  tools: number
  conversations: number
  networks?: number
  workflows?: number
}

export function DashboardStats({ className }: DashboardStatsProps) {
  // Fetch real-time stats from Supabase
  const { data, isLoading, error } = useSupabaseFetch<StatsData>({
    endpoint: "/api/dashboard/stats",
    resourceName: "Dashboard Stats",
    dataKey: "stats",
  })

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
    hidden: { y: 20, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    },
  }

  // Default stats in case of loading or error
  const stats = [
    { 
      label: "Active Agents", 
      value: isLoading ? "..." : data?.[0]?.agents?.toString() || "0", 
      icon: Brain, 
      color: "text-green-500",
      progress: 75
    },
    { 
      label: "Models", 
      value: isLoading ? "..." : data?.[0]?.models?.toString() || "0", 
      icon: Sparkles, 
      color: "text-violet-500",
      progress: 60
    },
    { 
      label: "Tools", 
      value: isLoading ? "..." : data?.[0]?.tools?.toString() || "0", 
      icon: Code, 
      color: "text-blue-500",
      progress: 85
    },
    { 
      label: "Conversations", 
      value: isLoading ? "..." : data?.[0]?.conversations?.toString() || "0", 
      icon: MessageSquare, 
      color: "text-amber-500",
      progress: 45
    },
  ]

  return (
    <motion.div 
      className={`grid gap-4 md:grid-cols-4 ${className}`} 
      variants={container} 
      initial="hidden" 
      animate="show"
    >
      {stats.map((stat, i) => (
        <motion.div key={i} variants={item}>
          <StatCard
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            progress={stat.progress + (i * 5)} // Vary progress for visual interest
            index={i}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

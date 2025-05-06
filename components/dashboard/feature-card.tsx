"use client"

import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface FeatureCardProps {
  title: string
  description: string
  icon: LucideIcon
  color: string
  link: string
}

export function FeatureCard({ title, description, icon: Icon, color, link }: FeatureCardProps) {
  return (
    <motion.div 
      whileHover={{ 
        y: -5, 
        transition: { duration: 0.2 },
        boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.1)" 
      }}
    >
      <Link href={link} className="block h-full">
        <Card className="h-full overflow-hidden hover:shadow-md transition-all duration-300 border-opacity-30 dark:border-opacity-20 backdrop-blur-sm">
          <div className="absolute inset-0 opacity-10 bg-gradient-to-br pointer-events-none" style={{
            background: `linear-gradient(to bottom right, var(--${color.split('-')[0]}-500), var(--${color.split('-')[1]}-600))`
          }} />
          
          <CardHeader className="pb-2 relative">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full bg-gradient-to-br ${color}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="relative">
            <CardDescription className="text-sm">{description}</CardDescription>
          </CardContent>
          
          <CardFooter className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-auto text-xs group relative overflow-hidden"
            >
              <span className="relative z-10">Explore</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500 group-hover:w-full transition-all duration-300"></span>
            </Button>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  )
}

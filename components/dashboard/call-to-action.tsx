"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"

interface CallToActionProps {
  title: string
  description: string
  primaryAction: {
    label: string
    href: string
    icon?: LucideIcon
  }
  secondaryAction?: {
    label: string
    href: string
  }
  visual?: ReactNode
}

export function CallToAction({ 
  title, 
  description, 
  primaryAction, 
  secondaryAction,
  visual
}: CallToActionProps) {
  const PrimaryIcon = primaryAction.icon
  
  return (
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
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-muted-foreground mb-4">
                  {description}
                </p>
                <div className="flex gap-3">
                  <Button 
                    className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 shadow-lg hover:shadow-blue-500/20 transition-all duration-300"
                  >
                    {PrimaryIcon && <PrimaryIcon className="mr-2 h-4 w-4" />}
                    {primaryAction.label}
                  </Button>
                  
                  {secondaryAction && (
                    <Button variant="outline" className="border-opacity-50 backdrop-blur-sm">
                      {secondaryAction.label}
                    </Button>
                  )}
                </div>
              </div>
              
              {visual && (
                <div className="w-full md:w-1/3 aspect-video rounded-lg overflow-hidden glass-card">
                  {visual}
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  )
}

"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface IntegrationCardProps {
  name: string
  description: string
  icon: ReactNode
  href: string
}

export function IntegrationCard({ name, description, icon, href }: IntegrationCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full overflow-hidden border border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/20 hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-xl">{name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm text-muted-foreground">
            {description}
          </CardDescription>
        </CardContent>
        <CardFooter className="pt-2">
          <Button variant="outline" size="sm" className="w-full gap-1" asChild>
            <Link href={href}>
              <span>Connect</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

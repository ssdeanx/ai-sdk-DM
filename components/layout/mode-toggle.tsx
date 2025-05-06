"use client"

import { motion } from "framer-motion"
import { Moon, Sun, Laptop } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative overflow-hidden rounded-full bg-background/80 backdrop-blur-sm hover:bg-accent/50"
        >
          <motion.div
            initial={{ opacity: 1, rotate: 0 }}
            animate={{
              opacity: theme === "dark" ? 0 : 1,
              rotate: theme === "dark" ? 45 : 0,
              scale: theme === "dark" ? 0.5 : 1
            }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Sun className="h-[0.9rem] w-[0.9rem] text-yellow-500" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, rotate: -45, scale: 0.5 }}
            animate={{
              opacity: theme === "dark" ? 1 : 0,
              rotate: theme === "dark" ? 0 : -45,
              scale: theme === "dark" ? 1 : 0.5
            }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Moon className="h-[0.9rem] w-[0.9rem] text-blue-300" />
          </motion.div>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl border border-border/40 bg-background/80 backdrop-blur-sm">
        <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer flex items-center gap-2">
          <div className="rounded-full bg-yellow-100 dark:bg-yellow-500/20 p-1">
            <Sun className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <span className="text-sm">Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer flex items-center gap-2">
          <div className="rounded-full bg-blue-100 dark:bg-blue-500/20 p-1">
            <Moon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm">Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer flex items-center gap-2">
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-1">
            <Laptop className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          </div>
          <span className="text-sm">System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

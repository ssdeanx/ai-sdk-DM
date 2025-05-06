"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MessageSquare,
  Database,
  Wrench,
  Bot,
  Network,
  FileText,
  Settings,
  Home,
  BarChart3,
  Layers,
  Code,
  Zap,
  Users,
  Sparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DatabaseStatus } from "@/components/ui/database-status"

interface MainSidebarProps {
  className?: string
}

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  submenu?: NavItem[]
}

export function MainSidebar({ className }: MainSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)

  // Automatically open submenu based on current path
  useEffect(() => {
    if (collapsed) return

    const items = navItems.flatMap((item) => (item.submenu ? [item] : []))
    for (const item of items) {
      if (item.submenu?.some((subitem) => pathname === subitem.href)) {
        setOpenSubmenu(item.title)
        break
      }
    }
  }, [pathname, collapsed])

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      title: "Chat",
      href: "/chat",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      title: "Models",
      href: "/models",
      icon: <Database className="h-4 w-4" />,
    },
    {
      title: "Tools",
      href: "/tools",
      icon: <Wrench className="h-4 w-4" />,
    },
    {
      title: "Agents",
      href: "/agents",
      icon: <Bot className="h-4 w-4" />,
    },
    {
      title: "Workflows",
      href: "/workflows",
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: "Content",
      href: "#",
      icon: <FileText className="h-4 w-4" />,
      submenu: [
        {
          title: "Blog",
          href: "/blog",
          icon: <FileText className="h-4 w-4" />,
        },
        {
          title: "MDX Builder",
          href: "/mdx-builder",
          icon: <Layers className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Networks",
      href: "/networks",
      icon: <Network className="h-4 w-4" />,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="h-4 w-4" />,
    },
  ]

  const toggleSubmenu = (title: string) => {
    if (collapsed) return
    setOpenSubmenu((prev) => (prev === title ? null : title))
  }

  // Animation variants
  const sidebarVariants = {
    expanded: { width: 240, transition: { duration: 0.2, ease: "easeInOut" } },
    collapsed: { width: 64, transition: { duration: 0.2, ease: "easeInOut" } },
  }

  const iconVariants = {
    expanded: { opacity: 0 },
    collapsed: { opacity: 1 },
  }

  const textVariants = {
    expanded: { opacity: 1, x: 0, display: "block" },
    collapsed: { opacity: 0, x: -10, display: "none", transition: { duration: 0.1 } },
  }

  return (
    <motion.div
      initial={false}
      animate={collapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      className={cn(
        "relative h-screen border-r bg-background shadow-sm z-20",
        collapsed ? "w-[64px]" : "w-[240px]",
        className
      )}
    >
      {/* Collapse toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-6 z-30 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
      </Button>

      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-12 items-center border-b px-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 p-1 flex-shrink-0"
            >
              <div className="h-5 w-5 rounded-full bg-background" />
            </motion.div>
            <motion.span
              variants={textVariants}
              className="text-sm font-medium truncate"
            >
              AI SDK Framework
            </motion.span>
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2 px-2">
          <nav className="grid gap-1">
            <TooltipProvider delayDuration={0}>
              {navItems.map((item) => {
                const isActive = item.href !== "#" && pathname === item.href
                const hasSubmenu = item.submenu && item.submenu.length > 0
                const isSubmenuOpen = openSubmenu === item.title
                const isSubmenuActive = hasSubmenu && item.submenu?.some((subItem) => pathname === subItem.href)

                if (hasSubmenu) {
                  return (
                    <div key={item.title} className="relative">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "w-full justify-start h-9",
                              (isActive || isSubmenuActive) && "bg-accent text-accent-foreground",
                              collapsed && "justify-center px-0",
                            )}
                            onClick={() => toggleSubmenu(item.title)}
                          >
                            <span className={cn("flex items-center justify-center", !collapsed && "mr-2")}>
                              {item.icon}
                            </span>
                            <motion.span
                              variants={textVariants}
                              className="truncate"
                            >
                              {item.title}
                            </motion.span>
                            {!collapsed && (
                              <ChevronRight
                                className={cn("ml-auto h-4 w-4 transition-transform", isSubmenuOpen && "rotate-90")}
                              />
                            )}
                          </Button>
                        </TooltipTrigger>
                        {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                      </Tooltip>

                      <AnimatePresence>
                        {!collapsed && isSubmenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-accent pl-2">
                              {item.submenu?.map((subItem) => {
                                const isSubActive = pathname === subItem.href
                                return (
                                  <Link key={subItem.title} href={subItem.href}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "w-full justify-start h-8",
                                        isSubActive && "bg-accent/50 text-accent-foreground",
                                      )}
                                    >
                                      <span className="mr-2">{subItem.icon}</span>
                                      <span className="truncate text-sm">{subItem.title}</span>
                                    </Button>
                                  </Link>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                }

                return (
                  <Tooltip key={item.title}>
                    <TooltipTrigger asChild>
                      <Link href={item.href} className="block">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "w-full justify-start h-9",
                            isActive && "bg-accent text-accent-foreground",
                            collapsed && "justify-center px-0",
                          )}
                        >
                          <span className={cn("flex items-center justify-center", !collapsed && "mr-2")}>
                            {item.icon}
                          </span>
                          <motion.span
                            variants={textVariants}
                            className="truncate"
                          >
                            {item.title}
                          </motion.span>
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                  </Tooltip>
                )
              })}
            </TooltipProvider>
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-3">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <DatabaseStatus />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Database Status</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Database</span>
              <DatabaseStatus />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

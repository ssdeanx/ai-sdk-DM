"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from "framer-motion"
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
  Rocket,
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
      href: "/dashboard",
      icon: <Home className="h-4 w-4" />,
    },
    {
      title: "Chat",
      href: "/chat",
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: "Demo Chat",
      href: "/demo-chat",
      icon: <Sparkles className="h-4 w-4" />,
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

  // Mouse position for hover effects
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - left)
    mouseY.set(e.clientY - top)
  }

  // Animation variants
  const sidebarVariants = {
    expanded: {
      width: 240,
      transition: {
        duration: 0.3,
        ease: [0.3, 0.1, 0.3, 1]
      }
    },
    collapsed: {
      width: 64,
      transition: {
        duration: 0.3,
        ease: [0.3, 0.1, 0.3, 1]
      }
    },
  }

  const iconVariants = {
    expanded: { opacity: 0 },
    collapsed: { opacity: 1 },
  }

  const textVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      display: "block",
      transition: {
        duration: 0.3,
        ease: [0.3, 0.1, 0.3, 1],
        delay: 0.1
      }
    },
    collapsed: {
      opacity: 0,
      x: -10,
      display: "none",
      transition: {
        duration: 0.2,
        ease: [0.3, 0.1, 0.3, 1]
      }
    },
  }

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  }

  return (
    <motion.div
      initial={false}
      animate={collapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      onMouseMove={handleMouseMove}
      className={cn(
        "relative h-screen border-r bg-background/80 backdrop-blur-md shadow-sm z-20 overflow-hidden",
        collapsed ? "w-[64px]" : "w-[240px]",
        className
      )}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-purple-600/5 opacity-0 group-hover:opacity-100 pointer-events-none"
        animate={{
          opacity: [0.05, 0.1, 0.05],
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'linear',
        }}
      />
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
        <div className="flex h-16 items-center border-b px-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold group">
            <div className="relative flex items-center justify-center">
              <motion.div
                initial={{ rotate: 0, scale: 1 }}
                animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                transition={{
                  rotate: { duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                  scale: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 opacity-70 blur-sm"
              />
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-600 to-indigo-500 opacity-70 blur-[2px]"
              />
              <div className="relative h-7 w-7 rounded-full bg-background flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </div>
            <motion.div
              variants={textVariants}
              className="flex flex-col"
            >
              <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-purple-600">
                DeanmachinesAI
              </span>
              <span className="text-xs text-muted-foreground">Advanced AI Platform</span>
            </motion.div>
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
                        <motion.div
                          whileHover="hover"
                          whileTap="tap"
                          initial="rest"
                          variants={buttonVariants}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "w-full justify-start h-9 relative overflow-hidden group",
                              isActive ? "bg-gradient-to-r from-cyan-500/10 to-purple-600/10 text-foreground" : "hover:bg-accent/30",
                              collapsed && "justify-center px-0",
                            )}
                          >
                            {isActive && (
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100"
                                animate={{
                                  opacity: [0.5, 0.8, 0.5],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  repeatType: 'reverse',
                                }}
                              />
                            )}
                            <span className={cn(
                              "flex items-center justify-center relative z-10",
                              !collapsed && "mr-2",
                              isActive && "text-primary"
                            )}>
                              {item.icon}
                            </span>
                            <motion.span
                              variants={textVariants}
                              className={cn(
                                "truncate relative z-10",
                                isActive && "font-medium"
                              )}
                            >
                              {item.title}
                            </motion.span>
                            {isActive && !collapsed && (
                              <motion.div
                                layoutId="nav-active-indicator"
                                className="absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              />
                            )}
                          </Button>
                        </motion.div>
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

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
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Chat",
      href: "/chat",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      title: "Models",
      href: "/models",
      icon: <Database className="h-5 w-5" />,
    },
    {
      title: "Tools",
      href: "/tools",
      icon: <Wrench className="h-5 w-5" />,
    },
    {
      title: "Agents",
      href: "/agents",
      icon: <Bot className="h-5 w-5" />,
    },
    {
      title: "Content",
      href: "#",
      icon: <FileText className="h-5 w-5" />,
      submenu: [
        {
          title: "Blog",
          href: "/blog",
          icon: <FileText className="h-4 w-4" />,
        },
        {
          title: "MDX Builder",
          href: "/mdx-builder",
          icon: <FileText className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Networks",
      href: "/networks",
      icon: <Network className="h-5 w-5" />,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  const toggleSubmenu = (title: string) => {
    if (collapsed) return
    setOpenSubmenu((prev) => (prev === title ? null : title))
  }

  return (
    <AnimatePresence initial={false}>
      <motion.div
        initial={{ width: collapsed ? 20 : 240 }}
        animate={{ width: collapsed ? 20 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn("relative h-screen border-r bg-background", className)}
      >
        {/* Collapse toggle button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-background shadow-md"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          <span className="sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
        </Button>

        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center border-b px-3">
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 p-1"
                >
                  <div className="h-5 w-5 rounded-full bg-background" />
                </motion.div>
                {!collapsed && <span>AI SDK Framework</span>}
              </Link>
            )}
            {collapsed && (
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="mx-auto rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 p-1"
              >
                <div className="h-5 w-5 rounded-full bg-background" />
              </motion.div>
            )}
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-2">
            <nav className="grid gap-1 px-2">
              <TooltipProvider delayDuration={0}>
                {navItems.map((item) => {
                  const isActive = item.href !== "#" && pathname === item.href
                  const hasSubmenu = item.submenu && item.submenu.length > 0
                  const isSubmenuOpen = openSubmenu === item.title
                  const isSubmenuActive = hasSubmenu && item.submenu?.some((subItem) => pathname === subItem.href)

                  if (hasSubmenu) {
                    return (
                      <div key={item.title}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start",
                                (isActive || isSubmenuActive) && "bg-accent text-accent-foreground",
                                collapsed && "justify-center px-0",
                              )}
                              onClick={() => toggleSubmenu(item.title)}
                            >
                              {item.icon}
                              {!collapsed && (
                                <>
                                  <span className="ml-2">{item.title}</span>
                                  <ChevronRight
                                    className={cn("ml-auto h-4 w-4 transition-transform", isSubmenuOpen && "rotate-90")}
                                  />
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                        </Tooltip>

                        {!collapsed && isSubmenuOpen && (
                          <div className="ml-4 mt-1 space-y-1">
                            {item.submenu?.map((subItem) => {
                              const isSubActive = pathname === subItem.href
                              return (
                                <Link key={subItem.title} href={subItem.href}>
                                  <Button
                                    variant="ghost"
                                    className={cn(
                                      "w-full justify-start",
                                      isSubActive && "bg-accent text-accent-foreground",
                                    )}
                                  >
                                    {subItem.icon}
                                    <span className="ml-2">{subItem.title}</span>
                                  </Button>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return (
                    <Tooltip key={item.title}>
                      <TooltipTrigger asChild>
                        <Link href={item.href}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start",
                              isActive && "bg-accent text-accent-foreground",
                              collapsed && "justify-center px-0",
                            )}
                          >
                            {item.icon}
                            {!collapsed && <span className="ml-2">{item.title}</span>}
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
    </AnimatePresence>
  )
}

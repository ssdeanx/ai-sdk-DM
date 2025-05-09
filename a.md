# nav

```ts
"use client"

import * as React from "react"
import { useCallback, useState, useEffect, memo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
  useReducedMotion,
  useScroll,
  useInView
} from "framer-motion"
import {
  Menu,
  X,
  Home,
  LayoutDashboard,
  Zap,
  CreditCard,
  FileText,
  Info,
  ChevronDown,
  Bell,
  Search,
  User,
  Github,
  Twitter,
  Linkedin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Command,
  Keyboard,
  Settings,
  MessageSquare,
  Sun,
  Moon
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ModeToggle } from "@/components/layout/mode-toggle"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { SignUpDialog } from "@/components/auth/sign-up-dialog"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuShortcut
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command"

/**
 * MainNav Component
 *
 * Enhanced navigation component with advanced animations, search functionality,
 * command palette, and responsive design.
 */
export const MainNav = memo(function MainNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const prefersReducedMotion = useReducedMotion()
  const isMobile = useMediaQuery("(max-width: 768px)")

  // State management
  const [isOpen, setIsOpen] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState(3)
  const [commandOpen, setCommandOpen] = useState(false)
  const [lastActivity, setLastActivity] = useState<number>(Date.now())

  // Refs for animations and interactions
  const navRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Check if nav is in view
  const navInView = useInView(navRef, { once: true })

  // Motion values for animations
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring animations for smoother motion
  const springConfig = { stiffness: 300, damping: 30 }
  const mouseXSpring = useSpring(mouseX, springConfig)
  const mouseYSpring = useSpring(mouseY, springConfig)

  // Transform values for hover effects
  const rotateX = useTransform(mouseYSpring, [0, 100], prefersReducedMotion ? [0, 0] : [2, -2])
  const rotateY = useTransform(mouseXSpring, [0, 200], prefersReducedMotion ? [0, 0] : [-2, 2])

  // Scroll progress for animations
  const { scrollYProgress } = useScroll()
  const navOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])
  const navScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.98])

  // Handle mouse movement for hover effects
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - left)
    mouseY.set(e.clientY - top)
    setLastActivity(Date.now())
  }, [mouseX, mouseY])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+K or Ctrl+K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }

      // Escape to close search
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false)
      }

      setLastActivity(Date.now())
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSearch])

  // Focus search input when search is shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  // Handle search submission
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      toast({
        title: "Search submitted",
        description: `Searching for "${searchQuery}"`,
        duration: 2000,
      })
      // In a real app, you would navigate to search results
      // router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setShowSearch(false)
    }
  }, [searchQuery, toast])

  // Enhanced routes with additional metadata
  const routes = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
      icon: <Home className="h-4 w-4" />,
      description: "Return to the homepage",
      shortcut: "h",
      isNew: false,
      badge: null
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      active: pathname === "/dashboard" || pathname?.startsWith("/dashboard/"),
      icon: <LayoutDashboard className="h-4 w-4" />,
      description: "View your AI dashboard",
      shortcut: "d",
      isNew: false,
      badge: null
    },
    {
      href: "/features",
      label: "Features",
      active: pathname === "/features",
      icon: <Zap className="h-4 w-4" />,
      description: "Explore platform features",
      shortcut: "f",
      isNew: true,
      badge: "New"
    },
    {
      href: "/pricing",
      label: "Pricing",
      active: pathname === "/pricing",
      icon: <CreditCard className="h-4 w-4" />,
      description: "View pricing plans",
      shortcut: "p",
      isNew: false,
      badge: null
    },
    {
      href: "/blog",
      label: "Blog",
      active: pathname === "/blog" || pathname?.startsWith("/blog/"),
      icon: <FileText className="h-4 w-4" />,
      description: "Read our latest articles",
      shortcut: "b",
      isNew: false,
      badge: null
    },
    {
      href: "/about",
      label: "About",
      active: pathname === "/about",
      icon: <Info className="h-4 w-4" />,
      description: "Learn more about us",
      shortcut: "a",
      isNew: false,
      badge: null
    },
  ]

  // Command palette items for quick navigation
  const commandItems = [
    ...routes,
    {
      href: "/settings",
      label: "Settings",
      active: pathname === "/settings",
      icon: <Settings className="h-4 w-4" />,
      description: "Manage your account settings",
      shortcut: "s",
      isNew: false,
      badge: null
    },
    {
      href: "/chat",
      label: "Chat",
      active: pathname === "/chat",
      icon: <MessageSquare className="h-4 w-4" />,
      description: "Open AI chat interface",
      shortcut: "c",
      isNew: false,
      badge: null
    }
  ]

  return (
    <>
      <motion.div
        ref={navRef}
        className="flex items-center justify-between py-4"
        onMouseMove={handleMouseMove}
        style={{
          opacity: navOpacity,
          scale: navScale
        }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2 group">
            <motion.div
              initial={{ rotate: 0, scale: 1 }}
              animate={{
                rotate: prefersReducedMotion ? 0 : 360,
                scale: prefersReducedMotion ? 1 : [1, 1.05, 1]
              }}
              transition={{
                rotate: { duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                scale: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
              }}
              className="relative"
              style={{
                rotateX,
                rotateY,
                transformPerspective: 1000
              }}
            >
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 via-teal-500 to-blue-600 opacity-70 blur-sm"
                animate={{
                  rotate: prefersReducedMotion ? 0 : [0, 360],
                  scale: prefersReducedMotion ? 1 : [1, 1.05, 1]
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-cyan-600 to-teal-500 opacity-70 blur-[2px]"
                animate={{
                  rotate: prefersReducedMotion ? 0 : [0, -360]
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
              <div className="relative h-7 w-7 rounded-full bg-background flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
            </motion.div>
            <motion.span
              className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              DeanmachinesAI
            </motion.span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6">
            <AnimatePresence>
              {routes.map((route, index) => (
                <TooltipProvider key={route.href} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ y: prefersReducedMotion ? 0 : -2 }}
                      >
                        <Link
                          href={route.href}
                          className={cn(
                            "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5",
                            route.active ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {route.icon}
                          <span>{route.label}</span>
                          {route.isNew && (
                            <Badge className="ml-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700">
                              {route.badge}
                            </Badge>
                          )}
                        </Link>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="flex items-center gap-2">
                      <p>{route.description}</p>
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>{route.shortcut}
                      </kbd>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </AnimatePresence>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Enhanced Search with form submission */}
          <AnimatePresence>
            {showSearch ? (
              <motion.form
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "250px", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative hidden md:flex"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (searchQuery.trim()) {
                    toast({
                      title: "Search submitted",
                      description: `Searching for "${searchQuery}"`,
                      duration: 2000,
                    })
                    setShowSearch(false)
                  }
                }}
              >
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-lg bg-background pr-8"
                  aria-label="Search"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-9 w-9"
                  onClick={() => setShowSearch(false)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close search</span>
                </Button>
              </motion.form>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="hidden md:flex"
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setShowSearch(true)}
                        aria-label="Search"
                      >
                        <Search className="h-4 w-4" />
                        <span className="sr-only">Search</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="flex items-center gap-2">
                      <p>Search</p>
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>K
                      </kbd>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced Notifications with animation */}
          <div className="hidden md:flex">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 relative"
                    aria-label={`Notifications (${notifications} unread)`}
                  >
                    <Bell className="h-4 w-4" />
                    {notifications > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{
                          scale: [1, 1.2, 1],
                          transition: {
                            repeat: 3,
                            repeatType: "reverse",
                            duration: 0.3
                          }
                        }}
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center"
                      >
                        <span className="text-[10px] font-medium text-white">{notifications}</span>
                      </motion.div>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Enhanced User Menu */}
          <div className="hidden md:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 relative overflow-hidden group"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                  <User className="h-4 w-4" />
                  <span>Account</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowSignIn(true)}
                  className="flex justify-between items-center"
                >
                  <span>Sign In</span>
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    S
                  </kbd>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowSignUp(true)}
                  className="flex justify-between items-center"
                >
                  <span>Sign Up</span>
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    U
                  </kbd>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 border-none relative overflow-hidden group"
              onClick={() => setShowSignUp(true)}
            >
              <motion.div
                className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.4 }}
              />
              <span className="relative z-10">Get Started</span>
            </Button>
          </div>

          <ModeToggle />

          {/* Enhanced Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Menu">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] sm:w-[350px]">
              <div className="flex flex-col space-y-4 mt-8">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 p-2 rounded-md",
                      route.active ? "text-primary bg-primary/10" : "text-muted-foreground",
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    {route.icon}
                    <span>{route.label}</span>
                    {route.isNew && (
                      <Badge className="ml-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700">
                        {route.badge}
                      </Badge>
                    )}
                    <span className="ml-auto opacity-60 text-xs">{route.shortcut.toUpperCase()}</span>
                  </Link>
                ))}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Notifications</span>
                    {notifications > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {notifications} new
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Theme</span>
                    <ModeToggle />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSignIn(true)
                      setIsOpen(false)
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 border-none"
                    onClick={() => {
                      setShowSignUp(true)
                      setIsOpen(false)
                    }}
                  >
                    Sign Up
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </motion.div>

      {/* Command Palette Dialog */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {commandItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  router.push(item.href)
                  setCommandOpen(false)
                }}
              >
                <div className="mr-2 flex h-4 w-4 items-center justify-center">
                  {item.icon}
                </div>
                <span>{item.label}</span>
                {item.shortcut && (
                  <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>{item.shortcut}
                  </kbd>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => {
              document.documentElement.classList.toggle('dark')
              setCommandOpen(false)
            }}>
              <div className="mr-2 flex h-4 w-4 items-center justify-center">
                {document.documentElement.classList.contains('dark') ?
                  <Sun className="h-4 w-4" /> :
                  <Moon className="h-4 w-4" />
                }
              </div>
              <span>Toggle Theme</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>T
              </kbd>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Authentication Dialogs */}
      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
      <SignUpDialog open={showSignUp} onOpenChange={setShowSignUp} />
    </>
  )
})
```

```json
{
  "name": "deanmachinesAI",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "migrate:generate:supabase": "drizzle-kit generate --config drizzle.supabase.config.ts --name",
    "migrate:generate:libsql": "drizzle-kit generate --config drizzle.libsql.config.ts --name",
    "migrate:up:supabase": "drizzle-kit up --config drizzle.supabase.config.ts",
    "migrate:up:libsql": "drizzle-kit up --config drizzle.libsql.config.ts",
    "migrate:down:supabase": "drizzle-kit down --config drizzle.supabase.config.ts",
    "migrate:down:libsql": "drizzle-kit down --config drizzle.libsql.config.ts",
    "migrate:all": "pnpm migrate:generate:supabase init && pnpm migrate:up:supabase && pnpm migrate:generate:libsql init && pnpm migrate:up:libsql"
  },
  "dependencies": {
    "@agentic/ai-sdk": "^7.6.4",
    "@agentic/arxiv": "^7.6.4",
    "@agentic/brave-search": "^7.6.4",
    "@agentic/calculator": "^7.6.4",
    "@agentic/core": "^7.6.4",
    "@agentic/e2b": "^7.6.4",
    "@agentic/exa": "^7.6.4",
    "@agentic/firecrawl": "^7.6.4",
    "@agentic/github": "^7.6.4",
    "@agentic/google-custom-search": "^7.6.4",
    "@agentic/langchain": "^7.6.4",
    "@agentic/llamaindex": "^7.6.4",
    "@agentic/mcp": "^7.6.4",
    "@agentic/polygon": "^7.6.4",
    "@agentic/reddit": "^7.6.4",
    "@agentic/stdlib": "^7.6.4",
    "@agentic/wikidata": "^7.6.4",
    "@agentic/wikipedia": "^7.6.4",
    "@ai-sdk/anthropic": "^1.2.11",
    "@ai-sdk/google": "^1.2.17",
    "@ai-sdk/google-vertex": "^2.2.21",
    "@ai-sdk/openai": "^1.3.22",
    "@ai-sdk/react": "^1.2.12",
    "@ai-sdk/rsc": "1.0.0-canary.18",
    "@babel/runtime": "^7.27.1",
    "@codemirror/lang-javascript": "^6.2.3",
    "@codemirror/lang-json": "^6.0.1",
    "@codemirror/state": "^6.5.2",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@codemirror/view": "^6.36.7",
    "@e2b/code-interpreter": "^1.5.0",
    "@emotion/is-prop-valid": "^1.3.1",
    "@googleapis/customsearch": "^3.2.0",
    "@hookform/resolvers": "^5.0.1",
    "@langchain/community": "0.3.41",
    "@langchain/core": "^0.3.54",
    "@langchain/google-genai": "^0.2.6",
    "@langchain/langgraph": "^0.2.68",
    "@libsql/client": "^0.15.4",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/auto-instrumentations-node": "^0.58.1",
    "@opentelemetry/context-async-hooks": "^2.0.0",
    "@opentelemetry/core": "^2.0.0",
    "@opentelemetry/exporter-metrics-otlp-proto": "^0.200.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.200.0",
    "@opentelemetry/propagator-b3": "^2.0.0",
    "@opentelemetry/resources": "^2.0.0",
    "@opentelemetry/sdk-logs": "^0.200.0",
    "@opentelemetry/sdk-metrics": "^2.0.0",
    "@opentelemetry/sdk-node": "^0.200.0",
    "@opentelemetry/sdk-trace-base": "^2.0.0",
    "@opentelemetry/sdk-trace-node": "^2.0.0",
    "@opentelemetry/semantic-conventions": "^1.33.0",
    "@radix-ui/react-accordion": "1.2.10",
    "@radix-ui/react-alert-dialog": "1.1.13",
    "@radix-ui/react-aspect-ratio": "1.1.6",
    "@radix-ui/react-avatar": "1.1.9",
    "@radix-ui/react-checkbox": "1.3.1",
    "@radix-ui/react-collapsible": "1.1.10",
    "@radix-ui/react-context-menu": "2.2.14",
    "@radix-ui/react-dialog": "1.1.13",
    "@radix-ui/react-dropdown-menu": "2.1.14",
    "@radix-ui/react-hover-card": "1.1.13",
    "@radix-ui/react-icons": "^1.3.2",
    "@radix-ui/react-label": "2.1.6",
    "@radix-ui/react-menubar": "1.1.14",
    "@radix-ui/react-navigation-menu": "1.2.12",
    "@radix-ui/react-popover": "1.1.13",
    "@radix-ui/react-progress": "1.1.6",
    "@radix-ui/react-radio-group": "1.3.6",
    "@radix-ui/react-scroll-area": "1.2.8",
    "@radix-ui/react-select": "2.2.4",
    "@radix-ui/react-separator": "1.1.6",
    "@radix-ui/react-slider": "1.3.4",
    "@radix-ui/react-slot": "1.2.2",
    "@radix-ui/react-switch": "1.2.4",
    "@radix-ui/react-tabs": "1.1.11",
    "@radix-ui/react-toast": "1.2.13",
    "@radix-ui/react-toggle": "1.1.8",
    "@radix-ui/react-toggle-group": "1.1.9",
    "@radix-ui/react-tooltip": "^1.2.6",
    "@supabase/realtime-js": "^2.11.7",
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.49.4",
    "@tailwindcss/typography": "^0.5.16",
    "@tanstack/react-table": "^8.21.3",
    "@types/d3": "^7.4.3",
    "@uiw/codemirror-theme-vscode": "^4.23.12",
    "@uiw/react-codemirror": "^4.23.12",
    "@upstash/qstash": "^2.8.0",
    "@upstash/redis": "^1.34.9",
    "@upstash/semantic-cache": "^1.0.5",
    "@upstash/vector": "^1.2.1",
    "@upstash/workflow": "^0.2.12",
    "@xenova/transformers": "^2.17.2",
    "ai": "^4.3.15",
    "autoprefixer": "^10.4.21",
    "chart.js": "^4.4.9",
    "cheerio": "^1.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "codemirror": "^6.0.1",
    "d3": "^7.9.0",
    "date-fns": "4.1.0",
    "dotenv": "^16.5.0",
    "drizzle-orm": "^0.43.1",
    "embla-carousel-react": "8.6.0",
    "exit-hook": "^4.0.0",
    "fast-xml-parser": "^5.2.2",
    "framer-motion": "^12.10.1",
    "fs-extra": "^11.3.0",
    "geist": "^1.4.2",
    "graphql": "^16.11.0",
    "graphql-request": "^7.1.2",
    "gray-matter": "^4.0.3",
    "html2canvas": "^1.4.1",
    "input-otp": "1.4.2",
    "js-tiktoken": "^1.0.20",
    "js-yaml": "^4.1.0",
    "jsdom": "^26.1.0",
    "json": "^11.0.0",
    "json-schema": "^0.4.0",
    "ky": "^1.8.1",
    "langchain": "^0.3.24",
    "langfuse": "^3.37.2",
    "leaflet": "^1.9.4",
    "llamaindex": "^0.9.19",
    "lru-cache": "^11.1.0",
    "lucide-react": "^0.508.0",
    "mammoth": "^1.9.0",
    "markdown-table": "^3.0.4",
    "marked": "^15.0.11",
    "mathjs": "^14.4.0",
    "mermaid": "^11.6.0",
    "nanoid": "^5.1.5",
    "next": "15.3.2",
    "next-mdx-remote": "^5.0.0",
    "next-themes": "^0.4.6",
    "node-fetch": "^3.3.2",
    "octokit": "^4.1.3",
    "p-throttle": "^6.2.0",
    "papaparse": "^5.5.2",
    "pdf-parse": "^1.1.1",
    "plotly": "^1.0.6",
    "postgres": "^3.4.5",
    "react": "^19.1.0",
    "react-day-picker": "9.6.7",
    "react-dom": "^19.1.0",
    "react-hook-form": "^7.56.2",
    "react-leaflet": "^5.0.0",
    "react-resizable-panels": "^3.0.1",
    "react-syntax-highlighter": "^15.6.1",
    "recharts": "2.15.3",
    "remark-gfm": "^4.0.1",
    "remarks": "^0.3.4",
    "sharp": "^0.34.1",
    "sonner": "^2.0.3",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "three.js": "^0.77.1",
    "type-fest": "^4.41.0",
    "uuid": "^11.1.0",
    "vaul": "^1.1.2",
    "wikibase-sdk": "^10.2.3",
    "xml2js": "^0.6.2",
    "xmldom": "^0.6.0",
    "yaml": "^2.7.1",
    "zod": "^3.24.4",
    "zod-to-json-schema": "^3.24.5"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.1",
    "@types/fs-extra": "^11.0.4",
    "@types/js-yaml": "^4.0.9",
    "@types/jsdom": "^21.1.7",
    "@types/leaflet": "^1.9.17",
    "@types/node": "^22.15.15",
    "@types/papaparse": "^5.3.16",
    "@types/pdf-parse": "^1.1.5",
    "@types/react": "^19.1.3",
    "@types/react-dom": "^19.1.3",
    "@types/react-syntax-highlighter": "^15.5.13",
    "@types/xml2js": "^0.4.14",
    "@typescript-eslint/eslint-plugin": "^8.32.0",
    "@typescript-eslint/parser": "^8.32.0",
    "drizzle-kit": "^0.31.1",
    "plotly.js-dist": "^3.0.1",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.3",
    "typescript-eslint": "^8.32.0"
  }
}
```

```ts
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "slide-in-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-out-bottom": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "slide-in-bottom": "slide-in-bottom 0.3s ease-out",
        "slide-out-bottom": "slide-out-bottom 0.3s ease-out",
        "spin-slow": "spin-slow 3s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config

export default config
```
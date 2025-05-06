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

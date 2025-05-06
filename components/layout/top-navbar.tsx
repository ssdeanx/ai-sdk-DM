"use client"

import { useState, useEffect, useRef, memo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView
} from "framer-motion"
import {
  Menu,
  X,
  ChevronDown,
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Home,
  Github as GithubIcon, // Keep deprecated GitHub icon as requested
  Database,
  Rocket,
  Sparkles,
  Code,
  Zap,
  MessageSquare,
  Activity
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ModeToggle } from "@/components/layout/mode-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { SignUpDialog } from "@/components/auth/sign-up-dialog"

export const TopNavbar = memo(function TopNavbar() {
  const pathname = usePathname()
  // Router is used for programmatic navigation in production
  const router = useRouter()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [notifications, setNotifications] = useState(3)

  // Function to navigate programmatically (for future use)
  const navigateTo = (path: string) => {
    router.push(path)
  }

  // Scroll animation
  const { scrollY } = useScroll()
  const navbarOpacity = useTransform(scrollY, [0, 50], [0.5, 0.95])
  const navbarHeight = useTransform(scrollY, [0, 50], ["4rem", "3.5rem"])
  const logoScale = useTransform(scrollY, [0, 50], [1, 0.9])

  // Update scrolled state for mobile and handle navigation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    // Apply scrolled state to header styling
    const header = document.querySelector('header')
    if (header) {
      if (scrolled) {
        header.classList.add('scrolled')
        // Example of using navigateTo in a real application
        // if (someCondition) navigateTo('/dashboard')
      } else {
        header.classList.remove('scrolled')
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [scrolled])

  // Set up route change handler for analytics
  useEffect(() => {
    // Function to handle route changes
    function handleRouteChange() {
      // Reset search when navigating
      setIsSearchOpen(false)

      // Update notifications based on current path
      if (pathname.includes('/dashboard')) {
        setNotifications(3)
      } else if (pathname.includes('/chat')) {
        setNotifications(1)
      } else {
        setNotifications(0)
      }

      // Analytics tracking would go here in production
      console.log(`Route changed to: ${pathname}`)
    }

    // Call the function once on mount
    handleRouteChange()

    // This would be used in production with Next.js router events
    // router.events.on('routeChangeComplete', handleRouteChange)
    // return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [pathname])

  // Mouse position for hover effects
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring animations for smoother motion
  const springConfig = { stiffness: 300, damping: 30 }
  const mouseXSpring = useSpring(mouseX, springConfig)
  const mouseYSpring = useSpring(mouseY, springConfig)

  // Transform values for hover effects
  const rotateX = useTransform(mouseYSpring, [0, 100], [1, -1])
  const rotateY = useTransform(mouseXSpring, [0, 200], [-1, 1])

  // Handle mouse movement for hover effects
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - left)
    mouseY.set(e.clientY - top)
  }

  // References for animations
  const headerRef = useRef<HTMLDivElement>(null)

  // Use header in-view state for animations
  const isHeaderInView = useInView(headerRef, { once: true })

  // Apply header animations based on in-view state
  useEffect(() => {
    if (isHeaderInView) {
      // Add animation classes or styles when header comes into view
      const header = headerRef.current
      if (header) {
        header.style.opacity = "1"
        header.style.transform = "translateY(0)"
      }
    }
  }, [isHeaderInView])

  return (
    <motion.header
      ref={headerRef}
      className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{
        height: navbarHeight,
        backgroundColor: `rgba(var(--background), ${navbarOpacity.get()})`,
        borderColor: `rgba(var(--border), ${navbarOpacity.get() / 3})`,
      }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onMouseMove={handleMouseMove}
    >
      <div className="container flex h-full items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <motion.div
              style={{
                scale: logoScale,
                rotateX,
                rotateY,
                transformPerspective: 1000
              }}
              className="relative flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                initial={{ rotate: 0, scale: 1 }}
                animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                transition={{
                  rotate: { duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                  scale: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 via-emerald-500 to-blue-600 opacity-70 blur-sm"
              />
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-cyan-600 to-teal-500 opacity-70 blur-[2px]"
              />
              <div className="relative h-7 w-7 rounded-full bg-background flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </motion.div>
            <motion.span
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="hidden font-bold sm:inline-block text-sm bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600"
            >
              DeanmachinesAI
            </motion.span>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="mr-2 h-8 w-8 md:hidden">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <MobileNav setShowSignIn={setShowSignIn} setShowSignUp={setShowSignUp} />
          </SheetContent>
        </Sheet>

        {/* Search */}
        <div className={cn("flex-1 md:grow-0", isSearchOpen ? "flex" : "hidden md:flex")}>
          <form className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="h-8 w-full rounded-lg bg-background pl-8 md:w-[180px] lg:w-[240px]"
            />
          </form>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 md:hidden"
          onClick={() => setIsSearchOpen(!isSearchOpen)}
        >
          {isSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          <span className="sr-only">Toggle search</span>
        </Button>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="hidden md:flex items-center space-x-3">
            {/* Quick Navigation Buttons */}
            <motion.div
              className="flex items-center mr-2 bg-background/30 backdrop-blur-xl rounded-xl border border-border/20 p-1 shadow-sm overflow-hidden relative"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              whileHover={{ boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
            >
              {/* Animated background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-teal-500/5 to-blue-600/5"
                animate={{
                  backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'linear',
                }}
              />

              <AnimatePresence>
                {[
                  { id: "dashboard", label: "Dashboard", icon: <Home className="h-3.5 w-3.5" /> },
                  { id: "chat", label: "Chat", icon: <MessageSquare className="h-3.5 w-3.5" /> },
                  { id: "features", label: "Features", icon: <Rocket className="h-3.5 w-3.5" /> },
                  { id: "observability", label: "Observability", icon: <Activity className="h-3.5 w-3.5" /> },
                  { id: "settings", label: "Settings", icon: <Settings className="h-3.5 w-3.5" /> }
                ].map((item, index) => {
                  const isActive = pathname.includes(`/${item.id}`);

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        type: "spring",
                        stiffness: 300,
                        damping: 20
                      }}
                      className="relative"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          asChild
                          className={cn(
                            "rounded-lg h-8 w-8 text-muted-foreground hover:text-foreground relative overflow-hidden",
                            isActive && "text-foreground"
                          )}
                        >
                          <Link href={`/${item.id}`}>
                            {isActive && (
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-teal-500/10 to-blue-600/10"
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
                            <span className="relative z-10">{item.icon}</span>
                            <span className="sr-only">{item.label}</span>
                          </Link>
                        </Button>
                      </motion.div>

                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-gradient-to-r from-green-500 to-blue-600"
                          initial={{ opacity: 0, width: "0%" }}
                          animate={{ opacity: 1, width: "50%" }}
                          exit={{ opacity: 0, width: "0%" }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {/* Integrations Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    rotateX,
                    rotateY,
                    transformPerspective: 1000
                  }}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.2,
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative overflow-hidden gap-1.5 px-3 h-8 text-xs font-medium border-border/30 bg-background/50 backdrop-blur-md"
                  >
                    {/* Animated gradient background */}
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-teal-500/10 to-blue-600/10"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'linear',
                      }}
                    />

                    {/* Rotating icon background */}
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="absolute inset-0 rounded-md bg-gradient-to-r from-green-500/5 via-teal-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100"
                    />

                    {/* Icon with pulse effect */}
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut'
                      }}
                      className="relative z-10"
                    >
                      <Code className="h-3.5 w-3.5 text-green-500" />
                    </motion.div>

                    {/* Text with gradient */}
                    <motion.span
                      className="bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600 font-medium relative z-10"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      Integrations
                    </motion.span>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-1 bg-background/80 backdrop-blur-xl border border-border/20">
                <DropdownMenuLabel className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Connect Services
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/10" />
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <DropdownMenuItem
                    className="px-3 py-2 rounded-lg focus:bg-accent/50 focus:text-accent-foreground"
                    onSelect={() => navigateTo('/integrations/github')}
                  >
                    <div className="flex items-center w-full">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background mr-2">
                        <GithubIcon className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">GitHub</span>
                        <span className="text-xs text-muted-foreground">Connect repositories</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                >
                  <DropdownMenuItem
                    className="px-3 py-2 rounded-lg focus:bg-accent/50 focus:text-accent-foreground"
                    onSelect={() => navigateTo('/integrations/supabase')}
                  >
                    <div className="flex items-center w-full">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background mr-2">
                        <Database className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Supabase</span>
                        <span className="text-xs text-muted-foreground">Database integration</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <DropdownMenuItem
                    className="px-3 py-2 rounded-lg focus:bg-accent/50 focus:text-accent-foreground"
                    onSelect={() => navigateTo('/integrations/vercel')}
                  >
                    <div className="flex items-center w-full">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background mr-2">
                        <Rocket className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Vercel</span>
                        <span className="text-xs text-muted-foreground">Deployment platform</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
                <DropdownMenuSeparator className="bg-border/10 my-1" />
                <DropdownMenuItem
                  className="px-3 py-2 rounded-lg focus:bg-accent/50 focus:text-accent-foreground"
                  onSelect={() => navigateTo('/integrations')}
                >
                  <div className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground">
                    View All Integrations
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Super cutting-edge Sign In button */}
            <motion.div
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              style={{
                rotateX,
                rotateY,
                transformPerspective: 1000
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSignIn(true)}
                className="relative overflow-hidden group"
              >
                {/* Animated gradient background */}
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-teal-500/5 to-blue-600/5"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'linear',
                  }}
                />

                {/* Animated border effect */}
                <motion.span
                  className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.2), transparent)",
                  }}
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                {/* Text with hover effect */}
                <motion.span
                  className="relative z-10 bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-500 group-hover:to-purple-600"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Sign In
                </motion.span>
              </Button>
            </motion.div>

            {/* Super cutting-edge Sign Up button */}
            <motion.div
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              style={{
                rotateX,
                rotateY,
                transformPerspective: 1000
              }}
            >
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setShowSignUp(true)}
                className="relative overflow-hidden bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 border-none group"
              >
                {/* Animated light effect */}
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "linear",
                    repeatDelay: 0.5
                  }}
                />

                {/* Animated particles */}
                <motion.div className="absolute inset-0 overflow-hidden">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 rounded-full bg-white/60"
                      initial={{
                        x: `${Math.random() * 100}%`,
                        y: `${Math.random() * 100}%`,
                        scale: 0,
                        opacity: 0
                      }}
                      animate={{
                        y: [null, '-100%'],
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 1 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2
                      }}
                    />
                  ))}
                </motion.div>

                {/* Text with glow effect */}
                <motion.span
                  className="relative z-10 text-white font-medium"
                  whileHover={{
                    textShadow: "0 0 8px rgba(255, 255, 255, 0.5)"
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  Sign Up
                </motion.span>
              </Button>
            </motion.div>
            {/* Super cutting-edge Notifications button */}
            <motion.div
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              style={{
                rotateX,
                rotateY,
                transformPerspective: 1000
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 relative overflow-hidden group"
              >
                {/* Animated ring effect */}
                <motion.div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileHover={{
                    scale: 1.2,
                    opacity: 1,
                    background: "radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%)"
                  }}
                  transition={{ duration: 0.3 }}
                />

                {/* Notification dot with pulse effect */}
                {notifications > 0 && (
                  <motion.div
                    className="absolute top-1 right-1 h-4 w-4 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center text-[8px] font-bold text-white"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: 1,
                      boxShadow: [
                        "0 0 0 0 rgba(16, 185, 129, 0.7)",
                        "0 0 0 4px rgba(16, 185, 129, 0)",
                        "0 0 0 0 rgba(16, 185, 129, 0.7)"
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "loop"
                    }}
                  >
                    {notifications}
                  </motion.div>
                )}

                {/* Bell icon with subtle animation */}
                <motion.div
                  whileHover={{ rotate: [0, -5, 5, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Bell className="h-4 w-4 relative z-10" />
                </motion.div>

                <span className="sr-only">Notifications</span>
              </Button>
            </motion.div>
            <ModeToggle />
            {/* Super cutting-edge User Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  style={{
                    rotateX,
                    rotateY,
                    transformPerspective: 1000
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button variant="ghost" className="relative h-7 w-7 rounded-full p-0 overflow-hidden">
                    {/* Animated glow effect */}
                    <motion.div
                      className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(16, 185, 129, 0)",
                          "0 0 0 3px rgba(16, 185, 129, 0.3)",
                          "0 0 0 0 rgba(16, 185, 129, 0)"
                        ]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "loop"
                      }}
                    />

                    {/* Rotating gradient border */}
                    <motion.div
                      className="absolute inset-[-1px] rounded-full z-0"
                      style={{
                        background: "conic-gradient(from 0deg, rgba(16, 185, 129, 0.7), rgba(59, 130, 246, 0.7), rgba(16, 185, 129, 0.7))"
                      }}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />

                    {/* Avatar with subtle hover effect */}
                    <Avatar className="h-7 w-7 relative z-10 border-2 border-background">
                      <AvatarImage src="/placeholder.svg?height=28&width=28" alt="User" />
                      <AvatarFallback>
                        <motion.div
                          animate={{
                            background: [
                              "linear-gradient(45deg, #10b981, #3b82f6)",
                              "linear-gradient(225deg, #10b981, #3b82f6)",
                              "linear-gradient(45deg, #10b981, #3b82f6)"
                            ]
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            repeatType: "mirror"
                          }}
                          className="h-full w-full flex items-center justify-center text-white text-xs font-medium"
                        >
                          U
                        </motion.div>
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56 p-1 bg-background/80 backdrop-blur-xl border border-border/20" align="end" forceMount>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <DropdownMenuLabel className="font-normal px-3 py-2">
                    <div className="flex flex-col space-y-1">
                      <motion.p
                        className="text-sm font-medium leading-none bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                      >
                        User
                      </motion.p>
                      <motion.p
                        className="text-xs leading-none text-muted-foreground"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: 0.2 }}
                      >
                        user@example.com
                      </motion.p>
                    </div>
                  </DropdownMenuLabel>
                </motion.div>

                <DropdownMenuSeparator className="bg-border/10 my-1" />

                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <DropdownMenuItem className="px-3 py-2 rounded-lg focus:bg-accent/50 focus:text-accent-foreground group">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-foreground"
                    >
                      <User className="h-4 w-4" />
                    </motion.div>
                    <span>Profile</span>
                  </DropdownMenuItem>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                >
                  <DropdownMenuItem className="px-3 py-2 rounded-lg focus:bg-accent/50 focus:text-accent-foreground group">
                    <motion.div
                      whileHover={{ rotate: 90 }}
                      transition={{ duration: 0.3 }}
                      className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-foreground"
                    >
                      <Settings className="h-4 w-4" />
                    </motion.div>
                    <span>Settings</span>
                  </DropdownMenuItem>
                </motion.div>

                <DropdownMenuSeparator className="bg-border/10 my-1" />

                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.2 }}
                >
                  <DropdownMenuItem className="px-3 py-2 rounded-lg focus:bg-accent/50 focus:text-accent-foreground group">
                    <motion.div
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                      className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                    </motion.div>
                    <span>Log out</span>
                  </DropdownMenuItem>
                </motion.div>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
      <SignUpDialog open={showSignUp} onOpenChange={setShowSignUp} />
    </motion.header>
  )
})

const MobileNav = memo(function MobileNav({
  setShowSignIn,
  setShowSignUp
}: {
  setShowSignIn: (show: boolean) => void
  setShowSignUp: (show: boolean) => void
}) {
  const pathname = usePathname()
  const [openItems, setOpenItems] = useState<string[]>([])

  // Mobile notifications state
  const [mobileNotifications, setMobileNotifications] = useState(3)

  // Update notifications based on path
  useEffect(() => {
    if (pathname.includes('/dashboard')) {
      setMobileNotifications(3)
    } else if (pathname.includes('/chat')) {
      setMobileNotifications(1)
    } else {
      setMobileNotifications(0)
    }
  }, [pathname])

  const toggleItem = (item: string) => {
    setOpenItems((current) => (current.includes(item) ? current.filter((i) => i !== item) : [...current, item]))
  }

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
    },
    {
      title: "Chat",
      href: "/chat",
    },
    {
      title: "Demo Chat",
      href: "/demo-chat",
    },
    {
      title: "AI Configuration",
      items: [
        { title: "Models", href: "/models" },
        { title: "Tools", href: "/tools" },
        { title: "Agents", href: "/agents" },
      ],
    },
    {
      title: "Settings",
      href: "/settings",
    },
  ]

  return (
    <div className="flex flex-col space-y-6 p-4">
      <Link href="/dashboard" className="flex items-center space-x-2">
        <div className="relative flex items-center justify-center">
          <motion.div
            initial={{ rotate: 0, scale: 1 }}
            animate={{ rotate: 360, scale: [1, 1.05, 1] }}
            transition={{
              rotate: { duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
              scale: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
            }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 via-teal-500 to-blue-600 opacity-70 blur-sm"
          />
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-cyan-600 to-teal-500 opacity-70 blur-[2px]"
          />
          <div className="relative h-7 w-7 rounded-full bg-background flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
        </div>
        <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600">
          DeanmachinesAI
        </span>
      </Link>

      {/* Quick Navigation */}
      <div className="grid grid-cols-4 gap-2 p-1">
        {["dashboard", "chat", "features", "settings"].map((item, index) => {
          const isActive = pathname.includes(`/${item}`);
          const icons = {
            dashboard: <Home className="h-4 w-4" />,
            chat: <Zap className="h-4 w-4" />,
            features: <Rocket className="h-4 w-4" />,
            settings: <Settings className="h-4 w-4" />
          };
          const labels = {
            dashboard: "Home",
            chat: "Chat",
            features: "Features",
            settings: "Settings"
          };

          return (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href={`/${item}`}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-xl bg-background/30 backdrop-blur-md border border-border/20",
                  isActive && "bg-background/50 border-cyan-500/20 shadow-sm shadow-cyan-500/10"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg mb-1",
                  isActive ? "bg-gradient-to-br from-green-500/20 to-blue-600/20 text-foreground" : "text-muted-foreground"
                )}>
                  {icons[item as keyof typeof icons]}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? "bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600" : "text-muted-foreground"
                )}>
                  {labels[item as keyof typeof labels]}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Integrations Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Link
          href="/integrations"
          className="relative flex items-center justify-center w-full p-3 rounded-xl overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-teal-500/20 to-blue-600/20"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'linear',
            }}
          />
          <div className="relative flex items-center gap-3 z-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
              <Code className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600">
                Integrations
              </span>
              <span className="text-xs text-muted-foreground">
                Connect external services
              </span>
            </div>
          </div>
        </Link>
      </motion.div>

      <div className="flex flex-col space-y-2">
        {navItems.map((item) => (
          <div key={item.title}>
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {item.title}
              </Link>
            ) : (
              <>
                <button
                  onClick={() => toggleItem(item.title)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  {item.title}
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", openItems.includes(item.title) && "rotate-180")}
                  />
                </button>
                {openItems.includes(item.title) && item.items && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.title}
                        href={subItem.href}
                        className={cn(
                          "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                          pathname === subItem.href
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        {subItem.title}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-col space-y-3 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSignIn(true)}
        >
          Sign In
        </Button>
        <Button
          variant="gradient"
          size="sm"
          onClick={() => setShowSignUp(true)}
          className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 border-none"
        >
          Sign Up
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <ModeToggle />
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          {mobileNotifications > 0 && (
            <motion.div
              className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center text-[7px] font-bold text-white"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: 1,
                boxShadow: [
                  "0 0 0 0 rgba(16, 185, 129, 0.7)",
                  "0 0 0 4px rgba(16, 185, 129, 0)",
                  "0 0 0 0 rgba(16, 185, 129, 0.7)"
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "loop"
              }}
            >
              {mobileNotifications}
            </motion.div>
          )}
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>
      </div>
    </div>
  )
})
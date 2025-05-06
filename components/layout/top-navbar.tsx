"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { Menu, X, ChevronDown, Search, Bell, Settings, User, LogOut, Home, Layers, Github, Database, Rocket, Sparkles, Code, Zap } from "lucide-react"

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

export function TopNavbar() {
  const pathname = usePathname()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Scroll animation
  const { scrollY } = useScroll()
  const navbarOpacity = useTransform(scrollY, [0, 50], [0.5, 0.95])
  const navbarHeight = useTransform(scrollY, [0, 50], ["4rem", "3.5rem"])
  const logoScale = useTransform(scrollY, [0, 50], [1, 0.9])

  // Update scrolled state for mobile
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{
        height: navbarHeight,
        backgroundColor: `rgba(var(--background), ${navbarOpacity.get()})`,
        borderColor: `rgba(var(--border), ${navbarOpacity.get() / 3})`,
      }}
    >
      <div className="container flex h-full items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <motion.div
              style={{ scale: logoScale }}
              className="relative flex items-center justify-center"
            >
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
            </motion.div>
            <motion.span
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="hidden font-bold sm:inline-block text-sm bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-purple-600"
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
            <div className="flex items-center mr-2 bg-background/30 backdrop-blur-xl rounded-xl border border-border/20 p-1 shadow-sm">
              <AnimatePresence>
                {["dashboard", "chat", "features", "settings"].map((item, index) => {
                  const isActive = pathname.includes(`/${item}`);
                  const icons = {
                    dashboard: <Home className="h-3.5 w-3.5" />,
                    chat: <Zap className="h-3.5 w-3.5" />,
                    features: <Rocket className="h-3.5 w-3.5" />,
                    settings: <Settings className="h-3.5 w-3.5" />
                  };

                  return (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="relative"
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        asChild
                        className={cn(
                          "rounded-lg h-8 w-8 text-muted-foreground hover:text-foreground relative",
                          isActive && "text-foreground"
                        )}
                      >
                        <Link href={`/${item}`}>
                          {icons[item as keyof typeof icons]}
                          <span className="sr-only">{item.charAt(0).toUpperCase() + item.slice(1)}</span>
                        </Link>
                      </Button>
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Integrations Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative overflow-hidden gap-1.5 px-3 h-8 text-xs font-medium border-border/30 bg-background/50 backdrop-blur-md"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-600/10 opacity-0"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-600/5 opacity-0 group-hover:opacity-100"
                    />
                    <Code className="h-3.5 w-3.5 text-cyan-500" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-purple-600 font-medium">Integrations</span>
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
                  <DropdownMenuItem asChild className="px-3 py-2 rounded-lg focus:bg-accent/50 focus:text-accent-foreground">
                    <Link href="/integrations/github" className="flex items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background mr-2">
                        <Github className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">GitHub</span>
                        <span className="text-xs text-muted-foreground">Connect repositories</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                >
                  <DropdownMenuItem asChild className="px-3 py-2 rounded-lg focus:bg-accent/50 focus:text-accent-foreground">
                    <Link href="/integrations/supabase" className="flex items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background mr-2">
                        <Database className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Supabase</span>
                        <span className="text-xs text-muted-foreground">Database integration</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <DropdownMenuItem asChild className="px-3 py-2 rounded-lg focus:bg-accent/50 focus:text-accent-foreground">
                    <Link href="/integrations/vercel" className="flex items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background mr-2">
                        <Rocket className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Vercel</span>
                        <span className="text-xs text-muted-foreground">Deployment platform</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </motion.div>
                <DropdownMenuSeparator className="bg-border/10 my-1" />
                <DropdownMenuItem asChild className="px-3 py-2 rounded-lg focus:bg-accent/50 focus:text-accent-foreground">
                  <Link href="/integrations" className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground">
                    View All Integrations
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" onClick={() => setShowSignIn(true)}>
              Sign In
            </Button>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => setShowSignUp(true)}
            >
              Sign Up
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
            </Button>
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-7 w-7 rounded-full">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src="/placeholder.svg?height=28&width=28" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">User</p>
                    <p className="text-xs leading-none text-muted-foreground">user@example.com</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
      <SignUpDialog open={showSignUp} onOpenChange={setShowSignUp} />
    </header>
  )
}

function MobileNav({
  setShowSignIn,
  setShowSignUp
}: {
  setShowSignIn: (show: boolean) => void
  setShowSignUp: (show: boolean) => void
}) {
  const pathname = usePathname()
  const [openItems, setOpenItems] = useState<string[]>([])

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
        <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-purple-600">
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
                  isActive ? "bg-gradient-to-br from-cyan-500/20 to-purple-600/20 text-foreground" : "text-muted-foreground"
                )}>
                  {icons[item as keyof typeof icons]}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? "bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-purple-600" : "text-muted-foreground"
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
            className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-600/20"
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
              <Code className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-purple-600">
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
        >
          Sign Up
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <ModeToggle />
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>
      </div>
    </div>
  )
}

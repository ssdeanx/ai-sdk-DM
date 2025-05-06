"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Menu, X, ChevronDown, Search, Bell, Settings, User, LogOut } from "lucide-react"

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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 p-1"
            >
              <div className="h-5 w-5 rounded-full bg-background" />
            </motion.div>
            <span className="hidden font-bold sm:inline-block text-sm">AI SDK Framework</span>
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
      <Link href="/" className="flex items-center space-x-2">
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 p-1"
        >
          <div className="h-5 w-5 rounded-full bg-background" />
        </motion.div>
        <span className="font-bold text-sm">AI SDK Framework</span>
      </Link>
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

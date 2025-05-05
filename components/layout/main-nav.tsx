"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ModeToggle } from "@/components/layout/mode-toggle"
import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { SignUpDialog } from "@/components/auth/sign-up-dialog"

export function MainNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)
  const [showSignIn, setShowSignIn] = React.useState(false)
  const [showSignUp, setShowSignUp] = React.useState(false)

  const routes = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      active: pathname === "/dashboard",
    },
    {
      href: "/features",
      label: "Features",
      active: pathname === "/features",
    },
    {
      href: "/pricing",
      label: "Pricing",
      active: pathname === "/pricing",
    },
    {
      href: "/blog",
      label: "Blog",
      active: pathname === "/blog",
    },
    {
      href: "/about",
      label: "About",
      active: pathname === "/about",
    },
  ]

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-6 md:gap-10">
        <Link href="/" className="flex items-center space-x-2">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 p-1"
          >
            <div className="h-6 w-6 rounded-full bg-white dark:bg-black" />
          </motion.div>
          <span className="font-bold text-xl">AI SDK</span>
        </Link>
        <nav className="hidden md:flex gap-6">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                route.active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {route.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" onClick={() => setShowSignIn(true)}>
            Sign In
          </Button>
          <Button
            className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 border-none"
            onClick={() => setShowSignUp(true)}
          >
            Sign Up
          </Button>
        </div>
        <ModeToggle />
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="flex flex-col space-y-4 mt-8">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    route.active ? "text-primary" : "text-muted-foreground",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {route.label}
                </Link>
              ))}
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
                  className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 border-none"
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
      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
      <SignUpDialog open={showSignUp} onOpenChange={setShowSignUp} />
    </div>
  )
}

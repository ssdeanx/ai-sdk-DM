# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: components/layout
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Empty lines have been removed from all files
- Content has been formatted for parsing in markdown style
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure
```
components/layout/dashboard-layout.tsx
components/layout/main-nav.tsx
components/layout/main-sidebar.tsx
components/layout/mode-toggle.tsx
components/layout/sidebar.tsx
components/layout/top-navbar.tsx
```

# Files

## File: components/layout/sidebar.tsx
```typescript
import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Settings,
  MessageSquare,
  Wrench,
  Bot,
  FileText,
  Network,
  Blocks,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DatabaseStatus } from "@/components/ui/database-status"
import { TopNavbar } from "@/components/layout/top-navbar"
import { MainSidebar } from "@/components/layout/main-sidebar"
interface SidebarProps {
  className?: string
}
interface SidebarItem {
  title: string
  href: string
  icon: React.ElementType
  submenu?: SidebarItem[]
}
⋮----
// Automatically open submenu based on current path
⋮----
const toggleSubmenu = (title: string) =>
⋮----
// Export the DashboardLayout component
```

## File: components/layout/main-nav.tsx
```typescript
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
⋮----
// State management
⋮----
// Refs for animations and interactions
⋮----
// Check if nav is in view
⋮----
// Motion values for animations
⋮----
// Spring animations for smoother motion
⋮----
// Transform values for hover effects
⋮----
// Scroll progress for animations
⋮----
// Handle mouse movement for hover effects
⋮----
// Handle keyboard shortcuts
⋮----
const handleKeyDown = (e: KeyboardEvent) =>
⋮----
// Command+K or Ctrl+K to open command palette
⋮----
// Escape to close search
⋮----
// Focus search input when search is shown
⋮----
// Handle search submission
⋮----
// In a real app, you would navigate to search results
// router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
⋮----
// Enhanced routes with additional metadata
⋮----
// Command palette items for quick navigation
⋮----
{/* Desktop Navigation */}
⋮----
{/* Enhanced Search with form submission */}
⋮----
onChange=
⋮----
{/* Enhanced Notifications with animation */}
⋮----
{/* Enhanced User Menu */}
⋮----
{/* Enhanced Mobile Menu */}
⋮----
{/* Command Palette Dialog */}
⋮----
{/* Authentication Dialogs */}
```

## File: components/layout/mode-toggle.tsx
```typescript
import { motion } from "framer-motion"
import { Moon, Sun, Laptop } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
```

## File: components/layout/dashboard-layout.tsx
```typescript
import type React from "react"
import { useState, useEffect, createContext, useContext, useRef, useCallback, memo } from "react"
import { usePathname } from "next/navigation"
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useInView,
  useReducedMotion
} from "framer-motion"
import {
  Loader2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Home,
  Settings,
  ArrowUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TopNavbar } from "@/components/layout/top-navbar"
import { MainSidebar } from "@/components/layout/main-sidebar"
import { useToast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useMediaQuery } from "@/hooks/use-media-query"
// Create a context for sidebar state
interface SidebarContextType {
  sidebarOpen: boolean
  toggleSidebar: () => void
}
⋮----
// Custom hook to use sidebar context
export const useSidebar = ()
interface DashboardLayoutProps {
  children: React.ReactNode
}
/**
 * Dashboard Layout Component
 *
 * Provides the main layout structure for the dashboard with advanced animations,
 * responsive design, and accessibility features.
 */
⋮----
// Check if user prefers reduced motion
⋮----
// Check if device is mobile
⋮----
// Refs for sidebar hover detection and scroll
⋮----
// Get scroll position for animations
⋮----
// Create ref for content view detection
⋮----
// Check if elements are in view
⋮----
// Motion values for animations
⋮----
// Transform mouse position for hover effects
⋮----
// Parallax effect for content based on scroll
⋮----
// Toggle sidebar function with memoization
⋮----
// Show toast notification
⋮----
// Handle mouse movement for hover zone
⋮----
// Handle hover state for sidebar
⋮----
const handleMouseEnter = ()
const handleMouseLeave = ()
⋮----
// Handle scroll position for scroll-to-top button
⋮----
const handleScroll = () =>
⋮----
// Simulate loading state
⋮----
// Show welcome toast on first load
⋮----
// Scroll to top function
⋮----
// Add ARIA attributes for accessibility
⋮----
{/* Loading overlay with enhanced animations */}
⋮----
{/* Top navigation bar with enhanced accessibility */}
⋮----
{/* Main content area with sidebar */}
⋮----
{/* Hover zone for sidebar with enhanced detection */}
⋮----
{/* Sidebar with hover effect and accessibility improvements */}
⋮----
{/* Sidebar toggle button with accessibility */}
⋮----
{/* Main content with scroll effects and parallax */}
⋮----
{/* Page content */}
⋮----
{/* Quick navigation buttons with enhanced accessibility */}
⋮----
{/* Home button */}
⋮----
{/* Settings button */}
⋮----
{/* Help button */}
⋮----
{/* Scroll to top button - only shows when scrolled down */}
```

## File: components/layout/top-navbar.tsx
```typescript
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
⋮----
Github as GithubIcon, // Keep deprecated GitHub icon as requested
⋮----
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
⋮----
// Router is used for programmatic navigation in production
⋮----
// Function to navigate programmatically (for future use)
const navigateTo = (path: string) =>
// Scroll animation
⋮----
// Update scrolled state for mobile and handle navigation
⋮----
const handleScroll = () =>
// Apply scrolled state to header styling
⋮----
// Example of using navigateTo in a real application
// if (someCondition) navigateTo('/dashboard')
⋮----
// Set up route change handler for analytics
⋮----
// Function to handle route changes
function handleRouteChange()
⋮----
// Reset search when navigating
⋮----
// Update notifications based on current path
⋮----
// Analytics tracking would go here in production
⋮----
// Call the function once on mount
⋮----
// This would be used in production with Next.js router events
// router.events.on('routeChangeComplete', handleRouteChange)
// return () => router.events.off('routeChangeComplete', handleRouteChange)
⋮----
// Mouse position for hover effects
⋮----
// Spring animations for smoother motion
⋮----
// Transform values for hover effects
⋮----
// Handle mouse movement for hover effects
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) =>
// References for animations
⋮----
// Use header in-view state for animations
⋮----
// Apply header animations based on in-view state
⋮----
// Add animation classes or styles when header comes into view
⋮----
{/* Mobile menu trigger */}
⋮----
{/* Search */}
⋮----
{/* Quick Navigation Buttons */}
⋮----
{/* Animated background */}
⋮----
className=
⋮----
{/* Integrations Button */}
⋮----
{/* Animated gradient background */}
⋮----
{/* Rotating icon background */}
⋮----
{/* Icon with pulse effect */}
⋮----
{/* Text with gradient */}
⋮----
{/* Super cutting-edge Sign In button */}
⋮----
{/* Animated gradient background */}
⋮----
{/* Animated border effect */}
⋮----
{/* Text with hover effect */}
⋮----
{/* Super cutting-edge Sign Up button */}
⋮----
{/* Animated light effect */}
⋮----
{/* Animated particles */}
⋮----
{/* Text with glow effect */}
⋮----
{/* Super cutting-edge Notifications button */}
⋮----
{/* Animated ring effect */}
⋮----
{/* Notification dot with pulse effect */}
⋮----
{/* Bell icon with subtle animation */}
⋮----
{/* Super cutting-edge User Avatar Dropdown */}
⋮----
{/* Animated glow effect */}
⋮----
{/* Rotating gradient border */}
⋮----
{/* Avatar with subtle hover effect */}
⋮----
// Mobile notifications state
⋮----
// Update notifications based on path
⋮----
const toggleItem = (item: string) =>
⋮----
{/* Quick Navigation */}
⋮----
{/* Integrations Button */}
⋮----
{/* Animated particles/gradient effect */}
```

## File: components/layout/main-sidebar.tsx
```typescript
import type React from "react"
import { useState, useEffect, useRef, useCallback, memo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  motion,
  AnimatePresence,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useInView,
  useReducedMotion,
  useDragControls
} from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Database,
  Wrench,
  Bot,
  Network,
  FileText,
  Settings,
  BarChart3,
  Layers,
  Code,
  Zap,
  Users,
  Sparkles,
  Rocket,
  Activity,
  LayoutDashboard
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DatabaseStatus } from "@/components/ui/database-status"
import { useSupabaseFetch } from "@/hooks/use-supabase-fetch"
import { useToast } from "@/components/ui/use-toast"
import { useMediaQuery } from "@/hooks/use-media-query"
interface MainSidebarProps {
  className?: string
}
interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  submenu?: NavItem[]
  isPinned?: boolean
  isNew?: boolean
  badge?: string | null
  shortcut?: string
}
// Enhanced navigation items with additional metadata
⋮----
// Define a type for statusData[0]
type StatusData = { supabase?: boolean; libsql?: boolean };
/**
 * MainSidebar Component
 *
 * Enhanced sidebar navigation with advanced animations, customization options,
 * and performance optimizations.
 */
⋮----
// Enhanced state management
⋮----
// Drag controls for resizable sidebar
⋮----
// Refs for animations and interactions
⋮----
// Check if nav is in view for animations
⋮----
// Get scroll position for parallax effects
⋮----
// Mouse position for hover effects
⋮----
// Spring animations for smoother motion
⋮----
// Transform values for 3D hover effects
⋮----
// Gradient background animation with reduced motion preference
⋮----
// Create enhanced gradient template with motion values
⋮----
// Parallax effect for sidebar items
⋮----
// Handle resize functionality
⋮----
const onMouseMove = (e: MouseEvent) =>
const onMouseUp = () =>
⋮----
// Fetch system status using useSupabaseFetch with error handling
⋮----
// Show toast notification if status fetch fails
⋮----
// Automatically open submenu based on current path
⋮----
const toggleSubmenu = (title: string) =>
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) =>
// Use router for programmatic navigation
⋮----
// Show toast notification for navigation
⋮----
// Handle mobile-specific behavior
⋮----
// Use drag controls for custom drag behavior
⋮----
// Handle item hover for enhanced interactions
const handleItemHover = (title: string) =>
const handleItemLeave = () =>
// Animation variants
⋮----
// Additional animation variants for future use
⋮----
// Apply custom order to nav items if available
⋮----
// Handle drag start for item reordering
⋮----
// Handle drag end and update order
⋮----
// Handle item drop to reorder
⋮----
// Reorder items
⋮----
{/* Animated background gradient */}
⋮----
{/* Animated particles effect */}
⋮----
{/* Collapse toggle button */}
⋮----
{/* Resizable handle */}
⋮----
{/* Logo */}
⋮----
{/* Navigation */}
⋮----
{/* Use ordered items if available */}
⋮----
className=
⋮----
onMouseEnter=
⋮----
onPointerDown=
⋮----
{/* Footer */}
```

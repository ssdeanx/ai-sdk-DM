'use client';

import type React from 'react';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  motion,
  AnimatePresence,
  useMotionTemplate,
  useTransform,
  useScroll,
  useInView,
  useReducedMotion,
} from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Database,
  Wrench,
  Bot,
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
  LayoutDashboard,
  Network as NetworkIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DatabaseStatus } from '@/components/ui/database-status';
import { useSupabaseFetch } from '@/lib/shared/hooks/use-supabase-fetch';
import { useToast } from '@/components/ui/use-toast';
import { useMediaQuery } from '@/lib/shared/hooks/use-media-query';

interface MainSidebarProps {
  className?: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  submenu?: NavItem[];
  isPinned?: boolean;
  isNew?: boolean;
  badge?: string | null;
  shortcut?: string;
}

// Enhanced navigation items with additional metadata
const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/(dashboard)/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    isPinned: true,
    isNew: false,
    badge: null,
    shortcut: 'd',
  },
  {
    title: 'Chat',
    href: '/(dashboard)/chat',
    icon: <MessageSquare className="h-4 w-4" />,
    isPinned: true,
    isNew: false,
    badge: null,
    shortcut: 'c',
  },
  {
    title: 'Demo Chat',
    href: '/demo-chat',
    icon: <Sparkles className="h-4 w-4" />,
    isPinned: false,
    isNew: true,
    badge: 'New',
    shortcut: 'n',
  },
  {
    title: 'Models',
    href: '/(dashboard)/models',
    icon: <Database className="h-4 w-4" />,
    isPinned: false,
    isNew: false,
    badge: null,
    shortcut: 'm',
  },
  {
    title: 'Tools',
    href: '/(dashboard)/tools',
    icon: <Wrench className="h-4 w-4" />,
    isPinned: false,
    isNew: false,
    badge: null,
    shortcut: 't',
  },
  {
    title: 'Agents',
    href: '/(dashboard)/agents',
    icon: <Bot className="h-4 w-4" />,
    isPinned: false,
    isNew: false,
    badge: null,
    shortcut: 'a',
  },
  {
    title: 'Workflows',
    href: '/(dashboard)/workflows',
    icon: <Zap className="h-4 w-4" />,
    isPinned: false,
    isNew: false,
    badge: null,
    shortcut: 'w',
  },
  {
    title: 'Analytics',
    href: '/(dashboard)/analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    isPinned: false,
    isNew: false,
    badge: null,
    shortcut: 'y',
  },
  {
    title: 'Content',
    href: '#',
    icon: <FileText className="h-4 w-4" />,
    isPinned: false,
    isNew: false,
    badge: null,
    shortcut: 'o',
    submenu: [
      {
        title: 'Blog',
        href: '/(dashboard)/blog',
        icon: <FileText className="h-4 w-4" />,
        isPinned: false,
        isNew: false,
        badge: null,
        shortcut: 'b',
      },
      {
        title: 'MDX Builder',
        href: '/(dashboard)/mdx-builder',
        icon: <Layers className="h-4 w-4" />,
        isPinned: false,
        isNew: true,
        badge: 'Beta',
        shortcut: 'x',
      },
      {
        title: 'Code Editor',
        href: '/(dashboard)/code-editor',
        icon: <Code className="h-4 w-4" />,
        isPinned: false,
        isNew: false,
        badge: null,
        shortcut: 'e',
      },
    ],
  },
  {
    title: 'Networks',
    href: '/(dashboard)/networks',
    icon: <NetworkIcon className="h-4 w-4" />,
    isPinned: false,
    isNew: false,
    badge: null,
    shortcut: 'k',
  },
  {
    title: 'Team',
    href: '/(dashboard)/team',
    icon: <Users className="h-4 w-4" />,
    isPinned: false,
    isNew: false,
    badge: null,
    shortcut: 'u',
  },
  {
    title: 'Deployment',
    href: '/(dashboard)/deployment',
    icon: <Rocket className="h-4 w-4" />,
    isPinned: false,
    isNew: false,
    badge: null,
    shortcut: 'p',
  },
  {
    title: 'Observability',
    href: '/(dashboard)/observability',
    icon: <Activity className="h-4 w-4" />,
    isPinned: false,
    isNew: true,
    badge: 'New',
    shortcut: 'v',
  },
  {
    title: 'Settings',
    href: '/(dashboard)/settings',
    icon: <Settings className="h-4 w-4" />,
    isPinned: false,
    isNew: false,
    badge: null,
    shortcut: 's',
  },
];

// Define a type for statusData[0]
type StatusData = {
  supabase?: boolean;
  libsql?: boolean;
  upstash?: boolean;
  apiRoutes?: Record<string, string>;
};

// Add Upstash status to navItems or as a status section
const dbStatusItems = [
  {
    label: 'Supabase',
    icon: <Database className="h-4 w-4" />,
    key: 'supabase',
  },
  { label: 'LibSQL', icon: <Database className="h-4 w-4" />, key: 'libsql' },
  {
    label: 'Upstash',
    icon: <Zap className="h-4 w-4 text-green-500" />,
    key: 'upstash',
  },
];

/**
 * MainSidebar Component
 *
 * Enhanced sidebar navigation with advanced animations, customization options,
 * and performance optimizations.
 */
export const MainSidebar = memo(function MainSidebar({
  className,
}: MainSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Enhanced state management
  const [collapsed, setCollapsed] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  // Refs for animations and interactions
  const sidebarRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Check if nav is in view for animations
  const isNavInView = useInView(navRef, { once: true });

  // Get scroll position for parallax effects
  const { scrollY } = useScroll();

  // Gradient background animation with reduced motion preference
  const gradientRotate = useTransform(
    scrollY,
    [0, 1000],
    prefersReducedMotion ? [0, 0] : [0, 360]
  );

  // Create enhanced gradient template with motion values
  const gradientTemplate = useMotionTemplate`
    linear-gradient(
      ${gradientRotate}deg,
      rgba(34, 197, 94, 0.05) 0%,
      rgba(20, 184, 166, 0.05) 45%,
      rgba(37, 99, 235, 0.05) 100%
    )
  `;

  // Parallax effect for sidebar items
  const itemY = useTransform(
    scrollY,
    [0, 500],
    prefersReducedMotion ? [0, 0] : [0, -50]
  );

  // Handle resize functionality
  const handleResize = useCallback(() => {
    if (resizeHandleRef.current) {
      setIsResizing(true);

      const onMouseMove = (e: MouseEvent) => {
        const newWidth = Math.max(64, Math.min(400, e.clientX));
        setSidebarWidth(newWidth);
      };

      const onMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
  }, []);

  // Fetch system status using useSupabaseFetch with error handling
  const {
    data: statusData,
    isLoading: statusLoading,
    error: statusError,
  } = useSupabaseFetch<StatusData>({
    endpoint: '/api/ai-sdk/system/status', // Use ai-sdk canonical route
    resourceName: 'System Status',
    dataKey: 'status',
  });

  // Show toast notification if status fetch fails
  useEffect(() => {
    if (statusError) {
      toast({
        title: 'Database Connection Error',
        description:
          'Could not connect to database. Some features may be limited.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [statusError, toast]);

  // Automatically open submenu based on current path
  useEffect(() => {
    if (collapsed) return;

    const items = navItems.flatMap((item) => (item.submenu ? [item] : []));
    for (const item of items) {
      if (item.submenu?.some((subitem) => pathname === subitem.href)) {
        setOpenSubmenu(item.title);
        break;
      }
    }
  }, [pathname, collapsed]);

  const toggleSubmenu = (title: string) => {
    if (collapsed) return;
    setOpenSubmenu((prev) => (prev === title ? null : title));
  };

  // Use router for programmatic navigation
  const navigateToPage = useCallback(
    (href: string) => {
      router.push(href);

      // Show toast notification for navigation
      toast({
        title: 'Navigating',
        description: `Going to ${href}`,
        duration: 2000,
      });
    },
    [router, toast]
  );

  // Handle mobile-specific behavior
  useEffect(() => {
    if (isMobile && !collapsed) {
      setCollapsed(true);

      toast({
        title: 'Mobile View',
        description: 'Sidebar collapsed for better mobile experience',
        duration: 3000,
      });
    }
  }, [isMobile, collapsed, toast]);

  // Handle item hover for enhanced interactions
  const handleItemHover = (title: string) => {
    setHoveredItem(title);
  };

  const handleItemLeave = () => {
    setHoveredItem(null);
  };

  // Animation variants
  const sidebarVariants = {
    expanded: {
      width: 240,
      transition: {
        duration: 0.3,
        ease: [0.3, 0.1, 0.3, 1],
      },
    },
    collapsed: {
      width: 64,
      transition: {
        duration: 0.3,
        ease: [0.3, 0.1, 0.3, 1],
      },
    },
  };

  // Additional animation variants for future use
  const textVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      display: 'block',
      transition: {
        duration: 0.3,
        ease: [0.3, 0.1, 0.3, 1],
        delay: 0.1,
      },
    },
    collapsed: {
      opacity: 0,
      x: -10,
      display: 'none',
      transition: {
        duration: 0.2,
        ease: [0.3, 0.1, 0.3, 1],
      },
    },
  };

  // Apply custom order to nav items if available
  const orderedItems =
    customOrder.length > 0
      ? [...navItems].sort((a, b) => {
          const aIndex = customOrder.indexOf(a.title);
          const bIndex = customOrder.indexOf(b.title);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        })
      : navItems;

  // Handle drag start for item reordering
  const handleDragStart = useCallback((title: string) => {
    setIsDragging(true);
    setDraggedItem(title);
  }, []);

  // Handle drag end and update order
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedItem(null);
  }, []);

  // Handle item drop to reorder
  const handleDrop = useCallback(
    (targetTitle: string) => {
      if (draggedItem && draggedItem !== targetTitle) {
        const newOrder = [...customOrder];
        const draggedIndex = newOrder.indexOf(draggedItem);
        const targetIndex = newOrder.indexOf(targetTitle);

        if (draggedIndex === -1) {
          newOrder.push(draggedItem);
        }

        if (targetIndex === -1) {
          newOrder.push(targetTitle);
        }

        // Reorder items
        if (draggedIndex !== -1) {
          newOrder.splice(draggedIndex, 1);
        }

        const newTargetIndex = newOrder.indexOf(targetTitle);
        if (newTargetIndex !== -1) {
          newOrder.splice(newTargetIndex, 0, draggedItem);
        } else {
          newOrder.push(draggedItem);
        }

        setCustomOrder(newOrder);
      }
    },
    [draggedItem, customOrder]
  );

  // Define status variables based on statusData
  const currentStatus = statusData?.[0];
  const supabaseStatus = !!currentStatus?.supabase;
  const libsqlStatus = !!currentStatus?.libsql;
  const upstashStatus = !!currentStatus?.upstash;

  // Sidebar main render
  return (
    <motion.div
      ref={sidebarRef}
      initial={false}
      animate={collapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      style={{
        width: `${sidebarWidth}px`,
        transition: isResizing
          ? 'none'
          : 'width 0.3s cubic-bezier(0.3,0.1,0.3,1)',
        paddingTop: '4rem', // Ensure no overlap with top navbar
      }}
      className={cn(
        'relative h-screen border-r bg-background/80 backdrop-blur-md shadow-sm z-20 overflow-hidden',
        collapsed ? 'w-[64px]' : 'w-[240px]',
        isResizing && 'transition-none',
        className
      )}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{ background: gradientTemplate }}
        animate={{
          opacity: [0.05, 0.1, 0.05],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'linear',
        }}
      />

      {/* Animated particles effect */}
      <motion.div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1 }}
      >
        {Array.from({ length: 20 }).map((_, index) => (
          <motion.div
            key={`particle-${index}`}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            initial={{
              x: Math.random() * 100 + '%',
              y: Math.random() * 100 + '%',
              scale: Math.random() * 0.5 + 0.5,
              opacity: Math.random() * 0.3 + 0.1,
            }}
            animate={{
              y: [null, Math.random() * 100 + '%'],
              opacity: [null, Math.random() * 0.3 + 0.1],
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'linear',
            }}
          />
        ))}
      </motion.div>

      {/* Resizable handle */}
      <motion.div
        ref={resizeHandleRef}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 z-50"
        onMouseDown={handleResize}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

      <div className="flex h-full flex-col">
        {/* Logo (fixed, no overlap) */}
        <div className="flex h-16 items-center border-b px-3 fixed top-0 left-0 w-[inherit] bg-background/80 z-30">
          <Link
            href="/(dashboard)/dashboard"
            className="flex items-center gap-2 font-semibold group"
          >
            <div className="relative flex items-center justify-center">
              <motion.div
                initial={{ rotate: 0, scale: 1 }}
                animate={{ rotate: 360, scale: [1, 1.02, 1] }}
                transition={{
                  rotate: {
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'linear',
                  },
                  scale: {
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  },
                }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 via-teal-500 to-blue-600 opacity-70 blur-sm"
              />
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: -360 }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'linear',
                }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-cyan-600 to-teal-500 opacity-70 blur-[2px]"
              />
              <div className="relative h-7 w-7 rounded-full bg-background flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </div>
            <motion.div variants={textVariants} className="flex flex-col">
              <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600">
                DeanmachinesAI
              </span>
              <span className="text-xs text-muted-foreground">
                Advanced AI Platform
              </span>
            </motion.div>
          </Link>
        </div>

        {/* DB Status Section */}
        <div className="flex flex-row items-center gap-2 mb-4 mt-16">
          {dbStatusItems.map((db) => (
            <Tooltip key={db.key} delayDuration={100}>
              <TooltipTrigger asChild>
                <div className="flex items-center cursor-pointer p-1 rounded-lg hover:bg-accent/30 transition-colors">
                  {db.icon}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">
                    {db.label}
                  </span>
                  <span
                    className={`ml-1 h-2 w-2 rounded-full ${
                      db.key === 'supabase'
                        ? supabaseStatus
                          ? 'bg-green-500'
                          : 'bg-red-400'
                        : db.key === 'libsql'
                          ? libsqlStatus
                            ? 'bg-green-500'
                            : 'bg-red-400'
                          : db.key === 'upstash'
                            ? upstashStatus
                              ? 'bg-green-500'
                              : 'bg-red-400'
                            : 'bg-red-400'
                    }`}
                  ></span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {db.label}{' '}
                {db.key === 'supabase'
                  ? supabaseStatus
                    ? 'Online'
                    : 'Offline'
                  : db.key === 'libsql'
                    ? libsqlStatus
                      ? 'Online'
                      : 'Offline'
                    : db.key === 'upstash'
                      ? upstashStatus
                        ? 'Online'
                        : 'Offline'
                      : 'Offline'}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2 px-2">
          <motion.nav
            ref={navRef}
            className="grid gap-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isNavInView ? 1 : 0.5,
              y: isNavInView ? 0 : 10,
              scale: isNavInView ? 1 : 0.98,
            }}
            transition={{
              duration: 0.3,
              staggerChildren: 0.1,
            }}
            style={{ y: itemY }}
          >
            <TooltipProvider delayDuration={0}>
              {(orderedItems || navItems).map((item) => {
                const isActive = item.href !== '#' && pathname === item.href;
                const hasSubmenu = item.submenu && item.submenu.length > 0;
                const isSubmenuOpen = openSubmenu === item.title;
                const isSubmenuActive =
                  hasSubmenu &&
                  item.submenu?.some((subItem) => pathname === subItem.href);

                if (hasSubmenu) {
                  return (
                    <div key={item.title} className="relative">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'w-full justify-start h-9',
                              (isActive || isSubmenuActive) &&
                                'bg-accent text-accent-foreground',
                              collapsed && 'justify-center px-0',
                              hoveredItem === item.title &&
                                !isActive &&
                                !isSubmenuActive &&
                                'bg-accent/20',
                              isDragging &&
                                draggedItem === item.title &&
                                'opacity-50',
                              item.isPinned && 'border-l-2 border-green-500'
                            )}
                            onClick={() => toggleSubmenu(item.title)}
                            onMouseEnter={() => handleItemHover(item.title)}
                            onMouseLeave={handleItemLeave}
                            draggable={!collapsed}
                            onDragStart={() => handleDragStart(item.title)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleDrop(item.title);
                            }}
                          >
                            <span
                              className={cn(
                                'flex items-center justify-center',
                                !collapsed && 'mr-2'
                              )}
                            >
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
                                className={cn(
                                  'ml-auto h-4 w-4 transition-transform',
                                  isSubmenuOpen && 'rotate-90'
                                )}
                              />
                            )}
                          </Button>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right">
                            {item.title}
                          </TooltipContent>
                        )}
                      </Tooltip>

                      <AnimatePresence>
                        {!collapsed && isSubmenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-accent pl-2">
                              {item.submenu?.map((subItem) => {
                                const isSubActive = pathname === subItem.href;
                                return (
                                  <Link key={subItem.title} href={subItem.href}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        'w-full justify-start h-8',
                                        isSubActive &&
                                          'bg-accent/50 text-accent-foreground',
                                        hoveredItem === subItem.title &&
                                          !isSubActive &&
                                          'bg-accent/20'
                                      )}
                                      onMouseEnter={() =>
                                        handleItemHover(subItem.title)
                                      }
                                      onMouseLeave={handleItemLeave}
                                    >
                                      <span className="mr-2">
                                        {subItem.icon}
                                      </span>
                                      <span className="truncate text-sm">
                                        {subItem.title}
                                      </span>
                                    </Button>
                                  </Link>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return (
                  <Tooltip key={item.title} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <motion.div
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                          pathname === item.href
                            ? 'bg-accent/40'
                            : 'hover:bg-accent/20'
                        )}
                        whileHover={{
                          scale: 1.04,
                          boxShadow: '0 2px 8px rgba(16,185,129,0.08)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigateToPage(item.href)}
                        aria-label={item.title}
                      >
                        {item.icon}
                        <span className="hidden md:inline text-sm font-medium text-foreground">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-400 to-blue-400 text-white shadow">
                            {item.badge}
                          </span>
                        )}
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </motion.nav>
        </ScrollArea>

        {/* Footer: DB status, API health, and collapse toggle at the bottom */}
        <motion.div
          className="border-t p-3 mt-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  className="flex justify-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <DatabaseStatus showLabels={false} className="relative" />
                  {statusLoading && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-600/20 rounded-full"
                      animate={{ opacity: [0.2, 0.5, 0.2] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex flex-col gap-1">
                <div className="text-xs font-medium">Database Status</div>
                {statusData && statusData[0] && (
                  <div className="text-xs text-muted-foreground">
                    Supabase:{' '}
                    {(statusData[0] as StatusData).supabase
                      ? 'Connected'
                      : 'Error'}
                    <br />
                    LibSQL:{' '}
                    {(statusData[0] as StatusData).libsql
                      ? 'Connected'
                      : 'Error'}
                    <br />
                    Upstash:{' '}
                    {(statusData[0] as StatusData).upstash
                      ? 'Connected'
                      : 'Error'}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
            >
              <span className="text-xs text-muted-foreground">Database</span>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <DatabaseStatus showLabels={false} />
                {statusLoading && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-600/20 rounded-full"
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
            </motion.div>
          )}

          <motion.div
            className="mt-2 text-xs text-center text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600 font-medium">
              DeanmachinesAI
            </span>{' '}
            v1.0
          </motion.div>

          {/* API Health Section */}
          <div className="mt-8 p-2 rounded-xl bg-background/60 border border-border/20 shadow-sm">
            <div className="text-xs font-semibold mb-1 text-muted-foreground">
              API Health
            </div>
            {statusData && statusData[0] && statusData[0].apiRoutes ? (
              <ul className="space-y-1">
                {Object.entries(statusData[0].apiRoutes).map(
                  ([route, status]) => (
                    <li key={route} className="flex items-center gap-2">
                      <span className="text-xs text-foreground">{route}</span>
                      <span
                        className={`h-2 w-2 rounded-full ${status === 'ok' ? 'bg-green-500' : 'bg-red-400'}`}
                      ></span>
                    </li>
                  )
                )}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground">
                Loading API status...
              </div>
            )}
          </div>

          {/* Collapse toggle button at the bottom */}
          <div className="mt-4 flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full border bg-background shadow-md hover:bg-accent"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">
                {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              </span>
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
});

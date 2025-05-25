'use client';

import type React from 'react';

import {
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
  useCallback,
  memo,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useInView,
  useReducedMotion,
} from 'framer-motion';
import {
  Loader2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Home,
  Settings,
  ArrowUp,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { TopNavbar } from '@/components/layout/top-navbar';
import { MainSidebar } from '@/components/layout/main-sidebar';
import { useToast } from '@/components/ui/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMediaQuery } from '@/lib/shared/hooks/use-media-query';

// Create a context for sidebar state
interface SidebarContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  sidebarOpen: true,
  toggleSidebar: () => {},
});

// Custom hook to use sidebar context
export const useSidebar = () => useContext(SidebarContext);

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Dashboard Layout Component
 *
 * Provides the main layout structure for the dashboard with advanced animations,
 * responsive design, and accessibility features.
 */
export const DashboardLayout = memo(function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Check if user prefers reduced motion
  const prefersReducedMotion = useReducedMotion();

  // Check if device is mobile
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Refs for sidebar hover detection and scroll
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hoverZoneRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Get scroll position for animations
  const { scrollY } = useScroll({
    container: mainContentRef,
  });

  // Create ref for content view detection
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if elements are in view
  const contentInView = useInView(contentRef);

  // Motion values for animations
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { stiffness: 300, damping: 30 };
  const mouseXSpring = useSpring(mouseX, springConfig);
  const mouseYSpring = useSpring(mouseY, springConfig);

  // Transform mouse position for hover effects
  const hoverRotateX = useTransform(mouseYSpring, [0, 300], [5, -5]);
  const hoverRotateY = useTransform(mouseXSpring, [0, 300], [-5, 5]);

  // Parallax effect for content based on scroll
  const contentY = useTransform(
    scrollY,
    [0, 300],
    [0, prefersReducedMotion ? 0 : -30]
  );

  // Toggle sidebar function with memoization
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const newState = !prev;
      // Show toast notification
      toast({
        title: newState ? 'Sidebar expanded' : 'Sidebar collapsed',
        description: newState
          ? 'Navigation sidebar is now visible'
          : 'Navigation sidebar is now hidden',
        duration: 2000,
      });
      return newState;
    });
  }, [toast]);

  // Handle mouse movement for hover zone
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const { left, top } = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    },
    [mouseX, mouseY]
  );

  // Handle hover state for sidebar
  useEffect(() => {
    if (!sidebarOpen) {
      const handleMouseEnter = () => setIsHovering(true);
      const handleMouseLeave = () => setIsHovering(false);

      const hoverZone = hoverZoneRef.current;
      if (hoverZone) {
        hoverZone.addEventListener('mouseenter', handleMouseEnter);
        hoverZone.addEventListener('mouseleave', handleMouseLeave);

        return () => {
          hoverZone.removeEventListener('mouseenter', handleMouseEnter);
          hoverZone.removeEventListener('mouseleave', handleMouseLeave);
        };
      }
    }
  }, [sidebarOpen]);

  // Handle scroll position for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        setShowScrollTop(mainContentRef.current.scrollTop > 300);
      }
    };

    const mainContent = mainContentRef.current;
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
      return () => mainContent.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);

      // Show welcome toast on first load
      if (!mounted) {
        toast({
          title: 'Welcome to DeanmachinesAI',
          description: 'Your advanced AI platform is ready to use.',
          duration: 5000,
        });
        setMounted(true);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [toast, mounted]);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, []);

  return (
    <SidebarContext.Provider value={{ sidebarOpen, toggleSidebar }}>
      <div
        className={cn(
          'flex min-h-screen flex-col bg-background relative',
          isLoading && 'overflow-hidden'
        )}
        // Add ARIA attributes for accessibility
        role="application"
        aria-label="DeanmachinesAI Dashboard"
      >
        {/* Loading overlay with enhanced animations */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              aria-live="polite"
              aria-busy="true"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="relative flex items-center justify-center mb-4">
                  <motion.div
                    initial={{ rotate: 0, scale: 1 }}
                    animate={{
                      rotate: prefersReducedMotion ? 0 : 360,
                      scale: prefersReducedMotion ? 1 : [1, 1.05, 1],
                    }}
                    transition={{
                      rotate: {
                        duration: 10,
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
                    animate={{ rotate: prefersReducedMotion ? 0 : -360 }}
                    transition={{
                      duration: 15,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'linear',
                    }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-cyan-600 to-teal-500 opacity-70 blur-[2px]"
                  />
                  <div className="relative h-12 w-12 rounded-full bg-background flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="text-center"
                >
                  <h3 className="font-medium text-lg bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600">
                    DeanmachinesAI
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Loading your AI workspace...
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top navigation bar with enhanced accessibility */}
        <div className="flex items-center px-4 h-16 border-b">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  className="mr-4 h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  whileHover={{ scale: prefersReducedMotion ? 1 : 1.05 }}
                  whileTap={{ scale: prefersReducedMotion ? 1 : 0.95 }}
                  onClick={toggleSidebar}
                  aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                  aria-expanded={sidebarOpen}
                  aria-controls="main-sidebar"
                >
                  {sidebarOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TopNavbar />
        </div>

        {/* Main content area with sidebar */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Hover zone for sidebar with enhanced detection */}
          {!sidebarOpen && (
            <div
              ref={hoverZoneRef}
              className="absolute left-0 top-0 w-8 h-full z-30"
              aria-hidden="true"
            />
          )}

          {/* Sidebar with hover effect and accessibility improvements */}
          <AnimatePresence>
            {(sidebarOpen || isHovering) && (
              <motion.div
                id="main-sidebar"
                ref={sidebarRef}
                initial={
                  !sidebarOpen
                    ? { width: 0, opacity: 0 }
                    : { width: 240, opacity: 1 }
                }
                animate={
                  !sidebarOpen && isHovering
                    ? { width: 240, opacity: 1 }
                    : sidebarOpen
                      ? { width: 240, opacity: 1 }
                      : { width: 0, opacity: 0 }
                }
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.3, 0.1, 0.3, 1] }}
                style={{
                  rotateX: prefersReducedMotion ? 0 : hoverRotateX,
                  rotateY: prefersReducedMotion ? 0 : hoverRotateY,
                  transformPerspective: 1000,
                }}
                onMouseMove={handleMouseMove}
                className="h-full overflow-hidden"
                role="navigation"
                aria-label="Main navigation"
              >
                <MainSidebar />

                {/* Sidebar toggle button with accessibility */}
                <motion.button
                  className="absolute right-3 top-6 z-30 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent flex items-center justify-center"
                  whileHover={{ scale: prefersReducedMotion ? 1 : 1.1 }}
                  whileTap={{ scale: prefersReducedMotion ? 1 : 0.9 }}
                  onClick={toggleSidebar}
                  aria-label={
                    sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'
                  }
                >
                  {sidebarOpen ? (
                    <ChevronLeft className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main content with scroll effects and parallax */}
          <motion.main
            ref={mainContentRef}
            className="flex-1 overflow-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            role="main"
          >
            <TooltipProvider>
              <div className="container py-4 px-4 md:px-6 max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    ref={contentRef}
                    key={pathname}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: contentInView ? 1 : 0.98,
                    }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={cn('relative', isMobile ? 'pt-2' : 'pt-4')}
                    style={{ y: contentY }}
                  >
                    {/* Page content */}
                    {children}

                    {/* Quick navigation buttons with enhanced accessibility */}
                    <div className="fixed bottom-6 right-6 flex flex-col gap-3">
                      <TooltipProvider>
                        {/* Home button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.button
                              className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-shadow"
                              whileHover={{
                                scale: prefersReducedMotion ? 1 : 1.05,
                              }}
                              whileTap={{
                                scale: prefersReducedMotion ? 1 : 0.95,
                              }}
                              onClick={() => {
                                window.location.href = '/dashboard';
                                toast({
                                  title: 'Navigating to Dashboard',
                                  description:
                                    'Taking you to the main dashboard',
                                  duration: 2000,
                                });
                              }}
                              aria-label="Go to Dashboard"
                            >
                              <Home className="h-5 w-5 text-white" />
                            </motion.button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>Go to Dashboard</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Settings button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.button
                              className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow"
                              whileHover={{
                                scale: prefersReducedMotion ? 1 : 1.05,
                              }}
                              whileTap={{
                                scale: prefersReducedMotion ? 1 : 0.95,
                              }}
                              onClick={() => {
                                window.location.href = '/settings';
                                toast({
                                  title: 'Navigating to Settings',
                                  description:
                                    'Taking you to the settings page',
                                  duration: 2000,
                                });
                              }}
                              aria-label="Go to Settings"
                            >
                              <Settings className="h-5 w-5 text-white" />
                            </motion.button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>Go to Settings</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Help button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.button
                              className="h-12 w-12 rounded-full bg-gradient-to-r from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow"
                              whileHover={{
                                scale: prefersReducedMotion ? 1 : 1.05,
                              }}
                              whileTap={{
                                scale: prefersReducedMotion ? 1 : 0.95,
                              }}
                              onClick={() => {
                                toast({
                                  title: 'Help Center',
                                  description:
                                    'The help center is coming soon. Stay tuned!',
                                  duration: 3000,
                                });
                              }}
                              aria-label="Help Center"
                            >
                              <HelpCircle className="h-6 w-6 text-white" />
                            </motion.button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>Need help?</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Scroll to top button - only shows when scrolled down */}
                        <AnimatePresence>
                          {showScrollTop && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <motion.button
                                    className="h-10 w-10 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center shadow-lg shadow-gray-500/20 hover:shadow-gray-500/30 transition-shadow"
                                    whileHover={{
                                      scale: prefersReducedMotion ? 1 : 1.05,
                                    }}
                                    whileTap={{
                                      scale: prefersReducedMotion ? 1 : 0.95,
                                    }}
                                    onClick={scrollToTop}
                                    aria-label="Scroll to top"
                                  >
                                    <ArrowUp className="h-5 w-5 text-white" />
                                  </motion.button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <p>Scroll to top</p>
                                </TooltipContent>
                              </Tooltip>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </TooltipProvider>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </TooltipProvider>
          </motion.main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
});

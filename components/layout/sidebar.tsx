'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatabaseStatus } from '@/components/ui/database-status';
import { TopNavbar } from '@/components/layout/top-navbar';
import { MainSidebar } from '@/components/layout/main-sidebar';

interface SidebarProps {
  className?: string;
}

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ElementType;
  submenu?: SidebarItem[];
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  // Automatically open submenu based on current path
  useEffect(() => {
    const items = sidebarItems.flatMap((item) => (item.submenu ? [item] : []));
    for (const item of items) {
      if (item.submenu?.some((subitem) => pathname === subitem.href)) {
        setOpenSubmenu(item.title);
        break;
      }
    }
  }, [pathname]);

  const sidebarItems: SidebarItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Chat',
      href: '/chat',
      icon: MessageSquare,
    },
    {
      title: 'AI Configuration',
      href: '#',
      icon: Blocks,
      submenu: [
        {
          title: 'Models',
          href: '/models',
          icon: Blocks,
        },
        {
          title: 'Tools',
          href: '/tools',
          icon: Wrench,
        },
        {
          title: 'Agents',
          href: '/agents',
          icon: Bot,
        },
      ],
    },
    {
      title: 'Content',
      href: '#',
      icon: FileText,
      submenu: [
        {
          title: 'Blog',
          href: '/blog',
          icon: FileText,
        },
        {
          title: 'MDX Builder',
          href: '/mdx-builder',
          icon: FileText,
        },
      ],
    },
    {
      title: 'Advanced',
      href: '#',
      icon: Network,
      submenu: [
        {
          title: 'Networks',
          href: '/networks',
          icon: Network,
        },
        {
          title: 'App Builder',
          href: '/app-builder',
          icon: Blocks,
        },
      ],
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  const toggleSubmenu = (title: string) => {
    setOpenSubmenu((prev) => (prev === title ? null : title));
  };

  return (
    <div className={cn('pb-12 h-full flex flex-col', className)}>
      <div className="space-y-4 py-4 flex-1">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              AI SDK Framework
            </h2>
          </div>
          <div className="px-4 mb-2">
            <DatabaseStatus />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 px-3">
            {sidebarItems.map((item) =>
              !item.submenu ? (
                <Button
                  key={item.title}
                  asChild
                  variant={pathname === item.href ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Link>
                </Button>
              ) : (
                <div key={item.title} className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => toggleSubmenu(item.title)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                    {openSubmenu === item.title ? (
                      <ChevronDown className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </Button>
                  {openSubmenu === item.title && (
                    <div className="pl-4 space-y-1">
                      {item.submenu.map((subitem) => (
                        <Button
                          key={subitem.title}
                          asChild
                          variant={
                            pathname === subitem.href ? 'secondary' : 'ghost'
                          }
                          className="w-full justify-start"
                        >
                          <Link href={subitem.href}>
                            <subitem.icon className="mr-2 h-4 w-4" />
                            {subitem.title}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// Export the DashboardLayout component
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNavbar />
      <div className="flex flex-1">
        <MainSidebar />
        <main className="flex-1 overflow-hidden">
          <div className="container py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

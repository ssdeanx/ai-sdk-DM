"use client"

import type React from "react"

import { useState } from "react"
import { TopNavbar } from "@/components/layout/top-navbar"
import { MainSidebar } from "@/components/layout/main-sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNavbar />
      <div className="flex flex-1 overflow-hidden">
        <MainSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container py-4 px-4 md:px-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

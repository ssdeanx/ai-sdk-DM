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
    <div className="flex min-h-screen flex-col">
      <TopNavbar />
      <div className="flex flex-1">
        <MainSidebar />
        <main className="flex-1 overflow-hidden">
          <div className="container py-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

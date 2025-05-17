"use client"

import { useState, useEffect } from "react"
import { Database, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { useSupabaseFetch } from "@/hooks/use-supabase-fetch"

interface DatabaseStatusProps {
  showLabels?: boolean
  className?: string
}

interface SystemStatus {
  status: string
  timestamp: string
  supabase: boolean
  libsql: boolean
  upstash: boolean
  upstashStats?: { info?: unknown; error?: string }
  environment?: string
}

export function DatabaseStatus({ showLabels = false, className = "" }: DatabaseStatusProps) {
  const [supabaseStatus, setSupabaseStatus] = useState<"loading" | "connected" | "error">("loading")
  const [libsqlStatus, setLibsqlStatus] = useState<"loading" | "connected" | "error">("loading")
  const [upstashStatus, setUpstashStatus] = useState<"loading" | "connected" | "error">("loading")
  const [upstashStats, setUpstashStats] = useState<{ info?: unknown; error?: string } | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  // Use the standardized hook for fetching system status
  const {
    data: statusData,
    isLoading,
    refetch: checkStatus
  } = useSupabaseFetch<SystemStatus>({
    endpoint: "/api/ai-sdk/system/status",
    resourceName: "System Status",
    dataKey: "status",
  })

  // Ensure isLoading is defined and re-added
  // isLoading is already destructured above and available for use

  // Update status when data changes
  useEffect(() => {
    if (statusData && statusData[0]) {
      setSupabaseStatus(statusData[0].supabase ? "connected" : "error")
      setLibsqlStatus(statusData[0].libsql ? "connected" : "error")
      setUpstashStatus(statusData[0].upstash ? "connected" : "error")
      setUpstashStats(statusData[0].upstashStats || null)
      setLastChecked(new Date())
    }
  }, [statusData])
  // Check status every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      checkStatus()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [checkStatus])

  const getStatusIcon = (status: "loading" | "connected" | "error") => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className={`flex items-center gap-2 ${className}`}>
          <div className="flex items-center gap-1">
            <Database className="h-4 w-4 text-muted-foreground" />
            {showLabels && <span className="text-sm">Databases</span>}
          </div>
          <div className="flex gap-1">
            {getStatusIcon(supabaseStatus)}
            {getStatusIcon(libsqlStatus)}
            {getStatusIcon(upstashStatus)}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2 p-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Supabase:</span>
              <Badge variant={supabaseStatus === "connected" ? "default" : "destructive"}>
                {supabaseStatus === "loading" ? "Checking..." : supabaseStatus === "connected" ? "Connected" : "Error"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">LibSQL:</span>
              <Badge variant={libsqlStatus === "connected" ? "default" : "destructive"}>
                {libsqlStatus === "loading" ? "Checking..." : libsqlStatus === "connected" ? "Connected" : "Error"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Upstash:</span>
              <Badge variant={upstashStatus === "connected" ? "default" : "destructive"}>
                {upstashStatus === "loading" ? "Checking..." : upstashStatus === "connected" ? "Connected" : "Error"}
              </Badge>
            </div>
            {upstashStats?.error && (
              <div className="text-xs text-destructive pt-1">Upstash error: {upstashStats.error}</div>
            )}
            {lastChecked && (
              <div className="text-xs text-muted-foreground pt-1">Last checked: {lastChecked.toLocaleTimeString()}</div>
            )}
            {/* Optionally show loading indicator */}
            {isLoading && (
              <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking status...
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
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
  environment: string
}

export function DatabaseStatus({ showLabels = false, className = "" }: DatabaseStatusProps) {
  const [supabaseStatus, setSupabaseStatus] = useState<"loading" | "connected" | "error">("loading")
  const [libsqlStatus, setLibsqlStatus] = useState<"loading" | "connected" | "error">("loading")
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  // Use the standardized hook for fetching system status
  const {
    data: statusData,
    isLoading,
    refresh: checkStatus
  } = useSupabaseFetch<SystemStatus>({
    endpoint: "/api/system/status",
    resourceName: "System Status",
    dataKey: "status",
  })

  // Update status when data changes
  useEffect(() => {
    if (statusData && statusData.length > 0) {
      const data = statusData[0]
      setSupabaseStatus(data.supabase ? "connected" : "error")
      setLibsqlStatus(data.libsql ? "connected" : "error")
      setLastChecked(new Date())
    }
  }, [statusData])

  // Check status every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      checkStatus()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

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
            {lastChecked && (
              <div className="text-xs text-muted-foreground pt-1">Last checked: {lastChecked.toLocaleTimeString()}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

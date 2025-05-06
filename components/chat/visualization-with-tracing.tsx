"use client"

import { useState, useEffect } from "react"
import { DataVisualization } from "./data-visualization"
import { TracingVisualization } from "./tracing-visualization"
import { createTrace, logEvent } from "@/lib/langfuse-integration"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Activity, RefreshCw } from "lucide-react"

interface VisualizationWithTracingProps {
  title?: string
  data: any
  type?: string
  className?: string
}

export function VisualizationWithTracing({
  title = "Data Visualization with Tracing",
  data,
  type = "bar",
  className
}: VisualizationWithTracingProps) {
  const [traceId, setTraceId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("chart")
  const [loading, setLoading] = useState(false)
  
  // Initialize tracing
  useEffect(() => {
    async function initTracing() {
      try {
        setLoading(true)
        
        // Create a parent trace for the visualization
        const trace = await createTrace({
          name: "visualization_with_tracing",
          metadata: {
            title,
            chartType: type,
            dataSize: JSON.stringify(data).length
          }
        })
        
        if (trace?.id) {
          setTraceId(trace.id)
          
          // Log initialization event
          await logEvent({
            traceId: trace.id,
            name: "visualization_with_tracing_initialized",
            metadata: {
              timestamp: new Date().toISOString()
            }
          })
        }
      } catch (error) {
        console.error("Error initializing tracing:", error)
      } finally {
        setLoading(false)
      }
    }
    
    initTracing()
  }, [title, type, data])
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    
    // Log tab change event
    if (traceId) {
      logEvent({
        traceId,
        name: "tab_changed",
        metadata: {
          previousTab: activeTab,
          newTab: value,
          timestamp: new Date().toISOString()
        }
      }).catch(console.error)
    }
  }
  
  // Handle refresh
  const handleRefresh = async () => {
    try {
      setLoading(true)
      
      // Create a new trace
      const trace = await createTrace({
        name: "visualization_with_tracing",
        metadata: {
          title,
          chartType: type,
          dataSize: JSON.stringify(data).length,
          isRefresh: true
        }
      })
      
      if (trace?.id) {
        setTraceId(trace.id)
        
        // Log refresh event
        await logEvent({
          traceId: trace.id,
          name: "visualization_refreshed",
          metadata: {
            timestamp: new Date().toISOString()
          }
        })
      }
    } catch (error) {
      console.error("Error refreshing tracing:", error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="chart" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Chart
          </TabsTrigger>
          <TabsTrigger value="tracing" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Tracing
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-4">
          {activeTab === "chart" && (
            <DataVisualization
              title={title}
              data={data}
              type={type as any}
              className={className}
            />
          )}
          
          {activeTab === "tracing" && traceId && (
            <TracingVisualization
              traceId={traceId}
              title={`Tracing for ${title}`}
              className={className}
              refreshInterval={3000}
            />
          )}
          
          {activeTab === "tracing" && !traceId && (
            <div className="p-8 text-center border border-dashed rounded-lg">
              <p className="text-muted-foreground">
                {loading ? "Initializing tracing..." : "No tracing data available"}
              </p>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Tool } from "@/types/tools"
import { Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToolExecutor } from "@/hooks/use-executor"

interface ExecuteToolDialogProps {
  isOpen: boolean
  onClose: () => void
  tool: Tool
  onExecuteTool: (id: string, params: Record<string, any>) => Promise<any>
}

export function ExecuteToolDialog({ isOpen, onClose, tool, onExecuteTool }: ExecuteToolDialogProps) {
  const [params, setParams] = useState<Record<string, any>>({})
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Use our custom hook for tool execution
  const { executeTool, isExecuting } = useToolExecutor({
    toolId: tool.id,
    onSuccess: (data) => {
      setResult(data.result)
    },
    onError: (err) => {
      setError(err.message)
    }
  })

  useEffect(() => {
    if (isOpen) {
      // Initialize params based on schema
      const initialParams: Record<string, any> = {}
      if (tool.schema && typeof tool.schema === "object") {
        Object.entries(tool.schema).forEach(([key, value]) => {
          if (value && typeof value === "object" && "default" in value) {
            initialParams[key] = value.default
          } else {
            initialParams[key] = ""
          }
        })
      }
      setParams(initialParams)
      setResult(null)
      setError(null)
    }
  }, [isOpen, tool])

  const handleParamChange = (key: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleExecute = async () => {
    setResult(null)
    setError(null)

    try {
      // Use our custom hook to execute the tool
      await executeTool(params)
    } catch (err) {
      console.error("Error executing tool:", err)
      // Error handling is done in the hook
    }
  }

  const renderParamInputs = () => {
    if (!tool.schema || typeof tool.schema !== "object") {
      return <div className="text-gray-400 italic">No parameters defined for this tool.</div>
    }

    return Object.entries(tool.schema).map(([key, value]) => {
      const paramType = value && typeof value === "object" && "type" in value ? value.type : "string"

      const paramDescription = value && typeof value === "object" && "description" in value ? value.description : ""

      return (
        <div key={key} className="grid gap-2">
          <Label htmlFor={`param-${key}`} className="flex items-center justify-between">
            <span>{key}</span>
            {paramType && <span className="text-xs text-gray-500">{paramType}</span>}
          </Label>

          {paramType === "object" || paramType === "array" ? (
            <Textarea
              id={`param-${key}`}
              value={typeof params[key] === "object" ? JSON.stringify(params[key], null, 2) : params[key]}
              onChange={(e) => {
                try {
                  const value = JSON.parse(e.target.value)
                  handleParamChange(key, value)
                } catch {
                  handleParamChange(key, e.target.value)
                }
              }}
              placeholder={`Enter ${paramType} value`}
              className="bg-gray-900 border-gray-800 font-mono text-sm"
            />
          ) : (
            <Input
              id={`param-${key}`}
              value={params[key] || ""}
              onChange={(e) => handleParamChange(key, e.target.value)}
              placeholder={`Enter ${key}`}
              className="bg-gray-900 border-gray-800"
              type={paramType === "number" ? "number" : "text"}
            />
          )}

          {paramDescription && <p className="text-gray-400 text-xs">{paramDescription}</p>}
        </div>
      )
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-950 border-gray-800 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Execute Tool: {tool.name}</DialogTitle>
          <DialogDescription>Configure parameters and execute the tool.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="grid gap-4 py-4">
            {renderParamInputs()}

            {result && (
              <div className="mt-4">
                <Label>Result</Label>
                <div className="bg-gray-900 border border-gray-800 rounded-md p-3 mt-1">
                  <pre className="text-sm text-white overflow-auto max-h-[200px]">
                    {typeof result === "object" ? JSON.stringify(result, null, 2) : result}
                  </pre>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isExecuting}>
            Close
          </Button>
          <Button type="button" onClick={handleExecute} disabled={isExecuting}>
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              "Execute Tool"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

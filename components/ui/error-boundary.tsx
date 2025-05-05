"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      console.error("Error caught by error boundary:", error)
      setError(error.error)
      setHasError(true)
    }

    window.addEventListener("error", errorHandler)

    return () => {
      window.removeEventListener("error", errorHandler)
    }
  }, [])

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          <div className="mt-2">
            <p className="text-sm">{error?.message || "An unexpected error occurred"}</p>
            {error?.stack && (
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-secondary p-2 text-xs">{error.stack}</pre>
            )}
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setHasError(false)
              setError(null)
            }}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}

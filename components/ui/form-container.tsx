"use client"

import type React from "react"

import { type ReactNode, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Save } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormContainerProps {
  title: string
  description?: string
  children: ReactNode
  onSubmit: () => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  className?: string
  submitLabel?: string
  cancelLabel?: string
  footerContent?: ReactNode
}

export function FormContainer({
  title,
  description,
  children,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  footerContent,
}: FormContainerProps) {
  const [isSubmittingInternal, setIsSubmittingInternal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingInternal(true)
    try {
      await onSubmit()
    } finally {
      setIsSubmittingInternal(false)
    }
  }

  const submitting = isSubmitting || isSubmittingInternal

  return (
    <Card className={cn("w-full", className)}>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter className="flex justify-between">
          <div>{footerContent}</div>
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                {cancelLabel}
              </Button>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {submitLabel}
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

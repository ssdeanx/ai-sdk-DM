"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, FormInput, Check, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface FormField {
  id: string
  type: 'text' | 'textarea' | 'number' | 'email' | 'checkbox' | 'radio' | 'select' | 'date'
  label: string
  placeholder?: string
  required?: boolean
  options?: { value: string, label: string }[] // For radio and select
  validation?: {
    pattern?: string
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    errorMessage?: string
  }
}

export interface InteractiveFormProps {
  title?: string
  description?: string
  fields: FormField[]
  submitLabel?: string
  cancelLabel?: string
  onSubmit?: (data: Record<string, any>) => void
  onCancel?: () => void
  className?: string
}

export function InteractiveForm({
  title = "Feedback Form",
  description,
  fields = [],
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
  className
}: InteractiveFormProps) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Handle form input change
  const handleChange = (id: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))

    // Clear error when field is changed
    if (errors[id]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[id]
        return newErrors
      })
    }
  }

  // Validate a single field
  const validateField = (field: FormField, value: any): string | null => {
    // Required check
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.label} is required`
    }

    // Type-specific validation
    if (field.validation) {
      const { pattern, min, max, minLength, maxLength, errorMessage } = field.validation

      // Pattern validation
      if (pattern && typeof value === 'string' && !new RegExp(pattern).test(value)) {
        return errorMessage || `${field.label} has an invalid format`
      }

      // Number range validation
      if (field.type === 'number') {
        const numValue = Number(value)
        if (min !== undefined && numValue < min) {
          return `${field.label} must be at least ${min}`
        }
        if (max !== undefined && numValue > max) {
          return `${field.label} must be at most ${max}`
        }
      }

      // String length validation
      if (typeof value === 'string') {
        if (minLength !== undefined && value.length < minLength) {
          return `${field.label} must be at least ${minLength} characters`
        }
        if (maxLength !== undefined && value.length > maxLength) {
          return `${field.label} must be at most ${maxLength} characters`
        }
      }
    }

    return null
  }

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    fields.forEach(field => {
      const value = formData[field.id]
      const error = validateField(field, value)
      if (error) {
        newErrors[field.id] = error
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      setSubmitting(true)

      // Simulate API call
      setTimeout(() => {
        if (onSubmit) {
          onSubmit(formData)
        }
        setSubmitted(true)
        setSubmitting(false)
      }, 1000)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({})
    setErrors({})
    setSubmitted(false)
  }

  // Render form field based on type
  const renderField = (field: FormField) => {
    const { id, type, label, placeholder, required, options } = field
    const value = formData[id]
    const error = errors[id]

    switch (type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={id} className="flex items-center gap-1">
              {label}
              {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={id}
              type={type}
              placeholder={placeholder}
              value={value || ''}
              onChange={(e) => handleChange(id, e.target.value)}
              className={cn(error && "border-red-500 focus:ring-red-500")}
            />
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        )

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={id} className="flex items-center gap-1">
              {label}
              {required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={id}
              placeholder={placeholder}
              value={value || ''}
              onChange={(e) => handleChange(id, e.target.value)}
              className={cn(error && "border-red-500 focus:ring-red-500")}
            />
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        )

      case 'checkbox':
        return (
          <div className="flex items-start space-x-2">
            <Checkbox
              id={id}
              checked={value || false}
              onCheckedChange={(checked) => handleChange(id, checked)}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor={id} className="flex items-center gap-1">
                {label}
                {required && <span className="text-red-500">*</span>}
              </Label>
              {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </p>
              )}
            </div>
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              {label}
              {required && <span className="text-red-500">*</span>}
            </Label>
            <RadioGroup
              value={value || ''}
              onValueChange={(value) => handleChange(id, value)}
            >
              {options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
                  <Label htmlFor={`${id}-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        )

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={id} className="flex items-center gap-1">
              {label}
              {required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={value || ''}
              onValueChange={(value) => handleChange(id, value)}
            >
              <SelectTrigger id={id} className={cn(error && "border-red-500 focus:ring-red-500")}>
                <SelectValue placeholder={placeholder || `Select ${label}`} />
              </SelectTrigger>
              <SelectContent>
                {options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        )

      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={id} className="flex items-center gap-1">
              {label}
              {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={id}
              type="date"
              value={value || ''}
              onChange={(e) => handleChange(id, e.target.value)}
              className={cn(error && "border-red-500 focus:ring-red-500")}
            />
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden border border-border/50 shadow-md transition-all duration-300 bg-background",
        expanded && "fixed inset-4 z-50 bg-background flex flex-col",
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-800 to-violet-700 px-4 py-2 text-white">
        <div className="flex items-center gap-2">
          <FormInput className="h-4 w-4" />
          <span className="font-medium">{title}</span>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered || expanded ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            <span className="sr-only">{expanded ? "Minimize" : "Maximize"}</span>
          </Button>
        </motion.div>
      </div>

      <div className={cn(
        "p-4 overflow-auto",
        expanded ? "flex-1" : "max-h-[400px]"
      )}>
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-medium mb-2">Thank You!</h3>
            <p className="text-muted-foreground mb-6">Your submission has been received.</p>
            <Button onClick={resetForm}>Submit Another Response</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {description && (
              <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">{description}</p>
              </div>
            )}

            <div className="space-y-6">
              {fields.map((field) => (
                <div key={field.id}>
                  {renderField(field)}
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={submitting}
                >
                  {cancelLabel}
                </Button>
              )}
              <Button
                type="submit"
                variant="gradient"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : submitLabel}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

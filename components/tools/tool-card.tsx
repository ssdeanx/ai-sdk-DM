"use client"

import { useState } from "react"
import { MoreHorizontal, Trash2, Edit, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import type { ToolDefinition } from "@/types"

interface ToolCardProps {
  tool: ToolDefinition
  onEdit: (tool: ToolDefinition) => void
  onDelete: (id: string) => void
  onTest: (id: string) => void
}

export function ToolCard({ tool, onEdit, onDelete, onTest }: ToolCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await onDelete(tool.id)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{tool.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(tool)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTest(tool.id)}>
                <Play className="mr-2 h-4 w-4" />
                Test
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="line-clamp-2">{tool.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="text-sm text-muted-foreground">
          <div className="mb-2">
            <span className="font-medium">Parameters:</span>{" "}
            {JSON.parse(tool.parametersSchema).properties
              ? Object.keys(JSON.parse(tool.parametersSchema).properties).join(", ")
              : "None"}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Created:</span> <span>{new Date(tool.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          Tool
        </Badge>
      </CardFooter>
    </Card>
  )
}

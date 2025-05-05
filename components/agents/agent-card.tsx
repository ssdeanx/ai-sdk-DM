"use client"

import { useState } from "react"
import { MoreHorizontal, Trash2, Edit, Play, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import type { AgentConfig } from "@/types"

interface AgentCardProps {
  agent: AgentConfig
  onEdit: (agent: AgentConfig) => void
  onDelete: (id: string) => void
  onRun: (id: string) => void
  onDuplicate: (agent: AgentConfig) => void
}

export function AgentCard({ agent, onEdit, onDelete, onRun, onDuplicate }: AgentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await onDelete(agent.id)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{agent.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(agent)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRun(agent.id)}>
                <Play className="mr-2 h-4 w-4" />
                Run
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(agent)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="line-clamp-2">{agent.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="text-sm text-muted-foreground">
          <div className="mb-2">
            <span className="font-medium">Model:</span> {agent.model || agent.modelId}
          </div>
          <div className="mb-2">
            <span className="font-medium">Tools:</span> {agent.tools?.length ? agent.tools.join(", ") : "None"}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Created:</span> <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          Agent
        </Badge>
      </CardFooter>
    </Card>
  )
}

'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Tool } from '@/types/tools';
import {
  MoreHorizontal,
  Play,
  Edit,
  Trash2,
  Code,
  Database,
  Globe,
  FileText,
  Settings,
} from 'lucide-react';
import { EditToolDialog } from '@/components/tools/edit-tool-dialog';
import { ExecuteToolDialog } from '@/components/tools/execute-tool-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ToolCardProps {
  tool: Tool;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (tool: Tool) => Promise<void>;
  onExecute: (id: string, params: Record<string, any>) => Promise<any>;
}

export function ToolCard({
  tool,
  onDelete,
  onUpdate,
  onExecute,
}: ToolCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'api':
        return <Code className="h-5 w-5 text-blue-400" />;
      case 'data':
        return <Database className="h-5 w-5 text-purple-400" />;
      case 'web':
        return <Globe className="h-5 w-5 text-green-400" />;
      case 'file':
        return <FileText className="h-5 w-5 text-yellow-400" />;
      default:
        return <Settings className="h-5 w-5 text-gray-400" />;
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(tool.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting tool:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-200">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {getCategoryIcon(tool.category)}
              <Badge
                variant={tool.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {tool.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-gray-950 border-gray-800"
              >
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsExecuteDialogOpen(true)}>
                  <Play className="h-4 w-4 mr-2" />
                  Execute
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardTitle className="text-lg font-bold text-white mt-2">
            {tool.name}
          </CardTitle>
          <CardDescription className="text-gray-400 line-clamp-2">
            {tool.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-500">
            Created: {new Date(tool.createdAt).toLocaleDateString()}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsExecuteDialogOpen(true)}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Execute
          </Button>
        </CardFooter>
      </Card>

      <EditToolDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        tool={tool}
        onUpdateTool={onUpdate}
      />

      <ExecuteToolDialog
        isOpen={isExecuteDialogOpen}
        onClose={() => setIsExecuteDialogOpen(false)}
        tool={tool}
        onExecuteTool={onExecute}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="bg-gray-950 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              tool "{tool.name}" and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

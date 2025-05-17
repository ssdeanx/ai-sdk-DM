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
import type { Agent } from '@/types/agents';
import {
  MoreHorizontal,
  MessageSquare,
  Edit,
  Trash2,
  Bot,
  Brain,
  Search,
  UserCircle,
} from 'lucide-react';
import { EditAgentDialog } from '@/components/agents/edit-agent-dialog';
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
import { useRouter } from 'next/navigation';

interface AgentCardProps {
  agent: Agent;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (agent: Agent) => Promise<void>;
}

export function AgentCard({ agent, onDelete, onUpdate }: AgentCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'assistant':
        return <Bot className="h-5 w-5 text-blue-400" />;
      case 'chatbot':
        return <MessageSquare className="h-5 w-5 text-green-400" />;
      case 'researcher':
        return <Search className="h-5 w-5 text-purple-400" />;
      default:
        return <UserCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(agent.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting agent:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChat = () => {
    router.push(`/chat?agent=${agent.id}`);
  };

  return (
    <>
      <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-200">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {getAgentIcon(agent.type)}
              <Badge
                variant={agent.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {agent.status === 'active' ? 'Active' : 'Inactive'}
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
                <DropdownMenuItem onClick={handleChat}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
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
            {agent.name}
          </CardTitle>
          <CardDescription className="text-gray-400 line-clamp-2">
            {agent.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-300">{agent.model}</span>
          </div>
          <div className="text-xs text-gray-500">
            Created: {new Date(agent.createdAt).toLocaleDateString()}
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
          <Button variant="default" size="sm" onClick={handleChat}>
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Chat
          </Button>
        </CardFooter>
      </Card>

      <EditAgentDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        agent={agent}
        onUpdateAgent={onUpdate}
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
              agent "{agent.name}" and remove it from our servers.
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

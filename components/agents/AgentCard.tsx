'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EditAgentDialog } from './EditAgentDialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { createAvatar } from '@dicebear/core';
import { identicon } from '@dicebear/collection';
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Agent, AgentPersona, Tool } from '@/lib/shared/types/supabase';

/**
 * Component for displaying an agent card with options to edit, delete, or chat with the agent.
 * @param agent - The agent data to display.
 * @param onDelete - Callback function to handle agent deletion.
 * @param onUpdate - Callback function to handle agent updates.
 * @param model - (Optional) The model object for this agent.
 * @param tools - (Optional) The tools assigned to this agent.
 * @param persona - (Optional) The persona object for this agent.
 */
export function AgentCard({
  agent,
  onDelete,
  onUpdate,
  model,
  tools,
  persona,
}: {
  agent: Agent;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (agent: Agent) => Promise<void>;
  model?: { id: string; name: string; provider?: string };
  tools?: Tool[];
  persona?: AgentPersona;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [avatarSvg, setAvatarSvg] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const svg = createAvatar(identicon, {
        seed: agent.id || agent.name || 'agent',
        size: 64,
        backgroundColor: ['#fff', '#000'],
      }).toDataUri();
      setAvatarSvg(svg);
    })();
  }, [agent.id, agent.name]);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(agent.id);
    setIsDeleteDialogOpen(false);
    setIsDeleting(false);
  };

  const handleChat = () => {
    router.push(`/chat?agent=${agent.id}`);
  };

  const renderToolBadges = () => {
    if (tools && tools.length > 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="cursor-pointer">
                {tools.length} Tool{tools.length > 1 ? 's' : ''}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                {tools.map((tool) => (
                  <div key={tool.id}>{tool.name}</div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return null;
  };

  const renderPersonaBadge = () => {
    if (persona) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-pointer">
                Persona
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs font-semibold">{persona.name}</div>
              <div className="text-xs text-gray-400">{persona.description}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return null;
  };

  return (
    <>
      <Card className="glass-card gradient-border border-2 border-transparent hover:border-primary transition-all duration-200 shadow-lg">
        <CardHeader className="pb-2 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full overflow-hidden mb-2 bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] p-1">
            {avatarSvg ? (
              <img
                src={avatarSvg}
                alt={`Avatar for ${agent.name}`}
                className="w-full h-full object-cover rounded-full bg-white"
                draggable={false}
              />
            ) : (
              <Skeleton className="w-full h-full rounded-full" />
            )}
          </div>
          <CardTitle className="text-lg font-bold text-white text-center gradient-text">
            {agent.name}
          </CardTitle>
          <CardDescription className="text-gray-400 line-clamp-2 text-center">
            {agent.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-300 cursor-pointer">
                    Model:{' '}
                    <span className="font-semibold text-primary">
                      {model ? model.name : agent.model_id || 'Unknown'}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    {model ? (
                      <>
                        <div className="font-semibold">{model.name}</div>
                        {model.provider && (
                          <div className="text-gray-400">
                            Provider: {model.provider}
                          </div>
                        )}
                      </>
                    ) : (
                      <div>Model ID: {agent.model_id}</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {renderToolBadges()}
            {renderPersonaBadge()}
          </div>
          {agent.system_prompt && (
            <div className="text-xs text-gray-500 italic text-center mb-2 line-clamp-2">
              {agent.system_prompt}
            </div>
          )}
          <div className="text-xs text-gray-500 text-center">
            Created:{' '}
            {agent.created_at
              ? formatDistanceToNow(new Date(agent.created_at), {
                  addSuffix: true,
                })
              : 'Unknown'}
          </div>
          <div className="text-xs text-gray-500 text-center">
            Updated:{' '}
            {agent.updated_at
              ? formatDistanceToNow(new Date(agent.updated_at), {
                  addSuffix: true,
                })
              : 'Unknown'}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Button
            variant="secondary"
            className="w-1/2 mr-2"
            onClick={() => setIsEditDialogOpen(true)}
            aria-label="Edit agent"
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            className="w-1/2 ml-2"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isDeleting}
            aria-label="Delete agent"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
          <Button
            variant="default"
            className="ml-4"
            onClick={handleChat}
            aria-label="Chat with agent"
          >
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
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">{agent.name}?</span> This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
// Generated on 2025-05-20

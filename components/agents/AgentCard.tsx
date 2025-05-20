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
import { Agent } from '@/db/supabase/validation';

/**
 * Component for displaying an agent card with options to edit, delete, or chat with the agent.
 * @param agent - The agent data to display.
 * @param onDelete - Callback function to handle agent deletion.
 * @param onUpdate - Callback function to handle agent updates.
 */
export function AgentCard({
  agent,
  onDelete,
  onUpdate,
}: {
  agent: Agent;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (agent: Agent) => Promise<void>;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [avatarSvg, setAvatarSvg] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const svg = await createAvatar(identicon, {
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
              <div className="w-full h-full bg-muted rounded-full" />
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
            <span className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-300">
              Model:{' '}
              <span className="font-semibold text-primary">
                {agent.model_id || 'Unknown'}
              </span>
            </span>
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

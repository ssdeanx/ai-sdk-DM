'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { type Agent } from '@/db/supabase/validation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createAvatar } from '@dicebear/core';
import { identicon, pixelArtNeutral } from '@dicebear/collection';
import { type Style } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';
import { avataaars } from '@dicebear/collection';
import { bottts } from '@dicebear/collection';
import { croodles } from '@dicebear/collection';
import { micah } from '@dicebear/collection';
import { miniavs } from '@dicebear/collection';
import { openPeeps } from '@dicebear/collection';
import { personas } from '@dicebear/collection';
import { pixelArt } from '@dicebear/collection';
import { shapes } from '@dicebear/collection';
import { thumbs } from '@dicebear/collection';
import { useSupabaseFetch } from '@/hooks/use-supabase-fetch';
import { useSupabaseCrud } from '@/hooks/use-supabase-crud';
import { useSupabaseRealtime } from '@/hooks/use-supabase-realtime';

interface DiceBearStyleEntry {
  key: string;
  label: string;
  style: Style<object>;
}
const dicebearStyles: DiceBearStyleEntry[] = [
  { key: 'identicon', label: 'Identicon', style: identicon },
  { key: 'adventurer', label: 'Adventurer', style: adventurer },
  { key: 'avataaars', label: 'Avataaars', style: avataaars },
  { key: 'avataaars', label: 'Avataaars', style: avataaars },
  { key: 'bottts', label: 'Bottts', style: bottts },
  { key: 'croodles', label: 'Croodles', style: croodles },
  { key: 'micah', label: 'Micah', style: micah },
  { key: 'miniavs', label: 'Miniavs', style: miniavs },
  { key: 'openPeeps', label: 'OpenPeeps', style: openPeeps },
  { key: 'personas', label: 'Personas', style: personas },
  { key: 'pixelArt', label: 'Pixel Art', style: pixelArt },
  {
    key: 'pixelArtNeutral',
    label: 'Pixel Art Neutral',
    style: pixelArtNeutral,
  },
  { key: 'shapes', label: 'Shapes', style: shapes },
  { key: 'thumbs', label: 'Thumbs', style: thumbs },
];

interface EditAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
  onUpdateAgent: (agent: Agent) => Promise<void>;
}

export function EditAgentDialog({
  isOpen,
  onClose,
  agent,
  onUpdateAgent,
}: EditAgentDialogProps) {
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description || '');
  const [model_id, setModelId] = useState(agent.model_id);
  const [system_prompt, setSystemPrompt] = useState(agent.system_prompt || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarStyle, setAvatarStyle] = useState('identicon');
  const [avatarSvg, setAvatarSvg] = useState<string>('');

  // CRUD hook for agents
  const {
    update: updateAgent,
    loading: isUpdating,
    error: updateError,
  } = useSupabaseCrud({ table: 'agents' });

  // Realtime hook for models
  useSupabaseRealtime({
    table: 'models',
    event: '*',
    enabled: true,
  });

  // Fetch models from API using useSupabaseFetch
  const { data: models = [], isLoading: isModelsLoading } = useSupabaseFetch<
    Array<{ id: string; name: string; displayName?: string }>
  >({
    endpoint: '/api/ai-sdk/models',
    resourceName: 'Models',
    dataKey: 'models',
    realtime: true,
  });

  useEffect(() => {
    if (isOpen) {
      setName(agent.name);
      setDescription(agent.description || '');
      setAvatarStyle('identicon');
    }
  }, [isOpen, agent]);

  useEffect(() => {
    const styleObj =
      dicebearStyles.find((s) => s.key === avatarStyle) || dicebearStyles[0];
    const avatarInstance = createAvatar(styleObj.style, {
      seed: agent.id || name || 'agent',
      size: 64,
      backgroundColor: ['#fff', '#000'],
    });
    setAvatarSvg(avatarInstance.toDataUri());
  }, [avatarStyle, agent.id, name]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!model_id) newErrors.model_id = 'Model is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const updatedAgent = {
        ...agent,
        name,
        description,
        model_id,
        system_prompt,
        updated_at: new Date().toISOString(),
      };
      await updateAgent(agent.id, updatedAgent);
      onUpdateAgent(updatedAgent as Agent);
      onClose();
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to update agent',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-950 border-gray-800">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Edit Agent</DialogTitle>
            <DialogDescription>
              Update your AI agent details below.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center mb-4">
            <Avatar className="h-16 w-16 mb-2">
              <AvatarImage src={avatarSvg} alt="Agent Avatar" />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-2 justify-center">
              {dicebearStyles.map((styleObj) => (
                <button
                  key={styleObj.key}
                  aria-label={`Choose ${styleObj.label} avatar`}
                  type="button"
                  onClick={() => setAvatarStyle(styleObj.key)}
                >
                  <img
                    src={createAvatar(styleObj.style as Style<object>, {
                      seed: agent.id || name || 'agent',
                      size: 32,
                    }).toDataUri()}
                    alt={styleObj.label}
                    className="h-8 w-8 rounded-full"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label
                htmlFor="name"
                className={errors.name ? 'text-red-500' : ''}
              >
                Name {errors.name && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter agent name"
                className={`bg-gray-900 border-gray-800 ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="description"
                className={errors.description ? 'text-red-500' : ''}
              >
                Description{' '}
                {errors.description && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter agent description"
                className={`bg-gray-900 border-gray-800 min-h-[100px] ${errors.description ? 'border-red-500' : ''}`}
              />
              {errors.description && (
                <p className="text-red-500 text-sm">{errors.description}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="model_id"
                className={errors.model_id ? 'text-red-500' : ''}
              >
                Model{' '}
                {errors.model_id && <span className="text-red-500">*</span>}
              </Label>
              <Select
                value={model_id}
                onValueChange={setModelId}
                disabled={isModelsLoading}
              >
                <SelectTrigger
                  className={`bg-gray-900 border-gray-800 ${errors.model_id ? 'border-red-500' : ''}`}
                >
                  <SelectValue
                    placeholder={
                      isModelsLoading ? 'Loading models...' : 'Select model'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  {isModelsLoading ? (
                    <SelectItem value="" disabled>
                      Loading models...
                    </SelectItem>
                  ) : models.length === 0 ? (
                    <SelectItem value="" disabled>
                      No models available
                    </SelectItem>
                  ) : (
                    models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.displayName || model.name || model.id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.model_id && (
                <p className="text-red-500 text-sm">{errors.model_id}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="system_prompt">System Prompt</Label>
              <Textarea
                id="system_prompt"
                value={system_prompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system prompt"
                className="bg-gray-900 border-gray-800 min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUpdating}>
              {isSubmitting || isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Agent'
              )}
            </Button>
          </DialogFooter>
          {updateError && (
            <p className="text-red-500 text-sm mt-2">{updateError.message}</p>
          )}
          {errors.form && (
            <p className="text-red-500 text-sm mt-2">{errors.form}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { Agent, Model } from '@/lib/shared/types/supabase';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createAvatar, type Style } from '@dicebear/core';
import { identicon } from '@dicebear/collection';
import { adventurer } from '@dicebear/collection';
import { avataaars } from '@dicebear/collection';
import { bottts } from '@dicebear/collection';
import { croodles } from '@dicebear/collection';
import { micah } from '@dicebear/collection';
import { miniavs } from '@dicebear/collection';
import { openPeeps } from '@dicebear/collection';
import { personas } from '@dicebear/collection';
import { pixelArt } from '@dicebear/collection';
import { pixelArtNeutral } from '@dicebear/collection';
import { shapes } from '@dicebear/collection';
import { thumbs } from '@dicebear/collection';
import { useSupabaseFetch } from '@/lib/shared/hooks/use-supabase-fetch';
import { useSupabaseCrud } from '@/lib/shared/hooks/use-supabase-crud';
import { useSupabaseRealtime } from '@/lib/shared/hooks/use-supabase-realtime';

interface DiceBearStyleEntry {
  key: string;
  label: string;
  style: Style<object>;
}

const dicebearStyles: DiceBearStyleEntry[] = [
  { key: 'identicon', label: 'Identicon', style: identicon },
  { key: 'adventurer', label: 'Adventurer', style: adventurer },
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

interface CreateAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAgent: (agent: Omit<Agent, 'id'>) => Promise<void>;
}

export function CreateAgentDialog({
  isOpen,
  onClose,
  onCreateAgent,
}: CreateAgentDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model_id, setModelId] = useState('');
  const [system_prompt, setSystemPrompt] = useState('');
  const [persona_id, setPersonaId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarStyle, setAvatarStyle] = useState('identicon');
  const [avatarSvg, setAvatarSvg] = useState<string>('');

  // CRUD hook for agents
  const {
    create: createAgent,
    loading: isCreating,
    error: createError,
  } = useSupabaseCrud({ table: 'agents' });

  // Realtime hook for models
  useSupabaseRealtime({
    table: 'models',
    event: '*',
    enabled: true,
  });

  // Fetch models from API using useSupabaseFetch
  const { data: models = [], isLoading: isModelsLoading } =
    useSupabaseFetch<Model>({
      endpoint: '/api/ai-sdk/models',
      resourceName: 'Models',
      dataKey: 'models',
      realtime: true,
    });

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setModelId('');
      setSystemPrompt('');
      setPersonaId('');
      setAvatarStyle('identicon');
    }
  }, [isOpen]);

  useEffect(() => {
    const styleObj =
      dicebearStyles.find((s) => s.key === avatarStyle) || dicebearStyles[0];
    const avatarInstance = createAvatar(styleObj.style, {
      seed: name || 'agent',
      size: 64,
      backgroundColor: ['#fff', '#000'],
    });
    setAvatarSvg(avatarInstance.toDataUri());
  }, [avatarStyle, name]);

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
      const now = new Date().toISOString();
      await createAgent({
        name,
        description,
        model_id,
        system_prompt,
        persona_id,
        created_at: now,
        updated_at: now,
      });
      setName('');
      setDescription('');
      setModelId('');
      setSystemPrompt('');
      setPersonaId('');
      setErrors({});
      onCreateAgent({
        name,
        description,
        model_id,
        system_prompt,
        persona_id,
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to create agent',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setModelId('');
    setSystemPrompt('');
    setPersonaId('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-950 border-gray-800">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl text-white">
              Create New Agent
            </DialogTitle>
            <DialogDescription>
              Configure your AI agent with the details below.
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
                    src={createAvatar(styleObj.style, {
                      seed: name || 'agent',
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
                className={`bg-gray-900 border-gray-800 ${
                  errors.name ? 'border-red-500' : ''
                }`}
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
                className={`bg-gray-900 border-gray-800 min-h-[100px] ${
                  errors.description ? 'border-red-500' : ''
                }`}
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
                  className={`bg-gray-900 border-gray-800 ${
                    errors.model_id ? 'border-red-500' : ''
                  }`}
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
                        {model.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.model_id && (
                <p className="text-red-500 text-sm">{errors.model_id}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting || isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isCreating}>
              {isSubmitting || isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Agent'
              )}
            </Button>
          </DialogFooter>
          {createError && (
            <p className="text-red-500 text-sm mt-2">{createError.message}</p>
          )}
          {errors.form && (
            <p className="text-red-500 text-sm mt-2">{errors.form}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

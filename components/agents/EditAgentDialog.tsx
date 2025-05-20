'use client';

import type React from 'react';
import { z } from 'zod';

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
import { AgentSchema, type Agent } from '@/db/supabase/validation';
import { modelRegistry } from '@/lib/models/model-registry';

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

  useEffect(() => {
    if (isOpen) {
      setName(agent.name);
      setDescription(agent.description || '');
      setModelId(agent.model_id);
      setSystemPrompt(agent.system_prompt || '');
      setErrors({});
    }
  }, [isOpen, agent]);

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
      // Validate payload with canonical schema
      const updatedAgent: Agent = agentSchema.parse({
        ...agent,
        name,
        description,
        model_id,
        system_prompt,
      });
      await onUpdateAgent(updatedAgent);
      onClose();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const zodErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) zodErrors[e.path[0]] = e.message;
        });
        setErrors(zodErrors);
      }
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
              <Select value={model_id} onValueChange={setModelId}>
                <SelectTrigger
                  className={`bg-gray-900 border-gray-800 ${errors.model_id ? 'border-red-500' : ''}`}
                >
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  {modelRegistry.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.displayName || model.id}
                    </SelectItem>
                  ))}
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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Agent'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
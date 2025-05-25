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
import { Switch } from '@/components/ui/switch';
import type { Tool } from '@/lib/shared/types/tools';
import { Loader2 } from 'lucide-react';

interface EditToolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tool: Tool;
  onUpdateTool: (tool: Tool) => Promise<void>;
}

export function EditToolDialog({
  isOpen,
  onClose,
  tool,
  onUpdateTool,
}: EditToolDialogProps) {
  const [name, setName] = useState(tool.name);
  const [description, setDescription] = useState(tool.description);
  const [category, setCategory] = useState(tool.category);
  const [schema, setSchema] = useState(JSON.stringify(tool.schema, null, 2));
  const [status, setStatus] = useState(tool.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setName(tool.name);
      setDescription(tool.description);
      setCategory(tool.category);
      setSchema(JSON.stringify(tool.schema, null, 2));
      setStatus(tool.status);
      setErrors({});
    }
  }, [isOpen, tool]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!category) {
      newErrors.category = 'Category is required';
    }

    try {
      JSON.parse(schema);
    } catch (e) {
      newErrors.schema = 'Invalid JSON schema';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onUpdateTool({
        ...tool,
        name,
        description,
        category,
        schema: JSON.parse(schema),
        status,
        updatedAt: new Date().toISOString(),
      });

      onClose();
    } catch (error) {
      console.error('Error updating tool:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-950 border-gray-800">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Edit Tool</DialogTitle>
            <DialogDescription>
              Update your AI tool details below.
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
                placeholder="Enter tool name"
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
                placeholder="Enter tool description"
                className={`bg-gray-900 border-gray-800 min-h-[100px] ${errors.description ? 'border-red-500' : ''}`}
              />
              {errors.description && (
                <p className="text-red-500 text-sm">{errors.description}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="category"
                className={errors.category ? 'text-red-500' : ''}
              >
                Category{' '}
                {errors.category && <span className="text-red-500">*</span>}
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  className={`bg-gray-900 border-gray-800 ${errors.category ? 'border-red-500' : ''}`}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="data">Data Processing</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-red-500 text-sm">{errors.category}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="schema"
                className={errors.schema ? 'text-red-500' : ''}
              >
                Schema{' '}
                {errors.schema && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="schema"
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
                placeholder="Enter JSON schema"
                className={`bg-gray-900 border-gray-800 min-h-[150px] font-mono text-sm ${errors.schema ? 'border-red-500' : ''}`}
              />
              {errors.schema && (
                <p className="text-red-500 text-sm">{errors.schema}</p>
              )}
              <p className="text-gray-400 text-xs">
                Define the input parameters for your tool in JSON format.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="status">Active Status</Label>
              <Switch
                id="status"
                checked={status === 'active'}
                onCheckedChange={(checked) =>
                  setStatus(checked ? 'active' : 'inactive')
                }
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
                'Update Tool'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

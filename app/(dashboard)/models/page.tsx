'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Plus, Trash, MoreHorizontal } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { DataTable } from '@/components/ui/data-table';
import { useSupabaseFetch } from '@/hooks/use-supabase-fetch';
import { useSupabaseCrud } from '@/hooks/use-supabase-crud';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ColumnDef } from '@tanstack/react-table';

// Define the form schema
const modelFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  provider: z.string({
    required_error: 'Please select a provider.',
  }),
  modelId: z.string().min(1, {
    message: 'Model ID is required.',
  }),
  baseUrl: z.string().optional(),
  apiKey: z.string().min(1, {
    message: 'API Key is required.',
  }),
});

// Define the Model type
interface Model {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  base_url?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export default function ModelsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);

  const form = useForm<z.infer<typeof modelFormSchema>>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: {
      name: '',
      provider: 'google',
      modelId: '',
      baseUrl: '',
      apiKey: '',
    },
  });

  const {
    data: models,
    isLoading,
    refresh,
    isMockData,
  } = useSupabaseFetch<Model>({
    endpoint: '/api/models',
    resourceName: 'Models',
    dataKey: 'models',
  });

  const { create, update, remove } = useSupabaseCrud<Model>({
    resourceName: 'Model',
    endpoint: '/api/models',
    onSuccess: () => {
      setOpen(false);
      form.reset();
      setEditingModel(null);
      refresh();
    },
  });

  async function onSubmit(values: z.infer<typeof modelFormSchema>) {
    if (editingModel) {
      await update(editingModel.id, {
        name: values.name,
        provider: values.provider,
        model_id: values.modelId,
        base_url: values.baseUrl || null,
        // Only update API key if it's not the placeholder
        ...(values.apiKey !== '••••••••••••••••' && { api_key: values.apiKey }),
      });
    } else {
      await create({
        name: values.name,
        provider: values.provider,
        model_id: values.modelId,
        base_url: values.baseUrl || null,
        api_key: values.apiKey,
        status: 'active',
      });
    }
  }

  function handleEdit(model: Model) {
    setEditingModel(model);
    form.reset({
      name: model.name,
      provider: model.provider,
      modelId: model.model_id,
      baseUrl: model.base_url || '',
      apiKey: '••••••••••••••••', // Placeholder for security
    });
    setOpen(true);
  }

  async function handleDelete(id: string) {
    await remove(id);
  }

  const columns: ColumnDef<Model>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
      cell: ({ row }) => (
        <div className="capitalize">{row.original.provider}</div>
      ),
    },
    {
      accessorKey: 'model_id',
      header: 'Model ID',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'active' ? 'success' : 'warning'}
        >
          {row.original.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(row.original.id)}>
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Models</h1>
          <p className="text-muted-foreground">
            Configure connections to AI providers and models
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingModel(null);
                form.reset({
                  name: '',
                  provider: 'google',
                  modelId: '',
                  baseUrl: '',
                  apiKey: '',
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Model
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>
                {editingModel ? 'Edit Model' : 'Add New Model'}
              </DialogTitle>
              <DialogDescription>
                Configure a connection to an AI model provider.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Google Model" {...field} />
                      </FormControl>
                      <FormDescription>
                        A friendly name for this model configuration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="google">Google</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="mistral">Mistral</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The AI provider for this model
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model ID</FormLabel>
                      <FormControl>
                        <Input placeholder="gemini-pro" {...field} />
                      </FormControl>
                      <FormDescription>
                        The specific model identifier (e.g., gemini-pro, gpt-4o)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="baseUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base URL (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://api.example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Custom API endpoint URL if needed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Your API key"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Your API key for this provider
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingModel ? 'Update Model' : 'Add Model'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Models</CardTitle>
          <CardDescription>Manage your AI model connections</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={models}
            isLoading={isLoading}
            searchKey="name"
            searchPlaceholder="Search models..."
          />

          {isMockData && (
            <div className="mt-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 text-sm rounded-md">
              Note: Using mock data. Connect to Supabase to use real data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

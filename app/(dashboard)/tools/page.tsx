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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Plus, Trash, MoreHorizontal } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { DataTable } from '@/components/ui/data-table';
import { useSupabaseFetch } from '@/hooks/use-supabase-fetch';
import { useSupabaseCrud } from '@/hooks/use-supabase-crud';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ColumnDef } from '@tanstack/react-table';

// Define the Tool type
interface Tool {
  id: string;
  name: string;
  description: string;
  parameters_schema: string;
  category?: string;
  implementation?: string;
  is_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

// Define the form schema
const toolFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  parametersSchema: z.string().refine(
    (value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: 'Parameters schema must be valid JSON',
    }
  ),
  category: z.string().default('custom'),
  implementation: z.string().optional(),
  isEnabled: z.boolean().default(true),
});

const toolCategories = [
  { value: 'web', label: 'Web Tools' },
  { value: 'code', label: 'Code Tools' },
  { value: 'data', label: 'Data Tools' },
  { value: 'ai', label: 'AI Tools' },
  { value: 'custom', label: 'Custom Tools' },
];

export default function ToolsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);

  const form = useForm<z.infer<typeof toolFormSchema>>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: {
      name: '',
      description: '',
      parametersSchema: '{}',
      category: 'custom',
      implementation: '',
      isEnabled: true,
    },
  });

  const {
    data: tools,
    isLoading,
    refresh,
    isMockData,
  } = useSupabaseFetch<Tool>({
    endpoint: '/api/tools',
    resourceName: 'Tools',
    dataKey: 'tools',
  });

  const { create, update, remove } = useSupabaseCrud<Tool>({
    resourceName: 'Tool',
    endpoint: '/api/tools',
    onSuccess: () => {
      setOpen(false);
      form.reset();
      setEditingTool(null);
      refresh();
    },
  });

  async function onSubmit(values: z.infer<typeof toolFormSchema>) {
    if (editingTool) {
      await update(editingTool.id, {
        name: values.name,
        description: values.description,
        parameters_schema: values.parametersSchema,
        category: values.category,
        implementation: values.implementation,
        is_enabled: values.isEnabled,
      });
    } else {
      await create({
        name: values.name,
        description: values.description,
        parameters_schema: values.parametersSchema,
        category: values.category,
        implementation: values.implementation,
        is_enabled: values.isEnabled,
      });
    }
  }

  function handleEdit(tool: Tool) {
    setEditingTool(tool);
    form.reset({
      name: tool.name,
      description: tool.description,
      parametersSchema: tool.parameters_schema,
      category: tool.category || 'custom',
      implementation: tool.implementation || '',
      isEnabled: tool.is_enabled ?? true,
    });
    setOpen(true);
  }

  async function handleDelete(id: string) {
    await remove(id);
  }

  const columns: ColumnDef<Tool>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div
          className="max-w-[300px] truncate"
          title={row.original.description}
        >
          {row.original.description}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <div className="capitalize">{row.original.category}</div>
      ),
    },
    {
      accessorKey: 'is_enabled',
      header: 'Enabled',
      cell: ({ row }) => <span>{row.original.is_enabled ? 'Yes' : 'No'}</span>,
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
          <h1 className="text-3xl font-bold tracking-tight">AI Tools</h1>
          <p className="text-muted-foreground">
            Manage and configure your AI tools
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingTool(null);
                form.reset({
                  name: '',
                  description: '',
                  parametersSchema: '{}',
                  category: 'custom',
                  implementation: '',
                  isEnabled: true,
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>
                {editingTool ? 'Edit Tool' : 'Add New Tool'}
              </DialogTitle>
              <DialogDescription>
                Configure a custom or built-in AI tool.
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
                        <Input placeholder="Web Search" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this tool
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this tool does"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>What does this tool do?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parametersSchema"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parameters Schema (JSON)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="{}" {...field} />
                      </FormControl>
                      <FormDescription>
                        JSON schema for tool parameters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="custom" {...field} />
                      </FormControl>
                      <FormDescription>
                        Tool category (e.g., web, code, ai, custom)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="implementation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Implementation (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Implementation details or code"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional implementation details or code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enabled</FormLabel>
                      <FormControl>
                        <Input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      </FormControl>
                      <FormDescription>
                        Enable or disable this tool
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
                    {editingTool ? 'Update Tool' : 'Add Tool'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Tools</CardTitle>
          <CardDescription>Manage your AI tools</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={tools}
            isLoading={isLoading}
            searchKey="name"
            searchPlaceholder="Search tools..."
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

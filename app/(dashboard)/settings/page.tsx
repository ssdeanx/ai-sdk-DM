'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { FaKey, FaPalette, FaCogs, FaBell } from 'react-icons/fa';
import SettingsProvider from '@/components/settings/SettingsProvider';
import SettingsSidebarNav from '@/components/settings/SettingsSidebarNav';
import SettingsForm from '@/components/settings/SettingsForm';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsField from '@/components/settings/SettingsField';
import SettingsLoadingSkeleton from '@/components/settings/SettingsLoadingSkeleton';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/memory/upstash/upstash-logger';
import { ModelSchema } from '@/db/supabase/validation';
import '@/app/globals.css';

// Define Model type locally
interface Model {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  baseUrl?: string;
  status: string;
}

// Helper to coerce string/boolean values to boolean
function toBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val === 'true';
  return false;
}

// Helper to normalize theme values
function getTheme(theme: unknown): 'light' | 'dark' | 'system' {
  return theme === 'light' || theme === 'dark' || theme === 'system'
    ? (theme as 'light' | 'dark' | 'system')
    : 'system';
}

// Settings categories and keys
const SETTINGS_CATEGORIES = [
  'api',
  'appearance',
  'advanced',
  'notifications',
] as const;

// Settings form schemas (define per category, or use SettingSchema for validation)
const apiSettingsSchema = z.object({
  google_api_key: z.string().optional(),
  default_model_id: z.string().optional(),
});
const appearanceSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  enable_animations: z.boolean(),
  accent_color: z.string(),
});
const advancedSettingsSchema = z.object({
  token_limit_warning: z.number(),
  enable_embeddings: z.boolean(),
  enable_token_counting: z.boolean(),
  streaming_responses: z.boolean(),
});
const notificationSettingsSchema = z.object({
  email_notifications: z.boolean(),
  agent_completion_notifications: z.boolean(),
  system_notifications: z.boolean(),
});

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('api');
  const [settings, setSettings] = useState<
    Record<string, Record<string, string>>
  >({});
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        // Fetch settings
        const res = await fetch('/api/ai-sdk/settings');
        const data = await res.json();
        // Group by category
        const grouped: Record<string, Record<string, string>> = {};
        for (const item of data) {
          if (SETTINGS_CATEGORIES.includes(item.category)) {
            grouped[item.category] = grouped[item.category] || {};
            grouped[item.category][item.key] = item.value;
          }
        }
        setSettings(grouped);
        // Fetch models
        const modelsRes = await fetch('/api/models');
        const modelsData = await modelsRes.json();
        // Validate and parse models using ModelSchema
        const validModels: Model[] = Array.isArray(modelsData.models)
          ? modelsData.models
              .map((m: unknown) => {
                const parsed = ModelSchema.safeParse(m);
                return parsed.success ? parsed.data : null;
              })
              .filter(Boolean)
          : [];
        setModels(validModels);
      } catch (err) {
        logError(
          'settings-page',
          'Failed to fetch settings/models',
          err instanceof Error ? err : { error: String(err) }
        );
        toast({
          title: 'Error',
          description: 'Failed to load settings or models.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [toast]);

  async function handleSave(
    category: string,
    values: Record<string, unknown>,
    schema: z.ZodTypeAny
  ) {
    try {
      schema.parse(values);
      for (const [key, value] of Object.entries(values)) {
        const payload = {
          category,
          key,
          value:
            typeof value === 'object' ? JSON.stringify(value) : String(value),
        };
        const res = await fetch('/api/ai-sdk/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok)
          throw new Error(`Failed to save ${category} setting: ${key}`);
      }
      toast({
        title: 'Settings saved',
        description: `${category.charAt(0).toUpperCase() + category.slice(1)} settings updated successfully.`,
      });
      // Refetch settings
      const res = await fetch('/api/ai-sdk/settings');
      const data = await res.json();
      const grouped: Record<string, Record<string, string>> = {};
      for (const item of data) {
        if (SETTINGS_CATEGORIES.includes(item.category)) {
          grouped[item.category] = grouped[item.category] || {};
          grouped[item.category][item.key] = item.value;
        }
      }
      setSettings(grouped);
    } catch (err) {
      logError(
        'settings-page',
        `Failed to save ${category} settings`,
        err instanceof Error ? err : { error: String(err) }
      );
      toast({
        title: 'Error',
        description: `Failed to save ${category} settings`,
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <SettingsLoadingSkeleton />
      </div>
    );
  }

  // Normalized default values for each section
  const apiDefaults = {
    google_api_key: settings.api?.google_api_key || '',
    default_model_id: settings.api?.default_model_id || '',
  };
  const appearanceDefaults = {
    theme: getTheme(settings.appearance?.theme),
    enable_animations: toBoolean(settings.appearance?.enable_animations),
    accent_color: settings.appearance?.accent_color || 'violet',
  };
  const advancedDefaults = {
    token_limit_warning: Number(settings.advanced?.token_limit_warning) || 3500,
    enable_embeddings: toBoolean(settings.advanced?.enable_embeddings),
    enable_token_counting: toBoolean(settings.advanced?.enable_token_counting),
    streaming_responses: toBoolean(settings.advanced?.streaming_responses),
  };
  const notificationDefaults = {
    email_notifications: toBoolean(settings.notifications?.email_notifications),
    agent_completion_notifications: toBoolean(
      settings.notifications?.agent_completion_notifications
    ),
    system_notifications: toBoolean(
      settings.notifications?.system_notifications
    ),
  };

  const sections = [
    {
      key: 'api',
      label: 'API',
      icon: <FaKey className="h-4 w-4" />,
    },
    {
      key: 'appearance',
      label: 'Appearance',
      icon: <FaPalette className="h-4 w-4" />,
    },
    {
      key: 'advanced',
      label: 'Advanced',
      icon: <FaCogs className="h-4 w-4" />,
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: <FaBell className="h-4 w-4" />,
    },
  ];

  return (
    <SettingsProvider>
      <div className="flex flex-col md:flex-row-reverse gap-8 w-full max-w-5xl mx-auto py-10 px-2 md:px-8">
        {/* Sidebar on the right */}
        <aside className="w-full md:w-64 shrink-0 md:sticky md:top-24">
          <SettingsSidebarNav
            sections={sections}
            activeKey={activeTab}
            onSelect={setActiveTab}
          />
        </aside>
        {/* Main content */}
        <main className="flex-1 space-y-8">
          {activeTab === 'api' && (
            <SettingsSection
              title="API Settings"
              description="Configure your API keys and default model."
              icon={<FaKey className="h-5 w-5 text-primary" />}
            >
              <SettingsForm
                schema={apiSettingsSchema}
                defaultValues={apiDefaults}
                onSubmit={(values) =>
                  handleSave('api', values, apiSettingsSchema)
                }
              >
                <SettingsField
                  label="Google API Key"
                  description="Your Google Gemini API key."
                >
                  <input
                    type="password"
                    className="input input-bordered w-full"
                    name="google_api_key"
                    title="Google API Key"
                    placeholder="Enter your Google Gemini API key"
                    defaultValue={apiDefaults.google_api_key}
                  />
                </SettingsField>
                <SettingsField
                  label="Default Model"
                  description="Select the default model for completions."
                >
                  <select
                    className="input input-bordered w-full"
                    name="default_model_id"
                    title="Default Model"
                    defaultValue={apiDefaults.default_model_id}
                  >
                    <option value="">Select a model</option>
                    {models?.map((model) => (
                      <option key={model.id} value={model.modelId}>
                        {model.name} ({model.provider})
                      </option>
                    ))}
                  </select>
                </SettingsField>
              </SettingsForm>
            </SettingsSection>
          )}
          {activeTab === 'appearance' && (
            <SettingsSection
              title="Appearance"
              description="Customize the look and feel."
              icon={<FaPalette className="h-5 w-5 text-primary" />}
            >
              <SettingsForm
                schema={appearanceSettingsSchema}
                defaultValues={appearanceDefaults}
                onSubmit={(values) =>
                  handleSave('appearance', values, appearanceSettingsSchema)
                }
              >
                <SettingsField
                  label="Theme"
                  description="Choose your preferred theme."
                >
                  <select
                    className="input input-bordered w-full"
                    name="theme"
                    title="Theme"
                    defaultValue={appearanceDefaults.theme}
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </SettingsField>
                <SettingsField
                  label="Accent Color"
                  description="Pick an accent color."
                >
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    name="accent_color"
                    title="Accent Color"
                    placeholder="e.g. violet"
                    defaultValue={appearanceDefaults.accent_color}
                  />
                </SettingsField>
                <SettingsField label="Enable Animations">
                  <input
                    type="checkbox"
                    className="checkbox"
                    name="enable_animations"
                    title="Enable Animations"
                    defaultChecked={appearanceDefaults.enable_animations}
                  />
                </SettingsField>
              </SettingsForm>
            </SettingsSection>
          )}
          {activeTab === 'advanced' && (
            <SettingsSection
              title="Advanced"
              description="Advanced configuration options."
              icon={<FaCogs className="h-5 w-5 text-primary" />}
            >
              <SettingsForm
                schema={advancedSettingsSchema}
                defaultValues={advancedDefaults}
                onSubmit={(values) =>
                  handleSave('advanced', values, advancedSettingsSchema)
                }
              >
                <SettingsField
                  label="Token Limit Warning"
                  description="Show a warning when nearing this token count."
                >
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    name="token_limit_warning"
                    title="Token Limit Warning"
                    placeholder="e.g. 3500"
                    defaultValue={advancedDefaults.token_limit_warning}
                  />
                </SettingsField>
                <SettingsField label="Enable Embeddings">
                  <input
                    type="checkbox"
                    className="checkbox"
                    name="enable_embeddings"
                    title="Enable Embeddings"
                    defaultChecked={advancedDefaults.enable_embeddings}
                  />
                </SettingsField>
                <SettingsField label="Enable Token Counting">
                  <input
                    type="checkbox"
                    className="checkbox"
                    name="enable_token_counting"
                    title="Enable Token Counting"
                    defaultChecked={advancedDefaults.enable_token_counting}
                  />
                </SettingsField>
                <SettingsField label="Streaming Responses">
                  <input
                    type="checkbox"
                    className="checkbox"
                    name="streaming_responses"
                    title="Streaming Responses"
                    defaultChecked={advancedDefaults.streaming_responses}
                  />
                </SettingsField>
              </SettingsForm>
            </SettingsSection>
          )}
          {activeTab === 'notifications' && (
            <SettingsSection
              title="Notifications"
              description="Notification preferences."
              icon={<FaBell className="h-5 w-5 text-primary" />}
            >
              <SettingsForm
                schema={notificationSettingsSchema}
                defaultValues={notificationDefaults}
                onSubmit={(values) =>
                  handleSave(
                    'notifications',
                    values,
                    notificationSettingsSchema
                  )
                }
              >
                <SettingsField label="Email Notifications">
                  <input
                    type="checkbox"
                    className="checkbox"
                    name="email_notifications"
                    title="Email Notifications"
                    defaultChecked={notificationDefaults.email_notifications}
                  />
                </SettingsField>
                <SettingsField label="Agent Completion Notifications">
                  <input
                    type="checkbox"
                    className="checkbox"
                    name="agent_completion_notifications"
                    title="Agent Completion Notifications"
                    defaultChecked={
                      notificationDefaults.agent_completion_notifications
                    }
                  />
                </SettingsField>
                <SettingsField label="System Notifications">
                  <input
                    type="checkbox"
                    className="checkbox"
                    name="system_notifications"
                    title="System Notifications"
                    defaultChecked={notificationDefaults.system_notifications}
                  />
                </SettingsField>
              </SettingsForm>
            </SettingsSection>
          )}
        </main>
      </div>
    </SettingsProvider>
  );
}

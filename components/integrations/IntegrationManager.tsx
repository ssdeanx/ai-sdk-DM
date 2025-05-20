import React, { useState, useEffect } from 'react';

// UI components from your shadnui UI library
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Import Integration type from your validation schema
import { Integration } from '@/db/supabase/validation';

// Import react-icons for provider icons
import { FaGithub, FaGoogle, FaCloud } from 'react-icons/fa';
import { SiVercel, SiSupabase } from 'react-icons/si';

// Import InteractiveForm from '@/components/chat/interactive-form';
import { InteractiveForm } from '@/components/chat/interactive-form';

// Helper function to return provider icon based on provider name
function getProviderIcon(provider: string) {
  switch (provider.toLowerCase()) {
    case 'github':
      return <FaGithub />;
    case 'supabase':
      return <SiSupabase />;
    case 'vercel':
      return <SiVercel />;
    case 'google':
      return <FaGoogle />;
    case 'neon':
      return <FaCloud />;
    default:
      return <FaCloud />;
  }
}

const IntegrationManager: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);

  // Fetch integrations from your API endpoint
  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-sdk/integrations');
      if (!response.ok) throw new Error('Failed to fetch integrations');
      const data = await response.json();
      setIntegrations(data);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  // Add new function handleFormSubmit
  const handleFormSubmit = async (data: Record<string, any>) => {
    // Build integration object according to Integration schema
    const newIntegration: Partial<Integration> = {
      provider: data.provider,
      name: data.name || data.provider,
      credentials: { apiKey: data.apiKey },
      config: data.config ? JSON.parse(data.config) : {},
      status: 'active',
      user_id: 'current_user', // Placeholder
    };
    try {
      const response = await fetch('/api/ai-sdk/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIntegration),
      });
      if (!response.ok) throw new Error('Failed to add integration');
      await fetchIntegrations();
      setShowForm(false);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    }
  };

  // Handle deletion of an integration by id
  const handleDeleteIntegration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    try {
      const response = await fetch(`/api/ai-sdk/integrations?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete integration');
      await fetchIntegrations();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Integration Manager</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Integration'}
        </Button>
      </div>
      {showForm && (
        <InteractiveForm
          title="Add New Integration"
          fields={[
            {
              id: 'provider',
              type: 'select',
              label: 'Provider',
              required: true,
              options: [
                { value: 'github', label: 'GitHub' },
                { value: 'supabase', label: 'Supabase' },
                { value: 'vercel', label: 'Vercel' },
                { value: 'google', label: 'Google' },
                { value: 'neon', label: 'Neon' },
              ],
            },
            {
              id: 'name',
              type: 'text',
              label: 'Integration Name',
              placeholder: 'Integration Name',
              required: false,
            },
            {
              id: 'apiKey',
              type: 'text',
              label: 'API Key',
              placeholder: 'API Key',
              required: true,
            },
            {
              id: 'config',
              type: 'textarea',
              label: 'Config (JSON)',
              placeholder: '{"option": "value"}',
              required: false,
            },
          ]}
          submitLabel="Submit"
          cancelLabel="Cancel"
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}
      {loading ? (
        <p>Loading integrations...</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <Card
              key={integration.id}
              className="p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl">
                    {getProviderIcon(integration.provider)}
                  </div>
                  <h2 className="text-xl font-semibold">{integration.name}</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Status: {integration.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created:{' '}
                  {new Date(integration.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    alert('Edit functionality not implemented yet')
                  }
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteIntegration(integration.id)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default IntegrationManager;

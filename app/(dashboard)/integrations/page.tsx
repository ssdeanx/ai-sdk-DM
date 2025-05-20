'use client';

import IntegrationManager from '@/components/integrations/IntegrationManager';

export default function IntegrationsPage() {
  return (
    <div className="container mx-auto py-10 px-4 bg-gradient-radial from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] animate-fadeIn">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold gradient-text">
          Integrations Dashboard
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Manage your connections with cutting edge style.
        </p>
      </header>
      <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-6 glass-card">
        <IntegrationManager />
      </div>
    </div>
  );
}

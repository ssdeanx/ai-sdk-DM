// Generated on 2025-05-20
'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { FaCog } from 'react-icons/fa';

/**
 * SettingsLoadingSkeleton - Skeleton loader for settings pages, with icon and advanced styling.
 */
export const SettingsLoadingSkeleton: React.FC = () => (
  <div className="space-y-6 glass-card p-6 animate-pulse-slow">
    <div className="flex items-center gap-2 mb-2">
      <FaCog className="h-6 w-6 text-muted-foreground animate-spin" />
      <span className="gradient-text text-lg font-bold tracking-tight">
        Loading Settings…
      </span>
    </div>
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-6 w-1/2" />
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  </div>
);

export default SettingsLoadingSkeleton;

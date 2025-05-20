// Generated on 2025-05-20
'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { FaSlidersH } from 'react-icons/fa';

/**
 * SettingsSection - Modular container for a settings section, with optional icon and advanced styling.
 * @param props.title Section title
 * @param props.description Section description
 * @param props.icon Optional icon (React component)
 * @param props.children Section content
 */
export interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  icon,
  children,
  className,
}) => (
  <Card className={`glass-card ${className || ''}`}>
    <CardHeader className="flex flex-row items-center gap-2">
      {icon || <FaSlidersH className="h-5 w-5 text-primary" />}
      <div>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default SettingsSection;

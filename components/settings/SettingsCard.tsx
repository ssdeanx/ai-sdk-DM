// Generated on 2025-05-20
'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { FaRegIdBadge } from 'react-icons/fa';

/**
 * SettingsCard - Visual card for a settings section or group, with optional icon and advanced styling.
 * @param props.title Card title
 * @param props.description Card description
 * @param props.icon Optional icon (React component)
 * @param props.children Card content
 * @param props.footer Optional card footer
 */
export interface SettingsCardProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  description,
  icon,
  children,
  footer,
  className,
}) => (
  <Card className={`glass-card shadow-lg ${className || ''}`}>
    {(title || description || icon) && (
      <CardHeader className="flex flex-row items-center gap-2">
        {icon || <FaRegIdBadge className="h-5 w-5 text-primary" />}
        <div>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
    )}
    <CardContent>{children}</CardContent>
    {footer && <CardFooter>{footer}</CardFooter>}
  </Card>
);

export default SettingsCard;

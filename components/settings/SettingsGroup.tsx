// Generated on 2025-05-20
'use client';

import React from 'react';
import { FaLayerGroup } from 'react-icons/fa';

/**
 * SettingsGroup - Group related settings fields together, with optional icon and advanced styling.
 * @param props.title Group title
 * @param props.icon Optional icon (React component)
 * @param props.children Group content
 */
export interface SettingsGroupProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  icon,
  children,
  className,
}) => (
  <div className={`glass-card p-4 ${className || ''}`}>
    {title && (
      <div className="flex items-center gap-2 font-semibold mb-2">
        {icon || <FaLayerGroup className="h-4 w-4 text-primary" />}
        <span>{title}</span>
      </div>
    )}
    <div className="space-y-4">{children}</div>
  </div>
);

export default SettingsGroup;

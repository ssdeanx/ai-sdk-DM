// Generated on 2025-05-20
'use client';

import React from 'react';
import {
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
  FormControl,
} from '@/components/ui/form';
import { FaInfoCircle, FaExclamationCircle } from 'react-icons/fa';

/**
 * SettingsField - Generic field for settings forms with icon cues and accessibility.
 * @param props.label Field label
 * @param props.description Field description
 * @param props.children Field input/control
 * @param props.error Error message
 */
export interface SettingsFieldProps {
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}

export const SettingsField: React.FC<SettingsFieldProps> = ({
  label,
  description,
  error,
  children,
}) => (
  <FormItem>
    <div className="flex items-center gap-2">
      <FormLabel>{label}</FormLabel>
      {description && (
        <FaInfoCircle
          className="h-4 w-4 text-blue-400"
          title="Info"
          aria-label="Info"
        />
      )}
      {error && (
        <FaExclamationCircle
          className="h-4 w-4 text-destructive"
          title="Error"
          aria-label="Error"
        />
      )}
    </div>
    <FormControl>{children}</FormControl>
    {description && <FormDescription>{description}</FormDescription>}
    {error && <FormMessage>{error}</FormMessage>}
  </FormItem>
);

export default SettingsField;

// Generated on 2025-05-20
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { FaRegSave, FaTimes } from 'react-icons/fa';

/**
 * SettingsSaveBar - Sticky save/cancel bar for settings forms, with icons and advanced styling.
 * @param props.onSave Save handler
 * @param props.onCancel Cancel handler
 * @param props.isLoading Loading state
 */
export interface SettingsSaveBarProps {
  onSave: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
}

export const SettingsSaveBar: React.FC<SettingsSaveBarProps> = ({
  onSave,
  onCancel,
  isLoading,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
}) => (
  <div className="sticky bottom-0 glass-card border-t flex justify-end gap-2 p-4 z-10 shadow-lg">
    {onCancel && (
      <Button
        variant="outline"
        type="button"
        onClick={onCancel}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        <FaTimes className="h-4 w-4" />
        {cancelLabel}
      </Button>
    )}
    <Button
      type="button"
      onClick={onSave}
      disabled={isLoading}
      className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-700"
    >
      <FaRegSave className="h-4 w-4" />
      {isLoading ? 'Saving...' : saveLabel}
    </Button>
  </div>
);

export default SettingsSaveBar;

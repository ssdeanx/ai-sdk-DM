// Generated on 2025-05-20
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FaRegSave } from 'react-icons/fa';

/**
 * SettingsProvider - Context provider for settings state, with dirty state badge and advanced features.
 * @param props.children Children components
 */
export interface SettingsContextValue {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
}
const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined
);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isDirty, setDirty] = useState(false);
  return (
    <SettingsContext.Provider value={{ isDirty, setDirty }}>
      <div className="relative">
        {isDirty && (
          <div className="absolute right-0 top-0 z-20 flex items-center gap-2 p-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold animate-pulse-slow shadow">
              <FaRegSave className="h-4 w-4 text-yellow-600" />
              Unsaved changes
            </span>
          </div>
        )}
        {children}
      </div>
    </SettingsContext.Provider>
  );
};

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}

export default SettingsProvider;

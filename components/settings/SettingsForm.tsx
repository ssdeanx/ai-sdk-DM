// Generated on 2025-05-20
'use client';

import React from 'react';
import { z } from 'zod';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';

/**
 * SettingsForm - Form wrapper for settings with Zod validation and advanced styling.
 * @param props.schema Zod schema for validation
 * @param props.defaultValues Default form values
 * @param props.onSubmit Submit handler
 * @param props.children Form content
 * @param props.className Optional additional class names
 */
export interface SettingsFormProps<T extends z.ZodTypeAny> {
  schema: T;
  defaultValues: z.infer<T>;
  onSubmit: SubmitHandler<z.infer<T>>;
  children: React.ReactNode;
  className?: string;
}

export function SettingsForm<T extends z.ZodTypeAny>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
}: SettingsFormProps<T>) {
  const methods = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className={`glass-card p-8 rounded-2xl shadow-xl border border-border/40 bg-gradient-to-br from-background to-muted/60 dark:from-background dark:to-muted/40 transition-all duration-300 ${className || ''}`}
        aria-label="Settings Form"
        autoComplete="off"
      >
        <div className="flex items-center gap-2 mb-6">
          <Sparkles
            className="h-6 w-6 text-primary animate-fadeIn"
            aria-hidden="true"
          />
          <span className="gradient-text text-xl font-bold tracking-tight">
            Settings
          </span>
        </div>
        {/* Error summary for accessibility */}
        {methods.formState.errors &&
        Object.keys(methods.formState.errors).length > 0 ? (
          <div
            className="mb-4 p-3 rounded bg-destructive/10 text-destructive border border-destructive animate-fadeIn"
            role="alert"
          >
            <ul className="list-disc pl-5 text-sm">
              {Object.entries(methods.formState.errors).map(([key, err]) => {
                return (
                  <li key={key}>
                    {typeof err === 'object' && err && 'message' in err
                      ? (err as { message?: string }).message ||
                        key + ' is invalid'
                      : key + ' is invalid'}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        <div className="space-y-6">{children}</div>
        {/* Animated submit button for advanced UX */}
        <div className="flex justify-end mt-8">
          <button
            type="submit"
            className="relative inline-flex items-center gap-2 px-6 py-2 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 animate-fadeIn"
            disabled={methods.formState.isSubmitting}
          >
            <span className="sr-only">Save settings</span>
            <Sparkles className="h-5 w-5 animate-pulse-slow" />
            {methods.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}

export default SettingsForm;

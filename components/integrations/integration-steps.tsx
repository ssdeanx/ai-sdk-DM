'use client';

import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

type StepStatus = 'upcoming' | 'current' | 'complete';

interface Step {
  title: string;
  description: string;
  status: StepStatus;
}

interface IntegrationStepsProps {
  steps: Step[];
}

export function IntegrationSteps({ steps }: IntegrationStepsProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2',
                step.status === 'complete'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : step.status === 'current'
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground/30 text-muted-foreground/30'
              )}
            >
              {step.status === 'complete' ? (
                <Check className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-full w-0.5 my-1',
                  step.status === 'complete'
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30'
                )}
              />
            )}
          </div>
          <div className="space-y-1 pt-1 pb-4">
            <p
              className={cn(
                'font-medium',
                step.status === 'upcoming' && 'text-muted-foreground/70'
              )}
            >
              {step.title}
            </p>
            <p
              className={cn(
                'text-sm text-muted-foreground',
                step.status === 'upcoming' && 'text-muted-foreground/50'
              )}
            >
              {step.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

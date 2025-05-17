import * as React from 'react';
import { cn } from '@/lib/utils';

interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'outline';
  gradientDirection?:
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'tr'
    | 'br'
    | 'bl'
    | 'tl';
  gradientFrom?: string;
  gradientTo?: string;
  hoverEffect?: boolean;
}

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  (
    {
      className,
      variant = 'default',
      gradientDirection = 'br',
      gradientFrom = 'from-blue-500',
      gradientTo = 'to-violet-500',
      hoverEffect = true,
      ...props
    },
    ref
  ) => {
    // Determine gradient direction class
    const directionClass = {
      top: 'bg-gradient-to-t',
      right: 'bg-gradient-to-r',
      bottom: 'bg-gradient-to-b',
      left: 'bg-gradient-to-l',
      tr: 'bg-gradient-to-tr',
      br: 'bg-gradient-to-br',
      bl: 'bg-gradient-to-bl',
      tl: 'bg-gradient-to-tl',
    }[gradientDirection];

    // Determine variant classes
    const variantClasses = {
      default: 'relative p-[1px] bg-background overflow-hidden rounded-lg',
      subtle: 'relative p-[1px] bg-background overflow-hidden rounded-lg',
      outline: 'relative p-[1px] bg-transparent overflow-hidden rounded-lg',
    }[variant];

    // Determine hover effect classes
    const hoverClasses = hoverEffect
      ? 'transition-all duration-300 hover:shadow-md hover:shadow-accent/10'
      : '';

    return (
      <div
        ref={ref}
        className={cn(variantClasses, hoverClasses, className)}
        {...props}
      >
        {/* Gradient border */}
        <div
          className={cn(
            'absolute inset-0 -z-10',
            directionClass,
            gradientFrom,
            gradientTo,
            variant === 'subtle' && 'opacity-30 dark:opacity-20'
          )}
        />

        {/* Card content */}
        <div className="relative h-full w-full rounded-[7px] bg-background p-4">
          {props.children}
        </div>
      </div>
    );
  }
);
GradientCard.displayName = 'GradientCard';

export { GradientCard };

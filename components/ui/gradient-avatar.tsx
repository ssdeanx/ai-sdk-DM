import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface GradientAvatarProps extends React.ComponentProps<typeof Avatar> {
  gradientFrom?: string;
  gradientTo?: string;
  borderWidth?: 'thin' | 'medium' | 'thick';
  fallback: string;
  src?: string;
  alt?: string;
}

export function GradientAvatar({
  className,
  gradientFrom = 'from-blue-500',
  gradientTo = 'to-violet-500',
  borderWidth = 'medium',
  fallback,
  src,
  alt,
  ...props
}: GradientAvatarProps) {
  // Determine border width
  const borderWidthClass = {
    thin: 'p-[1px]',
    medium: 'p-[2px]',
    thick: 'p-[3px]',
  }[borderWidth];

  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br',
        gradientFrom,
        gradientTo,
        borderWidthClass,
        className
      )}
    >
      <Avatar className="h-full w-full" {...props}>
        {src && <AvatarImage src={src} alt={alt || fallback} />}
        <AvatarFallback className="bg-background text-foreground">
          {fallback}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

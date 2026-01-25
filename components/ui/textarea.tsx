import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps extends React.ComponentProps<'textarea'> {
  /** Visual error state */
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border bg-background px-3 py-2 text-base ring-offset-background md:text-sm',
          // Smooth transitions
          'transition-all duration-200',
          // Placeholder
          'placeholder:text-muted-foreground/60',
          // Default border
          'border-input',
          // Hover state
          'hover:border-border hover:bg-muted/30',
          // Focus state
          'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          'focus-visible:bg-background',
          // Error state
          error && [
            'border-destructive',
            'focus-visible:border-destructive focus-visible:ring-destructive/20',
            'hover:border-destructive/80',
          ],
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background disabled:hover:border-input',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };

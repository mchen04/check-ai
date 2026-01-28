import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visual error state */
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background',
          // Smooth transitions for all interactive states
          'transition-all duration-200',
          // File input styling
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          // Placeholder styling
          'placeholder:text-muted-foreground/60',
          // Default border
          'border-input',
          // Hover state (subtle)
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
Input.displayName = 'Input';

export { Input };

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface LoadingSpinnerProps {
  /** Size variant */
  size?: 'xs' | 'sm' | 'default' | 'lg';
  /** Additional class name */
  className?: string;
}

export interface LoadingStateProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'default' | 'lg';
  /** Height of the container */
  height?: 'sm' | 'default' | 'lg' | 'full';
  /** Optional loading message */
  message?: string;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// SIZE CONFIGS
// =============================================================================

const spinnerSizeConfig = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  default: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const containerHeightConfig = {
  sm: 'py-6',
  default: 'py-12',
  lg: 'py-16',
  full: 'min-h-[200px]',
};

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Simple loading spinner icon.
 * Use inside buttons or inline with text.
 */
export function LoadingSpinner({ size = 'sm', className }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin', spinnerSizeConfig[size], className)}
    />
  );
}

/**
 * Centered loading state with optional message.
 * Use for full-page or card loading states.
 */
export function LoadingState({
  size = 'default',
  height = 'default',
  message,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        containerHeightConfig[height],
        className
      )}
    >
      <LoadingSpinner size={size} className="text-muted-foreground" />
      {message && (
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

/**
 * Button loading spinner (smaller, with margin for text).
 * Use inside buttons: {isLoading && <ButtonSpinner />}
 */
export function ButtonSpinner({ className }: { className?: string }) {
  return <LoadingSpinner size="sm" className={cn('mr-2', className)} />;
}

// Alias for convenience
export { LoadingSpinner as Spinner };

export default LoadingSpinner;

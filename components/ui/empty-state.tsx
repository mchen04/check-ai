import { LucideIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// =============================================================================
// TYPES
// =============================================================================

export interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Main message text */
  message: string;
  /** Optional description below the message */
  description?: string;
  /** Action button configuration */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional class name */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
}

// =============================================================================
// COMPONENT
// =============================================================================

const sizeConfig = {
  sm: {
    container: 'py-6',
    icon: 'h-6 w-6 mb-2',
    message: 'text-sm',
    description: 'text-xs',
  },
  default: {
    container: 'py-12',
    icon: 'h-8 w-8 mb-2',
    message: 'text-base',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'h-12 w-12 mb-3',
    message: 'text-lg',
    description: 'text-base',
  },
};

/**
 * Reusable empty state component for showing "no data" states.
 *
 * Features:
 * - Optional icon
 * - Message with optional description
 * - Optional action button
 * - Size variants
 */
export function EmptyState({
  icon: Icon,
  message,
  description,
  action,
  className,
  size = 'default',
}: EmptyStateProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center text-muted-foreground',
        // Entrance animation
        'animate-in fade-in-0 zoom-in-95 duration-300',
        config.container,
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            'opacity-50 transition-transform duration-300',
            config.icon
          )}
        />
      )}
      <p className={cn(config.message, 'animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-75')}>
        {message}
      </p>
      {description && (
        <p className={cn('mt-1 opacity-75 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-100', config.description)}>
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="link"
          size="sm"
          onClick={action.onClick}
          className="mt-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-150"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// SPECIALIZED EMPTY STATES
// =============================================================================

export interface FilteredEmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Whether filters are currently active */
  hasActiveFilters: boolean;
  /** Message when filters are active */
  filteredMessage?: string;
  /** Message when no data exists at all */
  emptyMessage?: string;
  /** Callback to clear filters */
  onClearFilters?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * Empty state that handles both "no data" and "no matches" scenarios.
 */
export function FilteredEmptyState({
  icon: Icon,
  hasActiveFilters,
  filteredMessage = 'No results match your filters',
  emptyMessage = 'No data found',
  onClearFilters,
  className,
}: FilteredEmptyStateProps) {
  return (
    <EmptyState
      icon={Icon}
      message={hasActiveFilters ? filteredMessage : emptyMessage}
      action={
        hasActiveFilters && onClearFilters
          ? { label: 'Clear filters', onClick: onClearFilters }
          : undefined
      }
      className={className}
    />
  );
}

// =============================================================================
// ERROR STATE
// =============================================================================

export interface ErrorStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Error message */
  message: string;
  /** Retry action callback */
  onRetry?: () => void;
  /** Retry button label */
  retryLabel?: string;
  /** Additional class name */
  className?: string;
}

/**
 * Error state component for showing error messages with optional retry action.
 */
export function ErrorState({
  icon: Icon,
  message,
  onRetry,
  retryLabel = 'Try Again',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        'animate-in fade-in-0 zoom-in-95 duration-300',
        className
      )}
    >
      {Icon && (
        <Icon className="mb-4 h-12 w-12 text-destructive/50 animate-in fade-in-0 scale-in-50 duration-300" />
      )}
      <p className="mb-4 text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-75">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-100"
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// INLINE ERROR
// =============================================================================

export interface InlineErrorProps {
  /** Error message to display */
  message: string | null | undefined;
  /** Additional class name */
  className?: string;
}

/**
 * Inline error message for forms and dialogs.
 * Only renders when message is truthy.
 *
 * @example
 * ```tsx
 * <InlineError message={error} />
 * ```
 */
export function InlineError({ message, className }: InlineErrorProps) {
  if (!message) return null;

  return (
    <div className={cn('flex items-center gap-2 text-sm text-destructive', className)}>
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

export default EmptyState;

import { LucideIcon, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type AlertVariant = 'warning' | 'error' | 'info' | 'success';

export interface AlertBannerProps {
  /** Alert variant determines the color scheme */
  variant?: AlertVariant;
  /** Custom icon (defaults based on variant) */
  icon?: LucideIcon;
  /** Title text (optional) */
  title?: string;
  /** Description/body text */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'default';
}

// =============================================================================
// VARIANT CONFIG
// =============================================================================

const variantConfig = {
  warning: {
    border: 'border-warning/30',
    bg: 'bg-warning/5',
    icon: AlertCircle,
    iconColor: 'text-warning',
    titleColor: 'text-warning',
    textColor: 'text-warning/80',
  },
  error: {
    border: 'border-destructive/30',
    bg: 'bg-destructive/5',
    icon: AlertCircle,
    iconColor: 'text-destructive',
    titleColor: 'text-destructive',
    textColor: 'text-destructive/80',
  },
  info: {
    border: 'border-info/30',
    bg: 'bg-info/5',
    icon: Info,
    iconColor: 'text-info',
    titleColor: 'text-info',
    textColor: 'text-info/80',
  },
  success: {
    border: 'border-success/30',
    bg: 'bg-success/5',
    icon: CheckCircle,
    iconColor: 'text-success',
    titleColor: 'text-success',
    textColor: 'text-success/80',
  },
};

const sizeConfig = {
  sm: {
    padding: 'p-2',
    iconSize: 'h-3.5 w-3.5',
    titleSize: 'text-xs',
    textSize: 'text-[10px]',
    gap: 'gap-2',
  },
  default: {
    padding: 'p-3',
    iconSize: 'h-4 w-4',
    titleSize: 'text-sm',
    textSize: 'text-xs',
    gap: 'gap-2',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Alert banner for displaying warning, error, info, or success messages.
 *
 * @example
 * ```tsx
 * <AlertBanner variant="warning" title="Keep your API keys secure">
 *   Never share your API keys publicly or commit them to version control.
 * </AlertBanner>
 * ```
 */
export function AlertBanner({
  variant = 'warning',
  icon,
  title,
  children,
  className,
  size = 'default',
}: AlertBannerProps) {
  const config = variantConfig[variant];
  const sizes = sizeConfig[size];
  const Icon = icon || config.icon;

  return (
    <div
      className={cn(
        'rounded-lg border',
        // Entrance animation
        'animate-in fade-in-0 slide-in-from-top-2 duration-300',
        config.border,
        config.bg,
        sizes.padding,
        className
      )}
    >
      <div className={cn('flex items-start', sizes.gap)}>
        <Icon className={cn('mt-0.5 shrink-0 animate-in zoom-in-50 duration-300', sizes.iconSize, config.iconColor)} />
        <div className="flex-1 min-w-0">
          {title && (
            <p className={cn('font-medium', sizes.titleSize, config.titleColor)}>
              {title}
            </p>
          )}
          <div className={cn(sizes.textSize, config.textColor, title && 'mt-0.5')}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertBanner;

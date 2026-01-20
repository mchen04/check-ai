import { cn } from '@/lib/utils';
import { LucideIcon, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';

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
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    icon: AlertCircle,
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-800',
    textColor: 'text-amber-700',
  },
  error: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    icon: AlertCircle,
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    textColor: 'text-red-700',
  },
  info: {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    icon: Info,
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
    textColor: 'text-blue-700',
  },
  success: {
    border: 'border-green-200',
    bg: 'bg-green-50',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    titleColor: 'text-green-800',
    textColor: 'text-green-700',
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
        config.border,
        config.bg,
        sizes.padding,
        className
      )}
    >
      <div className={cn('flex items-start', sizes.gap)}>
        <Icon className={cn('mt-0.5 shrink-0', sizes.iconSize, config.iconColor)} />
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

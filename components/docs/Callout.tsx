import { cn } from '@/lib/utils';
import { AlertCircle, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

type CalloutType = 'info' | 'warning' | 'danger' | 'success' | 'tip';

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const CALLOUT_STYLES: Record<CalloutType, { icon: typeof Info; className: string }> = {
  info: {
    icon: Info,
    className: 'border-info/30 bg-info/5 text-info',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-warning/30 bg-warning/5 text-warning',
  },
  danger: {
    icon: AlertCircle,
    className: 'border-destructive/30 bg-destructive/5 text-destructive',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-success/30 bg-success/5 text-success',
  },
  tip: {
    icon: Info,
    className: 'border-primary/30 bg-primary/5 text-primary',
  },
};

export function Callout({ type = 'info', title, children, className }: CalloutProps) {
  const { icon: Icon, className: styleClass } = CALLOUT_STYLES[type];

  return (
    <div className={cn('my-6 rounded-lg border p-4', styleClass, className)}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex-1">
          {title && <p className="mb-1 font-semibold">{title}</p>}
          <div className="text-sm [&_p]:mb-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

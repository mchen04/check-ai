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
    className: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  },
  danger: {
    icon: AlertCircle,
    className: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300',
  },
  tip: {
    icon: Info,
    className: 'border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-300',
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

'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Clock,
  Send,
  CheckCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';

export type DeliveryStatus = 'pending' | 'processing' | 'delivered' | 'retrying' | 'failed';

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  attemptNumber?: number;
  maxAttempts?: number;
  className?: string;
}

const statusConfig: Record<
  DeliveryStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  pending: {
    label: 'Queued',
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-border',
  },
  processing: {
    label: 'Sending',
    icon: Send,
    className: 'bg-primary/10 text-primary border-primary/20 animate-pulse',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    className: 'bg-success/10 text-success border-success/20',
  },
  retrying: {
    label: 'Retrying',
    icon: RefreshCw,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export function DeliveryStatusBadge({
  status,
  attemptNumber,
  maxAttempts,
  className,
}: DeliveryStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  // Show attempt count for retrying status
  let label = config.label;
  if (status === 'retrying' && attemptNumber && maxAttempts) {
    label = `Retrying (${attemptNumber}/${maxAttempts})`;
  }

  return (
    <Badge
      variant="outline"
      className={cn(config.className, 'font-medium', className)}
    >
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}

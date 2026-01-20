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
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  processing: {
    label: 'Sending',
    icon: Send,
    className: 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  retrying: {
    label: 'Retrying',
    icon: RefreshCw,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200',
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

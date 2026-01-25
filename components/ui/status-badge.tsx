import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { BatchStatus, BatchItemStatus, VerificationStatus } from '@/lib/api/types';

/**
 * Combined batch status type (job + item statuses)
 */
export type BatchDisplayStatus = BatchStatus | BatchItemStatus;

/**
 * Status badge for batch jobs and batch items.
 * Consolidates status display logic for batch-related pages.
 */
export function BatchStatusBadge({ status }: { status: BatchDisplayStatus }) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-success/10 text-success">Completed</Badge>;
    case 'processing':
      return <Badge className="bg-primary/10 text-primary">Processing</Badge>;
    case 'pending':
      return <Badge className="bg-muted text-muted-foreground">Pending</Badge>;
    case 'validating':
      return <Badge className="bg-primary/10 text-primary">Validating</Badge>;
    case 'queued':
      return <Badge className="bg-muted text-muted-foreground">Queued</Badge>;
    case 'failed':
      return <Badge className="bg-destructive/10 text-destructive">Failed</Badge>;
    case 'cancelled':
      return <Badge className="bg-warning/10 text-warning">Cancelled</Badge>;
    case 'skipped':
      return <Badge className="bg-muted text-muted-foreground">Skipped</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

/**
 * Status badge for verification requests.
 */
export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-success/10 text-success">Completed</Badge>;
    case 'processing':
      return <Badge className="bg-primary/10 text-primary">Processing</Badge>;
    case 'failed':
      return <Badge className="bg-destructive/10 text-destructive">Failed</Badge>;
    case 'escalated':
      return <Badge className="bg-warning/10 text-warning">Escalated</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

/**
 * Status badge for credential/resource validation status.
 */
export type ValidationStatus = 'valid' | 'invalid' | 'pending';

export interface ValidationStatusBadgeProps {
  status: ValidationStatus;
  isActive?: boolean;
  showIcon?: boolean;
}

export function ValidationStatusBadge({
  status,
  isActive = true,
  showIcon = false,
}: ValidationStatusBadgeProps) {
  if (!isActive) {
    return <Badge variant="secondary">Inactive</Badge>;
  }

  switch (status) {
    case 'valid':
      return (
        <Badge className="bg-success/10 text-success">
          {showIcon && <CheckCircle className="mr-1 h-3 w-3" />}
          Valid
        </Badge>
      );
    case 'invalid':
      return (
        <Badge className="bg-destructive/10 text-destructive">
          {showIcon && <XCircle className="mr-1 h-3 w-3" />}
          Invalid
        </Badge>
      );
    default:
      return (
        <Badge variant="ghost">
          {showIcon && <AlertCircle className="mr-1 h-3 w-3" />}
          Pending
        </Badge>
      );
  }
}

/**
 * Badge to display test result (success/failure).
 * Used after testing credentials, webhooks, etc.
 */
export interface TestResultBadgeProps {
  success: boolean;
  successLabel?: string;
  failureLabel?: string;
}

export function TestResultBadge({
  success,
  successLabel = 'Success',
  failureLabel = 'Failed',
}: TestResultBadgeProps) {
  return success ? (
    <Badge className="bg-success text-success-foreground">
      <CheckCircle className="mr-1 h-3 w-3" />
      {successLabel}
    </Badge>
  ) : (
    <Badge className="bg-destructive text-destructive-foreground">
      <XCircle className="mr-1 h-3 w-3" />
      {failureLabel}
    </Badge>
  );
}

/**
 * Badge for active/inactive/paused state.
 */
export interface ActiveStatusBadgeProps {
  isActive: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function ActiveStatusBadge({
  isActive,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
}: ActiveStatusBadgeProps) {
  return isActive ? (
    <Badge className="bg-success text-success-foreground">
      {activeLabel}
    </Badge>
  ) : (
    <Badge variant="ghost">{inactiveLabel}</Badge>
  );
}

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
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    case 'processing':
      return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
    case 'pending':
      return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    case 'validating':
      return <Badge className="bg-purple-100 text-purple-800">Validating</Badge>;
    case 'queued':
      return <Badge className="bg-purple-100 text-purple-800">Queued</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
    case 'cancelled':
      return <Badge className="bg-orange-100 text-orange-800">Cancelled</Badge>;
    case 'skipped':
      return <Badge className="bg-gray-100 text-gray-800">Skipped</Badge>;
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
      return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
    case 'processing':
      return <Badge className="bg-purple-100 text-purple-800">Processing</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
    case 'escalated':
      return <Badge className="bg-orange-100 text-orange-800">Escalated</Badge>;
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
        <Badge variant="default" className="bg-green-500">
          {showIcon && <CheckCircle className="mr-1 h-3 w-3" />}
          Valid
        </Badge>
      );
    case 'invalid':
      return (
        <Badge variant="destructive">
          {showIcon && <XCircle className="mr-1 h-3 w-3" />}
          Invalid
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
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
    <Badge variant="default" className="bg-green-500">
      <CheckCircle className="mr-1 h-3 w-3" />
      {successLabel}
    </Badge>
  ) : (
    <Badge variant="destructive">
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
    <Badge variant="default" className="bg-green-500">
      {activeLabel}
    </Badge>
  ) : (
    <Badge variant="secondary">{inactiveLabel}</Badge>
  );
}

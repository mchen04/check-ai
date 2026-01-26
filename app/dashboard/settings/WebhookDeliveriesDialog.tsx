'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DeliveryStatusBadge,
  type DeliveryStatus,
} from '@/components/ui/delivery-status-badge';
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  History,
} from 'lucide-react';
import { Spinner } from '@/components/ui/loading-spinner';
import { SimplePagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertBanner } from '@/components/ui/alert-banner';
import { formatDateTime } from '@/lib/utils';

interface AttemptRecord {
  attemptNumber: number;
  timestamp: string;
  responseStatus?: number;
  responseBody?: string;
  durationMs: number;
  error?: string;
}

interface Delivery {
  id: string;
  event: string;
  status: DeliveryStatus;
  attemptNumber: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  responseStatus: number | null;
  responseBody: string | null;
  lastError: string | null;
  durationMs: number | null;
  createdAt: string;
  deliveredAt: string | null;
  failedAt: string | null;
  attemptHistory: AttemptRecord[] | null;
}

interface WebhookDeliveriesDialogProps {
  webhookId: string;
  webhookUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
}

type StatusFilter = 'all' | DeliveryStatus;

export function WebhookDeliveriesDialog({
  webhookId,
  webhookUrl,
  open,
  onOpenChange,
  canEdit,
}: WebhookDeliveriesDialogProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [retryError, setRetryError] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const response = await fetch(
        `/api/dashboard/settings/webhooks/${webhookId}/deliveries?${params}`
      );
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries);
        setStatusCounts(data.statusCounts);
        setPagination(data.pagination);
      }
    } catch {
      // Network errors are handled silently - empty state will be shown
    } finally {
      setIsLoading(false);
    }
  }, [webhookId, filter, page]);

  useEffect(() => {
    if (open) {
      fetchDeliveries();
    }
  }, [open, fetchDeliveries]);

  const retryDelivery = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    setRetryError(null);
    try {
      const response = await fetch(
        `/api/dashboard/settings/webhooks/${webhookId}/deliveries/${deliveryId}/retry`,
        { method: 'POST' }
      );

      if (response.ok) {
        // Refresh the list
        fetchDeliveries();
      } else {
        const data = await response.json();
        setRetryError(data.error || 'Failed to retry delivery');
      }
    } catch {
      setRetryError('Failed to retry delivery. Please try again.');
    } finally {
      setRetryingId(null);
    }
  };

  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Delivery History
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-mono truncate">
            {webhookUrl}
          </p>
        </DialogHeader>

        {/* Error Banner */}
        {retryError && (
          <AlertBanner variant="error" size="sm">
            {retryError}
          </AlertBanner>
        )}

        {/* Filter Tabs */}
        <Tabs
          value={filter}
          onValueChange={(value: string) => {
            setFilter(value as StatusFilter);
            setPage(1);
          }}
        >
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="all" className="text-xs">
              All ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs">
              Delivered ({statusCounts.delivered || 0})
            </TabsTrigger>
            <TabsTrigger value="retrying" className="text-xs">
              Retrying ({statusCounts.retrying || 0})
            </TabsTrigger>
            <TabsTrigger value="failed" className="text-xs">
              Failed ({statusCounts.failed || 0})
            </TabsTrigger>
            <TabsTrigger value="processing" className="text-xs">
              Processing ({statusCounts.processing || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              Pending ({statusCounts.pending || 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Deliveries Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="default" className="text-muted-foreground" />
            </div>
          ) : deliveries.length === 0 ? (
            <EmptyState message="No deliveries found" size="default" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created</TableHead>
                  {canEdit && <TableHead className="w-20"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <Collapsible
                    key={delivery.id}
                    open={expandedId === delivery.id}
                    onOpenChange={(open) =>
                      setExpandedId(open ? delivery.id : null)
                    }
                    asChild
                  >
                    <>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={expandedId === delivery.id ? "Collapse delivery details" : "Expand delivery details"}>
                              {expandedId === delivery.id ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {delivery.event}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DeliveryStatusBadge
                            status={delivery.status}
                            attemptNumber={delivery.attemptNumber}
                            maxAttempts={delivery.maxAttempts}
                          />
                        </TableCell>
                        <TableCell>
                          {delivery.responseStatus ? (
                            <Badge
                              variant={
                                delivery.responseStatus >= 200 &&
                                delivery.responseStatus < 300
                                  ? 'default'
                                  : 'destructive'
                              }
                              className="font-mono"
                            >
                              {delivery.responseStatus}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {delivery.durationMs ? `${delivery.durationMs}ms` : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(delivery.createdAt)}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            {delivery.status === 'failed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  retryDelivery(delivery.id);
                                }}
                                disabled={retryingId === delivery.id}
                              >
                                {retryingId === delivery.id ? (
                                  <Spinner size="xs" />
                                ) : (
                                  <>
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Retry
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Expanded Details */}
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={canEdit ? 7 : 6} className="p-4">
                            <div className="space-y-3">
                              {/* Error Message */}
                              {delivery.lastError && (
                                <div>
                                  <p className="text-xs font-medium text-destructive mb-1">
                                    Error:
                                  </p>
                                  <pre className="text-xs bg-destructive/10 p-2 rounded border border-destructive/20 overflow-auto">
                                    {delivery.lastError}
                                  </pre>
                                </div>
                              )}

                              {/* Response Body */}
                              {delivery.responseBody && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Response Body:
                                  </p>
                                  <pre className="text-xs bg-muted p-2 rounded border overflow-auto max-h-32">
                                    {delivery.responseBody}
                                  </pre>
                                </div>
                              )}

                              {/* Attempt History */}
                              {delivery.attemptHistory &&
                                delivery.attemptHistory.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                      Attempt History:
                                    </p>
                                    <div className="space-y-2">
                                      {delivery.attemptHistory.map((attempt) => (
                                        <div
                                          key={`attempt-${attempt.attemptNumber}-${attempt.timestamp}`}
                                          className="flex items-center gap-4 text-xs bg-muted/50 p-2 rounded"
                                        >
                                          <span className="font-medium">
                                            #{attempt.attemptNumber}
                                          </span>
                                          <span className="text-muted-foreground">
                                            {formatDateTime(attempt.timestamp)}
                                          </span>
                                          {attempt.responseStatus && (
                                            <Badge
                                              variant={
                                                attempt.responseStatus >= 200 &&
                                                attempt.responseStatus < 300
                                                  ? 'default'
                                                  : 'destructive'
                                              }
                                              className="font-mono"
                                            >
                                              {attempt.responseStatus}
                                            </Badge>
                                          )}
                                          <span className="text-muted-foreground">
                                            {attempt.durationMs}ms
                                          </span>
                                          {attempt.error && (
                                            <span className="text-destructive truncate max-w-[200px]">
                                              {attempt.error}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              {/* Timestamps */}
                              <div className="flex gap-6 text-xs text-muted-foreground">
                                <span>Created: {formatDateTime(delivery.createdAt)}</span>
                                {delivery.deliveredAt && (
                                  <span>
                                    Delivered: {formatDateTime(delivery.deliveredAt)}
                                  </span>
                                )}
                                {delivery.failedAt && (
                                  <span>Failed: {formatDateTime(delivery.failedAt)}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        <SimplePagination
          page={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          className="pt-4 border-t"
        />
      </DialogContent>
    </Dialog>
  );
}

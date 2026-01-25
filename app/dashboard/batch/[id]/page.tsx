'use client';

import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BatchStatusBadge, type BatchDisplayStatus } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Clock,
  Copy,
  RefreshCw,
  StopCircle,
  Download,
  ChevronRight,
} from 'lucide-react';
import { Spinner } from '@/components/ui/loading-spinner';
import { useBatchStatus, useCopyToClipboard } from '@/hooks';
import { VerdictIcon, VerdictBadge, type VerdictDisplay } from '@/components/ui/verdict-display';
import { formatParadigmName } from '@/lib/verification/types';
import { truncateString } from '@/lib/api/formatters';
import { PAGINATION_LIMITS } from '@/lib/constants';
import type { Decision } from '@/lib/api/types';

// =============================================================================
// TYPES
// =============================================================================

interface VerifyOptions {
  timeout?: number;
  minConfidence?: number;
  acceptThreshold?: number;
  escalateThreshold?: number;
  maxRetries?: number;
  retryOnLowConfidence?: boolean;
}

interface BatchDetail {
  id: string;
  name: string | null;
  status: BatchDisplayStatus;
  inputFormat: string;
  originalFileName: string | null;
  methodsConfig: Record<string, number>;
  verifyOptions: VerifyOptions | null;
  context: Record<string, unknown> | null;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  totalCostCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface BatchItem {
  id: string;
  itemIndex: number;
  content: string;
  status: BatchDisplayStatus;
  verdict: VerdictDisplay;
  confidence: number | null;
  decision: Decision | null;
  errorMessage: string | null;
  costCents: number | null;
  processingTimeMs: number | null;
  completedAt: string | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useCopyToClipboard();
  const [isCancelling, setIsCancelling] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [hasMoreItems, setHasMoreItems] = useState(true);

  // Ref to track current page for polling (avoids stale closure)
  const currentPageRef = useRef(1);

  // Use real-time hook for live updates (also subscribe during validating phase)
  const liveStatus = useBatchStatus(
    batch?.status === 'processing' || batch?.status === 'validating' ? id : null
  );

  const fetchBatch = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/batch/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Batch not found');
        }
        throw new Error('Failed to fetch batch');
      }

      const data = await response.json();
      setBatch(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchItems = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        const response = await fetch(`/api/dashboard/batch/${id}/results?limit=${PAGINATION_LIMITS.defaultLimit}&offset=${(page - 1) * PAGINATION_LIMITS.defaultLimit}`);

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setHasMoreItems(data.pagination.hasMore);
        setItemsPage(page);
        currentPageRef.current = page;
      } catch (err) {
        console.error('Failed to fetch items:', err);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchBatch();
    fetchItems();
  }, [fetchBatch, fetchItems]);

  // Update batch from live status
  useEffect(() => {
    if (liveStatus.progress && batch) {
      setBatch((prev) =>
        prev
          ? {
              ...prev,
              processedItems: liveStatus.progress.processed,
              successCount: liveStatus.progress.success,
              failureCount: liveStatus.progress.failed,
            }
          : null
      );
    }

    if (liveStatus.isComplete && batch) {
      // Refetch to get final state
      fetchBatch();
      fetchItems(1, false);
    }
  }, [liveStatus, batch, fetchBatch, fetchItems]);

  // Poll for updates when processing or validating (fallback if live updates fail)
  useEffect(() => {
    // Don't poll if not in active state or if live updates have already completed
    if (batch?.status !== 'processing' && batch?.status !== 'validating') return;
    if (liveStatus.isComplete) return; // Live updates already handled completion

    const interval = setInterval(() => {
      fetchBatch();
      // Use ref to get current page (avoids stale closure resetting to page 1)
      fetchItems(currentPageRef.current, false);
    }, 5000);

    return () => clearInterval(interval);
  }, [batch?.status, liveStatus.isComplete, fetchBatch, fetchItems]);

  const handleCopyId = () => copy(id);

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      const response = await fetch(`/api/dashboard/batch/${id}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel batch');
      }

      fetchBatch();
    } catch (err) {
      console.error('Failed to cancel batch:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleExportResults = () => {
    // Generate CSV of results
    const csvRows = [
      ['Index', 'Content', 'Status', 'Verdict', 'Confidence', 'Decision', 'Error'].join(','),
      ...items.map((item) =>
        [
          item.itemIndex,
          `"${item.content.replace(/"/g, '""')}"`,
          item.status,
          item.verdict || '',
          item.confidence ? (item.confidence * 100).toFixed(1) + '%' : '',
          item.decision || '',
          item.errorMessage ? `"${item.errorMessage.replace(/"/g, '""')}"` : '',
        ].join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-${id}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex h-32 items-center justify-center">
          <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="p-4">
        <Card className="p-4 text-center">
          <p className="mb-3 text-xs text-destructive">{error || 'Batch not found'}</p>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => router.push('/dashboard/batch')}>
            <ArrowLeft className="mr-1.5 h-3 w-3" />
            Back
          </Button>
        </Card>
      </div>
    );
  }

  const isProcessing = batch.status === 'processing' || batch.status === 'pending' || batch.status === 'validating';
  const progress = batch.totalItems > 0 ? (batch.processedItems / batch.totalItems) * 100 : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/batch')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">{batch.name || batch.originalFileName || 'Batch'}</h1>
              <code className="text-xs text-muted-foreground">{id.slice(0, 8)}...</code>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyId}>
                <Copy className="h-4 w-4" />
              </Button>
              {copied && <span className="text-xs text-success">Copied!</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {isProcessing && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isCancelling}>
                  {isCancelling ? <Spinner size="xs" className="mr-2" /> : <StopCircle className="mr-2 h-4 w-4" />}
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Batch?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will stop processing. Completed items will be preserved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Cancel</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {batch.status === 'completed' && items.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportResults}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchBatch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Progress Card */}
          <Card>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Progress</h3>
              <BatchStatusBadge status={batch.status} />
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {isProcessing && (
                  <div className="flex items-center gap-3">
                    <Spinner size="xs" className="h-4 w-4 text-primary" />
                    <span className="text-sm">Processing...</span>
                  </div>
                )}
                <Progress value={progress} className="h-2" />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-semibold">{batch.processedItems}</p>
                    <p className="text-xs text-muted-foreground">Processed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-success">{batch.successCount}</p>
                    <p className="text-xs text-muted-foreground">Succeeded</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-destructive">{batch.failureCount}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
                {batch.errorMessage && (
                  <div className="rounded-md bg-destructive/5 p-3 text-sm text-destructive">{batch.errorMessage}</div>
                )}
              </div>
            </div>
          </Card>

          {/* Results Table */}
          <Card>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Results</h3>
              <span className="text-xs text-muted-foreground">{items.length}/{batch.totalItems}</span>
            </div>
            <div className="p-4">
              {items.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {isProcessing ? 'Waiting for results...' : 'No results yet'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verdict</TableHead>
                      <TableHead>Conf</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.itemIndex + 1}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="font-mono text-sm truncate block">{truncateString(item.content, 40, true)}</span>
                        </TableCell>
                        <TableCell><BatchStatusBadge status={item.status} /></TableCell>
                        <TableCell>
                          {item.verdict ? (
                            <div className="flex items-center gap-1">
                              <VerdictIcon verdict={item.verdict} />
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.confidence !== null ? `${(item.confidence * 100).toFixed(0)}%` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {hasMoreItems && items.length > 0 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm" onClick={() => fetchItems(itemsPage + 1, true)}>
                    Load More
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Details</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Format</span>
                <Badge variant="outline">{batch.inputFormat.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Items</span>
                <span className="text-sm font-mono">{batch.totalItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Cost</span>
                <span className="text-sm font-mono">{batch.totalCostCents > 0 ? `$${(batch.totalCostCents / 100).toFixed(4)}` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tokens</span>
                <span className="text-sm font-mono">{batch.totalInputTokens + batch.totalOutputTokens > 0 ? (batch.totalInputTokens + batch.totalOutputTokens).toLocaleString() : '-'}</span>
              </div>
              <Separator />
              <div>
                <span className="text-xs text-muted-foreground">Created</span>
                <p className="text-sm">{formatDate(batch.createdAt)}</p>
              </div>
              {batch.completedAt && (
                <div>
                  <span className="text-xs text-muted-foreground">Completed</span>
                  <p className="text-sm">{formatDate(batch.completedAt)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Methods Config */}
          <Card>
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Methods</h3>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {Object.entries(batch.methodsConfig || {})
                  .filter(([, weight]) => weight > 0)
                  .map(([method, weight]) => (
                    <div key={method} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50">
                      <span className="text-sm">{formatParadigmName(method)}</span>
                      <Badge variant="outline">{((weight as number) * 100).toFixed(0)}%</Badge>
                    </div>
                  ))}
              </div>
            </div>
          </Card>

          {/* Verify Options - Collapsible */}
          {batch.verifyOptions && Object.keys(batch.verifyOptions).length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                <span>Verification Options</span>
                <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <Card className="mt-3">
                <div className="p-4 space-y-2">
                  {batch.verifyOptions.timeout && (
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs text-muted-foreground">Timeout</span>
                      <span className="text-sm">{(batch.verifyOptions.timeout / 1000).toFixed(0)}s</span>
                    </div>
                  )}
                  {batch.verifyOptions.acceptThreshold !== undefined && (
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs text-muted-foreground">Accept Threshold</span>
                      <Badge variant="outline">{(batch.verifyOptions.acceptThreshold * 100).toFixed(0)}%</Badge>
                    </div>
                  )}
                  {batch.verifyOptions.escalateThreshold !== undefined && (
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs text-muted-foreground">Escalate Threshold</span>
                      <Badge variant="outline">{(batch.verifyOptions.escalateThreshold * 100).toFixed(0)}%</Badge>
                    </div>
                  )}
                  {batch.verifyOptions.minConfidence !== undefined && (
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs text-muted-foreground">Min Confidence</span>
                      <Badge variant="outline">{(batch.verifyOptions.minConfidence * 100).toFixed(0)}%</Badge>
                    </div>
                  )}
                  {batch.verifyOptions.maxRetries !== undefined && (
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs text-muted-foreground">Max Retries</span>
                      <span className="text-sm">{batch.verifyOptions.maxRetries}</span>
                    </div>
                  )}
                  {batch.verifyOptions.retryOnLowConfidence !== undefined && (
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs text-muted-foreground">Retry on Low Confidence</span>
                      <Badge variant={batch.verifyOptions.retryOnLowConfidence ? 'default' : 'secondary'}>
                        {batch.verifyOptions.retryOnLowConfidence ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            </details>
          )}

          {/* Context - Collapsible */}
          {batch.context && Object.keys(batch.context).length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                <span>Context</span>
                <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <Card className="mt-3">
                <div className="p-4">
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs">{JSON.stringify(batch.context, null, 2)}</pre>
                </div>
              </Card>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

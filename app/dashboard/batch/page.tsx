'use client';

import { useState, useEffect, useCallback, useTransition, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Plus,
  Layers,
  FileText,
  Loader2,
} from 'lucide-react';
import { formatRelativeTime, getErrorMessage } from '@/lib/utils';
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
import { BatchStatusBadge } from '@/components/ui/status-badge';
import type { BatchStatus } from '@/lib/api/types';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/loading-spinner';
import { truncateString } from '@/lib/api/formatters';
import { Pagination } from '@/components/ui/pagination';
import { PAGINATION_LIMITS } from '@/lib/constants';

// =============================================================================
// TYPES
// =============================================================================

interface BatchJob {
  id: string;
  name: string | null;
  status: BatchStatus;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  totalCostCents: number;
  inputFormat: string;
  originalFileName: string | null;
  progress: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface BatchStats {
  total: number;
  processing: number;
  completed: number;
  failed: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function getStatusIcon(status: BatchStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'processing':
      return <Spinner size="sm" className="text-primary" />;
    case 'failed':
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

// Sort batches to pin active ones (processing, validating) to top
// Using toSorted() for immutability (js-tosorted-immutable)
function sortBatchesByActivity(batches: BatchJob[]): BatchJob[] {
  const activeStatuses: BatchStatus[] = ['processing', 'validating'];

  return batches.toSorted((a, b) => {
    const aActive = activeStatuses.includes(a.status);
    const bActive = activeStatuses.includes(b.status);

    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return 0; // Maintain original order within groups
  });
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function BatchListSkeleton() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded bg-muted" />
      </div>
      <Card>
        <div className="p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT (wrapped with Suspense for useSearchParams)
// =============================================================================

export default function BatchListPage() {
  return (
    <Suspense fallback={<BatchListSkeleton />}>
      <BatchListContent />
    </Suspense>
  );
}

function BatchListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data state
  const [batches, setBatches] = useState<BatchJob[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [stats, setStats] = useState<BatchStats>({ total: 0, processing: 0, completed: 0, failed: 0 });
  const [error, setError] = useState<string | null>(null);


  // useTransition for loading state (rendering-usetransition-loading)
  const [isPending, startTransition] = useTransition();

  // Pagination state with lazy initialization (rerender-lazy-state-init)
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam, 10) : 1;
  });

  // AbortController ref to cancel in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  const fetchBatches = useCallback(async () => {
    // Abort any in-flight request before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);

    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', PAGINATION_LIMITS.defaultLimit.toString());

    const response = await fetch(`/api/dashboard/batches?${params.toString()}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch batches');
    }

    const data = await response.json();
    setBatches(sortBatchesByActivity(data.batches));
    setPagination(data.pagination);
    setStats(data.stats);
  }, [page]);

  useEffect(() => {
    startTransition(async () => {
      try {
        await fetchBatches();
      } catch (err) {
        setError(getErrorMessage(err));
      }
    });
  }, [fetchBatches]);

  // Auto-refresh when jobs are processing with adaptive interval + visibility pause
  useEffect(() => {
    if (stats.processing === 0) return;

    // Adaptive interval: 5s for <=2 active jobs, 10s for <=10, 15s for more
    const intervalMs = stats.processing <= 2 ? 5000 : stats.processing <= 10 ? 10000 : 15000;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        startTransition(async () => {
          try {
            await fetchBatches();
          } catch (err) {
            setError(getErrorMessage(err));
          }
        });
      }, intervalMs);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Fetch immediately on tab re-focus, then resume polling
        startTransition(async () => {
          try { await fetchBatches(); } catch { /* ignore */ }
        });
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [stats.processing, fetchBatches]);

  // Update URL when page changes using Next.js router (not window.history)
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '/dashboard/batch';
    router.replace(newUrl, { scroll: false });
  }, [page, router]);

  // Memoized event handlers to prevent child re-renders (rerender-functional-setstate)
  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      try {
        await fetchBatches();
      } catch (err) {
        setError(getErrorMessage(err));
      }
    });
  }, [fetchBatches]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowClick = useCallback((id: string) => {
    router.push(`/dashboard/batch/${id}`);
  }, [router]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Batch Jobs</h1>
          {pagination && (
            <p className="text-sm text-muted-foreground">
              {pagination.total.toLocaleString()} batch job{pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => router.push('/dashboard/batch/upload')}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      {/* Processing Banner - Only show when jobs are running */}
      {stats.processing > 0 && (
        <Card className="mb-4 border-primary/50 bg-primary/5">
          <div className="flex items-center gap-3 px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">
              {stats.processing} job{stats.processing !== 1 ? 's' : ''} currently processing
            </span>
            <span className="text-xs text-muted-foreground">• Auto-refreshing</span>
          </div>
        </Card>
      )}

      {/* Batches Table */}
      <Card>
        <div className="p-4">
          {error ? (
            <div className="py-8 text-center text-destructive">
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                Try Again
              </Button>
            </div>
          ) : batches.length === 0 && !isPending ? (
            <div className="py-8 text-center text-muted-foreground">
              <Layers className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p className="mb-1 text-sm">No batch jobs yet</p>
              <p className="mb-4 text-xs">Create your first batch to process multiple verifications.</p>
              <Button size="sm" onClick={() => router.push('/dashboard/batch/upload')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Batch
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending && batches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <RefreshCw className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                        <p className="mt-1 text-xs text-muted-foreground">Loading...</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    batches.map((batch) => {
                      const isActive = batch.status === 'processing' || batch.status === 'validating';
                      return (
                        <TableRow
                          key={batch.id}
                          className={`cursor-pointer hover:bg-muted/50 ${isActive ? 'bg-primary/5' : ''}`}
                          onClick={() => handleRowClick(batch.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(batch.status)}
                              <BatchStatusBadge status={batch.status} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{truncateString(batch.name || batch.originalFileName, 40, true) || 'Unnamed Batch'}</p>
                              {batch.inputFormat && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <FileText className="h-3 w-3" />
                                  {batch.inputFormat.toUpperCase()}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[150px]">
                            <div className="space-y-1">
                              <Progress value={batch.progress} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {batch.processedItems} / {batch.totalItems} items
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-success">{batch.successCount}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-destructive">{batch.failureCount}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {batch.totalCostCents > 0
                              ? `$${(batch.totalCostCents / 100).toFixed(2)}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatRelativeTime(batch.createdAt)}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-4 border-t pt-4">
                  <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    onPageChange={handlePageChange}
                    disabled={isPending}
                    showFirstLast
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

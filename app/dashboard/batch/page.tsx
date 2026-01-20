'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { BatchStatusBadge, type BatchDisplayStatus } from '@/components/ui/status-badge';
import type { BatchStatus } from '@/lib/api/types';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Plus,
  Upload,
  Layers,
  FileText,
} from 'lucide-react';
import { Spinner } from '@/components/ui/loading-spinner';
import { truncateString } from '@/lib/api/formatters';
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
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'processing':
      return <Spinner size="sm" className="text-blue-500" />;
    case 'failed':
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function BatchListPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<BatchJob[]>([]);
  const [stats, setStats] = useState<BatchStats>({ total: 0, processing: 0, completed: 0, failed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchBatches = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/dashboard/batches?page=${pageNum}&limit=${PAGINATION_LIMITS.defaultLimit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch batches');
      }

      const data = await response.json();
      setBatches((prev) => (append ? [...prev, ...data.batches] : data.batches));
      setStats(data.stats);
      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();

    // Refresh every 10 seconds if there are processing or validating batches
    const interval = setInterval(() => {
      if (batches.some((b) => b.status === 'processing' || b.status === 'validating')) {
        fetchBatches(1, false);
      }
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBatches, batches.length]);

  const handleRefresh = () => {
    fetchBatches(1, false);
  };

  const handleLoadMore = () => {
    fetchBatches(page + 1, true);
  };

  const handleRowClick = (id: string) => {
    router.push(`/dashboard/batch/${id}`);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-sm font-semibold">Batch Jobs</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-1.5 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <Plus className="mr-1.5 h-3 w-3" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm">Create Batch Job</DialogTitle>
                <DialogDescription className="text-xs">
                  Upload a CSV or JSON file, or use the API to create a batch job.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-3">
                <Button
                  variant="outline"
                  className="h-16 flex-col gap-1"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    router.push('/dashboard/batch/upload');
                  }}
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-xs">Upload File</span>
                  <span className="text-[10px] text-muted-foreground">CSV or JSON</span>
                </Button>
                <div className="text-center text-[10px] text-muted-foreground">or</div>
                <div className="rounded-md border border-dashed p-3">
                  <p className="text-xs font-medium">Use the API</p>
                  <code className="mt-1 block rounded bg-muted p-1.5 text-[10px]">
                    POST /api/v1/batch
                  </code>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards - Compact */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <Card className="p-3">
          <span className="text-[10px] text-muted-foreground">Total</span>
          <p className="text-lg font-semibold">{stats.total}</p>
        </Card>
        <Card className="p-3">
          <span className="text-[10px] text-muted-foreground">Processing</span>
          <p className="text-lg font-semibold text-blue-600">{stats.processing}</p>
        </Card>
        <Card className="p-3">
          <span className="text-[10px] text-muted-foreground">Completed</span>
          <p className="text-lg font-semibold text-green-600">{stats.completed}</p>
        </Card>
        <Card className="p-3">
          <span className="text-[10px] text-muted-foreground">Failed</span>
          <p className="text-lg font-semibold text-red-600">{stats.failed}</p>
        </Card>
      </div>

      {/* Batches Table */}
      <Card>
        <div className="border-b px-4 py-2.5">
          <h3 className="text-xs font-semibold">Recent Batch Jobs</h3>
        </div>
        <div className="p-2">
          {error ? (
            <div className="py-6 text-center text-red-500 text-xs">
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={handleRefresh}>
                Try Again
              </Button>
            </div>
          ) : batches.length === 0 && !isLoading ? (
            <div className="py-6 text-center text-muted-foreground">
              <Layers className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="mb-1 text-xs">No batch jobs yet</p>
              <p className="mb-3 text-[10px]">Create your first batch to process multiple verifications.</p>
              <Button size="sm" className="h-7 text-xs" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-1.5 h-3 w-3" />
                Create Batch
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow
                    key={batch.id}
                    className="cursor-pointer hover:bg-muted/50"
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
                        <span className="text-green-600">{batch.successCount}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-red-600">{batch.failureCount}</span>
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
                ))}
              </TableBody>
            </Table>
          )}

          {hasMore && !isLoading && batches.length > 0 && (
            <div className="mt-3 text-center">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleLoadMore}>
                Load More
              </Button>
            </div>
          )}

          {isLoading && batches.length === 0 && (
            <div className="py-6 text-center">
              <RefreshCw className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
              <p className="mt-1 text-xs text-muted-foreground">Loading...</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

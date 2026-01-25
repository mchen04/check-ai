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
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Batch Jobs</h1>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Batch Job</DialogTitle>
                <DialogDescription>
                  Upload a CSV or JSON file, or use the API to create a batch job.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    router.push('/dashboard/batch/upload');
                  }}
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">Upload File</span>
                  <span className="text-xs text-muted-foreground">CSV or JSON</span>
                </Button>
                <div className="text-center text-xs text-muted-foreground">or</div>
                <div className="rounded-md border border-dashed p-4">
                  <p className="text-sm font-medium">Use the API</p>
                  <code className="mt-2 block rounded bg-muted p-2 text-xs">
                    POST /api/v1/batch
                  </code>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Total</span>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Processing</span>
          <p className="text-2xl font-semibold text-primary">{stats.processing}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Completed</span>
          <p className="text-2xl font-semibold text-success">{stats.completed}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Failed</span>
          <p className="text-2xl font-semibold text-destructive">{stats.failed}</p>
        </Card>
      </div>

      {/* Batches Table */}
      <Card>
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Recent Batch Jobs</h3>
        </div>
        <div className="p-4">
          {error ? (
            <div className="py-8 text-center text-destructive">
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                Try Again
              </Button>
            </div>
          ) : batches.length === 0 && !isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Layers className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p className="mb-1 text-sm">No batch jobs yet</p>
              <p className="mb-4 text-xs">Create your first batch to process multiple verifications.</p>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  Loader2,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface BatchJob {
  id: string;
  name: string | null;
  status: 'pending' | 'validating' | 'processing' | 'completed' | 'failed' | 'cancelled';
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

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    case 'processing':
      return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
    case 'pending':
      return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    case 'validating':
      return <Badge className="bg-purple-100 text-purple-800">Validating</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
    case 'cancelled':
      return <Badge className="bg-orange-100 text-orange-800">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'failed':
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

function truncateName(name: string | null, maxLength: number = 40): string {
  if (!name) return 'Unnamed Batch';
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + '...';
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
      const response = await fetch(`/api/dashboard/batches?page=${pageNum}&limit=20`);

      if (!response.ok) {
        throw new Error('Failed to fetch batches');
      }

      const data = await response.json();
      setBatches((prev) => (append ? [...prev, ...data.batches] : data.batches));
      setStats(data.stats);
      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Jobs</h1>
          <p className="mt-1 text-muted-foreground">
            Process multiple verifications at once with batch jobs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Batch
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
                  className="h-24 flex-col gap-2"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    router.push('/dashboard/batch/upload');
                  }}
                >
                  <Upload className="h-6 w-6" />
                  <span>Upload File</span>
                  <span className="text-xs text-muted-foreground">CSV or JSON format</span>
                </Button>
                <div className="text-center text-sm text-muted-foreground">or</div>
                <div className="rounded-lg border border-dashed p-4">
                  <p className="text-sm font-medium">Use the API</p>
                  <code className="mt-2 block rounded bg-muted p-2 text-xs">
                    POST /api/v1/batch
                  </code>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Create batches programmatically with up to 100 items
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Batches</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Processing</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.processing}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.failed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Batch Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-8 text-center text-red-500">
              <p>{error}</p>
              <Button variant="outline" onClick={handleRefresh} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : batches.length === 0 && !isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Layers className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="mb-2">No batch jobs yet</p>
              <p className="mb-4 text-sm">
                Create your first batch to process multiple verifications at once.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
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
                        {getStatusBadge(batch.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{truncateName(batch.name || batch.originalFileName)}</p>
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
                      {formatDistanceToNow(new Date(batch.createdAt), {
                        addSuffix: true,
                      })}
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
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={handleLoadMore}>
                Load More
              </Button>
            </div>
          )}

          {isLoading && batches.length === 0 && (
            <div className="py-8 text-center">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Loading...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

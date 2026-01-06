'use client';

import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
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
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  Copy,
  RefreshCw,
  StopCircle,
  Download,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useBatchStatus } from '@/hooks/useBatchStatus';

// =============================================================================
// TYPES
// =============================================================================

interface BatchDetail {
  id: string;
  name: string | null;
  status: string;
  inputFormat: string;
  originalFileName: string | null;
  methodsConfig: Record<string, number>;
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
  status: string;
  verdict: string | null;
  confidence: number | null;
  decision: string | null;
  errorMessage: string | null;
  costCents: number | null;
  processingTimeMs: number | null;
  completedAt: string | null;
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

function getVerdictIcon(verdict: string | null) {
  switch (verdict) {
    case 'true':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'false':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'uncertain':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

function getVerdictBadge(verdict: string | null) {
  switch (verdict) {
    case 'true':
      return <Badge className="bg-green-100 text-green-800">True</Badge>;
    case 'false':
      return <Badge className="bg-red-100 text-red-800">False</Badge>;
    case 'uncertain':
      return <Badge className="bg-yellow-100 text-yellow-800">Uncertain</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

function truncateContent(content: string, maxLength: number = 60): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
}

function formatParadigmName(paradigm: string): string {
  const names: Record<string, string> = {
    semantic: 'Semantic Analysis',
    reasoning: 'LLM Reasoning',
    tool: 'Tool-Augmented',
    biprm: 'Bidirectional Reasoning',
    ensemble: 'Multi-Model Ensemble',
    entropy: 'Semantic Entropy',
    formal: 'Formal Verification',
  };
  return names[paradigm] || paradigm;
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
  const [copied, setCopied] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [hasMoreItems, setHasMoreItems] = useState(true);

  // Ref to track current page for polling (avoids stale closure)
  const currentPageRef = useRef(1);

  // Use real-time hook for live updates
  const liveStatus = useBatchStatus(batch?.status === 'processing' ? id : null);

  const fetchBatch = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/batch/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Batch not found');
        }
        throw new Error('Failed to fetch batch');
      }

      const data = await response.json();
      setBatch(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchItems = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        const response = await fetch(`/api/v1/batch/${id}/results?limit=20&offset=${(page - 1) * 20}`);

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

  // Poll for updates when processing
  useEffect(() => {
    if (batch?.status !== 'processing') return;

    const interval = setInterval(() => {
      fetchBatch();
      // Use ref to get current page (avoids stale closure resetting to page 1)
      fetchItems(currentPageRef.current, false);
    }, 5000);

    return () => clearInterval(interval);
  }, [batch?.status, fetchBatch, fetchItems]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      const response = await fetch(`/api/v1/batch/${id}/cancel`, {
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4 text-red-500">{error || 'Batch not found'}</p>
            <Button variant="outline" onClick={() => router.push('/dashboard/batch')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Batches
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isProcessing = batch.status === 'processing' || batch.status === 'pending';
  const progress = batch.totalItems > 0 ? (batch.processedItems / batch.totalItems) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/batch')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {batch.name || batch.originalFileName || 'Batch Details'}
              </h1>
              <Button variant="ghost" size="sm" onClick={handleCopyId}>
                <Copy className="h-4 w-4" />
              </Button>
              {copied && <span className="text-sm text-green-600">Copied!</span>}
            </div>
            <p className="font-mono text-sm text-muted-foreground">{id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isProcessing && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isCancelling}>
                  {isCancelling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <StopCircle className="mr-2 h-4 w-4" />
                  )}
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Batch?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will stop processing remaining items. Items already completed will be
                    preserved. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Processing</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Cancel Batch</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {batch.status === 'completed' && items.length > 0 && (
            <Button variant="outline" onClick={handleExportResults}>
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </Button>
          )}
          <Button variant="outline" onClick={() => fetchBatch()}>
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Progress</CardTitle>
                {getStatusBadge(batch.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isProcessing && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <span>Processing items...</span>
                  </div>
                )}

                <Progress value={progress} className="h-3" />

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{batch.processedItems}</p>
                    <p className="text-sm text-muted-foreground">Processed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{batch.successCount}</p>
                    <p className="text-sm text-muted-foreground">Succeeded</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{batch.failureCount}</p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                </div>

                {batch.errorMessage && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    {batch.errorMessage}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                {items.length} of {batch.totalItems} items
              </CardDescription>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {isProcessing ? 'Waiting for results...' : 'No results yet'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verdict</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.itemIndex + 1}</TableCell>
                        <TableCell className="max-w-xs">
                          <span className="font-mono text-sm">{truncateContent(item.content)}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {item.verdict ? (
                            <div className="flex items-center gap-2">
                              {getVerdictIcon(item.verdict)}
                              {getVerdictBadge(item.verdict)}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {item.confidence !== null
                            ? `${(item.confidence * 100).toFixed(1)}%`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {item.processingTimeMs !== null ? `${item.processingTimeMs}ms` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {hasMoreItems && items.length > 0 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" onClick={() => fetchItems(itemsPage + 1, true)}>
                    Load More
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Format</p>
                <Badge variant="outline">{batch.inputFormat.toUpperCase()}</Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="font-mono">{batch.totalItems}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="font-mono">
                  {batch.totalCostCents > 0
                    ? `$${(batch.totalCostCents / 100).toFixed(4)}`
                    : '-'}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Tokens Used</p>
                <p className="font-mono text-sm">
                  {batch.totalInputTokens + batch.totalOutputTokens > 0
                    ? `${(batch.totalInputTokens + batch.totalOutputTokens).toLocaleString()} total`
                    : '-'}
                </p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p>{format(new Date(batch.createdAt), 'PPpp')}</p>
              </div>

              {batch.startedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Started</p>
                  <p>{format(new Date(batch.startedAt), 'PPpp')}</p>
                </div>
              )}

              {batch.completedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p>{format(new Date(batch.completedAt), 'PPpp')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Methods Config */}
          <Card>
            <CardHeader>
              <CardTitle>Methods Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(batch.methodsConfig || {})
                  .filter(([, weight]) => weight > 0)
                  .map(([method, weight]) => (
                    <div key={method} className="flex items-center justify-between">
                      <span className="text-sm">{formatParadigmName(method)}</span>
                      <Badge variant="outline">{((weight as number) * 100).toFixed(0)}%</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Context */}
          {batch.context && Object.keys(batch.context).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Context</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs">
                  {JSON.stringify(batch.context, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

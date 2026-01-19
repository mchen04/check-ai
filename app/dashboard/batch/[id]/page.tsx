'use client';

import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
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
  status: string;
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
    case 'validating':
      return <Badge className="bg-yellow-100 text-yellow-800">Validating</Badge>;
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
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchItems = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        const response = await fetch(`/api/dashboard/batch/${id}/results?limit=20&offset=${(page - 1) * 20}`);

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

  // Poll for updates when processing or validating
  useEffect(() => {
    if (batch?.status !== 'processing' && batch?.status !== 'validating') return;

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
          <p className="mb-3 text-xs text-red-500">{error || 'Batch not found'}</p>
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
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => router.push('/dashboard/batch')}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold">{batch.name || batch.originalFileName || 'Batch'}</h1>
              <code className="text-[10px] text-muted-foreground">{id.slice(0, 8)}...</code>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={handleCopyId}>
                <Copy className="h-3 w-3" />
              </Button>
              {copied && <span className="text-[10px] text-green-600">Copied!</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isProcessing && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-7 text-xs" disabled={isCancelling}>
                  {isCancelling ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <StopCircle className="mr-1.5 h-3 w-3" />}
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm">Cancel Batch?</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    This will stop processing. Completed items will be preserved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-7 text-xs">Keep</AlertDialogCancel>
                  <AlertDialogAction className="h-7 text-xs" onClick={handleCancel}>Cancel</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {batch.status === 'completed' && items.length > 0 && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExportResults}>
              <Download className="mr-1.5 h-3 w-3" />
              Export
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fetchBatch()}>
            <RefreshCw className="mr-1.5 h-3 w-3" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-4 lg:col-span-2">
          {/* Progress Card */}
          <Card>
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <h3 className="text-xs font-semibold">Progress</h3>
              {getStatusBadge(batch.status)}
            </div>
            <div className="p-3">
              <div className="space-y-3">
                {isProcessing && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                    <span className="text-xs">Processing...</span>
                  </div>
                )}
                <Progress value={progress} className="h-1.5" />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-semibold">{batch.processedItems}</p>
                    <p className="text-[10px] text-muted-foreground">Processed</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-600">{batch.successCount}</p>
                    <p className="text-[10px] text-muted-foreground">Succeeded</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-red-600">{batch.failureCount}</p>
                    <p className="text-[10px] text-muted-foreground">Failed</p>
                  </div>
                </div>
                {batch.errorMessage && (
                  <div className="rounded-md bg-red-50 p-2 text-[10px] text-red-800">{batch.errorMessage}</div>
                )}
              </div>
            </div>
          </Card>

          {/* Results Table */}
          <Card>
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <h3 className="text-xs font-semibold">Results</h3>
              <span className="text-[10px] text-muted-foreground">{items.length}/{batch.totalItems}</span>
            </div>
            <div className="p-2">
              {items.length === 0 ? (
                <div className="py-6 text-center text-[10px] text-muted-foreground">
                  {isProcessing ? 'Waiting for results...' : 'No results yet'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] text-[10px]">#</TableHead>
                      <TableHead className="text-[10px]">Content</TableHead>
                      <TableHead className="text-[10px]">Status</TableHead>
                      <TableHead className="text-[10px]">Verdict</TableHead>
                      <TableHead className="text-[10px]">Conf</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-[10px]">{item.itemIndex + 1}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="font-mono text-[10px] truncate block">{truncateContent(item.content, 40)}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {item.verdict ? (
                            <div className="flex items-center gap-1">
                              {getVerdictIcon(item.verdict)}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-[10px]">
                          {item.confidence !== null ? `${(item.confidence * 100).toFixed(0)}%` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {hasMoreItems && items.length > 0 && (
                <div className="mt-3 text-center">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fetchItems(itemsPage + 1, true)}>
                    Load More
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <Card>
            <div className="border-b px-4 py-2.5">
              <h3 className="text-xs font-semibold">Details</h3>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Format</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{batch.inputFormat.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Items</span>
                <span className="text-xs font-mono">{batch.totalItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Cost</span>
                <span className="text-xs font-mono">{batch.totalCostCents > 0 ? `$${(batch.totalCostCents / 100).toFixed(4)}` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Tokens</span>
                <span className="text-xs font-mono">{batch.totalInputTokens + batch.totalOutputTokens > 0 ? (batch.totalInputTokens + batch.totalOutputTokens).toLocaleString() : '-'}</span>
              </div>
              <Separator className="my-1" />
              <div>
                <span className="text-[10px] text-muted-foreground">Created</span>
                <p className="text-xs">{format(new Date(batch.createdAt), 'MMM d, h:mm a')}</p>
              </div>
              {batch.completedAt && (
                <div>
                  <span className="text-[10px] text-muted-foreground">Completed</span>
                  <p className="text-xs">{format(new Date(batch.completedAt), 'MMM d, h:mm a')}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Methods Config */}
          <Card>
            <div className="border-b px-4 py-2.5">
              <h3 className="text-xs font-semibold">Methods</h3>
            </div>
            <div className="p-2">
              <div className="space-y-1">
                {Object.entries(batch.methodsConfig || {})
                  .filter(([, weight]) => weight > 0)
                  .map(([method, weight]) => (
                    <div key={method} className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-muted/50">
                      <span className="text-xs">{formatParadigmName(method)}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{((weight as number) * 100).toFixed(0)}%</Badge>
                    </div>
                  ))}
              </div>
            </div>
          </Card>

          {/* Verify Options - Collapsible */}
          {batch.verifyOptions && Object.keys(batch.verifyOptions).length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                <span>Verification Options</span>
                <svg className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <Card className="mt-2">
                <div className="p-2 space-y-1">
                  {batch.verifyOptions.timeout && (
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-[10px] text-muted-foreground">Timeout</span>
                      <span className="text-xs">{(batch.verifyOptions.timeout / 1000).toFixed(0)}s</span>
                    </div>
                  )}
                  {batch.verifyOptions.acceptThreshold !== undefined && (
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-[10px] text-muted-foreground">Accept Threshold</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{(batch.verifyOptions.acceptThreshold * 100).toFixed(0)}%</Badge>
                    </div>
                  )}
                  {batch.verifyOptions.escalateThreshold !== undefined && (
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-[10px] text-muted-foreground">Escalate Threshold</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{(batch.verifyOptions.escalateThreshold * 100).toFixed(0)}%</Badge>
                    </div>
                  )}
                  {batch.verifyOptions.minConfidence !== undefined && (
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-[10px] text-muted-foreground">Min Confidence</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{(batch.verifyOptions.minConfidence * 100).toFixed(0)}%</Badge>
                    </div>
                  )}
                  {batch.verifyOptions.maxRetries !== undefined && (
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-[10px] text-muted-foreground">Max Retries</span>
                      <span className="text-xs">{batch.verifyOptions.maxRetries}</span>
                    </div>
                  )}
                  {batch.verifyOptions.retryOnLowConfidence !== undefined && (
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-[10px] text-muted-foreground">Retry on Low Confidence</span>
                      <Badge variant={batch.verifyOptions.retryOnLowConfidence ? 'default' : 'secondary'} className="text-[9px] px-1 py-0 h-4">
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
              <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                <span>Context</span>
                <svg className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <Card className="mt-2">
                <div className="p-2">
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-2 font-mono text-[10px]">{JSON.stringify(batch.context, null, 2)}</pre>
                </div>
              </Card>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

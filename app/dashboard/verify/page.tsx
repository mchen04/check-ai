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
import { VerificationStatusBadge } from '@/components/ui/status-badge';
import { ChevronRight, RefreshCw, Download } from 'lucide-react';
import { Spinner } from '@/components/ui/loading-spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VerdictIcon, VerdictBadge, type VerdictDisplay } from '@/components/ui/verdict-display';
import type { VerificationStatus } from '@/lib/api/types';
import { truncateString } from '@/lib/api/formatters';
import { PAGINATION_LIMITS } from '@/lib/constants';

// =============================================================================
// TYPES
// =============================================================================

interface Verification {
  id: string;
  content: string;
  status: VerificationStatus;
  verdict: VerdictDisplay;
  confidence: number | null;
  processingTimeMs: number | null;
  costCents: number | null;
  createdAt: string;
  completedAt: string | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function VerificationHistoryPage() {
  const router = useRouter();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchVerifications = useCallback(async (pageNum: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/dashboard/verifications?page=${pageNum}&limit=${PAGINATION_LIMITS.defaultLimit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch verifications');
      }

      const data = await response.json();
      setVerifications((prevVerifications) =>
        pageNum === 1 ? data.verifications : [...prevVerifications, ...data.verifications]
      );
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleRefresh = () => {
    fetchVerifications(1);
  };

  const handleLoadMore = () => {
    fetchVerifications(page + 1);
  };

  const handleRowClick = (id: string) => {
    router.push(`/dashboard/verify/${id}`);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/dashboard/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          includeParadigmResults: true,
          limit: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `verifications-export.${format}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate stats
  const stats = {
    total: verifications.length,
    verified: verifications.filter((v) => v.verdict === 'true').length,
    false: verifications.filter((v) => v.verdict === 'false').length,
    uncertain: verifications.filter((v) => v.verdict === 'uncertain').length,
    avgConfidence:
      verifications.filter((v) => v.confidence !== null).length > 0
        ? (
            verifications
              .filter((v) => v.confidence !== null)
              .reduce((sum, v) => sum + (v.confidence || 0), 0) /
            verifications.filter((v) => v.confidence !== null).length
          ).toFixed(1)
        : 'N/A',
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Verification History</h1>
        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting || verifications.length === 0}>
                {isExporting ? (
                  <Spinner size="xs" className="mr-2" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => router.push('/dashboard/playground')}>New</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Total</span>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Verified</span>
          <p className="text-2xl font-semibold text-success">{stats.verified}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">False</span>
          <p className="text-2xl font-semibold text-destructive">{stats.false}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Uncertain</span>
          <p className="text-2xl font-semibold text-warning">{stats.uncertain}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground">Avg Confidence</span>
          <p className="text-2xl font-semibold">{stats.avgConfidence}%</p>
        </Card>
      </div>

      {/* Verifications Table */}
      <Card>
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Recent Verifications</h3>
        </div>
        <div className="p-4">
          {error ? (
            <div className="py-8 text-center text-destructive">
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                Try Again
              </Button>
            </div>
          ) : verifications.length === 0 && !isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">No verifications yet</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/dashboard/playground')}>
                Create your first verification
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(v.id)}
                  >
                    <TableCell><VerificationStatusBadge status={v.status} /></TableCell>
                    <TableCell className="max-w-xs">
                      <span className="font-mono text-sm">{truncateString(v.content, 60, true)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <VerdictIcon verdict={v.verdict} />
                        <VerdictBadge verdict={v.verdict} />
                      </div>
                    </TableCell>
                    <TableCell>
                      {v.confidence !== null ? `${(v.confidence * 100).toFixed(1)}%` : '-'}
                    </TableCell>
                    <TableCell>
                      {v.processingTimeMs !== null ? `${v.processingTimeMs}ms` : '-'}
                    </TableCell>
                    <TableCell>
                      {v.costCents !== null ? `$${(v.costCents / 100).toFixed(4)}` : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(v.createdAt)}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {hasMore && !isLoading && verifications.length > 0 && (
            <div className="mt-3 text-center">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleLoadMore}>
                Load More
              </Button>
            </div>
          )}

          {isLoading && (
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

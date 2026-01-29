'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, RefreshCw, Download, Search, X } from 'lucide-react';
import { formatRelativeTime, getErrorMessage } from '@/lib/utils';
import { useVerifications } from '@/lib/swr';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VerificationStatusBadge } from '@/components/ui/status-badge';
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
import { Pagination } from '@/components/ui/pagination';
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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function VerificationListSkeleton() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded bg-muted" />
      </div>
      <Card className="mb-4">
        <div className="flex items-center gap-4 p-4">
          <div className="h-10 w-64 animate-pulse rounded bg-muted" />
          <div className="h-10 w-40 animate-pulse rounded bg-muted" />
        </div>
      </Card>
      <Card>
        <div className="p-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
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

export default function VerificationHistoryPage() {
  return (
    <Suspense fallback={<VerificationListSkeleton />}>
      <VerificationHistoryContent />
    </Suspense>
  );
}

function VerificationHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // AbortController ref for cancelling export requests on unmount
  const exportAbortControllerRef = useRef<AbortController | null>(null);

  // Filter state with lazy initialization (rerender-lazy-state-init)
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [verdictFilter, setVerdictFilter] = useState(() => searchParams.get('verdict') || 'all');
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam, 10) : 1;
  });

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Use SWR for automatic request deduplication and caching (client-swr-dedup)
  const { verifications, pagination, isLoading, error, mutate } = useVerifications(
    page,
    PAGINATION_LIMITS.defaultLimit,
    debouncedSearch,
    verdictFilter
  );

  // Update URL when filters change using Next.js router (not window.history)
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (verdictFilter && verdictFilter !== 'all') params.set('verdict', verdictFilter);

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '/dashboard/verify';
    router.replace(newUrl, { scroll: false });
  }, [page, debouncedSearch, verdictFilter, router]);

  // Memoized event handlers to prevent child re-renders (rerender-functional-setstate)
  const handleRefresh = useCallback(() => {
    mutate();
  }, [mutate]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleVerdictFilterChange = useCallback((value: string) => {
    setVerdictFilter(value);
    setPage(1); // Reset to page 1 when filter changes
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setVerdictFilter('all');
    setPage(1);
  }, []);

  // Use data attributes for stable event handler (advanced-event-handler-refs)
  const handleRowClick = useCallback((e: React.MouseEvent<HTMLTableRowElement> | React.KeyboardEvent<HTMLTableRowElement>) => {
    const id = e.currentTarget.dataset.verificationId;
    if (id) router.push(`/dashboard/verify/${id}`);
  }, [router]);

  const handleExport = useCallback(async (format: 'csv' | 'json') => {
    let anchor: HTMLAnchorElement | null = null;
    let blobUrl: string | null = null;

    // Cancel any in-flight export request
    if (exportAbortControllerRef.current) {
      exportAbortControllerRef.current.abort();
    }
    exportAbortControllerRef.current = new AbortController();

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
        signal: exportAbortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `verifications-export.${format}`;

      const blob = await response.blob();
      blobUrl = window.URL.createObjectURL(blob);
      anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
    } catch (err) {
      // Ignore abort errors (user cancelled or navigated away)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('[Verifications] Export failed:', err);
      setExportError('Failed to export data. Please try again.');
    } finally {
      // Proper cleanup to prevent memory leaks
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
      if (anchor && document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
      setIsExporting(false);
    }
  }, []);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (exportAbortControllerRef.current) {
        exportAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Memoized export handlers to prevent re-renders (rerender-functional-setstate)
  const handleExportCsv = useCallback(() => handleExport('csv'), [handleExport]);
  const handleExportJson = useCallback(() => handleExport('json'), [handleExport]);

  // Derived state - simple boolean expression, no memo needed
  const hasActiveFilters = Boolean(debouncedSearch || (verdictFilter && verdictFilter !== 'all'));

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Verification History</h1>
          {pagination && (
            <p className="text-sm text-muted-foreground">
              {pagination.total.toLocaleString()} verification{pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
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
              <DropdownMenuItem onClick={handleExportCsv}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJson}>
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

      {/* Filters */}
      <Card className="mb-4">
        <div className="flex items-center gap-4 p-4">
          <div className="relative flex-1 max-w-sm">
            <label htmlFor="search-verifications" className="sr-only">
              Search verifications by content
            </label>
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              id="search-verifications"
              placeholder="Search content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search verifications by content"
            />
          </div>
          <Select value={verdictFilter} onValueChange={handleVerdictFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All verdicts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All verdicts</SelectItem>
              <SelectItem value="true">Verified (True)</SelectItem>
              <SelectItem value="false">False</SelectItem>
              <SelectItem value="uncertain">Uncertain</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Verifications Table */}
      <Card>
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
              <p className="text-sm">
                {hasActiveFilters ? 'No verifications match your filters' : 'No verifications yet'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" size="sm" className="mt-4" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/dashboard/playground')}>
                  Create your first verification
                </Button>
              )}
            </div>
          ) : (
            <>
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
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && verifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <RefreshCw className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                        <p className="mt-1 text-xs text-muted-foreground">Loading...</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    verifications.map((v) => (
                      <TableRow
                        key={v.id}
                        data-verification-id={v.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={handleRowClick}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRowClick(e);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`View verification: ${truncateString(v.content, 40, true)}`}
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
                    ))
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
                    disabled={isLoading}
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

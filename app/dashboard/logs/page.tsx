'use client';

import { useState, useEffect, useCallback, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { PAGINATION_LIMITS } from '@/lib/constants';

// =============================================================================
// TYPES
// =============================================================================

interface LogEntry {
  id: string;
  verificationId: string | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costCents: number;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-500/10 text-green-700 dark:text-green-400',
  anthropic: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  google: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  together: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  groq: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] || 'bg-muted text-muted-foreground';
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function LogsListSkeleton() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded bg-muted" />
      </div>
      <Card className="mb-4">
        <div className="flex items-center gap-4 p-4">
          <div className="h-10 w-44 animate-pulse rounded bg-muted" />
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

export default function LogsPage() {
  return (
    <Suspense fallback={<LogsListSkeleton />}>
      <LogsContent />
    </Suspense>
  );
}

function LogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // useTransition for loading state (rendering-usetransition-loading)
  const [isPending, startTransition] = useTransition();

  // Filter state with lazy initialization (rerender-lazy-state-init)
  const [providerFilter, setProviderFilter] = useState(() => searchParams.get('provider') || 'all');
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam, 10) : 1;
  });

  const fetchLogs = useCallback(async () => {
    setError(null);

    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', PAGINATION_LIMITS.defaultLimit.toString());

    if (providerFilter && providerFilter !== 'all') {
      params.set('provider', providerFilter);
    }

    const response = await fetch(`/api/dashboard/logs?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch logs');
    }

    const data = await response.json();
    setLogs(data.logs);
    setPagination(data.pagination);
    setProviders(data.providers);
  }, [page, providerFilter]);

  useEffect(() => {
    startTransition(async () => {
      try {
        await fetchLogs();
      } catch (err) {
        setError(getErrorMessage(err));
      }
    });
  }, [fetchLogs]);

  // Update URL when filters change using Next.js router (not window.history)
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (providerFilter && providerFilter !== 'all') params.set('provider', providerFilter);

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '/dashboard/logs';
    router.replace(newUrl, { scroll: false });
  }, [page, providerFilter, router]);

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        await fetchLogs();
      } catch (err) {
        setError(getErrorMessage(err));
      }
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleProviderFilterChange = (value: string) => {
    setProviderFilter(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setProviderFilter('all');
    setPage(1);
  };

  const hasActiveFilters = providerFilter && providerFilter !== 'all';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">API Logs</h1>
          {pagination && (
            <p className="text-sm text-muted-foreground">
              {pagination.total.toLocaleString()} API call{pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <div className="flex items-center gap-4 p-4">
          <Select value={providerFilter} onValueChange={handleProviderFilterChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              {providers.map((provider) => (
                <SelectItem key={provider} value={provider}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </SelectItem>
              ))}
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

      {/* Logs Table */}
      <Card>
        <div className="p-4">
          {error ? (
            <div className="py-8 text-center text-destructive">
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                Try Again
              </Button>
            </div>
          ) : logs.length === 0 && !isPending ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">
                {hasActiveFilters ? 'No logs match your filters' : 'No API calls yet'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Input</TableHead>
                    <TableHead className="text-right">Output</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending && logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <RefreshCw className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                        <p className="mt-1 text-xs text-muted-foreground">Loading...</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline" className={getProviderColor(log.provider)}>
                            {log.provider}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{log.model}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTokens(log.inputTokens)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTokens(log.outputTokens)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ${(log.costCents / 100).toFixed(4)}
                        </TableCell>
                        <TableCell>
                          {log.verificationId ? (
                            <Link
                              href={`/dashboard/verify/${log.verificationId}`}
                              className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                            >
                              {log.verificationId.slice(0, 8)}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatRelativeTime(log.createdAt)}
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

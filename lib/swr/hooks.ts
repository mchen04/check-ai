/**
 * SWR Hooks for Dashboard Data Fetching
 * Provides automatic request deduplication and caching (client-swr-dedup)
 */

import useSWR from 'swr';
import type { BatchStatus, VerificationStatus } from '@/lib/api/types';
import type { VerdictDisplay } from '@/components/ui/verdict-display';
import type { AnalyticsData, AdvancedAnalyticsData } from '@/lib/analytics';
import { fetcher, swrConfig } from './fetcher';

// =============================================================================
// TYPES
// =============================================================================

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

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

interface BatchesResponse {
  batches: BatchJob[];
  pagination: PaginationInfo;
  stats: { total: number; processing: number; completed: number; failed: number };
}

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

interface VerificationsResponse {
  verifications: Verification[];
  pagination: PaginationInfo;
}

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

interface LogsResponse {
  logs: LogEntry[];
  pagination: PaginationInfo;
  providers: string[];
}

interface AnalyticsResponse {
  data: AnalyticsData;
  advanced?: AdvancedAnalyticsData;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch batches with SWR for automatic deduplication and caching
 */
export function useBatches(page: number, limit: number) {
  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  const { data, error, isLoading, mutate } = useSWR<BatchesResponse>(
    `/api/dashboard/batches?${params.toString()}`,
    fetcher,
    {
      ...swrConfig.paginated,
      // Auto-refresh when there are processing jobs
      refreshInterval: (data) =>
        data?.stats.processing && data.stats.processing > 0 ? 5000 : 0,
    }
  );

  return {
    batches: data?.batches ?? [],
    pagination: data?.pagination ?? null,
    stats: data?.stats ?? { total: 0, processing: 0, completed: 0, failed: 0 },
    isLoading,
    error,
    mutate,
  };
}

/**
 * Fetch verifications with SWR for automatic deduplication and caching
 */
export function useVerifications(
  page: number,
  limit: number,
  search?: string,
  verdict?: string
) {
  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  if (search) params.set('search', search);
  if (verdict && verdict !== 'all') params.set('verdict', verdict);

  const { data, error, isLoading, mutate } = useSWR<VerificationsResponse>(
    `/api/dashboard/verifications?${params.toString()}`,
    fetcher,
    swrConfig.paginated
  );

  return {
    verifications: data?.verifications ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Fetch logs with SWR for automatic deduplication and caching
 */
export function useLogs(page: number, limit: number, provider?: string) {
  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  if (provider && provider !== 'all') params.set('provider', provider);

  const { data, error, isLoading, mutate } = useSWR<LogsResponse>(
    `/api/dashboard/logs?${params.toString()}`,
    fetcher,
    swrConfig.paginated
  );

  return {
    logs: data?.logs ?? [],
    pagination: data?.pagination ?? null,
    providers: data?.providers ?? [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * Fetch analytics with SWR for automatic deduplication and caching
 */
export function useAnalytics(range: string, includeAdvanced = false) {
  const params = new URLSearchParams();
  params.set('range', range);
  if (includeAdvanced) params.set('advanced', 'true');

  const { data, error, isLoading, mutate } = useSWR<AnalyticsResponse>(
    `/api/dashboard/analytics?${params.toString()}`,
    fetcher,
    swrConfig.static
  );

  return {
    data: data?.data ?? null,
    advanced: data?.advanced ?? null,
    isLoading,
    error,
    mutate,
  };
}

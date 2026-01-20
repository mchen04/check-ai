'use client';

/**
 * useFetchWithPagination Hook
 *
 * A reusable hook for fetching paginated data with built-in support for:
 * - Loading and error states
 * - Pagination (page-based)
 * - Search with debouncing
 * - Filters
 * - AbortController for request cancellation
 * - Optional data transformation
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface FetchState<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  pagination: PaginationState;
}

export interface UseFetchWithPaginationOptions<T, ApiResponse, Filters extends object = Record<string, string>> {
  /** The API endpoint URL (without query params) */
  endpoint: string;
  /** Page size for pagination */
  pageSize?: number;
  /** Initial filters */
  initialFilters?: Filters;
  /** Search debounce delay in ms */
  debounceMs?: number;
  /** Transform API response to extract data array */
  transformResponse: (response: ApiResponse) => {
    data: T[];
    total: number;
  };
  /** Build additional query params from filters */
  buildQueryParams?: (filters: Filters, search: string) => Record<string, string>;
  /** Whether to fetch immediately on mount */
  fetchOnMount?: boolean;
  /** Dependency array that triggers refetch when changed */
  deps?: unknown[];
}

export interface UseFetchWithPaginationReturn<T, Filters extends object = Record<string, string>> extends FetchState<T> {
  /** Current search query (raw, not debounced) */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Current filters */
  filters: Filters;
  /** Update a single filter */
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  /** Update multiple filters at once */
  setFilters: (filters: Partial<Filters>) => void;
  /** Reset all filters to initial values */
  resetFilters: () => void;
  /** Go to specific page */
  setPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  prevPage: () => void;
  /** Manually trigger refetch */
  refetch: () => Promise<void>;
  /** Whether there are active filters */
  hasActiveFilters: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

export function useFetchWithPagination<
  T,
  ApiResponse = unknown,
  Filters extends object = Record<string, string>
>(
  options: UseFetchWithPaginationOptions<T, ApiResponse, Filters>
): UseFetchWithPaginationReturn<T, Filters> {
  const {
    endpoint,
    pageSize = 10,
    initialFilters = {} as Filters,
    debounceMs = 300,
    transformResponse,
    buildQueryParams,
    fetchOnMount = true,
    deps = [],
  } = options;

  // State
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(fetchOnMount);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFiltersState] = useState<Filters>(initialFilters);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialFiltersRef = useRef(initialFilters);
  const transformResponseRef = useRef(transformResponse);
  const buildQueryParamsRef = useRef(buildQueryParams);

  // Keep refs in sync with latest props (avoids stale closures without causing re-renders)
  useEffect(() => {
    transformResponseRef.current = transformResponse;
  }, [transformResponse]);

  useEffect(() => {
    buildQueryParamsRef.current = buildQueryParams;
  }, [buildQueryParams]);

  // Computed values
  const totalPages = useMemo(() => Math.ceil(total / pageSize), [total, pageSize]);

  const pagination: PaginationState = useMemo(
    () => ({
      page,
      pageSize,
      total,
      totalPages,
    }),
    [page, pageSize, total, totalPages]
  );

  const hasActiveFilters = useMemo(() => {
    const initial = initialFiltersRef.current;
    const hasFilterChanges = Object.keys(filters).some(
      (key) => filters[key as keyof Filters] !== initial[key as keyof Filters]
    );
    return hasFilterChanges || searchQuery !== '';
  }, [filters, searchQuery]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  // Fetch function
  const fetchData = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString(),
      });

      // Add search if present
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      // Add custom filter params
      if (buildQueryParamsRef.current) {
        const customParams = buildQueryParamsRef.current(filters, debouncedSearch);
        Object.entries(customParams).forEach(([key, value]) => {
          if (value) {
            params.set(key, value);
          }
        });
      }

      const response = await fetch(`${endpoint}?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const { data: transformedData, total: totalCount } = transformResponseRef.current(json);

      setData(transformedData);
      setTotal(totalCount);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error(`Error fetching from ${endpoint}:`, err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, page, pageSize, debouncedSearch, filters]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (fetchOnMount) {
      fetchData();
    }

    // Cleanup abort controller on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...deps]);

  // Filter setters
  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const setFilters = useCallback((newFilters: Partial<Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(initialFiltersRef.current);
    setSearchQuery('');
    setPage(1);
  }, []);

  // Pagination helpers
  const nextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  return {
    data,
    isLoading,
    error,
    pagination,
    searchQuery,
    setSearchQuery,
    filters,
    setFilter,
    setFilters,
    resetFilters,
    setPage,
    nextPage,
    prevPage,
    refetch: fetchData,
    hasActiveFilters,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useFetchWithPagination;

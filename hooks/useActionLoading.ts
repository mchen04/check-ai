'use client';

/**
 * useActionLoading Hook
 *
 * A hook for managing loading state for individual items in a list.
 * Useful for dropdown actions, toggle buttons, etc. where you need
 * to track which specific item is currently loading.
 */

import { useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface UseActionLoadingReturn {
  /** The ID of the currently loading item (null if none) */
  loadingId: string | null;
  /** Check if a specific item is loading */
  isLoading: (id: string) => boolean;
  /** Set the loading state for an item */
  setLoading: (id: string | null) => void;
  /** Execute an async action with automatic loading state management */
  withLoading: <T>(id: string, action: () => Promise<T>) => Promise<T | undefined>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing loading state for individual items.
 *
 * @example
 * ```tsx
 * const { loadingId, isLoading, withLoading } = useActionLoading();
 *
 * const handleDelete = (id: string) => {
 *   withLoading(id, async () => {
 *     await deleteItem(id);
 *     refreshList();
 *   });
 * };
 *
 * // In JSX:
 * <Button disabled={isLoading(item.id)} onClick={() => handleDelete(item.id)}>
 *   {isLoading(item.id) ? <Spinner /> : 'Delete'}
 * </Button>
 * ```
 */
export function useActionLoading(): UseActionLoadingReturn {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const isLoading = useCallback(
    (id: string) => loadingId === id,
    [loadingId]
  );

  const setLoading = useCallback((id: string | null) => {
    setLoadingId(id);
  }, []);

  const withLoading = useCallback(
    async <T>(id: string, action: () => Promise<T>): Promise<T | undefined> => {
      setLoadingId(id);
      try {
        return await action();
      } catch (error) {
        // Re-throw error for caller to handle - error UI/toasts should display to user
        // APM/error monitoring should be handled at a higher level
        throw error;
      } finally {
        setLoadingId(null);
      }
    },
    []
  );

  return {
    loadingId,
    isLoading,
    setLoading,
    withLoading,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useActionLoading;

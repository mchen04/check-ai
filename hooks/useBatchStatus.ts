'use client';

/**
 * useBatchStatus Hook
 * Subscribe to real-time batch processing status updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export interface BatchProgress {
  processed: number;
  success: number;
  failed: number;
  total: number;
}

export interface BatchStatusState {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: BatchProgress;
  lastItemId: string | null;
  lastItemIndex: number | null;
  isComplete: boolean;
  isLoading: boolean;
  error: Error | null;
}

interface UseBatchStatusOptions {
  onItemComplete?: (itemId: string, itemIndex: number, success: boolean) => void;
  onComplete?: (status: string) => void;
  onError?: (error: Error) => void;
  pollInterval?: number;
}

// =============================================================================
// HOOK
// =============================================================================

export function useBatchStatus(
  batchId: string | null,
  options: UseBatchStatusOptions = {}
): BatchStatusState {
  const { onItemComplete, onComplete, onError, pollInterval = 5000 } = options;

  const [state, setState] = useState<BatchStatusState>({
    status: 'pending',
    progress: { processed: 0, success: 0, failed: 0, total: 0 },
    lastItemId: null,
    lastItemIndex: null,
    isComplete: false,
    isLoading: true,
    error: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeConnectedRef = useRef(false);

  // Handle status update from realtime
  const handleStatusUpdate = useCallback(
    (payload: {
      type: string;
      status?: string;
      errorMessage?: string;
      itemId?: string;
      itemIndex?: number;
      success?: boolean;
      processedItems?: number;
      successCount?: number;
      failureCount?: number;
      totalItems?: number;
    }) => {
      if (payload.type === 'status_update') {
        setState((prev) => ({
          ...prev,
          status: (payload.status as BatchStatusState['status']) || prev.status,
        }));
      } else if (payload.type === 'item_complete') {
        setState((prev) => ({
          ...prev,
          progress: {
            processed: payload.processedItems ?? prev.progress.processed,
            success: payload.successCount ?? prev.progress.success,
            failed: payload.failureCount ?? prev.progress.failed,
            total: prev.progress.total,
          },
          lastItemId: payload.itemId || null,
          lastItemIndex: payload.itemIndex ?? null,
        }));

        if (payload.itemId && payload.itemIndex !== undefined) {
          onItemComplete?.(payload.itemId, payload.itemIndex, payload.success ?? false);
        }
      } else if (payload.type === 'complete') {
        setState((prev) => ({
          ...prev,
          status: (payload.status as BatchStatusState['status']) || 'completed',
          progress: {
            processed: payload.totalItems ?? prev.progress.total,
            success: payload.successCount ?? prev.progress.success,
            failed: payload.failureCount ?? prev.progress.failed,
            total: payload.totalItems ?? prev.progress.total,
          },
          isComplete: true,
          isLoading: false,
        }));

        onComplete?.(payload.status || 'completed');

        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    },
    [onItemComplete, onComplete]
  );

  // Poll for status (fallback and initial load)
  const pollStatus = useCallback(async () => {
    if (!batchId) return;

    try {
      const response = await fetch(`/api/v1/batch/${batchId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return; // Batch not found yet, keep polling
        }
        throw new Error(`Failed to fetch batch status: ${response.status}`);
      }

      const data = await response.json();

      setState((prev) => {
        const isComplete = ['completed', 'failed', 'cancelled'].includes(data.status);

        // Stop polling if complete
        if (isComplete && pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        return {
          status: data.status,
          progress: {
            processed: data.processedItems ?? 0,
            success: data.successCount ?? 0,
            failed: data.failureCount ?? 0,
            total: data.totalItems ?? 0,
          },
          lastItemId: prev.lastItemId,
          lastItemIndex: prev.lastItemIndex,
          isComplete,
          isLoading: false,
          error: null,
        };
      });

      if (['completed', 'failed', 'cancelled'].includes(data.status)) {
        onComplete?.(data.status);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setState((prev) => ({ ...prev, error, isLoading: false }));
      onError?.(error);
    }
  }, [batchId, onComplete, onError]);

  // Setup subscription and polling
  useEffect(() => {
    if (!batchId) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    // Setup Supabase realtime subscription
    const supabase = createClient();
    const channelName = `batch:${batchId}`;

    channelRef.current = supabase
      .channel(channelName)
      .on('broadcast', { event: 'status_update' }, ({ payload }) => {
        handleStatusUpdate(payload);
      })
      .on('broadcast', { event: 'item_complete' }, ({ payload }) => {
        handleStatusUpdate(payload);
      })
      .on('broadcast', { event: 'complete' }, ({ payload }) => {
        handleStatusUpdate(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Realtime connected - stop polling to avoid redundant requests
          realtimeConnectedRef.current = true;
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Realtime failed - ensure polling is running as fallback
          realtimeConnectedRef.current = false;
          if (!pollIntervalRef.current) {
            pollIntervalRef.current = setInterval(pollStatus, pollInterval);
          }
          if (status === 'CHANNEL_ERROR') {
            const error = new Error('Failed to subscribe to batch channel');
            setState((prev) => ({ ...prev, error }));
            onError?.(error);
          }
        } else if (status === 'CLOSED') {
          realtimeConnectedRef.current = false;
        }
      });

    // Initial fetch immediately
    pollStatus();

    // Start polling - will be stopped when realtime connects
    pollIntervalRef.current = setInterval(pollStatus, pollInterval);

    // Cleanup
    return () => {
      realtimeConnectedRef.current = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [batchId, pollInterval, handleStatusUpdate, pollStatus, onError]);

  return state;
}

export default useBatchStatus;

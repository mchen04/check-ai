'use client';

/**
 * useVerificationStatus Hook
 * Subscribe to real-time verification status updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  createVerificationSubscription,
  VerificationUpdate,
  RealtimeChannel,
} from '@/utils/supabase/realtime';

// =============================================================================
// TYPES
// =============================================================================

export interface ParadigmProgress {
  paradigm: string;
  verdict: string | null;
  confidence: number | null;
  completedAt: number;
}

/**
 * State shape for the useVerificationStatus hook.
 * Note: This is different from VerificationStatus in @/lib/api/types which is just the status string.
 */
export interface VerificationStatusState {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'escalated';
  progress: {
    completed: number;
    total: number;
  };
  paradigmResults: ParadigmProgress[];
  result: {
    verdict: string | null;
    confidence: number | null;
    decision: string;
    processingTimeMs: number;
    costCents: number;
  } | null;
}

export interface UseVerificationStatusOptions {
  onComplete?: (result: VerificationStatusState['result']) => void;
  onError?: (error: Error) => void;
  pollInterval?: number; // Fallback polling interval in ms
}

// =============================================================================
// HOOK
// =============================================================================

export function useVerificationStatus(
  verificationId: string | null,
  options: UseVerificationStatusOptions = {}
): VerificationStatusState & { isLoading: boolean; error: Error | null } {
  const { onComplete, onError, pollInterval = 2000 } = options;

  const [status, setStatus] = useState<VerificationStatusState>({
    status: 'pending',
    progress: { completed: 0, total: 0 },
    paradigmResults: [],
    result: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeConnectedRef = useRef(false);

  // Store callbacks in refs to avoid re-subscription on callback changes
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Handle status update - stable callback
  const handleStatusUpdate = useCallback((data: VerificationUpdate['data']) => {
    setStatus((prev) => ({
      ...prev,
      status: (data.status as VerificationStatusState['status']) || prev.status,
      progress: data.progress || prev.progress,
    }));
  }, []);

  // Handle paradigm completion - stable callback
  const handleParadigmComplete = useCallback((data: VerificationUpdate['data']) => {
    if (data.paradigm) {
      setStatus((prev) => ({
        ...prev,
        progress: data.progress || prev.progress,
        paradigmResults: [
          ...prev.paradigmResults,
          {
            paradigm: data.paradigm!,
            verdict: data.verdict || null,
            confidence: data.confidence || null,
            completedAt: Date.now(),
          },
        ],
      }));
    }
  }, []);

  // Handle final result - stable callback using ref
  const handleFinalResult = useCallback(
    (data: VerificationUpdate['data']) => {
      const result = data.result || null;

      setStatus((prev) => ({
        ...prev,
        status: 'completed',
        result,
      }));

      setIsLoading(false);

      if (result) {
        onCompleteRef.current?.(result);
      }
    },
    [] // Now stable - uses ref for callback
  );

  // Handle error - stable callback using ref
  const handleError = useCallback(
    (err: Error) => {
      setError(err);
      setIsLoading(false);
      onErrorRef.current?.(err);
    },
    [] // Now stable - uses ref for callback
  );

  // Poll for status (fallback)
  const pollStatus = useCallback(async () => {
    if (!verificationId) return;

    try {
      const response = await fetch(`/api/dashboard/verifications/${verificationId}`);

      if (!response.ok) {
        if (response.status === 404) {
          // Verification not found yet, keep polling
          return;
        }
        throw new Error(`Failed to fetch verification status: ${response.status}`);
      }

      const data = await response.json();

      setStatus((prev) => ({
        status: data.status,
        progress: {
          completed: data.paradigmResults?.length || 0,
          total: Object.keys(data.methodsConfig || {}).filter((k) => data.methodsConfig[k] > 0)
            .length,
        },
        paradigmResults:
          data.paradigmResults?.map(
            (pr: {
              paradigm: string;
              verdict: string | null;
              confidence: number | null;
              createdAt: string;
            }) => ({
              paradigm: pr.paradigm,
              verdict: pr.verdict,
              confidence: pr.confidence,
              completedAt: new Date(pr.createdAt).getTime(),
            })
          ) || prev.paradigmResults,
        result:
          data.status === 'completed'
            ? {
                verdict: data.verdict,
                confidence: data.confidence,
                decision: data.decision,
                processingTimeMs: data.processingTimeMs,
                costCents: data.costCents,
              }
            : null,
      }));

      if (data.status === 'completed' || data.status === 'failed') {
        setIsLoading(false);

        if (data.status === 'completed' && data.verdict !== undefined) {
          onCompleteRef.current?.({
            verdict: data.verdict,
            confidence: data.confidence,
            decision: data.decision,
            processingTimeMs: data.processingTimeMs,
            costCents: data.costCents,
          });
        }

        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, [verificationId, handleError]); // Removed onComplete - using ref

  // Setup subscription and polling
  useEffect(() => {
    if (!verificationId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Setup Supabase realtime subscription
    const supabase = createClient();

    channelRef.current = createVerificationSubscription(supabase, verificationId, {
      onStatusUpdate: handleStatusUpdate,
      onParadigmComplete: handleParadigmComplete,
      onFinalResult: handleFinalResult,
      onError: handleError,
      onSubscribed: () => {
        // Realtime connected - stop polling to avoid redundant requests
        realtimeConnectedRef.current = true;
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      },
    });

    // Start polling as fallback (will be stopped when realtime connects)
    pollStatus();
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
  }, [
    verificationId,
    pollInterval,
    handleStatusUpdate,
    handleParadigmComplete,
    handleFinalResult,
    handleError,
    pollStatus,
  ]); // All callbacks are now stable

  return {
    ...status,
    isLoading,
    error,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useVerificationStatus;

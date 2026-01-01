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

export interface VerificationStatus {
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

interface UseVerificationStatusOptions {
  onComplete?: (result: VerificationStatus['result']) => void;
  onError?: (error: Error) => void;
  pollInterval?: number; // Fallback polling interval in ms
}

// =============================================================================
// HOOK
// =============================================================================

export function useVerificationStatus(
  verificationId: string | null,
  options: UseVerificationStatusOptions = {}
): VerificationStatus & { isLoading: boolean; error: Error | null } {
  const { onComplete, onError, pollInterval = 2000 } = options;

  const [status, setStatus] = useState<VerificationStatus>({
    status: 'pending',
    progress: { completed: 0, total: 0 },
    paradigmResults: [],
    result: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle status update
  const handleStatusUpdate = useCallback((data: VerificationUpdate['data']) => {
    setStatus((prev) => ({
      ...prev,
      status: (data.status as VerificationStatus['status']) || prev.status,
      progress: data.progress || prev.progress,
    }));
  }, []);

  // Handle paradigm completion
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

  // Handle final result
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
        onComplete?.(result);
      }
    },
    [onComplete]
  );

  // Handle error
  const handleError = useCallback(
    (err: Error) => {
      setError(err);
      setIsLoading(false);
      onError?.(err);
    },
    [onError]
  );

  // Poll for status (fallback)
  const pollStatus = useCallback(async () => {
    if (!verificationId) return;

    try {
      const response = await fetch(`/api/v1/verify/${verificationId}`);

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
          onComplete?.({
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
  }, [verificationId, onComplete, handleError]);

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
    });

    // Start polling as fallback
    pollStatus();
    pollIntervalRef.current = setInterval(pollStatus, pollInterval);

    // Cleanup
    return () => {
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
  ]);

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

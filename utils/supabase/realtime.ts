/**
 * Supabase Realtime Utilities
 * For broadcasting verification status updates
 */

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('Realtime');

// =============================================================================
// TYPES
// =============================================================================

export interface VerificationUpdate {
  type: 'status_update' | 'paradigm_complete' | 'final_result';
  verificationId: string;
  timestamp: number;
  data: {
    status?: string;
    paradigm?: string;
    verdict?: string | null;
    confidence?: number | null;
    progress?: {
      completed: number;
      total: number;
    };
    result?: {
      verdict: string | null;
      confidence: number | null;
      decision: string;
      processingTimeMs: number;
      costCents: number;
    };
  };
}

// =============================================================================
// REALTIME CLIENT (SERVER-SIDE)
// =============================================================================

let serverClient: SupabaseClient | null = null;
let realtimeConfigured: boolean | null = null;

/**
 * Check if realtime broadcasting is properly configured
 * Returns false if SUPABASE_SERVICE_ROLE_KEY is missing
 */
function isRealtimeConfigured(): boolean {
  if (realtimeConfigured !== null) {
    return realtimeConfigured;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  realtimeConfigured = !!(supabaseUrl && supabaseServiceKey);

  if (!realtimeConfigured) {
    log.warn('SUPABASE_SERVICE_ROLE_KEY not configured - realtime disabled, clients will poll');
  }

  return realtimeConfigured;
}

/**
 * Get or create the server-side Supabase client for broadcasting
 * Returns null if not properly configured
 */
function getServerClient(): SupabaseClient | null {
  if (!isRealtimeConfigured()) {
    return null;
  }

  if (!serverClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    serverClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return serverClient;
}

// =============================================================================
// BROADCAST FUNCTIONS (SERVER-SIDE)
// =============================================================================

/**
 * Broadcast a verification update to subscribers
 * Gracefully skips if realtime is not configured (clients will use polling fallback)
 */
export async function broadcastVerificationUpdate(
  verificationId: string,
  update: VerificationUpdate
): Promise<void> {
  try {
    const client = getServerClient();

    // Gracefully skip if realtime is not configured
    if (!client) {
      return;
    }

    const channel = client.channel(`verification:${verificationId}`);

    await channel.send({
      type: 'broadcast',
      event: update.type,
      payload: update,
    });

    // Clean up channel after broadcast
    await client.removeChannel(channel);
  } catch (error) {
    log.error({ err: error, verificationId: update.verificationId }, 'Failed to broadcast verification update');
    // Don't throw - broadcasting is non-critical, clients will fall back to polling
  }
}

/**
 * Broadcast status change
 */
export async function broadcastStatusUpdate(
  verificationId: string,
  status: string,
  progress?: { completed: number; total: number }
): Promise<void> {
  await broadcastVerificationUpdate(verificationId, {
    type: 'status_update',
    verificationId,
    timestamp: Date.now(),
    data: {
      status,
      progress,
    },
  });
}

/**
 * Broadcast paradigm completion
 */
export async function broadcastParadigmComplete(
  verificationId: string,
  paradigm: string,
  verdict: string | null,
  confidence: number | null,
  progress: { completed: number; total: number }
): Promise<void> {
  await broadcastVerificationUpdate(verificationId, {
    type: 'paradigm_complete',
    verificationId,
    timestamp: Date.now(),
    data: {
      paradigm,
      verdict,
      confidence,
      progress,
    },
  });
}

/**
 * Broadcast final result
 */
export async function broadcastFinalResult(
  verificationId: string,
  result: {
    verdict: string | null;
    confidence: number | null;
    decision: string;
    processingTimeMs: number;
    costCents: number;
  }
): Promise<void> {
  await broadcastVerificationUpdate(verificationId, {
    type: 'final_result',
    verificationId,
    timestamp: Date.now(),
    data: {
      status: 'completed',
      result,
    },
  });
}

// =============================================================================
// BATCH BROADCAST FUNCTIONS (SERVER-SIDE)
// =============================================================================

export interface BatchUpdate {
  type: 'status_update' | 'item_complete' | 'complete';
  timestamp: number;
  status?: string;
  errorMessage?: string;
  itemId?: string;
  itemIndex?: number;
  success?: boolean;
  verdict?: string;
  confidence?: number;
  processedItems?: number;
  successCount?: number;
  failureCount?: number;
  totalItems?: number;
  totalCostCents?: number;
}

/**
 * Broadcast a batch update to subscribers
 * Gracefully skips if realtime is not configured (clients will use polling fallback)
 */
export async function broadcastBatchUpdate(
  batchId: string,
  update: BatchUpdate
): Promise<void> {
  try {
    const client = getServerClient();

    // Gracefully skip if realtime is not configured
    if (!client) {
      return;
    }

    const channel = client.channel(`batch:${batchId}`);

    await channel.send({
      type: 'broadcast',
      event: update.type,
      payload: update,
    });

    // Clean up channel after broadcast
    await client.removeChannel(channel);
  } catch (error) {
    log.error({ err: error, batchId }, 'Failed to broadcast batch update');
    // Don't throw - broadcasting is non-critical, clients will fall back to polling
  }
}

/**
 * Broadcast batch item completion
 */
export async function broadcastBatchItemComplete(
  batchId: string,
  itemId: string,
  itemIndex: number,
  success: boolean,
  progress: {
    processed: number;
    success: number;
    failed: number;
    total: number;
  },
  verdict?: string,
  confidence?: number
): Promise<void> {
  await broadcastBatchUpdate(batchId, {
    type: 'item_complete',
    timestamp: Date.now(),
    itemId,
    itemIndex,
    success,
    verdict,
    confidence,
    processedItems: progress.processed,
    successCount: progress.success,
    failureCount: progress.failed,
    totalItems: progress.total,
  });
}

/**
 * Broadcast batch status update
 */
export async function broadcastBatchStatusUpdate(
  batchId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  await broadcastBatchUpdate(batchId, {
    type: 'status_update',
    timestamp: Date.now(),
    status,
    errorMessage,
  });
}

/**
 * Broadcast batch completion
 */
export async function broadcastBatchComplete(
  batchId: string,
  status: string,
  summary: {
    totalItems: number;
    successCount: number;
    failureCount: number;
    totalCostCents: number;
  }
): Promise<void> {
  await broadcastBatchUpdate(batchId, {
    type: 'complete',
    timestamp: Date.now(),
    status,
    totalItems: summary.totalItems,
    successCount: summary.successCount,
    failureCount: summary.failureCount,
    totalCostCents: summary.totalCostCents,
  });
}

// =============================================================================
// SUBSCRIPTION HOOK (CLIENT-SIDE)
// =============================================================================

/**
 * Create a subscription to verification updates
 * This is meant to be used with the useVerificationStatus hook
 */
export function createVerificationSubscription(
  client: SupabaseClient,
  verificationId: string,
  callbacks: {
    onStatusUpdate?: (data: VerificationUpdate['data']) => void;
    onParadigmComplete?: (data: VerificationUpdate['data']) => void;
    onFinalResult?: (data: VerificationUpdate['data']) => void;
    onError?: (error: Error) => void;
    onSubscribed?: () => void;
  }
): RealtimeChannel {
  const channel = client.channel(`verification:${verificationId}`);

  channel
    .on('broadcast', { event: 'status_update' }, ({ payload }) => {
      callbacks.onStatusUpdate?.(payload.data);
    })
    .on('broadcast', { event: 'paradigm_complete' }, ({ payload }) => {
      callbacks.onParadigmComplete?.(payload.data);
    })
    .on('broadcast', { event: 'final_result' }, ({ payload }) => {
      callbacks.onFinalResult?.(payload.data);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        callbacks.onSubscribed?.();
      } else if (status === 'CHANNEL_ERROR') {
        callbacks.onError?.(new Error('Failed to subscribe to verification channel'));
      }
    });

  return channel;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { RealtimeChannel };

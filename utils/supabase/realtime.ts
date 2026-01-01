/**
 * Supabase Realtime Utilities
 * For broadcasting verification status updates
 */

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

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

function getServerClient(): SupabaseClient {
    if (!serverClient) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase environment variables not configured');
        }

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
 */
export async function broadcastVerificationUpdate(
    verificationId: string,
    update: VerificationUpdate
): Promise<void> {
    try {
        const client = getServerClient();
        const channel = client.channel(`verification:${verificationId}`);

        await channel.send({
            type: 'broadcast',
            event: update.type,
            payload: update,
        });

        // Clean up channel after broadcast
        await client.removeChannel(channel);
    } catch (error) {
        console.error('Failed to broadcast verification update:', error);
        // Don't throw - broadcasting is non-critical
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
            if (status === 'CHANNEL_ERROR') {
                callbacks.onError?.(new Error('Failed to subscribe to verification channel'));
            }
        });

    return channel;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { RealtimeChannel };

/**
 * Escalation Types
 *
 * Type definitions for the escalation system that handles
 * verifications requiring human review.
 */

import type { ParadigmResult } from '@/lib/verification/types';

// =============================================================================
// Escalation Reason
// =============================================================================

export type EscalationReason =
  | 'low_confidence'
  | 'conflicting_results'
  | 'model_failure'
  | 'timeout'
  | 'manual_review_requested';

// =============================================================================
// Escalation Status (derived from fields, not stored)
// =============================================================================

export type EscalationStatus = 'pending' | 'in_review' | 'resolved' | 'dismissed';

// =============================================================================
// Human Verdict
// =============================================================================

export type HumanVerdict = 'true' | 'false' | 'uncertain';

// =============================================================================
// Escalation Details (stored as JSONB)
// =============================================================================

export interface EscalationDetails {
  confidence: number;
  paradigmCount: number;
  verdictCounts: {
    true: number;
    false: number;
    uncertain: number;
  };
  disagreementRatio: number;
  errors?: Array<{
    paradigm: string;
    error: string;
  }>;
}

// =============================================================================
// Escalation Context (input for creating escalations)
// =============================================================================

export interface EscalationContext {
  verificationId: string;
  confidence: number;
  paradigmResults: ParadigmResult[];
  timedOut?: boolean;
}

// =============================================================================
// Escalation With Relations (for API responses)
// =============================================================================

export interface EscalationWithVerification {
  id: string;
  verificationId: string;
  reason: EscalationReason;
  details: EscalationDetails | null;
  priority: number;
  status: EscalationStatus;
  deadline: string | null;
  resolvedAt: string | null;
  resolvedBy: {
    id: string;
    name: string | null;
  } | null;
  resolution: string | null;
  humanVerdict: HumanVerdict | null;
  createdAt: string;
  verification: {
    id: string;
    content: string;
    verdict: string | null;
    confidence: number | null;
    paradigmResults?: Array<{
      paradigm: string;
      verdict: string | null;
      confidence: number | null;
      reasoning: string | null;
    }>;
  };
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface ListEscalationsResponse {
  escalations: EscalationWithVerification[];
  stats: {
    pending: number;
    inReview: number;
    resolved: number;
    dismissed: number;
  };
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ResolveEscalationRequest {
  action: 'resolve' | 'dismiss';
  humanVerdict?: HumanVerdict;
  resolution?: string;
}

export interface ResolveEscalationResponse {
  id: string;
  status: EscalationStatus;
  resolvedAt: string;
  humanVerdict: HumanVerdict | null;
  resolution: string | null;
}

// =============================================================================
// Reason Display Mapping
// =============================================================================

export const REASON_DISPLAY_MAP: Record<EscalationReason, string> = {
  low_confidence: 'Low Confidence Score',
  conflicting_results: 'Conflicting Paradigm Results',
  model_failure: 'Model Error or Failure',
  timeout: 'Processing Timeout',
  manual_review_requested: 'Manual Review Requested',
};

/**
 * Escalation Service
 *
 * Business logic for creating and managing escalations.
 * Escalations are created when verifications require human review.
 */

import { db } from '@/utils/db/db';
import { escalationsTable, type InsertEscalation } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import type {
  EscalationContext,
  EscalationDetails,
  EscalationReason,
  EscalationStatus,
  HumanVerdict,
} from './types';
import { sendEscalationAlert } from '@/lib/email/send-escalation-alert';

// =============================================================================
// Priority Thresholds
// =============================================================================

const PRIORITY_THRESHOLDS = {
  HIGH: 0.3, // confidence < 0.3 = high priority (3)
  MEDIUM: 0.5, // confidence < 0.5 = medium priority (2)
  // confidence >= 0.5 = low priority (1)
};

// =============================================================================
// Determine Escalation Reason
// =============================================================================

/**
 * Determines the escalation reason based on verification context.
 * Priority order: model_failure > timeout > conflicting_results > low_confidence
 */
export function determineEscalationReason(context: EscalationContext): EscalationReason {
  const { paradigmResults, confidence, timedOut } = context;

  // Check for model errors first (highest priority issue)
  const hasErrors = paradigmResults.some((r) => r.error);
  if (hasErrors) {
    return 'model_failure';
  }

  // Check for timeout
  if (timedOut) {
    return 'timeout';
  }

  // Check for conflicting results (high disagreement)
  const trueCount = paradigmResults.filter((r) => r.verdict === 'true').length;
  const falseCount = paradigmResults.filter((r) => r.verdict === 'false').length;
  const validCount = paradigmResults.filter((r) => r.verdict !== null).length;

  const disagreementRatio = validCount > 0 ? Math.min(trueCount, falseCount) / validCount : 0;

  if (disagreementRatio > 0.3) {
    return 'conflicting_results';
  }

  // Default to low confidence
  return 'low_confidence';
}

// =============================================================================
// Calculate Priority
// =============================================================================

/**
 * Calculates escalation priority (1-3) based on confidence level.
 * Lower confidence = higher priority.
 */
export function calculatePriority(context: EscalationContext): 1 | 2 | 3 {
  const { confidence, paradigmResults } = context;

  // Model errors always get high priority
  const hasErrors = paradigmResults.some((r) => r.error);
  if (hasErrors) {
    return 3;
  }

  // Priority based on confidence
  if (confidence < PRIORITY_THRESHOLDS.HIGH) {
    return 3; // High priority
  }

  if (confidence < PRIORITY_THRESHOLDS.MEDIUM) {
    return 2; // Medium priority
  }

  return 1; // Low priority
}

// =============================================================================
// Build Escalation Details
// =============================================================================

/**
 * Builds the JSONB details object for an escalation.
 */
export function buildEscalationDetails(context: EscalationContext): EscalationDetails {
  const { confidence, paradigmResults } = context;

  const trueCount = paradigmResults.filter((r) => r.verdict === 'true').length;
  const falseCount = paradigmResults.filter((r) => r.verdict === 'false').length;
  const uncertainCount = paradigmResults.filter((r) => r.verdict === 'uncertain').length;
  const validCount = paradigmResults.filter((r) => r.verdict !== null).length;

  const disagreementRatio = validCount > 0 ? Math.min(trueCount, falseCount) / validCount : 0;

  const errors = paradigmResults
    .filter((r) => r.error)
    .map((r) => ({
      paradigm: r.paradigm,
      error: r.error || 'Unknown error',
    }));

  return {
    confidence,
    paradigmCount: paradigmResults.length,
    verdictCounts: {
      true: trueCount,
      false: falseCount,
      uncertain: uncertainCount,
    },
    disagreementRatio,
    ...(errors.length > 0 && { errors }),
  };
}

// =============================================================================
// Calculate Deadline
// =============================================================================

/**
 * Calculates optional deadline based on priority.
 * High priority escalations get shorter deadlines.
 */
export function calculateDeadline(priority: 1 | 2 | 3): Date | null {
  const now = new Date();

  switch (priority) {
    case 3: // High priority - 4 hours
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    case 2: // Medium priority - 24 hours
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    default: // Low priority - no deadline
      return null;
  }
}

// =============================================================================
// Create Escalation
// =============================================================================

/**
 * Creates an escalation record for a verification.
 * This should be called when a verification's decision is 'escalate'.
 */
export async function createEscalation(
  context: EscalationContext
): Promise<InsertEscalation | null> {
  const { verificationId, orgId, organizationName, content } = context;

  // Check if escalation already exists (idempotency)
  const existing = await db.query.escalationsTable.findFirst({
    where: eq(escalationsTable.verificationId, verificationId),
  });

  if (existing) {
    // Return existing escalation instead of creating duplicate
    return existing;
  }

  const reason = determineEscalationReason(context);
  const priority = calculatePriority(context);
  const details = buildEscalationDetails(context);
  const deadline = calculateDeadline(priority);

  const [escalation] = await db
    .insert(escalationsTable)
    .values({
      verificationId,
      reason,
      priority,
      details,
      deadline,
    })
    .returning();

  // Send email alerts to org members (fire-and-forget)
  if (escalation && orgId && organizationName) {
    const dashboardUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://app.verifyai.dev';

    sendEscalationAlert({
      escalation: {
        id: escalation.id,
        orgId,
        reason,
        priority,
        content: content || 'Content not available',
        deadline,
      },
      organizationName,
      dashboardUrl,
    }).catch((err) => {
      // Log but don't fail the escalation creation
      console.error('Failed to send escalation alerts:', err);
    });
  }

  return escalation;
}

// =============================================================================
// Get Escalation Status
// =============================================================================

/**
 * Derives escalation status from database fields.
 * Status is not stored directly - it's computed from resolvedAt and humanVerdict.
 */
export function getEscalationStatus(
  resolvedAt: Date | null,
  humanVerdict: string | null
): EscalationStatus {
  if (!resolvedAt) {
    return 'pending';
  }

  if (humanVerdict) {
    return 'resolved';
  }

  return 'dismissed';
}

// =============================================================================
// Resolve Escalation
// =============================================================================

/**
 * Resolves an escalation with a human verdict.
 */
export async function resolveEscalation(
  escalationId: string,
  userId: string,
  humanVerdict: HumanVerdict,
  resolution?: string
): Promise<InsertEscalation | null> {
  const [updated] = await db
    .update(escalationsTable)
    .set({
      resolvedAt: new Date(),
      resolvedBy: userId,
      humanVerdict,
      resolution: resolution || null,
    })
    .where(eq(escalationsTable.id, escalationId))
    .returning();

  return updated || null;
}

// =============================================================================
// Dismiss Escalation
// =============================================================================

/**
 * Dismisses an escalation as a false positive (no verdict provided).
 */
export async function dismissEscalation(
  escalationId: string,
  userId: string,
  resolution?: string
): Promise<InsertEscalation | null> {
  const [updated] = await db
    .update(escalationsTable)
    .set({
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolution: resolution || 'Dismissed as false positive',
    })
    .where(eq(escalationsTable.id, escalationId))
    .returning();

  return updated || null;
}

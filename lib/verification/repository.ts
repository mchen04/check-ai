/**
 * Verification Repository
 * Database operations for verifications
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import {
  verificationsTable,
  paradigmResultsTable,
  usageTable,
} from '@/utils/db/schema';
import { MethodsConfig, ParadigmResult, Verdict, Decision } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateVerificationInput {
  orgId: string;
  content: string;
  context?: Record<string, unknown> | null;
  methods: MethodsConfig;
  idempotencyKey?: string | null;
  expiresAt?: Date | null;
}

export interface VerificationRecord {
  id: string;
  orgId: string;
  content: string;
  context: Record<string, unknown> | null;
  methodsConfig: MethodsConfig;
  status: string;
  finalVerdict: Verdict | null;
  confidenceScore: string | null;
  decision: Decision | null;
  reasoning: string | null;
  processingTimeMs: number | null;
  costCents: number | null;
  idempotencyKey: string | null;
  createdAt: Date;
  completedAt: Date | null;
  expiresAt: Date | null;
}

export interface UpdateVerificationInput {
  status: 'processing' | 'completed' | 'failed' | 'escalated';
  finalVerdict?: Verdict | null;
  confidenceScore?: string;
  decision?: Decision;
  reasoning?: string;
  processingTimeMs?: number;
  costCents?: number;
  completedAt?: Date;
}

export interface CachedVerificationResult {
  id: string;
  status: string;
  verdict: Verdict | null;
  confidence: number | null;
  decision: Decision | null;
  paradigmResults: Array<{
    paradigm: string;
    verdict: Verdict | null;
    confidence: string | null;
    reasoning: string | null;
    processingTimeMs: number | null;
    error: string | null;
  }>;
  processingTimeMs: number | null;
  costCents: number | null;
}

// =============================================================================
// REPOSITORY FUNCTIONS
// =============================================================================

/**
 * Create a new verification record
 */
export async function createVerification(
  input: CreateVerificationInput
): Promise<VerificationRecord> {
  const [verification] = await db
    .insert(verificationsTable)
    .values({
      orgId: input.orgId,
      idempotencyKey: input.idempotencyKey || null,
      content: input.content,
      context: input.context || null,
      methodsConfig: input.methods,
      status: 'processing',
      expiresAt: input.expiresAt || null,
    })
    .returning();

  return verification as VerificationRecord;
}

/**
 * Find verification by idempotency key
 */
export async function findByIdempotencyKey(
  orgId: string,
  idempotencyKey: string
): Promise<CachedVerificationResult | null> {
  const existing = await db.query.verificationsTable.findFirst({
    where: and(
      eq(verificationsTable.orgId, orgId),
      eq(verificationsTable.idempotencyKey, idempotencyKey)
    ),
    with: {
      paradigmResults: true,
    },
  });

  if (!existing) {
    return null;
  }

  return {
    id: existing.id,
    status: existing.status,
    verdict: existing.finalVerdict as Verdict | null,
    confidence: existing.confidenceScore ? parseFloat(existing.confidenceScore) : null,
    decision: existing.decision as Decision | null,
    paradigmResults: existing.paradigmResults.map((pr) => ({
      paradigm: pr.paradigmType,
      verdict: pr.verdict as Verdict | null,
      confidence: pr.confidence,
      reasoning: pr.reasoning,
      processingTimeMs: pr.processingTimeMs,
      error: pr.errorMessage,
    })),
    processingTimeMs: existing.processingTimeMs,
    costCents: existing.costCents,
  };
}

/**
 * Update verification record
 */
export async function updateVerification(
  id: string,
  updates: UpdateVerificationInput
): Promise<void> {
  await db
    .update(verificationsTable)
    .set({
      status: updates.status,
      finalVerdict: updates.finalVerdict,
      confidenceScore: updates.confidenceScore,
      decision: updates.decision,
      reasoning: updates.reasoning,
      processingTimeMs: updates.processingTimeMs,
      costCents: updates.costCents,
      completedAt: updates.completedAt,
    })
    .where(eq(verificationsTable.id, id));
}

/**
 * Mark verification as failed
 */
export async function markVerificationFailed(id: string): Promise<void> {
  await db
    .update(verificationsTable)
    .set({
      status: 'failed',
      completedAt: new Date(),
    })
    .where(eq(verificationsTable.id, id));
}

/**
 * Save verification result with paradigm results and usage in a transaction
 */
export async function saveVerificationResult(
  verificationId: string,
  orgId: string,
  result: {
    status: 'completed' | 'escalated';
    verdict: Verdict | null;
    confidence: number;
    decision: Decision;
    reasoning: string;
    processingTimeMs: number;
    costCents: number;
    paradigmResults: ParadigmResult[];
    totalInputTokens: number;
    totalOutputTokens: number;
  }
): Promise<void> {
  await db.transaction(async (tx) => {
    // Update verification record
    await tx
      .update(verificationsTable)
      .set({
        status: result.status,
        finalVerdict: result.verdict,
        confidenceScore: result.confidence.toFixed(4),
        decision: result.decision,
        reasoning: result.reasoning,
        processingTimeMs: result.processingTimeMs,
        costCents: Math.round(result.costCents),
        completedAt: new Date(),
      })
      .where(eq(verificationsTable.id, verificationId));

    // Store paradigm results
    if (result.paradigmResults.length > 0) {
      await tx.insert(paradigmResultsTable).values(
        result.paradigmResults.map((pr) => ({
          verificationId,
          paradigmType: pr.paradigm,
          weight: pr.weight.toFixed(2),
          provider: pr.provider,
          model: pr.model,
          verdict: pr.verdict,
          confidence: pr.confidence.toFixed(4),
          reasoning: pr.reasoning,
          tokenUsage: pr.tokenUsage || null,
          processingTimeMs: pr.processingTimeMs,
          costCents: Math.round(pr.costCents),
          errorMessage: pr.error || null,
        }))
      );
    }

    // Track usage
    await tx.insert(usageTable).values({
      orgId,
      verificationId,
      provider: 'mixed',
      model: 'mixed',
      inputTokens: result.totalInputTokens,
      outputTokens: result.totalOutputTokens,
      costCents: Math.round(result.costCents),
    });
  });
}

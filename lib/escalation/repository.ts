/**
 * Escalation Repository
 * Database operations for escalation management
 */

import { eq, desc, and, isNull, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { escalationsTable, verificationsTable } from '@/utils/db/schema';
import type {
  EscalationReason,
  EscalationStatus,
  HumanVerdict,
  EscalationDetails,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface EscalationRecord {
  id: string;
  verificationId: string;
  reason: EscalationReason;
  details: EscalationDetails | null;
  priority: number;
  deadline: Date | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolution: string | null;
  humanVerdict: HumanVerdict | null;
  createdAt: Date;
}

export interface EscalationQueryResult {
  id: string;
  verificationId: string;
  reason: EscalationReason;
  details: EscalationDetails | null;
  priority: number;
  deadline: Date | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolution: string | null;
  humanVerdict: HumanVerdict | null;
  createdAt: Date;
  verificationContent: string | null;
  verificationVerdict: string | null;
  verificationConfidence: string | null;
}

export interface CreateEscalationInput {
  verificationId: string;
  reason: EscalationReason;
  details: EscalationDetails | null;
  priority: number;
  deadline?: Date | null;
}

export interface EscalationStats {
  total: number;
  pending: number;
  resolved: number;
  dismissed: number;
}

export interface ListEscalationsOptions {
  orgId: string;
  status?: 'pending' | 'resolved' | 'dismissed';
  priority?: number;
  limit?: number;
  offset?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get escalation status from database fields
 */
export function getEscalationStatus(
  resolvedAt: Date | null,
  humanVerdict: HumanVerdict | null
): EscalationStatus {
  if (!resolvedAt) return 'pending';
  if (humanVerdict) return 'resolved';
  return 'dismissed';
}

// =============================================================================
// REPOSITORY FUNCTIONS
// =============================================================================

/**
 * List escalations for an organization with filtering
 */
export async function listEscalations(
  options: ListEscalationsOptions
): Promise<{ escalations: EscalationQueryResult[]; hasMore: boolean }> {
  const { orgId, status, priority, limit = 20, offset = 0 } = options;

  // Build conditions array - clearer than chained .where() calls
  const conditions = [eq(verificationsTable.orgId, orgId)];

  // Apply status filter
  if (status === 'pending') {
    conditions.push(isNull(escalationsTable.resolvedAt));
  } else if (status === 'resolved') {
    conditions.push(isNotNull(escalationsTable.resolvedAt));
    conditions.push(isNotNull(escalationsTable.humanVerdict));
  } else if (status === 'dismissed') {
    conditions.push(isNotNull(escalationsTable.resolvedAt));
    conditions.push(isNull(escalationsTable.humanVerdict));
  }

  // Apply priority filter
  if (priority !== undefined) {
    conditions.push(eq(escalationsTable.priority, priority));
  }

  const escalations = await db
    .select({
      id: escalationsTable.id,
      verificationId: escalationsTable.verificationId,
      reason: escalationsTable.reason,
      details: escalationsTable.details,
      priority: escalationsTable.priority,
      deadline: escalationsTable.deadline,
      resolvedAt: escalationsTable.resolvedAt,
      resolvedBy: escalationsTable.resolvedBy,
      resolution: escalationsTable.resolution,
      humanVerdict: escalationsTable.humanVerdict,
      createdAt: escalationsTable.createdAt,
      verificationContent: verificationsTable.content,
      verificationVerdict: verificationsTable.finalVerdict,
      verificationConfidence: verificationsTable.confidenceScore,
    })
    .from(escalationsTable)
    .innerJoin(
      verificationsTable,
      eq(escalationsTable.verificationId, verificationsTable.id)
    )
    .where(and(...conditions))
    .orderBy(desc(escalationsTable.priority), desc(escalationsTable.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = escalations.length > limit;
  const results = hasMore ? escalations.slice(0, limit) : escalations;

  return {
    escalations: results as EscalationQueryResult[],
    hasMore,
  };
}

/**
 * Get escalation statistics for an organization
 */
export async function getEscalationStats(orgId: string): Promise<EscalationStats> {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      pending: sql<number>`count(*) filter (where ${escalationsTable.resolvedAt} is null)`,
      resolved: sql<number>`count(*) filter (where ${escalationsTable.resolvedAt} is not null and ${escalationsTable.humanVerdict} is not null)`,
      dismissed: sql<number>`count(*) filter (where ${escalationsTable.resolvedAt} is not null and ${escalationsTable.humanVerdict} is null)`,
    })
    .from(escalationsTable)
    .innerJoin(
      verificationsTable,
      eq(escalationsTable.verificationId, verificationsTable.id)
    )
    .where(eq(verificationsTable.orgId, orgId));

  return {
    total: Number(stats?.total || 0),
    pending: Number(stats?.pending || 0),
    resolved: Number(stats?.resolved || 0),
    dismissed: Number(stats?.dismissed || 0),
  };
}

/**
 * Get escalation by ID
 */
export async function getEscalation(id: string): Promise<EscalationRecord | null> {
  const [escalation] = await db
    .select()
    .from(escalationsTable)
    .where(eq(escalationsTable.id, id))
    .limit(1);

  return escalation as EscalationRecord | null;
}

/**
 * Get escalation by ID with org check
 */
export async function getEscalationByIdAndOrg(
  id: string,
  orgId: string
): Promise<EscalationQueryResult | null> {
  const [escalation] = await db
    .select({
      id: escalationsTable.id,
      verificationId: escalationsTable.verificationId,
      reason: escalationsTable.reason,
      details: escalationsTable.details,
      priority: escalationsTable.priority,
      deadline: escalationsTable.deadline,
      resolvedAt: escalationsTable.resolvedAt,
      resolvedBy: escalationsTable.resolvedBy,
      resolution: escalationsTable.resolution,
      humanVerdict: escalationsTable.humanVerdict,
      createdAt: escalationsTable.createdAt,
      verificationContent: verificationsTable.content,
      verificationVerdict: verificationsTable.finalVerdict,
      verificationConfidence: verificationsTable.confidenceScore,
    })
    .from(escalationsTable)
    .innerJoin(
      verificationsTable,
      eq(escalationsTable.verificationId, verificationsTable.id)
    )
    .where(
      and(eq(escalationsTable.id, id), eq(verificationsTable.orgId, orgId))
    )
    .limit(1);

  return escalation as EscalationQueryResult | null;
}

/**
 * Create a new escalation
 */
export async function createEscalation(
  input: CreateEscalationInput
): Promise<EscalationRecord> {
  const [escalation] = await db
    .insert(escalationsTable)
    .values({
      verificationId: input.verificationId,
      reason: input.reason,
      details: input.details,
      priority: input.priority,
      deadline: input.deadline || null,
    })
    .returning();

  return escalation as EscalationRecord;
}

/**
 * Resolve an escalation
 */
export async function resolveEscalation(
  id: string,
  resolvedBy: string,
  humanVerdict: HumanVerdict,
  resolution?: string
): Promise<EscalationRecord> {
  const [escalation] = await db
    .update(escalationsTable)
    .set({
      resolvedAt: new Date(),
      resolvedBy,
      humanVerdict,
      resolution: resolution || null,
    })
    .where(eq(escalationsTable.id, id))
    .returning();

  return escalation as EscalationRecord;
}

/**
 * Dismiss an escalation (resolve without verdict)
 */
export async function dismissEscalation(
  id: string,
  resolvedBy: string,
  resolution?: string
): Promise<EscalationRecord> {
  const [escalation] = await db
    .update(escalationsTable)
    .set({
      resolvedAt: new Date(),
      resolvedBy,
      humanVerdict: null,
      resolution: resolution || null,
    })
    .where(eq(escalationsTable.id, id))
    .returning();

  return escalation as EscalationRecord;
}

/**
 * Find escalation by verification ID
 */
export async function findByVerificationId(
  verificationId: string
): Promise<EscalationRecord | null> {
  const [escalation] = await db
    .select()
    .from(escalationsTable)
    .where(eq(escalationsTable.verificationId, verificationId))
    .limit(1);

  return escalation as EscalationRecord | null;
}

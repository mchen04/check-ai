import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { organizationsTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';

// =============================================================================
// SCHEMAS
// =============================================================================

const OrgUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  defaultVerificationMethod: z
    .enum(['semantic', 'reasoning', 'tool', 'biprm', 'ensemble', 'entropy', 'formal'])
    .optional(),
  autoEscalateThreshold: z.number().min(0).max(1).optional(),
  cacheEnabled: z.boolean().optional(),
  storeVerificationContent: z.boolean().optional(),
  // Data retention settings
  dataRetentionEnabled: z.boolean().optional(),
  verificationRetentionDays: z.number().min(7).max(365).optional(),
  batchRetentionDays: z.number().min(7).max(365).optional(),
});

// =============================================================================
// GET - Get organization settings
// =============================================================================

export const GET = withDashboardAuth(async (req: DashboardRequest) => {
  const { context } = req;

  const [org] = await db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      slug: organizationsTable.slug,
      planType: organizationsTable.planType,
      defaultVerificationMethod: organizationsTable.defaultVerificationMethod,
      autoEscalateThreshold: organizationsTable.autoEscalateThreshold,
      cacheEnabled: organizationsTable.cacheEnabled,
      storeVerificationContent: organizationsTable.storeVerificationContent,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, context.orgId))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...org,
    autoEscalateThreshold: parseFloat(org.autoEscalateThreshold || '0.50'),
    canEdit: context.role === 'owner' || context.role === 'admin',
  });
}, { permission: 'settings:view' });

// =============================================================================
// PATCH - Update organization settings
// =============================================================================

export const PATCH = withDashboardAuth(async (req: DashboardRequest) => {
  const { context } = req;

  const body = await req.json();
  const parsed = OrgUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name;
  }
  if (parsed.data.defaultVerificationMethod !== undefined) {
    updates.defaultVerificationMethod = parsed.data.defaultVerificationMethod;
  }
  if (parsed.data.autoEscalateThreshold !== undefined) {
    updates.autoEscalateThreshold = parsed.data.autoEscalateThreshold.toFixed(2);
  }
  if (parsed.data.cacheEnabled !== undefined) {
    updates.cacheEnabled = parsed.data.cacheEnabled;
  }
  if (parsed.data.storeVerificationContent !== undefined) {
    updates.storeVerificationContent = parsed.data.storeVerificationContent;
  }
  if (parsed.data.dataRetentionEnabled !== undefined) {
    updates.dataRetentionEnabled = parsed.data.dataRetentionEnabled;
  }
  if (parsed.data.verificationRetentionDays !== undefined) {
    updates.verificationRetentionDays = parsed.data.verificationRetentionDays;
  }
  if (parsed.data.batchRetentionDays !== undefined) {
    updates.batchRetentionDays = parsed.data.batchRetentionDays;
  }

  const [updated] = await db
    .update(organizationsTable)
    .set(updates)
    .where(eq(organizationsTable.id, context.orgId))
    .returning({
      id: organizationsTable.id,
      name: organizationsTable.name,
      defaultVerificationMethod: organizationsTable.defaultVerificationMethod,
      autoEscalateThreshold: organizationsTable.autoEscalateThreshold,
      cacheEnabled: organizationsTable.cacheEnabled,
      storeVerificationContent: organizationsTable.storeVerificationContent,
      dataRetentionEnabled: organizationsTable.dataRetentionEnabled,
      verificationRetentionDays: organizationsTable.verificationRetentionDays,
      batchRetentionDays: organizationsTable.batchRetentionDays,
    });

  return NextResponse.json({
    success: true,
    ...updated,
    autoEscalateThreshold: parseFloat(updated.autoEscalateThreshold || '0.50'),
  });
}, { permission: 'settings:update_org' });

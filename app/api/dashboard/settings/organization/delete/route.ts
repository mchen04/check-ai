import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { organizationsTable } from '@/utils/db/schema';
import { createClient } from '@/utils/supabase/server';
import { withDashboardAuth, DashboardRequest, parseAndValidate } from '@/lib/api';

// =============================================================================
// DELETE - Delete organization (owner only)
// =============================================================================

const DeleteOrgSchema = z.object({
  confirmation: z.literal('delete my organization'),
});

async function handleDelete(req: DashboardRequest) {
  const { context } = req;

  // Parse and validate using shared helper
  const result = await parseAndValidate(req, DeleteOrgSchema);
  if (!result.success) return result.error;

  // Delete organization (cascade will handle related records)
  await db.delete(organizationsTable).where(eq(organizationsTable.id, context.orgId));

  // Sign out the user
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.json({
    success: true,
    message: 'Organization deleted successfully',
  });
}

export const DELETE = withDashboardAuth(handleDelete, { permission: 'org:delete' });

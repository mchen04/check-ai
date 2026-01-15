import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { organizationsTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';
import { withDashboardAuth, DashboardRequest } from '@/lib/api/dashboard-middleware';

// =============================================================================
// DELETE - Delete organization (owner only)
// =============================================================================

const DeleteOrgSchema = z.object({
  confirmation: z.literal('delete my organization'),
});

async function handleDelete(req: DashboardRequest) {
  const { context } = req;

  const body = await req.json();
  const parsed = DeleteOrgSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please type the confirmation phrase exactly' },
      { status: 400 }
    );
  }

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

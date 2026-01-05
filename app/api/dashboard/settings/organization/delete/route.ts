import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { organizationsTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';

// =============================================================================
// DELETE - Delete organization (owner only)
// =============================================================================

const DeleteOrgSchema = z.object({
  confirmation: z.literal('delete my organization'),
});

export async function DELETE(req: NextRequest) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owner can delete organization
    const { allowed, reason } = checkPermission(context, 'org:delete');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

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
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';

// =============================================================================
// PATCH - Update user profile (name via Supabase Auth metadata)
// =============================================================================

const ProfileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

export async function PATCH(req: NextRequest) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'settings:update_profile');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const body = await req.json();
    const parsed = ProfileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    // Update user metadata in Supabase Auth
    const supabase = await createClient();
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: name },
    });

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      name: data.user?.user_metadata?.full_name || name,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { withDashboardAuth, type DashboardRequest } from '@/lib/api/dashboard-middleware';
import { parseAndValidate, errorResponse } from '@/lib/api/validation';
import { createLogger } from '@/lib/logger';

const log = createLogger('Profile');

// =============================================================================
// PATCH - Update user profile (name via Supabase Auth metadata)
// =============================================================================

const ProfileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

async function handler(req: DashboardRequest) {
  const result = await parseAndValidate(req, ProfileUpdateSchema);
  if (!result.success) return result.error;

  const { name } = result.data;

  // Update user metadata in Supabase Auth
  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({
    data: { full_name: name },
  });

  if (error) {
    log.error({ err: error }, 'Failed to update user profile');
    return errorResponse.internalError('Failed to update profile');
  }

  return NextResponse.json({
    success: true,
    name: data.user?.user_metadata?.full_name || name,
  });
}

export const PATCH = withDashboardAuth(handler, { permission: 'settings:update_profile' });

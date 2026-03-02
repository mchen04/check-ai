/**
 * Organization Creation Helper
 * Handles auto-creating organizations for new users
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '@/utils/db/db';
import { organizationsTable, orgMembersTable } from '@/utils/db/schema';

/**
 * Generate a unique slug from user name or email
 */
function generateSlug(name: string | null, email: string): string {
  const base = name
    ? name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)
    : email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);

  // Add 6 random characters to ensure uniqueness
  const suffix = uuidv4().slice(0, 6);
  return `${base}-${suffix}`;
}

/**
 * Generate a default organization name from user name
 */
function generateOrgName(name: string | null): string {
  if (name && name.trim()) {
    return `${name.trim()}'s Organization`;
  }
  return 'My Organization';
}

export interface CreateOrgResult {
  orgId: string;
  slug: string;
}

/**
 * Creates a new organization and adds the user as owner
 * Called during signup to give every user a default organization
 */
export async function createDefaultOrganization(
  userId: string,
  userName: string | null,
  userEmail: string,
  stripeCustomerId?: string
): Promise<CreateOrgResult> {
  const slug = generateSlug(userName, userEmail);
  const orgName = generateOrgName(userName);

  // Create organization with Stripe customer ID for billing
  const [org] = await db
    .insert(organizationsTable)
    .values({
      name: orgName,
      slug,
      planType: 'free',
      verificationsLimit: 1000, // Free tier default
      verificationRetentionDays: 7, // Free tier retention
      stripeCustomerId: stripeCustomerId || null,
    })
    .returning({ id: organizationsTable.id, slug: organizationsTable.slug });

  // Add user as owner
  await db.insert(orgMembersTable).values({
    orgId: org.id,
    userId,
    role: 'owner',
  });

  return {
    orgId: org.id,
    slug: org.slug,
  };
}

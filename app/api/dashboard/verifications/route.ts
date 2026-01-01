/**
 * GET /api/dashboard/verifications
 * Fetch verification history for dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { verificationsTable, orgMembersTable } from '@/utils/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const orgMember = await db.query.orgMembersTable.findFirst({
      where: eq(orgMembersTable.userId, user.id),
      with: {
        organization: true,
      },
    });

    if (!orgMember) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    // Fetch verifications
    const verifications = await db
      .select({
        id: verificationsTable.id,
        content: verificationsTable.content,
        status: verificationsTable.status,
        verdict: verificationsTable.finalVerdict,
        confidence: verificationsTable.confidenceScore,
        processingTimeMs: verificationsTable.processingTimeMs,
        costCents: verificationsTable.costCents,
        createdAt: verificationsTable.createdAt,
        completedAt: verificationsTable.completedAt,
      })
      .from(verificationsTable)
      .where(eq(verificationsTable.orgId, orgMember.orgId))
      .orderBy(desc(verificationsTable.createdAt))
      .limit(limit + 1) // Fetch one extra to check if there's more
      .offset(offset);

    // Check if there are more results
    const hasMore = verifications.length > limit;
    const results = hasMore ? verifications.slice(0, limit) : verifications;

    // Format response
    const formattedResults = results.map((v) => ({
      id: v.id,
      content: v.content,
      status: v.status,
      verdict: v.verdict,
      confidence: v.confidence ? parseFloat(v.confidence) : null,
      processingTimeMs: v.processingTimeMs,
      costCents: v.costCents ?? null,
      createdAt: v.createdAt?.toISOString(),
      completedAt: v.completedAt?.toISOString() || null,
    }));

    return NextResponse.json({
      verifications: formattedResults,
      page,
      limit,
      hasMore,
    });
  } catch (error) {
    console.error('Failed to fetch verifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

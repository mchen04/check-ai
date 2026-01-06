import { NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext } from '@/lib/rbac/get-user-org';
import { getAnalyticsData, getDateRange } from '@/lib/analytics/queries';
import { getAdvancedAnalyticsData } from '@/lib/analytics/advanced-queries';
import type { TimeRange } from '@/lib/analytics/types';

export async function GET(req: NextRequest) {
  try {
    const context = await getUserOrgContext();

    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = (searchParams.get('range') || '7d') as TimeRange;
    const includeAdvanced = searchParams.get('advanced') === 'true';

    // Validate range parameter
    if (!['7d', '30d', '90d'].includes(range)) {
      return NextResponse.json(
        { error: 'Invalid range parameter. Must be 7d, 30d, or 90d' },
        { status: 400 }
      );
    }

    // Fetch basic analytics
    const data = await getAnalyticsData(context.orgId, range);
    const { startDate, endDate } = getDateRange(range);

    // Optionally include advanced analytics
    let advancedData = null;
    if (includeAdvanced) {
      advancedData = await getAdvancedAnalyticsData(context.orgId, range);
    }

    return NextResponse.json({
      success: true,
      data,
      ...(advancedData && { advanced: advancedData }),
      meta: {
        range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includesAdvanced: includeAdvanced,
      },
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

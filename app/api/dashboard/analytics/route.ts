import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import {
  getAnalyticsData,
  getDateRange,
  getAdvancedAnalyticsData,
  type TimeRange,
} from '@/lib/analytics';
import {
  withDashboardRead,
  type DashboardRequest,
  formatRequiredDateToISO,
  errorResponse,
} from '@/lib/api';

// Cache advanced analytics for 5 minutes — these queries are the most expensive
// in the app and the data changes slowly
const getCachedAdvancedAnalytics = unstable_cache(
  async (orgId: string, range: TimeRange) => {
    return getAdvancedAnalyticsData(orgId, range);
  },
  ['advanced-analytics'],
  { revalidate: 300 }
);

// Cache basic analytics for 60 seconds
const getCachedAnalytics = unstable_cache(
  async (orgId: string, range: TimeRange) => {
    return getAnalyticsData(orgId, range);
  },
  ['basic-analytics'],
  { revalidate: 60 }
);

async function handler(req: DashboardRequest) {
  const { context } = req;

  const { searchParams } = new URL(req.url);
  const range = (searchParams.get('range') || '7d') as TimeRange;
  const includeAdvanced = searchParams.get('advanced') === 'true';

  // Validate range parameter
  if (!['7d', '30d', '90d'].includes(range)) {
    return errorResponse.badRequest('Invalid range parameter. Must be 7d, 30d, or 90d');
  }

  // Fetch basic analytics (cached 60s)
  const data = await getCachedAnalytics(context.orgId, range);
  const { startDate, endDate } = getDateRange(range);

  // Optionally include advanced analytics (cached 5min)
  let advancedData = null;
  if (includeAdvanced) {
    advancedData = await getCachedAdvancedAnalytics(context.orgId, range);
  }

  return NextResponse.json({
    success: true,
    data,
    ...(advancedData && { advanced: advancedData }),
    meta: {
      range,
      startDate: formatRequiredDateToISO(startDate),
      endDate: formatRequiredDateToISO(endDate),
      includesAdvanced: includeAdvanced,
    },
  });
}

export const GET = withDashboardRead(handler);

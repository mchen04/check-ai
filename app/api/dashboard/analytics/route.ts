import { NextResponse } from 'next/server';
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

async function handler(req: DashboardRequest) {
  const { context } = req;

  const { searchParams } = new URL(req.url);
  const range = (searchParams.get('range') || '7d') as TimeRange;
  const includeAdvanced = searchParams.get('advanced') === 'true';

  // Validate range parameter
  if (!['7d', '30d', '90d'].includes(range)) {
    return errorResponse.badRequest('Invalid range parameter. Must be 7d, 30d, or 90d');
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
      startDate: formatRequiredDateToISO(startDate),
      endDate: formatRequiredDateToISO(endDate),
      includesAdvanced: includeAdvanced,
    },
  });
}

export const GET = withDashboardRead(handler);

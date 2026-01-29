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

  const { startDate, endDate } = getDateRange(range);

  // Fetch basic and advanced analytics in parallel (async-parallel optimization)
  const [data, advancedData] = await Promise.all([
    getAnalyticsData(context.orgId, range),
    includeAdvanced ? getAdvancedAnalyticsData(context.orgId, range) : Promise.resolve(null),
  ]);

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

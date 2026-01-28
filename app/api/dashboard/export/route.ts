/**
 * POST /api/dashboard/export - Server-side export of verification data
 *
 * Exports verification data in CSV or JSON format with optional filtering.
 * Supports date range filtering and paradigm results inclusion.
 *
 * Security: Requires authenticated user with organization access
 */

import { NextResponse } from 'next/server';
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { verificationsTable, paradigmResultsTable } from '@/utils/db/schema';
import {
  withDashboardAuth,
  type DashboardRequest,
  parseDecimal,
  formatRequiredDateToISO,
  formatDateToISO,
  formatDateForFilename,
  parseAndValidate,
} from '@/lib/api';
import {
  ExportRequestSchema,
  VerificationExport,
} from '@/lib/export/types';
import { EXPORT_LIMITS } from '@/lib/constants';

/**
 * Converts verification records to CSV format
 */
function convertToCSV(
  data: VerificationExport[],
  includeParadigmResults: boolean
): string {
  if (data.length === 0) {
    return '';
  }

  // Base headers
  const baseHeaders = [
    'id',
    'content',
    'verdict',
    'confidence',
    'decision',
    'status',
    'processing_time_ms',
    'cost_cents',
    'created_at',
    'completed_at',
  ];

  // Add paradigm result headers if included
  const headers = includeParadigmResults
    ? [...baseHeaders, 'paradigm_results']
    : baseHeaders;

  // Helper to escape CSV values
  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV rows
  const rows = data.map((row) => {
    const baseValues = [
      row.id,
      row.content,
      row.verdict,
      row.confidence,
      row.decision,
      row.status,
      row.processingTimeMs,
      row.costCents,
      row.createdAt,
      row.completedAt,
    ];

    if (includeParadigmResults && row.paradigmResults) {
      // Serialize paradigm results as JSON string
      const paradigmJson = JSON.stringify(row.paradigmResults);
      return [...baseValues, paradigmJson].map(escapeCSV).join(',');
    }

    return baseValues.map(escapeCSV).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

async function postHandler(req: DashboardRequest) {
  const { context } = req;

  // Parse and validate request body using shared utility
  const result = await parseAndValidate(req, ExportRequestSchema);
  if (!result.success) return result.error;

  const { format, startDate: startDateStr, endDate: endDateStr, includeParadigmResults, limit } = result.data;

  // Convert date strings to Date objects
  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  // Build query conditions
  const conditions = [eq(verificationsTable.orgId, context.orgId)];

  if (startDate) {
    conditions.push(gte(verificationsTable.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(verificationsTable.createdAt, endDate));
  }

  // Fetch verifications
  const verifications = await db
    .select({
      id: verificationsTable.id,
      content: verificationsTable.content,
      verdict: verificationsTable.finalVerdict,
      confidence: verificationsTable.confidenceScore,
      decision: verificationsTable.decision,
      status: verificationsTable.status,
      processingTimeMs: verificationsTable.processingTimeMs,
      costCents: verificationsTable.costCents,
      createdAt: verificationsTable.createdAt,
      completedAt: verificationsTable.completedAt,
    })
    .from(verificationsTable)
    .where(and(...conditions))
    .orderBy(desc(verificationsTable.createdAt))
    .limit(limit);

  // Format export data using shared formatters
  let exportData: VerificationExport[] = verifications.map((v) => ({
    id: v.id,
    content: v.content,
    verdict: v.verdict,
    confidence: parseDecimal(v.confidence),
    decision: v.decision,
    status: v.status,
    processingTimeMs: v.processingTimeMs,
    costCents: v.costCents,
    createdAt: formatRequiredDateToISO(v.createdAt),
    completedAt: formatDateToISO(v.completedAt),
  }));

  // Fetch paradigm results if requested
  if (includeParadigmResults && exportData.length > 0) {
    const verificationIds = exportData.map((v) => v.id);

    // Fetch all paradigm results for these verifications using IN clause
    const allParadigmResults = await db
      .select({
        verificationId: paradigmResultsTable.verificationId,
        paradigm: paradigmResultsTable.paradigmType,
        verdict: paradigmResultsTable.verdict,
        confidence: paradigmResultsTable.confidence,
        reasoning: paradigmResultsTable.reasoning,
      })
      .from(paradigmResultsTable)
      .where(inArray(paradigmResultsTable.verificationId, verificationIds));

    // Group paradigm results by verification ID
    const paradigmResultsMap = new Map<
      string,
      Array<{
        paradigm: string;
        verdict: string | null;
        confidence: number | null;
        reasoning: string | null;
      }>
    >();

    for (const result of allParadigmResults) {
      const existing = paradigmResultsMap.get(result.verificationId) || [];
      existing.push({
        paradigm: result.paradigm,
        verdict: result.verdict,
        confidence: parseDecimal(result.confidence),
        reasoning: result.reasoning,
      });
      paradigmResultsMap.set(result.verificationId, existing);
    }

    // Attach paradigm results to export data
    exportData = exportData.map((v) => ({
      ...v,
      paradigmResults: paradigmResultsMap.get(v.id) || [],
    }));
  }

  // Generate response based on format
  const dateStr = formatDateForFilename();

  if (format === 'csv') {
    const csv = convertToCSV(exportData, includeParadigmResults);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="verifications-export-${dateStr}.csv"`,
      },
    });
  }

  // JSON format
  return new NextResponse(JSON.stringify({ data: exportData, count: exportData.length }, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="verifications-export-${dateStr}.json"`,
    },
  });
}

export const POST = withDashboardAuth(postHandler, { permission: 'usage:view' });

// GET endpoint for documentation
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/dashboard/export',
    description: 'Export verification data in CSV or JSON format',
    authentication: 'Requires authenticated user with organization access',
    request: {
      format: {
        type: 'string',
        required: true,
        options: ['csv', 'json'],
        description: 'Export format',
      },
      startDate: {
        type: 'string (ISO 8601)',
        required: false,
        description: 'Filter verifications created on or after this date',
      },
      endDate: {
        type: 'string (ISO 8601)',
        required: false,
        description: 'Filter verifications created on or before this date',
      },
      includeParadigmResults: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Include detailed paradigm results in export',
      },
      limit: {
        type: 'number',
        required: false,
        default: EXPORT_LIMITS.defaultLimit,
        max: EXPORT_LIMITS.maxLimit,
        description: 'Maximum number of records to export',
      },
    },
    example: {
      curl: `curl -X POST https://app.check.ai/api/dashboard/export \\
  -H "Content-Type: application/json" \\
  -H "Cookie: your-auth-cookie" \\
  -d '{"format": "csv", "startDate": "2024-01-01", "includeParadigmResults": true}'`,
    },
  });
}

/**
 * POST /api/dashboard/export - Server-side export of verification data
 *
 * Exports verification data in CSV or JSON format with optional filtering.
 * Supports date range filtering and paradigm results inclusion.
 *
 * Security: Requires authenticated user with organization access
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { verificationsTable, paradigmResultsTable } from '@/utils/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';

// Maximum records per export
const MAX_EXPORT_LIMIT = 10000;

interface ExportRequest {
  format: 'csv' | 'json';
  startDate?: string;
  endDate?: string;
  includeParadigmResults?: boolean;
  limit?: number;
}

interface VerificationExport {
  id: string;
  content: string;
  verdict: string | null;
  confidence: number | null;
  decision: string | null;
  status: string;
  processingTimeMs: number | null;
  costCents: number | null;
  createdAt: string;
  completedAt: string | null;
  paradigmResults?: Array<{
    paradigm: string;
    verdict: string | null;
    confidence: number | null;
    reasoning: string | null;
  }>;
}

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

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission for viewing usage/exports
    const { allowed, reason } = checkPermission(context, 'usage:view');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // Parse request body
    let body: ExportRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate format
    if (!body.format || !['csv', 'json'].includes(body.format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be "csv" or "json"' },
        { status: 400 }
      );
    }

    // Parse and validate dates
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (body.startDate) {
      startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
      }
    }

    if (body.endDate) {
      endDate = new Date(body.endDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
      }
    }

    // Validate and set limit
    const limit = Math.min(body.limit || MAX_EXPORT_LIMIT, MAX_EXPORT_LIMIT);
    const includeParadigmResults = body.includeParadigmResults ?? false;

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

    // Format export data
    let exportData: VerificationExport[] = verifications.map((v) => ({
      id: v.id,
      content: v.content,
      verdict: v.verdict,
      confidence: v.confidence ? parseFloat(v.confidence) : null,
      decision: v.decision,
      status: v.status,
      processingTimeMs: v.processingTimeMs,
      costCents: v.costCents,
      createdAt: v.createdAt.toISOString(),
      completedAt: v.completedAt?.toISOString() || null,
    }));

    // Fetch paradigm results if requested
    if (includeParadigmResults && exportData.length > 0) {
      const verificationIds = exportData.map((v) => v.id);

      // Fetch all paradigm results for these verifications using IN clause
      const { inArray } = await import('drizzle-orm');
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
          confidence: result.confidence ? parseFloat(result.confidence) : null,
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
    if (body.format === 'csv') {
      const csv = convertToCSV(exportData, includeParadigmResults);
      const filename = `verifications-export-${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // JSON format
    const filename = `verifications-export-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify({ data: exportData, count: exportData.length }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
        default: 10000,
        max: 10000,
        description: 'Maximum number of records to export',
      },
    },
    example: {
      curl: `curl -X POST https://app.verifyai.dev/api/dashboard/export \\
  -H "Content-Type: application/json" \\
  -H "Cookie: your-auth-cookie" \\
  -d '{"format": "csv", "startDate": "2024-01-01", "includeParadigmResults": true}'`,
    },
  });
}

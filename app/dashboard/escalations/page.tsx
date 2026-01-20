import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/utils/db/db';
import {
  escalationsTable,
  verificationsTable,
  orgMembersTable,
} from '@/utils/db/schema';
import { eq, desc, isNull, isNotNull, sql } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { EscalationActions } from '@/components/escalation/EscalationActions';
import { truncateString } from '@/lib/api/formatters';
import type { HumanVerdict } from '@/lib/escalation/types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

type EscalationReason =
  | 'low_confidence'
  | 'conflicting_results'
  | 'model_failure'
  | 'timeout'
  | 'manual_review_requested';

const REASON_DISPLAY_MAP: Record<EscalationReason, string> = {
  low_confidence: 'Low Confidence Score',
  conflicting_results: 'Conflicting Paradigm Results',
  model_failure: 'Model Error or Failure',
  timeout: 'Processing Timeout',
  manual_review_requested: 'Manual Review Requested',
};

function formatReason(reason: string): string {
  return REASON_DISPLAY_MAP[reason as EscalationReason] || reason;
}

function getStatus(
  resolvedAt: Date | null,
  humanVerdict: HumanVerdict | null
): 'pending' | 'in_review' | 'resolved' | 'dismissed' {
  if (!resolvedAt) return 'pending';
  if (humanVerdict) return 'resolved';
  return 'dismissed';
}

function getPriorityBadge(priority: number) {
  switch (priority) {
    case 3:
      return <Badge variant="destructive">High Priority</Badge>;
    case 2:
      return <Badge variant="secondary">Medium Priority</Badge>;
    default:
      return <Badge variant="outline">Low Priority</Badge>;
  }
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function EscalationsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/login');
  }

  // Get user's organization
  const orgMember = await db.query.orgMembersTable.findFirst({
    where: eq(orgMembersTable.userId, data.user.id),
    with: {
      organization: true,
    },
  });

  if (!orgMember) {
    redirect('/login');
  }

  // Fetch escalations with verification data
  const escalationsData = await db
    .select({
      id: escalationsTable.id,
      verificationId: escalationsTable.verificationId,
      reason: escalationsTable.reason,
      details: escalationsTable.details,
      priority: escalationsTable.priority,
      deadline: escalationsTable.deadline,
      resolvedAt: escalationsTable.resolvedAt,
      humanVerdict: escalationsTable.humanVerdict,
      resolution: escalationsTable.resolution,
      createdAt: escalationsTable.createdAt,
      verificationContent: verificationsTable.content,
      verificationConfidence: verificationsTable.confidenceScore,
    })
    .from(escalationsTable)
    .innerJoin(
      verificationsTable,
      eq(escalationsTable.verificationId, verificationsTable.id)
    )
    .where(eq(verificationsTable.orgId, orgMember.orgId))
    .orderBy(desc(escalationsTable.priority), desc(escalationsTable.createdAt))
    .limit(50);

  // Transform to expected format
  const escalations = escalationsData.map((e) => ({
    id: e.id,
    verificationId: e.verificationId,
    reason: formatReason(e.reason),
    reasonRaw: e.reason,
    status: getStatus(e.resolvedAt, e.humanVerdict as HumanVerdict | null),
    priority: e.priority,
    createdAt: e.createdAt,
    resolvedAt: e.resolvedAt || undefined,
    deadline: e.deadline || undefined,
    humanVerdict: e.humanVerdict,
    resolution: e.resolution,
    content: truncateString(e.verificationContent, 150, true),
    confidence: e.verificationConfidence
      ? parseFloat(e.verificationConfidence)
      : null,
  }));

  // Calculate stats
  const stats = {
    pending: escalationsData.filter((e) => !e.resolvedAt).length,
    inReview: 0,
    resolved: escalationsData.filter((e) => e.resolvedAt && e.humanVerdict).length,
    dismissed: escalationsData.filter((e) => e.resolvedAt && !e.humanVerdict).length,
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-sm font-semibold">Escalations</h1>
      </div>

      {/* Stats - Compact */}
      <div className="mb-4 grid gap-3 grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Pending</span>
            <Clock className="h-3 w-3 text-amber-500" />
          </div>
          <div className="mt-1 text-lg font-semibold">{stats.pending}</div>
          <p className="text-[10px] text-muted-foreground">Awaiting</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">In Review</span>
            <AlertTriangle className="h-3 w-3 text-blue-500" />
          </div>
          <div className="mt-1 text-lg font-semibold">{stats.inReview}</div>
          <p className="text-[10px] text-muted-foreground">Active</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Resolved</span>
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          </div>
          <div className="mt-1 text-lg font-semibold">{stats.resolved}</div>
          <p className="text-[10px] text-muted-foreground">Done</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Dismissed</span>
            <XCircle className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="mt-1 text-lg font-semibold">{stats.dismissed}</div>
          <p className="text-[10px] text-muted-foreground">False +</p>
        </Card>
      </div>

      {/* Escalations List */}
      <Card className="mb-4">
        <div className="border-b px-4 py-2.5">
          <h3 className="text-xs font-semibold">Recent Escalations</h3>
        </div>
        <div className="p-2">
          {escalations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertTriangle className="mb-2 h-6 w-6 text-muted-foreground/30" />
              <p className="mb-1 text-xs font-medium">No escalations</p>
              <p className="max-w-sm text-[10px] text-muted-foreground">
                When verifications are flagged for human review, they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {escalations.map((escalation) => (
                <div
                  key={escalation.id}
                  className="flex items-start justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                        escalation.status === 'pending'
                          ? 'bg-amber-100'
                          : escalation.status === 'in_review'
                            ? 'bg-blue-100'
                            : escalation.status === 'resolved'
                              ? 'bg-green-100'
                              : 'bg-muted'
                      }`}
                    >
                      <AlertTriangle
                        className={`h-3 w-3 ${
                          escalation.status === 'pending'
                            ? 'text-amber-600'
                            : escalation.status === 'in_review'
                              ? 'text-blue-600'
                              : escalation.status === 'resolved'
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium">{escalation.reason}</p>
                        {getPriorityBadge(escalation.priority)}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {escalation.verificationId.slice(0, 8)}...
                        {escalation.confidence !== null && (
                          <span className="ml-1">({(escalation.confidence * 100).toFixed(0)}%)</span>
                        )}
                      </p>
                      {escalation.status === 'resolved' && escalation.humanVerdict && (
                        <Badge
                          variant={escalation.humanVerdict === 'true' ? 'default' : escalation.humanVerdict === 'false' ? 'destructive' : 'secondary'}
                          className="mt-1 text-[9px] px-1 py-0 h-4"
                        >
                          {escalation.humanVerdict}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={escalation.status === 'pending' ? 'outline' : escalation.status === 'resolved' ? 'default' : 'secondary'} className="text-[9px] px-1 py-0 h-4">
                      {escalation.status}
                    </Badge>
                    {escalation.status === 'pending' && (
                      <EscalationActions escalationId={escalation.id} verificationId={escalation.verificationId} />
                    )}
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                      <Link href={`/dashboard/verify/${escalation.verificationId}`}>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Info Card - Collapsible */}
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span>About Escalations</span>
          <svg className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <Card className="mt-2">
          <div className="p-3 text-[10px] text-muted-foreground space-y-2">
            <p>Escalations are triggered when:</p>
            <ul className="ml-3 list-disc space-y-0.5">
              <li><strong>Low confidence</strong> - Below 70%</li>
              <li><strong>Conflicting results</strong> - {">"}30% disagreement</li>
              <li><strong>Model failures</strong> - Paradigm errors</li>
              <li><strong>Timeouts</strong> - Processing too long</li>
            </ul>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3">High</Badge>
              <span>&lt;30%</span>
              <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3">Med</Badge>
              <span>30-50%</span>
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-3">Low</Badge>
              <span>50-70%</span>
            </div>
          </div>
        </Card>
      </details>
    </div>
  );
}

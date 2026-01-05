import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/utils/db/db';
import {
  escalationsTable,
  verificationsTable,
  orgMembersTable,
} from '@/utils/db/schema';
import { eq, desc, isNull, isNotNull, sql } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
  humanVerdict: string | null
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
    status: getStatus(e.resolvedAt, e.humanVerdict),
    priority: e.priority,
    createdAt: e.createdAt,
    resolvedAt: e.resolvedAt || undefined,
    deadline: e.deadline || undefined,
    humanVerdict: e.humanVerdict,
    resolution: e.resolution,
    content: e.verificationContent?.slice(0, 150) || '',
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
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Escalations</h1>
        <p className="text-muted-foreground">
          Review flagged verifications that require human attention
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Review
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inReview}</div>
            <p className="text-xs text-muted-foreground">Being investigated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">Action taken</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dismissed
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dismissed}</div>
            <p className="text-xs text-muted-foreground">False positives</p>
          </CardContent>
        </Card>
      </div>

      {/* Escalations List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Escalations</CardTitle>
          <CardDescription>
            Verifications flagged for human review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {escalations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="mb-2 text-sm font-medium">No escalations</p>
              <p className="mb-4 max-w-sm text-xs text-muted-foreground">
                When verifications are flagged for human review (e.g., high uncertainty,
                potential false positives), they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {escalations.map((escalation) => (
                <div
                  key={escalation.id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
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
                        className={`h-5 w-5 ${
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
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-medium">{escalation.reason}</p>
                        {getPriorityBadge(escalation.priority)}
                      </div>
                      <p className="mb-2 text-sm text-muted-foreground">
                        Verification {escalation.verificationId.slice(0, 8)}...
                        {escalation.confidence !== null && (
                          <span className="ml-2">
                            ({(escalation.confidence * 100).toFixed(1)}% confidence)
                          </span>
                        )}
                      </p>
                      {escalation.content && (
                        <p className="line-clamp-2 text-xs text-muted-foreground/80">
                          {escalation.content}...
                        </p>
                      )}
                      {escalation.status === 'resolved' && escalation.humanVerdict && (
                        <p className="mt-2 text-xs">
                          <span className="font-medium">Human verdict:</span>{' '}
                          <Badge
                            variant={
                              escalation.humanVerdict === 'true'
                                ? 'default'
                                : escalation.humanVerdict === 'false'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {escalation.humanVerdict}
                          </Badge>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge
                      variant={
                        escalation.status === 'pending'
                          ? 'outline'
                          : escalation.status === 'resolved'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {escalation.status.replace('_', ' ')}
                    </Badge>
                    {escalation.status === 'pending' && (
                      <EscalationActions
                        escalationId={escalation.id}
                        verificationId={escalation.verificationId}
                      />
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/verify/${escalation.verificationId}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About Escalations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Escalations are triggered when the verification system detects cases that
              may benefit from human review:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong>Low confidence</strong> - When confidence scores are below 70%
              </li>
              <li>
                <strong>Conflicting results</strong> - When different verification methods
                produce conflicting results ({">"} 30% disagreement)
              </li>
              <li>
                <strong>Model failures</strong> - When one or more paradigms encounter errors
              </li>
              <li>
                <strong>Timeouts</strong> - When verification takes too long to complete
              </li>
            </ul>
            <p className="mt-4">
              <strong>Priority levels:</strong>
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <Badge variant="destructive" className="mr-2">
                  High
                </Badge>
                Confidence {"<"} 30% - requires immediate attention
              </li>
              <li>
                <Badge variant="secondary" className="mr-2">
                  Medium
                </Badge>
                Confidence 30-50% - review within 24 hours
              </li>
              <li>
                <Badge variant="outline" className="mr-2">
                  Low
                </Badge>
                Confidence 50-70% - review when convenient
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

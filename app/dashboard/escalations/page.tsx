import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import {
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/utils/db/db';
import {
  escalationsTable,
  verificationsTable,
  orgMembersTable,
} from '@/utils/db/schema';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
): 'pending' | 'resolved' | 'dismissed' {
  if (!resolvedAt) return 'pending';
  if (humanVerdict) return 'resolved';
  return 'dismissed';
}

function getPriorityBadge(priority: number) {
  switch (priority) {
    case 3:
      return <Badge variant="destructive">High</Badge>;
    case 2:
      return <Badge variant="secondary">Medium</Badge>;
    default:
      return <Badge variant="outline">Low</Badge>;
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
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

  // Fetch escalations - pending first (ordered by priority), then resolved
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
    .limit(100);

  // Transform and sort: pending items first
  // Using toSorted() for immutability (js-tosorted-immutable)
  const escalations = escalationsData
    .map((e) => ({
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
    }))
    .toSorted((a, b) => {
      // Pending items first
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      // Then by priority (high first)
      if (a.priority !== b.priority) return b.priority - a.priority;
      // Then by date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Count pending items
  const pendingCount = escalations.filter((e) => e.status === 'pending').length;
  const pendingEscalations = escalations.filter((e) => e.status === 'pending');
  const resolvedEscalations = escalations.filter((e) => e.status !== 'pending');

  return (
    <div className="p-6">
      {/* Header with pending count */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Escalations</h1>
          <p className="text-sm text-muted-foreground">
            Review verifications flagged for human review
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-warning/10 px-4 py-2 text-warning">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {pendingCount} pending review{pendingCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Escalations List */}
      <Card>
        <div className="p-4">
          {escalations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="mb-3 h-10 w-10 text-success/50" />
              <p className="mb-1 text-sm font-medium">No escalations</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                When verifications need human review, they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Pending Section */}
              {pendingEscalations.length > 0 && (
                <>
                  <div className="mb-2 px-3 py-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-warning">
                      Needs Review ({pendingEscalations.length})
                    </span>
                  </div>
                  {pendingEscalations.map((escalation) => (
                    <EscalationRow key={escalation.id} escalation={escalation} />
                  ))}
                </>
              )}

              {/* Resolved Section */}
              {resolvedEscalations.length > 0 && (
                <>
                  {pendingEscalations.length > 0 && (
                    <div className="my-4 border-t" />
                  )}
                  <div className="mb-2 px-3 py-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Resolved ({resolvedEscalations.length})
                    </span>
                  </div>
                  {resolvedEscalations.map((escalation) => (
                    <EscalationRow key={escalation.id} escalation={escalation} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Info Card - Collapsed by default */}
      <details className="group mt-6">
        <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span>About Escalations</span>
          <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <Card className="mt-3">
          <div className="p-4 text-sm text-muted-foreground space-y-3">
            <p>Escalations are triggered when:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Low confidence</strong> - Below 70%</li>
              <li><strong>Conflicting results</strong> - {">"}30% disagreement between paradigms</li>
              <li><strong>Model failures</strong> - Paradigm errors or exceptions</li>
              <li><strong>Timeouts</strong> - Processing exceeded time limit</li>
            </ul>
            <div className="flex items-center gap-4 pt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Badge variant="destructive">High</Badge>
                <span>&lt;30% confidence</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary">Medium</Badge>
                <span>30-50%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline">Low</Badge>
                <span>50-70%</span>
              </div>
            </div>
          </div>
        </Card>
      </details>
    </div>
  );
}

// =============================================================================
// ESCALATION ROW COMPONENT
// =============================================================================

interface EscalationRowProps {
  escalation: {
    id: string;
    verificationId: string;
    reason: string;
    status: 'pending' | 'resolved' | 'dismissed';
    priority: number;
    createdAt: Date;
    humanVerdict: string | null;
    confidence: number | null;
    content: string;
  };
}

function EscalationRow({ escalation }: EscalationRowProps) {
  const isPending = escalation.status === 'pending';

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-md px-3 py-3 transition-colors hover:bg-muted/50 ${
        isPending ? 'bg-warning/5' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${
            isPending ? 'bg-warning/10' : 'bg-muted'
          }`}
        >
          <AlertTriangle
            className={`h-4 w-4 ${isPending ? 'text-warning' : 'text-muted-foreground'}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{escalation.reason}</p>
            {getPriorityBadge(escalation.priority)}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{escalation.verificationId.slice(0, 8)}</span>
            {escalation.confidence !== null && (
              <span>• {(escalation.confidence * 100).toFixed(0)}% confidence</span>
            )}
            <span>• {formatRelativeTime(escalation.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {escalation.status === 'resolved' && escalation.humanVerdict && (
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
        )}
        {escalation.status === 'dismissed' && (
          <Badge variant="outline">dismissed</Badge>
        )}
        {isPending && (
          <EscalationActions
            escalationId={escalation.id}
            verificationId={escalation.verificationId}
          />
        )}
        <Button variant="ghost" size="icon" asChild aria-label="View verification details">
          <Link href={`/dashboard/verify/${escalation.verificationId}`}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

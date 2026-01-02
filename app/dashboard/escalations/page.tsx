import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function EscalationsPage() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/login');
  }

  // Mock escalations data - replace with real DB queries
  const escalations: Array<{
    id: string;
    verificationId: string;
    reason: string;
    status: 'pending' | 'in_review' | 'resolved' | 'dismissed';
    createdAt: Date;
    resolvedAt?: Date;
  }> = [];

  const stats = {
    pending: 0,
    inReview: 0,
    resolved: 0,
    dismissed: 0,
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
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
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
                    <div>
                      <p className="font-medium">{escalation.reason}</p>
                      <p className="text-sm text-muted-foreground">
                        Verification {escalation.verificationId.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                <strong>High uncertainty</strong> - When confidence scores are borderline
              </li>
              <li>
                <strong>Method disagreement</strong> - When different verification methods
                produce conflicting results
              </li>
              <li>
                <strong>Potential hallucinations</strong> - Content flagged as likely fabricated
              </li>
              <li>
                <strong>User feedback</strong> - When users dispute a verification result
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

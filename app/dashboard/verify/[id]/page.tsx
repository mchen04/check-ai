'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { formatDateLong, getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/loading-spinner';
import { useVerificationStatus, useCopyToClipboard } from '@/hooks';
import { VerdictIcon, getVerdictColor, type VerdictDisplay } from '@/components/ui/verdict-display';
import { formatParadigmName } from '@/lib/verification/types';
import type { VerificationStatus, Decision } from '@/lib/api/types';

// =============================================================================
// TYPES
// =============================================================================

interface ParadigmResult {
  paradigm: string;
  provider: string;
  model: string;
  verdict: VerdictDisplay;
  confidence: number | null;
  reasoning: string | null;
  processingTimeMs: number | null;
  error: string | null;
}

interface VerificationDetail {
  id: string;
  content: string;
  context: Record<string, unknown> | null;
  methodsConfig: Record<string, number>;
  status: VerificationStatus;
  verdict: VerdictDisplay;
  confidence: number | null;
  decision: Decision | null;
  paradigmResults: ParadigmResult[];
  processingTimeMs: number | null;
  costCents: number | null;
  createdAt: string;
  completedAt: string | null;
}

// =============================================================================
// HELPERS
// =============================================================================

function getDecisionBadge(decision: Decision | null) {
  switch (decision) {
    case 'accept':
      return <Badge className="bg-success/10 text-success">Accept</Badge>;
    case 'refine':
      return <Badge className="bg-info/10 text-info">Refine</Badge>;
    case 'escalate':
      return <Badge className="bg-warning/10 text-warning">Escalate</Badge>;
    case 'reject':
      return <Badge className="bg-destructive/10 text-destructive">Reject</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function VerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [verification, setVerification] = useState<VerificationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useCopyToClipboard();

  // Use real-time hook for live updates
  const liveStatus = useVerificationStatus(verification?.status === 'processing' ? id : null);

  useEffect(() => {
    async function fetchVerification() {
      try {
        const response = await fetch(`/api/dashboard/verifications/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Verification not found');
          }
          throw new Error('Failed to fetch verification');
        }

        const data = await response.json();
        setVerification(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    fetchVerification();
  }, [id]);

  // Update verification when live status changes
  useEffect(() => {
    if (liveStatus.status === 'completed' && liveStatus.result) {
      setVerification((prev) =>
        prev
          ? {
              ...prev,
              status: 'completed' as const,
              verdict: liveStatus.result!.verdict as VerdictDisplay,
              confidence: liveStatus.result!.confidence,
              decision: liveStatus.result!.decision as Decision,
              processingTimeMs: liveStatus.result!.processingTimeMs,
              costCents: liveStatus.result!.costCents,
            }
          : null
      );
    }
  }, [liveStatus]);

  const handleCopyId = () => copy(id);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex h-32 items-center justify-center">
          <Spinner size="sm" className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !verification) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <p className="mb-4 text-sm text-destructive">{error || 'Verification not found'}</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/verify')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Card>
      </div>
    );
  }

  const isProcessing = verification.status === 'processing';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/verify')} aria-label="Go back to verification history">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Verification</h1>
            <code className="text-xs text-muted-foreground">{id.slice(0, 8)}...</code>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyId} aria-label="Copy verification ID">
              <Copy className="h-4 w-4" />
            </Button>
            {copied && <span className="text-xs text-success">Copied!</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Result Card */}
        <div className="space-y-6 lg:col-span-2">
          {/* Result Summary */}
          <Card>
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Result</h3>
            </div>
            <div className="p-4">
              {isProcessing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Spinner size="sm" className="text-primary" />
                    <span className="text-sm">Processing...</span>
                  </div>
                  <Progress value={liveStatus.progress.total > 0 ? (liveStatus.progress.completed / liveStatus.progress.total) * 100 : 0} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{liveStatus.progress.completed}/{liveStatus.progress.total} methods</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <VerdictIcon verdict={verification.verdict} size="lg" />
                    <div>
                      <p className={`text-2xl font-bold ${getVerdictColor(verification.verdict)}`}>
                        {verification.verdict ? verification.verdict.charAt(0).toUpperCase() + verification.verdict.slice(1) : 'Pending'}
                      </p>
                      {verification.confidence !== null && (
                        <p className="text-sm text-muted-foreground">{(verification.confidence * 100).toFixed(1)}% confidence</p>
                      )}
                    </div>
                    <div className="ml-auto">{getDecisionBadge(verification.decision)}</div>
                  </div>
                  {verification.confidence !== null && <Progress value={verification.confidence * 100} className="h-1.5" />}
                </div>
              )}
            </div>
          </Card>

          {/* Content */}
          <Card>
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Content</h3>
            </div>
            <div className="p-4">
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">{verification.content}</pre>
              {verification.context && Object.keys(verification.context).length > 0 && (
                <>
                  <Separator className="my-3" />
                  <p className="mb-2 text-sm font-medium">Context</p>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs">{JSON.stringify(verification.context, null, 2)}</pre>
                </>
              )}
            </div>
          </Card>

          {/* Paradigm Results */}
          <Card>
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Paradigm Results</h3>
            </div>
            <div className="p-4">
              {verification.paradigmResults.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No paradigm results yet</p>
              ) : (
                <div className="space-y-3">
                  {verification.paradigmResults.map((pr) => (
                    <div key={pr.paradigm} className="rounded-md border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <VerdictIcon verdict={pr.verdict} />
                          <span className="text-sm font-medium">{formatParadigmName(pr.paradigm)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{pr.provider}/{pr.model}</span>
                          {pr.processingTimeMs && <Badge variant="outline">{pr.processingTimeMs}ms</Badge>}
                        </div>
                      </div>
                      {pr.error ? (
                        <p className="text-sm text-destructive">{pr.error}</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 text-sm">
                            <span className={`font-medium ${getVerdictColor(pr.verdict)}`}>{pr.verdict || 'N/A'}</span>
                            {pr.confidence !== null && <span className="text-muted-foreground">{(pr.confidence * 100).toFixed(0)}%</span>}
                          </div>
                          {pr.reasoning && (
                            <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs text-muted-foreground line-clamp-3">{pr.reasoning}</pre>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Details</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge className={`${verification.status === 'completed' ? 'bg-success/10 text-success' : verification.status === 'processing' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{verification.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Time</span>
                <span className="text-sm font-mono">{verification.processingTimeMs ? `${verification.processingTimeMs}ms` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Cost</span>
                <span className="text-sm font-mono">{verification.costCents ? `$${(verification.costCents / 100).toFixed(4)}` : '-'}</span>
              </div>
              <Separator />
              <div>
                <span className="text-xs text-muted-foreground">Created</span>
                <p className="text-sm">{formatDateLong(verification.createdAt)}</p>
              </div>
              {verification.completedAt && (
                <div>
                  <span className="text-xs text-muted-foreground">Completed</span>
                  <p className="text-sm">{formatDateLong(verification.completedAt)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Methods Config */}
          <Card>
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Methods Used</h3>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {Object.entries(verification.methodsConfig)
                  .filter(([, weight]) => weight > 0)
                  .map(([method, weight]) => (
                    <div key={method} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50">
                      <span className="text-sm">{formatParadigmName(method)}</span>
                      <Badge variant="outline">{(weight * 100).toFixed(0)}%</Badge>
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

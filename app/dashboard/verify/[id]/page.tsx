'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';

// =============================================================================
// TYPES
// =============================================================================

interface ParadigmResult {
  paradigm: string;
  provider: string;
  model: string;
  verdict: string | null;
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
  status: string;
  verdict: string | null;
  confidence: number | null;
  decision: string | null;
  paradigmResults: ParadigmResult[];
  processingTimeMs: number | null;
  costCents: number | null;
  createdAt: string;
  completedAt: string | null;
}

// =============================================================================
// HELPERS
// =============================================================================

function getVerdictIcon(verdict: string | null, size: 'sm' | 'lg' = 'sm') {
  const sizeClass = size === 'lg' ? 'h-8 w-8' : 'h-4 w-4';

  switch (verdict) {
    case 'true':
      return <CheckCircle2 className={`${sizeClass} text-green-500`} />;
    case 'false':
      return <XCircle className={`${sizeClass} text-red-500`} />;
    case 'uncertain':
      return <AlertCircle className={`${sizeClass} text-yellow-500`} />;
    default:
      return <Clock className={`${sizeClass} text-gray-400`} />;
  }
}

function getVerdictColor(verdict: string | null): string {
  switch (verdict) {
    case 'true':
      return 'text-green-600';
    case 'false':
      return 'text-red-600';
    case 'uncertain':
      return 'text-yellow-600';
    default:
      return 'text-gray-400';
  }
}

function getDecisionBadge(decision: string | null) {
  switch (decision) {
    case 'accept':
      return <Badge className="bg-green-100 text-green-800">Accept</Badge>;
    case 'refine':
      return <Badge className="bg-blue-100 text-blue-800">Refine</Badge>;
    case 'escalate':
      return <Badge className="bg-orange-100 text-orange-800">Escalate</Badge>;
    case 'reject':
      return <Badge className="bg-red-100 text-red-800">Reject</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

function formatParadigmName(paradigm: string): string {
  const names: Record<string, string> = {
    semantic: 'Semantic Analysis',
    reasoning: 'LLM Reasoning',
    tool: 'Tool-Augmented',
    biprm: 'Bidirectional Reasoning',
    ensemble: 'Multi-Model Ensemble',
    entropy: 'Semantic Entropy',
    formal: 'Formal Verification',
  };
  return names[paradigm] || paradigm;
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
  const [copied, setCopied] = useState(false);

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
        setError(err instanceof Error ? err.message : 'Unknown error');
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
              status: 'completed',
              verdict: liveStatus.result!.verdict,
              confidence: liveStatus.result!.confidence,
              decision: liveStatus.result!.decision,
              processingTimeMs: liveStatus.result!.processingTimeMs,
              costCents: liveStatus.result!.costCents,
            }
          : null
      );
    }
  }, [liveStatus]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !verification) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4 text-red-500">{error || 'Verification not found'}</p>
            <Button variant="outline" onClick={() => router.push('/dashboard/verify')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isProcessing = verification.status === 'processing';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/verify')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Verification Details</h1>
              <Button variant="ghost" size="sm" onClick={handleCopyId}>
                <Copy className="h-4 w-4" />
              </Button>
              {copied && <span className="text-sm text-green-600">Copied!</span>}
            </div>
            <p className="font-mono text-sm text-muted-foreground">{id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Result Card */}
        <div className="space-y-6 lg:col-span-2">
          {/* Result Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              {isProcessing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 animate-spin text-blue-500" />
                    <span className="text-lg">Processing verification...</span>
                  </div>
                  <Progress
                    value={
                      liveStatus.progress.total > 0
                        ? (liveStatus.progress.completed / liveStatus.progress.total) * 100
                        : 0
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    {liveStatus.progress.completed} of {liveStatus.progress.total} methods completed
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {getVerdictIcon(verification.verdict, 'lg')}
                    <div>
                      <p className={`text-2xl font-bold ${getVerdictColor(verification.verdict)}`}>
                        {verification.verdict
                          ? verification.verdict.charAt(0).toUpperCase() +
                            verification.verdict.slice(1)
                          : 'Pending'}
                      </p>
                      {verification.confidence !== null && (
                        <p className="text-muted-foreground">
                          {(verification.confidence * 100).toFixed(1)}% confidence
                        </p>
                      )}
                    </div>
                    <div className="ml-auto">{getDecisionBadge(verification.decision)}</div>
                  </div>

                  {verification.confidence !== null && (
                    <Progress value={verification.confidence * 100} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-sm">
                {verification.content}
              </pre>

              {verification.context && Object.keys(verification.context).length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="mb-2 text-sm font-medium">Context</p>
                    <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-sm">
                      {JSON.stringify(verification.context, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Paradigm Results */}
          <Card>
            <CardHeader>
              <CardTitle>Paradigm Results</CardTitle>
              <CardDescription>Individual results from each verification method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {verification.paradigmResults.length === 0 ? (
                  <p className="text-muted-foreground">No paradigm results yet</p>
                ) : (
                  verification.paradigmResults.map((pr, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getVerdictIcon(pr.verdict)}
                            <CardTitle className="text-base">
                              {formatParadigmName(pr.paradigm)}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                              {pr.provider}/{pr.model}
                            </span>
                            {pr.processingTimeMs && (
                              <Badge variant="outline">{pr.processingTimeMs}ms</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {pr.error ? (
                          <p className="text-sm text-red-500">{pr.error}</p>
                        ) : (
                          <>
                            <div className="mb-2 flex items-center gap-4">
                              <span className={`font-medium ${getVerdictColor(pr.verdict)}`}>
                                {pr.verdict || 'N/A'}
                              </span>
                              {pr.confidence !== null && (
                                <span className="text-muted-foreground">
                                  {(pr.confidence * 100).toFixed(1)}% confidence
                                </span>
                              )}
                            </div>
                            {pr.reasoning && (
                              <pre className="whitespace-pre-wrap rounded bg-muted p-2 text-sm text-muted-foreground">
                                {pr.reasoning}
                              </pre>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  className={
                    verification.status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : verification.status === 'processing'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100'
                  }
                >
                  {verification.status}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Processing Time</p>
                <p className="font-mono">
                  {verification.processingTimeMs ? `${verification.processingTimeMs}ms` : '-'}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Cost</p>
                <p className="font-mono">
                  {verification.costCents ? `$${(verification.costCents / 100).toFixed(4)}` : '-'}
                </p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p>{format(new Date(verification.createdAt), 'PPpp')}</p>
              </div>

              {verification.completedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p>{format(new Date(verification.completedAt), 'PPpp')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Methods Config */}
          <Card>
            <CardHeader>
              <CardTitle>Methods Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(verification.methodsConfig)
                  .filter(([, weight]) => weight > 0)
                  .map(([method, weight]) => (
                    <div key={method} className="flex items-center justify-between">
                      <span>{formatParadigmName(method)}</span>
                      <Badge variant="outline">{(weight * 100).toFixed(0)}%</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

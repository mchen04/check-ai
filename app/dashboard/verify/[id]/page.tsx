'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
      <div className="p-4">
        <div className="flex h-32 items-center justify-center">
          <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !verification) {
    return (
      <div className="p-4">
        <Card className="p-4 text-center">
          <p className="mb-3 text-xs text-red-500">{error || 'Verification not found'}</p>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => router.push('/dashboard/verify')}>
            <ArrowLeft className="mr-1.5 h-3 w-3" />
            Back
          </Button>
        </Card>
      </div>
    );
  }

  const isProcessing = verification.status === 'processing';

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => router.push('/dashboard/verify')}>
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">Verification</h1>
            <code className="text-[10px] text-muted-foreground">{id.slice(0, 8)}...</code>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={handleCopyId}>
              <Copy className="h-3 w-3" />
            </Button>
            {copied && <span className="text-[10px] text-green-600">Copied!</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main Result Card */}
        <div className="space-y-4 lg:col-span-2">
          {/* Result Summary */}
          <Card>
            <div className="border-b px-4 py-2.5">
              <h3 className="text-xs font-semibold">Result</h3>
            </div>
            <div className="p-3">
              {isProcessing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-xs">Processing...</span>
                  </div>
                  <Progress value={liveStatus.progress.total > 0 ? (liveStatus.progress.completed / liveStatus.progress.total) * 100 : 0} className="h-1" />
                  <p className="text-[10px] text-muted-foreground">{liveStatus.progress.completed}/{liveStatus.progress.total} methods</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getVerdictIcon(verification.verdict, 'lg')}
                    <div>
                      <p className={`text-xl font-bold ${getVerdictColor(verification.verdict)}`}>
                        {verification.verdict ? verification.verdict.charAt(0).toUpperCase() + verification.verdict.slice(1) : 'Pending'}
                      </p>
                      {verification.confidence !== null && (
                        <p className="text-xs text-muted-foreground">{(verification.confidence * 100).toFixed(1)}% confidence</p>
                      )}
                    </div>
                    <div className="ml-auto">{getDecisionBadge(verification.decision)}</div>
                  </div>
                  {verification.confidence !== null && <Progress value={verification.confidence * 100} className="h-1" />}
                </div>
              )}
            </div>
          </Card>

          {/* Content */}
          <Card>
            <div className="border-b px-4 py-2.5">
              <h3 className="text-xs font-semibold">Content</h3>
            </div>
            <div className="p-3">
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-2 font-mono text-[10px] leading-relaxed">{verification.content}</pre>
              {verification.context && Object.keys(verification.context).length > 0 && (
                <>
                  <Separator className="my-2" />
                  <p className="mb-1 text-[10px] font-medium">Context</p>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-2 font-mono text-[10px]">{JSON.stringify(verification.context, null, 2)}</pre>
                </>
              )}
            </div>
          </Card>

          {/* Paradigm Results */}
          <Card>
            <div className="border-b px-4 py-2.5">
              <h3 className="text-xs font-semibold">Paradigm Results</h3>
            </div>
            <div className="p-2">
              {verification.paradigmResults.length === 0 ? (
                <p className="py-4 text-center text-[10px] text-muted-foreground">No paradigm results yet</p>
              ) : (
                <div className="space-y-1">
                  {verification.paradigmResults.map((pr, index) => (
                    <div key={index} className="rounded-md border p-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          {getVerdictIcon(pr.verdict)}
                          <span className="text-xs font-medium">{formatParadigmName(pr.paradigm)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span>{pr.provider}/{pr.model}</span>
                          {pr.processingTimeMs && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{pr.processingTimeMs}ms</Badge>}
                        </div>
                      </div>
                      {pr.error ? (
                        <p className="text-[10px] text-red-500">{pr.error}</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className={`font-medium ${getVerdictColor(pr.verdict)}`}>{pr.verdict || 'N/A'}</span>
                            {pr.confidence !== null && <span className="text-muted-foreground">{(pr.confidence * 100).toFixed(0)}%</span>}
                          </div>
                          {pr.reasoning && (
                            <pre className="mt-1 whitespace-pre-wrap rounded bg-muted p-1.5 text-[10px] text-muted-foreground line-clamp-3">{pr.reasoning}</pre>
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
        <div className="space-y-4">
          {/* Metadata */}
          <Card>
            <div className="border-b px-4 py-2.5">
              <h3 className="text-xs font-semibold">Details</h3>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Status</span>
                <Badge className={`text-[9px] px-1 py-0 h-4 ${verification.status === 'completed' ? 'bg-blue-100 text-blue-800' : verification.status === 'processing' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100'}`}>{verification.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Time</span>
                <span className="text-xs font-mono">{verification.processingTimeMs ? `${verification.processingTimeMs}ms` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Cost</span>
                <span className="text-xs font-mono">{verification.costCents ? `$${(verification.costCents / 100).toFixed(4)}` : '-'}</span>
              </div>
              <Separator className="my-1" />
              <div>
                <span className="text-[10px] text-muted-foreground">Created</span>
                <p className="text-xs">{format(new Date(verification.createdAt), 'MMM d, yyyy h:mm a')}</p>
              </div>
              {verification.completedAt && (
                <div>
                  <span className="text-[10px] text-muted-foreground">Completed</span>
                  <p className="text-xs">{format(new Date(verification.completedAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Methods Config */}
          <Card>
            <div className="border-b px-4 py-2.5">
              <h3 className="text-xs font-semibold">Methods Used</h3>
            </div>
            <div className="p-2">
              <div className="space-y-1">
                {Object.entries(verification.methodsConfig)
                  .filter(([, weight]) => weight > 0)
                  .map(([method, weight]) => (
                    <div key={method} className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-muted/50">
                      <span className="text-xs">{formatParadigmName(method)}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{(weight * 100).toFixed(0)}%</Badge>
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

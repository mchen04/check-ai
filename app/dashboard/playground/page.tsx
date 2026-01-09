'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, XCircle, AlertCircle, Clock, Play, Copy, Code, Info } from 'lucide-react';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';

// =============================================================================
// TYPES
// =============================================================================

interface MethodConfig {
  enabled: boolean;
  weight: number;
}

interface MethodsState {
  semantic: MethodConfig;
  reasoning: MethodConfig;
  tool: MethodConfig;
  biprm: MethodConfig;
  ensemble: MethodConfig;
  entropy: MethodConfig;
  formal: MethodConfig;
}

interface ParadigmResult {
  paradigm: string;
  verdict: string | null;
  confidence: number;
  reasoning?: string;
  processingTimeMs: number;
  error?: string;
}

interface VerificationResponse {
  id: string;
  status: string;
  verdict: string | null;
  confidence: number;
  decision: string;
  reasoning: string;
  paradigmResults: ParadigmResult[];
  processingTimeMs: number;
  costCents: number;
}

// =============================================================================
// METHOD DEFINITIONS
// =============================================================================

const METHOD_INFO: Record<
  string,
  { name: string; description: string; fpr: string; latency: string }
> = {
  semantic: {
    name: 'Semantic Analysis',
    description: 'Fast embedding similarity check',
    fpr: '50-100%',
    latency: '<100ms',
  },
  reasoning: {
    name: 'LLM Reasoning',
    description: 'Chain-of-thought verification',
    fpr: '~7%',
    latency: '2-3s',
  },
  tool: {
    name: 'Tool-Augmented',
    description: 'Web search grounded verification',
    fpr: '~2%',
    latency: '1-2s',
  },
  biprm: {
    name: 'Bidirectional',
    description: 'Forward + backward reasoning',
    fpr: '~10%',
    latency: '3-5s',
  },
  ensemble: {
    name: 'Multi-Model',
    description: 'Cross-model consensus voting',
    fpr: '20-40%',
    latency: '5-10s',
  },
  entropy: {
    name: 'Semantic Entropy',
    description: 'Consistency-based uncertainty',
    fpr: '~15%',
    latency: '~200ms',
  },
  formal: {
    name: 'Formal Verification',
    description: 'Mathematical proof checking',
    fpr: '0%',
    latency: 'Variable',
  },
};

const DEFAULT_METHODS: MethodsState = {
  semantic: { enabled: false, weight: 0.3 },
  reasoning: { enabled: true, weight: 1.0 },
  tool: { enabled: true, weight: 1.0 },
  biprm: { enabled: false, weight: 0.8 },
  ensemble: { enabled: false, weight: 0.7 },
  entropy: { enabled: false, weight: 0.6 },
  formal: { enabled: false, weight: 1.0 },
};

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

// =============================================================================
// COMPONENT
// =============================================================================

export default function PlaygroundPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [methods, setMethods] = useState<MethodsState>(DEFAULT_METHODS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [copied, setCopied] = useState(false);

  // Use real-time updates for in-progress verification
  const liveStatus = useVerificationStatus(isSubmitting && verificationId ? verificationId : null);

  const handleMethodToggle = (method: keyof MethodsState) => {
    setMethods((prev) => ({
      ...prev,
      [method]: { ...prev[method], enabled: !prev[method].enabled },
    }));
  };

  const handleWeightChange = (method: keyof MethodsState, value: number) => {
    setMethods((prev) => ({
      ...prev,
      [method]: { ...prev[method], weight: value },
    }));
  };

  const buildMethodsConfig = (): Record<string, number> => {
    const config: Record<string, number> = {};
    for (const [key, value] of Object.entries(methods)) {
      if (value.enabled) {
        config[key] = value.weight;
      }
    }
    return config;
  };

  const generateCodeSnippet = (): string => {
    const config = buildMethodsConfig();
    return `// Using fetch
const response = await fetch('https://api.shove.ai/v1/verify', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: ${JSON.stringify(content)},
    methods: ${JSON.stringify(config, null, 6).replace(/\n/g, '\n    ')},
  }),
});

const result = await response.json();
console.log(result);`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateCodeSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Please enter content to verify');
      return;
    }

    const methodsConfig = buildMethodsConfig();
    if (Object.keys(methodsConfig).length === 0) {
      setError('Please enable at least one verification method');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/v1/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          methods: methodsConfig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      const data = await response.json();
      setVerificationId(data.id);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const enabledMethodsCount = Object.values(methods).filter((m) => m.enabled).length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
        <p className="text-muted-foreground">
          Test verification methods with different configurations
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column - Input */}
        <div className="space-y-6">
          {/* Content Input */}
          <Card>
            <CardHeader>
              <CardTitle>Content to Verify</CardTitle>
              <CardDescription>Enter the claim or statement you want to verify</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="The Eiffel Tower is located in Paris, France and was completed in 1889..."
                className="min-h-[150px] font-mono"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{content.length} characters</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCodeSnippet(!showCodeSnippet)}
                >
                  <Code className="mr-2 h-4 w-4" />
                  {showCodeSnippet ? 'Hide' : 'Show'} Code
                </Button>
              </div>

              {showCodeSnippet && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">API Code Snippet</span>
                    <Button variant="ghost" size="sm" onClick={handleCopyCode}>
                      <Copy className="mr-2 h-4 w-4" />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                    {generateCodeSnippet()}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Methods Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Methods</CardTitle>
              <CardDescription>Configure which methods to use and their weights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TooltipProvider>
                {(Object.keys(methods) as Array<keyof MethodsState>).map((method) => {
                  const info = METHOD_INFO[method];
                  const config = methods[method];

                  return (
                    <div
                      key={method}
                      className={`rounded-lg border p-4 transition-colors ${
                        config.enabled ? 'border-primary/20 bg-muted/50' : 'bg-background'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={config.enabled}
                            onCheckedChange={() => handleMethodToggle(method)}
                          />
                          <Label className="font-medium">{info.name}</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{info.description}</p>
                              <p className="mt-1 text-xs">
                                FPR: {info.fpr} | Latency: {info.latency}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">FPR: {info.fpr}</Badge>
                          <Badge variant="secondary">{info.latency}</Badge>
                        </div>
                      </div>

                      {config.enabled && (
                        <div className="mt-3 flex items-center gap-4">
                          <span className="w-16 text-sm text-muted-foreground">Weight:</span>
                          <Slider
                            value={[config.weight]}
                            onValueChange={([value]) => handleWeightChange(method, value)}
                            min={0.1}
                            max={1}
                            step={0.1}
                            className="flex-1"
                          />
                          <span className="w-12 font-mono text-sm">{config.weight.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </TooltipProvider>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim() || enabledMethodsCount === 0}
          >
            {isSubmitting ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Verify ({enabledMethodsCount} method
                {enabledMethodsCount !== 1 ? 's' : ''})
              </>
            )}
          </Button>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Processing Status */}
          {isSubmitting && !result && (
            <Card>
              <CardHeader>
                <CardTitle>Processing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 animate-spin text-blue-500" />
                  <span>Running verification methods...</span>
                </div>
                {liveStatus.progress.total > 0 && (
                  <>
                    <Progress
                      value={(liveStatus.progress.completed / liveStatus.progress.total) * 100}
                    />
                    <p className="text-sm text-muted-foreground">
                      {liveStatus.progress.completed} of {liveStatus.progress.total} methods
                      completed
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Result Display */}
          {result && (
            <>
              {/* Main Result */}
              <Card>
                <CardHeader>
                  <CardTitle>Verification Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center gap-4">
                    {getVerdictIcon(result.verdict, 'lg')}
                    <div>
                      <p className={`text-3xl font-bold ${getVerdictColor(result.verdict)}`}>
                        {result.verdict
                          ? result.verdict.charAt(0).toUpperCase() + result.verdict.slice(1)
                          : 'Pending'}
                      </p>
                      <p className="text-muted-foreground">
                        {(result.confidence * 100).toFixed(1)}% confidence
                      </p>
                    </div>
                    <div className="ml-auto">
                      <Badge
                        className={
                          result.decision === 'accept'
                            ? 'bg-green-100 text-green-800'
                            : result.decision === 'reject'
                              ? 'bg-red-100 text-red-800'
                              : result.decision === 'escalate'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {result.decision}
                      </Badge>
                    </div>
                  </div>

                  <Progress value={result.confidence * 100} className="mb-4" />

                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{result.processingTimeMs}ms</span>
                    <span>•</span>
                    <span>${(result.costCents / 100).toFixed(4)}</span>
                    <span>•</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => router.push(`/dashboard/verify/${result.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Paradigm Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Method Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.paradigmResults.map((pr, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {getVerdictIcon(pr.verdict)}
                        <div>
                          <p className="font-medium">
                            {METHOD_INFO[pr.paradigm]?.name || pr.paradigm}
                          </p>
                          {pr.error ? (
                            <p className="text-xs text-red-500">{pr.error}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {pr.reasoning?.slice(0, 80)}...
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${getVerdictColor(pr.verdict)}`}>
                          {pr.verdict || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(pr.confidence * 100).toFixed(0)}% • {pr.processingTimeMs}ms
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty State */}
          {!isSubmitting && !result && !error && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <div className="text-muted-foreground">
                  <Play className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Enter content and click Verify to see results</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

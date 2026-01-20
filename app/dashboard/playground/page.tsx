'use client';

import { useState, useEffect } from 'react';
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
import { Play, Copy, Code, Info } from 'lucide-react';
import { ButtonSpinner, Spinner } from '@/components/ui/loading-spinner';
import { useVerificationStatus, useCopyToClipboard } from '@/hooks';
import { markOnboardingStep } from '@/app/dashboard/actions';
import { VerdictIcon, getVerdictColor, type VerdictDisplay } from '@/components/ui/verdict-display';
import { truncateString } from '@/lib/api/formatters';
import { getErrorMessage } from '@/lib/utils';
import type { VerificationStatus, Decision } from '@/lib/api/types';

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

interface OptionsState {
  showAdvanced: boolean;
  acceptThreshold: number;
  escalateThreshold: number;
  minConfidence: number;
  maxRetries: number;
  retryOnLowConfidence: boolean;
}

interface ParadigmResult {
  paradigm: string;
  verdict: VerdictDisplay;
  confidence: number;
  reasoning?: string;
  processingTimeMs: number;
  error?: string;
}

interface VerificationResponse {
  id: string;
  status: VerificationStatus;
  verdict: VerdictDisplay;
  confidence: number;
  decision: Decision;
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

const DEFAULT_OPTIONS: OptionsState = {
  showAdvanced: false,
  acceptThreshold: 0.95,
  escalateThreshold: 0.5,
  minConfidence: 0.8,
  maxRetries: 0,
  retryOnLowConfidence: false,
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function PlaygroundPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [methods, setMethods] = useState<MethodsState>(DEFAULT_METHODS);
  const [options, setOptions] = useState<OptionsState>(DEFAULT_OPTIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  // Use real-time updates for in-progress verification
  const liveStatus = useVerificationStatus(isSubmitting && verificationId ? verificationId : null);

  // Mark playground as visited for onboarding
  useEffect(() => {
    markOnboardingStep('hasVisitedPlayground');
  }, []);

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

  const buildOptionsConfig = (): Record<string, unknown> | undefined => {
    if (!options.showAdvanced) return undefined;

    const config: Record<string, unknown> = {};

    // Only include non-default values
    if (options.acceptThreshold !== DEFAULT_OPTIONS.acceptThreshold) {
      config.acceptThreshold = options.acceptThreshold;
    }
    if (options.escalateThreshold !== DEFAULT_OPTIONS.escalateThreshold) {
      config.escalateThreshold = options.escalateThreshold;
    }
    if (options.maxRetries > 0) {
      config.maxRetries = options.maxRetries;
    }
    if (options.retryOnLowConfidence) {
      config.minConfidence = options.minConfidence;
      config.retryOnLowConfidence = true;
    }

    return Object.keys(config).length > 0 ? config : undefined;
  };

  const generateCodeSnippet = (): string => {
    const methodsConfig = buildMethodsConfig();
    const optionsConfig = buildOptionsConfig();

    const bodyObj: Record<string, unknown> = {
      content,
      methods: methodsConfig,
    };
    if (optionsConfig) {
      bodyObj.options = optionsConfig;
    }

    return `// Using fetch
const response = await fetch('https://api.check.ai/v1/verify', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${JSON.stringify(bodyObj, null, 4).replace(/\n/g, '\n  ')}),
});

const result = await response.json();
console.log(result);`;
  };

  const handleCopyCode = () => copy(generateCodeSnippet());

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

    const optionsConfig = buildOptionsConfig();

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        content,
        methods: methodsConfig,
      };
      if (optionsConfig) {
        body.options = optionsConfig;
      }

      const response = await fetch('/api/dashboard/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      const data = await response.json();
      setVerificationId(data.id);
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const enabledMethodsCount = Object.values(methods).filter((m) => m.enabled).length;

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-sm font-semibold">Playground</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Column - Input */}
        <div className="space-y-4">
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

          {/* Advanced Options */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setOptions(prev => ({ ...prev, showAdvanced: !prev.showAdvanced }))}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Advanced Options</CardTitle>
                  <CardDescription>Configure thresholds and retry behavior</CardDescription>
                </div>
                <Switch
                  checked={options.showAdvanced}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, showAdvanced: checked }))}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CardHeader>
            {options.showAdvanced && (
              <CardContent className="space-y-4">
                {/* Accept Threshold */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Accept Threshold</Label>
                    <span className="font-mono text-sm">{(options.acceptThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[options.acceptThreshold]}
                    onValueChange={([value]) => setOptions(prev => ({ ...prev, acceptThreshold: value }))}
                    min={0.5}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">Auto-approve if confidence ≥ this value</p>
                </div>

                <Separator />

                {/* Escalate Threshold */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Escalate Threshold</Label>
                    <span className="font-mono text-sm">{(options.escalateThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[options.escalateThreshold]}
                    onValueChange={([value]) => setOptions(prev => ({ ...prev, escalateThreshold: value }))}
                    min={0.1}
                    max={0.9}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">Trigger human review if confidence &lt; this with disagreement</p>
                </div>

                <Separator />

                {/* Max Retries */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Max Retries</Label>
                    <span className="font-mono text-sm">{options.maxRetries}</span>
                  </div>
                  <Slider
                    value={[options.maxRetries]}
                    onValueChange={([value]) => setOptions(prev => ({ ...prev, maxRetries: value }))}
                    min={0}
                    max={5}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Retry failed paradigm executions (0-5)</p>
                </div>

                <Separator />

                {/* Retry on Low Confidence */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Retry on Low Confidence</Label>
                      <p className="text-xs text-muted-foreground">Retry all paradigms if confidence is too low</p>
                    </div>
                    <Switch
                      checked={options.retryOnLowConfidence}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, retryOnLowConfidence: checked }))}
                    />
                  </div>
                  {options.retryOnLowConfidence && (
                    <div className="space-y-2 pl-4 border-l-2 border-muted">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Min Confidence Target</Label>
                        <span className="font-mono text-sm">{(options.minConfidence * 100).toFixed(0)}%</span>
                      </div>
                      <Slider
                        value={[options.minConfidence]}
                        onValueChange={([value]) => setOptions(prev => ({ ...prev, minConfidence: value }))}
                        min={0.5}
                        max={0.99}
                        step={0.01}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            )}
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
                <ButtonSpinner />
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
                  <Spinner size="sm" className="text-blue-500" />
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
                    <VerdictIcon verdict={result.verdict} size="lg" />
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
                        <VerdictIcon verdict={pr.verdict} />
                        <div>
                          <p className="font-medium">
                            {METHOD_INFO[pr.paradigm]?.name || pr.paradigm}
                          </p>
                          {pr.error ? (
                            <p className="text-xs text-red-500">{pr.error}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {truncateString(pr.reasoning, 80, true)}
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Copy, Code, Info, Settings2, Check } from 'lucide-react';
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
import { ButtonSpinner, Spinner } from '@/components/ui/loading-spinner';
import { useVerificationStatus, useCopyToClipboard } from '@/hooks';
import { markOnboardingStep } from '@/app/dashboard/actions';
import { VerdictIcon, getVerdictColor, type VerdictDisplay } from '@/components/ui/verdict-display';
import { truncateString } from '@/lib/api/formatters';
import { getErrorMessage } from '@/lib/utils';
import type { VerificationStatus, Decision } from '@/lib/api/types';
import { MethodSettingsDialog, type MethodKey, type MethodOverride } from './method-settings-dialog';
import { getProviderLabel } from '@/lib/llm/provider-ui-config';
import type { LLMProvider } from '@/lib/llm/types';

// =============================================================================
// TYPES
// =============================================================================

interface MethodConfig {
  enabled: boolean;
  weight: number;
  provider?: LLMProvider;
  model?: string;
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
    description: 'Boltzmann energy-based embedding analysis',
    fpr: '~20-30%',
    latency: '<15ms',
  },
  reasoning: {
    name: 'LLM Reasoning',
    description: 'Adaptive self-refinement verification',
    fpr: '~4-5%',
    latency: '2-5s',
  },
  tool: {
    name: 'Tool-Augmented',
    description: 'CLoVE contrastive web verification',
    fpr: '~1%',
    latency: '1-2s',
  },
  biprm: {
    name: 'Bidirectional',
    description: 'Parallel bidirectional step-level scoring',
    fpr: '~5-7%',
    latency: '2-3.5s',
  },
  ensemble: {
    name: 'Multi-Model',
    description: 'Meta-judge adjudicated consensus',
    fpr: '~15-20%',
    latency: '5-12s',
  },
  entropy: {
    name: 'Semantic Entropy',
    description: 'Dual-path semantic entropy',
    fpr: '~8-10%',
    latency: '<100ms',
  },
  formal: {
    name: 'Formal Verification',
    description: 'Autoformalized mathematical verification',
    fpr: '0%',
    latency: 'Variable',
  },
};

const DEFAULT_METHODS: MethodsState = {
  semantic: { enabled: false, weight: 0.2 },
  reasoning: { enabled: true, weight: 0.5 },
  tool: { enabled: true, weight: 0.5 },
  biprm: { enabled: false, weight: 0.2 },
  ensemble: { enabled: false, weight: 0.2 },
  entropy: { enabled: false, weight: 0.2 },
  formal: { enabled: false, weight: 0.2 },
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
  const [settingsMethod, setSettingsMethod] = useState<keyof MethodsState | null>(null);
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

  const handleMethodSettingsSave = (method: keyof MethodsState, override: MethodOverride) => {
    setMethods((prev) => ({
      ...prev,
      [method]: { ...prev[method], provider: override.provider, model: override.model },
    }));
  };

  const buildMethodOverrides = (): Record<string, { provider?: string; model?: string }> | undefined => {
    const overrides: Record<string, { provider?: string; model?: string }> = {};
    for (const [key, value] of Object.entries(methods)) {
      if (value.enabled && (value.provider || value.model)) {
        overrides[key] = {};
        if (value.provider) overrides[key].provider = value.provider;
        if (value.model) overrides[key].model = value.model;
      }
    }
    return Object.keys(overrides).length > 0 ? overrides : undefined;
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
    const methodOverrides = buildMethodOverrides();

    const bodyObj: Record<string, unknown> = {
      content,
      methods: methodsConfig,
    };
    if (optionsConfig) {
      bodyObj.options = optionsConfig;
    }
    if (methodOverrides) {
      bodyObj.methodOverrides = methodOverrides;
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
    const methodOverrides = buildMethodOverrides();

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
      if (methodOverrides) {
        body.methodOverrides = methodOverrides;
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

  const enabledMethods = Object.values(methods).filter((m) => m.enabled);
  const enabledMethodsCount = enabledMethods.length;
  const weightSum = Math.round(enabledMethods.reduce((s, m) => s + m.weight, 0) * 100) / 100;
  const weightsValid = Math.abs(weightSum - 1) < 0.001;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Playground</h1>
        <p className="text-sm text-muted-foreground">Test verification methods interactively</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.5fr]">
        {/* Left Column - Configuration */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {/* Methods Configuration */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Verification Methods</CardTitle>
                  <CardDescription className="text-xs">Select methods and weights</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <TooltipProvider>
                {(Object.keys(methods) as Array<keyof MethodsState>).map((method) => {
                  const info = METHOD_INFO[method];
                  const config = methods[method];

                  return (
                    <div
                      key={method}
                      className={`rounded-md border px-3 py-2.5 transition-colors ${
                        config.enabled ? 'border-primary/20 bg-muted/50' : 'bg-background'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={config.enabled}
                            onCheckedChange={() => handleMethodToggle(method)}
                          />
                          <Label className="text-sm font-medium">{info.name}</Label>
                          <Tooltip>
                            <TooltipTrigger aria-label={`${info.name} info`}>
                              <Info aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">{info.description}</p>
                              <p className="mt-1 text-xs">
                                FPR: {info.fpr} | Latency: {info.latency}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="relative h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSettingsMethod(method);
                                }}
                                aria-label={`${info.name} settings`}
                              >
                                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                                {config.provider ? (
                                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary">
                                    <Check className="h-2 w-2 text-primary-foreground" />
                                  </span>
                                ) : (
                                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {config.provider ? (
                                <p className="text-xs">
                                  {getProviderLabel(config.provider)}
                                  {config.model ? ` / ${config.model}` : ''}
                                </p>
                              ) : (
                                <p className="text-xs">No model configured</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                          <Badge variant="outline" className="text-xs">{info.fpr}</Badge>
                          <Badge variant="secondary" className="text-xs">{info.latency}</Badge>
                        </div>
                      </div>

                      {config.enabled && (
                        <div className="mt-3 flex items-center gap-3">
                          <span className="w-14 text-xs text-muted-foreground">Weight:</span>
                          <Slider
                            value={[config.weight]}
                            onValueChange={([value]) => handleWeightChange(method, value)}
                            min={0.01}
                            max={1}
                            step={0.01}
                            className="flex-1"
                          />
                          <span className="w-10 font-mono text-xs">{config.weight.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </TooltipProvider>
              {enabledMethodsCount > 0 && (
                <div className={`mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
                  weightsValid ? 'border-primary/20 bg-primary/5 text-primary' : 'border-destructive/30 bg-destructive/5 text-destructive'
                }`}>
                  <span>Weights must equal 1.0</span>
                  <span className="font-mono font-medium">
                    {weightSum.toFixed(2)} / 1.00
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card>
            <CardHeader
              className="cursor-pointer py-3 px-4"
              onClick={() => setOptions(prev => ({ ...prev, showAdvanced: !prev.showAdvanced }))}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOptions(prev => ({ ...prev, showAdvanced: !prev.showAdvanced })); }}}
              role="button"
              tabIndex={0}
              aria-expanded={options.showAdvanced}
              aria-label="Toggle advanced options"
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Advanced Options</CardTitle>
                  <CardDescription className="text-xs">Thresholds and retry behavior</CardDescription>
                </div>
                <Switch
                  checked={options.showAdvanced}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, showAdvanced: checked }))}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CardHeader>
            {options.showAdvanced && (
              <CardContent className="p-4 pt-0 space-y-4">
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
                </div>

                <Separator />

                {/* Retry on Low Confidence */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Retry on Low Confidence</Label>
                    <Switch
                      checked={options.retryOnLowConfidence}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, retryOnLowConfidence: checked }))}
                    />
                  </div>
                  {options.retryOnLowConfidence && (
                    <div className="space-y-2 pl-4 border-l-2 border-muted">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Min Confidence</Label>
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
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim() || enabledMethodsCount === 0 || !weightsValid}
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

        {/* Right Column - Input & Results */}
        <div className="space-y-4">
          {/* Content Input */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Content to Verify</CardTitle>
              <CardDescription className="text-xs">Enter claim or statement</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Textarea
                placeholder="The Eiffel Tower is located in Paris, France and was completed in 1889..."
                className="min-h-[100px] font-mono text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{content.length} characters</span>
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
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs max-h-[150px]">
                    {generateCodeSnippet()}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Processing Status */}
          {isSubmitting && !result && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Processing</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex items-center gap-3">
                  <Spinner size="sm" className="text-primary" />
                  <span className="text-sm">Running verification methods...</span>
                </div>
                {liveStatus.progress.total > 0 && (
                  <>
                    <Progress
                      value={(liveStatus.progress.completed / liveStatus.progress.total) * 100}
                    />
                    <p className="text-xs text-muted-foreground">
                      {liveStatus.progress.completed} of {liveStatus.progress.total} completed
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
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Verification Result</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="mb-3 flex items-center gap-4">
                    <VerdictIcon verdict={result.verdict} size="lg" />
                    <div>
                      <p className={`text-2xl font-bold ${getVerdictColor(result.verdict)}`}>
                        {result.verdict
                          ? result.verdict.charAt(0).toUpperCase() + result.verdict.slice(1)
                          : 'Pending'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(result.confidence * 100).toFixed(1)}% confidence
                      </p>
                    </div>
                    <div className="ml-auto">
                      <Badge
                        className={`text-xs ${
                          result.decision === 'accept'
                            ? 'bg-success/10 text-success'
                            : result.decision === 'reject'
                              ? 'bg-destructive/10 text-destructive'
                              : result.decision === 'escalate'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-info/10 text-info'
                        }`}
                      >
                        {result.decision}
                      </Badge>
                    </div>
                  </div>

                  <Progress value={result.confidence * 100} className="mb-3" />

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{result.processingTimeMs}ms</span>
                    <span>•</span>
                    <span>${(result.costCents / 100).toFixed(4)}</span>
                    <span>•</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => router.push(`/dashboard/verify/${result.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Paradigm Results */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Method Results</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {result.paradigmResults.map((pr) => (
                    <div
                      key={pr.paradigm}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <VerdictIcon verdict={pr.verdict} />
                        <div>
                          <p className="text-sm font-medium">
                            {METHOD_INFO[pr.paradigm]?.name || pr.paradigm}
                          </p>
                          {pr.error ? (
                            <p className="text-xs text-destructive">{pr.error}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {truncateString(pr.reasoning, 60, true)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getVerdictColor(pr.verdict)}`}>
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
                  <Play className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  <p className="text-sm">Enter content and click Verify to see results</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Method Settings Dialog */}
      {settingsMethod && (
        <MethodSettingsDialog
          open={!!settingsMethod}
          onOpenChange={(open) => { if (!open) setSettingsMethod(null); }}
          methodKey={settingsMethod as MethodKey}
          methodName={METHOD_INFO[settingsMethod]?.name ?? settingsMethod}
          provider={methods[settingsMethod].provider}
          model={methods[settingsMethod].model}
          onSave={(override) => handleMethodSettingsSave(settingsMethod, override)}
        />
      )}
    </div>
  );
}

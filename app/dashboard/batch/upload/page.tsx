'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Info,
  Settings2,
  Check,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getErrorMessage } from '@/lib/utils';
import {
  MethodSettingsDialog,
  type MethodKey,
  type MethodOverride,
  type EnsembleMemberConfig,
} from '@/app/dashboard/playground/method-settings-dialog';
import { getProviderLabel } from '@/lib/llm/provider-ui-config';
import type { LLMProvider } from '@/lib/llm/types';

// =============================================================================
// TYPES
// =============================================================================

interface UploadResult {
  fileId: string;
  originalFileName: string;
  format: string;
  itemCount: number;
  validationErrors: { row: number; error: string }[];
  expiresAt: string;
}

interface MethodConfig {
  enabled: boolean;
  weight: number;
  provider?: LLMProvider;
  model?: string;
  members?: EnsembleMemberConfig[];
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

interface ApiKeyCredentialInfo {
  id: string;
  providerCredentialId: string;
  isDefault: boolean;
  credential: {
    id: string;
    name: string;
    provider: string;
    isActive: boolean;
  } | null;
}

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  credentials?: ApiKeyCredentialInfo[];
  isActive: boolean;
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

export default function BatchUploadPage() {
  const router = useRouter();

  // Form state
  const [batchName, setBatchName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [methods, setMethods] = useState<MethodsState>(DEFAULT_METHODS);
  const [options, setOptions] = useState<OptionsState>(DEFAULT_OPTIONS);
  const [settingsMethod, setSettingsMethod] = useState<keyof MethodsState | null>(null);

  // API key state
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  // Loading states
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch API keys on mount
  useEffect(() => {
    fetch('/api/dashboard/keys')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { keys: ApiKeyInfo[] }) => {
        const active = data.keys.filter((k) => k.isActive);
        setApiKeys(active);
        if (active.length === 1) {
          setSelectedKeyId(active[0].id);
        }
      })
      .catch(() => {
        /* keys will remain empty */
      });
  }, []);

  const selectedKey = useMemo(
    () => apiKeys.find((k) => k.id === selectedKeyId) ?? null,
    [apiKeys, selectedKeyId]
  );

  const userProviders = useMemo<LLMProvider[]>(() => {
    if (!selectedKey?.credentials) return [];
    const providers = selectedKey.credentials
      .filter((c) => c.credential?.isActive)
      .map((c) => c.credential!.provider as LLMProvider);
    return [...new Set(providers)];
  }, [selectedKey]);

  // ==========================================================================
  // FILE HANDLING
  // ==========================================================================

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['text/csv', 'application/json', 'text/plain'];
    const validExtensions = ['.csv', '.json'];
    const hasValidExtension = validExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!validTypes.includes(selectedFile.type) && !hasValidExtension) {
      setError('Please upload a CSV or JSON file');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setUploadResult(null);
    await uploadFile(selectedFile);
  };

  const uploadFile = async (fileToUpload: File) => {
    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await fetch('/api/dashboard/batch/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Upload failed');
      }

      setUploadResult(data);

      if (!batchName) {
        const nameWithoutExt = fileToUpload.name.replace(/\.[^/.]+$/, '');
        setBatchName(nameWithoutExt);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Upload failed'));
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadResult(null);
    setError(null);
  };

  // ==========================================================================
  // METHOD HANDLERS
  // ==========================================================================

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
    if (method === 'ensemble' && override.members) {
      setMethods((prev) => ({
        ...prev,
        ensemble: { ...prev.ensemble, members: override.members },
      }));
    } else {
      setMethods((prev) => ({
        ...prev,
        [method]: { ...prev[method], provider: override.provider, model: override.model },
      }));
    }
  };

  // ==========================================================================
  // BUILD PAYLOADS
  // ==========================================================================

  const buildMethodOverrides = ():
    | Record<
        string,
        { provider?: string; model?: string; members?: Array<{ provider: string; model: string }> }
      >
    | undefined => {
    const overrides: Record<
      string,
      { provider?: string; model?: string; members?: Array<{ provider: string; model: string }> }
    > = {};
    for (const [key, value] of Object.entries(methods)) {
      if (!value.enabled) continue;
      if (key === 'ensemble' && value.members) {
        const configured = value.members.filter(
          (m: EnsembleMemberConfig) => m.provider && m.model
        );
        if (configured.length >= 2) {
          overrides[key] = { members: configured };
        }
      } else if (value.provider || value.model) {
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

  // ==========================================================================
  // SUBMIT
  // ==========================================================================

  const handleSubmit = async () => {
    if (!uploadResult) {
      setError('Please upload a file first');
      return;
    }

    const methodsConfig = buildMethodsConfig();
    if (Object.keys(methodsConfig).length === 0) {
      setError('Please enable at least one verification method');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const optionsConfig = buildOptionsConfig();
      const methodOverrides = buildMethodOverrides();

      const body: Record<string, unknown> = {
        name: batchName || uploadResult.originalFileName,
        fileId: uploadResult.fileId,
        methods: methodsConfig,
      };
      if (selectedKey) {
        body.apiKeyId = selectedKey.id;
      }
      if (optionsConfig) {
        body.options = optionsConfig;
      }
      if (methodOverrides) {
        body.methodOverrides = methodOverrides;
      }

      const response = await fetch('/api/dashboard/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create batch');
      }

      router.push(`/dashboard/batch/${data.id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create batch'));
    } finally {
      setIsCreating(false);
    }
  };

  // ==========================================================================
  // VALIDATION COMPUTATIONS
  // ==========================================================================

  const enabledEntries = (
    Object.entries(methods) as Array<[keyof MethodsState, MethodConfig]>
  ).filter(([, m]) => m.enabled);
  const enabledMethodsCount = enabledEntries.length;
  const weightSum =
    Math.round(enabledEntries.reduce((s, [, m]) => s + m.weight, 0) * 100) / 100;
  const weightsValid = Math.abs(weightSum - 1) < 0.001;
  const unconfiguredMethods = enabledEntries
    .filter(([k, m]) => {
      if (k === 'ensemble') {
        const configured = (m.members ?? []).filter((mem) => mem.provider && mem.model);
        return configured.length < 2;
      }
      return !m.provider;
    })
    .map(([k]) => METHOD_INFO[k].name);
  const allConfigured = unconfiguredMethods.length === 0;

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/batch')}
          aria-label="Go back to batch jobs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Create Batch Job</h1>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p className="flex-1">{error}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {/* File Upload */}
        <Card>
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Upload File</h3>
            <p className="text-xs text-muted-foreground">CSV or JSON (max 100 items, 10MB)</p>
          </div>
          <div className="p-4">
            {!file ? (
              <div className="relative">
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Upload CSV or JSON file for batch processing"
                  id="batch-file-input"
                />
                <div
                  className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 p-8 text-center hover:border-muted-foreground/50"
                  aria-hidden="true"
                >
                  <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop file or click to browse</p>
                  <p className="text-xs text-muted-foreground">CSV and JSON supported</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md bg-muted p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUploading ? (
                      <Spinner size="xs" className="h-4 w-4 text-primary" />
                    ) : uploadResult ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={clearFile}
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {uploadResult && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{uploadResult.format.toUpperCase()}</Badge>
                      <span className="text-sm">
                        <strong>{uploadResult.itemCount}</strong> items
                      </span>
                    </div>
                    {uploadResult.validationErrors.length > 0 && (
                      <div className="rounded-md border border-warning/30 bg-warning/5 p-3">
                        <p className="text-sm font-medium text-warning">
                          {uploadResult.validationErrors.length} warning(s)
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-warning/80">
                          {uploadResult.validationErrors.slice(0, 3).map((err, i) => (
                            <li key={i}>
                              Row {err.row}: {err.error}
                            </li>
                          ))}
                          {uploadResult.validationErrors.length > 3 && (
                            <li>...{uploadResult.validationErrors.length - 3} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* API Key Selector */}
        <Card>
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">API Key</h3>
            <p className="text-xs text-muted-foreground">Select key for provider credentials</p>
          </div>
          <div className="p-4">
            {apiKeys.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                <Key className="h-4 w-4" />
                <span>
                  No API keys found.{' '}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => router.push('/dashboard/keys')}
                  >
                    Create one
                  </Button>
                </span>
              </div>
            ) : (
              <Select value={selectedKeyId ?? ''} onValueChange={setSelectedKeyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an API key" />
                </SelectTrigger>
                <SelectContent>
                  {apiKeys.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      {key.name} ({key.keyPrefix}...)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </Card>

        {/* Batch Settings */}
        <Card>
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Batch Settings</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batchName" className="text-sm">
                Batch Name (optional)
              </Label>
              <Input
                id="batchName"
                placeholder="Enter a name"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Verification Methods */}
        <Card>
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Verification Methods</h3>
            <p className="text-xs text-muted-foreground">Select methods and weights</p>
          </div>
          <div className="p-4 space-y-3">
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
                              {(method === 'ensemble'
                                ? (config.members ?? []).filter((m) => m.provider && m.model)
                                    .length >= 2
                                : !!config.provider) ? (
                                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary">
                                  <Check className="h-2 w-2 text-primary-foreground" />
                                </span>
                              ) : (
                                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {method === 'ensemble' ? (
                              (() => {
                                const configured = (config.members ?? []).filter(
                                  (m) => m.provider && m.model
                                );
                                return configured.length >= 2 ? (
                                  <div className="text-xs space-y-0.5">
                                    {configured.map((m, i) => (
                                      <p key={i}>
                                        {getProviderLabel(m.provider)} / {m.model}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs">No models configured</p>
                                );
                              })()
                            ) : config.provider ? (
                              <p className="text-xs">
                                {getProviderLabel(config.provider)}
                                {config.model ? ` / ${config.model}` : ''}
                              </p>
                            ) : (
                              <p className="text-xs">No model configured</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                        <Badge variant="outline" className="text-xs">
                          {info.fpr}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {info.latency}
                        </Badge>
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
                        <input
                          type="number"
                          value={config.weight}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v >= 0 && v <= 1)
                              handleWeightChange(method, Math.round(v * 100) / 100);
                          }}
                          min={0}
                          max={1}
                          step={0.01}
                          className="w-14 rounded border bg-background px-1.5 py-0.5 text-center font-mono text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </TooltipProvider>

            {enabledMethodsCount > 0 && (
              <div className="mt-3 space-y-2">
                <div
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
                    weightsValid
                      ? 'border-primary/20 bg-primary/5 text-primary'
                      : 'border-destructive/30 bg-destructive/5 text-destructive'
                  }`}
                >
                  <span>Weights must equal 1.0</span>
                  <span className="font-mono font-medium">{weightSum.toFixed(2)} / 1.00</span>
                </div>
                {!allConfigured && (
                  <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    <span>Missing provider: {unconfiguredMethods.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Advanced Options - Collapsible */}
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
            <span>Advanced Options</span>
            <svg
              className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </summary>
          <Card className="mt-3">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label id="accept-threshold-label" className="text-sm">
                    Accept Threshold
                  </Label>
                  <span className="font-mono text-sm">
                    {(options.acceptThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  aria-labelledby="accept-threshold-label"
                  value={[options.acceptThreshold]}
                  onValueChange={([value]) =>
                    setOptions((prev) => ({ ...prev, acceptThreshold: value }))
                  }
                  min={0.5}
                  max={1}
                  step={0.05}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label id="escalate-threshold-label" className="text-sm">
                    Escalate Threshold
                  </Label>
                  <span className="font-mono text-sm">
                    {(options.escalateThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  aria-labelledby="escalate-threshold-label"
                  value={[options.escalateThreshold]}
                  onValueChange={([value]) =>
                    setOptions((prev) => ({ ...prev, escalateThreshold: value }))
                  }
                  min={0.1}
                  max={0.9}
                  step={0.05}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label id="max-retries-label" className="text-sm">
                    Max Retries
                  </Label>
                  <span className="font-mono text-sm">{options.maxRetries}</span>
                </div>
                <Slider
                  aria-labelledby="max-retries-label"
                  value={[options.maxRetries]}
                  onValueChange={([value]) =>
                    setOptions((prev) => ({ ...prev, maxRetries: value }))
                  }
                  min={0}
                  max={5}
                  step={1}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label id="retry-low-confidence-label" className="text-sm">
                    Retry on Low Confidence
                  </Label>
                  <Switch
                    aria-labelledby="retry-low-confidence-label"
                    checked={options.retryOnLowConfidence}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, retryOnLowConfidence: checked }))
                    }
                  />
                </div>
                {options.retryOnLowConfidence && (
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    <div className="flex items-center justify-between">
                      <Label id="min-confidence-label" className="text-sm">
                        Min Confidence Target
                      </Label>
                      <span className="font-mono text-sm">
                        {(options.minConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Slider
                      aria-labelledby="min-confidence-label"
                      value={[options.minConfidence]}
                      onValueChange={([value]) =>
                        setOptions((prev) => ({ ...prev, minConfidence: value }))
                      }
                      min={0.5}
                      max={0.99}
                      step={0.01}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </details>

        {/* File Format Help - Collapsible */}
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
            <span>File Format Help</span>
            <svg
              className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </summary>
          <Card className="mt-3">
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">CSV</p>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{`content,context.source
"Claim to verify","Wikipedia"`}</pre>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">JSON</p>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{`[{"content": "Claim", "context": {"source": "Wiki"}}]`}</pre>
              </div>
            </div>
          </Card>
        </details>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/batch')}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={
              !uploadResult ||
              isCreating ||
              enabledMethodsCount === 0 ||
              !weightsValid ||
              !allConfigured ||
              !selectedKey
            }
          >
            {isCreating ? (
              <>
                <Spinner size="xs" className="mr-2" />
                Creating...
              </>
            ) : (
              <>
                Create ({enabledMethodsCount} method{enabledMethodsCount !== 1 ? 's' : ''},{' '}
                {uploadResult?.itemCount || 0} items)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Method Settings Dialog */}
      {settingsMethod && (
        <MethodSettingsDialog
          open={!!settingsMethod}
          onOpenChange={(open) => {
            if (!open) setSettingsMethod(null);
          }}
          methodKey={settingsMethod as MethodKey}
          methodName={METHOD_INFO[settingsMethod]?.name ?? settingsMethod}
          provider={methods[settingsMethod].provider}
          model={methods[settingsMethod].model}
          members={methods[settingsMethod].members}
          onSave={(override) => handleMethodSettingsSave(settingsMethod, override)}
          userProviders={userProviders}
        />
      )}
    </div>
  );
}

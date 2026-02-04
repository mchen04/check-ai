'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Copy, Check, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { getErrorMessage } from '@/lib/utils';
import { ButtonSpinner, Spinner } from '@/components/ui/loading-spinner';
import { useCopyToClipboard } from '@/hooks';
import { InlineError } from '@/components/ui/empty-state';
import { AlertBanner } from '@/components/ui/alert-banner';
import {
  type ParadigmType,
  PARADIGM_DISPLAY_NAMES,
  PARADIGM_DESCRIPTIONS,
  ALL_PARADIGMS,
} from '@/lib/verification/types';
import { getModelsForProvider, isModelCompatibleWithProvider } from '@/lib/llm/config';
import { DEFAULT_MODELS } from '@/lib/api-keys/types';
import type { LLMProvider } from '@/lib/llm/types';

interface ProviderCredential {
  id: string;
  name: string;
  provider: string;
}

type PlanType = 'free' | 'pro' | 'enterprise';

interface ParadigmState {
  enabled: boolean;
  model: string;
  weight: number;
}

// Methods allowed per plan tier
const PLAN_ALLOWED_METHODS: Record<PlanType, readonly ParadigmType[]> = {
  free: ['semantic'],
  pro: ['semantic', 'reasoning', 'tool', 'biprm', 'ensemble', 'entropy', 'formal'],
  enterprise: ['semantic', 'reasoning', 'tool', 'biprm', 'ensemble', 'entropy', 'formal'],
};

export default function CreateApiKeyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const { copied, copy } = useCopyToClipboard();
  const [error, setError] = useState<string | null>(null);

  // Provider credentials state
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);

  // Plan type state
  const [planType, setPlanType] = useState<PlanType>('free');
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // Paradigm configs - keyed by paradigm type
  const [paradigmConfigs, setParadigmConfigs] = useState<Record<ParadigmType, ParadigmState>>(() =>
    initializeParadigmConfigs()
  );

  // Escalation threshold (0-1, default 0.5)
  const [escalateThreshold, setEscalateThreshold] = useState(0.5);

  // Advanced settings visibility
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get the selected credential's provider
  const selectedCredential = useMemo(
    () => credentials.find((c) => c.id === selectedCredentialId),
    [credentials, selectedCredentialId]
  );
  const selectedProvider = selectedCredential?.provider as LLMProvider | undefined;

  // Get available models for the selected provider, split by type
  const embeddingModels = useMemo(() => {
    if (!selectedProvider) return [];
    return getModelsForProvider(selectedProvider, { embeddingOnly: true });
  }, [selectedProvider]);

  const chatModels = useMemo(() => {
    if (!selectedProvider) return [];
    return getModelsForProvider(selectedProvider, { excludeEmbedding: true });
  }, [selectedProvider]);

  // Check if at least one paradigm is enabled
  const hasEnabledParadigm = useMemo(
    () => Object.values(paradigmConfigs).some((config) => config.enabled),
    [paradigmConfigs]
  );

  // Count enabled paradigms for showing advanced settings
  const enabledParadigmCount = useMemo(
    () => Object.values(paradigmConfigs).filter((config) => config.enabled).length,
    [paradigmConfigs]
  );

  // Fetch credentials and plan when dialog opens (in parallel per async-parallel rule)
  useEffect(() => {
    if (open) {
      // Run both fetches in parallel - they are independent operations
      const fetchData = async () => {
        await Promise.all([
          credentials.length === 0 ? fetchCredentials() : Promise.resolve(),
          fetchPlanType(),
        ]);
      };
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Update models when provider changes
  useEffect(() => {
    if (selectedProvider) {
      setParadigmConfigs((prev) => {
        const updated = { ...prev };
        for (const paradigm of ALL_PARADIGMS) {
          const currentModel = prev[paradigm].model;
          // Determine the correct model list based on paradigm type
          const modelsForParadigm = paradigm === 'semantic' ? embeddingModels : chatModels;

          // If current model is not in the available models, reset to first available
          if (modelsForParadigm.length > 0 && !modelsForParadigm.includes(currentModel)) {
            const defaultModel = DEFAULT_MODELS[paradigm];
            updated[paradigm] = {
              ...prev[paradigm],
              model: modelsForParadigm.includes(defaultModel)
                ? defaultModel
                : modelsForParadigm[0],
            };
          }
        }
        return updated;
      });
    }
  }, [selectedProvider, embeddingModels, chatModels]);

  function initializeParadigmConfigs(): Record<ParadigmType, ParadigmState> {
    const configs: Record<ParadigmType, ParadigmState> = {} as Record<ParadigmType, ParadigmState>;
    for (const paradigm of ALL_PARADIGMS) {
      configs[paradigm] = {
        enabled: paradigm === 'semantic', // Default to semantic enabled
        model: DEFAULT_MODELS[paradigm] || 'anthropic/claude-3.5-sonnet',
        weight: 1.0, // Default equal weights
      };
    }
    return configs;
  }

  const fetchCredentials = async () => {
    setIsLoadingCredentials(true);
    try {
      const response = await fetch('/api/dashboard/provider-credentials');
      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials || []);
        // Auto-select first credential if available
        if (data.credentials?.length > 0 && !selectedCredentialId) {
          setSelectedCredentialId(data.credentials[0].id);
        }
      }
    } catch {
      // Fetch errors are handled silently - empty state will be shown
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const fetchPlanType = async () => {
    setIsLoadingPlan(true);
    try {
      const response = await fetch('/api/dashboard/settings/organization');
      if (response.ok) {
        const data = await response.json();
        setPlanType(data.planType || 'free');
      }
    } catch {
      // Default to free on error
      setPlanType('free');
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const isParadigmAllowed = (paradigm: ParadigmType): boolean => {
    return PLAN_ALLOWED_METHODS[planType].includes(paradigm);
  };

  const toggleParadigm = useCallback(
    (paradigm: ParadigmType) => {
      if (!PLAN_ALLOWED_METHODS[planType].includes(paradigm)) return;

      setParadigmConfigs((prev) => ({
        ...prev,
        [paradigm]: {
          ...prev[paradigm],
          enabled: !prev[paradigm].enabled,
        },
      }));
    },
    [planType]
  );

  const updateParadigmModel = useCallback((paradigm: ParadigmType, model: string) => {
    setParadigmConfigs((prev) => ({
      ...prev,
      [paradigm]: {
        ...prev[paradigm],
        model,
      },
    }));
  }, []);

  const updateParadigmWeight = useCallback((paradigm: ParadigmType, weight: number) => {
    setParadigmConfigs((prev) => ({
      ...prev,
      [paradigm]: {
        ...prev[paradigm],
        weight,
      },
    }));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter a name for the API key');
      return;
    }

    if (!selectedCredentialId) {
      setError('Please select a provider credential');
      return;
    }

    if (!hasEnabledParadigm) {
      setError('At least one verification method must be enabled');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Build paradigm config from enabled paradigms
      const paradigmConfig: Record<string, { enabled: boolean; weight: number; model: string }> =
        {};
      for (const paradigm of ALL_PARADIGMS) {
        if (paradigmConfigs[paradigm].enabled) {
          paradigmConfig[paradigm] = {
            enabled: true,
            weight: paradigmConfigs[paradigm].weight,
            model: paradigmConfigs[paradigm].model,
          };
        }
      }

      const response = await fetch('/api/dashboard/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          providerCredentialIds: [selectedCredentialId],
          paradigmConfig,
          defaultThresholds: {
            escalateThreshold,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create API key');
      }

      const data = await response.json();
      setNewKey(data.apiKey);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to create API key'));
    } finally {
      setIsCreating(false);
    }
  }, [name, selectedCredentialId, hasEnabledParadigm, paradigmConfigs, escalateThreshold]);

  const handleCopy = useCallback(() => {
    if (newKey) {
      copy(newKey);
    }
  }, [newKey, copy]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setName('');
    setNewKey(null);
    setError(null);
    setSelectedCredentialId(credentials[0]?.id || '');
    setParadigmConfigs(initializeParadigmConfigs());
    setEscalateThreshold(0.5);
    setShowAdvanced(false);
    if (newKey) {
      router.refresh();
    }
  }, [credentials, newKey, router]);

  const handleCancel = () => {
    setOpen(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleCreate();
    },
    [handleCreate]
  );

  const noCredentials = !isLoadingCredentials && credentials.length === 0;
  const isLoading = isLoadingCredentials || isLoadingPlan;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[550px]">
        {!newKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>Create a new API key to access the Check API</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="default" />
                </div>
              ) : noCredentials ? (
                <AlertBanner variant="warning" title="No provider credentials found">
                  You need to add a provider credential (like OpenRouter, OpenAI, or Anthropic) in
                  Settings before creating an API key.
                </AlertBanner>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Production API Key"
                      value={name}
                      onChange={handleNameChange}
                      onKeyDown={handleNameKeyDown}
                    />
                    <p className="text-xs text-muted-foreground">
                      Give your key a descriptive name so you can identify it later
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="credential">Provider Credential</Label>
                    <Select value={selectedCredentialId} onValueChange={setSelectedCredentialId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider credential" />
                      </SelectTrigger>
                      <SelectContent>
                        {credentials.map((cred) => (
                          <SelectItem key={cred.id} value={cred.id}>
                            {cred.name} ({cred.provider})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the LLM provider credential this API key will use
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Verification Methods</Label>
                    <div className="space-y-2">
                      {ALL_PARADIGMS.map((paradigm) => {
                        const isAllowed = isParadigmAllowed(paradigm);
                        const config = paradigmConfigs[paradigm];

                        return (
                          <div
                            key={paradigm}
                            className={`rounded-lg border p-3 ${!isAllowed ? 'bg-muted/50 opacity-60' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">
                                    {PARADIGM_DISPLAY_NAMES[paradigm]}
                                  </p>
                                  {!isAllowed && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                      <Crown className="h-3 w-3" />
                                      Pro
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {PARADIGM_DESCRIPTIONS[paradigm]}
                                </p>
                              </div>
                              <Switch
                                checked={config.enabled}
                                onCheckedChange={() => toggleParadigm(paradigm)}
                                disabled={!isAllowed}
                              />
                            </div>

                            {/* Model selector - only show when enabled and allowed */}
                            {config.enabled && isAllowed && (() => {
                              const modelsForParadigm = paradigm === 'semantic' ? embeddingModels : chatModels;
                              return modelsForParadigm.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <Label className="text-xs text-muted-foreground">Model</Label>
                                  <Select
                                    value={config.model}
                                    onValueChange={(model) => updateParadigmModel(paradigm, model)}
                                  >
                                    <SelectTrigger className="mt-1 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {modelsForParadigm.map((model) => (
                                        <SelectItem key={model} value={model} className="text-xs">
                                          {model}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                    {planType === 'free' && (
                      <p className="text-xs text-muted-foreground">
                        <a href="/dashboard/settings/billing" className="text-primary underline">
                          Upgrade to Pro
                        </a>{' '}
                        to unlock all verification methods.
                      </p>
                    )}
                  </div>

                  {/* Escalation Threshold */}
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Escalation Threshold</Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(escalateThreshold * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[escalateThreshold * 100]}
                      onValueChange={([v]) => setEscalateThreshold(v / 100)}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-escalate verifications below this confidence level
                    </p>
                  </div>

                  {/* Advanced Settings - Paradigm Weights */}
                  {enabledParadigmCount >= 2 && (
                    <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex w-full items-center justify-between px-0 hover:bg-transparent"
                        >
                          <span className="text-sm font-medium">Advanced Settings</span>
                          {showAdvanced ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 pt-2">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Paradigm Weights
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Adjust relative importance of each verification method
                          </p>
                        </div>
                        {ALL_PARADIGMS.filter(
                          (paradigm) =>
                            paradigmConfigs[paradigm].enabled && isParadigmAllowed(paradigm)
                        ).map((paradigm) => (
                          <div key={paradigm} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{PARADIGM_DISPLAY_NAMES[paradigm]}</span>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(paradigmConfigs[paradigm].weight * 100)}%
                              </span>
                            </div>
                            <Slider
                              value={[paradigmConfigs[paradigm].weight * 100]}
                              onValueChange={([v]) => updateParadigmWeight(paradigm, v / 100)}
                              min={0}
                              max={100}
                              step={5}
                            />
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </>
              )}
              <InlineError message={error} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating || noCredentials || isLoading}>
                {isCreating && <ButtonSpinner />}
                {isCreating ? 'Creating...' : 'Create Key'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Copy your new API key. You won&apos;t be able to see it again!
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="rounded-lg border bg-muted p-4">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Your API Key</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all font-mono text-sm">{newKey}</code>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <AlertBanner variant="warning" className="mt-4">
                Make sure to copy your API key now. You won&apos;t be able to see it again.
              </AlertBanner>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

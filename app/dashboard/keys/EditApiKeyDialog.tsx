'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { InlineError } from '@/components/ui/empty-state';
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
  isActive: boolean;
}

interface ApiKeyCredential {
  id: string;
  providerCredentialId: string;
  isDefault: boolean;
  credential: ProviderCredential | null;
}

interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  paradigmConfig?: Record<string, { enabled: boolean; weight: number; model: string }> | null;
  defaultThresholds?: { escalateThreshold?: number } | null;
  credentials?: ApiKeyCredential[];
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

interface EditApiKeyDialogProps {
  apiKey: ApiKeyData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditApiKeyDialog({ apiKey, open, onOpenChange }: EditApiKeyDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(apiKey.name);
  const [isActive, setIsActive] = useState(apiKey.isActive);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Plan type state
  const [planType, setPlanType] = useState<PlanType>('free');
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // Escalation threshold (0-1, default 0.5)
  const [escalateThreshold, setEscalateThreshold] = useState(
    apiKey.defaultThresholds?.escalateThreshold ?? 0.5
  );

  // Advanced settings visibility
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Initialize paradigm configs from API key data
  const [paradigmConfigs, setParadigmConfigs] = useState<Record<ParadigmType, ParadigmState>>(() =>
    initializeFromApiKey(apiKey)
  );

  // Get the default credential's provider from the API key
  const defaultCredential = useMemo(
    () => apiKey.credentials?.find((c) => c.isDefault)?.credential,
    [apiKey.credentials]
  );
  const selectedProvider = defaultCredential?.provider as LLMProvider | undefined;

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

  function initializeFromApiKey(key: ApiKeyData): Record<ParadigmType, ParadigmState> {
    const configs: Record<ParadigmType, ParadigmState> = {} as Record<ParadigmType, ParadigmState>;
    for (const paradigm of ALL_PARADIGMS) {
      const existingConfig = key.paradigmConfig?.[paradigm];
      configs[paradigm] = {
        enabled: existingConfig?.enabled ?? false,
        model: existingConfig?.model ?? DEFAULT_MODELS[paradigm] ?? 'anthropic/claude-sonnet-4.5',
        weight: existingConfig?.weight ?? 1.0,
      };
    }
    return configs;
  }

  // Reset state when dialog opens with new key data
  useEffect(() => {
    if (open) {
      setName(apiKey.name);
      setIsActive(apiKey.isActive);
      setEscalateThreshold(apiKey.defaultThresholds?.escalateThreshold ?? 0.5);
      setParadigmConfigs(initializeFromApiKey(apiKey));
      setError(null);
      setShowAdvanced(false);
      fetchPlanType();
    }
  }, [open, apiKey]);

  const fetchPlanType = async () => {
    setIsLoadingPlan(true);
    try {
      const response = await fetch('/api/dashboard/settings/organization');
      if (response.ok) {
        const data = await response.json();
        setPlanType(data.planType || 'free');
      }
    } catch {
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

  const handleUpdate = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter a name for the API key');
      return;
    }

    if (!hasEnabledParadigm) {
      setError('At least one verification method must be enabled');
      return;
    }

    setIsUpdating(true);
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

      const response = await fetch(`/api/dashboard/keys?id=${apiKey.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          paradigmConfig,
          defaultThresholds: {
            escalateThreshold,
          },
          isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update API key');
      }

      router.refresh();
      onOpenChange(false);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to update API key'));
    } finally {
      setIsUpdating(false);
    }
  }, [
    name,
    hasEnabledParadigm,
    paradigmConfigs,
    escalateThreshold,
    isActive,
    apiKey.id,
    router,
    onOpenChange,
  ]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit API Key</DialogTitle>
          <DialogDescription>
            Modify the configuration for <code className="rounded bg-muted px-1">{apiKey.keyPrefix}...</code>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoadingPlan ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="default" />
            </div>
          ) : (
            <>
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  placeholder="Production API Key"
                  value={name}
                  onChange={handleNameChange}
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive keys cannot be used for API requests
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              {/* Verification Methods */}
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
                      <Label className="text-xs text-muted-foreground">Paradigm Weights</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating || isLoadingPlan}>
            {isUpdating && <ButtonSpinner />}
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

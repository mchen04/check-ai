'use client';

import { useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getProviderLabel } from '@/lib/llm/provider-ui-config';
import { ModelRegistry, type ModelCapability, type ModelInfo } from '@/lib/llm/model-registry';
import type { LLMProvider } from '@/lib/llm/types';

// =============================================================================
// TYPES
// =============================================================================

export type MethodKey =
  | 'semantic'
  | 'reasoning'
  | 'tool'
  | 'biprm'
  | 'ensemble'
  | 'entropy'
  | 'formal';

export interface MethodOverride {
  provider?: LLMProvider;
  model?: string;
}

interface MethodSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methodKey: MethodKey;
  methodName: string;
  provider?: LLMProvider;
  model?: string;
  onSave: (override: MethodOverride) => void;
  userProviders: LLMProvider[];
}

// =============================================================================
// CAPABILITY MAPPING
// =============================================================================

/** Which model capability each method requires */
const METHOD_CAPABILITIES: Record<MethodKey, ModelCapability[]> = {
  semantic: ['embedding'],
  reasoning: ['text'],
  tool: ['text'],
  biprm: ['text'],
  ensemble: ['text'],
  entropy: ['text'],
  formal: ['text'],
};

// =============================================================================
// HELPERS
// =============================================================================

const registry = ModelRegistry.getInstance();

function getProvidersForMethod(methodKey: MethodKey, userProviders: LLMProvider[]) {
  const userSet = new Set(userProviders);
  if (methodKey === 'semantic') {
    return registry.getEmbeddingProviders().filter((p) => userSet.has(p));
  }
  // For text methods, return user's providers that have text models
  return userProviders.filter((p) => {
    const models = registry.findModels({ provider: p, capabilities: METHOD_CAPABILITIES[methodKey] });
    return models.length > 0;
  });
}

function getModelsForMethod(methodKey: MethodKey, provider: LLMProvider): ModelInfo[] {
  return registry.findModels({
    provider,
    capabilities: METHOD_CAPABILITIES[methodKey],
  });
}

function formatPrice(pricing: ModelInfo['pricing']): string | null {
  if (!pricing) return null;
  if (pricing.inputPer1M !== undefined) {
    return `$${pricing.inputPer1M.toFixed(2)}/$${pricing.outputPer1M?.toFixed(2) ?? '?'} per 1M tokens`;
  }
  return null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MethodSettingsDialog({
  open,
  onOpenChange,
  methodKey,
  methodName,
  provider,
  model,
  onSave,
  userProviders,
}: MethodSettingsDialogProps) {
  const validProviders = useMemo(() => getProvidersForMethod(methodKey, userProviders), [methodKey, userProviders]);

  const availableModels = useMemo(() => {
    if (!provider) return [];
    return getModelsForMethod(methodKey, provider);
  }, [methodKey, provider]);

  const selectedModelInfo = useMemo(() => {
    if (!model) return null;
    return registry.getModel(model);
  }, [model]);

  const handleProviderChange = (value: string) => {
    // Reset model when provider changes
    onSave({ provider: value as LLMProvider, model: undefined });
  };

  const handleModelChange = (value: string) => {
    onSave({ provider, model: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{methodName} Settings</DialogTitle>
          <DialogDescription>
            Choose which provider and model to use for this method.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Provider</Label>
            {validProviders.length > 0 ? (
              <>
                <Select value={provider ?? ''} onValueChange={handleProviderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {validProviders.map((p) => (
                      <SelectItem key={p} value={p}>
                        {getProviderLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {methodKey === 'semantic'
                    ? 'Only your configured providers with embedding models are shown.'
                    : 'Only your configured providers with text generation models are shown.'}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
                No configured providers support this method. Add one in the Providers tab.
              </p>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Model</Label>
            <Select
              value={model ?? ''}
              onValueChange={handleModelChange}
              disabled={!provider}
            >
              <SelectTrigger>
                <SelectValue placeholder={!provider ? 'Select a provider first' : 'Select model'} />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      <span>{m.displayName}</span>
                      {m.capabilities.includes('logprobs') && methodKey === 'entropy' && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">logprobs</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!provider && (
              <p className="text-xs text-muted-foreground">Select a provider to see available models.</p>
            )}
          </div>

          {/* Pricing Info */}
          {selectedModelInfo && (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selectedModelInfo.displayName}</span>
                <Badge variant="outline" className="text-[10px]">
                  Tier {selectedModelInfo.qualityTier}
                </Badge>
              </div>
              {selectedModelInfo.pricing && (
                <p className="mt-1">{formatPrice(selectedModelInfo.pricing)}</p>
              )}
              <p className="mt-1">
                Context: {(selectedModelInfo.contextWindow).toLocaleString()} tokens
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

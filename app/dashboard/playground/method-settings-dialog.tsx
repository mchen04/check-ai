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
import { PROVIDER_OPTIONS, getProviderLabel } from '@/lib/llm/provider-ui-config';
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

function getProvidersForMethod(methodKey: MethodKey) {
  if (methodKey === 'semantic') {
    return registry.getEmbeddingProviders();
  }
  // For text methods, return all providers that have text models
  const allProviders = PROVIDER_OPTIONS.map((p) => p.value);
  return allProviders.filter((p) => {
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
}: MethodSettingsDialogProps) {
  const validProviders = useMemo(() => getProvidersForMethod(methodKey), [methodKey]);

  const availableModels = useMemo(() => {
    if (!provider) return [];
    return getModelsForMethod(methodKey, provider);
  }, [methodKey, provider]);

  const selectedModelInfo = useMemo(() => {
    if (!model) return null;
    return registry.getModel(model);
  }, [model]);

  const handleProviderChange = (value: string) => {
    if (value === 'auto') {
      onSave({ provider: undefined, model: undefined });
    } else {
      // Reset model when provider changes
      onSave({ provider: value as LLMProvider, model: undefined });
    }
  };

  const handleModelChange = (value: string) => {
    if (value === 'default') {
      onSave({ provider, model: undefined });
    } else {
      onSave({ provider, model: value });
    }
  };

  const handleReset = () => {
    onSave({ provider: undefined, model: undefined });
  };

  const isCustomized = provider !== undefined || model !== undefined;

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
            <Select value={provider ?? 'auto'} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (recommended)</SelectItem>
                {validProviders.map((p) => (
                  <SelectItem key={p} value={p}>
                    {getProviderLabel(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {methodKey === 'semantic'
                ? 'Only providers with embedding models are shown.'
                : 'Only providers with text generation models are shown.'}
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Model</Label>
            <Select
              value={model ?? 'default'}
              onValueChange={handleModelChange}
              disabled={!provider}
            >
              <SelectTrigger>
                <SelectValue placeholder={!provider ? 'Select a provider first' : 'Select model'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
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

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {isCustomized ? (
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleReset}>
              Reset to defaults
            </Button>
          ) : (
            <div />
          )}
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

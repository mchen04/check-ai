'use client';

import { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
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

export interface EnsembleMemberConfig {
  provider: LLMProvider;
  model: string;
}

export interface MethodOverride {
  provider?: LLMProvider;
  model?: string;
  members?: EnsembleMemberConfig[];
}

interface MethodSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methodKey: MethodKey;
  methodName: string;
  provider?: LLMProvider;
  model?: string;
  members?: EnsembleMemberConfig[];
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
// SINGLE PROVIDER/MODEL PICKER (for non-ensemble methods)
// =============================================================================

function SingleModelPicker({
  methodKey,
  provider,
  model,
  onSave,
  validProviders,
}: {
  methodKey: MethodKey;
  provider?: LLMProvider;
  model?: string;
  onSave: (override: MethodOverride) => void;
  validProviders: LLMProvider[];
}) {
  const availableModels = useMemo(() => {
    if (!provider) return [];
    return getModelsForMethod(methodKey, provider);
  }, [methodKey, provider]);

  const selectedModelInfo = useMemo(() => {
    if (!model) return null;
    return registry.getModel(model);
  }, [model]);

  return (
    <div className="space-y-4 py-2">
      {/* Provider Selection */}
      <div className="space-y-2">
        <Label className="text-sm">Provider</Label>
        {validProviders.length > 0 ? (
          <>
            <Select
              value={provider ?? ''}
              onValueChange={(value) => onSave({ provider: value as LLMProvider, model: undefined })}
            >
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
          onValueChange={(value) => onSave({ provider, model: value })}
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
  );
}

// =============================================================================
// ENSEMBLE MEMBER ROW
// =============================================================================

function EnsembleMemberRow({
  index,
  member,
  validProviders,
  canRemove,
  onUpdate,
  onRemove,
}: {
  index: number;
  member: Partial<EnsembleMemberConfig>;
  validProviders: LLMProvider[];
  canRemove: boolean;
  onUpdate: (member: Partial<EnsembleMemberConfig>) => void;
  onRemove: () => void;
}) {
  const availableModels = useMemo(() => {
    if (!member.provider) return [];
    return getModelsForMethod('ensemble', member.provider);
  }, [member.provider]);

  return (
    <div className="rounded-md border px-3 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">Model {index + 1}</Label>
        {canRemove && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={member.provider ?? ''}
          onValueChange={(value) => onUpdate({ provider: value as LLMProvider })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            {validProviders.map((p) => (
              <SelectItem key={p} value={p}>
                {getProviderLabel(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={member.model ?? ''}
          onValueChange={(value) => onUpdate({ provider: member.provider, model: value })}
          disabled={!member.provider}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={!member.provider ? 'Provider first' : 'Model'} />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// =============================================================================
// ENSEMBLE MEMBERS PICKER
// =============================================================================

function EnsembleMembersPicker({
  members,
  onSave,
  validProviders,
}: {
  members: Array<Partial<EnsembleMemberConfig>>;
  onSave: (override: MethodOverride) => void;
  validProviders: LLMProvider[];
}) {
  const handleUpdateMember = (index: number, update: Partial<EnsembleMemberConfig>) => {
    const newMembers = [...members];
    // When provider changes, reset model
    if (update.provider && update.provider !== newMembers[index].provider) {
      newMembers[index] = { provider: update.provider };
    } else {
      newMembers[index] = { ...newMembers[index], ...update };
    }
    onSave({ members: newMembers as EnsembleMemberConfig[] });
  };

  const handleAddMember = () => {
    onSave({ members: [...members, {}] as EnsembleMemberConfig[] });
  };

  const handleRemoveMember = (index: number) => {
    const newMembers = members.filter((_, i) => i !== index);
    onSave({ members: newMembers as EnsembleMemberConfig[] });
  };

  const configuredCount = members.filter((m) => m.provider && m.model).length;

  return (
    <div className="space-y-3 py-2">
      <div className="space-y-1">
        <Label className="text-sm">Ensemble Members</Label>
        <p className="text-xs text-muted-foreground">
          Pick 2 or more diverse models for consensus voting.
        </p>
      </div>

      {validProviders.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
          No configured providers support this method. Add one in the Providers tab.
        </p>
      ) : (
        <>
          {members.map((member, index) => (
            <EnsembleMemberRow
              key={index}
              index={index}
              member={member}
              validProviders={validProviders}
              canRemove={members.length > 2}
              onUpdate={(update) => handleUpdateMember(index, update)}
              onRemove={() => handleRemoveMember(index)}
            />
          ))}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleAddMember}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Model
          </Button>

          <Separator />

          <div className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
            configuredCount >= 2
              ? 'border-primary/20 bg-primary/5 text-primary'
              : 'border-destructive/30 bg-destructive/5 text-destructive'
          }`}>
            <span>{configuredCount >= 2 ? 'Ready' : 'Need at least 2 configured models'}</span>
            <span className="font-mono font-medium">{configuredCount} / {members.length}</span>
          </div>
        </>
      )}
    </div>
  );
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
  members,
  onSave,
  userProviders,
}: MethodSettingsDialogProps) {
  const validProviders = useMemo(() => getProvidersForMethod(methodKey, userProviders), [methodKey, userProviders]);

  const isEnsemble = methodKey === 'ensemble';

  // Ensure ensemble always has at least 2 member slots
  const ensembleMembers = useMemo(() => {
    if (!isEnsemble) return [];
    if (members && members.length >= 2) return members;
    // Initialize with 2 empty slots
    return [{}, {}] as Array<Partial<EnsembleMemberConfig>>;
  }, [isEnsemble, members]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{methodName} Settings</DialogTitle>
          <DialogDescription>
            {isEnsemble
              ? 'Configure multiple models for ensemble consensus voting.'
              : 'Choose which provider and model to use for this method.'}
          </DialogDescription>
        </DialogHeader>

        {isEnsemble ? (
          <EnsembleMembersPicker
            members={ensembleMembers}
            onSave={onSave}
            validProviders={validProviders}
          />
        ) : (
          <SingleModelPicker
            methodKey={methodKey}
            provider={provider}
            model={model}
            onSave={onSave}
            validProviders={validProviders}
          />
        )}

        <DialogFooter>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

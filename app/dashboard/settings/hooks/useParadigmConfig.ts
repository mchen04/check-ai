/**
 * Custom hook for managing paradigm configuration state
 * Eliminates duplicate logic between create and edit API key forms
 */

import { useState, useCallback } from 'react';

// Paradigm configurations
export const PARADIGMS = [
  { key: 'reasoning', label: 'Reasoning', description: 'LLM-based logical analysis' },
  { key: 'tool', label: 'Tool Use', description: 'External tool verification' },
  { key: 'semantic', label: 'Semantic', description: 'Embedding similarity' },
  { key: 'ensemble', label: 'Ensemble', description: 'Multi-model voting' },
  { key: 'biprm', label: 'BiPRM', description: 'Bidirectional process reward' },
  { key: 'entropy', label: 'Entropy', description: 'Token probability analysis' },
  { key: 'formal', label: 'Formal', description: 'Formal verification logic' },
] as const;

export const DEFAULT_MODELS: Record<string, string> = {
  reasoning: 'anthropic/claude-3.5-sonnet',
  tool: 'openai/gpt-4o-mini',
  semantic: 'openai/text-embedding-3-small',
  biprm: 'anthropic/claude-3.5-sonnet',
  entropy: 'openai/gpt-4o-mini',
  formal: 'openai/gpt-4o',
};

export const AVAILABLE_MODELS = [
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-opus',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/text-embedding-3-small',
  'google/gemini-2.0-flash',
  'google/gemini-1.5-pro',
  'meta-llama/llama-3.3-70b',
  'groq/llama-3.3-70b',
  'mistral/mistral-large',
  'deepseek/deepseek-chat',
];

export const ENSEMBLE_MODELS = [
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'meta-llama/llama-3.3-70b', label: 'Llama 3.3 70B' },
  { id: 'mistral/mistral-large', label: 'Mistral Large' },
];

export interface ParadigmConfig {
  enabled: boolean;
  weight: number;
  model: string;
  models?: string[];
}

export interface DefaultThresholds {
  acceptThreshold: number;
  escalateThreshold: number;
  timeout: number;
}

export interface ApiKeyFormData {
  name: string;
  providerCredentialId: string;
  paradigmConfig: Record<string, ParadigmConfig>;
  defaultThresholds: DefaultThresholds;
}

const DEFAULT_THRESHOLDS: DefaultThresholds = {
  acceptThreshold: 0.95,
  escalateThreshold: 0.5,
  timeout: 30000,
};

export function useParadigmConfig(initialData?: Partial<ApiKeyFormData>) {
  const [formData, setFormData] = useState<ApiKeyFormData>({
    name: initialData?.name || '',
    providerCredentialId: initialData?.providerCredentialId || '',
    paradigmConfig: initialData?.paradigmConfig || {},
    defaultThresholds: {
      ...DEFAULT_THRESHOLDS,
      ...initialData?.defaultThresholds,
    },
  });

  const toggleParadigm = useCallback((paradigm: string, enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      paradigmConfig: {
        ...prev.paradigmConfig,
        [paradigm]: {
          enabled,
          weight: prev.paradigmConfig[paradigm]?.weight || 0.5,
          model: prev.paradigmConfig[paradigm]?.model || DEFAULT_MODELS[paradigm] || '',
        },
      },
    }));
  }, []);

  const updateParadigmWeight = useCallback((paradigm: string, weight: number) => {
    setFormData((prev) => ({
      ...prev,
      paradigmConfig: {
        ...prev.paradigmConfig,
        [paradigm]: {
          ...prev.paradigmConfig[paradigm],
          weight,
        },
      },
    }));
  }, []);

  const updateParadigmModel = useCallback((paradigm: string, model: string) => {
    setFormData((prev) => ({
      ...prev,
      paradigmConfig: {
        ...prev.paradigmConfig,
        [paradigm]: {
          ...prev.paradigmConfig[paradigm],
          model,
        },
      },
    }));
  }, []);

  const toggleEnsembleModel = useCallback((modelId: string, checked: boolean) => {
    setFormData((prev) => {
      const currentModels = prev.paradigmConfig['ensemble']?.models || [];
      const newModels = checked
        ? [...currentModels, modelId]
        : currentModels.filter((m) => m !== modelId);
      return {
        ...prev,
        paradigmConfig: {
          ...prev.paradigmConfig,
          ensemble: {
            ...prev.paradigmConfig['ensemble'],
            enabled: prev.paradigmConfig['ensemble']?.enabled || false,
            weight: prev.paradigmConfig['ensemble']?.weight || 0.5,
            model: '',
            models: newModels,
          },
        },
      };
    });
  }, []);

  const updateThreshold = useCallback(
    (key: keyof DefaultThresholds, value: number) => {
      setFormData((prev) => ({
        ...prev,
        defaultThresholds: {
          ...prev.defaultThresholds,
          [key]: value,
        },
      }));
    },
    []
  );

  const updateField = useCallback(
    <K extends keyof ApiKeyFormData>(key: K, value: ApiKeyFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const reset = useCallback((data?: Partial<ApiKeyFormData>) => {
    setFormData({
      name: data?.name || '',
      providerCredentialId: data?.providerCredentialId || '',
      paradigmConfig: data?.paradigmConfig || {},
      defaultThresholds: {
        ...DEFAULT_THRESHOLDS,
        ...data?.defaultThresholds,
      },
    });
  }, []);

  const validate = useCallback((): string | null => {
    if (!formData.name.trim()) {
      return 'Name is required';
    }
    if (!formData.providerCredentialId) {
      return 'Provider credential is required';
    }

    const enabledParadigms = Object.entries(formData.paradigmConfig).filter(
      ([, config]) => config.enabled
    );
    if (enabledParadigms.length === 0) {
      return 'At least one paradigm must be enabled';
    }

    if (formData.paradigmConfig['ensemble']?.enabled) {
      const ensembleModels = formData.paradigmConfig['ensemble']?.models || [];
      if (ensembleModels.length < 2) {
        return 'Ensemble requires at least 2 models for voting';
      }
    }

    return null;
  }, [formData]);

  return {
    formData,
    setFormData,
    toggleParadigm,
    updateParadigmWeight,
    updateParadigmModel,
    toggleEnsembleModel,
    updateThreshold,
    updateField,
    reset,
    validate,
  };
}

export function getParadigmSummary(config: Record<string, ParadigmConfig> | null): string {
  if (!config) return 'No paradigms configured';
  const enabled = Object.entries(config)
    .filter(([, c]) => c.enabled)
    .map(([p, c]) => `${p} (${(c.weight * 100).toFixed(0)}%)`);
  return enabled.length > 0 ? enabled.join(', ') : 'No paradigms configured';
}

/**
 * Provider UI Configuration
 *
 * Single source of truth for provider UI metadata (labels, colors).
 * This extends the core config.ts with UI-specific data.
 *
 * Usage:
 * - Import PROVIDER_OPTIONS for select/dropdown options
 * - Import getProviderColor / getProviderLabel for badges/indicators
 */

import { LLMProvider } from './types';
import { PROVIDER_TIERS, ALL_PROVIDERS } from './config';

// =============================================================================
// TYPES
// =============================================================================

export interface ProviderUIConfig {
  /** Provider ID (matches LLMProvider type) */
  id: LLMProvider;
  /** Display label */
  label: string;
  /** Short description for UI */
  description: string;
  /** Tailwind color class for badges/indicators */
  color: string;
  /** Tier (1-4) */
  tier: 1 | 2 | 3 | 4;
  /** Whether this provider is recommended for new users */
  recommended?: boolean;
  /** Whether this provider requires enterprise setup */
  enterprise?: boolean;
}

export interface ProviderSelectOption {
  value: LLMProvider;
  label: string;
  description: string;
}

// =============================================================================
// PROVIDER UI METADATA
// =============================================================================

const PROVIDER_METADATA: Record<LLMProvider, Omit<ProviderUIConfig, 'id' | 'tier'>> = {
  // Tier 4: Gateways (recommended first)
  openrouter: {
    label: 'OpenRouter',
    description: 'Recommended - access all models',
    color: 'bg-primary',
    recommended: true,
  },

  // Tier 1: First-party providers
  openai: {
    label: 'OpenAI',
    description: 'GPT-4.1, O3, O4-mini',
    color: 'bg-emerald-600',
  },
  anthropic: {
    label: 'Anthropic',
    description: 'Claude Sonnet 4.5, Opus 4.6',
    color: 'bg-orange-500',
  },
  google: {
    label: 'Google AI',
    description: 'Gemini 2.5 Pro, Flash',
    color: 'bg-blue-500',
  },
  xai: {
    label: 'xAI',
    description: 'Grok models',
    color: 'bg-stone-600',
  },
  mistral: {
    label: 'Mistral',
    description: 'Mistral models',
    color: 'bg-amber-500',
  },
  cohere: {
    label: 'Cohere',
    description: 'Command models',
    color: 'bg-pink-500',
  },
  deepseek: {
    label: 'DeepSeek',
    description: 'DeepSeek models',
    color: 'bg-cyan-600',
  },

  // Tier 2: Cloud providers (enterprise)
  azure: {
    label: 'Azure OpenAI',
    description: 'Enterprise Azure deployment',
    color: 'bg-sky-500',
    enterprise: true,
  },
  bedrock: {
    label: 'AWS Bedrock',
    description: 'Enterprise AWS deployment',
    color: 'bg-amber-600',
    enterprise: true,
  },

  // Tier 3: Inference providers
  groq: {
    label: 'Groq',
    description: 'Fast Llama inference',
    color: 'bg-red-500',
  },
  together: {
    label: 'Together AI',
    description: 'Open-source models',
    color: 'bg-cyan-500',
  },
  fireworks: {
    label: 'Fireworks',
    description: 'Fast inference',
    color: 'bg-rose-500',
  },
  cerebras: {
    label: 'Cerebras',
    description: 'Ultra-fast inference',
    color: 'bg-teal-600',
  },
  perplexity: {
    label: 'Perplexity',
    description: 'Search-enhanced models',
    color: 'bg-teal-500',
  },

  // Legacy
  replicate: {
    label: 'Replicate',
    description: 'Legacy provider',
    color: 'bg-stone-500',
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Full provider UI configuration with all metadata
 */
export const PROVIDER_UI_CONFIG: Record<LLMProvider, ProviderUIConfig> = Object.fromEntries(
  ALL_PROVIDERS.map((provider) => [
    provider,
    {
      id: provider,
      tier: PROVIDER_TIERS[provider],
      ...PROVIDER_METADATA[provider],
    },
  ])
) as Record<LLMProvider, ProviderUIConfig>;

/**
 * Provider options for select/dropdown components
 * Sorted by: recommended first, then by tier, then alphabetically
 */
export const PROVIDER_OPTIONS: ProviderSelectOption[] = Object.values(PROVIDER_UI_CONFIG)
  .filter((p) => !p.enterprise) // Exclude enterprise providers from default list
  .sort((a, b) => {
    // Recommended first
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    // Then by tier (lower tier = higher priority for first-party)
    if (a.tier !== b.tier) return a.tier - b.tier;
    // Then alphabetically
    return a.label.localeCompare(b.label);
  })
  .map((p) => ({
    value: p.id,
    label: p.label,
    description: p.description,
  }));


/**
 * Get provider color class
 */
export function getProviderColor(provider: LLMProvider): string {
  return PROVIDER_UI_CONFIG[provider]?.color ?? 'bg-gray-500';
}

/**
 * Get provider label
 */
export function getProviderLabel(provider: LLMProvider): string {
  return PROVIDER_UI_CONFIG[provider]?.label ?? provider;
}


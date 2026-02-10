/**
 * Model Registry — Static capability metadata for LLM models
 *
 * Provides:
 * - Capability-based model discovery (embeddings, logprobs, tool_use, etc.)
 * - Quality-tier ranking (1=flagship, 2=standard, 3=budget)
 * - Default model selection per provider
 * - Heuristic inference for unknown models
 *
 * Updated: Feb 2026
 */

import { LLMProvider } from './types';
import { ModelPricing, MODEL_PRICING } from './config';

// =============================================================================
// TYPES
// =============================================================================

export type ModelCapability =
  | 'text'
  | 'embedding'
  | 'tool_use'
  | 'vision'
  | 'logprobs'
  | 'reasoning'
  | 'search'
  | 'json_mode';

export interface ModelInfo {
  id: string;
  provider: LLMProvider;
  displayName: string;
  capabilities: ModelCapability[];
  contextWindow: number;
  pricing: ModelPricing | null;
  qualityTier: 1 | 2 | 3;
  embeddingDimension?: number;
}

export interface ModelQuery {
  capabilities?: ModelCapability[];
  provider?: LLMProvider;
  preferredProviders?: LLMProvider[];
  maxQualityTier?: 1 | 2 | 3;
}

// =============================================================================
// STATIC MODEL REGISTRY DATA (Feb 2026)
// =============================================================================

const MODEL_ENTRIES: ModelInfo[] = [
  // =========================================================================
  // OpenAI
  // =========================================================================
  {
    id: 'gpt-4.1',
    provider: 'openai',
    displayName: 'GPT-4.1',
    capabilities: ['text', 'tool_use', 'vision', 'logprobs', 'json_mode'],
    contextWindow: 1_000_000,
    pricing: MODEL_PRICING['gpt-4.1'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'gpt-4.1-mini',
    provider: 'openai',
    displayName: 'GPT-4.1 Mini',
    capabilities: ['text', 'tool_use', 'vision', 'logprobs', 'json_mode'],
    contextWindow: 1_000_000,
    pricing: MODEL_PRICING['gpt-4.1-mini'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'gpt-4.1-nano',
    provider: 'openai',
    displayName: 'GPT-4.1 Nano',
    capabilities: ['text', 'tool_use', 'logprobs', 'json_mode'],
    contextWindow: 1_000_000,
    pricing: MODEL_PRICING['gpt-4.1-nano'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'o3',
    provider: 'openai',
    displayName: 'O3',
    capabilities: ['text', 'reasoning', 'tool_use', 'json_mode'],
    contextWindow: 200_000,
    pricing: MODEL_PRICING['o3'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'o4-mini',
    provider: 'openai',
    displayName: 'O4 Mini',
    capabilities: ['text', 'reasoning', 'tool_use', 'json_mode'],
    contextWindow: 200_000,
    pricing: MODEL_PRICING['o4-mini'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'o3-mini',
    provider: 'openai',
    displayName: 'O3 Mini',
    capabilities: ['text', 'reasoning', 'json_mode'],
    contextWindow: 200_000,
    pricing: MODEL_PRICING['o3-mini'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    capabilities: ['text', 'tool_use', 'vision', 'logprobs', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['gpt-4o'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    displayName: 'GPT-4o Mini',
    capabilities: ['text', 'tool_use', 'vision', 'logprobs', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['gpt-4o-mini'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'o1',
    provider: 'openai',
    displayName: 'O1',
    capabilities: ['text', 'reasoning', 'json_mode'],
    contextWindow: 200_000,
    pricing: MODEL_PRICING['o1'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'text-embedding-3-small',
    provider: 'openai',
    displayName: 'Text Embedding 3 Small',
    capabilities: ['embedding'],
    contextWindow: 8191,
    pricing: MODEL_PRICING['text-embedding-3-small'] ?? null,
    qualityTier: 2,
    embeddingDimension: 1536,
  },
  {
    id: 'text-embedding-3-large',
    provider: 'openai',
    displayName: 'Text Embedding 3 Large',
    capabilities: ['embedding'],
    contextWindow: 8191,
    pricing: MODEL_PRICING['text-embedding-3-large'] ?? null,
    qualityTier: 1,
    embeddingDimension: 3072,
  },

  // =========================================================================
  // Anthropic
  // =========================================================================
  {
    id: 'claude-opus-4-5-20251124',
    provider: 'anthropic',
    displayName: 'Claude Opus 4.5',
    capabilities: ['text', 'tool_use', 'vision', 'reasoning', 'json_mode'],
    contextWindow: 200_000,
    pricing: MODEL_PRICING['claude-opus-4-5-20251124'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    displayName: 'Claude Sonnet 4.5',
    capabilities: ['text', 'tool_use', 'vision', 'json_mode'],
    contextWindow: 200_000,
    pricing: MODEL_PRICING['claude-sonnet-4-5-20250929'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'claude-haiku-4-5-20251015',
    provider: 'anthropic',
    displayName: 'Claude Haiku 4.5',
    capabilities: ['text', 'tool_use', 'vision', 'json_mode'],
    contextWindow: 200_000,
    pricing: MODEL_PRICING['claude-haiku-4-5-20251015'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'claude-opus-4-6',
    provider: 'anthropic',
    displayName: 'Claude Opus 4.6',
    capabilities: ['text', 'tool_use', 'vision', 'reasoning', 'json_mode'],
    contextWindow: 200_000,
    pricing: MODEL_PRICING['claude-opus-4-6'] ?? null,
    qualityTier: 1,
  },

  // =========================================================================
  // Google
  // =========================================================================
  {
    id: 'gemini-2.5-pro',
    provider: 'google',
    displayName: 'Gemini 2.5 Pro',
    capabilities: ['text', 'tool_use', 'vision', 'json_mode'],
    contextWindow: 1_000_000,
    pricing: MODEL_PRICING['gemini-2.5-pro'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'google',
    displayName: 'Gemini 2.5 Flash',
    capabilities: ['text', 'tool_use', 'vision', 'json_mode'],
    contextWindow: 1_000_000,
    pricing: MODEL_PRICING['gemini-2.5-flash'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'gemini-2.0-flash',
    provider: 'google',
    displayName: 'Gemini 2.0 Flash',
    capabilities: ['text', 'tool_use', 'vision', 'json_mode'],
    contextWindow: 1_000_000,
    pricing: MODEL_PRICING['gemini-2.0-flash'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'gemini-2.0-flash-lite',
    provider: 'google',
    displayName: 'Gemini 2.0 Flash Lite',
    capabilities: ['text', 'json_mode'],
    contextWindow: 1_000_000,
    pricing: MODEL_PRICING['gemini-2.0-flash-lite'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'gemini-1.5-pro',
    provider: 'google',
    displayName: 'Gemini 1.5 Pro',
    capabilities: ['text', 'tool_use', 'vision', 'json_mode'],
    contextWindow: 2_000_000,
    pricing: MODEL_PRICING['gemini-1.5-pro'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'gemini-1.5-flash',
    provider: 'google',
    displayName: 'Gemini 1.5 Flash',
    capabilities: ['text', 'tool_use', 'vision', 'json_mode'],
    contextWindow: 1_000_000,
    pricing: MODEL_PRICING['gemini-1.5-flash'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'text-embedding-004',
    provider: 'google',
    displayName: 'Text Embedding 004',
    capabilities: ['embedding'],
    contextWindow: 2048,
    pricing: null,
    qualityTier: 2,
    embeddingDimension: 768,
  },

  // =========================================================================
  // xAI
  // =========================================================================
  {
    id: 'grok-4',
    provider: 'xai',
    displayName: 'Grok 4',
    capabilities: ['text', 'tool_use', 'vision', 'json_mode'],
    contextWindow: 131_072,
    pricing: MODEL_PRICING['grok-4'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'grok-3',
    provider: 'xai',
    displayName: 'Grok 3',
    capabilities: ['text', 'tool_use', 'json_mode'],
    contextWindow: 131_072,
    pricing: MODEL_PRICING['grok-3'] ?? null,
    qualityTier: 2,
  },

  // =========================================================================
  // Mistral
  // =========================================================================
  {
    id: 'mistral-large-latest',
    provider: 'mistral',
    displayName: 'Mistral Large',
    capabilities: ['text', 'tool_use', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['mistral-large-latest'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'mistral-embed',
    provider: 'mistral',
    displayName: 'Mistral Embed',
    capabilities: ['embedding'],
    contextWindow: 8192,
    pricing: null,
    qualityTier: 2,
    embeddingDimension: 1024,
  },
  {
    id: 'codestral',
    provider: 'mistral',
    displayName: 'Codestral',
    capabilities: ['text', 'json_mode'],
    contextWindow: 256_000,
    pricing: MODEL_PRICING['codestral'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'mistral-small-latest',
    provider: 'mistral',
    displayName: 'Mistral Small',
    capabilities: ['text', 'tool_use', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['mistral-small-latest'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'mistral-medium-latest',
    provider: 'mistral',
    displayName: 'Mistral Medium',
    capabilities: ['text', 'tool_use', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['mistral-medium-latest'] ?? null,
    qualityTier: 2,
  },

  // =========================================================================
  // Cohere
  // =========================================================================
  {
    id: 'command-r-plus',
    provider: 'cohere',
    displayName: 'Command R+',
    capabilities: ['text', 'tool_use', 'search', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['command-r-plus'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'command-r',
    provider: 'cohere',
    displayName: 'Command R',
    capabilities: ['text', 'tool_use', 'search', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['command-r'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'command-r7b',
    provider: 'cohere',
    displayName: 'Command R7B',
    capabilities: ['text', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['command-r7b'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'embed-english-v4.0',
    provider: 'cohere',
    displayName: 'Embed English v4',
    capabilities: ['embedding'],
    contextWindow: 512,
    pricing: null,
    qualityTier: 1,
    embeddingDimension: 1024,
  },

  // =========================================================================
  // DeepSeek
  // =========================================================================
  {
    id: 'deepseek-chat',
    provider: 'deepseek',
    displayName: 'DeepSeek Chat',
    capabilities: ['text', 'json_mode'],
    contextWindow: 64_000,
    pricing: MODEL_PRICING['deepseek-chat'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'deepseek-reasoner',
    provider: 'deepseek',
    displayName: 'DeepSeek Reasoner',
    capabilities: ['text', 'reasoning', 'json_mode'],
    contextWindow: 64_000,
    pricing: MODEL_PRICING['deepseek-reasoner'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'deepseek-v3',
    provider: 'deepseek',
    displayName: 'DeepSeek V3',
    capabilities: ['text', 'json_mode'],
    contextWindow: 64_000,
    pricing: MODEL_PRICING['deepseek-v3'] ?? null,
    qualityTier: 2,
  },

  // =========================================================================
  // Groq
  // =========================================================================
  {
    id: 'llama-3.3-70b-versatile',
    provider: 'groq',
    displayName: 'Llama 3.3 70B (Groq)',
    capabilities: ['text', 'tool_use', 'logprobs', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['llama-3.3-70b-versatile'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'llama-3.1-8b-instant',
    provider: 'groq',
    displayName: 'Llama 3.1 8B (Groq)',
    capabilities: ['text', 'logprobs', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['llama-3.1-8b-instant'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'llama-3.1-70b-versatile',
    provider: 'groq',
    displayName: 'Llama 3.1 70B (Groq)',
    capabilities: ['text', 'tool_use', 'logprobs', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['llama-3.1-70b-versatile'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'mixtral-8x7b-32768',
    provider: 'groq',
    displayName: 'Mixtral 8x7B (Groq)',
    capabilities: ['text', 'logprobs', 'json_mode'],
    contextWindow: 32_768,
    pricing: MODEL_PRICING['mixtral-8x7b-32768'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'gemma2-9b-it',
    provider: 'groq',
    displayName: 'Gemma 2 9B (Groq)',
    capabilities: ['text', 'json_mode'],
    contextWindow: 8_192,
    pricing: MODEL_PRICING['gemma2-9b-it'] ?? null,
    qualityTier: 3,
  },

  // =========================================================================
  // Together
  // =========================================================================
  {
    id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    provider: 'together',
    displayName: 'Llama 3.3 70B (Together)',
    capabilities: ['text', 'tool_use', 'logprobs', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['meta-llama/Llama-3.3-70B-Instruct-Turbo'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
    provider: 'together',
    displayName: 'Llama 3.1 405B (Together)',
    capabilities: ['text', 'tool_use', 'logprobs', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'mistralai/Mixtral-8x22B-Instruct-v0.1',
    provider: 'together',
    displayName: 'Mixtral 8x22B (Together)',
    capabilities: ['text', 'logprobs', 'json_mode'],
    contextWindow: 65_536,
    pricing: MODEL_PRICING['mistralai/Mixtral-8x22B-Instruct-v0.1'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
    provider: 'together',
    displayName: 'Qwen 2.5 72B (Together)',
    capabilities: ['text', 'tool_use', 'logprobs', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['Qwen/Qwen2.5-72B-Instruct-Turbo'] ?? null,
    qualityTier: 2,
  },

  // =========================================================================
  // Fireworks
  // =========================================================================
  {
    id: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    provider: 'fireworks',
    displayName: 'Llama 3.3 70B (Fireworks)',
    capabilities: ['text', 'tool_use', 'logprobs', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['accounts/fireworks/models/llama-v3p3-70b-instruct'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'accounts/fireworks/models/mixtral-8x22b-instruct',
    provider: 'fireworks',
    displayName: 'Mixtral 8x22B (Fireworks)',
    capabilities: ['text', 'logprobs', 'json_mode'],
    contextWindow: 65_536,
    pricing: MODEL_PRICING['accounts/fireworks/models/mixtral-8x22b-instruct'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'accounts/fireworks/models/qwen2p5-72b-instruct',
    provider: 'fireworks',
    displayName: 'Qwen 2.5 72B (Fireworks)',
    capabilities: ['text', 'logprobs', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['accounts/fireworks/models/qwen2p5-72b-instruct'] ?? null,
    qualityTier: 2,
  },

  // =========================================================================
  // Cerebras
  // =========================================================================
  {
    id: 'llama3.3-70b',
    provider: 'cerebras',
    displayName: 'Llama 3.3 70B (Cerebras)',
    capabilities: ['text', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['llama3.3-70b'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'llama3.1-8b',
    provider: 'cerebras',
    displayName: 'Llama 3.1 8B (Cerebras)',
    capabilities: ['text', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['llama3.1-8b'] ?? null,
    qualityTier: 3,
  },
  {
    id: 'qwen-3-32b',
    provider: 'cerebras',
    displayName: 'Qwen 3 32B (Cerebras)',
    capabilities: ['text', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['qwen-3-32b'] ?? null,
    qualityTier: 2,
  },

  // =========================================================================
  // Perplexity
  // =========================================================================
  {
    id: 'sonar',
    provider: 'perplexity',
    displayName: 'Sonar',
    capabilities: ['text', 'search'],
    contextWindow: 127_072,
    pricing: MODEL_PRICING['sonar'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'sonar-pro',
    provider: 'perplexity',
    displayName: 'Sonar Pro',
    capabilities: ['text', 'search'],
    contextWindow: 200_000,
    pricing: MODEL_PRICING['sonar-pro'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'sonar-reasoning',
    provider: 'perplexity',
    displayName: 'Sonar Reasoning',
    capabilities: ['text', 'search', 'reasoning'],
    contextWindow: 127_072,
    pricing: MODEL_PRICING['sonar-reasoning'] ?? null,
    qualityTier: 1,
  },

  // =========================================================================
  // OpenRouter (gateway models with current IDs)
  // =========================================================================
  {
    id: 'openai/gpt-4.1',
    provider: 'openrouter',
    displayName: 'GPT-4.1 (OpenRouter)',
    capabilities: ['text', 'tool_use', 'vision', 'logprobs', 'json_mode'],
    contextWindow: 1_000_000,
    pricing: MODEL_PRICING['openai/gpt-4.1'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    provider: 'openrouter',
    displayName: 'Claude Sonnet 4.5 (OpenRouter)',
    capabilities: ['text', 'tool_use', 'vision', 'json_mode'],
    contextWindow: 200_000,
    pricing: MODEL_PRICING['anthropic/claude-sonnet-4.5'] ?? null,
    qualityTier: 1,
  },
  {
    id: 'google/gemini-2.5-flash',
    provider: 'openrouter',
    displayName: 'Gemini 2.5 Flash (OpenRouter)',
    capabilities: ['text', 'tool_use', 'vision', 'json_mode'],
    contextWindow: 1_000_000,
    pricing: MODEL_PRICING['google/gemini-2.5-flash'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'openai/gpt-4o',
    provider: 'openrouter',
    displayName: 'GPT-4o (OpenRouter)',
    capabilities: ['text', 'tool_use', 'vision', 'logprobs', 'json_mode'],
    contextWindow: 128_000,
    pricing: MODEL_PRICING['openai/gpt-4o'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    provider: 'openrouter',
    displayName: 'Claude 3.5 Sonnet (OpenRouter)',
    capabilities: ['text', 'tool_use', 'vision', 'json_mode'],
    contextWindow: 200_000,
    pricing: MODEL_PRICING['anthropic/claude-3.5-sonnet'] ?? null,
    qualityTier: 2,
  },
  {
    id: 'google/gemini-2.0-flash',
    provider: 'openrouter',
    displayName: 'Gemini 2.0 Flash (OpenRouter)',
    capabilities: ['text', 'tool_use', 'vision', 'json_mode'],
    contextWindow: 1_000_000,
    pricing: MODEL_PRICING['google/gemini-2.0-flash'] ?? null,
    qualityTier: 3,
  },
];

// =============================================================================
// MODEL REGISTRY
// =============================================================================

export class ModelRegistry {
  private static instance: ModelRegistry;
  private models: Map<string, ModelInfo>;
  private byProvider: Map<LLMProvider, ModelInfo[]>;

  private constructor() {
    this.models = new Map();
    this.byProvider = new Map();

    for (const entry of MODEL_ENTRIES) {
      this.models.set(entry.id, entry);
      const existing = this.byProvider.get(entry.provider) ?? [];
      existing.push(entry);
      this.byProvider.set(entry.provider, existing);
    }
  }

  static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  /** Exact lookup by model ID */
  getModel(id: string): ModelInfo | null {
    return this.models.get(id) ?? null;
  }

  /** Filter models by capabilities/provider, sorted by qualityTier then cost */
  findModels(query: ModelQuery): ModelInfo[] {
    let results = Array.from(this.models.values());

    if (query.provider) {
      results = results.filter((m) => m.provider === query.provider);
    }

    if (query.preferredProviders && query.preferredProviders.length > 0) {
      results = results.filter((m) => query.preferredProviders!.includes(m.provider));
    }

    if (query.capabilities && query.capabilities.length > 0) {
      results = results.filter((m) =>
        query.capabilities!.every((c) => m.capabilities.includes(c))
      );
    }

    if (query.maxQualityTier) {
      results = results.filter((m) => m.qualityTier <= query.maxQualityTier!);
    }

    // Sort by qualityTier (ascending), then by input cost (ascending)
    results.sort((a, b) => {
      if (a.qualityTier !== b.qualityTier) return a.qualityTier - b.qualityTier;
      const costA = a.pricing?.inputPer1M ?? Infinity;
      const costB = b.pricing?.inputPer1M ?? Infinity;
      return costA - costB;
    });

    return results;
  }

  /** First result of findModels */
  findBestModel(query: ModelQuery): ModelInfo | null {
    const results = this.findModels(query);
    return results[0] ?? null;
  }

  /** Best text model for a specific provider */
  getDefaultTextModel(provider: LLMProvider): ModelInfo | null {
    return this.findBestModel({ provider, capabilities: ['text'] });
  }

  /** Best embedding model for a specific provider (null if none) */
  getDefaultEmbeddingModel(provider: LLMProvider): ModelInfo | null {
    return this.findBestModel({ provider, capabilities: ['embedding'] });
  }

  /** Providers that have at least one embedding model */
  getEmbeddingProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    for (const [provider, models] of this.byProvider.entries()) {
      if (models.some((m) => m.capabilities.includes('embedding'))) {
        providers.push(provider);
      }
    }
    return providers;
  }

  /** Providers that have at least one model supporting logprobs */
  getLogprobsProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    for (const [provider, models] of this.byProvider.entries()) {
      if (models.some((m) => m.capabilities.includes('logprobs'))) {
        providers.push(provider);
      }
    }
    return providers;
  }

  /** Heuristic inference for models not in the registry */
  inferModelInfo(id: string, provider: LLMProvider): ModelInfo {
    const lower = id.toLowerCase();

    const capabilities: ModelCapability[] = [];

    if (lower.includes('embed')) {
      capabilities.push('embedding');
    } else {
      capabilities.push('text');
      // Most modern models support these
      if (!lower.includes('embed')) {
        capabilities.push('json_mode');
      }
    }

    if (lower.includes('reason') || lower.startsWith('o')) {
      capabilities.push('reasoning');
    }

    return {
      id,
      provider,
      displayName: id,
      capabilities,
      contextWindow: 128_000,
      pricing: MODEL_PRICING[id] ?? null,
      qualityTier: 2,
    };
  }
}

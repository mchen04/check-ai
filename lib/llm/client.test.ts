/**
 * Tests for LLMClient
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LLMProvider, LLMMessage, LLMResponse, ExtendedProviderKeys } from './types';
import type { ILLMProvider, EmbeddingResult } from './providers/interfaces';
import type { ModelCapability, ModelInfo } from './model-registry';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the provider side-effect import (triggers registration)
vi.mock('./providers', () => {});

// Mock the named exports from ./providers
const mockCreateFromKeys = vi.fn<(keys: ExtendedProviderKeys) => Map<LLMProvider, ILLMProvider>>();
const mockGetProvidersByTier = vi.fn<(tier: 1 | 2 | 3 | 4) => LLMProvider[]>();

vi.mock('./providers', () => ({
  providerRegistry: {
    createFromKeys: (...args: Parameters<typeof mockCreateFromKeys>) => mockCreateFromKeys(...args),
  },
  getProvidersByTier: (...args: Parameters<typeof mockGetProvidersByTier>) => mockGetProvidersByTier(...args),
  LLMError: class LLMError extends Error {
    name = 'LLMError';
    constructor(
      message: string,
      public readonly provider: LLMProvider,
      public readonly model: string,
      public readonly cause?: unknown,
    ) {
      super(message);
    }
  },
}));

// Import after mocking so the mock wiring takes effect
const { LLMError } = await import('./providers');

// Mock ModelRegistry
const mockFindBestModel = vi.fn<(query: { provider?: LLMProvider; capabilities?: ModelCapability[] }) => ModelInfo | null>();

vi.mock('./model-registry', () => ({
  ModelRegistry: {
    getInstance: () => ({
      findBestModel: (...args: Parameters<typeof mockFindBestModel>) => mockFindBestModel(...args),
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockProvider(overrides: Partial<ILLMProvider> = {}): ILLMProvider {
  return {
    name: 'openai' as LLMProvider,
    tier: 1,
    isOpenAICompatible: true,
    isConfigured: () => true,
    complete: vi.fn(),
    getDefaultModel: () => 'gpt-4.1',
    getProviderCapabilities: () => new Set<ModelCapability>(['text']),
    ...overrides,
  };
}

function makeLLMResponse(partial: Partial<LLMResponse> = {}): LLMResponse {
  return {
    content: 'Hello world',
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    model: 'gpt-4.1',
    provider: 'openai',
    finishReason: 'stop',
    latencyMs: 100,
    ...partial,
  };
}

const SAMPLE_MESSAGES: LLMMessage[] = [{ role: 'user', content: 'Hi' }];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LLMClient', () => {
  // Lazy-import the class so mocks are wired first
  let LLMClient: typeof import('./client').LLMClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default: createFromKeys returns an empty map unless overridden per test
    mockCreateFromKeys.mockReturnValue(new Map());
    mockGetProvidersByTier.mockReturnValue([]);
    mockFindBestModel.mockReturnValue(null);

    const mod = await import('./client');
    LLMClient = mod.LLMClient;
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe('constructor', () => {
    it('should call providerRegistry.createFromKeys with the provided keys', () => {
      const keys: ExtendedProviderKeys = { openai: 'sk-test' };
      new LLMClient(keys);
      expect(mockCreateFromKeys).toHaveBeenCalledWith(keys);
    });

    it('should work with empty keys', () => {
      const keys: ExtendedProviderKeys = {};
      const client = new LLMClient(keys);
      expect(client.getAvailableProviders()).toEqual([]);
    });

    it('should store the provider map returned by the registry', () => {
      const provider = createMockProvider({ name: 'anthropic' });
      mockCreateFromKeys.mockReturnValue(new Map([['anthropic' as LLMProvider, provider]]));

      const client = new LLMClient({ anthropic: 'key' });
      expect(client.hasProvider('anthropic')).toBe(true);
      expect(client.hasProvider('openai')).toBe(false);
    });
  });

  // =========================================================================
  // complete()
  // =========================================================================

  describe('complete()', () => {
    it('should delegate to the provider instance with resolved model', async () => {
      const expected = makeLLMResponse();
      const mockComplete = vi.fn().mockResolvedValue(expected);
      const provider = createMockProvider({ complete: mockComplete });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      const result = await client.complete('openai', SAMPLE_MESSAGES, { model: 'gpt-4.1' });

      expect(mockComplete).toHaveBeenCalledWith(SAMPLE_MESSAGES, { model: 'gpt-4.1' });
      expect(result).toBe(expected);
    });

    it('should use providerInstance.getDefaultModel() when no model is specified', async () => {
      const mockComplete = vi.fn().mockResolvedValue(makeLLMResponse());
      const provider = createMockProvider({
        complete: mockComplete,
        getDefaultModel: () => 'my-default-model',
      });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      await client.complete('openai', SAMPLE_MESSAGES);

      expect(mockComplete).toHaveBeenCalledWith(SAMPLE_MESSAGES, { model: 'my-default-model' });
    });

    it('should throw LLMError when provider is not configured', async () => {
      const client = new LLMClient({});

      await expect(client.complete('openai', SAMPLE_MESSAGES)).rejects.toThrow('Provider not configured: openai');
    });

    it('should include model name in error when provider is not configured and model is given', async () => {
      const client = new LLMClient({});

      try {
        await client.complete('anthropic', SAMPLE_MESSAGES, { model: 'claude-sonnet-4.5' });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(LLMError);
        const llmErr = err as InstanceType<typeof LLMError>;
        expect(llmErr.provider).toBe('anthropic');
        expect(llmErr.model).toBe('claude-sonnet-4.5');
      }
    });

    it('should use "unknown" as model when provider is not configured and no model given', async () => {
      const client = new LLMClient({});

      try {
        await client.complete('google', SAMPLE_MESSAGES);
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(LLMError);
        const llmErr = err as InstanceType<typeof LLMError>;
        expect(llmErr.model).toBe('unknown');
      }
    });

    it('should re-throw LLMError from provider without wrapping', async () => {
      const originalError = new LLMError('rate limit', 'openai', 'gpt-4.1');
      const mockComplete = vi.fn().mockRejectedValue(originalError);
      const provider = createMockProvider({ complete: mockComplete });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });

      await expect(client.complete('openai', SAMPLE_MESSAGES)).rejects.toBe(originalError);
    });

    it('should wrap non-LLMError errors with provider and model info', async () => {
      const mockComplete = vi.fn().mockRejectedValue(new Error('network timeout'));
      const provider = createMockProvider({ complete: mockComplete, getDefaultModel: () => 'gpt-4.1' });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });

      try {
        await client.complete('openai', SAMPLE_MESSAGES, { model: 'gpt-4.1' });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(LLMError);
        const llmErr = err as InstanceType<typeof LLMError>;
        expect(llmErr.message).toContain('Failed to complete with openai/gpt-4.1');
        expect(llmErr.message).toContain('network timeout');
        expect(llmErr.provider).toBe('openai');
        expect(llmErr.model).toBe('gpt-4.1');
      }
    });

    it('should handle non-Error throw values with "Unknown error" message', async () => {
      const mockComplete = vi.fn().mockRejectedValue('string error');
      const provider = createMockProvider({ complete: mockComplete });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });

      try {
        await client.complete('openai', SAMPLE_MESSAGES, { model: 'gpt-4.1' });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(LLMError);
        const llmErr = err as InstanceType<typeof LLMError>;
        expect(llmErr.message).toContain('Unknown error');
      }
    });

    it('should forward all options to the provider', async () => {
      const mockComplete = vi.fn().mockResolvedValue(makeLLMResponse());
      const provider = createMockProvider({ complete: mockComplete });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      const options = {
        model: 'gpt-4.1',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        logprobs: true,
        topLogprobs: 5,
      };

      await client.complete('openai', SAMPLE_MESSAGES, options);

      expect(mockComplete).toHaveBeenCalledWith(SAMPLE_MESSAGES, options);
    });
  });

  // =========================================================================
  // hasProvider()
  // =========================================================================

  describe('hasProvider()', () => {
    it('should return true for a configured provider', () => {
      const provider = createMockProvider({ name: 'openai' });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      expect(client.hasProvider('openai')).toBe(true);
    });

    it('should return false for a non-configured provider', () => {
      mockCreateFromKeys.mockReturnValue(new Map());

      const client = new LLMClient({});
      expect(client.hasProvider('anthropic')).toBe(false);
    });

    it('should distinguish between configured and non-configured providers', () => {
      const openai = createMockProvider({ name: 'openai' });
      const google = createMockProvider({ name: 'google' });
      mockCreateFromKeys.mockReturnValue(new Map([
        ['openai' as LLMProvider, openai],
        ['google' as LLMProvider, google],
      ]));

      const client = new LLMClient({ openai: 'sk-a', google: 'gk-b' });
      expect(client.hasProvider('openai')).toBe(true);
      expect(client.hasProvider('google')).toBe(true);
      expect(client.hasProvider('anthropic')).toBe(false);
      expect(client.hasProvider('mistral')).toBe(false);
    });
  });

  // =========================================================================
  // getAvailableProviders()
  // =========================================================================

  describe('getAvailableProviders()', () => {
    it('should return empty array when no providers configured', () => {
      const client = new LLMClient({});
      expect(client.getAvailableProviders()).toEqual([]);
    });

    it('should return all configured provider names', () => {
      const openai = createMockProvider({ name: 'openai' });
      const anthropic = createMockProvider({ name: 'anthropic' });
      const google = createMockProvider({ name: 'google' });
      mockCreateFromKeys.mockReturnValue(new Map([
        ['openai' as LLMProvider, openai],
        ['anthropic' as LLMProvider, anthropic],
        ['google' as LLMProvider, google],
      ]));

      const client = new LLMClient({ openai: 'a', anthropic: 'b', google: 'c' });
      const providers = client.getAvailableProviders();

      expect(providers).toHaveLength(3);
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('google');
    });

    it('should return a new array each time (not a reference to internal state)', () => {
      const provider = createMockProvider();
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      const a = client.getAvailableProviders();
      const b = client.getAvailableProviders();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });
  });

  // =========================================================================
  // getProvidersByTier()
  // =========================================================================

  describe('getProvidersByTier()', () => {
    it('should return only configured providers from the requested tier', () => {
      const openai = createMockProvider({ name: 'openai' });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, openai]]));
      // Simulate tier 1 having openai, anthropic, google
      mockGetProvidersByTier.mockReturnValue(['openai', 'anthropic', 'google'] as LLMProvider[]);

      const client = new LLMClient({ openai: 'sk-test' });
      const tier1 = client.getProvidersByTier(1);

      expect(tier1).toEqual(['openai']);
    });

    it('should return empty array when no configured providers in the tier', () => {
      mockCreateFromKeys.mockReturnValue(new Map());
      mockGetProvidersByTier.mockReturnValue(['mistral', 'google'] as LLMProvider[]);

      const client = new LLMClient({});
      expect(client.getProvidersByTier(1)).toEqual([]);
    });

    it('should call getProvidersByTier with the correct tier argument', () => {
      mockCreateFromKeys.mockReturnValue(new Map());
      mockGetProvidersByTier.mockReturnValue([]);

      const client = new LLMClient({});
      client.getProvidersByTier(2);

      expect(mockGetProvidersByTier).toHaveBeenCalledWith(2);
    });

    it('should filter all tiers correctly', () => {
      const openai = createMockProvider({ name: 'openai' });
      const mistral = createMockProvider({ name: 'mistral' });
      mockCreateFromKeys.mockReturnValue(new Map([
        ['openai' as LLMProvider, openai],
        ['mistral' as LLMProvider, mistral],
      ]));

      const client = new LLMClient({ openai: 'a', mistral: 'b' });

      mockGetProvidersByTier.mockReturnValue(['openai', 'anthropic'] as LLMProvider[]);
      expect(client.getProvidersByTier(1)).toEqual(['openai']);

      mockGetProvidersByTier.mockReturnValue(['azure', 'bedrock'] as LLMProvider[]);
      expect(client.getProvidersByTier(2)).toEqual([]);

      mockGetProvidersByTier.mockReturnValue(['openai', 'mistral'] as LLMProvider[]);
      expect(client.getProvidersByTier(1)).toEqual(['openai', 'mistral']);
    });
  });

  // =========================================================================
  // getDefaultModel()
  // =========================================================================

  describe('getDefaultModel()', () => {
    it('should return the provider instance default model when available', () => {
      const provider = createMockProvider({ getDefaultModel: () => 'custom-model' });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      expect(client.getDefaultModel('openai')).toBe('custom-model');
    });

    it('should fall back to DEFAULT_MODELS when provider is not in the map', () => {
      mockCreateFromKeys.mockReturnValue(new Map());

      const client = new LLMClient({});
      // Should return the static default from config
      const model = client.getDefaultModel('openai');
      expect(typeof model).toBe('string');
      expect(model.length).toBeGreaterThan(0);
    });

    it('should fall back to DEFAULT_MODELS when getDefaultModel returns empty string', () => {
      const provider = createMockProvider({ getDefaultModel: () => '' });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      const model = client.getDefaultModel('openai');
      // Empty string is falsy, so it falls back to DEFAULT_MODELS
      expect(model.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // getEmbedding()
  // =========================================================================

  describe('getEmbedding()', () => {
    it('should delegate to provider.getEmbedding when available', async () => {
      const embeddingResult: EmbeddingResult = {
        embeddings: [[0.1, 0.2, 0.3]],
        model: 'text-embedding-3-small',
        provider: 'openai',
        usage: { inputTokens: 5 },
      };
      const mockGetEmbedding = vi.fn().mockResolvedValue(embeddingResult);
      const provider = createMockProvider({ getEmbedding: mockGetEmbedding });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      const result = await client.getEmbedding('openai', ['hello'], 'text-embedding-3-small');

      expect(mockGetEmbedding).toHaveBeenCalledWith(['hello'], 'text-embedding-3-small');
      expect(result).toBe(embeddingResult);
    });

    it('should return null when provider is not configured', async () => {
      mockCreateFromKeys.mockReturnValue(new Map());

      const client = new LLMClient({});
      const result = await client.getEmbedding('openai', ['hello']);
      expect(result).toBeNull();
    });

    it('should return null when provider does not support embeddings', async () => {
      // Provider without getEmbedding method
      const provider = createMockProvider();
      delete (provider as Record<string, unknown>).getEmbedding;
      mockCreateFromKeys.mockReturnValue(new Map([['anthropic' as LLMProvider, provider]]));

      const client = new LLMClient({ anthropic: 'key' });
      const result = await client.getEmbedding('anthropic', ['hello']);
      expect(result).toBeNull();
    });

    it('should pass model parameter as undefined when not provided', async () => {
      const mockGetEmbedding = vi.fn().mockResolvedValue(null);
      const provider = createMockProvider({ getEmbedding: mockGetEmbedding });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      await client.getEmbedding('openai', ['hello']);

      expect(mockGetEmbedding).toHaveBeenCalledWith(['hello'], undefined);
    });

    it('should pass multiple texts to the provider', async () => {
      const mockGetEmbedding = vi.fn().mockResolvedValue({
        embeddings: [[0.1], [0.2], [0.3]],
        model: 'text-embedding-3-small',
        provider: 'openai',
        usage: { inputTokens: 15 },
      });
      const provider = createMockProvider({ getEmbedding: mockGetEmbedding });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      const texts = ['one', 'two', 'three'];
      await client.getEmbedding('openai', texts);

      expect(mockGetEmbedding).toHaveBeenCalledWith(texts, undefined);
    });
  });

  // =========================================================================
  // getProviderInstance()
  // =========================================================================

  describe('getProviderInstance()', () => {
    it('should return the provider instance when configured', () => {
      const provider = createMockProvider({ name: 'openai' });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      expect(client.getProviderInstance('openai')).toBe(provider);
    });

    it('should return undefined when provider is not configured', () => {
      mockCreateFromKeys.mockReturnValue(new Map());

      const client = new LLMClient({});
      expect(client.getProviderInstance('openai')).toBeUndefined();
    });
  });

  // =========================================================================
  // findProviderWithCapability()
  // =========================================================================

  describe('findProviderWithCapability()', () => {
    it('should return provider when it has the capability directly', () => {
      const provider = createMockProvider({
        name: 'openai',
        getProviderCapabilities: () => new Set<ModelCapability>(['text', 'embedding']),
      });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      expect(client.findProviderWithCapability('embedding')).toBe('openai');
    });

    it('should return null when no provider has the capability', () => {
      const provider = createMockProvider({
        name: 'openai',
        getProviderCapabilities: () => new Set<ModelCapability>(['text']),
      });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));
      mockFindBestModel.mockReturnValue(null);

      const client = new LLMClient({ openai: 'sk-test' });
      expect(client.findProviderWithCapability('embedding')).toBeNull();
    });

    it('should fall back to ModelRegistry when provider capabilities do not match', () => {
      const provider = createMockProvider({
        name: 'openai',
        getProviderCapabilities: () => new Set<ModelCapability>(['text']),
      });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));
      mockFindBestModel.mockReturnValue({
        id: 'text-embedding-3-small',
        provider: 'openai',
        displayName: 'Text Embedding 3 Small',
        capabilities: ['embedding'],
        contextWindow: 8191,
        pricing: null,
        qualityTier: 2,
      } as ModelInfo);

      const client = new LLMClient({ openai: 'sk-test' });
      expect(client.findProviderWithCapability('embedding')).toBe('openai');
      expect(mockFindBestModel).toHaveBeenCalledWith({
        provider: 'openai',
        capabilities: ['embedding'],
      });
    });

    it('should respect preferenceOrder when provided', () => {
      const openai = createMockProvider({
        name: 'openai',
        getProviderCapabilities: () => new Set<ModelCapability>(['text', 'embedding']),
      });
      const google = createMockProvider({
        name: 'google',
        getProviderCapabilities: () => new Set<ModelCapability>(['text', 'embedding']),
      });
      mockCreateFromKeys.mockReturnValue(new Map([
        ['openai' as LLMProvider, openai],
        ['google' as LLMProvider, google],
      ]));

      const client = new LLMClient({ openai: 'a', google: 'b' });

      // Prefer google first
      expect(client.findProviderWithCapability('embedding', ['google', 'openai'])).toBe('google');
      // Prefer openai first
      expect(client.findProviderWithCapability('embedding', ['openai', 'google'])).toBe('openai');
    });

    it('should skip providers in preferenceOrder that are not configured', () => {
      const google = createMockProvider({
        name: 'google',
        getProviderCapabilities: () => new Set<ModelCapability>(['text', 'embedding']),
      });
      mockCreateFromKeys.mockReturnValue(new Map([['google' as LLMProvider, google]]));

      const client = new LLMClient({ google: 'key' });
      // anthropic is not configured, should be skipped
      const result = client.findProviderWithCapability('embedding', ['anthropic', 'google']);
      expect(result).toBe('google');
    });

    it('should use providers map key order when no preferenceOrder given', () => {
      const anthropic = createMockProvider({
        name: 'anthropic',
        getProviderCapabilities: () => new Set<ModelCapability>(['text']),
      });
      const openai = createMockProvider({
        name: 'openai',
        getProviderCapabilities: () => new Set<ModelCapability>(['text', 'logprobs']),
      });
      // anthropic is first in the map
      mockCreateFromKeys.mockReturnValue(new Map([
        ['anthropic' as LLMProvider, anthropic],
        ['openai' as LLMProvider, openai],
      ]));
      mockFindBestModel.mockReturnValue(null);

      const client = new LLMClient({ anthropic: 'a', openai: 'b' });
      // logprobs: anthropic does not have it (nor registry fallback), openai does
      const result = client.findProviderWithCapability('logprobs');
      expect(result).toBe('openai');
    });

    it('should check provider capabilities before consulting registry', () => {
      const provider = createMockProvider({
        name: 'openai',
        getProviderCapabilities: () => new Set<ModelCapability>(['text', 'embedding']),
      });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      client.findProviderWithCapability('embedding');

      // Registry should NOT be consulted because the provider already advertises the capability
      expect(mockFindBestModel).not.toHaveBeenCalled();
    });

    it('should return null when preferenceOrder is empty', () => {
      const provider = createMockProvider({
        name: 'openai',
        getProviderCapabilities: () => new Set<ModelCapability>(['text', 'embedding']),
      });
      mockCreateFromKeys.mockReturnValue(new Map([['openai' as LLMProvider, provider]]));

      const client = new LLMClient({ openai: 'sk-test' });
      expect(client.findProviderWithCapability('embedding', [])).toBeNull();
    });

    it('should return the first matching provider when multiple match', () => {
      const openai = createMockProvider({
        name: 'openai',
        getProviderCapabilities: () => new Set<ModelCapability>(['text', 'vision']),
      });
      const google = createMockProvider({
        name: 'google',
        getProviderCapabilities: () => new Set<ModelCapability>(['text', 'vision']),
      });
      mockCreateFromKeys.mockReturnValue(new Map([
        ['openai' as LLMProvider, openai],
        ['google' as LLMProvider, google],
      ]));

      const client = new LLMClient({ openai: 'a', google: 'b' });
      // Without preference, iteration order determines result
      const result = client.findProviderWithCapability('vision');
      expect(result).toBe('openai');
    });
  });

  // =========================================================================
  // Integration-style: multiple providers
  // =========================================================================

  describe('multi-provider scenarios', () => {
    it('should support calling complete on different providers', async () => {
      const openaiResponse = makeLLMResponse({ content: 'openai reply', provider: 'openai' });
      const anthropicResponse = makeLLMResponse({ content: 'anthropic reply', provider: 'anthropic' });

      const openai = createMockProvider({
        name: 'openai',
        complete: vi.fn().mockResolvedValue(openaiResponse),
      });
      const anthropic = createMockProvider({
        name: 'anthropic',
        complete: vi.fn().mockResolvedValue(anthropicResponse),
        getDefaultModel: () => 'claude-sonnet-4.5',
      });

      mockCreateFromKeys.mockReturnValue(new Map([
        ['openai' as LLMProvider, openai],
        ['anthropic' as LLMProvider, anthropic],
      ]));

      const client = new LLMClient({ openai: 'a', anthropic: 'b' });

      const r1 = await client.complete('openai', SAMPLE_MESSAGES);
      expect(r1.content).toBe('openai reply');

      const r2 = await client.complete('anthropic', SAMPLE_MESSAGES);
      expect(r2.content).toBe('anthropic reply');
    });
  });
});

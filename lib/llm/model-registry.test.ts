/**
 * Tests for Model Registry
 */

import { describe, it, expect } from 'vitest';
import { ModelRegistry } from './model-registry';
import type { ModelCapability, ModelQuery } from './model-registry';

describe('ModelRegistry', () => {
  const registry = ModelRegistry.getInstance();

  describe('singleton', () => {
    it('should return the same instance', () => {
      const a = ModelRegistry.getInstance();
      const b = ModelRegistry.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('getModel', () => {
    it('should return model info for known models', () => {
      const model = registry.getModel('gpt-4.1');
      expect(model).not.toBeNull();
      expect(model!.provider).toBe('openai');
      expect(model!.capabilities).toContain('text');
    });

    it('should return null for unknown models', () => {
      expect(registry.getModel('nonexistent-model-xyz')).toBeNull();
    });

    it('should return embedding info for embedding models', () => {
      const model = registry.getModel('text-embedding-3-small');
      expect(model).not.toBeNull();
      expect(model!.capabilities).toContain('embedding');
      expect(model!.embeddingDimension).toBe(1536);
    });
  });

  describe('findModels', () => {
    it('should filter by provider', () => {
      const models = registry.findModels({ provider: 'openai' });
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'openai')).toBe(true);
    });

    it('should filter by capabilities', () => {
      const models = registry.findModels({ capabilities: ['embedding'] });
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.capabilities.includes('embedding'))).toBe(true);
    });

    it('should filter by multiple capabilities', () => {
      const models = registry.findModels({
        capabilities: ['text', 'logprobs'] as ModelCapability[],
      });
      expect(models.length).toBeGreaterThan(0);
      for (const m of models) {
        expect(m.capabilities).toContain('text');
        expect(m.capabilities).toContain('logprobs');
      }
    });

    it('should filter by maxQualityTier', () => {
      const models = registry.findModels({ maxQualityTier: 1 });
      expect(models.every((m) => m.qualityTier === 1)).toBe(true);
    });

    it('should sort by qualityTier then cost', () => {
      const models = registry.findModels({ provider: 'openai', capabilities: ['text'] });
      for (let i = 1; i < models.length; i++) {
        const prev = models[i - 1];
        const curr = models[i];
        if (prev.qualityTier === curr.qualityTier) {
          const prevCost = prev.pricing?.inputPer1M ?? Infinity;
          const currCost = curr.pricing?.inputPer1M ?? Infinity;
          expect(prevCost).toBeLessThanOrEqual(currCost);
        } else {
          expect(prev.qualityTier).toBeLessThan(curr.qualityTier);
        }
      }
    });

    it('should filter by preferredProviders', () => {
      const models = registry.findModels({
        preferredProviders: ['openai', 'google'],
        capabilities: ['embedding'],
      });
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'openai' || m.provider === 'google')).toBe(true);
    });
  });

  describe('findBestModel', () => {
    it('should return the best text model for a provider', () => {
      const model = registry.findBestModel({ provider: 'openai', capabilities: ['text'] });
      expect(model).not.toBeNull();
      expect(model!.qualityTier).toBe(1);
    });

    it('should return null when no models match', () => {
      const model = registry.findBestModel({
        provider: 'perplexity',
        capabilities: ['embedding'],
      });
      expect(model).toBeNull();
    });
  });

  describe('getDefaultTextModel', () => {
    it('should return flagship text model for each major provider', () => {
      for (const provider of ['openai', 'anthropic', 'google'] as const) {
        const model = registry.getDefaultTextModel(provider);
        expect(model).not.toBeNull();
        expect(model!.qualityTier).toBe(1);
        expect(model!.capabilities).toContain('text');
      }
    });
  });

  describe('getDefaultEmbeddingModel', () => {
    it('should return embedding models for providers that have them', () => {
      const openaiEmbed = registry.getDefaultEmbeddingModel('openai');
      expect(openaiEmbed).not.toBeNull();
      expect(openaiEmbed!.capabilities).toContain('embedding');

      const googleEmbed = registry.getDefaultEmbeddingModel('google');
      expect(googleEmbed).not.toBeNull();

      const cohereEmbed = registry.getDefaultEmbeddingModel('cohere');
      expect(cohereEmbed).not.toBeNull();

      const mistralEmbed = registry.getDefaultEmbeddingModel('mistral');
      expect(mistralEmbed).not.toBeNull();
    });

    it('should return null for providers without embedding models', () => {
      expect(registry.getDefaultEmbeddingModel('anthropic')).toBeNull();
      expect(registry.getDefaultEmbeddingModel('deepseek')).toBeNull();
      expect(registry.getDefaultEmbeddingModel('perplexity')).toBeNull();
    });
  });

  describe('getEmbeddingProviders', () => {
    it('should return providers with embedding models', () => {
      const providers = registry.getEmbeddingProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('google');
      expect(providers).toContain('cohere');
      expect(providers).toContain('mistral');
      expect(providers).not.toContain('anthropic');
      expect(providers).not.toContain('deepseek');
    });
  });

  describe('getLogprobsProviders', () => {
    it('should return providers with logprobs models', () => {
      const providers = registry.getLogprobsProviders();
      expect(providers).toContain('openai');
      // Groq, together, fireworks also support logprobs
      expect(providers).toContain('groq');
      expect(providers).toContain('together');
      expect(providers).toContain('fireworks');
      expect(providers).not.toContain('anthropic');
    });
  });

  describe('inferModelInfo', () => {
    it('should infer embedding capability from name', () => {
      const info = registry.inferModelInfo('some-embed-model', 'openai');
      expect(info.capabilities).toContain('embedding');
      expect(info.capabilities).not.toContain('text');
    });

    it('should default to text for non-embedding models', () => {
      const info = registry.inferModelInfo('custom-chat-model', 'anthropic');
      expect(info.capabilities).toContain('text');
      expect(info.capabilities).not.toContain('embedding');
    });

    it('should infer reasoning capability from name', () => {
      const info = registry.inferModelInfo('o3-custom', 'openai');
      expect(info.capabilities).toContain('reasoning');
    });

    it('should use provided provider', () => {
      const info = registry.inferModelInfo('my-model', 'google');
      expect(info.provider).toBe('google');
    });
  });
});

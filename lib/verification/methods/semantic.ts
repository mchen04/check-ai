/**
 * Semantic Verification Method
 * Uses embedding similarity for quick verification
 *
 * FPR: 50-100% (high false positive rate due to semantic illusions)
 * Latency: <100ms
 * Best for: Quick filtering, low-stakes content
 */

import OpenAI from 'openai';
import { calculateCostCents } from '@/lib/llm';
import { ParadigmExecutor, ParadigmResult, ParadigmOptions, Verdict } from '../types';
import { createParadigmErrorResult } from './shared';

// =============================================================================
// EMBEDDING CONFIGURATION
// =============================================================================

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// Reference embeddings for common verification patterns
// In production, these would be loaded from a vector database
const TRUTH_INDICATORS = [
  'This is accurate and verifiable',
  'The statement is factually correct',
  'This claim is supported by evidence',
];

const FALSEHOOD_INDICATORS = [
  'This is inaccurate and misleading',
  'The statement contains factual errors',
  'This claim contradicts established facts',
];

// =============================================================================
// SEMANTIC PARADIGM EXECUTOR
// =============================================================================

export class SemanticParadigm implements ParadigmExecutor {
  name = 'semantic' as const;
  private openaiClient: OpenAI | null = null;
  // Cache reference embeddings to avoid redundant API calls
  private truthEmbeddingsCache: number[][] | null = null;
  private falsehoodEmbeddingsCache: number[][] | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openaiClient = new OpenAI({ apiKey });
    }
  }

  async execute(
    content: string,
    context: Record<string, unknown>,
    options: ParadigmOptions
  ): Promise<ParadigmResult> {
    const startTime = Date.now();

    try {
      // Initialize client if needed
      if (!this.openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OpenAI API key required for semantic verification');
        }
        this.openaiClient = new OpenAI({ apiKey });
      }

      // Cache reference embeddings (fetch once, reuse for all verifications)
      if (!this.truthEmbeddingsCache) {
        this.truthEmbeddingsCache = await Promise.all(
          TRUTH_INDICATORS.map((t) => this.getEmbedding(t))
        );
      }
      if (!this.falsehoodEmbeddingsCache) {
        this.falsehoodEmbeddingsCache = await Promise.all(
          FALSEHOOD_INDICATORS.map((f) => this.getEmbedding(f))
        );
      }

      // Get embedding for the content (only API call needed per verification)
      const contentEmbedding = await this.getEmbedding(content);

      // Calculate average similarity to cached truth and falsehood indicators
      const truthSimilarity = this.averageSimilarity(contentEmbedding, this.truthEmbeddingsCache);
      const falsehoodSimilarity = this.averageSimilarity(contentEmbedding, this.falsehoodEmbeddingsCache);

      // Determine verdict based on similarity scores
      let verdict: Verdict;
      let confidence: number;

      if (truthSimilarity > falsehoodSimilarity + 0.1) {
        verdict = 'true';
        confidence = Math.min(0.9, truthSimilarity);
      } else if (falsehoodSimilarity > truthSimilarity + 0.1) {
        verdict = 'false';
        confidence = Math.min(0.9, falsehoodSimilarity);
      } else {
        verdict = 'uncertain';
        confidence = 0.5;
      }

      // Estimate token usage (embedding model)
      const inputTokens = Math.ceil(content.length / 4);
      const outputTokens = 0; // Embeddings don't have output tokens
      const costCents = calculateCostCents(EMBEDDING_MODEL, inputTokens, outputTokens);

      return {
        paradigm: 'semantic',
        weight: options.weight,
        provider: 'openai',
        model: EMBEDDING_MODEL,
        verdict,
        confidence,
        reasoning: `Semantic similarity analysis: Truth similarity ${(truthSimilarity * 100).toFixed(1)}%, Falsehood similarity ${(falsehoodSimilarity * 100).toFixed(1)}%. Note: Semantic methods have high false positive rates due to semantic illusions in RLHF-trained models.`,
        processingTimeMs: Date.now() - startTime,
        costCents,
        tokenUsage: {
          inputTokens,
          outputTokens,
        },
      };
    } catch (error) {
      return createParadigmErrorResult(
        'semantic',
        options.weight,
        'openai',
        EMBEDDING_MODEL,
        Date.now() - startTime,
        error
      );
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openaiClient.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    return response.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const len = a.length;
    if (len !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Single-pass calculation of average similarity (js-combine-iterations)
  private averageSimilarity(embedding: number[], references: number[][]): number {
    if (references.length === 0) return 0;

    let sum = 0;
    for (const ref of references) {
      sum += this.cosineSimilarity(embedding, ref);
    }
    return sum / references.length;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createSemanticParadigm(apiKey?: string): SemanticParadigm {
  return new SemanticParadigm(apiKey);
}

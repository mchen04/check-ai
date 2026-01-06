/**
 * Verification Orchestrator
 * Coordinates multiple verification paradigms and calculates consensus
 */

import { v4 as uuidv4 } from 'uuid';
import { ProviderKeys } from '@/lib/llm/types';
import {
  ParadigmType,
  ParadigmExecutor,
  ParadigmResult,
  VerificationResult,
  MethodsConfig,
  calculateConsensus,
  determineDecision,
} from './types';
import {
  createSemanticParadigm,
  createReasoningParadigm,
  createToolParadigm,
  createBiPRMParadigm,
  createEnsembleParadigm,
  createEntropyParadigm,
  createFormalParadigm,
} from './methods';

// =============================================================================
// ORCHESTRATOR CONFIGURATION
// =============================================================================

interface OrchestratorConfig {
  keys: ProviderKeys;
  defaultTimeout?: number;
  maxParallelMethods?: number;
}

interface VerifyOptions {
  context?: Record<string, unknown>;
  methods: MethodsConfig;
  idempotencyKey?: string;
  timeout?: number;
}

// =============================================================================
// PARADIGM REGISTRY
// =============================================================================

type ParadigmFactory = (keys: ProviderKeys) => ParadigmExecutor;

const PARADIGM_FACTORIES: Record<ParadigmType, ParadigmFactory> = {
  semantic: (keys) => createSemanticParadigm(keys.openai),
  reasoning: createReasoningParadigm,
  tool: createToolParadigm,
  biprm: createBiPRMParadigm,
  ensemble: createEnsembleParadigm,
  entropy: createEntropyParadigm,
  formal: createFormalParadigm,
};

// =============================================================================
// VERIFICATION ORCHESTRATOR
// =============================================================================

export class VerificationOrchestrator {
  protected keys: ProviderKeys;
  protected defaultTimeout: number;
  protected maxParallelMethods: number;
  protected paradigmExecutors: Map<ParadigmType, ParadigmExecutor>;

  constructor(config: OrchestratorConfig) {
    this.keys = config.keys;
    this.defaultTimeout = config.defaultTimeout || 30000;
    this.maxParallelMethods = config.maxParallelMethods || 7;
    this.paradigmExecutors = new Map();
  }

  /**
   * Get or create a paradigm executor
   */
  protected getExecutor(paradigm: ParadigmType): ParadigmExecutor {
    if (!this.paradigmExecutors.has(paradigm)) {
      const factory = PARADIGM_FACTORIES[paradigm];
      if (!factory) {
        throw new Error(`Unknown paradigm: ${paradigm}`);
      }
      this.paradigmExecutors.set(paradigm, factory(this.keys));
    }
    return this.paradigmExecutors.get(paradigm)!;
  }

  /**
   * Run verification with selected methods
   */
  async verify(content: string, options: VerifyOptions): Promise<VerificationResult> {
    const startTime = Date.now();
    const id = uuidv4();

    // Parse methods configuration
    const methodsToRun = this.parseMethodsConfig(options.methods);

    if (methodsToRun.length === 0) {
      return this.createErrorResult(id, content, 'No verification methods specified');
    }

    // Execute methods in parallel (with limit)
    const results = await this.executeParadigms(
      content,
      options.context || {},
      methodsToRun,
      options.timeout || this.defaultTimeout
    );

    // Calculate consensus from results
    const { verdict, confidence, reasoning } = calculateConsensus(results);

    // Determine decision based on confidence and agreement
    const decision = determineDecision(verdict, confidence, results);

    // Calculate total cost
    const totalCost = results.reduce((sum, r) => sum + r.costCents, 0);

    return {
      id,
      content,
      status: 'completed',
      verdict,
      confidence,
      decision,
      reasoning,
      paradigmResults: results,
      processingTimeMs: Date.now() - startTime,
      costCents: totalCost,
      cached: false,
    };
  }

  /**
   * Parse methods config into array of paradigms with weights
   */
  protected parseMethodsConfig(
    config: MethodsConfig
  ): Array<{ paradigm: ParadigmType; weight: number }> {
    const methods: Array<{ paradigm: ParadigmType; weight: number }> = [];

    const paradigmTypes: ParadigmType[] = [
      'semantic',
      'reasoning',
      'tool',
      'biprm',
      'ensemble',
      'entropy',
      'formal',
    ];

    for (const paradigm of paradigmTypes) {
      const weight = config[paradigm];
      if (weight !== undefined && weight > 0) {
        methods.push({ paradigm, weight });
      }
    }

    return methods;
  }

  /**
   * Execute paradigms in parallel with concurrency limit
   */
  protected async executeParadigms(
    content: string,
    context: Record<string, unknown>,
    methods: Array<{ paradigm: ParadigmType; weight: number }>,
    timeout: number
  ): Promise<ParadigmResult[]> {
    // Execute in batches if exceeding max parallel
    const results: ParadigmResult[] = [];

    for (let i = 0; i < methods.length; i += this.maxParallelMethods) {
      const batch = methods.slice(i, i + this.maxParallelMethods);

      const batchPromises = batch.map(async ({ paradigm, weight }) => {
        try {
          const executor = this.getExecutor(paradigm);
          return await executor.execute(content, context, {
            weight,
            timeout,
          });
        } catch (error) {
          // Return error result for failed paradigm
          return {
            paradigm,
            weight,
            provider: 'openai' as const,
            model: 'unknown',
            verdict: null,
            confidence: 0,
            reasoning: null,
            processingTimeMs: 0,
            costCents: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Create error result
   */
  private createErrorResult(id: string, content: string, error: string): VerificationResult {
    return {
      id,
      content,
      status: 'failed',
      verdict: null,
      confidence: 0,
      decision: 'escalate',
      reasoning: error,
      paradigmResults: [],
      processingTimeMs: 0,
      costCents: 0,
      cached: false,
    };
  }

  /**
   * Get available methods based on API keys
   */
  getAvailableMethods(): ParadigmType[] {
    const available: ParadigmType[] = [];

    // Semantic requires OpenAI
    if (this.keys.openai) {
      available.push('semantic');
    }

    // Most methods work with any LLM provider
    const hasAnyProvider = Object.values(this.keys).some(Boolean);

    if (hasAnyProvider) {
      available.push('reasoning', 'tool', 'biprm', 'entropy', 'formal');

      // Ensemble requires at least 2 providers ideally
      const providerCount = Object.values(this.keys).filter(Boolean).length;
      if (providerCount >= 2) {
        available.push('ensemble');
      } else if (this.keys.openai) {
        // Can still use ensemble with multiple OpenAI models
        available.push('ensemble');
      }
    }

    return available;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createOrchestrator(config: OrchestratorConfig): VerificationOrchestrator {
  return new VerificationOrchestrator(config);
}

// =============================================================================
// STREAMING VERIFICATION (for real-time updates)
// =============================================================================

export interface VerificationUpdate {
  type: 'started' | 'paradigm_started' | 'paradigm_completed' | 'completed' | 'error';
  verificationId: string;
  timestamp: number;
  data: {
    paradigm?: ParadigmType;
    result?: ParadigmResult;
    finalResult?: VerificationResult;
    error?: string;
    progress?: {
      completed: number;
      total: number;
    };
  };
}

export type UpdateCallback = (update: VerificationUpdate) => void;

/**
 * Streaming verification orchestrator with callbacks for real-time updates
 */
export class StreamingVerificationOrchestrator extends VerificationOrchestrator {
  private updateCallback: UpdateCallback | null = null;
  private currentVerificationId: string | null = null;
  private totalMethods: number = 0;
  private completedMethods: number = 0;

  setUpdateCallback(callback: UpdateCallback): void {
    this.updateCallback = callback;
  }

  setVerificationId(id: string): void {
    this.currentVerificationId = id;
  }

  private emitUpdate(update: VerificationUpdate): void {
    if (this.updateCallback) {
      try {
        this.updateCallback(update);
      } catch (error) {
        // Don't let callback errors break verification
        console.error('Error in update callback:', error);
      }
    }
  }

  /**
   * Override executeParadigms to emit per-paradigm events
   */
  protected async executeParadigms(
    content: string,
    context: Record<string, unknown>,
    methods: Array<{ paradigm: ParadigmType; weight: number }>,
    timeout: number
  ): Promise<ParadigmResult[]> {
    const results: ParadigmResult[] = [];
    this.totalMethods = methods.length;
    this.completedMethods = 0;

    for (let i = 0; i < methods.length; i += this.maxParallelMethods) {
      const batch = methods.slice(i, i + this.maxParallelMethods);

      const batchPromises = batch.map(async ({ paradigm, weight }) => {
        // Emit paradigm_started event
        if (this.currentVerificationId) {
          this.emitUpdate({
            type: 'paradigm_started',
            verificationId: this.currentVerificationId,
            timestamp: Date.now(),
            data: { paradigm },
          });
        }

        try {
          const executor = this.getExecutor(paradigm);
          const result = await executor.execute(content, context, {
            weight,
            timeout,
          });

          this.completedMethods++;

          // Emit paradigm_completed event
          if (this.currentVerificationId) {
            this.emitUpdate({
              type: 'paradigm_completed',
              verificationId: this.currentVerificationId,
              timestamp: Date.now(),
              data: {
                paradigm,
                result,
                progress: {
                  completed: this.completedMethods,
                  total: this.totalMethods,
                },
              },
            });
          }

          return result;
        } catch (error) {
          this.completedMethods++;

          // Create error result
          const errorResult: ParadigmResult = {
            paradigm,
            weight,
            provider: 'openai' as const,
            model: 'unknown',
            verdict: null,
            confidence: 0,
            reasoning: null,
            processingTimeMs: 0,
            costCents: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          };

          // Emit paradigm_completed event (even for errors)
          if (this.currentVerificationId) {
            this.emitUpdate({
              type: 'paradigm_completed',
              verificationId: this.currentVerificationId,
              timestamp: Date.now(),
              data: {
                paradigm,
                result: errorResult,
                progress: {
                  completed: this.completedMethods,
                  total: this.totalMethods,
                },
              },
            });
          }

          return errorResult;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Run verification with streaming updates
   * Use setVerificationId() before calling this to use an existing ID
   */
  async verifyWithUpdates(content: string, options: VerifyOptions): Promise<VerificationResult> {
    const verificationId = this.currentVerificationId || uuidv4();
    this.currentVerificationId = verificationId;

    // Reset counters
    this.completedMethods = 0;
    this.totalMethods = 0;

    // Calculate total methods for progress
    const methodsToRun = this.parseMethodsConfig(options.methods);
    this.totalMethods = methodsToRun.length;

    // Emit started event
    this.emitUpdate({
      type: 'started',
      verificationId,
      timestamp: Date.now(),
      data: {
        progress: {
          completed: 0,
          total: this.totalMethods,
        },
      },
    });

    try {
      const result = await this.verify(content, options);

      // Emit completed event
      this.emitUpdate({
        type: 'completed',
        verificationId,
        timestamp: Date.now(),
        data: {
          finalResult: result,
          progress: {
            completed: this.totalMethods,
            total: this.totalMethods,
          },
        },
      });

      return result;
    } catch (error) {
      // Emit error event
      this.emitUpdate({
        type: 'error',
        verificationId,
        timestamp: Date.now(),
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { MethodsConfig, VerificationResult, ParadigmResult, ParadigmType } from './types';

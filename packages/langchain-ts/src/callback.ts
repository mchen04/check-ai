/**
 * VerifyAI LangChain Callback Handler
 * Auto-verify LLM outputs via LangChain callbacks
 */

import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { LLMResult } from '@langchain/core/outputs';
import type { Serialized } from '@langchain/core/load/serializable';
import type { VerifyAI, MethodsConfig, VerifyResponse } from '@verifyai/sdk';
import { VerificationRejectedError } from './errors';

/**
 * Result of a verification check attached to LLM output
 */
export interface VerificationResult {
  /** Unique ID for the verification */
  verificationId: string;
  /** 'true', 'false', or 'uncertain' */
  verdict?: string;
  /** Confidence score (0-1) */
  confidence?: number;
  /** 'accept', 'refine', 'escalate', or 'reject' */
  decision?: string;
  /** Explanation of the verification result */
  reasoning?: string;
  /** Whether result came from cache */
  cached: boolean;
}

/**
 * Options for VerifyAICallbackHandler
 */
export interface VerifyAICallbackHandlerOptions {
  /** Verification methods to use (default: { reasoning: 1.0 }) */
  methods?: MethodsConfig;
  /** Minimum confidence threshold for acceptance */
  minConfidence?: number;
  /** Whether to raise exception on rejection */
  raiseOnReject?: boolean;
  /** Optional callback for verification results */
  onVerification?: (content: string, result: VerificationResult) => void;
  /** Skip verification for empty responses */
  skipEmpty?: boolean;
  /** Polling interval in milliseconds */
  pollInterval?: number;
  /** Maximum time to wait in milliseconds */
  timeout?: number;
}

/**
 * LangChain callback handler that auto-verifies LLM outputs
 *
 * @example
 * ```typescript
 * import { ChatOpenAI } from "@langchain/openai";
 * import { VerifyAI } from "@verifyai/sdk";
 * import { VerifyAICallbackHandler } from "@verifyai/langchain";
 *
 * const client = new VerifyAI({ apiKey: "vfy_..." });
 * const handler = new VerifyAICallbackHandler(client, {
 *   methods: { reasoning: 1.0, tool: 0.5 },
 *   raiseOnReject: true,
 * });
 *
 * const llm = new ChatOpenAI({ callbacks: [handler] });
 * const response = await llm.invoke("What is the capital of France?");
 * ```
 */
export class VerifyAICallbackHandler extends BaseCallbackHandler {
  name = 'VerifyAICallbackHandler';

  private client: VerifyAI;
  private methods: MethodsConfig;
  private minConfidence: number;
  private raiseOnReject: boolean;
  private onVerification?: (content: string, result: VerificationResult) => void;
  private skipEmpty: boolean;
  private pollInterval: number;
  private timeout: number;

  constructor(client: VerifyAI, options?: VerifyAICallbackHandlerOptions) {
    super();
    this.client = client;
    this.methods = options?.methods ?? { reasoning: 1.0 };
    this.minConfidence = options?.minConfidence ?? 0.7;
    this.raiseOnReject = options?.raiseOnReject ?? false;
    this.onVerification = options?.onVerification;
    this.skipEmpty = options?.skipEmpty ?? true;
    this.pollInterval = options?.pollInterval ?? 1000;
    this.timeout = options?.timeout ?? 60000;
  }

  /**
   * Handle LLM completion - verify the output
   */
  async handleLLMEnd(
    output: LLMResult,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    extraParams?: Record<string, unknown>
  ): Promise<void> {
    for (const generations of output.generations) {
      for (const generation of generations) {
        // Get the generated text
        const text = generation.text;
        if (!text || (this.skipEmpty && !text.trim())) {
          continue;
        }

        try {
          // Verify the content
          const verifyResponse = await this.client.verifyAndWait(
            {
              content: text,
              methods: this.methods,
            },
            {
              pollInterval: this.pollInterval,
              timeout: this.timeout,
            }
          );

          // Create result
          const result = this.createResult(verifyResponse);

          // Attach to generation info
          if (!generation.generationInfo) {
            generation.generationInfo = {};
          }
          generation.generationInfo['verification'] = {
            id: result.verificationId,
            verdict: result.verdict,
            confidence: result.confidence,
            decision: result.decision,
            reasoning: result.reasoning,
            cached: result.cached,
          };

          // Call callback if provided
          if (this.onVerification) {
            this.onVerification(text, result);
          }

          // Raise if rejected and configured to do so
          if (this.raiseOnReject && result.decision === 'reject') {
            throw new VerificationRejectedError(
              `LLM output failed verification: ${result.reasoning}`,
              {
                verificationId: result.verificationId,
                verdict: result.verdict,
                confidence: result.confidence,
                content: text,
                reasoning: result.reasoning,
              }
            );
          }
        } catch (error) {
          // Re-throw rejection errors
          if (error instanceof VerificationRejectedError) {
            throw error;
          }

          // Log verification errors but don't block the response
          if (!generation.generationInfo) {
            generation.generationInfo = {};
          }
          generation.generationInfo['verification'] = {
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    }
  }

  /**
   * Create VerificationResult from API response
   */
  private createResult(response: VerifyResponse): VerificationResult {
    return {
      verificationId: response.id,
      verdict: response.verdict,
      confidence: response.confidence,
      decision: response.decision,
      reasoning: response.reasoning,
      cached: response.cached ?? false,
    };
  }
}

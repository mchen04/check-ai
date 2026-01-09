import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { LLMResult } from '@langchain/core/outputs';
import { Shove, MethodsConfig } from '@shove/sdk';

/**
 * Shove LangChain Callback Handler
 * Auto-verify LLM outputs via LangChain callbacks
 */

/**
 * Result of a verification check attached to LLM output
 */
interface VerificationResult {
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
 * Options for ShoveCallbackHandler
 */
interface ShoveCallbackHandlerOptions {
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
 * import { Shove } from "@shove/sdk";
 * import { ShoveCallbackHandler } from "@shove/langchain";
 *
 * const client = new Shove({ apiKey: "vfy_..." });
 * const handler = new ShoveCallbackHandler(client, {
 *   methods: { reasoning: 1.0, tool: 0.5 },
 *   raiseOnReject: true,
 * });
 *
 * const llm = new ChatOpenAI({ callbacks: [handler] });
 * const response = await llm.invoke("What is the capital of France?");
 * ```
 */
declare class ShoveCallbackHandler extends BaseCallbackHandler {
    name: string;
    private client;
    private methods;
    private minConfidence;
    private raiseOnReject;
    private onVerification?;
    private skipEmpty;
    private pollInterval;
    private timeout;
    constructor(client: Shove, options?: ShoveCallbackHandlerOptions);
    /**
     * Handle LLM completion - verify the output
     */
    handleLLMEnd(output: LLMResult, runId: string, parentRunId?: string, tags?: string[], extraParams?: Record<string, unknown>): Promise<void>;
    /**
     * Create VerificationResult from API response
     */
    private createResult;
}

/**
 * Shove LangChain Errors
 * Custom error classes for verification failures
 */
/**
 * Base error for verification failures
 */
declare class VerificationError extends Error {
    readonly verificationId?: string;
    readonly verdict?: string;
    readonly confidence?: number;
    readonly decision?: string;
    constructor(message: string, options?: {
        verificationId?: string;
        verdict?: string;
        confidence?: number;
        decision?: string;
    });
}
/**
 * Raised when LLM output fails verification with 'reject' decision
 */
declare class VerificationRejectedError extends VerificationError {
    readonly content?: string;
    readonly reasoning?: string;
    constructor(message: string, options?: {
        verificationId?: string;
        verdict?: string;
        confidence?: number;
        content?: string;
        reasoning?: string;
    });
}

export { ShoveCallbackHandler, type ShoveCallbackHandlerOptions, VerificationError, VerificationRejectedError, type VerificationResult };

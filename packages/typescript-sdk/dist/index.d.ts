/**
 * VerifyAI SDK Types
 * TypeScript types for the VerifyAI API
 */
/**
 * Available verification paradigms/methods
 */
type ParadigmType = 'semantic' | 'reasoning' | 'tool' | 'biprm' | 'ensemble' | 'entropy' | 'formal';
/**
 * Verification verdict
 */
type Verdict = 'true' | 'false' | 'uncertain';
/**
 * Decision based on verification results
 */
type Decision = 'accept' | 'refine' | 'escalate' | 'reject';
/**
 * Verification status
 */
type VerificationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'escalated';
/**
 * Configuration for which verification methods to use and their weights
 * At least one method must be specified with a weight between 0 and 1
 */
interface MethodsConfig {
    /** Embedding similarity (50-100% FPR) */
    semantic?: number;
    /** LLM judge (~7% FPR) */
    reasoning?: number;
    /** Fact-grounded with web search (~2% FPR) */
    tool?: number;
    /** Bidirectional reasoning (~10% FPR) */
    biprm?: number;
    /** Multi-model voting (~30% FPR) */
    ensemble?: number;
    /** Consistency checking (~15% FPR) */
    entropy?: number;
    /** Mathematical certainty (0% FPR for formalizable claims) */
    formal?: number;
}
/**
 * Options for verification request
 */
interface VerifyOptions {
    /** Timeout in milliseconds (1000-300000) */
    timeout?: number;
    /** Minimum confidence threshold (0-1) */
    minConfidence?: number;
}
/**
 * Verification request payload
 */
interface VerifyRequest {
    /** Content to verify (1-50000 characters) */
    content: string;
    /** Optional context for verification */
    context?: Record<string, unknown>;
    /** Verification methods to use */
    methods: MethodsConfig;
    /** Optional request options */
    options?: VerifyOptions;
    /** Idempotency key for deduplication (max 255 chars) */
    idempotencyKey?: string;
}
/**
 * Result from a single verification paradigm
 */
interface ParadigmResult {
    /** Which paradigm was used */
    paradigm: ParadigmType;
    /** Weight assigned to this paradigm */
    weight: number;
    /** LLM provider used */
    provider: string;
    /** Model used */
    model: string;
    /** Verdict from this paradigm */
    verdict: Verdict | null;
    /** Confidence score (0-1) */
    confidence: number;
    /** Reasoning explanation */
    reasoning: string | null;
    /** Time taken in milliseconds */
    processingTimeMs: number;
    /** Cost in cents */
    costCents: number;
    /** Token usage */
    tokenUsage?: {
        inputTokens: number;
        outputTokens: number;
    };
    /** Error if paradigm failed */
    error?: string;
}
/**
 * Verification response
 */
interface VerifyResponse {
    /** Unique verification ID */
    id: string;
    /** Current status */
    status: VerificationStatus;
    /** Original content that was verified (only in GET response) */
    content?: string;
    /** Overall verdict */
    verdict?: Verdict;
    /** Overall confidence score (0-1) */
    confidence?: number;
    /** Decision recommendation */
    decision?: Decision;
    /** Summary reasoning */
    reasoning?: string;
    /** Results from each paradigm */
    paradigmResults?: ParadigmResult[];
    /** Total processing time in milliseconds */
    processingTimeMs?: number;
    /** Total cost in cents */
    costCents?: number;
    /** Whether result was from cache */
    cached?: boolean;
    /** Whether verification was escalated for human review */
    escalated?: boolean;
    /** ISO 8601 timestamp when created (only in GET response) */
    createdAt?: string;
    /** ISO 8601 timestamp when completed */
    completedAt?: string;
}
/**
 * Options for initializing the VerifyAI client
 */
interface VerifyAIOptions {
    /** Your VerifyAI API key (starts with vfy_) */
    apiKey: string;
    /** Base URL for the API (defaults to https://api.verifyai.dev) */
    baseUrl?: string;
    /** Default timeout in milliseconds */
    timeout?: number;
    /** Custom fetch implementation */
    fetch?: typeof fetch;
}
/**
 * Options for verifyAndWait method
 */
interface WaitOptions {
    /** Polling interval in milliseconds (default: 1000) */
    pollInterval?: number;
    /** Maximum time to wait in milliseconds (default: 60000) */
    timeout?: number;
}
/**
 * API error response format
 */
interface ApiErrorResponse {
    /** Error message */
    error: string;
    /** Error code */
    code?: string;
    /** Additional error details */
    details?: Record<string, unknown>;
    /** Request ID for debugging */
    requestId?: string;
}

/**
 * VerifyAI Client
 * Main client class for interacting with the VerifyAI API
 */

/** SDK Version - keep in sync with package.json */
declare const VERSION = "0.1.0";
/**
 * VerifyAI Client
 *
 * @example
 * ```typescript
 * import { VerifyAI } from '@verifyai/sdk';
 *
 * const client = new VerifyAI({ apiKey: 'vfy_...' });
 *
 * // Simple verification
 * const result = await client.verifyAndWait({
 *   content: 'The Earth orbits the Sun.',
 *   methods: { reasoning: 1.0 }
 * });
 *
 * console.log(result.verdict); // 'true'
 * console.log(result.confidence); // 0.95
 * ```
 */
declare class VerifyAI {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    private readonly fetchFn;
    constructor(options: VerifyAIOptions);
    /**
     * Start a verification request
     *
     * This initiates a verification and returns immediately. Use `getVerification`
     * to poll for results, or use `verifyAndWait` for automatic polling.
     *
     * @param request - Verification request parameters
     * @returns Verification response with status 'pending' or 'processing'
     *
     * @example
     * ```typescript
     * const response = await client.verify({
     *   content: 'Paris is the capital of France.',
     *   methods: { reasoning: 1.0, tool: 0.5 }
     * });
     * console.log(response.id); // Use this to poll for results
     * ```
     */
    verify(request: VerifyRequest): Promise<VerifyResponse>;
    /**
     * Get verification status and results
     *
     * @param id - Verification ID
     * @returns Current verification status and results
     *
     * @example
     * ```typescript
     * const result = await client.getVerification('ver_abc123');
     * if (result.status === 'completed') {
     *   console.log(result.verdict);
     * }
     * ```
     */
    getVerification(id: string): Promise<VerifyResponse>;
    /**
     * Start verification and wait for completion
     *
     * This is the recommended method for most use cases. It starts a verification
     * and automatically polls until completion or timeout.
     *
     * @param request - Verification request parameters
     * @param options - Polling options
     * @returns Completed verification result
     *
     * @example
     * ```typescript
     * const result = await client.verifyAndWait({
     *   content: 'Water boils at 100°C at sea level.',
     *   methods: { reasoning: 1.0, tool: 1.0 }
     * });
     *
     * console.log(result.verdict); // 'true'
     * console.log(result.decision); // 'accept'
     * console.log(result.paradigmResults); // Detailed results per method
     * ```
     */
    verifyAndWait(request: VerifyRequest, options?: WaitOptions): Promise<VerifyResponse>;
    /**
     * Make an authenticated request to the API
     */
    private request;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
}

/**
 * VerifyAI SDK Errors
 * Custom error classes for the VerifyAI API
 */

/**
 * Base error class for all VerifyAI errors
 */
declare class VerifyAIError extends Error {
    /** Error code for programmatic handling */
    readonly code: string;
    /** HTTP status code if applicable */
    readonly status?: number;
    /** Request ID for debugging */
    readonly requestId?: string;
    /** Additional error details */
    readonly details?: Record<string, unknown>;
    constructor(message: string, options?: {
        code?: string;
        status?: number;
        requestId?: string;
        details?: Record<string, unknown>;
    });
    /**
     * Create error from API response
     */
    static fromResponse(response: ApiErrorResponse, status: number): VerifyAIError;
}
/**
 * Authentication error (401)
 * Thrown when API key is missing, invalid, or expired
 */
declare class AuthenticationError extends VerifyAIError {
    constructor(message: string, options?: {
        code?: string;
        status?: number;
        requestId?: string;
        details?: Record<string, unknown>;
    });
}
/**
 * Authorization error (403)
 * Thrown when API key lacks permission for the requested operation
 */
declare class AuthorizationError extends VerifyAIError {
    constructor(message: string, options?: {
        code?: string;
        status?: number;
        requestId?: string;
        details?: Record<string, unknown>;
    });
}
/**
 * Validation error (400)
 * Thrown when request parameters are invalid
 */
declare class ValidationError extends VerifyAIError {
    constructor(message: string, options?: {
        code?: string;
        status?: number;
        requestId?: string;
        details?: Record<string, unknown>;
    });
}
/**
 * Not found error (404)
 * Thrown when requested resource doesn't exist
 */
declare class NotFoundError extends VerifyAIError {
    constructor(message: string, options?: {
        code?: string;
        status?: number;
        requestId?: string;
        details?: Record<string, unknown>;
    });
}
/**
 * Rate limit error (429)
 * Thrown when rate limit is exceeded
 */
declare class RateLimitError extends VerifyAIError {
    /** Seconds until rate limit resets */
    readonly retryAfter?: number;
    constructor(message: string, options?: {
        code?: string;
        status?: number;
        requestId?: string;
        details?: Record<string, unknown>;
        retryAfter?: number;
    });
}
/**
 * Quota exceeded error (402)
 * Thrown when monthly verification quota is exceeded
 */
declare class QuotaExceededError extends VerifyAIError {
    constructor(message: string, options?: {
        code?: string;
        status?: number;
        requestId?: string;
        details?: Record<string, unknown>;
    });
}
/**
 * Timeout error
 * Thrown when request or polling times out
 */
declare class TimeoutError extends VerifyAIError {
    constructor(message: string, options?: {
        code?: string;
        status?: number;
        requestId?: string;
        details?: Record<string, unknown>;
    });
}
/**
 * Server error (5xx)
 * Thrown when the API experiences an internal error
 */
declare class ServerError extends VerifyAIError {
    constructor(message: string, options?: {
        code?: string;
        status?: number;
        requestId?: string;
        details?: Record<string, unknown>;
    });
}

export { type ApiErrorResponse, AuthenticationError, AuthorizationError, type Decision, type MethodsConfig, NotFoundError, type ParadigmResult, type ParadigmType, QuotaExceededError, RateLimitError, ServerError, TimeoutError, VERSION, ValidationError, type Verdict, type VerificationStatus, VerifyAI, VerifyAIError, type VerifyAIOptions, type VerifyOptions, type VerifyRequest, type VerifyResponse, type WaitOptions };

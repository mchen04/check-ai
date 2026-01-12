/**
 * Check SDK Types
 * TypeScript types for the Check API
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
 * Retry configuration for automatic retries with exponential backoff
 */
interface RetryConfig {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Initial delay between retries in milliseconds (default: 1000) */
    initialDelay?: number;
    /** Maximum delay between retries in milliseconds (default: 30000) */
    maxDelay?: number;
    /** Multiplier for exponential backoff (default: 2) */
    multiplier?: number;
    /** Add randomization to delay to avoid thundering herd (default: true) */
    jitter?: boolean;
    /** HTTP status codes that should trigger a retry (default: [429, 500, 502, 503, 504]) */
    retryableStatuses?: number[];
}
/**
 * Options for initializing the Check client
 */
interface CheckOptions {
    /** Your Check API key (starts with vfy_) */
    apiKey: string;
    /** Base URL for the API (defaults to https://api.check.ai) */
    baseUrl?: string;
    /** Default timeout in milliseconds */
    timeout?: number;
    /** Custom fetch implementation */
    fetch?: typeof fetch;
    /** Retry configuration for failed requests */
    retry?: RetryConfig | false;
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
 * Batch job status
 */
type BatchStatus = 'pending' | 'validating' | 'processing' | 'completed' | 'failed' | 'cancelled';
/**
 * Individual item in a batch request
 */
interface BatchItem {
    /** Content to verify */
    content: string;
    /** Optional context for verification */
    context?: Record<string, unknown>;
    /** Optional idempotency key */
    idempotencyKey?: string;
}
/**
 * Request to create a batch job
 */
interface CreateBatchRequest {
    /** Items to verify (mutually exclusive with fileId) */
    items?: BatchItem[];
    /** File ID from upload (mutually exclusive with items) */
    fileId?: string;
    /** Verification methods to use */
    methods: MethodsConfig;
    /** Optional webhook URL for completion notification */
    webhookUrl?: string;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Response from creating a batch job
 */
interface CreateBatchResponse {
    /** Unique batch ID */
    id: string;
    /** Current status */
    status: BatchStatus;
    /** Total number of items */
    totalItems: number;
    /** Validation errors (if any) */
    validationErrors?: Array<{
        index: number;
        message: string;
    }>;
    /** Status message */
    message: string;
}
/**
 * Batch job details
 */
interface BatchJob {
    /** Unique batch ID */
    id: string;
    /** Current status */
    status: BatchStatus;
    /** Total number of items */
    totalItems: number;
    /** Number of completed items */
    completedItems: number;
    /** Number of failed items */
    failedItems: number;
    /** Progress percentage (0-100) */
    progress: number;
    /** Verification methods configuration */
    methods: MethodsConfig;
    /** ISO 8601 timestamp when created */
    createdAt: string;
    /** ISO 8601 timestamp when started processing */
    startedAt?: string;
    /** ISO 8601 timestamp when completed */
    completedAt?: string;
    /** Error message if failed */
    error?: string;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Individual batch item result
 */
interface BatchItemResult {
    /** Item index in batch */
    index: number;
    /** Verification ID */
    verificationId?: string;
    /** Current status */
    status: VerificationStatus;
    /** Overall verdict */
    verdict?: Verdict;
    /** Overall confidence score (0-1) */
    confidence?: number;
    /** Decision recommendation */
    decision?: Decision;
    /** Summary reasoning */
    reasoning?: string;
    /** Error if failed */
    error?: string;
    /** Original content */
    content?: string;
}
/**
 * Batch results response
 */
interface BatchResultsResponse {
    /** Batch ID */
    batchId: string;
    /** Batch status */
    status: BatchStatus;
    /** Results for each item */
    results: BatchItemResult[];
    /** Pagination info */
    pagination?: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}
/**
 * Options for listing batches
 */
interface ListBatchesOptions {
    /** Maximum number of batches to return (default: 20, max: 100) */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
    /** Filter by status */
    status?: BatchStatus;
}
/**
 * Response from listing batches
 */
interface ListBatchesResponse {
    /** List of batch jobs */
    data: BatchJob[];
    /** Pagination info */
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}
/**
 * File upload response
 */
interface FileUploadResponse {
    /** File ID to use when creating batch */
    fileId: string;
    /** Original file name */
    originalFileName: string;
    /** Detected format */
    format: 'json' | 'csv';
    /** Number of items parsed */
    itemCount: number;
    /** Validation errors (items were skipped) */
    validationErrors?: Array<{
        line: number;
        message: string;
    }>;
    /** ISO 8601 timestamp when file expires */
    expiresAt: string;
    /** Status message */
    message: string;
}
/**
 * Options for waiting for batch completion
 */
interface BatchWaitOptions {
    /** Polling interval in milliseconds (default: 5000) */
    pollInterval?: number;
    /** Maximum time to wait in milliseconds (default: 3600000 = 1 hour) */
    timeout?: number;
    /** Callback for progress updates */
    onProgress?: (batch: BatchJob) => void;
}

/**
 * Check Client
 * Main client class for interacting with the Check API
 */

/** SDK Version - keep in sync with package.json */
declare const VERSION = "0.1.0";
/**
 * Check Client
 *
 * @example
 * ```typescript
 * import { Check } from '@check/sdk';
 *
 * const client = new Check({ apiKey: 'vfy_...' });
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
declare class Check {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    private readonly fetchFn;
    private readonly retryConfig;
    constructor(options: CheckOptions);
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
     * Make an authenticated request to the API with automatic retries
     */
    private request;
    /**
     * Execute a single request attempt
     */
    private executeRequest;
    /**
     * Determine if a request should be retried
     */
    private shouldRetry;
    /**
     * Calculate delay before next retry attempt using exponential backoff
     */
    private calculateRetryDelay;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
    /**
     * Create a batch verification job
     *
     * Batch processing allows you to verify multiple pieces of content in a single
     * request. Items are processed asynchronously and results can be retrieved later.
     *
     * @param request - Batch creation request with items or fileId
     * @returns Batch creation response with job ID
     *
     * @example
     * ```typescript
     * const batch = await client.createBatch({
     *   items: [
     *     { content: 'The Earth is round.' },
     *     { content: 'Water freezes at 0°C.' },
     *     { content: 'The sun is cold.' }
     *   ],
     *   methods: { reasoning: 1.0 }
     * });
     * console.log(batch.id); // Use to poll for results
     * ```
     */
    createBatch(request: CreateBatchRequest): Promise<CreateBatchResponse>;
    /**
     * Get batch job status and details
     *
     * @param id - Batch job ID
     * @returns Batch job details including progress
     *
     * @example
     * ```typescript
     * const batch = await client.getBatch('batch_abc123');
     * console.log(`Progress: ${batch.progress}%`);
     * console.log(`Status: ${batch.status}`);
     * ```
     */
    getBatch(id: string): Promise<BatchJob>;
    /**
     * List batch jobs
     *
     * @param options - Pagination and filter options
     * @returns Paginated list of batch jobs
     *
     * @example
     * ```typescript
     * const { data: batches, pagination } = await client.listBatches({
     *   limit: 10,
     *   status: 'completed'
     * });
     *
     * for (const batch of batches) {
     *   console.log(`${batch.id}: ${batch.status}`);
     * }
     * ```
     */
    listBatches(options?: ListBatchesOptions): Promise<ListBatchesResponse>;
    /**
     * Cancel a batch job
     *
     * Cancels a batch job that is pending or processing. Items that have already
     * been processed will retain their results.
     *
     * @param id - Batch job ID
     * @returns Updated batch job details
     *
     * @example
     * ```typescript
     * const batch = await client.cancelBatch('batch_abc123');
     * console.log(batch.status); // 'cancelled'
     * ```
     */
    cancelBatch(id: string): Promise<BatchJob>;
    /**
     * Get batch results
     *
     * Retrieves verification results for a batch job. For large batches,
     * results are paginated.
     *
     * @param id - Batch job ID
     * @param options - Pagination options
     * @returns Batch results with individual item verdicts
     *
     * @example
     * ```typescript
     * const results = await client.getBatchResults('batch_abc123');
     *
     * for (const result of results.results) {
     *   console.log(`Item ${result.index}: ${result.verdict} (${result.confidence})`);
     * }
     * ```
     */
    getBatchResults(id: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<BatchResultsResponse>;
    /**
     * Upload a file for batch processing
     *
     * Uploads a CSV or JSON file containing items to verify. The returned fileId
     * can be used when creating a batch job.
     *
     * @param file - File to upload (Blob, File, or Buffer)
     * @param filename - Filename with extension (.csv or .json)
     * @returns Upload response with fileId
     *
     * @example
     * ```typescript
     * // From a file input
     * const file = document.getElementById('file').files[0];
     * const upload = await client.uploadBatchFile(file, file.name);
     *
     * // Create batch using uploaded file
     * const batch = await client.createBatch({
     *   fileId: upload.fileId,
     *   methods: { reasoning: 1.0 }
     * });
     * ```
     */
    uploadBatchFile(file: Blob | Buffer | ArrayBuffer, filename: string): Promise<FileUploadResponse>;
    /**
     * Create a batch and wait for completion
     *
     * This is the recommended method for batch processing when you want to wait
     * for all results. It creates a batch and polls until completion.
     *
     * @param request - Batch creation request
     * @param options - Wait options including timeout and progress callback
     * @returns Completed batch job with all results
     *
     * @example
     * ```typescript
     * const batch = await client.createBatchAndWait(
     *   {
     *     items: items,
     *     methods: { reasoning: 1.0 }
     *   },
     *   {
     *     onProgress: (batch) => {
     *       console.log(`Progress: ${batch.progress}%`);
     *     }
     *   }
     * );
     *
     * const results = await client.getBatchResults(batch.id);
     * ```
     */
    createBatchAndWait(request: CreateBatchRequest, options?: BatchWaitOptions): Promise<BatchJob>;
}

/**
 * Check SDK Errors
 * Custom error classes for the Check API
 */

/**
 * Base error class for all Check errors
 */
declare class CheckError extends Error {
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
    static fromResponse(response: ApiErrorResponse, status: number): CheckError;
}
/**
 * Authentication error (401)
 * Thrown when API key is missing, invalid, or expired
 */
declare class AuthenticationError extends CheckError {
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
declare class AuthorizationError extends CheckError {
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
declare class ValidationError extends CheckError {
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
declare class NotFoundError extends CheckError {
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
declare class RateLimitError extends CheckError {
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
declare class QuotaExceededError extends CheckError {
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
declare class TimeoutError extends CheckError {
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
declare class ServerError extends CheckError {
    constructor(message: string, options?: {
        code?: string;
        status?: number;
        requestId?: string;
        details?: Record<string, unknown>;
    });
}

export { type ApiErrorResponse, AuthenticationError, AuthorizationError, type BatchItem, type BatchItemResult, type BatchJob, type BatchResultsResponse, type BatchStatus, type BatchWaitOptions, Check, CheckError, type CheckOptions, type CreateBatchRequest, type CreateBatchResponse, type Decision, type FileUploadResponse, type ListBatchesOptions, type ListBatchesResponse, type MethodsConfig, NotFoundError, type ParadigmResult, type ParadigmType, QuotaExceededError, RateLimitError, type RetryConfig, ServerError, TimeoutError, VERSION, ValidationError, type Verdict, type VerificationStatus, type VerifyOptions, type VerifyRequest, type VerifyResponse, type WaitOptions };

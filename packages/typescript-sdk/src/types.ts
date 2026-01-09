/**
 * Shove SDK Types
 * TypeScript types for the Shove API
 */

// =============================================================================
// VERIFICATION METHODS
// =============================================================================

/**
 * Available verification paradigms/methods
 */
export type ParadigmType =
  | 'semantic'
  | 'reasoning'
  | 'tool'
  | 'biprm'
  | 'ensemble'
  | 'entropy'
  | 'formal';

/**
 * Verification verdict
 */
export type Verdict = 'true' | 'false' | 'uncertain';

/**
 * Decision based on verification results
 */
export type Decision = 'accept' | 'refine' | 'escalate' | 'reject';

/**
 * Verification status
 */
export type VerificationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'escalated';

// =============================================================================
// REQUEST TYPES
// =============================================================================

/**
 * Configuration for which verification methods to use and their weights
 * At least one method must be specified with a weight between 0 and 1
 */
export interface MethodsConfig {
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
export interface VerifyOptions {
  /** Timeout in milliseconds (1000-300000) */
  timeout?: number;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
}

/**
 * Verification request payload
 */
export interface VerifyRequest {
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

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Result from a single verification paradigm
 */
export interface ParadigmResult {
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
export interface VerifyResponse {
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

// =============================================================================
// CLIENT OPTIONS
// =============================================================================

/**
 * Retry configuration for automatic retries with exponential backoff
 */
export interface RetryConfig {
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
 * Options for initializing the Shove client
 */
export interface ShoveOptions {
  /** Your Shove API key (starts with vfy_) */
  apiKey: string;
  /** Base URL for the API (defaults to https://api.shove.ai) */
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
export interface WaitOptions {
  /** Polling interval in milliseconds (default: 1000) */
  pollInterval?: number;
  /** Maximum time to wait in milliseconds (default: 60000) */
  timeout?: number;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * API error response format
 */
export interface ApiErrorResponse {
  /** Error message */
  error: string;
  /** Error code */
  code?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Request ID for debugging */
  requestId?: string;
}

// =============================================================================
// BATCH TYPES
// =============================================================================

/**
 * Batch job status
 */
export type BatchStatus =
  | 'pending'
  | 'validating'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Individual item in a batch request
 */
export interface BatchItem {
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
export interface CreateBatchRequest {
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
export interface CreateBatchResponse {
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
export interface BatchJob {
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
export interface BatchItemResult {
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
export interface BatchResultsResponse {
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
export interface ListBatchesOptions {
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
export interface ListBatchesResponse {
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
export interface FileUploadResponse {
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
export interface BatchWaitOptions {
  /** Polling interval in milliseconds (default: 5000) */
  pollInterval?: number;
  /** Maximum time to wait in milliseconds (default: 3600000 = 1 hour) */
  timeout?: number;
  /** Callback for progress updates */
  onProgress?: (batch: BatchJob) => void;
}

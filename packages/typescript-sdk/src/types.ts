/**
 * VerifyAI SDK Types
 * TypeScript types for the VerifyAI API
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
 * Options for initializing the VerifyAI client
 */
export interface VerifyAIOptions {
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

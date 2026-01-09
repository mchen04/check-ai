/**
 * Shove SDK
 * Official TypeScript SDK for Shove - The Stripe for LLM Verification
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { Shove } from '@shove/sdk';
 *
 * // Initialize client
 * const client = new Shove({ apiKey: 'vfy_...' });
 *
 * // Verify content (3-line integration!)
 * const result = await client.verifyAndWait({
 *   content: 'The speed of light is approximately 299,792 km/s.',
 *   methods: { reasoning: 1.0 }
 * });
 *
 * console.log(result.verdict);    // 'true'
 * console.log(result.confidence); // 0.95
 * console.log(result.decision);   // 'accept'
 * ```
 */

// Client
export { Shove, VERSION } from './client';

// Types
export type {
  // Core types
  ParadigmType,
  Verdict,
  Decision,
  VerificationStatus,
  // Request types
  MethodsConfig,
  VerifyOptions,
  VerifyRequest,
  // Response types
  ParadigmResult,
  VerifyResponse,
  // Client options
  ShoveOptions,
  WaitOptions,
  RetryConfig,
  // Error types
  ApiErrorResponse,
  // Batch types
  BatchStatus,
  BatchItem,
  CreateBatchRequest,
  CreateBatchResponse,
  BatchJob,
  BatchItemResult,
  BatchResultsResponse,
  ListBatchesOptions,
  ListBatchesResponse,
  FileUploadResponse,
  BatchWaitOptions,
} from './types';

// Errors
export {
  ShoveError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  QuotaExceededError,
  TimeoutError,
  ServerError,
} from './errors';

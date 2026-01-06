/**
 * VerifyAI SDK
 * Official TypeScript SDK for VerifyAI - The Stripe for LLM Verification
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { VerifyAI } from '@verifyai/sdk';
 *
 * // Initialize client
 * const client = new VerifyAI({ apiKey: 'vfy_...' });
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
export { VerifyAI, VERSION } from './client';

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
  VerifyAIOptions,
  WaitOptions,
  // Error types
  ApiErrorResponse,
} from './types';

// Errors
export {
  VerifyAIError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  QuotaExceededError,
  TimeoutError,
  ServerError,
} from './errors';

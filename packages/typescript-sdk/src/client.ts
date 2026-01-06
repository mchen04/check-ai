/**
 * VerifyAI Client
 * Main client class for interacting with the VerifyAI API
 */

import type {
  VerifyAIOptions,
  VerifyRequest,
  VerifyResponse,
  WaitOptions,
  ApiErrorResponse,
} from './types';
import {
  VerifyAIError,
  RateLimitError,
  TimeoutError,
} from './errors';

/** SDK Version - keep in sync with package.json */
export const VERSION = '0.1.0';

const DEFAULT_BASE_URL = 'https://api.verifyai.dev';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_POLL_INTERVAL = 1000;
const DEFAULT_WAIT_TIMEOUT = 60000;

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
export class VerifyAI {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: VerifyAIOptions) {
    if (!options.apiKey) {
      throw new VerifyAIError('API key is required', { code: 'MISSING_API_KEY' });
    }

    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.fetchFn = options.fetch ?? globalThis.fetch;

    if (!this.fetchFn) {
      throw new VerifyAIError(
        'fetch is not available. Please provide a fetch implementation or use Node.js 18+',
        { code: 'FETCH_NOT_AVAILABLE' }
      );
    }
  }

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
  async verify(request: VerifyRequest): Promise<VerifyResponse> {
    return this.request<VerifyResponse>('/v1/verify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

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
  async getVerification(id: string): Promise<VerifyResponse> {
    if (!id) {
      throw new VerifyAIError('Verification ID is required', {
        code: 'MISSING_ID',
      });
    }

    return this.request<VerifyResponse>(`/v1/verify/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  }

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
  async verifyAndWait(
    request: VerifyRequest,
    options?: WaitOptions
  ): Promise<VerifyResponse> {
    const pollInterval = options?.pollInterval ?? DEFAULT_POLL_INTERVAL;
    const timeout = options?.timeout ?? DEFAULT_WAIT_TIMEOUT;
    const startTime = Date.now();

    // Start the verification
    let response = await this.verify(request);

    // Poll until complete or timeout
    while (
      response.status === 'pending' ||
      response.status === 'processing'
    ) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new TimeoutError(
          `Verification timed out after ${timeout}ms. Last status: ${response.status}`,
          { details: { verificationId: response.id, lastStatus: response.status } }
        );
      }

      // Wait before polling
      await this.sleep(pollInterval);

      // Poll for status
      response = await this.getVerification(response.id);
    }

    return response;
  }

  /**
   * Make an authenticated request to the API
   */
  private async request<T>(
    path: string,
    options: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': `@verifyai/sdk/${VERSION}`,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const data = await response.json() as T | ApiErrorResponse;

      // Handle errors
      if (!response.ok) {
        const errorData = data as ApiErrorResponse;

        // Special handling for rate limit
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          throw new RateLimitError(errorData.error || 'Rate limit exceeded', {
            code: errorData.code,
            status: response.status,
            requestId: errorData.requestId,
            details: errorData.details,
            retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
          });
        }

        throw VerifyAIError.fromResponse(errorData, response.status);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Re-throw VerifyAI errors
      if (error instanceof VerifyAIError) {
        throw error;
      }

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new VerifyAIError(`Network error: ${error.message}`, {
          code: 'NETWORK_ERROR',
        });
      }

      // Unknown error
      throw new VerifyAIError(
        error instanceof Error ? error.message : 'Unknown error',
        { code: 'UNKNOWN_ERROR' }
      );
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

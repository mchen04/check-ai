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
  CreateBatchRequest,
  CreateBatchResponse,
  BatchJob,
  ListBatchesOptions,
  ListBatchesResponse,
  BatchResultsResponse,
  FileUploadResponse,
  BatchWaitOptions,
  RetryConfig,
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
const DEFAULT_BATCH_POLL_INTERVAL = 5000;
const DEFAULT_BATCH_WAIT_TIMEOUT = 3600000; // 1 hour

// Default retry configuration
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  jitter: true,
  retryableStatuses: [429, 500, 502, 503, 504],
};

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
  private readonly retryConfig: Required<RetryConfig> | null;

  constructor(options: VerifyAIOptions) {
    if (!options.apiKey) {
      throw new VerifyAIError('API key is required', { code: 'MISSING_API_KEY' });
    }

    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.fetchFn = options.fetch ?? globalThis.fetch;

    // Configure retry behavior
    if (options.retry === false) {
      this.retryConfig = null;
    } else {
      this.retryConfig = {
        ...DEFAULT_RETRY_CONFIG,
        ...options.retry,
      };
    }

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
   * Make an authenticated request to the API with automatic retries
   */
  private async request<T>(
    path: string,
    options: RequestInit
  ): Promise<T> {
    const maxAttempts = this.retryConfig ? this.retryConfig.maxRetries + 1 : 1;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.executeRequest<T>(path, options);
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }

        // Calculate delay for next retry
        const delay = this.calculateRetryDelay(attempt, error);
        await this.sleep(delay);
      }
    }

    // Should never reach here, but TypeScript needs this
    throw lastError ?? new VerifyAIError('Request failed', { code: 'UNKNOWN_ERROR' });
  }

  /**
   * Execute a single request attempt
   */
  private async executeRequest<T>(
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
   * Determine if a request should be retried
   */
  private shouldRetry(error: unknown, attempt: number): boolean {
    if (!this.retryConfig) {
      return false;
    }

    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    // Retry on rate limit errors
    if (error instanceof RateLimitError) {
      return true;
    }

    // Retry on specific status codes
    if (error instanceof VerifyAIError && error.status) {
      return this.retryConfig.retryableStatuses.includes(error.status);
    }

    // Retry on network errors
    if (error instanceof VerifyAIError && error.code === 'NETWORK_ERROR') {
      return true;
    }

    // Retry on timeout
    if (error instanceof TimeoutError) {
      return true;
    }

    return false;
  }

  /**
   * Calculate delay before next retry attempt using exponential backoff
   */
  private calculateRetryDelay(attempt: number, error: unknown): number {
    if (!this.retryConfig) {
      return 0;
    }

    // Use Retry-After header if available
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000;
    }

    // Calculate exponential backoff
    let delay = this.retryConfig.initialDelay * Math.pow(this.retryConfig.multiplier, attempt);

    // Cap at maximum delay
    delay = Math.min(delay, this.retryConfig.maxDelay);

    // Add jitter to avoid thundering herd
    if (this.retryConfig.jitter) {
      const jitterFactor = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
      delay = delay * jitterFactor;
    }

    return Math.round(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ===========================================================================
  // BATCH PROCESSING METHODS
  // ===========================================================================

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
  async createBatch(request: CreateBatchRequest): Promise<CreateBatchResponse> {
    return this.request<CreateBatchResponse>('/v1/batch', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

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
  async getBatch(id: string): Promise<BatchJob> {
    if (!id) {
      throw new VerifyAIError('Batch ID is required', { code: 'MISSING_ID' });
    }

    return this.request<BatchJob>(`/v1/batch/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  }

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
  async listBatches(options?: ListBatchesOptions): Promise<ListBatchesResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.status) params.set('status', options.status);

    const query = params.toString();
    const path = query ? `/v1/batch?${query}` : '/v1/batch';

    return this.request<ListBatchesResponse>(path, { method: 'GET' });
  }

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
  async cancelBatch(id: string): Promise<BatchJob> {
    if (!id) {
      throw new VerifyAIError('Batch ID is required', { code: 'MISSING_ID' });
    }

    return this.request<BatchJob>(`/v1/batch/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
  }

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
  async getBatchResults(
    id: string,
    options?: { limit?: number; offset?: number }
  ): Promise<BatchResultsResponse> {
    if (!id) {
      throw new VerifyAIError('Batch ID is required', { code: 'MISSING_ID' });
    }

    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const query = params.toString();
    const path = query
      ? `/v1/batch/${encodeURIComponent(id)}/results?${query}`
      : `/v1/batch/${encodeURIComponent(id)}/results`;

    return this.request<BatchResultsResponse>(path, { method: 'GET' });
  }

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
  async uploadBatchFile(
    file: Blob | Buffer | ArrayBuffer,
    filename: string
  ): Promise<FileUploadResponse> {
    const formData = new FormData();

    // Handle different input types
    if (file instanceof Blob) {
      formData.append('file', file, filename);
    } else {
      // Buffer or ArrayBuffer
      const blob = new Blob([file]);
      formData.append('file', blob, filename);
    }

    const url = `${this.baseUrl}/v1/batch/upload`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': `@verifyai/sdk/${VERSION}`,
          // Note: Don't set Content-Type for FormData - browser sets it with boundary
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json() as FileUploadResponse | ApiErrorResponse;

      if (!response.ok) {
        throw VerifyAIError.fromResponse(data as ApiErrorResponse, response.status);
      }

      return data as FileUploadResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof VerifyAIError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(`Upload timed out after ${this.timeout}ms`);
      }

      throw new VerifyAIError(
        error instanceof Error ? error.message : 'Upload failed',
        { code: 'UPLOAD_ERROR' }
      );
    }
  }

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
  async createBatchAndWait(
    request: CreateBatchRequest,
    options?: BatchWaitOptions
  ): Promise<BatchJob> {
    const pollInterval = options?.pollInterval ?? DEFAULT_BATCH_POLL_INTERVAL;
    const timeout = options?.timeout ?? DEFAULT_BATCH_WAIT_TIMEOUT;
    const startTime = Date.now();

    // Create the batch
    const createResponse = await this.createBatch(request);

    // If there were validation errors, the batch failed immediately
    if (createResponse.status === 'failed') {
      return this.getBatch(createResponse.id);
    }

    // Poll until complete or timeout
    let batch = await this.getBatch(createResponse.id);

    while (
      batch.status === 'pending' ||
      batch.status === 'validating' ||
      batch.status === 'processing'
    ) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new TimeoutError(
          `Batch timed out after ${timeout}ms. Status: ${batch.status}, Progress: ${batch.progress}%`,
          { details: { batchId: batch.id, progress: batch.progress } }
        );
      }

      // Call progress callback if provided
      if (options?.onProgress) {
        options.onProgress(batch);
      }

      // Wait before polling
      await this.sleep(pollInterval);

      // Poll for status
      batch = await this.getBatch(batch.id);
    }

    // Final progress callback
    if (options?.onProgress) {
      options.onProgress(batch);
    }

    return batch;
  }
}

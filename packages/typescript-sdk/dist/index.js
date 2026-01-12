'use strict';

// src/errors.ts
var CheckError = class _CheckError extends Error {
  /** Error code for programmatic handling */
  code;
  /** HTTP status code if applicable */
  status;
  /** Request ID for debugging */
  requestId;
  /** Additional error details */
  details;
  constructor(message, options) {
    super(message);
    this.name = "CheckError";
    this.code = options?.code ?? "UNKNOWN_ERROR";
    this.status = options?.status;
    this.requestId = options?.requestId;
    this.details = options?.details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _CheckError);
    }
  }
  /**
   * Create error from API response
   */
  static fromResponse(response, status) {
    const ErrorClass = getErrorClass(response.code, status);
    return new ErrorClass(response.error, {
      code: response.code,
      status,
      requestId: response.requestId,
      details: response.details
    });
  }
};
var AuthenticationError = class extends CheckError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "AUTHENTICATION_ERROR" });
    this.name = "AuthenticationError";
  }
};
var AuthorizationError = class extends CheckError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "AUTHORIZATION_ERROR" });
    this.name = "AuthorizationError";
  }
};
var ValidationError = class extends CheckError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "VALIDATION_ERROR" });
    this.name = "ValidationError";
  }
};
var NotFoundError = class extends CheckError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "NOT_FOUND" });
    this.name = "NotFoundError";
  }
};
var RateLimitError = class extends CheckError {
  /** Seconds until rate limit resets */
  retryAfter;
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "RATE_LIMIT" });
    this.name = "RateLimitError";
    this.retryAfter = options?.retryAfter;
  }
};
var QuotaExceededError = class extends CheckError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "QUOTA_EXCEEDED" });
    this.name = "QuotaExceededError";
  }
};
var TimeoutError = class extends CheckError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "TIMEOUT" });
    this.name = "TimeoutError";
  }
};
var ServerError = class extends CheckError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "SERVER_ERROR" });
    this.name = "ServerError";
  }
};
function getErrorClass(code, status) {
  switch (code) {
    case "AUTHENTICATION_ERROR":
      return AuthenticationError;
    case "AUTHORIZATION_ERROR":
      return AuthorizationError;
    case "VALIDATION_ERROR":
      return ValidationError;
    case "NOT_FOUND":
      return NotFoundError;
    case "RATE_LIMIT":
      return RateLimitError;
    case "QUOTA_EXCEEDED":
      return QuotaExceededError;
    case "TIMEOUT":
      return TimeoutError;
  }
  switch (status) {
    case 400:
      return ValidationError;
    case 401:
      return AuthenticationError;
    case 402:
      return QuotaExceededError;
    case 403:
      return AuthorizationError;
    case 404:
      return NotFoundError;
    case 429:
      return RateLimitError;
    case 500:
    case 502:
    case 503:
    case 504:
      return ServerError;
    default:
      return CheckError;
  }
}

// src/client.ts
var VERSION = "0.1.0";
var DEFAULT_BASE_URL = "https://api.check.ai";
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_POLL_INTERVAL = 1e3;
var DEFAULT_WAIT_TIMEOUT = 6e4;
var DEFAULT_BATCH_POLL_INTERVAL = 5e3;
var DEFAULT_BATCH_WAIT_TIMEOUT = 36e5;
var DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1e3,
  maxDelay: 3e4,
  multiplier: 2,
  jitter: true,
  retryableStatuses: [429, 500, 502, 503, 504]
};
var Check = class {
  apiKey;
  baseUrl;
  timeout;
  fetchFn;
  retryConfig;
  constructor(options) {
    if (!options.apiKey) {
      throw new CheckError("API key is required", { code: "MISSING_API_KEY" });
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.fetchFn = options.fetch ?? globalThis.fetch;
    if (options.retry === false) {
      this.retryConfig = null;
    } else {
      this.retryConfig = {
        ...DEFAULT_RETRY_CONFIG,
        ...options.retry
      };
    }
    if (!this.fetchFn) {
      throw new CheckError(
        "fetch is not available. Please provide a fetch implementation or use Node.js 18+",
        { code: "FETCH_NOT_AVAILABLE" }
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
  async verify(request) {
    return this.request("/v1/verify", {
      method: "POST",
      body: JSON.stringify(request)
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
  async getVerification(id) {
    if (!id) {
      throw new CheckError("Verification ID is required", {
        code: "MISSING_ID"
      });
    }
    return this.request(`/v1/verify/${encodeURIComponent(id)}`, {
      method: "GET"
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
  async verifyAndWait(request, options) {
    const pollInterval = options?.pollInterval ?? DEFAULT_POLL_INTERVAL;
    const timeout = options?.timeout ?? DEFAULT_WAIT_TIMEOUT;
    const startTime = Date.now();
    let response = await this.verify(request);
    while (response.status === "pending" || response.status === "processing") {
      if (Date.now() - startTime > timeout) {
        throw new TimeoutError(
          `Verification timed out after ${timeout}ms. Last status: ${response.status}`,
          { details: { verificationId: response.id, lastStatus: response.status } }
        );
      }
      await this.sleep(pollInterval);
      response = await this.getVerification(response.id);
    }
    return response;
  }
  /**
   * Make an authenticated request to the API with automatic retries
   */
  async request(path, options) {
    const maxAttempts = this.retryConfig ? this.retryConfig.maxRetries + 1 : 1;
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.executeRequest(path, options);
      } catch (error) {
        lastError = error;
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }
        const delay = this.calculateRetryDelay(attempt, error);
        await this.sleep(delay);
      }
    }
    throw lastError ?? new CheckError("Request failed", { code: "UNKNOWN_ERROR" });
  }
  /**
   * Execute a single request attempt
   */
  async executeRequest(path, options) {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await this.fetchFn(url, {
        ...options,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": `@check/sdk/${VERSION}`,
          ...options.headers
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        const errorData = data;
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          throw new RateLimitError(errorData.error || "Rate limit exceeded", {
            code: errorData.code,
            status: response.status,
            requestId: errorData.requestId,
            details: errorData.details,
            retryAfter: retryAfter ? parseInt(retryAfter, 10) : void 0
          });
        }
        throw CheckError.fromResponse(errorData, response.status);
      }
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof CheckError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
      }
      if (error instanceof TypeError) {
        throw new CheckError(`Network error: ${error.message}`, {
          code: "NETWORK_ERROR"
        });
      }
      throw new CheckError(
        error instanceof Error ? error.message : "Unknown error",
        { code: "UNKNOWN_ERROR" }
      );
    }
  }
  /**
   * Determine if a request should be retried
   */
  shouldRetry(error, attempt) {
    if (!this.retryConfig) {
      return false;
    }
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }
    if (error instanceof RateLimitError) {
      return true;
    }
    if (error instanceof CheckError && error.status) {
      return this.retryConfig.retryableStatuses.includes(error.status);
    }
    if (error instanceof CheckError && error.code === "NETWORK_ERROR") {
      return true;
    }
    if (error instanceof TimeoutError) {
      return true;
    }
    return false;
  }
  /**
   * Calculate delay before next retry attempt using exponential backoff
   */
  calculateRetryDelay(attempt, error) {
    if (!this.retryConfig) {
      return 0;
    }
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1e3;
    }
    let delay = this.retryConfig.initialDelay * Math.pow(this.retryConfig.multiplier, attempt);
    delay = Math.min(delay, this.retryConfig.maxDelay);
    if (this.retryConfig.jitter) {
      const jitterFactor = 0.5 + Math.random() * 0.5;
      delay = delay * jitterFactor;
    }
    return Math.round(delay);
  }
  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
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
  async createBatch(request) {
    return this.request("/v1/batch", {
      method: "POST",
      body: JSON.stringify(request)
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
  async getBatch(id) {
    if (!id) {
      throw new CheckError("Batch ID is required", { code: "MISSING_ID" });
    }
    return this.request(`/v1/batch/${encodeURIComponent(id)}`, {
      method: "GET"
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
  async listBatches(options) {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.status) params.set("status", options.status);
    const query = params.toString();
    const path = query ? `/v1/batch?${query}` : "/v1/batch";
    return this.request(path, { method: "GET" });
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
  async cancelBatch(id) {
    if (!id) {
      throw new CheckError("Batch ID is required", { code: "MISSING_ID" });
    }
    return this.request(`/v1/batch/${encodeURIComponent(id)}/cancel`, {
      method: "POST"
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
  async getBatchResults(id, options) {
    if (!id) {
      throw new CheckError("Batch ID is required", { code: "MISSING_ID" });
    }
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    const query = params.toString();
    const path = query ? `/v1/batch/${encodeURIComponent(id)}/results?${query}` : `/v1/batch/${encodeURIComponent(id)}/results`;
    return this.request(path, { method: "GET" });
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
  async uploadBatchFile(file, filename) {
    const formData = new FormData();
    if (file instanceof Blob) {
      formData.append("file", file, filename);
    } else if (file instanceof ArrayBuffer) {
      const blob = new Blob([file]);
      formData.append("file", blob, filename);
    } else {
      const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
      const blob = new Blob([arrayBuffer]);
      formData.append("file", blob, filename);
    }
    const url = `${this.baseUrl}/v1/batch/upload`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await this.fetchFn(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "User-Agent": `@check/sdk/${VERSION}`
          // Note: Don't set Content-Type for FormData - browser sets it with boundary
        },
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        throw CheckError.fromResponse(data, response.status);
      }
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof CheckError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new TimeoutError(`Upload timed out after ${this.timeout}ms`);
      }
      throw new CheckError(
        error instanceof Error ? error.message : "Upload failed",
        { code: "UPLOAD_ERROR" }
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
  async createBatchAndWait(request, options) {
    const pollInterval = options?.pollInterval ?? DEFAULT_BATCH_POLL_INTERVAL;
    const timeout = options?.timeout ?? DEFAULT_BATCH_WAIT_TIMEOUT;
    const startTime = Date.now();
    const createResponse = await this.createBatch(request);
    if (createResponse.status === "failed") {
      return this.getBatch(createResponse.id);
    }
    let batch = await this.getBatch(createResponse.id);
    while (batch.status === "pending" || batch.status === "validating" || batch.status === "processing") {
      if (Date.now() - startTime > timeout) {
        throw new TimeoutError(
          `Batch timed out after ${timeout}ms. Status: ${batch.status}, Progress: ${batch.progress}%`,
          { details: { batchId: batch.id, progress: batch.progress } }
        );
      }
      if (options?.onProgress) {
        options.onProgress(batch);
      }
      await this.sleep(pollInterval);
      batch = await this.getBatch(batch.id);
    }
    if (options?.onProgress) {
      options.onProgress(batch);
    }
    return batch;
  }
};

exports.AuthenticationError = AuthenticationError;
exports.AuthorizationError = AuthorizationError;
exports.Check = Check;
exports.CheckError = CheckError;
exports.NotFoundError = NotFoundError;
exports.QuotaExceededError = QuotaExceededError;
exports.RateLimitError = RateLimitError;
exports.ServerError = ServerError;
exports.TimeoutError = TimeoutError;
exports.VERSION = VERSION;
exports.ValidationError = ValidationError;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
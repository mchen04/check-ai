'use strict';

// src/errors.ts
var VerifyAIError = class _VerifyAIError extends Error {
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
    this.name = "VerifyAIError";
    this.code = options?.code ?? "UNKNOWN_ERROR";
    this.status = options?.status;
    this.requestId = options?.requestId;
    this.details = options?.details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _VerifyAIError);
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
var AuthenticationError = class extends VerifyAIError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "AUTHENTICATION_ERROR" });
    this.name = "AuthenticationError";
  }
};
var AuthorizationError = class extends VerifyAIError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "AUTHORIZATION_ERROR" });
    this.name = "AuthorizationError";
  }
};
var ValidationError = class extends VerifyAIError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "VALIDATION_ERROR" });
    this.name = "ValidationError";
  }
};
var NotFoundError = class extends VerifyAIError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "NOT_FOUND" });
    this.name = "NotFoundError";
  }
};
var RateLimitError = class extends VerifyAIError {
  /** Seconds until rate limit resets */
  retryAfter;
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "RATE_LIMIT" });
    this.name = "RateLimitError";
    this.retryAfter = options?.retryAfter;
  }
};
var QuotaExceededError = class extends VerifyAIError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "QUOTA_EXCEEDED" });
    this.name = "QuotaExceededError";
  }
};
var TimeoutError = class extends VerifyAIError {
  constructor(message, options) {
    super(message, { ...options, code: options?.code ?? "TIMEOUT" });
    this.name = "TimeoutError";
  }
};
var ServerError = class extends VerifyAIError {
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
      return VerifyAIError;
  }
}

// src/client.ts
var VERSION = "0.1.0";
var DEFAULT_BASE_URL = "https://api.verifyai.dev";
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_POLL_INTERVAL = 1e3;
var DEFAULT_WAIT_TIMEOUT = 6e4;
var VerifyAI = class {
  apiKey;
  baseUrl;
  timeout;
  fetchFn;
  constructor(options) {
    if (!options.apiKey) {
      throw new VerifyAIError("API key is required", { code: "MISSING_API_KEY" });
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.fetchFn = options.fetch ?? globalThis.fetch;
    if (!this.fetchFn) {
      throw new VerifyAIError(
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
      throw new VerifyAIError("Verification ID is required", {
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
   * Make an authenticated request to the API
   */
  async request(path, options) {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await this.fetchFn(url, {
        ...options,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": `@verifyai/sdk/${VERSION}`,
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
        throw VerifyAIError.fromResponse(errorData, response.status);
      }
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof VerifyAIError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
      }
      if (error instanceof TypeError) {
        throw new VerifyAIError(`Network error: ${error.message}`, {
          code: "NETWORK_ERROR"
        });
      }
      throw new VerifyAIError(
        error instanceof Error ? error.message : "Unknown error",
        { code: "UNKNOWN_ERROR" }
      );
    }
  }
  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};

exports.AuthenticationError = AuthenticationError;
exports.AuthorizationError = AuthorizationError;
exports.NotFoundError = NotFoundError;
exports.QuotaExceededError = QuotaExceededError;
exports.RateLimitError = RateLimitError;
exports.ServerError = ServerError;
exports.TimeoutError = TimeoutError;
exports.VERSION = VERSION;
exports.ValidationError = ValidationError;
exports.VerifyAI = VerifyAI;
exports.VerifyAIError = VerifyAIError;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
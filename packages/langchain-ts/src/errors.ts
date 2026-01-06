/**
 * VerifyAI LangChain Errors
 * Custom error classes for verification failures
 */

/**
 * Base error for verification failures
 */
export class VerificationError extends Error {
  readonly verificationId?: string;
  readonly verdict?: string;
  readonly confidence?: number;
  readonly decision?: string;

  constructor(
    message: string,
    options?: {
      verificationId?: string;
      verdict?: string;
      confidence?: number;
      decision?: string;
    }
  ) {
    super(message);
    this.name = 'VerificationError';
    this.verificationId = options?.verificationId;
    this.verdict = options?.verdict;
    this.confidence = options?.confidence;
    this.decision = options?.decision;
  }
}

/**
 * Raised when LLM output fails verification with 'reject' decision
 */
export class VerificationRejectedError extends VerificationError {
  readonly content?: string;
  readonly reasoning?: string;

  constructor(
    message: string,
    options?: {
      verificationId?: string;
      verdict?: string;
      confidence?: number;
      content?: string;
      reasoning?: string;
    }
  ) {
    super(message, {
      verificationId: options?.verificationId,
      verdict: options?.verdict,
      confidence: options?.confidence,
      decision: 'reject',
    });
    this.name = 'VerificationRejectedError';
    this.content = options?.content;
    this.reasoning = options?.reasoning;
  }
}

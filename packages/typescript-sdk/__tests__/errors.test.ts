import { describe, it, expect } from 'vitest';
import {
  VerifyAIError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  QuotaExceededError,
  TimeoutError,
  ServerError,
} from '../src/errors';

describe('VerifyAI Errors', () => {
  describe('VerifyAIError', () => {
    it('should create error with message', () => {
      const error = new VerifyAIError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('VerifyAIError');
      expect(error.code).toBe('UNKNOWN_ERROR');
    });

    it('should create error with code', () => {
      const error = new VerifyAIError('Test error', { code: 'TEST_CODE' });
      expect(error.code).toBe('TEST_CODE');
    });

    it('should create error with status', () => {
      const error = new VerifyAIError('Test error', { status: 400 });
      expect(error.status).toBe(400);
    });

    it('should create error with requestId', () => {
      const error = new VerifyAIError('Test error', { requestId: 'req_123' });
      expect(error.requestId).toBe('req_123');
    });

    it('should create error with details', () => {
      const error = new VerifyAIError('Test error', {
        details: { field: 'content', reason: 'too short' },
      });
      expect(error.details).toEqual({ field: 'content', reason: 'too short' });
    });

    it('should be instance of Error', () => {
      const error = new VerifyAIError('Test error');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('VerifyAIError.fromResponse', () => {
    it('should create AuthenticationError for AUTHENTICATION_ERROR code', () => {
      const error = VerifyAIError.fromResponse(
        { error: 'Invalid key', code: 'AUTHENTICATION_ERROR' },
        401
      );
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.status).toBe(401);
    });

    it('should create ValidationError for VALIDATION_ERROR code', () => {
      const error = VerifyAIError.fromResponse(
        { error: 'Invalid request', code: 'VALIDATION_ERROR' },
        400
      );
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should create RateLimitError for RATE_LIMIT code', () => {
      const error = VerifyAIError.fromResponse(
        { error: 'Rate limited', code: 'RATE_LIMIT' },
        429
      );
      expect(error).toBeInstanceOf(RateLimitError);
    });

    it('should create NotFoundError for NOT_FOUND code', () => {
      const error = VerifyAIError.fromResponse(
        { error: 'Not found', code: 'NOT_FOUND' },
        404
      );
      expect(error).toBeInstanceOf(NotFoundError);
    });

    it('should fall back to status code when code is missing', () => {
      const error = VerifyAIError.fromResponse(
        { error: 'Unauthorized' },
        401
      );
      expect(error).toBeInstanceOf(AuthenticationError);
    });

    it('should create ServerError for 500 status', () => {
      const error = VerifyAIError.fromResponse(
        { error: 'Internal error' },
        500
      );
      expect(error).toBeInstanceOf(ServerError);
    });

    it('should create ServerError for 503 status', () => {
      const error = VerifyAIError.fromResponse(
        { error: 'Service unavailable' },
        503
      );
      expect(error).toBeInstanceOf(ServerError);
    });

    it('should include requestId from response', () => {
      const error = VerifyAIError.fromResponse(
        { error: 'Error', requestId: 'req_abc123' },
        500
      );
      expect(error.requestId).toBe('req_abc123');
    });
  });

  describe('AuthenticationError', () => {
    it('should have correct name and default code', () => {
      const error = new AuthenticationError('Invalid API key');
      expect(error.name).toBe('AuthenticationError');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should be instance of VerifyAIError', () => {
      const error = new AuthenticationError('Invalid API key');
      expect(error).toBeInstanceOf(VerifyAIError);
    });
  });

  describe('AuthorizationError', () => {
    it('should have correct name and default code', () => {
      const error = new AuthorizationError('Permission denied');
      expect(error.name).toBe('AuthorizationError');
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should have correct name and default code', () => {
      const error = new ValidationError('Invalid input');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should include details about validation failure', () => {
      const error = new ValidationError('Invalid input', {
        details: { field: 'content', reason: 'required' },
      });
      expect(error.details).toEqual({ field: 'content', reason: 'required' });
    });
  });

  describe('NotFoundError', () => {
    it('should have correct name and default code', () => {
      const error = new NotFoundError('Resource not found');
      expect(error.name).toBe('NotFoundError');
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('RateLimitError', () => {
    it('should have correct name and default code', () => {
      const error = new RateLimitError('Rate limit exceeded');
      expect(error.name).toBe('RateLimitError');
      expect(error.code).toBe('RATE_LIMIT');
    });

    it('should include retryAfter', () => {
      const error = new RateLimitError('Rate limit exceeded', { retryAfter: 30 });
      expect(error.retryAfter).toBe(30);
    });

    it('should have undefined retryAfter when not provided', () => {
      const error = new RateLimitError('Rate limit exceeded');
      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('QuotaExceededError', () => {
    it('should have correct name and default code', () => {
      const error = new QuotaExceededError('Monthly quota exceeded');
      expect(error.name).toBe('QuotaExceededError');
      expect(error.code).toBe('QUOTA_EXCEEDED');
    });
  });

  describe('TimeoutError', () => {
    it('should have correct name and default code', () => {
      const error = new TimeoutError('Request timed out');
      expect(error.name).toBe('TimeoutError');
      expect(error.code).toBe('TIMEOUT');
    });

    it('should include timeout details', () => {
      const error = new TimeoutError('Request timed out after 30000ms', {
        details: { verificationId: 'ver_123', lastStatus: 'processing' },
      });
      expect(error.details).toEqual({
        verificationId: 'ver_123',
        lastStatus: 'processing',
      });
    });
  });

  describe('ServerError', () => {
    it('should have correct name and default code', () => {
      const error = new ServerError('Internal server error');
      expect(error.name).toBe('ServerError');
      expect(error.code).toBe('SERVER_ERROR');
    });

    it('should include status code', () => {
      const error = new ServerError('Internal server error', { status: 500 });
      expect(error.status).toBe(500);
    });
  });

  describe('error inheritance', () => {
    it('all error types should be instances of Error', () => {
      const errors = [
        new VerifyAIError('test'),
        new AuthenticationError('test'),
        new AuthorizationError('test'),
        new ValidationError('test'),
        new NotFoundError('test'),
        new RateLimitError('test'),
        new QuotaExceededError('test'),
        new TimeoutError('test'),
        new ServerError('test'),
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(VerifyAIError);
      }
    });

    it('error types should have proper stack traces', () => {
      const error = new VerifyAIError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('VerifyAIError');
    });
  });
});

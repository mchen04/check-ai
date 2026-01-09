import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Shove, VERSION } from '../src/client';
import {
  ShoveError,
  AuthenticationError,
  RateLimitError,
  TimeoutError,
  ValidationError,
  NotFoundError,
} from '../src/errors';

describe('Shove Client', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // CONSTRUCTOR TESTS
  // ===========================================================================

  describe('constructor', () => {
    it('should throw error when API key is missing', () => {
      expect(() => new Shove({ apiKey: '' })).toThrow(ShoveError);
      expect(() => new Shove({ apiKey: '' })).toThrow('API key is required');
    });

    it('should create client with valid API key', () => {
      const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
      expect(client).toBeDefined();
    });

    it('should use default base URL', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'ver_123', status: 'pending' }),
      });

      const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
      client.verify({ content: 'test', methods: { reasoning: 1.0 } });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.shove.ai/v1/verify',
        expect.any(Object)
      );
    });

    it('should use custom base URL', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'ver_123', status: 'pending' }),
      });

      const client = new Shove({
        apiKey: 'vfy_test123',
        baseUrl: 'https://custom.api.com/',
        fetch: mockFetch,
      });
      client.verify({ content: 'test', methods: { reasoning: 1.0 } });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.com/v1/verify',
        expect.any(Object)
      );
    });

    it('should strip trailing slash from base URL', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'ver_123', status: 'pending' }),
      });

      const client = new Shove({
        apiKey: 'vfy_test123',
        baseUrl: 'https://custom.api.com/',
        fetch: mockFetch,
      });
      client.verify({ content: 'test', methods: { reasoning: 1.0 } });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.com/v1/verify',
        expect.any(Object)
      );
    });
  });

  // ===========================================================================
  // VERIFY TESTS
  // ===========================================================================

  describe('verify', () => {
    it('should make POST request to /v1/verify', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'ver_123',
          status: 'pending',
        }),
      });

      const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
      const result = await client.verify({
        content: 'Test content',
        methods: { reasoning: 1.0 },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.shove.ai/v1/verify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer vfy_test123',
            'Content-Type': 'application/json',
            'User-Agent': `@shove/sdk/${VERSION}`,
          }),
        })
      );
      expect(result.id).toBe('ver_123');
      expect(result.status).toBe('pending');
    });

    it('should send correct request body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'ver_123', status: 'pending' }),
      });

      const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
      await client.verify({
        content: 'Paris is the capital of France.',
        methods: { reasoning: 1.0, tool: 0.5 },
        context: { source: 'test' },
        idempotencyKey: 'key123',
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.content).toBe('Paris is the capital of France.');
      expect(body.methods).toEqual({ reasoning: 1.0, tool: 0.5 });
      expect(body.context).toEqual({ source: 'test' });
      expect(body.idempotencyKey).toBe('key123');
    });
  });

  // ===========================================================================
  // GET VERIFICATION TESTS
  // ===========================================================================

  describe('getVerification', () => {
    it('should throw error when ID is missing', async () => {
      const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
      await expect(client.getVerification('')).rejects.toThrow(ShoveError);
      await expect(client.getVerification('')).rejects.toThrow('Verification ID is required');
    });

    it('should make GET request with correct ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'ver_abc123',
          status: 'completed',
          verdict: 'true',
          confidence: 0.95,
        }),
      });

      const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
      const result = await client.getVerification('ver_abc123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.shove.ai/v1/verify/ver_abc123',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBe(0.95);
    });

    it('should URL encode verification ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'ver_abc/123', status: 'completed' }),
      });

      const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
      await client.getVerification('ver_abc/123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.shove.ai/v1/verify/ver_abc%2F123',
        expect.any(Object)
      );
    });
  });

  // ===========================================================================
  // VERIFY AND WAIT TESTS
  // ===========================================================================

  describe('verifyAndWait', () => {
    it('should poll until completion', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Initial verify call
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'ver_123', status: 'pending' }),
          });
        }
        if (callCount === 2) {
          // First poll - still processing
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'ver_123', status: 'processing' }),
          });
        }
        // Second poll - completed
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'ver_123',
            status: 'completed',
            verdict: 'true',
            confidence: 0.95,
          }),
        });
      });

      const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
      const result = await client.verifyAndWait(
        { content: 'Test', methods: { reasoning: 1.0 } },
        { pollInterval: 10, timeout: 5000 }
      );

      expect(callCount).toBe(3);
      expect(result.status).toBe('completed');
      expect(result.verdict).toBe('true');
    });

    it('should throw TimeoutError when timeout exceeded', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'ver_123', status: 'processing' }),
        });
      });

      const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });

      await expect(
        client.verifyAndWait(
          { content: 'Test', methods: { reasoning: 1.0 } },
          { pollInterval: 10, timeout: 50 }
        )
      ).rejects.toThrow(TimeoutError);
    });

    it('should return immediately if verification completes on first call', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'ver_123',
          status: 'completed',
          verdict: 'false',
          confidence: 0.1,
        }),
      });

      const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
      const result = await client.verifyAndWait(
        { content: 'Test', methods: { reasoning: 1.0 } }
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('completed');
    });
  });

  // ===========================================================================
  // BATCH OPERATIONS TESTS
  // ===========================================================================

  describe('batch operations', () => {
    describe('createBatch', () => {
      it('should create batch job', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'batch_123',
            status: 'pending',
            totalItems: 3,
            message: 'Batch created successfully',
          }),
        });

        const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
        const result = await client.createBatch({
          items: [
            { content: 'Item 1' },
            { content: 'Item 2' },
            { content: 'Item 3' },
          ],
          methods: { reasoning: 1.0 },
        });

        expect(result.id).toBe('batch_123');
        expect(result.totalItems).toBe(3);
      });
    });

    describe('getBatch', () => {
      it('should throw error when batch ID is missing', async () => {
        const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
        await expect(client.getBatch('')).rejects.toThrow(ShoveError);
      });

      it('should get batch details', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'batch_123',
            status: 'processing',
            totalItems: 10,
            completedItems: 5,
            failedItems: 0,
            progress: 50,
          }),
        });

        const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
        const result = await client.getBatch('batch_123');

        expect(result.progress).toBe(50);
        expect(result.completedItems).toBe(5);
      });
    });

    describe('listBatches', () => {
      it('should list batches with pagination', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            data: [{ id: 'batch_1' }, { id: 'batch_2' }],
            pagination: { total: 10, limit: 2, offset: 0, hasMore: true },
          }),
        });

        const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
        const result = await client.listBatches({ limit: 2 });

        expect(result.data).toHaveLength(2);
        expect(result.pagination.hasMore).toBe(true);
      });

      it('should include query parameters', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: [], pagination: {} }),
        });

        const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
        await client.listBatches({ limit: 10, offset: 5, status: 'completed' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=10'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('offset=5'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=completed'),
          expect.any(Object)
        );
      });
    });

    describe('cancelBatch', () => {
      it('should cancel batch', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'batch_123',
            status: 'cancelled',
          }),
        });

        const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
        const result = await client.cancelBatch('batch_123');

        expect(result.status).toBe('cancelled');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.shove.ai/v1/batch/batch_123/cancel',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('getBatchResults', () => {
      it('should get batch results', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            batchId: 'batch_123',
            status: 'completed',
            results: [
              { index: 0, verdict: 'true', confidence: 0.95 },
              { index: 1, verdict: 'false', confidence: 0.1 },
            ],
          }),
        });

        const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
        const result = await client.getBatchResults('batch_123');

        expect(result.results).toHaveLength(2);
        expect(result.results[0].verdict).toBe('true');
      });
    });

    describe('createBatchAndWait', () => {
      it('should poll until batch completes', async () => {
        let callCount = 0;
        mockFetch.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // Create batch
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                id: 'batch_123',
                status: 'pending',
                totalItems: 2,
              }),
            });
          }
          if (callCount <= 3) {
            // Polling - processing
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                id: 'batch_123',
                status: 'processing',
                progress: callCount * 30,
              }),
            });
          }
          // Completed
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: 'batch_123',
              status: 'completed',
              progress: 100,
            }),
          });
        });

        const onProgress = vi.fn();
        const client = new Shove({ apiKey: 'vfy_test123', fetch: mockFetch });
        const result = await client.createBatchAndWait(
          { items: [{ content: 'Item 1' }], methods: { reasoning: 1.0 } },
          { pollInterval: 10, onProgress }
        );

        expect(result.status).toBe('completed');
        expect(onProgress).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('error handling', () => {
    it('should throw AuthenticationError on 401', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: 'Invalid API key',
          code: 'AUTHENTICATION_ERROR',
        }),
      });

      const client = new Shove({
        apiKey: 'vfy_invalid',
        fetch: mockFetch,
        retry: false,
      });

      await expect(
        client.verify({ content: 'Test', methods: { reasoning: 1.0 } })
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw ValidationError on 400', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'Invalid request',
          code: 'VALIDATION_ERROR',
        }),
      });

      const client = new Shove({
        apiKey: 'vfy_test',
        fetch: mockFetch,
        retry: false,
      });

      await expect(
        client.verify({ content: '', methods: {} })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError on 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error: 'Verification not found',
          code: 'NOT_FOUND',
        }),
      });

      const client = new Shove({
        apiKey: 'vfy_test',
        fetch: mockFetch,
        retry: false,
      });

      await expect(
        client.getVerification('ver_notexist')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw RateLimitError on 429 with retryAfter', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Map([['Retry-After', '30']]),
        json: () => Promise.resolve({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT',
        }),
      });

      // Mock headers.get
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (name: string) => name === 'Retry-After' ? '30' : null },
        json: () => Promise.resolve({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT',
        }),
      });

      const client = new Shove({
        apiKey: 'vfy_test',
        fetch: mockFetch,
        retry: false,
      });

      try {
        await client.verify({ content: 'Test', methods: { reasoning: 1.0 } });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe(30);
      }
    });

    it('should include requestId in error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          error: 'Internal error',
          code: 'SERVER_ERROR',
          requestId: 'req_abc123',
        }),
      });

      const client = new Shove({
        apiKey: 'vfy_test',
        fetch: mockFetch,
        retry: false,
      });

      try {
        await client.verify({ content: 'Test', methods: { reasoning: 1.0 } });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ShoveError).requestId).toBe('req_abc123');
      }
    });
  });

  // ===========================================================================
  // RETRY BEHAVIOR TESTS
  // ===========================================================================

  describe('retry behavior', () => {
    it('should retry on rate limit', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: { get: () => '1' },
            json: () => Promise.resolve({ error: 'Rate limited' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'ver_123', status: 'pending' }),
        });
      });

      const client = new Shove({
        apiKey: 'vfy_test',
        fetch: mockFetch,
        retry: { maxRetries: 3, initialDelay: 10 },
      });

      const result = await client.verify({
        content: 'Test',
        methods: { reasoning: 1.0 },
      });

      expect(callCount).toBe(2);
      expect(result.id).toBe('ver_123');
    });

    it('should retry on 500 errors', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'ver_123', status: 'pending' }),
        });
      });

      const client = new Shove({
        apiKey: 'vfy_test',
        fetch: mockFetch,
        retry: { maxRetries: 3, initialDelay: 10 },
      });

      const result = await client.verify({
        content: 'Test',
        methods: { reasoning: 1.0 },
      });

      expect(callCount).toBe(3);
      expect(result.id).toBe('ver_123');
    });

    it('should not retry when retry is disabled', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: { get: () => '1' },
          json: () => Promise.resolve({ error: 'Rate limited' }),
        });
      });

      const client = new Shove({
        apiKey: 'vfy_test',
        fetch: mockFetch,
        retry: false,
      });

      await expect(
        client.verify({ content: 'Test', methods: { reasoning: 1.0 } })
      ).rejects.toThrow(RateLimitError);

      expect(callCount).toBe(1);
    });

    it('should not retry on 400 errors', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Bad request' }),
        });
      });

      const client = new Shove({
        apiKey: 'vfy_test',
        fetch: mockFetch,
        retry: { maxRetries: 3, initialDelay: 10 },
      });

      await expect(
        client.verify({ content: 'Test', methods: { reasoning: 1.0 } })
      ).rejects.toThrow(ValidationError);

      expect(callCount).toBe(1);
    });

    it('should respect max retries', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        });
      });

      const client = new Shove({
        apiKey: 'vfy_test',
        fetch: mockFetch,
        retry: { maxRetries: 2, initialDelay: 10 },
      });

      await expect(
        client.verify({ content: 'Test', methods: { reasoning: 1.0 } })
      ).rejects.toThrow();

      // Initial + 2 retries = 3 calls
      expect(callCount).toBe(3);
    });
  });

  // ===========================================================================
  // VERSION EXPORT TEST
  // ===========================================================================

  describe('VERSION', () => {
    it('should export version string', () => {
      expect(VERSION).toBe('0.1.0');
    });
  });
});

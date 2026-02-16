/**
 * Batch File Storage Tests
 * Tests temporary file storage via Redis
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Mocks
// =============================================================================

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockGetdel = vi.fn();

const mockRedisInstance = {
  get: mockGet,
  set: mockSet,
  del: mockDel,
  getdel: mockGetdel,
};

vi.mock('@upstash/redis', () => {
  return {
    Redis: class MockRedis {
      get = mockGet;
      set = mockSet;
      del = mockDel;
      getdel = mockGetdel;
    },
  };
});

const originalEnv = { ...process.env };

// =============================================================================
// Tests
// =============================================================================

describe('file storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token123';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isFileStorageAvailable', () => {
    it('returns true when both env vars set', async () => {
      const { isFileStorageAvailable } = await import('@/lib/batch/file-storage');
      expect(isFileStorageAvailable()).toBe(true);
    });

    it('returns false when vars missing', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      const { isFileStorageAvailable } = await import('@/lib/batch/file-storage');
      expect(isFileStorageAvailable()).toBe(false);
    });
  });

  describe('storeUploadedFile', () => {
    it('throws when Redis not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { storeUploadedFile } = await import('@/lib/batch/file-storage');
      await expect(
        storeUploadedFile('file_1', 'org_1', [], 'test.csv', 'csv')
      ).rejects.toThrow('Redis not configured');
    });

    it('stores with correct key prefix and 1h TTL', async () => {
      mockSet.mockResolvedValue('OK');

      const { storeUploadedFile } = await import('@/lib/batch/file-storage');
      const items = [{ content: 'test', row: 1 }] as any;

      await storeUploadedFile('file_1', 'org_1', items, 'test.csv', 'csv');

      expect(mockSet).toHaveBeenCalledWith(
        'batch:file:file_1',
        expect.any(String),
        { ex: 3600 }
      );

      const stored = JSON.parse(mockSet.mock.calls[0][1]);
      expect(stored.orgId).toBe('org_1');
      expect(stored.format).toBe('csv');
      expect(stored.originalFileName).toBe('test.csv');
    });

    it('stored JSON includes all required fields', async () => {
      mockSet.mockResolvedValue('OK');

      const { storeUploadedFile } = await import('@/lib/batch/file-storage');
      const items = [{ content: 'test item', context: { source: 'api' } }] as any;

      await storeUploadedFile('file_2', 'org_2', items, 'data.json', 'json');

      const stored = JSON.parse(mockSet.mock.calls[0][1]);
      expect(stored).toHaveProperty('items');
      expect(stored).toHaveProperty('orgId', 'org_2');
      expect(stored).toHaveProperty('format', 'json');
      expect(stored).toHaveProperty('originalFileName', 'data.json');
      expect(stored).toHaveProperty('uploadedAt');
      // uploadedAt should be a valid ISO string
      expect(new Date(stored.uploadedAt).toISOString()).toBe(stored.uploadedAt);
      expect(stored.items).toEqual(items);
    });
  });

  describe('getStoredFile', () => {
    it('returns null when Redis not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { getStoredFile } = await import('@/lib/batch/file-storage');
      const result = await getStoredFile('file_1', 'org_1');
      expect(result).toBeNull();
    });

    it('returns null when not found', async () => {
      mockGet.mockResolvedValue(null);

      const { getStoredFile } = await import('@/lib/batch/file-storage');
      const result = await getStoredFile('file_nonexistent', 'org_1');
      expect(result).toBeNull();
    });

    it('returns null on orgId mismatch (security)', async () => {
      mockGet.mockResolvedValue({
        items: [],
        originalFileName: 'test.csv',
        format: 'csv',
        uploadedAt: new Date().toISOString(),
        orgId: 'org_other',
      });

      const { getStoredFile } = await import('@/lib/batch/file-storage');
      const result = await getStoredFile('file_1', 'org_1');
      expect(result).toBeNull();
    });

    it('returns data on valid access', async () => {
      const storedData = {
        items: [{ content: 'test' }],
        originalFileName: 'test.csv',
        format: 'csv',
        uploadedAt: new Date().toISOString(),
        orgId: 'org_1',
      };
      mockGet.mockResolvedValue(storedData);

      const { getStoredFile } = await import('@/lib/batch/file-storage');
      const result = await getStoredFile('file_1', 'org_1');

      expect(result).not.toBeNull();
      expect(result!.format).toBe('csv');
      expect(result!.originalFileName).toBe('test.csv');
    });

    it('returns data with nested context objects correctly', async () => {
      const storedData = {
        items: [
          {
            content: 'test item',
            context: {
              source: 'api',
              metadata: { nested: { deep: true }, tags: ['a', 'b'] },
            },
          },
        ],
        originalFileName: 'complex.json',
        format: 'json',
        uploadedAt: new Date().toISOString(),
        orgId: 'org_1',
      };
      mockGet.mockResolvedValue(storedData);

      const { getStoredFile } = await import('@/lib/batch/file-storage');
      const result = await getStoredFile('file_1', 'org_1');

      expect(result).not.toBeNull();
      const item = result!.items[0] as any;
      expect(item.context.source).toBe('api');
      expect(item.context.metadata.nested.deep).toBe(true);
      expect(item.context.metadata.tags).toEqual(['a', 'b']);
    });
  });

  describe('consumeStoredFile', () => {
    it('returns null when not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { consumeStoredFile } = await import('@/lib/batch/file-storage');
      const result = await consumeStoredFile('file_1', 'org_1');
      expect(result).toBeNull();
    });

    it('returns null when not found', async () => {
      mockGetdel.mockResolvedValue(null);

      const { consumeStoredFile } = await import('@/lib/batch/file-storage');
      const result = await consumeStoredFile('file_nonexistent', 'org_1');
      expect(result).toBeNull();
    });

    it('returns null on orgId mismatch (security - file deleted)', async () => {
      mockGetdel.mockResolvedValue({
        items: [],
        originalFileName: 'test.csv',
        format: 'csv',
        uploadedAt: new Date().toISOString(),
        orgId: 'org_other',
      });

      const { consumeStoredFile } = await import('@/lib/batch/file-storage');
      const result = await consumeStoredFile('file_1', 'org_1');
      // File is deleted by getdel but access denied
      expect(result).toBeNull();
    });

    it('uses getdel for atomic read-and-delete (not get + del separately)', async () => {
      const storedData = {
        items: [{ content: 'atomic test' }],
        originalFileName: 'test.csv',
        format: 'csv',
        uploadedAt: new Date().toISOString(),
        orgId: 'org_1',
      };
      mockGetdel.mockResolvedValue(storedData);

      const { consumeStoredFile } = await import('@/lib/batch/file-storage');
      await consumeStoredFile('file_1', 'org_1');

      // Should use getdel (atomic), NOT get + del separately
      expect(mockGetdel).toHaveBeenCalledWith('batch:file:file_1');
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockDel).not.toHaveBeenCalled();
    });

    it('returns data and deletes atomically', async () => {
      const storedData = {
        items: [{ content: 'test' }],
        originalFileName: 'test.csv',
        format: 'csv',
        uploadedAt: new Date().toISOString(),
        orgId: 'org_1',
      };
      mockGetdel.mockResolvedValue(storedData);

      const { consumeStoredFile } = await import('@/lib/batch/file-storage');
      const result = await consumeStoredFile('file_1', 'org_1');

      expect(result).not.toBeNull();
      expect(result!.items).toEqual([{ content: 'test' }]);
      expect(mockGetdel).toHaveBeenCalledWith('batch:file:file_1');
    });

    it('returns null on double consume', async () => {
      const storedData = {
        items: [{ content: 'test' }],
        originalFileName: 'test.csv',
        format: 'csv',
        uploadedAt: new Date().toISOString(),
        orgId: 'org_1',
      };
      mockGetdel.mockResolvedValueOnce(storedData).mockResolvedValueOnce(null);

      const { consumeStoredFile } = await import('@/lib/batch/file-storage');

      const first = await consumeStoredFile('file_1', 'org_1');
      expect(first).not.toBeNull();

      const second = await consumeStoredFile('file_1', 'org_1');
      expect(second).toBeNull();
    });
  });

  describe('deleteStoredFile', () => {
    it('no-op when Redis not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { deleteStoredFile } = await import('@/lib/batch/file-storage');
      await deleteStoredFile('file_1');
      expect(mockDel).not.toHaveBeenCalled();
    });

    it('deletes by id', async () => {
      mockDel.mockResolvedValue(1);

      const { deleteStoredFile } = await import('@/lib/batch/file-storage');
      await deleteStoredFile('file_1');

      expect(mockDel).toHaveBeenCalledWith('batch:file:file_1');
    });
  });
});

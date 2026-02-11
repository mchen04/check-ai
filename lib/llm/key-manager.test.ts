/**
 * Tests for KeyManager module
 * Covers encryption/decryption, hashing, key generation, and provider key validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('@/utils/db/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'mock-id' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockReturnThis(),
  },
}));

vi.mock('@/utils/db/schema', () => ({
  apiKeysTable: {
    id: 'id',
    orgId: 'orgId',
    name: 'name',
    keyHash: 'keyHash',
    keyPrefix: 'keyPrefix',
    isActive: 'isActive',
    lastUsedAt: 'lastUsedAt',
    createdAt: 'createdAt',
    expiresAt: 'expiresAt',
  },
  providerCredentialsTable: {
    id: 'id',
    orgId: 'orgId',
    name: 'name',
    provider: 'provider',
    encryptedCredentials: 'encryptedCredentials',
    isActive: 'isActive',
    deletedAt: 'deletedAt',
  },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@/lib/api/formatters', () => ({
  isDateExpired: (date: Date | null | undefined) =>
    date != null && date < new Date(),
}));

// ---------------------------------------------------------------------------
// Import module under test (after mocks are set up)
// ---------------------------------------------------------------------------

import {
  encrypt,
  decrypt,
  hashApiKey,
  generateKeyPrefix,
  generatePlatformApiKey,
  KeyManager,
} from './key-manager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_ENCRYPTION_KEY = 'test-encryption-key-for-vitest-32chars!!';

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('KeyManager module', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // encrypt / decrypt
  // =========================================================================

  describe('encrypt & decrypt', () => {
    it('should roundtrip a simple string', () => {
      const plaintext = 'sk-abc123xyz';
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it('should roundtrip an empty string', () => {
      const ciphertext = encrypt('');
      expect(decrypt(ciphertext)).toBe('');
    });

    it('should roundtrip unicode content', () => {
      const text = 'Voila!\u00A0\u2014 key=\u4E16\u754C';
      expect(decrypt(encrypt(text))).toBe(text);
    });

    it('should roundtrip a long string', () => {
      const text = 'x'.repeat(10_000);
      expect(decrypt(encrypt(text))).toBe(text);
    });

    it('should produce format iv:authTag:encrypted', () => {
      const ciphertext = encrypt('test');
      const parts = ciphertext.split(':');
      expect(parts).toHaveLength(3);
      // IV = 16 bytes = 32 hex chars
      expect(parts[0]).toHaveLength(32);
      // Auth tag = 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32);
      // Encrypted portion is non-empty hex
      expect(parts[2].length).toBeGreaterThan(0);
      expect(/^[0-9a-f]+$/.test(parts[2])).toBe(true);
    });

    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
      const a = encrypt('same');
      const b = encrypt('same');
      expect(a).not.toBe(b);
      // Both should still decrypt to the same value
      expect(decrypt(a)).toBe('same');
      expect(decrypt(b)).toBe('same');
    });

    it('should throw when ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is required');
    });

    it('decrypt should throw on malformed input (wrong number of parts)', () => {
      expect(() => decrypt('onlyone')).toThrow('Invalid encrypted text format');
      expect(() => decrypt('a:b')).toThrow('Invalid encrypted text format');
      expect(() => decrypt('a:b:c:d')).toThrow('Invalid encrypted text format');
    });

    it('decrypt should throw when auth tag is tampered', () => {
      const ciphertext = encrypt('secret');
      const parts = ciphertext.split(':');
      // Flip a character in the auth tag
      const tamperedTag =
        parts[1][0] === '0'
          ? 'f' + parts[1].slice(1)
          : '0' + parts[1].slice(1);
      const tampered = `${parts[0]}:${tamperedTag}:${parts[2]}`;
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  // =========================================================================
  // hashApiKey
  // =========================================================================

  describe('hashApiKey', () => {
    it('should return a 64-character hex string (SHA-256)', () => {
      const hash = hashApiKey('sk-test-123');
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it('should be deterministic', () => {
      const a = hashApiKey('sk-test-123');
      const b = hashApiKey('sk-test-123');
      expect(a).toBe(b);
    });

    it('should produce different hashes for different inputs', () => {
      expect(hashApiKey('key-a')).not.toBe(hashApiKey('key-b'));
    });

    it('should handle empty string', () => {
      const hash = hashApiKey('');
      expect(hash).toHaveLength(64);
    });
  });

  // =========================================================================
  // generateKeyPrefix
  // =========================================================================

  describe('generateKeyPrefix', () => {
    it('should start with "vfy_"', () => {
      expect(generateKeyPrefix().startsWith('vfy_')).toBe(true);
    });

    it('should be exactly 12 characters (4 prefix + 8 random)', () => {
      expect(generateKeyPrefix()).toHaveLength(12);
    });

    it('random portion should only contain lowercase alphanumeric chars', () => {
      for (let i = 0; i < 20; i++) {
        const suffix = generateKeyPrefix().slice(4);
        expect(/^[a-z0-9]{8}$/.test(suffix)).toBe(true);
      }
    });

    it('should produce different prefixes on successive calls (probabilistic)', () => {
      const set = new Set(Array.from({ length: 50 }, () => generateKeyPrefix()));
      // 36^8 possibilities — collisions in 50 samples are essentially impossible
      expect(set.size).toBeGreaterThan(1);
    });
  });

  // =========================================================================
  // generatePlatformApiKey
  // =========================================================================

  describe('generatePlatformApiKey', () => {
    it('should start with "vfy_"', () => {
      expect(generatePlatformApiKey().startsWith('vfy_')).toBe(true);
    });

    it('should be prefix (12) + base64url secret (32) = 44 chars', () => {
      // 24 random bytes -> base64url = ceil(24*4/3) = 32 characters
      const key = generatePlatformApiKey();
      expect(key).toHaveLength(44);
    });

    it('secret portion should be valid base64url', () => {
      const key = generatePlatformApiKey();
      const secret = key.slice(12);
      expect(/^[A-Za-z0-9_-]+$/.test(secret)).toBe(true);
    });

    it('should produce unique keys', () => {
      const keys = Array.from({ length: 20 }, () => generatePlatformApiKey());
      expect(new Set(keys).size).toBe(20);
    });
  });

  // =========================================================================
  // KeyManager.validateProviderKey
  // =========================================================================

  describe('KeyManager.validateProviderKey', () => {
    let manager: KeyManager;
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      manager = new KeyManager();
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    // -----------------------------------------------------------------------
    // openai — uses OpenAI SDK (dynamic import inside validateProviderKey)
    // -----------------------------------------------------------------------
    describe('openai', () => {
      it('should return valid when SDK succeeds', async () => {
        const mockList = vi.fn().mockResolvedValue({ data: [] });
        vi.doMock('openai', () => {
          return {
            OpenAI: class MockOpenAI {
              models = { list: mockList };
            },
          };
        });
        const { KeyManager: KM } = await import('./key-manager');
        const km = new KM();
        const result = await km.validateProviderKey('openai', 'sk-test');
        expect(result).toEqual({ valid: true });
        expect(mockList).toHaveBeenCalled();
      });

      it('should return invalid when SDK throws', async () => {
        const mockList = vi
          .fn()
          .mockRejectedValue(new Error('Incorrect API key'));
        vi.doMock('openai', () => {
          return {
            OpenAI: class MockOpenAI {
              models = { list: mockList };
            },
          };
        });
        const { KeyManager: KM } = await import('./key-manager');
        const km = new KM();
        const result = await km.validateProviderKey('openai', 'bad-key');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Incorrect API key');
      });
    });

    // -----------------------------------------------------------------------
    // anthropic — uses Anthropic SDK (dynamic import inside validateProviderKey)
    // -----------------------------------------------------------------------
    describe('anthropic', () => {
      it('should return valid when SDK succeeds', async () => {
        const mockCreate = vi.fn().mockResolvedValue({ id: 'msg_test' });
        vi.doMock('@anthropic-ai/sdk', () => {
          return {
            default: class MockAnthropic {
              messages = { create: mockCreate };
            },
          };
        });
        const { KeyManager: KM } = await import('./key-manager');
        const km = new KM();
        const result = await km.validateProviderKey('anthropic', 'sk-ant-test');
        expect(result).toEqual({ valid: true });
        expect(mockCreate).toHaveBeenCalled();
      });

      it('should return invalid when SDK throws', async () => {
        const mockCreate = vi
          .fn()
          .mockRejectedValue(new Error('Invalid x-api-key'));
        vi.doMock('@anthropic-ai/sdk', () => {
          return {
            default: class MockAnthropic {
              messages = { create: mockCreate };
            },
          };
        });
        const { KeyManager: KM } = await import('./key-manager');
        const km = new KM();
        const result = await km.validateProviderKey('anthropic', 'bad-key');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid x-api-key');
      });
    });

    // -----------------------------------------------------------------------
    // google — fetch with query param
    // -----------------------------------------------------------------------
    describe('google', () => {
      it('should return valid when response is ok', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: true });
        const result = await manager.validateProviderKey('google', 'AIza-test');
        expect(result).toEqual({ valid: true });
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('key=AIza-test')
        );
      });

      it('should return invalid when response is not ok', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false });
        const result = await manager.validateProviderKey('google', 'bad');
        expect(result).toEqual({ valid: false, error: 'Invalid Google API key' });
      });
    });

    // -----------------------------------------------------------------------
    // Bearer-based providers (GET /models)
    // -----------------------------------------------------------------------
    const bearerProviders: Array<{
      provider: Parameters<KeyManager['validateProviderKey']>[0];
      url: string;
      errorLabel: string;
    }> = [
      { provider: 'mistral', url: 'https://api.mistral.ai/v1/models', errorLabel: 'Invalid Mistral API key' },
      { provider: 'openrouter', url: 'https://openrouter.ai/api/v1/models', errorLabel: 'Invalid OpenRouter API key' },
    ];

    for (const { provider, url, errorLabel } of bearerProviders) {
      describe(provider, () => {
        it(`should call ${url} with Bearer header and return valid`, async () => {
          global.fetch = vi.fn().mockResolvedValue({ ok: true });
          const result = await manager.validateProviderKey(provider, 'test-key');
          expect(result).toEqual({ valid: true });
          expect(global.fetch).toHaveBeenCalledWith(url, {
            headers: { Authorization: 'Bearer test-key' },
          });
        });

        it(`should return error "${errorLabel}" when response is not ok`, async () => {
          global.fetch = vi.fn().mockResolvedValue({ ok: false });
          const result = await manager.validateProviderKey(provider, 'bad');
          expect(result).toEqual({ valid: false, error: errorLabel });
        });
      });
    }

    // -----------------------------------------------------------------------
    // azure / bedrock — return config error messages
    // -----------------------------------------------------------------------
    describe('azure', () => {
      it('should return error about configuration object', async () => {
        const result = await manager.validateProviderKey('azure', 'any-key');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Azure OpenAI requires configuration object');
        expect(result.error).toContain('validateAzureConfig');
      });
    });

    describe('bedrock', () => {
      it('should return error about AWS credentials', async () => {
        const result = await manager.validateProviderKey('bedrock', 'any-key');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('AWS Bedrock requires AWS credentials');
        expect(result.error).toContain('validateBedrockConfig');
      });
    });

    // -----------------------------------------------------------------------
    // Unknown provider
    // -----------------------------------------------------------------------
    describe('unknown provider', () => {
      it('should return unsupported provider error', async () => {
        const result = await manager.validateProviderKey(
          'nonexistent' as Parameters<KeyManager['validateProviderKey']>[0],
          'key'
        );
        expect(result).toEqual({
          valid: false,
          error: 'Unsupported provider: nonexistent',
        });
      });
    });

    // -----------------------------------------------------------------------
    // Network / unexpected error handling
    // -----------------------------------------------------------------------
    describe('error handling', () => {
      it('should catch fetch network errors and return error message', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));
        const result = await manager.validateProviderKey('google', 'key');
        expect(result).toEqual({ valid: false, error: 'Network failure' });
      });

      it('should return generic message for non-Error throws', async () => {
        global.fetch = vi.fn().mockRejectedValue('string-error');
        const result = await manager.validateProviderKey('google', 'key');
        expect(result).toEqual({ valid: false, error: 'Validation failed' });
      });
    });
  });
});

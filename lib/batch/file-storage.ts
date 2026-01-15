/**
 * Batch File Storage
 * Temporary storage for uploaded batch files using Redis
 */

import { Redis } from '@upstash/redis';
import type { ParsedBatchItem, FileUploadResult, BatchValidationError } from './types';
import { createLogger } from '@/lib/logger';

const log = createLogger('BatchStorage');

// =============================================================================
// Redis Client
// =============================================================================

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    log.warn('Redis not configured');
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

// =============================================================================
// Storage Configuration
// =============================================================================

const FILE_PREFIX = 'batch:file:';
const EXPIRY_SECONDS = 60 * 60; // 1 hour

// =============================================================================
// Storage Operations
// =============================================================================

interface StoredFile {
  items: ParsedBatchItem[];
  originalFileName: string;
  format: 'json' | 'csv';
  uploadedAt: string;
  orgId: string;
}

/**
 * Store parsed batch items temporarily
 */
export async function storeUploadedFile(
  fileId: string,
  orgId: string,
  items: ParsedBatchItem[],
  originalFileName: string,
  format: 'json' | 'csv'
): Promise<void> {
  const redis = getRedis();

  if (!redis) {
    throw new Error('Redis not configured for file storage');
  }

  const data: StoredFile = {
    items,
    originalFileName,
    format,
    uploadedAt: new Date().toISOString(),
    orgId,
  };

  await redis.set(`${FILE_PREFIX}${fileId}`, JSON.stringify(data), {
    ex: EXPIRY_SECONDS,
  });
}

/**
 * Retrieve stored file items (non-destructive read)
 */
export async function getStoredFile(
  fileId: string,
  orgId: string
): Promise<{
  items: ParsedBatchItem[];
  originalFileName: string;
  format: 'json' | 'csv';
} | null> {
  const redis = getRedis();

  if (!redis) {
    return null;
  }

  const data = await redis.get<StoredFile>(`${FILE_PREFIX}${fileId}`);

  if (!data) {
    return null;
  }

  // Verify org ownership
  if (data.orgId !== orgId) {
    return null;
  }

  return {
    items: data.items,
    originalFileName: data.originalFileName,
    format: data.format,
  };
}

/**
 * Retrieve and atomically delete stored file items (one-time use)
 * This ensures the file can only be used once by using atomic GETDEL
 */
export async function consumeStoredFile(
  fileId: string,
  orgId: string
): Promise<{
  items: ParsedBatchItem[];
  originalFileName: string;
  format: 'json' | 'csv';
} | null> {
  const redis = getRedis();

  if (!redis) {
    return null;
  }

  // Use GETDEL for atomic get-and-delete operation
  const key = `${FILE_PREFIX}${fileId}`;
  const data = await redis.getdel<StoredFile>(key);

  if (!data) {
    return null;
  }

  // Verify org ownership - if mismatch, file is already deleted (can't restore)
  // This is intentional for security - prevents probing
  if (data.orgId !== orgId) {
    log.warn({ fileId, expectedOrgId: orgId, actualOrgId: data.orgId }, 'Org mismatch for file access');
    return null;
  }

  return {
    items: data.items,
    originalFileName: data.originalFileName,
    format: data.format,
  };
}

/**
 * Delete stored file
 */
export async function deleteStoredFile(fileId: string): Promise<void> {
  const redis = getRedis();

  if (!redis) {
    return;
  }

  await redis.del(`${FILE_PREFIX}${fileId}`);
}

/**
 * Check if file storage is available
 */
export function isFileStorageAvailable(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

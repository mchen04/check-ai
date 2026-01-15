/**
 * Batch Processing Module
 * Exports for batch verification functionality
 */

// Types
export * from './types';

// Service functions
export {
  createBatch,
  getBatch,
  listBatches,
  getBatchResults,
  cancelBatch,
  getBatchItem,
} from './service';

// Progress tracking
export {
  updateBatchItemResult,
  updateBatchProgress,
  completeBatch,
  failBatch,
  getBatchProgress,
  isBatchActive,
  markItemProcessing,
} from './progress';

// Trigger.dev operations (replaces QStash)
export {
  queueBatchItems,
  cancelBatchItems,
  isTriggerConfigured,
  BATCH_TRIGGER_CONFIG,
} from './trigger';

// File parsing
export { parseCSV, parseJSON, parseFile, detectFormat } from './parsers';

// File storage
export {
  storeUploadedFile,
  getStoredFile,
  deleteStoredFile,
  isFileStorageAvailable,
} from './file-storage';

// Cleanup
export {
  cleanupExpiredBatches,
  getCleanupStats,
  type CleanupResult,
  type CleanupOptions,
} from './cleanup-service';

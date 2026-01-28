/**
 * Batch Processing Module
 * Exports for batch verification functionality
 */

// Types - Named exports for tree-shaking
export type {
  MethodsConfig,
  BatchJob,
  BatchItem,
  BatchValidationError,
  BatchItemInput,
  CreateBatchRequest,
  BatchJobResponse,
  BatchItemResponse,
  BatchResultsResponse,
  BatchItemQueuePayload,
  BatchItemProcessResult,
  FileUploadResult,
  ParsedBatchItem,
  ParseResult,
  BatchRealtimeEvent,
} from './types';
export { createBatchSchema, BATCH_CONSTANTS } from './types';

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
  consumeStoredFile,
  isFileStorageAvailable,
} from './file-storage';

// Cleanup
export {
  cleanupExpiredBatches,
  cleanupExpiredVerifications,
  getCleanupStats,
  getFullCleanupStats,
  type CleanupResult,
  type CleanupOptions,
} from './cleanup-service';

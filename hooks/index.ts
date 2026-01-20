/**
 * Hooks Barrel Export
 *
 * Central export for all custom hooks.
 * Import hooks from '@/hooks' instead of individual files.
 */

// Data fetching
export {
  useFetchWithPagination,
  type PaginationState,
  type FetchState,
  type UseFetchWithPaginationOptions,
  type UseFetchWithPaginationReturn,
} from './useFetchWithPagination';

// Dialog forms
export {
  useDialogForm,
  type UseDialogFormOptions,
  type UseDialogFormReturn,
} from './useDialogForm';

// Clipboard
export {
  useCopyToClipboard,
  type UseCopyToClipboardOptions,
  type UseCopyToClipboardReturn,
} from './useCopyToClipboard';

// Action loading state
export {
  useActionLoading,
  type UseActionLoadingReturn,
} from './useActionLoading';

// Real-time status tracking
export {
  useVerificationStatus,
  type ParadigmProgress,
  type VerificationStatusState,
  type UseVerificationStatusOptions,
} from './useVerificationStatus';

export {
  useBatchStatus,
  type BatchStatusState,
  type BatchProgress,
  type UseBatchStatusOptions,
} from './useBatchStatus';

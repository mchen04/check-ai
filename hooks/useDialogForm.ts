'use client';

/**
 * useDialogForm Hook
 *
 * A reusable hook for managing dialog forms with:
 * - Open/close state
 * - Form data state with reset on close
 * - Loading/submitting state
 * - Error state
 * - Success state with optional callback
 */

import { useState, useCallback, useRef } from 'react';
import { getErrorMessage } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface UseDialogFormOptions<TFormData, TResult = void> {
  /** Initial form data */
  initialData: TFormData;
  /** Async submit handler */
  onSubmit: (data: TFormData) => Promise<TResult>;
  /** Callback when submission succeeds */
  onSuccess?: (result: TResult) => void;
  /** Delay before resetting form after close (ms) */
  resetDelay?: number;
  /** Whether to close dialog on success (default: true) */
  closeOnSuccess?: boolean;
}

export interface UseDialogFormReturn<TFormData, TResult = void> {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Open the dialog */
  open: () => void;
  /** Close the dialog (resets form after delay) */
  close: () => void;
  /** Toggle dialog open state */
  setOpen: (open: boolean) => void;
  /** Current form data */
  formData: TFormData;
  /** Update form data */
  setFormData: React.Dispatch<React.SetStateAction<TFormData>>;
  /** Update a single field */
  setField: <K extends keyof TFormData>(key: K, value: TFormData[K]) => void;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Current error message (null if no error) */
  error: string | null;
  /** Set error message manually */
  setError: (error: string | null) => void;
  /** Whether submission succeeded */
  isSuccess: boolean;
  /** Result from successful submission */
  result: TResult | null;
  /** Handle form submission */
  handleSubmit: () => Promise<void>;
  /** Reset form to initial state */
  reset: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useDialogForm<TFormData, TResult = void>(
  options: UseDialogFormOptions<TFormData, TResult>
): UseDialogFormReturn<TFormData, TResult> {
  const {
    initialData,
    onSubmit,
    onSuccess,
    resetDelay = 300,
    closeOnSuccess = true,
  } = options;

  // Store initial data in ref for reset
  const initialDataRef = useRef(initialData);

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<TFormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [result, setResult] = useState<TResult | null>(null);

  // Reset form to initial state
  const reset = useCallback(() => {
    setFormData(initialDataRef.current);
    setIsSubmitting(false);
    setError(null);
    setIsSuccess(false);
    setResult(null);
  }, []);

  // Open dialog
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close dialog with delayed reset
  const close = useCallback(() => {
    setIsOpen(false);
    // Reset form after animation completes
    setTimeout(reset, resetDelay);
  }, [reset, resetDelay]);

  // Handle open state changes
  const handleSetOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setIsOpen(true);
      } else {
        close();
      }
    },
    [close]
  );

  // Update a single field
  const setField = useCallback(<K extends keyof TFormData>(key: K, value: TFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const submitResult = await onSubmit(formData);
      setIsSuccess(true);
      setResult(submitResult);
      onSuccess?.(submitResult);

      if (closeOnSuccess) {
        close();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, onSuccess, closeOnSuccess, close]);

  return {
    isOpen,
    open,
    close,
    setOpen: handleSetOpen,
    formData,
    setFormData,
    setField,
    isSubmitting,
    error,
    setError,
    isSuccess,
    result,
    handleSubmit,
    reset,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useDialogForm;

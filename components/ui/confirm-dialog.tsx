'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description */
  description: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Callback when confirmed */
  onConfirm: () => void | Promise<void>;
  /** Whether the action is destructive (shows red button) */
  destructive?: boolean;
  /** Whether the confirm action is loading */
  isLoading?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Reusable confirmation dialog for destructive actions.
 *
 * Features:
 * - Consistent styling for delete/confirm dialogs
 * - Loading state support
 * - Destructive variant with red styling
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  destructive = true,
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              destructive &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )}
          >
            {isLoading && <ButtonSpinner />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// =============================================================================
// SPECIALIZED DIALOGS
// =============================================================================

export interface DeleteConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** What is being deleted (e.g., "API Key", "Webhook") */
  itemName: string;
  /** Additional description/warning */
  description?: string;
  /** Callback when delete is confirmed */
  onConfirm: () => void | Promise<void>;
  /** Whether the delete action is loading */
  isLoading?: boolean;
}

/**
 * Pre-configured delete confirmation dialog.
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  description,
  onConfirm,
  isLoading = false,
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${itemName}`}
      description={description || `Are you sure you want to delete this ${itemName.toLowerCase()}? This action cannot be undone.`}
      confirmText="Delete"
      onConfirm={onConfirm}
      destructive
      isLoading={isLoading}
    />
  );
}

export default ConfirmDialog;

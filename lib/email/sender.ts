/**
 * Email Sender Wrapper
 * Centralized email sending with consistent error handling and logging
 */

import { resend } from './resend';
import { createLogger } from '@/lib/logger';
import type { CreateEmailOptions } from 'resend';

const log = createLogger('Email');

// =============================================================================
// TYPES
// =============================================================================

export interface EmailResult {
  success: boolean;
  error?: string;
}

export interface BulkEmailResult {
  success: boolean;
  sent: number;
  errors: string[];
}

export interface EmailContext {
  type: string;
  recipient: string;
}

// =============================================================================
// SINGLE EMAIL
// =============================================================================

/**
 * Send a single email with standardized error handling
 * Returns success: true even when Resend is not configured (non-blocking)
 */
export async function sendEmail(
  options: CreateEmailOptions,
  context: EmailContext
): Promise<EmailResult> {
  if (!resend) {
    log.warn({ type: context.type, to: context.recipient }, 'Resend not configured, skipping email');
    return { success: true }; // Non-blocking - don't fail the operation
  }

  try {
    const { error } = await resend.emails.send(options);

    if (error) {
      log.error(
        { err: error, type: context.type, to: context.recipient },
        'Failed to send email'
      );
      return { success: false, error: error.message };
    }

    log.info({ type: context.type, to: context.recipient }, 'Email sent successfully');
    return { success: true };
  } catch (err) {
    log.error(
      { err, type: context.type, to: context.recipient },
      'Error sending email'
    );
    return { success: false, error: 'Failed to send email' };
  }
}

// =============================================================================
// BULK EMAIL
// =============================================================================

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Check if email sending is available
 */
export function isEmailConfigured(): boolean {
  return resend !== null;
}

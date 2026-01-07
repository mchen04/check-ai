import { Resend } from 'resend';
import { createLogger } from '@/lib/logger';

const log = createLogger('Email');

if (!process.env.RESEND_API_KEY) {
  log.warn('RESEND_API_KEY not set - emails will not be sent');
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Email Styles
 * Shared styles for all email templates
 *
 * This is the single source of truth for email styling.
 * All templates should import styles from here for consistency.
 */

import { CSSProperties } from 'react';

// =============================================================================
// Layout Styles
// =============================================================================

export const emailStyles = {
  /**
   * Main body wrapper
   */
  main: {
    backgroundColor: '#f6f9fc',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  } as CSSProperties,

  /**
   * Centered content container
   */
  container: {
    margin: '0 auto',
    padding: '40px 20px',
    maxWidth: '560px',
  } as CSSProperties,

  // ===========================================================================
  // Typography
  // ===========================================================================

  /**
   * Primary heading (h1)
   */
  h1: {
    color: '#1f2937',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '32px',
    margin: '0 0 24px',
  } as CSSProperties,

  /**
   * Secondary heading (h2)
   */
  h2: {
    color: '#1f2937',
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '28px',
    margin: '32px 0 16px',
  } as CSSProperties,

  /**
   * Body text
   */
  text: {
    color: '#4b5563',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
  } as CSSProperties,

  /**
   * Section title (uppercase label)
   */
  sectionTitle: {
    color: '#1f2937',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '20px',
    margin: '24px 0 8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as CSSProperties,

  /**
   * Footer text (small, muted)
   */
  footerText: {
    color: '#9ca3af',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '0 0 8px',
  } as CSSProperties,

  /**
   * Link style
   */
  link: {
    color: '#6b7280',
    textDecoration: 'underline',
  } as CSSProperties,

  // ===========================================================================
  // Buttons
  // ===========================================================================

  /**
   * Primary button
   */
  button: {
    backgroundColor: '#000000',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    display: 'inline-block',
  } as CSSProperties,

  /**
   * Secondary button (outlined)
   */
  secondaryButton: {
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    display: 'inline-block',
    border: '1px solid #e5e7eb',
  } as CSSProperties,

  /**
   * Button container (centered)
   */
  buttonContainer: {
    textAlign: 'center' as const,
    margin: '32px 0',
  } as CSSProperties,

  // ===========================================================================
  // Dividers
  // ===========================================================================

  /**
   * Horizontal rule
   */
  hr: {
    borderColor: '#e5e7eb',
    margin: '32px 0',
  } as CSSProperties,

  // ===========================================================================
  // Cards & Boxes
  // ===========================================================================

  /**
   * Generic card/box
   */
  box: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    margin: '16px 0',
  } as CSSProperties,

  /**
   * Content box (for displaying code/content)
   */
  contentBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    margin: '8px 0',
  } as CSSProperties,

  /**
   * Content text (monospace)
   */
  contentText: {
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '0',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  } as CSSProperties,

  // ===========================================================================
  // Labels & Values
  // ===========================================================================

  /**
   * Small label (uppercase)
   */
  label: {
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: '500',
    lineHeight: '16px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as CSSProperties,

  /**
   * Value text (bold)
   */
  value: {
    color: '#1f2937',
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '24px',
    margin: '0 0 16px',
  } as CSSProperties,

  // ===========================================================================
  // Metrics Grid (for reports)
  // ===========================================================================

  /**
   * Metrics grid container
   */
  metricsGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    margin: '16px 0',
  } as CSSProperties,

  /**
   * Individual metric box
   */
  metricBox: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    flex: '1 1 45%',
    minWidth: '120px',
    textAlign: 'center' as const,
  } as CSSProperties,

  /**
   * Metric value (large number)
   */
  metricValue: {
    color: '#1f2937',
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '32px',
    margin: '0',
  } as CSSProperties,

  /**
   * Metric label
   */
  metricLabel: {
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: '500',
    lineHeight: '16px',
    margin: '4px 0 0',
    textTransform: 'uppercase' as const,
  } as CSSProperties,

  // ===========================================================================
  // Stats Box (for reports)
  // ===========================================================================

  /**
   * Stats box container
   */
  statsBox: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    margin: '8px 0',
  } as CSSProperties,

  /**
   * Stat row (flexbox)
   */
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  } as CSSProperties,

  /**
   * Stat label
   */
  statLabel: {
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '0',
  } as CSSProperties,

  /**
   * Stat value
   */
  statValue: {
    color: '#1f2937',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '20px',
    margin: '0',
  } as CSSProperties,

  // ===========================================================================
  // Highlights (success/info boxes)
  // ===========================================================================

  /**
   * Highlights box (green)
   */
  highlightsBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
    padding: '16px',
    margin: '8px 0',
  } as CSSProperties,

  /**
   * Highlight item text
   */
  highlightItem: {
    color: '#166534',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '4px 0',
  } as CSSProperties,

  // ===========================================================================
  // List Items
  // ===========================================================================

  /**
   * List item text
   */
  listItem: {
    color: '#4b5563',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0 0 12px',
    paddingLeft: '8px',
  } as CSSProperties,
} as const;

// =============================================================================
// Type Export
// =============================================================================

export type EmailStyles = typeof emailStyles;
export type EmailStyleKey = keyof EmailStyles;

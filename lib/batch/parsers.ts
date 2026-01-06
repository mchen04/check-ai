/**
 * Batch File Parsers
 * Parse CSV and JSON files for batch processing
 */

import type { ParsedBatchItem, ParseResult, BatchValidationError, BATCH_CONSTANTS } from './types';

// =============================================================================
// Constants
// =============================================================================

const MAX_CONTENT_LENGTH = 50000;
const MAX_ITEMS = 100;

// =============================================================================
// CSV Parser
// =============================================================================

/**
 * Parse a CSV string into batch items
 * Expected columns:
 * - content (required): The content to verify
 * - context.* (optional): Context fields (e.g., context.source, context.category)
 * - idempotencyKey (optional): Unique key for deduplication
 */
export function parseCSV(csvContent: string): ParseResult {
  const items: ParsedBatchItem[] = [];
  const errors: BatchValidationError[] = [];

  // Split into lines, handling both \n and \r\n
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    errors.push({ row: 0, error: 'CSV file is empty' });
    return { items, errors };
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase());

  // Find content column (required)
  const contentIndex = headers.findIndex((h) => h === 'content');
  if (contentIndex === -1) {
    errors.push({ row: 1, error: 'Missing required column: content' });
    return { items, errors };
  }

  // Find idempotencyKey column (optional)
  const idempotencyKeyIndex = headers.findIndex(
    (h) => h === 'idempotencykey' || h === 'idempotency_key'
  );

  // Find context columns (optional, prefixed with "context.")
  const contextColumns: { index: number; key: string }[] = [];
  headers.forEach((header, index) => {
    if (header.startsWith('context.')) {
      const key = header.slice(8); // Remove "context." prefix
      if (key.length > 0) {
        contextColumns.push({ index, key });
      }
    }
  });

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1; // 1-indexed for user display

    // Check item limit
    if (items.length >= MAX_ITEMS) {
      errors.push({
        row: rowNumber,
        error: `Maximum ${MAX_ITEMS} items allowed. Remaining rows ignored.`,
      });
      break;
    }

    const line = lines[i];
    const values = parseCSVLine(line);

    // Get content
    const content = values[contentIndex]?.trim() || '';

    if (!content) {
      errors.push({ row: rowNumber, error: 'Content is required' });
      continue;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      errors.push({
        row: rowNumber,
        error: `Content exceeds maximum length (${MAX_CONTENT_LENGTH} chars)`,
      });
      continue;
    }

    // Get idempotency key
    const idempotencyKey = idempotencyKeyIndex >= 0 ? values[idempotencyKeyIndex]?.trim() : undefined;

    // Build context object
    let context: Record<string, unknown> | undefined;
    if (contextColumns.length > 0) {
      context = {};
      for (const col of contextColumns) {
        const value = values[col.index]?.trim();
        if (value) {
          context[col.key] = value;
        }
      }
      // Only include context if it has values
      if (Object.keys(context).length === 0) {
        context = undefined;
      }
    }

    items.push({
      content,
      context,
      idempotencyKey: idempotencyKey || undefined,
      rowNumber,
    });
  }

  return { items, errors };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // End of quoted value
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        // Start of quoted value
        inQuotes = true;
        i++;
      } else if (char === ',') {
        // End of field
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  // Don't forget the last field
  result.push(current);

  return result;
}

// =============================================================================
// JSON Parser
// =============================================================================

/**
 * Parse a JSON array into batch items
 * Expected format: Array of objects with:
 * - content (required): The content to verify
 * - context (optional): Context object
 * - idempotencyKey (optional): Unique key for deduplication
 */
export function parseJSON(jsonContent: string): ParseResult {
  const items: ParsedBatchItem[] = [];
  const errors: BatchValidationError[] = [];

  let data: unknown;
  try {
    data = JSON.parse(jsonContent);
  } catch (e) {
    errors.push({ row: 0, error: 'Invalid JSON format' });
    return { items, errors };
  }

  // Handle both array and object with items array
  let itemsArray: unknown[];
  if (Array.isArray(data)) {
    itemsArray = data;
  } else if (typeof data === 'object' && data !== null && 'items' in data && Array.isArray((data as Record<string, unknown>).items)) {
    itemsArray = (data as Record<string, unknown>).items as unknown[];
  } else {
    errors.push({
      row: 0,
      error: 'JSON must be an array of items or an object with an "items" array',
    });
    return { items, errors };
  }

  if (itemsArray.length === 0) {
    errors.push({ row: 0, error: 'Items array is empty' });
    return { items, errors };
  }

  if (itemsArray.length > MAX_ITEMS) {
    errors.push({
      row: 0,
      error: `Maximum ${MAX_ITEMS} items allowed. Received ${itemsArray.length} items.`,
    });
    // Continue parsing up to limit
    itemsArray = itemsArray.slice(0, MAX_ITEMS);
  }

  for (let i = 0; i < itemsArray.length; i++) {
    const rowNumber = i + 1;
    const item = itemsArray[i];

    if (typeof item !== 'object' || item === null) {
      errors.push({ row: rowNumber, error: 'Item must be an object' });
      continue;
    }

    const itemObj = item as Record<string, unknown>;

    // Get content
    const content = typeof itemObj.content === 'string' ? itemObj.content.trim() : '';

    if (!content) {
      errors.push({ row: rowNumber, error: 'Content is required' });
      continue;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      errors.push({
        row: rowNumber,
        error: `Content exceeds maximum length (${MAX_CONTENT_LENGTH} chars)`,
      });
      continue;
    }

    // Get idempotency key
    const idempotencyKey =
      typeof itemObj.idempotencyKey === 'string' ? itemObj.idempotencyKey.trim() : undefined;

    // Get context
    let context: Record<string, unknown> | undefined;
    if (
      typeof itemObj.context === 'object' &&
      itemObj.context !== null &&
      !Array.isArray(itemObj.context)
    ) {
      context = itemObj.context as Record<string, unknown>;
    }

    items.push({
      content,
      context,
      idempotencyKey: idempotencyKey || undefined,
      rowNumber,
    });
  }

  return { items, errors };
}

// =============================================================================
// File Detection
// =============================================================================

/**
 * Detect file format from content
 */
export function detectFormat(content: string): 'json' | 'csv' | 'unknown' {
  const trimmed = content.trim();

  // JSON starts with [ or {
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON
    }
  }

  // Check if it looks like CSV (has commas and multiple lines)
  if (trimmed.includes(',') && trimmed.includes('\n')) {
    return 'csv';
  }

  return 'unknown';
}

/**
 * Parse file content based on format
 */
export function parseFile(
  content: string,
  format?: 'json' | 'csv'
): ParseResult & { format: 'json' | 'csv' } {
  const detectedFormat = format || detectFormat(content);

  if (detectedFormat === 'unknown') {
    return {
      items: [],
      errors: [{ row: 0, error: 'Unable to detect file format. Use CSV or JSON.' }],
      format: 'csv', // Default
    };
  }

  const result = detectedFormat === 'json' ? parseJSON(content) : parseCSV(content);
  return { ...result, format: detectedFormat };
}

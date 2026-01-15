/**
 * Tests for API Response Formatters
 * Tests for date formatting, numeric parsing, and entity formatters
 */

import { describe, it, expect } from 'vitest';
import {
  formatDateToISO,
  formatRequiredDateToISO,
  formatDateForFilename,
  isDateExpired,
  parseDecimal,
  parseDecimalWithDefault,
  parseInteger,
  truncateString,
  nullCoalesce,
  formatVerificationForResponse,
  formatParadigmResultForResponse,
  formatParadigmResultExtendedForResponse,
} from './formatters';

// =============================================================================
// DATE FORMATTING TESTS
// =============================================================================

describe('formatDateToISO', () => {
  it('should format Date to ISO string', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    expect(formatDateToISO(date)).toBe('2024-01-15T10:30:00.000Z');
  });

  it('should return null for null input', () => {
    expect(formatDateToISO(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(formatDateToISO(undefined)).toBeNull();
  });
});

describe('formatRequiredDateToISO', () => {
  it('should format Date to ISO string', () => {
    const date = new Date('2024-03-20T15:45:00.000Z');
    expect(formatRequiredDateToISO(date)).toBe('2024-03-20T15:45:00.000Z');
  });
});

describe('formatDateForFilename', () => {
  it('should format date as YYYY-MM-DD', () => {
    const date = new Date('2024-06-15T12:00:00.000Z');
    expect(formatDateForFilename(date)).toBe('2024-06-15');
  });

  it('should use current date if not provided', () => {
    const result = formatDateForFilename();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('isDateExpired', () => {
  it('should return true for past date', () => {
    const pastDate = new Date('2020-01-01');
    expect(isDateExpired(pastDate)).toBe(true);
  });

  it('should return false for future date', () => {
    const futureDate = new Date('2099-01-01');
    expect(isDateExpired(futureDate)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isDateExpired(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isDateExpired(undefined)).toBe(false);
  });
});

// =============================================================================
// NUMERIC PARSING TESTS
// =============================================================================

describe('parseDecimal', () => {
  it('should parse decimal string to number', () => {
    expect(parseDecimal('0.9500')).toBe(0.95);
  });

  it('should parse integer string', () => {
    expect(parseDecimal('42')).toBe(42);
  });

  it('should return null for null input', () => {
    expect(parseDecimal(null)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseDecimal('')).toBeNull();
  });

  it('should return null for invalid number', () => {
    expect(parseDecimal('not-a-number')).toBeNull();
  });
});

describe('parseDecimalWithDefault', () => {
  it('should parse valid decimal', () => {
    expect(parseDecimalWithDefault('0.75', 0.5)).toBe(0.75);
  });

  it('should return default for null', () => {
    expect(parseDecimalWithDefault(null, 0.5)).toBe(0.5);
  });

  it('should return default for invalid input', () => {
    expect(parseDecimalWithDefault('invalid', 0.5)).toBe(0.5);
  });
});

describe('parseInteger', () => {
  it('should parse integer string', () => {
    expect(parseInteger('42')).toBe(42);
  });

  it('should parse string with decimal (truncates)', () => {
    expect(parseInteger('42.9')).toBe(42);
  });

  it('should return null for null input', () => {
    expect(parseInteger(null)).toBeNull();
  });

  it('should return null for invalid input', () => {
    expect(parseInteger('invalid')).toBeNull();
  });
});

// =============================================================================
// STRING UTILITY TESTS
// =============================================================================

describe('truncateString', () => {
  it('should truncate long string', () => {
    expect(truncateString('Hello World', 5)).toBe('Hello');
  });

  it('should not truncate short string', () => {
    expect(truncateString('Hi', 10)).toBe('Hi');
  });

  it('should add ellipsis when requested', () => {
    expect(truncateString('Hello World', 5, true)).toBe('Hello...');
  });

  it('should return empty string for null', () => {
    expect(truncateString(null, 5)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(truncateString(undefined, 5)).toBe('');
  });
});

describe('nullCoalesce', () => {
  it('should return value if not null/undefined', () => {
    expect(nullCoalesce('test')).toBe('test');
    expect(nullCoalesce(0)).toBe(0);
    expect(nullCoalesce(false)).toBe(false);
  });

  it('should return null for null', () => {
    expect(nullCoalesce(null)).toBeNull();
  });

  it('should return null for undefined', () => {
    expect(nullCoalesce(undefined)).toBeNull();
  });
});

// =============================================================================
// ENTITY FORMATTER TESTS
// =============================================================================

describe('formatVerificationForResponse', () => {
  it('should format verification record correctly', () => {
    const record = {
      id: 'ver_123',
      content: 'Test content',
      status: 'completed',
      verdict: 'true',
      confidence: '0.9500',
      processingTimeMs: 150,
      costCents: 5,
      createdAt: new Date('2024-01-15T10:00:00.000Z'),
      completedAt: new Date('2024-01-15T10:00:01.000Z'),
    };

    const result = formatVerificationForResponse(record);

    expect(result.id).toBe('ver_123');
    expect(result.content).toBe('Test content');
    expect(result.status).toBe('completed');
    expect(result.verdict).toBe('true');
    expect(result.confidence).toBe(0.95);
    expect(result.processingTimeMs).toBe(150);
    expect(result.costCents).toBe(5);
    expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z');
    expect(result.completedAt).toBe('2024-01-15T10:00:01.000Z');
  });

  it('should handle null values', () => {
    const record = {
      id: 'ver_456',
      content: 'Test',
      status: 'pending',
      verdict: null,
      confidence: null,
      processingTimeMs: null,
      costCents: null,
      createdAt: new Date('2024-01-15T10:00:00.000Z'),
      completedAt: null,
    };

    const result = formatVerificationForResponse(record);

    expect(result.verdict).toBeNull();
    expect(result.confidence).toBeNull();
    expect(result.processingTimeMs).toBeNull();
    expect(result.costCents).toBeNull();
    expect(result.completedAt).toBeNull();
  });
});

describe('formatParadigmResultForResponse', () => {
  it('should format paradigm result correctly', () => {
    const record = {
      paradigmType: 'reasoning',
      provider: 'openai',
      model: 'gpt-4',
      verdict: 'true',
      confidence: '0.8500',
      reasoning: 'The statement is accurate',
      processingTimeMs: 200,
      errorMessage: null,
      createdAt: new Date('2024-01-15T10:00:00.000Z'),
    };

    const result = formatParadigmResultForResponse(record);

    expect(result.paradigm).toBe('reasoning');
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4');
    expect(result.verdict).toBe('true');
    expect(result.confidence).toBe(0.85);
    expect(result.reasoning).toBe('The statement is accurate');
    expect(result.processingTimeMs).toBe(200);
    expect(result.error).toBeNull();
  });

  it('should handle error case', () => {
    const record = {
      paradigmType: 'tool',
      provider: null,
      model: null,
      verdict: null,
      confidence: null,
      reasoning: null,
      processingTimeMs: null,
      errorMessage: 'API timeout',
      createdAt: new Date('2024-01-15T10:00:00.000Z'),
    };

    const result = formatParadigmResultForResponse(record);

    expect(result.paradigm).toBe('tool');
    expect(result.error).toBe('API timeout');
    expect(result.confidence).toBeNull();
  });
});

describe('formatParadigmResultExtendedForResponse', () => {
  it('should format extended paradigm result with id and weight', () => {
    const record = {
      id: 'pr_123',
      paradigmType: 'ensemble',
      weight: '0.2500',
      provider: 'anthropic',
      model: 'claude-3',
      verdict: 'false',
      confidence: '0.9000',
      reasoning: 'Multiple sources disagree',
      processingTimeMs: 350,
      errorMessage: null,
    };

    const result = formatParadigmResultExtendedForResponse(record);

    expect(result.id).toBe('pr_123');
    expect(result.paradigm).toBe('ensemble');
    expect(result.weight).toBe(0.25);
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-3');
    expect(result.confidence).toBe(0.9);
  });

  it('should handle null weight', () => {
    const record = {
      id: 'pr_456',
      paradigmType: 'semantic',
      weight: null,
      provider: null,
      model: null,
      verdict: null,
      confidence: null,
      reasoning: null,
      processingTimeMs: null,
      errorMessage: null,
    };

    const result = formatParadigmResultExtendedForResponse(record);

    expect(result.id).toBe('pr_456');
    expect(result.weight).toBeNull();
  });
});

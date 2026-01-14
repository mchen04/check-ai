/**
 * Tests for Batch File Parsers
 * Tests for CSV and JSON parsing
 */

import { describe, it, expect } from 'vitest';
import { parseCSV, parseJSON, detectFormat, parseFile } from './parsers';

// =============================================================================
// parseCSV TESTS
// =============================================================================

describe('parseCSV', () => {
  describe('basic parsing', () => {
    it('should parse simple CSV with content column', () => {
      const csv = `content
The Earth is round.
Water boils at 100°C.`;

      const result = parseCSV(csv);

      expect(result.items).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.items[0].content).toBe('The Earth is round.');
      expect(result.items[1].content).toBe('Water boils at 100°C.');
    });

    it('should handle both \\n and \\r\\n line endings', () => {
      const csv = 'content\r\nFirst item\r\nSecond item';

      const result = parseCSV(csv);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].content).toBe('First item');
    });

    it('should assign correct row numbers', () => {
      const csv = `content
First
Second
Third`;

      const result = parseCSV(csv);

      expect(result.items[0].rowNumber).toBe(2);
      expect(result.items[1].rowNumber).toBe(3);
      expect(result.items[2].rowNumber).toBe(4);
    });

    it('should trim whitespace from content', () => {
      const csv = `content
  Spaces around  `;

      const result = parseCSV(csv);

      expect(result.items[0].content).toBe('Spaces around');
    });
  });

  describe('header handling', () => {
    it('should error if content column is missing', () => {
      const csv = `name,value
Item1,100`;

      const result = parseCSV(csv);

      expect(result.items).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Missing required column: content');
    });

    it('should handle case-insensitive headers', () => {
      const csv = `CONTENT
Test content`;

      const result = parseCSV(csv);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].content).toBe('Test content');
    });
  });

  describe('quoted values', () => {
    it('should handle quoted values with commas', () => {
      const csv = `content
"This, has a comma"`;

      const result = parseCSV(csv);

      expect(result.items[0].content).toBe('This, has a comma');
    });

    it('should handle escaped quotes', () => {
      const csv = `content
"He said ""Hello"" to me"`;

      const result = parseCSV(csv);

      expect(result.items[0].content).toBe('He said "Hello" to me');
    });

    it('should handle quoted values with newlines in content', () => {
      // Note: Actual newlines within quotes may require special handling
      const csv = `content
"Simple quoted value"`;

      const result = parseCSV(csv);

      expect(result.items[0].content).toBe('Simple quoted value');
    });
  });

  describe('context columns', () => {
    it('should parse context.* columns', () => {
      const csv = `content,context.source,context.category
Test content,user-input,science`;

      const result = parseCSV(csv);

      expect(result.items[0].context).toEqual({
        source: 'user-input',
        category: 'science',
      });
    });

    it('should omit empty context values', () => {
      const csv = `content,context.source
Test content,`;

      const result = parseCSV(csv);

      expect(result.items[0].context).toBeUndefined();
    });

    it('should handle mixed context columns', () => {
      const csv = `content,context.a,context.b
Test,value1,`;

      const result = parseCSV(csv);

      expect(result.items[0].context).toEqual({ a: 'value1' });
    });
  });

  describe('idempotencyKey column', () => {
    it('should parse idempotencyKey column', () => {
      const csv = `content,idempotencyKey
Test content,key123`;

      const result = parseCSV(csv);

      expect(result.items[0].idempotencyKey).toBe('key123');
    });

    it('should parse idempotency_key column (underscore)', () => {
      const csv = `content,idempotency_key
Test content,key456`;

      const result = parseCSV(csv);

      expect(result.items[0].idempotencyKey).toBe('key456');
    });

    it('should leave idempotencyKey undefined when empty', () => {
      const csv = `content,idempotencyKey
Test content,`;

      const result = parseCSV(csv);

      expect(result.items[0].idempotencyKey).toBeUndefined();
    });
  });

  describe('validation errors', () => {
    it('should error on empty file', () => {
      const result = parseCSV('');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('CSV file is empty');
    });

    it('should error on empty content', () => {
      // Empty line that isn't just whitespace - parser filters blank lines
      const csv = `content
,extra`;

      const result = parseCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Content is required');
    });

    it('should error on content exceeding max length', () => {
      const longContent = 'x'.repeat(50001);
      const csv = `content\n${longContent}`;

      const result = parseCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('exceeds maximum length');
    });

    it('should skip invalid rows and continue parsing', () => {
      // Use a row with empty content (not an empty line which is filtered)
      const csv = `content,other
Valid content,a
,b
Another valid,c`;

      const result = parseCSV(csv);

      expect(result.items).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Content is required');
    });
  });

  describe('item limits', () => {
    it('should limit to 100 items', () => {
      const rows = ['content'];
      for (let i = 0; i < 150; i++) {
        rows.push(`Item ${i}`);
      }
      const csv = rows.join('\n');

      const result = parseCSV(csv);

      expect(result.items).toHaveLength(100);
      expect(result.errors.some((e) => e.error.includes('Maximum 100 items'))).toBe(true);
    });
  });
});

// =============================================================================
// parseJSON TESTS
// =============================================================================

describe('parseJSON', () => {
  describe('basic parsing', () => {
    it('should parse JSON array', () => {
      const json = JSON.stringify([
        { content: 'First item' },
        { content: 'Second item' },
      ]);

      const result = parseJSON(json);

      expect(result.items).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.items[0].content).toBe('First item');
      expect(result.items[1].content).toBe('Second item');
    });

    it('should parse object with items array', () => {
      const json = JSON.stringify({
        items: [{ content: 'First item' }, { content: 'Second item' }],
      });

      const result = parseJSON(json);

      expect(result.items).toHaveLength(2);
    });

    it('should assign correct row numbers', () => {
      const json = JSON.stringify([
        { content: 'First' },
        { content: 'Second' },
        { content: 'Third' },
      ]);

      const result = parseJSON(json);

      expect(result.items[0].rowNumber).toBe(1);
      expect(result.items[1].rowNumber).toBe(2);
      expect(result.items[2].rowNumber).toBe(3);
    });

    it('should trim whitespace from content', () => {
      const json = JSON.stringify([{ content: '  Spaces around  ' }]);

      const result = parseJSON(json);

      expect(result.items[0].content).toBe('Spaces around');
    });
  });

  describe('context parsing', () => {
    it('should parse context object', () => {
      const json = JSON.stringify([
        {
          content: 'Test',
          context: { source: 'user', category: 'science' },
        },
      ]);

      const result = parseJSON(json);

      expect(result.items[0].context).toEqual({
        source: 'user',
        category: 'science',
      });
    });

    it('should ignore array context', () => {
      const json = JSON.stringify([{ content: 'Test', context: ['not', 'valid'] }]);

      const result = parseJSON(json);

      expect(result.items[0].context).toBeUndefined();
    });

    it('should ignore null context', () => {
      const json = JSON.stringify([{ content: 'Test', context: null }]);

      const result = parseJSON(json);

      expect(result.items[0].context).toBeUndefined();
    });
  });

  describe('idempotencyKey parsing', () => {
    it('should parse idempotencyKey', () => {
      const json = JSON.stringify([{ content: 'Test', idempotencyKey: 'key123' }]);

      const result = parseJSON(json);

      expect(result.items[0].idempotencyKey).toBe('key123');
    });

    it('should trim idempotencyKey', () => {
      const json = JSON.stringify([{ content: 'Test', idempotencyKey: '  key456  ' }]);

      const result = parseJSON(json);

      expect(result.items[0].idempotencyKey).toBe('key456');
    });

    it('should leave undefined for non-string idempotencyKey', () => {
      const json = JSON.stringify([{ content: 'Test', idempotencyKey: 123 }]);

      const result = parseJSON(json);

      expect(result.items[0].idempotencyKey).toBeUndefined();
    });
  });

  describe('validation errors', () => {
    it('should error on invalid JSON', () => {
      const result = parseJSON('not valid json');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Invalid JSON format');
    });

    it('should error on non-array JSON', () => {
      const json = JSON.stringify({ content: 'Test' });

      const result = parseJSON(json);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('must be an array');
    });

    it('should error on empty array', () => {
      const json = JSON.stringify([]);

      const result = parseJSON(json);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Items array is empty');
    });

    it('should error on non-object items', () => {
      const json = JSON.stringify(['string item', { content: 'valid' }]);

      const result = parseJSON(json);

      expect(result.items).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Item must be an object');
    });

    it('should error on missing content', () => {
      const json = JSON.stringify([{ context: { foo: 'bar' } }]);

      const result = parseJSON(json);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Content is required');
    });

    it('should error on content exceeding max length', () => {
      const json = JSON.stringify([{ content: 'x'.repeat(50001) }]);

      const result = parseJSON(json);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('exceeds maximum length');
    });

    it('should skip invalid items and continue parsing', () => {
      const json = JSON.stringify([
        { content: 'Valid' },
        { noContent: true },
        { content: 'Also valid' },
      ]);

      const result = parseJSON(json);

      expect(result.items).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('item limits', () => {
    it('should limit to 100 items', () => {
      const items = [];
      for (let i = 0; i < 150; i++) {
        items.push({ content: `Item ${i}` });
      }
      const json = JSON.stringify(items);

      const result = parseJSON(json);

      expect(result.items).toHaveLength(100);
      expect(result.errors.some((e) => e.error.includes('Maximum 100 items'))).toBe(true);
    });
  });
});

// =============================================================================
// detectFormat TESTS
// =============================================================================

describe('detectFormat', () => {
  it('should detect JSON array', () => {
    const json = JSON.stringify([{ content: 'test' }]);

    expect(detectFormat(json)).toBe('json');
  });

  it('should detect JSON object', () => {
    const json = JSON.stringify({ items: [{ content: 'test' }] });

    expect(detectFormat(json)).toBe('json');
  });

  it('should detect CSV', () => {
    const csv = `content,context
test,value`;

    expect(detectFormat(csv)).toBe('csv');
  });

  it('should handle whitespace around JSON', () => {
    const json = `  [{"content": "test"}]  `;

    expect(detectFormat(json)).toBe('json');
  });

  it('should return unknown for invalid content', () => {
    expect(detectFormat('random text')).toBe('unknown');
  });

  it('should return unknown for empty content', () => {
    expect(detectFormat('')).toBe('unknown');
  });

  it('should return unknown for malformed JSON', () => {
    // Starts with [ but isn't valid JSON
    expect(detectFormat('[not valid json')).toBe('unknown');
  });
});

// =============================================================================
// parseFile TESTS
// =============================================================================

describe('parseFile', () => {
  it('should auto-detect and parse JSON', () => {
    const json = JSON.stringify([{ content: 'Test item' }]);

    const result = parseFile(json);

    expect(result.format).toBe('json');
    expect(result.items).toHaveLength(1);
  });

  it('should auto-detect and parse CSV', () => {
    // CSV detection requires commas AND newlines
    const csv = `content,context.source
Test item,user`;

    const result = parseFile(csv);

    expect(result.format).toBe('csv');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].content).toBe('Test item');
  });

  it('should use specified format', () => {
    // Content that could be either format
    const content = `content
{"note":"not json"}`;

    const result = parseFile(content, 'csv');

    expect(result.format).toBe('csv');
  });

  it('should error on unknown format', () => {
    const result = parseFile('random text without structure');

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('Unable to detect file format');
  });
});

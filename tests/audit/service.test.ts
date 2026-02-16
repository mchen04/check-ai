/**
 * Audit Service Tests
 * Tests audit log creation, querying, metadata extraction, and context logger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// Mocks
// =============================================================================

const mockInsertValues = vi.fn();
const mockInsertChain = {
  values: (...args: unknown[]) => {
    mockInsertValues(...args);
    return mockInsertChain;
  },
  then: (resolve: (v: unknown) => unknown) => Promise.resolve(undefined).then(resolve),
};
const mockInsert = vi.fn().mockReturnValue(mockInsertChain);

const mockSelectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  then: undefined as unknown,
};
const mockSelect = vi.fn().mockReturnValue(mockSelectChain);

vi.mock('@/utils/db/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock('@/utils/db/schema', () => ({
  auditLogsTable: {
    id: 'id',
    orgId: 'orgId',
    userId: 'userId',
    eventType: 'eventType',
    description: 'description',
    resourceType: 'resourceType',
    resourceId: 'resourceId',
    changes: 'changes',
    metadata: 'metadata',
    createdAt: 'createdAt',
  },
  usersTable: {
    id: 'id',
    name: 'name',
    email: 'email',
  },
}));

const {
  createAuditLog,
  logAuditEvent,
  queryAuditLogs,
  extractRequestMetadata,
  createAuditLogger,
} = await import('@/lib/audit/service');

// =============================================================================
// createAuditLog
// =============================================================================

describe('createAuditLog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts with all fields', async () => {
    await createAuditLog({
      orgId: 'org_1',
      userId: 'user_1',
      eventType: 'api_key.created',
      description: 'API key created',
      resourceType: 'api_key',
      resourceId: 'key_1',
      changes: { name: { from: null, to: 'New Key' } },
      metadata: { ipAddress: '127.0.0.1', userAgent: 'test' },
    });

    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org_1',
        userId: 'user_1',
        eventType: 'api_key.created',
        description: 'API key created',
        resourceType: 'api_key',
        resourceId: 'key_1',
      })
    );
  });

  it('handles null optionals', async () => {
    await createAuditLog({
      orgId: 'org_1',
      eventType: 'api_key.created',
      description: 'API key created',
      resourceType: 'api_key',
    });

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        resourceId: null,
        changes: null,
        metadata: null,
      })
    );
  });

  it('does not throw on DB error', async () => {
    // Make the db.insert().values() chain reject
    const rejectingChain = {
      values: vi.fn().mockReturnValue({
        then: (resolve: unknown, reject?: (e: unknown) => unknown) => {
          if (reject) return reject(new Error('DB error'));
          return Promise.reject(new Error('DB error'));
        },
      }),
    };
    mockInsert.mockReturnValueOnce(rejectingChain);

    // Should not throw — createAuditLog catches errors internally
    await createAuditLog({
      orgId: 'org_1',
      eventType: 'api_key.created',
      description: 'test',
      resourceType: 'api_key',
    });
  });
});

// =============================================================================
// logAuditEvent
// =============================================================================

describe('logAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(undefined).then(resolve);
  });

  it('is non-blocking (fire and forget)', () => {
    // logAuditEvent returns void, not a promise
    const result = logAuditEvent({
      orgId: 'org_1',
      eventType: 'api_key.created',
      description: 'test',
      resourceType: 'api_key',
    });

    expect(result).toBeUndefined();
  });

  it('swallows errors', async () => {
    const rejectingChain = {
      values: vi.fn().mockReturnValue({
        then: (resolve: unknown, reject?: (e: unknown) => unknown) => {
          if (reject) return reject(new Error('fail'));
          return Promise.reject(new Error('fail'));
        },
      }),
    };
    mockInsert.mockReturnValueOnce(rejectingChain);

    // Should not throw
    logAuditEvent({
      orgId: 'org_1',
      eventType: 'api_key.created',
      description: 'test',
      resourceType: 'api_key',
    });

    // Wait for async to settle
    await new Promise((r) => setTimeout(r, 50));
  });

  it('calls db.insert via createAuditLog', async () => {
    logAuditEvent({
      orgId: 'org_1',
      eventType: 'api_key.created',
      description: 'test via logAuditEvent',
      resourceType: 'api_key',
    });

    // Wait for async to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org_1',
        eventType: 'api_key.created',
        description: 'test via logAuditEvent',
      })
    );
  });
});

// =============================================================================
// queryAuditLogs
// =============================================================================

describe('queryAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries with orgId filter', async () => {
    const logs = [{ id: 'log_1', eventType: 'api_key.created' }];
    let callCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) return Promise.resolve(logs).then(resolve);
      return Promise.resolve([{ count: 1 }]).then(resolve);
    };

    const result = await queryAuditLogs('org_1');

    expect(result.logs).toEqual(logs);
    expect(result.total).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it('applies pagination defaults', async () => {
    let callCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) return Promise.resolve([]).then(resolve);
      return Promise.resolve([{ count: 0 }]).then(resolve);
    };

    const result = await queryAuditLogs('org_1');
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it('applies custom pagination', async () => {
    let callCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) return Promise.resolve([]).then(resolve);
      return Promise.resolve([{ count: 0 }]).then(resolve);
    };

    const result = await queryAuditLogs('org_1', undefined, {
      limit: 10,
      offset: 20,
    });
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
  });

  it('filters by single eventType', async () => {
    let callCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) return Promise.resolve([]).then(resolve);
      return Promise.resolve([{ count: 0 }]).then(resolve);
    };

    await queryAuditLogs('org_1', { eventType: 'api_key.created' });
    expect(mockSelectChain.where).toHaveBeenCalled();
  });

  it('filters by eventType array', async () => {
    let callCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) return Promise.resolve([]).then(resolve);
      return Promise.resolve([{ count: 0 }]).then(resolve);
    };

    await queryAuditLogs('org_1', {
      eventType: ['api_key.created', 'api_key.deleted'],
    });
    expect(mockSelectChain.where).toHaveBeenCalled();
  });

  it('accepts orderBy=asc option', async () => {
    let callCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) return Promise.resolve([]).then(resolve);
      return Promise.resolve([{ count: 0 }]).then(resolve);
    };

    const result = await queryAuditLogs('org_1', undefined, { orderBy: 'asc' });
    expect(result.logs).toEqual([]);
    expect(mockSelectChain.orderBy).toHaveBeenCalled();
  });

  it('accepts orderBy=desc option', async () => {
    let callCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) return Promise.resolve([]).then(resolve);
      return Promise.resolve([{ count: 0 }]).then(resolve);
    };

    const result = await queryAuditLogs('org_1', undefined, { orderBy: 'desc' });
    expect(result.logs).toEqual([]);
    expect(mockSelectChain.orderBy).toHaveBeenCalled();
  });
});

// =============================================================================
// extractRequestMetadata
// =============================================================================

describe('extractRequestMetadata', () => {
  it('extracts x-forwarded-for first IP', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
        'user-agent': 'TestBrowser/1.0',
      },
    });

    const meta = extractRequestMetadata(req);
    expect(meta.ipAddress).toBe('1.2.3.4');
    expect(meta.userAgent).toBe('TestBrowser/1.0');
  });

  it('falls back to x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-real-ip': '10.0.0.1',
        'user-agent': 'TestBrowser/1.0',
      },
    });

    const meta = extractRequestMetadata(req);
    expect(meta.ipAddress).toBe('10.0.0.1');
  });

  it('defaults to unknown', () => {
    const req = new Request('http://localhost');

    const meta = extractRequestMetadata(req);
    expect(meta.ipAddress).toBe('unknown');
    expect(meta.userAgent).toBe('unknown');
  });

  it('trims leading/trailing whitespace from x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '  10.0.0.5 , 192.168.1.1',
      },
    });

    const meta = extractRequestMetadata(req);
    expect(meta.ipAddress).toBe('10.0.0.5');
  });

  it('falls through to x-real-ip when x-forwarded-for is empty string', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '',
        'x-real-ip': '172.16.0.1',
      },
    });

    const meta = extractRequestMetadata(req);
    // Empty x-forwarded-for split gives [''] which is truthy but empty
    // The .trim() of '' is '' which is falsy → falls through to x-real-ip
    expect(meta.ipAddress).toBe('172.16.0.1');
  });
});

// =============================================================================
// createAuditLogger
// =============================================================================

describe('createAuditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(undefined).then(resolve);
  });

  it('binds context and auto-attaches metadata', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.2.3.4',
        'user-agent': 'TestAgent/1.0',
      },
    });

    const audit = createAuditLogger({ orgId: 'org_1', userId: 'user_1' }, req);

    audit.log({
      eventType: 'api_key.created',
      description: 'Key created',
      resourceType: 'api_key',
      resourceId: 'key_1',
    });

    // Should have called insert with orgId, userId, and metadata auto-filled
    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org_1',
        userId: 'user_1',
        metadata: expect.objectContaining({
          ipAddress: '1.2.3.4',
          userAgent: 'TestAgent/1.0',
        }),
      })
    );
  });

  it('calling .log() multiple times reuses same metadata context', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '9.9.9.9',
        'user-agent': 'Persistent/2.0',
      },
    });

    const audit = createAuditLogger({ orgId: 'org_2', userId: 'user_2' }, req);

    audit.log({
      eventType: 'api_key.created',
      description: 'First event',
      resourceType: 'api_key',
    });

    audit.log({
      eventType: 'api_key.deleted',
      description: 'Second event',
      resourceType: 'api_key',
    });

    expect(mockInsert).toHaveBeenCalledTimes(2);
    // Both calls should have same orgId, userId, and metadata
    const call1 = mockInsertValues.mock.calls[0][0];
    const call2 = mockInsertValues.mock.calls[1][0];
    expect(call1.orgId).toBe('org_2');
    expect(call2.orgId).toBe('org_2');
    expect(call1.metadata.ipAddress).toBe('9.9.9.9');
    expect(call2.metadata.ipAddress).toBe('9.9.9.9');
    expect(call1.eventType).toBe('api_key.created');
    expect(call2.eventType).toBe('api_key.deleted');
  });
});


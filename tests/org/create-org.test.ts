/**
 * Organization Creation Tests
 * Tests slug generation, org name generation, and default org creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// Mocks
// =============================================================================

let mockUuid = 'abcdef-1234-5678-9abc-def012345678';
vi.mock('uuid', () => ({
  v4: () => mockUuid,
}));

const mockInsertValues = vi.fn();
const mockReturning = vi.fn();
const mockInsertChain = {
  values: (...args: unknown[]) => {
    mockInsertValues(...args);
    return mockInsertChain;
  },
  returning: (...args: unknown[]) => {
    mockReturning(...args);
    return mockInsertChain;
  },
  then: undefined as unknown,
};

const mockInsert = vi.fn().mockReturnValue(mockInsertChain);

vi.mock('@/utils/db/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

vi.mock('@/utils/db/schema', () => ({
  organizationsTable: { id: 'id', slug: 'slug' },
  orgMembersTable: {},
}));

const { createDefaultOrganization } = await import('@/lib/org/create-org');

// =============================================================================
// generateSlug (tested via createDefaultOrganization)
// =============================================================================

describe('slug generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUuid = 'abcdef-1234-5678-9abc-def012345678';
  });

  function setupMock(orgResult: { id: string; slug: string }) {
    // First insert (org) returns the org
    let insertCount = 0;
    mockInsertChain.then = (resolve: (v: unknown) => unknown) => {
      insertCount++;
      if (insertCount === 1) {
        return Promise.resolve([orgResult]).then(resolve);
      }
      return Promise.resolve([]).then(resolve);
    };
  }

  it('uses name when available', async () => {
    setupMock({ id: 'org_1', slug: 'john-doe-abcdef' });

    await createDefaultOrganization('user_1', 'John Doe', 'john@example.com');

    const orgValues = mockInsertValues.mock.calls[0][0];
    expect(orgValues.slug).toMatch(/^john-doe-abcdef$/);
  });

  it('falls back to email when name is null', async () => {
    setupMock({ id: 'org_1', slug: 'john-abcdef' });

    await createDefaultOrganization('user_1', null, 'john@example.com');

    const orgValues = mockInsertValues.mock.calls[0][0];
    expect(orgValues.slug).toContain('john');
    expect(orgValues.slug).toContain('abcdef');
  });

  it('converts to lowercase and strips special chars', async () => {
    setupMock({ id: 'org_1', slug: 'john-s-org-abcdef' });

    await createDefaultOrganization('user_1', "John's Org!", 'john@example.com');

    const orgValues = mockInsertValues.mock.calls[0][0];
    // Should be lowercase, special chars replaced with -
    expect(orgValues.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('limits slug base to 30 chars', async () => {
    setupMock({ id: 'org_1', slug: 'a-very-long-name-that-exceeds-abcdef' });

    const longName = 'A Very Long Name That Exceeds The Maximum Length Limit For Slugs';
    await createDefaultOrganization('user_1', longName, 'john@example.com');

    const orgValues = mockInsertValues.mock.calls[0][0];
    // Base is sliced to 30, plus dash and 6-char suffix
    const base = orgValues.slug.split('-').slice(0, -1).join('-');
    expect(base.length).toBeLessThanOrEqual(30);
  });

  it('adds 6-char uuid suffix', async () => {
    setupMock({ id: 'org_1', slug: 'test-abcdef' });

    await createDefaultOrganization('user_1', 'Test', 'test@example.com');

    const orgValues = mockInsertValues.mock.calls[0][0];
    expect(orgValues.slug).toMatch(/-abcdef$/);
  });
});

// =============================================================================
// generateOrgName (tested via createDefaultOrganization)
// =============================================================================

describe('org name generation', () => {
  beforeEach(() => vi.clearAllMocks());

  function setupMock() {
    let insertCount = 0;
    mockInsertChain.then = (resolve: (v: unknown) => unknown) => {
      insertCount++;
      if (insertCount === 1) {
        return Promise.resolve([{ id: 'org_1', slug: 'test-abcdef' }]).then(resolve);
      }
      return Promise.resolve([]).then(resolve);
    };
  }

  it('uses possessive form of name', async () => {
    setupMock();
    await createDefaultOrganization('user_1', 'John', 'john@example.com');

    const orgValues = mockInsertValues.mock.calls[0][0];
    expect(orgValues.name).toBe("John's Organization");
  });

  it('returns "My Organization" when name is null', async () => {
    setupMock();
    await createDefaultOrganization('user_1', null, 'john@example.com');

    const orgValues = mockInsertValues.mock.calls[0][0];
    expect(orgValues.name).toBe('My Organization');
  });
});

// =============================================================================
// createDefaultOrganization
// =============================================================================

describe('createDefaultOrganization', () => {
  beforeEach(() => vi.clearAllMocks());

  function setupMock(orgId = 'org_1') {
    let insertCount = 0;
    mockInsertChain.then = (resolve: (v: unknown) => unknown) => {
      insertCount++;
      if (insertCount === 1) {
        return Promise.resolve([{ id: orgId, slug: 'test-abcdef' }]).then(resolve);
      }
      return Promise.resolve([]).then(resolve);
    };
  }

  it('creates org with free plan and 100 limit', async () => {
    setupMock();
    await createDefaultOrganization('user_1', 'Test', 'test@example.com');

    const orgValues = mockInsertValues.mock.calls[0][0];
    expect(orgValues.planType).toBe('free');
    expect(orgValues.verificationsLimit).toBe(100);
  });

  it('adds user as owner', async () => {
    setupMock();
    await createDefaultOrganization('user_1', 'Test', 'test@example.com');

    // Second insert is the org member
    expect(mockInsert).toHaveBeenCalledTimes(2);
    const memberValues = mockInsertValues.mock.calls[1][0];
    expect(memberValues.userId).toBe('user_1');
    expect(memberValues.role).toBe('owner');
  });

  it('includes Stripe customer ID when provided', async () => {
    setupMock();
    await createDefaultOrganization('user_1', 'Test', 'test@example.com', 'cus_stripe123');

    const orgValues = mockInsertValues.mock.calls[0][0];
    expect(orgValues.stripeCustomerId).toBe('cus_stripe123');
  });

  it('sets null stripeCustomerId when not provided', async () => {
    setupMock();
    await createDefaultOrganization('user_1', 'Test', 'test@example.com');

    const orgValues = mockInsertValues.mock.calls[0][0];
    expect(orgValues.stripeCustomerId).toBeNull();
  });

  it('returns orgId and slug', async () => {
    setupMock('org_new');
    const result = await createDefaultOrganization('user_1', 'Test', 'test@example.com');

    expect(result.orgId).toBe('org_new');
    expect(result.slug).toBe('test-abcdef');
  });
});

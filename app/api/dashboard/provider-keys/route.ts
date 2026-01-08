import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { apiKeysTable } from '@/utils/db/schema';
import { eq, and, ne, desc } from 'drizzle-orm';
import { logAuditEvent, extractRequestMetadata } from '@/lib/audit';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';
import { getKeyManager } from '@/lib/llm/key-manager';
import { LLMProvider } from '@/lib/llm/types';

// Valid providers for BYOK (excludes platform keys)
// Note: Azure and Bedrock require special configuration (endpoint/credentials) and are handled separately
const VALID_PROVIDERS: LLMProvider[] = [
  // Tier 1: First-party providers
  'openai',
  'anthropic',
  'google',
  'xai',
  'mistral',
  'cohere',
  'deepseek',
  // Tier 3: Inference providers
  'groq',
  'together',
  'fireworks',
  'cerebras',
  'perplexity',
  // Tier 4: Unified gateways
  'openrouter',
  'replicate',
];

// Providers that require special configuration instead of simple API keys
const CONFIG_REQUIRED_PROVIDERS: LLMProvider[] = ['azure', 'bedrock'];

// GET /api/dashboard/provider-keys - List BYOK provider keys
export async function GET() {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'api_keys:view');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // Get BYOK keys (exclude platform keys)
    const keys = await db
      .select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        provider: apiKeysTable.provider,
        keyPrefix: apiKeysTable.keyPrefix,
        isActive: apiKeysTable.isActive,
        lastUsedAt: apiKeysTable.lastUsedAt,
        createdAt: apiKeysTable.createdAt,
      })
      .from(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.orgId, context.orgId),
          ne(apiKeysTable.provider, 'platform')
        )
      )
      .orderBy(desc(apiKeysTable.createdAt))
      .limit(50);

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error fetching provider keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/dashboard/provider-keys - Add new BYOK provider key
export async function POST(request: NextRequest) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'api_keys:create');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const body = await request.json();
    const { provider, apiKey, name } = body;

    // Validate provider
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate API key
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Validate the API key with the provider
    const keyManager = getKeyManager();
    const validation = await keyManager.validateProviderKey(provider, apiKey.trim());

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid API key' },
        { status: 400 }
      );
    }

    // Check for existing key for this provider
    const [existingKey] = await db
      .select({ id: apiKeysTable.id })
      .from(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.orgId, context.orgId),
          eq(apiKeysTable.provider, provider),
          eq(apiKeysTable.isActive, true)
        )
      )
      .limit(1);

    if (existingKey) {
      return NextResponse.json(
        { error: `A ${provider} key already exists. Delete it first to add a new one.` },
        { status: 409 }
      );
    }

    // Store the key
    const result = await keyManager.storeProviderKey(
      context.orgId,
      provider,
      apiKey.trim(),
      name || undefined
    );

    // Log audit event
    logAuditEvent({
      orgId: context.orgId,
      userId: context.userId,
      eventType: 'api_key.created',
      description: `${provider} API key added (BYOK)`,
      resourceType: 'api_key',
      resourceId: result.id,
      changes: { after: { provider, keyPrefix: result.keyPrefix } },
      metadata: extractRequestMetadata(request),
    });

    return NextResponse.json({
      id: result.id,
      keyPrefix: result.keyPrefix,
      provider,
      name: name || `${provider} API Key`,
    });
  } catch (error) {
    console.error('Error adding provider key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

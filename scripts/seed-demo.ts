/**
 * Seed Demo Account
 *
 * Idempotent script to create a demo account with pre-configured OpenRouter
 * credentials and sample verification data for YC reviewer access.
 *
 * Usage: npx tsx scripts/seed-demo.ts
 *
 * Required env vars:
 *   DEMO_EMAIL, DEMO_USER_PASSWORD, ENCRYPTION_KEY, DATABASE_URL,
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env vars:
 *   OPENROUTER_API_KEY (for pre-configured provider credential)
 */

import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import {
  usersTable,
  organizationsTable,
  orgMembersTable,
  providerCredentialsTable,
  apiKeysTable,
  apiKeyCredentialsTable,
  verificationsTable,
  paradigmResultsTable,
  userPreferencesTable,
} from '../utils/db/schema';
// Create standalone DB connection (bypasses server-only guard in db.ts)
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client);

// Inline crypto helpers (can't import key-manager.ts — it transitively imports server-only)
function encrypt(text: string): string {
  const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY!).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

function generatePlatformApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let prefix = 'vfy_';
  for (let i = 0; i < 8; i++) {
    prefix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const secret = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${secret}`;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEMO_EMAIL = process.env.DEMO_EMAIL!;
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!DEMO_EMAIL || !DEMO_USER_PASSWORD || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: DEMO_EMAIL, DEMO_USER_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding demo account...\n');

  // 1. Create or find Supabase auth user
  let userId: string;

  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

  if (existingUser) {
    userId = existingUser.id;
    console.log(`  ✓ Auth user already exists: ${userId}`);
  } else {
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_USER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Demo User' },
    });
    if (error) {
      console.error('Failed to create auth user:', error.message);
      process.exit(1);
    }
    userId = newUser.user.id;
    console.log(`  ✓ Created auth user: ${userId}`);
  }

  // 2. Create users_table record
  const existingDbUser = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (existingDbUser.length === 0) {
    await db.insert(usersTable).values({
      id: userId,
      name: 'Demo User',
      email: DEMO_EMAIL,
    });
    console.log('  ✓ Created users_table record');
  } else {
    console.log('  ✓ users_table record already exists');
  }

  // 3. Create organization
  const orgSlug = 'demo-org';
  const existingOrg = await db.select().from(organizationsTable).where(eq(organizationsTable.slug, orgSlug));
  let orgId: string;

  if (existingOrg.length > 0) {
    orgId = existingOrg[0].id;
    console.log(`  ✓ Organization already exists: ${orgId}`);
  } else {
    const [newOrg] = await db
      .insert(organizationsTable)
      .values({
        name: 'Demo Organization',
        slug: orgSlug,
        planType: 'pro',
        verificationsLimit: 10000,
        verificationsUsed: 12,
      })
      .returning({ id: organizationsTable.id });
    orgId = newOrg.id;
    console.log(`  ✓ Created organization: ${orgId}`);
  }

  // 4. Create org_members record
  const existingMember = await db
    .select()
    .from(orgMembersTable)
    .where(eq(orgMembersTable.userId, userId));
  if (existingMember.length === 0) {
    await db.insert(orgMembersTable).values({
      orgId,
      userId,
      role: 'owner',
    });
    console.log('  ✓ Created org_members record');
  } else {
    console.log('  ✓ org_members record already exists');
  }

  // 5. Create provider credential (OpenRouter)
  let credentialId: string;
  const existingCred = await db
    .select()
    .from(providerCredentialsTable)
    .where(eq(providerCredentialsTable.orgId, orgId));

  if (existingCred.length > 0) {
    credentialId = existingCred[0].id;
    console.log(`  ✓ Provider credential already exists: ${credentialId}`);
  } else {
    const openRouterKey = process.env.OPENROUTER_API_KEY || 'sk-demo-placeholder';
    const [newCred] = await db
      .insert(providerCredentialsTable)
      .values({
        orgId,
        name: 'OpenRouter',
        provider: 'openrouter',
        encryptedCredentials: encrypt(openRouterKey),
        isActive: true,
        validationStatus: 'valid',
        lastValidatedAt: new Date(),
      })
      .returning({ id: providerCredentialsTable.id });
    credentialId = newCred.id;
    console.log(`  ✓ Created provider credential: ${credentialId}`);
  }

  // 6. Create API key
  let apiKeyId: string;
  const existingApiKey = await db
    .select()
    .from(apiKeysTable)
    .where(eq(apiKeysTable.orgId, orgId));

  if (existingApiKey.length > 0) {
    apiKeyId = existingApiKey[0].id;
    console.log(`  ✓ API key already exists: ${apiKeyId}`);
  } else {
    const rawKey = generatePlatformApiKey();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const paradigmConfig = {
      semantic: { enabled: true, weight: 0.15, model: 'openai/text-embedding-3-small' },
      reasoning: { enabled: true, weight: 0.25, model: 'anthropic/claude-sonnet-4.5' },
      tool: { enabled: true, weight: 0.15, model: 'openai/gpt-4.1-mini' },
      biprm: { enabled: true, weight: 0.15, model: 'anthropic/claude-sonnet-4.5' },
      ensemble: { enabled: true, weight: 0.15, models: ['anthropic/claude-sonnet-4.5', 'openai/gpt-4.1', 'google/gemini-2.5-flash'] },
      entropy: { enabled: true, weight: 0.10, model: 'openai/gpt-4.1-mini' },
      formal: { enabled: true, weight: 0.05, model: 'openai/gpt-4.1' },
    };

    const [newKey] = await db
      .insert(apiKeysTable)
      .values({
        orgId,
        name: 'Demo Key',
        keyHash,
        keyPrefix,
        paradigmConfig,
        defaultThresholds: { acceptThreshold: 0.95, escalateThreshold: 0.5, timeout: 30000 },
        isActive: true,
      })
      .returning({ id: apiKeysTable.id });
    apiKeyId = newKey.id;
    console.log(`  ✓ Created API key: ${apiKeyId} (prefix: ${keyPrefix})`);
  }

  // 7. Create api_key_credentials junction
  const existingJunction = await db
    .select()
    .from(apiKeyCredentialsTable)
    .where(eq(apiKeyCredentialsTable.apiKeyId, apiKeyId));
  if (existingJunction.length === 0) {
    await db.insert(apiKeyCredentialsTable).values({
      apiKeyId,
      providerCredentialId: credentialId,
      isDefault: true,
    });
    console.log('  ✓ Created api_key_credentials junction');
  } else {
    console.log('  ✓ api_key_credentials junction already exists');
  }

  // 8. Create user_preferences
  const existingPrefs = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId));
  if (existingPrefs.length === 0) {
    await db.insert(userPreferencesTable).values({
      userId,
      orgId,
      onboardingCompleted: true,
      hasCreatedApiKey: true,
      hasRunVerification: true,
      hasVisitedPlayground: true,
    });
    console.log('  ✓ Created user_preferences');
  } else {
    console.log('  ✓ user_preferences already exists');
  }

  // 9. Create sample verifications
  const existingVerifications = await db
    .select()
    .from(verificationsTable)
    .where(eq(verificationsTable.orgId, orgId));

  if (existingVerifications.length > 0) {
    console.log(`  ✓ ${existingVerifications.length} verifications already exist`);
  } else {
    const sampleVerifications = [
      {
        content: 'The recommended daily dose of aspirin for heart disease prevention is 500mg.',
        finalVerdict: 'false' as const,
        confidenceScore: '0.9400',
        decision: 'reject',
        reasoning: 'The recommended daily dose of aspirin for heart disease prevention is 75-100mg, not 500mg. 500mg is a standard pain relief dose but exceeds safe cardiovascular prevention limits.',
        methodsConfig: { reasoning: 0.4, tool: 0.3, semantic: 0.3 },
        processingTimeMs: 2340,
        daysAgo: 1,
      },
      {
        content: 'Python was created by Guido van Rossum and first released in 1991.',
        finalVerdict: 'true' as const,
        confidenceScore: '0.9800',
        decision: 'accept',
        reasoning: 'This is a well-established fact. Python was indeed created by Guido van Rossum and first released on February 20, 1991.',
        methodsConfig: { reasoning: 0.5, semantic: 0.3, tool: 0.2 },
        processingTimeMs: 1820,
        daysAgo: 2,
      },
      {
        content: 'React.js uses a virtual DOM and was developed by Facebook. It was first released in 2015.',
        finalVerdict: 'false' as const,
        confidenceScore: '0.8600',
        decision: 'reject',
        reasoning: 'Partially incorrect. React was developed by Facebook and uses a virtual DOM, but it was first released in May 2013, not 2015. React Native was released in 2015, which may be the source of confusion.',
        methodsConfig: { reasoning: 0.4, tool: 0.3, biprm: 0.3 },
        processingTimeMs: 3100,
        daysAgo: 3,
      },
      {
        content: 'The Earth is approximately 4.54 billion years old, based on radiometric dating of meteorites.',
        finalVerdict: 'true' as const,
        confidenceScore: '0.9700',
        decision: 'accept',
        reasoning: 'This is scientifically accurate. The age of Earth is estimated at 4.54 ± 0.05 billion years based on radiometric age-dating of meteorite material, consistent with the ages of the oldest known rocks and earliest solar system material.',
        methodsConfig: { semantic: 0.3, reasoning: 0.4, ensemble: 0.3 },
        processingTimeMs: 4200,
        daysAgo: 5,
      },
      {
        content: 'HTTPS uses TLS encryption on port 443 by default and prevents all forms of man-in-the-middle attacks.',
        finalVerdict: 'uncertain' as const,
        confidenceScore: '0.6200',
        decision: 'escalate',
        reasoning: 'Partially correct. HTTPS does use TLS encryption and defaults to port 443. However, the claim that it "prevents all forms" of MITM attacks is too absolute — TLS stripping, compromised CAs, and certain implementation flaws can still enable MITM attacks.',
        methodsConfig: { reasoning: 0.35, biprm: 0.35, ensemble: 0.3 },
        processingTimeMs: 5800,
        daysAgo: 6,
      },
    ];

    for (const sample of sampleVerifications) {
      const createdAt = daysAgo(sample.daysAgo);
      const completedAt = new Date(createdAt.getTime() + sample.processingTimeMs);

      const [verification] = await db
        .insert(verificationsTable)
        .values({
          orgId,
          content: sample.content,
          methodsConfig: sample.methodsConfig,
          status: 'completed',
          finalVerdict: sample.finalVerdict,
          confidenceScore: sample.confidenceScore,
          decision: sample.decision,
          reasoning: sample.reasoning,
          processingTimeMs: sample.processingTimeMs,
          cachedResult: false,
          createdAt,
          updatedAt: completedAt,
          completedAt,
        })
        .returning({ id: verificationsTable.id });

      // Create paradigm results for each enabled method
      const paradigmEntries = Object.entries(sample.methodsConfig) as [string, number][];
      for (const [paradigm, weight] of paradigmEntries) {
        const verdictMap: Record<string, string> = {
          true: 'true',
          false: 'false',
          uncertain: Math.random() > 0.5 ? 'false' : 'uncertain',
        };
        await db.insert(paradigmResultsTable).values({
          verificationId: verification.id,
          paradigmType: paradigm as 'semantic' | 'reasoning' | 'tool' | 'biprm' | 'ensemble' | 'entropy' | 'formal',
          weight: weight.toFixed(2),
          provider: 'openrouter',
          model: paradigm === 'semantic' ? 'openai/text-embedding-3-small' : 'anthropic/claude-sonnet-4.5',
          verdict: verdictMap[sample.finalVerdict] || sample.finalVerdict,
          confidence: (parseFloat(sample.confidenceScore) + (Math.random() * 0.06 - 0.03)).toFixed(4),
          reasoning: sample.reasoning,
          processingTimeMs: Math.floor(sample.processingTimeMs / paradigmEntries.length),
          createdAt,
        });
      }
    }
    console.log(`  ✓ Created ${sampleVerifications.length} sample verifications with paradigm results`);
  }

  console.log('\n✅ Demo account seeded successfully!');
  console.log(`   Email: ${DEMO_EMAIL}`);
  console.log(`   Org: Demo Organization (${orgSlug})`);
  await client.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await client.end();
  process.exit(1);
});

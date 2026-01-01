/**
 * POST /api/v1/verify
 * Main verification endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import {
  verificationsTable,
  paradigmResultsTable,
  usageTable,
  PLAN_LIMITS,
} from '@/utils/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { createOrchestrator, MethodsConfig, ParadigmType } from '@/lib/verification';
import { ProviderKeys } from '@/lib/llm/types';
import { getDecryptedApiKeys } from '@/lib/llm/key-manager';
import {
  getCachedVerification,
  cacheVerification,
  recordCacheHit,
  recordCacheMiss,
} from '@/lib/cache';
import {
  ApiError,
  ValidationError,
  RateLimitError,
  QuotaExceededError,
  withApiMiddleware,
  ApiRequest,
} from '@/lib/api';

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

const MethodsConfigSchema = z
  .object({
    semantic: z.number().min(0).max(1).optional(),
    reasoning: z.number().min(0).max(1).optional(),
    tool: z.number().min(0).max(1).optional(),
    biprm: z.number().min(0).max(1).optional(),
    ensemble: z.number().min(0).max(1).optional(),
    entropy: z.number().min(0).max(1).optional(),
    formal: z.number().min(0).max(1).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined && v > 0), {
    message: 'At least one verification method must be specified with weight > 0',
  });

const VerifyRequestSchema = z.object({
  content: z.string().min(1).max(100000),
  context: z.record(z.string(), z.unknown()).optional(),
  methods: MethodsConfigSchema,
  idempotencyKey: z.string().max(255).optional(),
});

type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

// =============================================================================
// HELPERS
// =============================================================================

async function checkMethodsAllowed(
  methods: MethodsConfig,
  allowedMethods: readonly string[]
): Promise<void> {
  const requestedMethods = Object.entries(methods)
    .filter(([, weight]) => weight !== undefined && weight > 0)
    .map(([method]) => method);

  const disallowedMethods = requestedMethods.filter((method) => !allowedMethods.includes(method));

  if (disallowedMethods.length > 0) {
    throw new QuotaExceededError(
      `Methods not allowed on your plan: ${disallowedMethods.join(', ')}. ` +
        `Upgrade to access: ${disallowedMethods.join(', ')}`
    );
  }
}

async function checkMonthlyQuota(
  orgId: string,
  planType: 'free' | 'pro' | 'enterprise'
): Promise<void> {
  const limits = PLAN_LIMITS[planType];

  if (limits.verificationsPerMonth === Infinity) {
    return; // Enterprise has unlimited
  }

  // Count verifications this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(verificationsTable)
    .where(
      and(eq(verificationsTable.orgId, orgId), gte(verificationsTable.createdAt, startOfMonth))
    );

  const currentCount = Number(countResult?.count || 0);

  if (currentCount >= limits.verificationsPerMonth) {
    throw new QuotaExceededError(
      `Monthly verification limit reached (${limits.verificationsPerMonth}). ` +
        `Upgrade your plan for more verifications.`
    );
  }
}

async function checkIdempotency(
  orgId: string,
  idempotencyKey: string
): Promise<{ cached: true; result: unknown } | { cached: false }> {
  const existing = await db.query.verificationsTable.findFirst({
    where: and(
      eq(verificationsTable.orgId, orgId),
      eq(verificationsTable.idempotencyKey, idempotencyKey)
    ),
    with: {
      paradigmResults: true,
    },
  });

  if (existing) {
    return {
      cached: true,
      result: {
        id: existing.id,
        status: existing.status,
        verdict: existing.finalVerdict,
        confidence: existing.confidenceScore ? parseFloat(existing.confidenceScore) : null,
        decision: existing.status === 'completed' ? 'accept' : 'pending',
        paradigmResults: existing.paradigmResults,
        processingTimeMs: existing.processingTimeMs,
        costCents: existing.costCents ?? 0,
        cached: true,
      },
    };
  }

  return { cached: false };
}

// =============================================================================
// HANDLER
// =============================================================================

async function handleVerify(req: ApiRequest): Promise<NextResponse> {
  // Parse and validate request body
  let body: VerifyRequest;
  try {
    const rawBody = await req.json();
    body = VerifyRequestSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid request body', {
        errors: error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    throw new ValidationError('Invalid JSON in request body');
  }

  const { organization } = req;
  const planType = organization.planType;

  // Check if requested methods are allowed for plan
  const limits = PLAN_LIMITS[planType];
  await checkMethodsAllowed(body.methods, limits.allowedMethods);

  // Check monthly quota
  await checkMonthlyQuota(organization.id, planType);

  // Check idempotency
  if (body.idempotencyKey) {
    const cached = await checkIdempotency(organization.id, body.idempotencyKey);
    if (cached.cached) {
      recordCacheHit();
      return NextResponse.json(cached.result, { status: 200 });
    }
  }

  // Check Redis cache for identical content + methods
  const cachedResult = await getCachedVerification(body.content, body.methods);
  if (cachedResult) {
    recordCacheHit();
    return NextResponse.json(
      {
        id: cachedResult.id,
        status: 'completed',
        verdict: cachedResult.verdict,
        confidence: cachedResult.confidence,
        decision: cachedResult.decision,
        reasoning: cachedResult.reasoning,
        paradigmResults: cachedResult.paradigmResults.map((pr) => ({
          paradigm: pr.paradigm,
          verdict: pr.verdict,
          confidence: pr.confidence,
          reasoning: pr.reasoning?.slice(0, 500),
          processingTimeMs: pr.processingTimeMs,
          error: pr.error,
        })),
        processingTimeMs: cachedResult.processingTimeMs,
        costCents: cachedResult.costCents,
        cached: true,
      },
      { status: 200 }
    );
  }

  recordCacheMiss();

  // Get decrypted API keys for the organization
  const keys = await getDecryptedApiKeys(organization.id);

  if (Object.keys(keys).length === 0) {
    throw new ApiError(
      'No API keys configured. Please add at least one LLM provider API key in settings.',
      400,
      'NO_API_KEYS'
    );
  }

  // Create verification record
  const [verification] = await db
    .insert(verificationsTable)
    .values({
      orgId: organization.id,
      idempotencyKey: body.idempotencyKey || null,
      content: body.content,
      context: body.context || null,
      methodsConfig: body.methods,
      status: 'processing',
    })
    .returning();

  try {
    // Create orchestrator and run verification
    const orchestrator = createOrchestrator({
      keys,
      defaultTimeout: 30000,
    });

    const result = await orchestrator.verify(body.content, {
      context: body.context,
      methods: body.methods,
    });

    // Update verification record
    await db
      .update(verificationsTable)
      .set({
        status: 'completed',
        finalVerdict: result.verdict,
        confidenceScore: result.confidence.toFixed(4),
        processingTimeMs: result.processingTimeMs,
        costCents: Math.round(result.costCents),
        completedAt: new Date(),
      })
      .where(eq(verificationsTable.id, verification.id));

    // Store paradigm results
    if (result.paradigmResults.length > 0) {
      await db.insert(paradigmResultsTable).values(
        result.paradigmResults.map((pr) => ({
          verificationId: verification.id,
          paradigmType: pr.paradigm,
          weight: pr.weight.toFixed(2),
          provider: pr.provider,
          model: pr.model,
          verdict: pr.verdict,
          confidence: pr.confidence.toFixed(4),
          reasoning: pr.reasoning,
          tokenUsage: pr.tokenUsage || null,
          processingTimeMs: pr.processingTimeMs,
          costCents: Math.round(pr.costCents),
          errorMessage: pr.error || null,
        }))
      );
    }

    // Track usage
    const totalInputTokens = result.paradigmResults.reduce(
      (sum, pr) => sum + (pr.tokenUsage?.inputTokens || 0),
      0
    );
    const totalOutputTokens = result.paradigmResults.reduce(
      (sum, pr) => sum + (pr.tokenUsage?.outputTokens || 0),
      0
    );

    await db.insert(usageTable).values({
      orgId: organization.id,
      verificationId: verification.id,
      provider: 'mixed',
      model: 'mixed',
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      costCents: Math.round(result.costCents),
    });

    // Cache the result for future requests
    await cacheVerification(body.content, body.methods, {
      ...result,
      id: verification.id,
    });

    // Return response
    return NextResponse.json(
      {
        id: verification.id,
        status: 'completed',
        verdict: result.verdict,
        confidence: result.confidence,
        decision: result.decision,
        reasoning: result.reasoning,
        paradigmResults: result.paradigmResults.map((pr) => ({
          paradigm: pr.paradigm,
          verdict: pr.verdict,
          confidence: pr.confidence,
          reasoning: pr.reasoning?.slice(0, 500),
          processingTimeMs: pr.processingTimeMs,
          error: pr.error,
        })),
        processingTimeMs: result.processingTimeMs,
        costCents: result.costCents,
        cached: false,
      },
      { status: 200 }
    );
  } catch (error) {
    // Update verification as failed
    await db
      .update(verificationsTable)
      .set({
        status: 'failed',
        completedAt: new Date(),
      })
      .where(eq(verificationsTable.id, verification.id));

    throw error;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const POST = withApiMiddleware(handleVerify);

// GET endpoint for retrieving verification status
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Use POST to create a verification. Use GET /api/v1/verify/[id] to retrieve status.',
    },
    { status: 405 }
  );
}

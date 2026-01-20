/**
 * Verification Service
 * Main coordination layer for verification operations
 */

import { MethodsConfig, ParadigmResult, Verdict, Decision, VerifyOptions } from './types';
import { ValidatedVerifyRequest, getMethodsCount } from './validator';
import {
  checkMethodsAllowed,
  checkMonthlyQuota,
  PlanType,
} from './quota';
import {
  createVerification,
  findByIdempotencyKey,
  markVerificationFailed,
  saveVerificationResult,
  CachedVerificationResult,
} from './repository';
import {
  getCachedVerification,
  cacheVerification,
  recordCacheHit,
  recordCacheMiss,
} from '@/lib/cache';
import { getDecryptedApiKeys, type ProviderKeys } from '@/lib/llm';
import { StreamingVerificationOrchestrator, VerificationUpdate } from './orchestrator';
import { createEscalation } from '@/lib/escalation';
import { fireWebhooks } from '@/lib/webhooks';
import {
  broadcastStatusUpdate,
  broadcastParadigmComplete,
  broadcastFinalResult,
} from '@/utils/supabase/realtime';
import type { ApiKeyConfiguration } from '@/lib/api';

// =============================================================================
// TYPES
// =============================================================================

export interface OrganizationContext {
  id: string;
  name: string;
  planType: PlanType;
  dataRetentionEnabled: boolean;
  verificationRetentionDays: number;
}

export interface VerifyServiceRequest {
  organization: OrganizationContext;
  request: ValidatedVerifyRequest;
  apiKeyConfig?: ApiKeyConfiguration;
}

export interface VerifyServiceResponse {
  id: string;
  status: 'completed' | 'escalated';
  verdict: Verdict | null;
  confidence: number;
  decision: Decision;
  reasoning: string;
  paradigmResults: Array<{
    paradigm: string;
    verdict: Verdict | null;
    confidence: number;
    reasoning?: string;
    processingTimeMs: number;
    error?: string;
  }>;
  processingTimeMs: number;
  costCents: number;
  cached: boolean;
  escalated: boolean;
}

export interface VerifyServiceError {
  type: 'quota_exceeded' | 'methods_not_allowed' | 'no_api_keys' | 'verification_failed';
  message: string;
  details?: unknown;
}

export type VerifyServiceResult =
  | { success: true; data: VerifyServiceResponse }
  | { success: false; error: VerifyServiceError };

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Main verification service function
 * Handles the complete verification flow
 */
export async function verify(input: VerifyServiceRequest): Promise<VerifyServiceResult> {
  const { organization, request, apiKeyConfig } = input;
  const { content, context, methods, options, idempotencyKey } = request;

  // Resolve effective methods - use API key's paradigm config if methods not specified in request
  let effectiveMethods: MethodsConfig = methods || {};
  if (apiKeyConfig?.paradigmConfig && (!methods || Object.keys(methods).length === 0)) {
    // Convert paradigm config to methods config
    effectiveMethods = {};
    for (const [paradigm, config] of Object.entries(apiKeyConfig.paradigmConfig)) {
      if (config && config.enabled && config.weight > 0) {
        effectiveMethods[paradigm as keyof MethodsConfig] = config.weight;
      }
    }
  }

  // Ensure at least one method is configured
  if (!effectiveMethods || Object.values(effectiveMethods).filter((w) => w !== undefined && w > 0).length === 0) {
    return {
      success: false,
      error: {
        type: 'methods_not_allowed',
        message: 'No verification methods specified. Either provide methods in the request or configure paradigms on your API key.',
        details: {},
      },
    };
  }

  // Check if requested methods are allowed for plan
  const methodsCheck = checkMethodsAllowed(effectiveMethods, organization.planType);
  if (!methodsCheck.allowed) {
    return {
      success: false,
      error: {
        type: 'methods_not_allowed',
        message: `Methods not allowed on your plan: ${methodsCheck.disallowedMethods?.join(', ')}. Upgrade to access these methods.`,
        details: { disallowedMethods: methodsCheck.disallowedMethods },
      },
    };
  }

  // Check monthly quota
  const quotaCheck = await checkMonthlyQuota(organization.id, organization.planType);
  if (!quotaCheck.allowed) {
    return {
      success: false,
      error: {
        type: 'quota_exceeded',
        message: quotaCheck.error!,
        details: { currentCount: quotaCheck.currentCount, limit: quotaCheck.limit },
      },
    };
  }

  // Check idempotency - return cached result if exists
  if (idempotencyKey) {
    const cached = await findByIdempotencyKey(organization.id, idempotencyKey);
    if (cached) {
      recordCacheHit();
      return {
        success: true,
        data: formatCachedResponse(cached),
      };
    }
  }

  // Check Redis cache for identical content + methods
  const cachedResult = await getCachedVerification(content, effectiveMethods);
  if (cachedResult) {
    recordCacheHit();
    return {
      success: true,
      data: formatRedisCachedResponse(cachedResult),
    };
  }

  recordCacheMiss();

  // Get decrypted API keys for the organization
  const keys = await getDecryptedApiKeys(organization.id);
  if (Object.keys(keys).length === 0) {
    return {
      success: false,
      error: {
        type: 'no_api_keys',
        message: 'No API keys configured. Please add a provider credential or LLM provider API key in settings.',
      },
    };
  }

  // Calculate expiresAt based on org retention settings
  const expiresAt = organization.dataRetentionEnabled
    ? new Date(Date.now() + organization.verificationRetentionDays * 24 * 60 * 60 * 1000)
    : null;

  // Create verification record
  const verification = await createVerification({
    orgId: organization.id,
    content,
    context: context || null,
    methods: effectiveMethods,
    idempotencyKey: idempotencyKey || null,
    expiresAt,
  });

  try {
    const result = await executeVerification({
      verificationId: verification.id,
      orgId: organization.id,
      organizationName: organization.name,
      content,
      context,
      methods: effectiveMethods,
      keys,
      options,
      apiKeyConfig,
    });

    // Cache the result for future requests
    // Construct VerificationResult for caching (need content and proper paradigmResults)
    await cacheVerification(content, effectiveMethods, {
      id: verification.id,
      content,
      status: result.status,
      verdict: result.verdict,
      confidence: result.confidence,
      decision: result.decision,
      reasoning: result.reasoning,
      paradigmResults: result.fullParadigmResults,
      processingTimeMs: result.processingTimeMs,
      costCents: result.costCents,
      cached: false,
    });

    // Fire webhooks
    if (result.escalated) {
      fireWebhooks(organization.id, 'verification.escalated', {
        verificationId: verification.id,
        verdict: result.verdict,
        confidence: result.confidence,
        decision: result.decision,
      });
    } else {
      fireWebhooks(organization.id, 'verification.completed', {
        verificationId: verification.id,
        verdict: result.verdict,
        confidence: result.confidence,
        decision: result.decision,
        processingTimeMs: result.processingTimeMs,
        cached: false,
      });
    }

    return {
      success: true,
      data: {
        id: verification.id,
        ...result,
        cached: false,
      },
    };
  } catch (error) {
    // Mark verification as failed
    await markVerificationFailed(verification.id);

    return {
      success: false,
      error: {
        type: 'verification_failed',
        message: error instanceof Error ? error.message : 'Verification failed',
        details: error,
      },
    };
  }
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

interface ExecuteVerificationInput {
  verificationId: string;
  orgId: string;
  organizationName: string;
  content: string;
  context?: Record<string, unknown>;
  methods: MethodsConfig;
  keys: ProviderKeys;
  options?: VerifyOptions;
  apiKeyConfig?: ApiKeyConfiguration;
}

interface ExecutionResult {
  status: 'completed' | 'escalated';
  verdict: Verdict | null;
  confidence: number;
  decision: Decision;
  reasoning: string;
  paradigmResults: Array<{
    paradigm: string;
    verdict: Verdict | null;
    confidence: number;
    reasoning?: string;
    processingTimeMs: number;
    error?: string;
  }>;
  fullParadigmResults: ParadigmResult[];
  processingTimeMs: number;
  costCents: number;
  escalated: boolean;
}

async function executeVerification(input: ExecuteVerificationInput): Promise<ExecutionResult> {
  const { verificationId, orgId, organizationName, content, context, methods, keys, options } = input;
  const methodsCount = getMethodsCount(methods);

  // Create streaming orchestrator with real-time broadcasts
  const orchestrator = new StreamingVerificationOrchestrator({
    keys,
    defaultTimeout: 30000,
  });

  // Set the verification ID so broadcasts use the correct ID
  orchestrator.setVerificationId(verificationId);

  // Wire up real-time broadcasts via callback
  orchestrator.setUpdateCallback((update: VerificationUpdate) => {
    switch (update.type) {
      case 'started':
        broadcastStatusUpdate(verificationId, 'processing', {
          completed: 0,
          total: methodsCount,
        });
        break;
      case 'paradigm_completed':
        if (update.data.result && update.data.progress) {
          broadcastParadigmComplete(
            verificationId,
            update.data.paradigm!,
            update.data.result.verdict,
            update.data.result.confidence,
            update.data.progress
          );
        }
        break;
      case 'error':
        broadcastStatusUpdate(verificationId, 'failed');
        break;
    }
  });

  const result = await orchestrator.verifyWithUpdates(content, {
    context,
    methods,
    timeout: options?.timeout,
    minConfidence: options?.minConfidence,
    acceptThreshold: options?.acceptThreshold,
    escalateThreshold: options?.escalateThreshold,
    maxRetries: options?.maxRetries,
    retryOnLowConfidence: options?.retryOnLowConfidence,
  });

  // Check if verification should be escalated
  const shouldEscalate = result.decision === 'escalate';

  // Calculate token usage for tracking
  const totalInputTokens = result.paradigmResults.reduce(
    (sum, pr) => sum + (pr.tokenUsage?.inputTokens || 0),
    0
  );
  const totalOutputTokens = result.paradigmResults.reduce(
    (sum, pr) => sum + (pr.tokenUsage?.outputTokens || 0),
    0
  );

  // Save verification result to database
  await saveVerificationResult(verificationId, orgId, {
    status: shouldEscalate ? 'escalated' : 'completed',
    verdict: result.verdict,
    confidence: result.confidence,
    decision: result.decision,
    reasoning: result.reasoning,
    processingTimeMs: result.processingTimeMs,
    costCents: result.costCents,
    paradigmResults: result.paradigmResults,
    totalInputTokens,
    totalOutputTokens,
  });

  // Broadcast final result to real-time subscribers
  broadcastFinalResult(verificationId, {
    verdict: result.verdict,
    confidence: result.confidence,
    decision: result.decision,
    processingTimeMs: result.processingTimeMs,
    costCents: Math.round(result.costCents),
  });

  // Create escalation record if verification needs human review
  if (shouldEscalate) {
    await createEscalation({
      verificationId,
      confidence: result.confidence,
      paradigmResults: result.paradigmResults,
      orgId,
      organizationName,
      content,
    });
  }

  return {
    status: shouldEscalate ? 'escalated' : 'completed',
    verdict: result.verdict,
    confidence: result.confidence,
    decision: result.decision,
    reasoning: result.reasoning,
    paradigmResults: formatParadigmResults(result.paradigmResults),
    fullParadigmResults: result.paradigmResults,
    processingTimeMs: result.processingTimeMs,
    costCents: result.costCents,
    escalated: shouldEscalate,
  };
}

/**
 * Format paradigm results for API response
 * Handles both in-memory ParadigmResult and database-cached results
 */
function formatParadigmResults(
  results: Array<{
    paradigm: string;
    verdict: Verdict | null;
    confidence: number | string | null;
    reasoning?: string | null;
    processingTimeMs?: number | null;
    error?: string | null;
  }>
): VerifyServiceResponse['paradigmResults'] {
  return results.map((pr) => ({
    paradigm: pr.paradigm,
    verdict: pr.verdict,
    confidence: typeof pr.confidence === 'string' ? parseFloat(pr.confidence) : (pr.confidence ?? 0),
    reasoning: pr.reasoning?.slice(0, 500) ?? undefined,
    processingTimeMs: pr.processingTimeMs ?? 0,
    error: pr.error ?? undefined,
  }));
}

function formatCachedResponse(cached: CachedVerificationResult): VerifyServiceResponse {
  return {
    id: cached.id,
    status: cached.status === 'escalated' ? 'escalated' : 'completed',
    verdict: cached.verdict,
    confidence: cached.confidence ?? 0,
    decision: cached.decision ?? 'reject',
    reasoning: '',
    paradigmResults: formatParadigmResults(cached.paradigmResults),
    processingTimeMs: cached.processingTimeMs ?? 0,
    costCents: cached.costCents ?? 0,
    cached: true,
    escalated: cached.status === 'escalated',
  };
}

function formatRedisCachedResponse(cachedResult: {
  id: string;
  verdict: Verdict | null;
  confidence: number;
  decision: Decision;
  reasoning: string;
  paradigmResults: ParadigmResult[];
  processingTimeMs: number;
  costCents: number;
}): VerifyServiceResponse {
  return {
    id: cachedResult.id,
    status: 'completed',
    verdict: cachedResult.verdict,
    confidence: cachedResult.confidence,
    decision: cachedResult.decision,
    reasoning: cachedResult.reasoning,
    paradigmResults: formatParadigmResults(cachedResult.paradigmResults),
    processingTimeMs: cachedResult.processingTimeMs,
    costCents: cachedResult.costCents,
    cached: true,
    escalated: false,
  };
}

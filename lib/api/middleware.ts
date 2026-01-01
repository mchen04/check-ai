/**
 * API Middleware
 * Authentication, rate limiting, and request processing middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/utils/db/db';
import { apiKeysTable, organizationsTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import {
    ApiHandler,
    AuthenticatedRequest,
    PublicApiHandler,
} from './types';
import {
    AuthenticationError,
    RateLimitError,
    QuotaExceededError,
    createErrorResponse,
} from './errors';
import { hashApiKey } from '@/lib/llm/key-manager';
import { PLAN_LIMITS, type PlanType } from '@/utils/db/schema';

// =============================================================================
// REQUEST ID GENERATION
// =============================================================================

function generateRequestId(): string {
    return `req_${crypto.randomBytes(12).toString('base64url')}`;
}

// =============================================================================
// API KEY AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Middleware that validates API key and attaches organization context
 */
export function withApiAuth(handler: ApiHandler): PublicApiHandler {
    return async (req, context) => {
        const requestId = generateRequestId();

        try {
            // Extract API key from Authorization header
            const authHeader = req.headers.get('Authorization');

            if (!authHeader?.startsWith('Bearer ')) {
                throw new AuthenticationError('Missing or invalid Authorization header');
            }

            const apiKey = authHeader.substring(7);

            if (!apiKey || apiKey.length < 20) {
                throw new AuthenticationError('Invalid API key format');
            }

            // Hash the API key for lookup
            const keyHash = hashApiKey(apiKey);
            const keyPrefix = apiKey.slice(0, 12); // vfy_XXXXXXXX

            // Look up the API key
            const [keyRecord] = await db
                .select({
                    id: apiKeysTable.id,
                    orgId: apiKeysTable.orgId,
                    isActive: apiKeysTable.isActive,
                    expiresAt: apiKeysTable.expiresAt,
                })
                .from(apiKeysTable)
                .where(
                    and(
                        eq(apiKeysTable.keyHash, keyHash),
                        eq(apiKeysTable.keyPrefix, keyPrefix),
                        eq(apiKeysTable.provider, 'platform')
                    )
                )
                .limit(1);

            if (!keyRecord) {
                throw new AuthenticationError('Invalid API key');
            }

            if (!keyRecord.isActive) {
                throw new AuthenticationError('API key is inactive');
            }

            if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
                throw new AuthenticationError('API key has expired');
            }

            // Get organization details
            const [org] = await db
                .select({
                    id: organizationsTable.id,
                    name: organizationsTable.name,
                    slug: organizationsTable.slug,
                    planType: organizationsTable.planType,
                    verificationsUsed: organizationsTable.verificationsUsed,
                    verificationsLimit: organizationsTable.verificationsLimit,
                })
                .from(organizationsTable)
                .where(eq(organizationsTable.id, keyRecord.orgId))
                .limit(1);

            if (!org) {
                throw new AuthenticationError('Organization not found');
            }

            // Update last used timestamp (non-blocking)
            db.update(apiKeysTable)
                .set({ lastUsedAt: new Date() })
                .where(eq(apiKeysTable.id, keyRecord.id))
                .execute()
                .catch(console.error);

            // Attach organization to request
            const authenticatedReq = req as AuthenticatedRequest;
            authenticatedReq.organization = {
                id: org.id,
                name: org.name,
                slug: org.slug,
                planType: org.planType as 'free' | 'pro' | 'enterprise',
                verificationsUsed: org.verificationsUsed,
                verificationsLimit: org.verificationsLimit,
            };
            authenticatedReq.apiKeyId = keyRecord.id;

            // Call the handler
            const response = await handler(authenticatedReq, context);

            // Add request ID header
            response.headers.set('X-Request-ID', requestId);

            return response;
        } catch (error) {
            return createErrorResponse(error, requestId);
        }
    };
}

// =============================================================================
// QUOTA CHECKING MIDDLEWARE
// =============================================================================

/**
 * Middleware that checks and enforces verification quotas
 */
export function withQuotaCheck(handler: ApiHandler): ApiHandler {
    return async (req, context) => {
        const org = req.organization;

        // Check if quota exceeded
        if (org.verificationsUsed >= org.verificationsLimit) {
            throw new QuotaExceededError(
                `Monthly verification limit of ${org.verificationsLimit} exceeded. ` +
                `Upgrade your plan for more verifications.`
            );
        }

        return handler(req, context);
    };
}

// =============================================================================
// RATE LIMITING MIDDLEWARE (In-Memory for MVP)
// =============================================================================

// Simple in-memory rate limiter (replace with Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimitStore() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    rateLimitStore.forEach((value, key) => {
        if (value.resetAt < now) {
            keysToDelete.push(key);
        }
    });
    keysToDelete.forEach((key) => rateLimitStore.delete(key));
}

// Clean up every minute
setInterval(cleanupRateLimitStore, 60000);

/**
 * Middleware that enforces rate limits based on plan
 */
export function withRateLimit(handler: ApiHandler): ApiHandler {
    return async (req, context) => {
        const org = req.organization;
        const planLimits = PLAN_LIMITS[org.planType as PlanType];
        const { windowMs, maxRequests } = planLimits.rateLimit;

        const key = `ratelimit:${org.id}`;
        const now = Date.now();

        let entry = rateLimitStore.get(key);

        if (!entry || entry.resetAt < now) {
            // Create new window
            entry = { count: 0, resetAt: now + windowMs };
            rateLimitStore.set(key, entry);
        }

        entry.count++;

        const remaining = Math.max(0, maxRequests - entry.count);
        const resetAt = entry.resetAt;

        if (entry.count > maxRequests) {
            const retryAfter = Math.ceil((resetAt - now) / 1000);
            const response = new RateLimitError(retryAfter).toResponse();
            response.headers.set('X-RateLimit-Limit', maxRequests.toString());
            response.headers.set('X-RateLimit-Remaining', '0');
            response.headers.set('X-RateLimit-Reset', resetAt.toString());
            response.headers.set('Retry-After', retryAfter.toString());
            return response;
        }

        const response = await handler(req, context);

        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', resetAt.toString());

        return response;
    };
}

// =============================================================================
// METHOD CHECK MIDDLEWARE
// =============================================================================

/**
 * Middleware that checks if requested methods are allowed for the plan
 */
export function withMethodCheck(handler: ApiHandler): ApiHandler {
    return async (req, context) => {
        // Only check for POST requests to /verify
        if (req.method === 'POST') {
            try {
                const body = await req.clone().json();
                const requestedMethods = Object.keys(body.methods || {});
                const planLimits = PLAN_LIMITS[req.organization.planType as PlanType];
                const allowedMethods = planLimits.allowedMethods as readonly string[];

                const disallowedMethods = requestedMethods.filter(
                    (method) => !allowedMethods.includes(method)
                );

                if (disallowedMethods.length > 0) {
                    return NextResponse.json(
                        {
                            error: `Methods not available on ${req.organization.planType} plan`,
                            code: 'METHODS_NOT_ALLOWED',
                            details: {
                                disallowedMethods,
                                allowedMethods: [...allowedMethods],
                                upgradeTo: req.organization.planType === 'free' ? 'pro' : 'enterprise',
                            },
                        },
                        { status: 403 }
                    );
                }
            } catch {
                // If body parsing fails, let validation handle it
            }
        }

        return handler(req, context);
    };
}

// =============================================================================
// ERROR HANDLER MIDDLEWARE
// =============================================================================

/**
 * Middleware that catches errors and returns standardized error responses
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
    return async (req, context) => {
        const requestId = req.headers.get('X-Request-ID') || generateRequestId();

        try {
            return await handler(req, context);
        } catch (error) {
            console.error(`API Error [${requestId}]:`, error);
            return createErrorResponse(error, requestId);
        }
    };
}

// =============================================================================
// LOGGING MIDDLEWARE
// =============================================================================

/**
 * Middleware that logs API requests
 */
export function withLogging(handler: ApiHandler): ApiHandler {
    return async (req, context) => {
        const startTime = Date.now();
        const requestId = req.headers.get('X-Request-ID') || generateRequestId();

        console.log(
            JSON.stringify({
                type: 'api_request',
                requestId,
                method: req.method,
                path: req.nextUrl.pathname,
                orgId: req.organization?.id,
                timestamp: new Date().toISOString(),
            })
        );

        const response = await handler(req, context);
        const duration = Date.now() - startTime;

        console.log(
            JSON.stringify({
                type: 'api_response',
                requestId,
                status: response.status,
                durationMs: duration,
                orgId: req.organization?.id,
                timestamp: new Date().toISOString(),
            })
        );

        return response;
    };
}

// =============================================================================
// COMPOSED MIDDLEWARE
// =============================================================================

/**
 * Compose multiple middleware functions
 */
export function compose<T extends ApiHandler>(...middlewares: Array<(handler: T) => T>): (handler: T) => T {
    return (handler: T) => {
        return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
    };
}

/**
 * Standard API middleware stack for protected endpoints
 */
export function withApiMiddleware(handler: ApiHandler): PublicApiHandler {
    return withApiAuth(
        withErrorHandler(
            withLogging(
                withRateLimit(
                    withQuotaCheck(
                        withMethodCheck(handler)
                    )
                )
            )
        )
    );
}

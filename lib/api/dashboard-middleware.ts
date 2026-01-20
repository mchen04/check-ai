/**
 * Dashboard API Middleware
 * Session-based authentication and permission checking for dashboard routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext, checkPermission, type UserOrgContext } from '@/lib/rbac/get-user-org';
import type { Permission } from '@/lib/rbac/permissions';
import { createLogger } from '@/lib/logger';

const log = createLogger('API');

// =============================================================================
// TYPES
// =============================================================================

export interface DashboardRequest extends NextRequest {
  context: UserOrgContext;
}

export type DashboardHandler<TParams = Record<string, string>> = (
  req: DashboardRequest,
  routeContext?: { params: Promise<TParams> }
) => Promise<Response>;

// Note: Next.js 15 requires the route context type to not allow undefined for the second parameter
// We use a union type that allows both the context object and void (for internal handler calls)
export type PublicDashboardHandler<TParams = Record<string, string>> = (
  req: NextRequest,
  routeContext: { params: Promise<TParams> }
) => Promise<Response>;

export interface DashboardMiddlewareOptions {
  permission?: Permission;
  requireProPlan?: boolean;
}

// =============================================================================
// ERROR RESPONSES
// =============================================================================

function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function forbiddenResponse(reason: string): NextResponse {
  return NextResponse.json({ error: reason }, { status: 403 });
}

function errorResponse(error: unknown): NextResponse {
  log.error({ err: error }, 'Dashboard API error');
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Dashboard authentication and authorization middleware
 *
 * @param handler - The route handler function
 * @param options - Optional permission and plan requirements
 * @returns Wrapped handler that checks auth and permissions
 *
 * @example
 * // Simple auth only
 * export const GET = withDashboardAuth(async (req) => {
 *   const { context } = req;
 *   return NextResponse.json({ data: ... });
 * });
 *
 * @example
 * // With permission check
 * export const POST = withDashboardAuth(async (req) => {
 *   // Only reaches here if user has webhooks:create permission
 * }, { permission: 'webhooks:create' });
 *
 * @example
 * // With Pro plan requirement
 * export const GET = withDashboardAuth(async (req) => {
 *   // Only for Pro/Enterprise users
 * }, { permission: 'settings:view', requireProPlan: true });
 */
export function withDashboardAuth<TParams = Record<string, string>>(
  handler: DashboardHandler<TParams>,
  options: DashboardMiddlewareOptions = {}
): PublicDashboardHandler<TParams> {
  return async (req: NextRequest, routeContext: { params: Promise<TParams> }) => {
    try {
      // Get authenticated user context
      const context = await getUserOrgContext();
      if (!context) {
        return unauthorizedResponse();
      }

      // Check permission if specified
      if (options.permission) {
        const { allowed, reason } = checkPermission(
          context,
          options.permission,
          options.requireProPlan
        );
        if (!allowed) {
          return forbiddenResponse(reason || 'Insufficient permissions');
        }
      } else if (options.requireProPlan) {
        // Check plan without specific permission
        if (context.organization.planType === 'free') {
          return forbiddenResponse('This feature requires a Pro plan');
        }
      }

      // Attach context to request
      const dashboardReq = req as DashboardRequest;
      dashboardReq.context = context;

      // Call handler
      return await handler(dashboardReq, routeContext);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * Convenience wrapper for read-only endpoints
 * Requires user to be authenticated but no specific permission
 */
export function withDashboardRead<TParams = Record<string, string>>(
  handler: DashboardHandler<TParams>
): PublicDashboardHandler<TParams> {
  return withDashboardAuth(handler);
}

/**
 * Convenience wrapper for endpoints requiring org view permission
 */
export function withOrgView<TParams = Record<string, string>>(
  handler: DashboardHandler<TParams>
): PublicDashboardHandler<TParams> {
  return withDashboardAuth(handler, { permission: 'org:view' });
}

/**
 * Convenience wrapper for endpoints requiring org update permission
 */
export function withOrgUpdate<TParams = Record<string, string>>(
  handler: DashboardHandler<TParams>
): PublicDashboardHandler<TParams> {
  return withDashboardAuth(handler, { permission: 'org:update' });
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { UserOrgContext, Permission } from '@/lib/rbac';

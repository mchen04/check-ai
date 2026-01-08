/**
 * API Module Exports
 */

// Types
export * from './types';

// Errors
export * from './errors';

// Mappers (service-to-API type conversion)
export * from './mappers';

// Middleware
export {
  withApiAuth,
  withQuotaCheck,
  withRateLimit,
  withMethodCheck,
  withErrorHandler,
  withLogging,
  withApiMiddleware,
  compose,
} from './middleware';

// Dashboard Middleware
export {
  withDashboardAuth,
  withDashboardRead,
  withOrgView,
  withOrgUpdate,
  type DashboardRequest,
  type DashboardHandler,
  type PublicDashboardHandler,
  type DashboardMiddlewareOptions,
} from './dashboard-middleware';

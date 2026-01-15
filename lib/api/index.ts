/**
 * API Module Exports
 */

// Types and Utilities
export * from './types';

// Formatters
export * from './formatters';

// Validation
export * from './validation';

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

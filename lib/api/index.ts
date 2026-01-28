/**
 * API Module Exports
 */

// Types and Utilities - Named exports for tree-shaking
export {
  methodsConfigSchema,
  type MethodsConfig,
  type Verdict,
  type Decision,
  type InternalParadigmResult,
  type ApiKeyConfiguration,
  type AuthenticatedRequest,
  verifyRequestSchema,
  type VerifyRequest,
  type ParadigmResult,
  type VerifyResponse,
  type UsageStats,
  type ApiErrorResponse,
  type ApiRequest,
  type ApiHandler,
  type PublicApiHandler,
  type VerificationStatus,
  type ApiVerdict,
  type ApiDecision,
  type BatchStatus,
  type BatchItemStatus,
  createBatchSchema,
  type CreateBatchRequest,
  type BatchResponse,
  type BatchItemResponse,
  type WebhookEventType,
  createWebhookSchema,
  type CreateWebhookRequest,
  type WebhookResponse,
  type EscalationStatus,
  type EscalationResolution,
  type EscalationResponse,
  PAGINATION_DEFAULTS,
  type ParsedPagination,
  parsePagination,
  createPaginationResponse,
  type PaginatedResult,
  paginateResults,
  type ApiSuccessResponse,
  type ApiListResponse,
} from './types';

// Formatters - Named exports for tree-shaking
export {
  formatDateToISO,
  formatRequiredDateToISO,
  formatDateForFilename,
  isDateExpired,
  parseDecimal,
  parseDecimalWithDefault,
  parseInteger,
  truncateString,
  nullCoalesce,
  type FormattedVerificationFields,
  formatVerificationForResponse,
  type FormattedParadigmResultFields,
  type FormattedParadigmResultFieldsExtended,
  formatParadigmResultForResponse,
  formatParadigmResultExtendedForResponse,
  type FormattedWebhookListItem,
  formatWebhookForResponse,
  type FormattedWebhookDelivery,
  formatWebhookDeliveryForResponse,
} from './formatters';

// Validation - Named exports for tree-shaking
export {
  type ValidationResult,
  parseJsonBodyOrThrow,
  parseAndValidateOrThrow,
  parseAndValidate,
  validate,
  createValidationErrorResponse,
  errorResponse,
  successResponse,
  validateEnumParam,
  type RouteContext,
  extractRouteParam,
  assertOrgOwnership,
} from './validation';

// Errors - Named exports for tree-shaking
export {
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  QuotaExceededError,
  MethodNotAllowedError,
  PayloadTooLargeError,
  UnprocessableEntityError,
  ServiceUnavailableError,
  InternalServerError,
  createErrorResponse,
} from './errors';

// Mappers - Named exports for tree-shaking
export {
  type ServiceErrorType,
  type ServiceError,
  mapServiceErrorToApiError,
  mapVerifyServiceError,
  throwApiError,
  throwVerifyApiError,
  mapParadigmResultToApi,
  type VerificationMapOptions,
  mapVerificationToApiResponse,
} from './mappers';

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

// Cron Middleware
export {
  validateCronAuth,
  createCronHandlers,
  cronLog,
  type CronEndpointDocs,
  type CronHandler,
} from './cron-middleware';

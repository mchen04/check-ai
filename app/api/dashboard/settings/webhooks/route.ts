import { NextResponse } from 'next/server';
import {
  withDashboardAuth,
  DashboardRequest,
  parseAndValidate,
  formatRequiredDateToISO,
  formatWebhookForResponse,
} from '@/lib/api';
import { generateSigningSecret, listWebhooks, createWebhook } from '@/lib/webhooks';
import { createAuditLogger } from '@/lib/audit';
import { CreateWebhookSchema } from '@/lib/constants';

// =============================================================================
// GET - List all webhooks for organization
// =============================================================================

export const GET = withDashboardAuth(async (req: DashboardRequest) => {
  const { context } = req;

  const webhooks = await listWebhooks(context.orgId);

  return NextResponse.json({
    webhooks: webhooks.map(formatWebhookForResponse),
    canEdit: context.role === 'owner' || context.role === 'admin',
  });
}, { permission: 'webhooks:view' });

// =============================================================================
// POST - Create new webhook
// =============================================================================

export const POST = withDashboardAuth(async (req: DashboardRequest) => {
  const { context } = req;
  const audit = createAuditLogger(context, req);

  // Parse and validate using shared helper
  const result = await parseAndValidate(req, CreateWebhookSchema);
  if (!result.success) return result.error;

  const { url, events, description } = result.data;

  // Generate signing secret and create webhook using repository
  const signingSecret = generateSigningSecret();
  const webhook = await createWebhook({
    orgId: context.orgId,
    url,
    events,
    description,
    signingSecret,
  });

  audit.log({
    eventType: 'webhook.created',
    description: `Webhook created for ${url}`,
    resourceType: 'webhook',
    resourceId: webhook.id,
    changes: { after: { url, events, description } },
  });

  return NextResponse.json({
    success: true,
    webhook: {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      description: webhook.description,
      isActive: webhook.isActive,
      createdAt: formatRequiredDateToISO(webhook.createdAt),
    },
    signingSecret, // Only returned on creation!
  });
}, { permission: 'webhooks:create' });

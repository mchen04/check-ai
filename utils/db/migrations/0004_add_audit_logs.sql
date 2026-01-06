-- Migration: Add audit_logs table for tracking security-relevant events
-- This migration creates comprehensive audit logging infrastructure

-- Create the audit event type enum
DO $$ BEGIN
    CREATE TYPE audit_event_type AS ENUM (
        -- API Key events
        'api_key.created',
        'api_key.deleted',

        -- Team member events
        'team_member.invited',
        'team_member.invite_revoked',
        'team_member.joined',
        'team_member.removed',
        'team_member.role_changed',

        -- Webhook events
        'webhook.created',
        'webhook.updated',
        'webhook.deleted',

        -- Organization settings events
        'org.settings_updated',

        -- Escalation events
        'escalation.resolved',
        'escalation.dismissed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users_table(id) ON DELETE SET NULL,
    event_type audit_event_type NOT NULL,
    description TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    changes JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_event_created ON audit_logs(org_id, event_type, created_at DESC);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for security-relevant events';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object with before/after values for updates';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context like IP address, user agent';

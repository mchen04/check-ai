-- Migration: Add org_invites table for team invitation system
-- Created: 2024

-- Create invite status enum
DO $$ BEGIN
  CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create org_invites table
CREATE TABLE IF NOT EXISTS org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT REFERENCES users_table(id) ON DELETE SET NULL,
  status invite_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP
);

-- Index for token lookups (used in accept-invite flow)
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites(token);

-- Index for finding pending invites by email
CREATE INDEX IF NOT EXISTS idx_org_invites_email_status ON org_invites(email, status);

-- Index for listing invites by org
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON org_invites(org_id);

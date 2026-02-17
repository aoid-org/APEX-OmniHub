-- ============================================================
-- Migration:  20260217000000_init_byom_cockpit_phase1.sql
-- Project:    APEX OmniHub — Project COCKPIT (BYOM Architecture)
-- Phase:      Phase 1 — Credential Vault + Session Management
-- Version:    1.0.0
-- Date:       2026-02-17
-- Author:     APEX Business Systems Engineering
-- Reference:  byom 3.md §2B, §7
-- ============================================================
-- Security:   service_role only for mutations; RLS paranoid mode
-- Crypto:     AES-256-GCM encrypted credentials (via CockpitCrypto)
-- Audit:      All BYOM actions logged; NO SECRETS in metadata
-- ============================================================

-- ============================================================
-- ENUMS & TYPES
-- ============================================================

-- Provider enum (Chinese-origin LLMs explicitly excluded)
CREATE TYPE byom_provider AS ENUM ('openai', 'google', 'anthropic', 'xai');

-- Authentication type enum
CREATE TYPE byom_auth_type AS ENUM (
  'api_key',           -- Static API key (OpenAI, Anthropic, xAI)
  'oauth_refresh',     -- OAuth refresh token (Google Gemini)
  'oauth_access',      -- OAuth access token (short-lived)
  'service_account',   -- GCP service account JSON
  'ephemeral'          -- xAI Realtime voice tokens (15min TTL)
);

-- Connection lifecycle status
CREATE TYPE byom_status AS ENUM ('active', 'revoked', 'expired', 'rotated');

-- Data sovereignty modes
CREATE TYPE byom_sovereignty_mode AS ENUM (
  'standard',          -- Normal logging (hashes only)
  'byom_sovereign',    -- Zero prompt/response logging
  'strict_region'      -- + Geo-enforcement
);


-- ============================================================
-- TABLE 1: provider_connections (Credential Vault)
-- ============================================================

CREATE TABLE public.provider_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider byom_provider NOT NULL,
  auth_type byom_auth_type NOT NULL,

  -- Encrypted credential (AES-256-GCM via CockpitCrypto)
  -- Format: [IV (12 bytes) || Ciphertext || Auth Tag (16 bytes)]
  credential_ciphertext BYTEA NOT NULL,

  -- SHA-256 hash for collision detection (NOT reversible)
  credential_fingerprint TEXT NOT NULL,

  -- OAuth scopes or API permissions (provider-specific)
  scopes_or_permissions JSONB DEFAULT '{}',

  -- Lifecycle
  status byom_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  token_expires_at TIMESTAMPTZ,  -- For OAuth tokens
  rotation_version INT DEFAULT 1,

  -- User-visible hint (last 4-6 chars ONLY; max 10 per constraint)
  key_hint TEXT CHECK (length(key_hint) <= 10)
);

-- Partial unique index: only one active connection per provider per user
CREATE UNIQUE INDEX idx_unique_active_provider_per_user
  ON public.provider_connections (user_id, provider)
  WHERE status = 'active';

-- Performance indexes
CREATE INDEX idx_provider_connections_tenant ON public.provider_connections(tenant_id);
CREATE INDEX idx_provider_connections_user ON public.provider_connections(user_id);
CREATE INDEX idx_provider_connections_fingerprint ON public.provider_connections(credential_fingerprint);


-- ============================================================
-- TABLE 2: pilot_sessions (Ephemeral Runtime Binding)
-- ============================================================

CREATE TABLE public.pilot_sessions (
  pilot_session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.provider_connections(connection_id),
  trace_id UUID NOT NULL,              -- Maps to agent_runs.id for audit trail
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL,

  -- Model selection
  model TEXT NOT NULL,                  -- e.g., "gpt-4o", "claude-sonnet-4.5"

  -- Data sovereignty configuration
  sovereignty_mode byom_sovereignty_mode DEFAULT 'standard',

  -- Immutable policy snapshot (SHA-256 of OmniPolicy at mint time)
  -- Ensures audit trail of which rules were active for this session
  policy_snapshot_hash TEXT NOT NULL,

  -- Lifecycle
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,      -- Typical: 1 hour
  revoked_at TIMESTAMPTZ,

  -- Constraints
  CHECK (expires_at > issued_at),
  CHECK (revoked_at IS NULL OR revoked_at >= issued_at)
);

-- Performance indexes
CREATE INDEX idx_pilot_sessions_connection ON public.pilot_sessions(connection_id);
CREATE INDEX idx_pilot_sessions_trace ON public.pilot_sessions(trace_id);
CREATE INDEX idx_pilot_sessions_user ON public.pilot_sessions(user_id);

-- Active sessions index (excludes revoked)
CREATE INDEX idx_pilot_sessions_active
  ON public.pilot_sessions(connection_id, expires_at)
  WHERE revoked_at IS NULL;


-- ============================================================
-- RLS POLICIES (Paranoid Mode)
-- ============================================================

-- provider_connections: service_role bypasses RLS; users see sanitized data
ALTER TABLE public.provider_connections ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can SELECT own connections
-- (credential_ciphertext excluded via safe view below)
CREATE POLICY "Users view own connections"
  ON public.provider_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Users can UPDATE to revoke own connections ONLY
CREATE POLICY "Users revoke own connections"
  ON public.provider_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (status = 'revoked' AND auth.uid() = user_id);

-- Policy 3: Users can DELETE own connections
CREATE POLICY "Users delete own connections"
  ON public.provider_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- CRITICAL: Safe view that EXCLUDES credential_ciphertext
-- Frontend must use this view, never the raw table
CREATE VIEW public.user_provider_connections_safe WITH (security_barrier) AS
  SELECT
    connection_id,
    provider,
    auth_type,
    status,
    key_hint,
    created_at,
    updated_at,
    last_used_at,
    token_expires_at,
    rotation_version
  FROM public.provider_connections
  WHERE user_id = auth.uid();

-- pilot_sessions: Users can view own sessions (read-only)
ALTER TABLE public.pilot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions"
  ON public.pilot_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);


-- ============================================================
-- AUDIT INTEGRATION
-- ============================================================

-- Extend audit_logs with NO SECRETS constraint
-- audit_logs.action_type is TEXT, so BYOM actions use 'byom.*' prefix
-- No enum alteration needed (action_type is free text)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_no_secrets'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_no_secrets
      CHECK (
        metadata IS NULL
        OR metadata::text !~* 'api[_-]?key|secret[^s]|password|bearer\s|sk-[a-zA-Z0-9]'
      );
  END IF;
END
$$;


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_byom_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER trg_provider_connections_updated_at
  BEFORE UPDATE ON public.provider_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_byom_updated_at();


-- ============================================================
-- TABLE COMMENTS (Documentation)
-- ============================================================

COMMENT ON TABLE public.provider_connections IS
  'Encrypted vault for user-provided LLM API credentials. Credentials encrypted via AES-256-GCM with per-tenant DEK derived from HKDF-SHA256. Part of BYOM Cockpit Phase 1.';

COMMENT ON COLUMN public.provider_connections.credential_ciphertext IS
  'AES-256-GCM encrypted credential. Wire format: [IV (12 bytes) || Ciphertext || Auth Tag (16 bytes)]. NEVER exposed to frontend.';

COMMENT ON COLUMN public.provider_connections.credential_fingerprint IS
  'SHA-256 hex hash of plaintext credential for collision detection and audit. NOT reversible to plaintext.';

COMMENT ON TABLE public.pilot_sessions IS
  'Ephemeral runtime sessions binding a user credential to a specific agent execution trace. Includes immutable policy snapshot hash for compliance audit. Part of BYOM Cockpit Phase 1.';

COMMENT ON COLUMN public.pilot_sessions.policy_snapshot_hash IS
  'SHA-256 hash of OmniPolicy JSON at session mint time. Immutable audit trail of which safety rules were active during this session.';


-- END MIGRATION: 20260217000000_init_byom_cockpit_phase1.sql

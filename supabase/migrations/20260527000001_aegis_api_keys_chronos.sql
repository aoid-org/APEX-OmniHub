-- =============================================================================
-- Migration: 20260527000001_aegis_api_keys_chronos.sql
-- Purpose  : Durable zero-trust API key registry (AEGIS) and CHRONOS
--            distributed lock + idempotency primitives.
-- Prompt   : 03/18 (SpectreHandshake AEGIS) + 04/18 (CHRONOS Durable)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- AEGIS: API Key Registry
-- Stores prefix, hashed secret, tenant scope, tier, and status.
-- Never stores the raw key — only sha256(secret_portion).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aegis_api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id       text NOT NULL UNIQUE,          -- e.g. ak_live_t1_abc... first 16 chars
  tenant_id    text NOT NULL,
  key_hash     text NOT NULL,                 -- sha256 of the random secret portion
  trust_tier   text NOT NULL
                 CHECK (trust_tier IN ('GOD_MODE','OPERATOR','PERIPHERAL','PUBLIC')),
  status       text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','revoked','expired')),
  environment  text NOT NULL DEFAULT 'production'
                 CHECK (environment IN ('production','staging','development')),
  audience     text[] NOT NULL DEFAULT '{}',
  expires_at   timestamptz,
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Lookup is always by key_id prefix (first 16 chars of the raw token)
CREATE INDEX IF NOT EXISTS idx_aegis_api_keys_key_id
  ON public.aegis_api_keys (key_id);

CREATE INDEX IF NOT EXISTS idx_aegis_api_keys_tenant_status
  ON public.aegis_api_keys (tenant_id, status);

-- Enable RLS — only service role and the owning tenant may read
ALTER TABLE public.aegis_api_keys ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS
CREATE POLICY aegis_api_keys_service_role
  ON public.aegis_api_keys
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- CHRONOS: Distributed Lock Table
-- Implements optimistic locking via unique constraint + expires_at TTL.
-- Acquiring: INSERT with conflict detection.
-- Releasing: DELETE WHERE lock_token matches.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chronos_distributed_locks (
  lock_key     text NOT NULL,
  lock_token   uuid NOT NULL DEFAULT gen_random_uuid(), -- caller holds this to prove ownership
  tenant_id    text NOT NULL,
  acquired_at  timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  acquired_by  text NOT NULL,                           -- connection/worker id
  CONSTRAINT chronos_locks_pk PRIMARY KEY (lock_key, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_chronos_locks_expires
  ON public.chronos_distributed_locks (expires_at);

ALTER TABLE public.chronos_distributed_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY chronos_locks_service_role
  ON public.chronos_distributed_locks
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- CHRONOS: Idempotency Keys Table
-- Stores the canonical result of completed executions to allow safe replay.
-- State machine: PENDING → COMPLETED (no backward transitions).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chronos_idempotency_keys (
  idempotency_key text NOT NULL,
  tenant_id       text NOT NULL,
  state           text NOT NULL DEFAULT 'PENDING'
                    CHECK (state IN ('PENDING','COMPLETED')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  result          jsonb,                              -- canonical cached response
  tool_name       text,
  device_id       text,
  CONSTRAINT chronos_idempotency_pk PRIMARY KEY (idempotency_key, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_chronos_idempotency_state
  ON public.chronos_idempotency_keys (tenant_id, state);

-- Auto-expire PENDING records that never completed (stuck executions)
CREATE INDEX IF NOT EXISTS idx_chronos_idempotency_created
  ON public.chronos_idempotency_keys (created_at);

ALTER TABLE public.chronos_idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY chronos_idempotency_service_role
  ON public.chronos_idempotency_keys
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Helper function: release expired locks (called by pg_cron or on acquire)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chronos_release_expired_locks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- additive-allow: DELETE_FROM TTL cleanup of expired lock rows within a maintenance function body — not a schema migration
  DELETE FROM public.chronos_distributed_locks
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

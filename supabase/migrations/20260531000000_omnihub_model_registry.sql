-- Migration: omnihub_model_registry
-- Purpose: Per-tenant BYOM (Bring Your Own Model) governance registry.
--          Defines which AI providers, models, and budget caps are allowed per tenant.
--          Replaces hardcoded mock config in supabase/functions/byom-proxy/index.ts.

CREATE TABLE IF NOT EXISTS public.omnihub_model_registry (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id          text        NOT NULL CHECK (provider_id IN ('openai', 'xai', 'anthropic', 'google')),
  provider_type        text        NOT NULL DEFAULT 'openai-compatible'
                                   CHECK (provider_type IN ('openai-compatible', 'anthropic-compatible', 'local-http', 'disabled')),
  allowed_models       text[]      NOT NULL DEFAULT ARRAY['gpt-4o'],
  max_cost_usd         numeric(10,4) NOT NULL DEFAULT 10.0 CHECK (max_cost_usd >= 0),
  max_latency_ms       integer     NOT NULL DEFAULT 30000 CHECK (max_latency_ms BETWEEN 100 AND 600000),
  retention_mode       text        NOT NULL DEFAULT 'ephemeral'
                                   CHECK (retention_mode IN ('ephemeral', 'persistent', 'audit-only')),
  pii_policy           text        NOT NULL DEFAULT 'redact'
                                   CHECK (pii_policy IN ('block', 'redact', 'allow_internal')),
  tool_use_permissions text[]      NOT NULL DEFAULT ARRAY['none'],
  auth_secret_ref      text        NOT NULL,
  endpoint             text,
  is_active            boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_id)
);

COMMENT ON TABLE public.omnihub_model_registry IS
  'Per-tenant BYOM governance: controls which providers and models each tenant may '
  'use through the byom-proxy Edge Function, along with budget caps and data policies.';

CREATE INDEX IF NOT EXISTS idx_omnihub_model_registry_tenant
  ON public.omnihub_model_registry(tenant_id, is_active);

ALTER TABLE public.omnihub_model_registry ENABLE ROW LEVEL SECURITY;

-- Only service role can manage registry entries (admin provisioning)
CREATE POLICY "Service role full access to model registry"
  ON public.omnihub_model_registry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenants can read their own registry entries (for UI display)
CREATE POLICY "Tenant reads own model registry"
  ON public.omnihub_model_registry
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.update_omnihub_model_registry_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_omnihub_model_registry_updated_at
  BEFORE UPDATE ON public.omnihub_model_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.update_omnihub_model_registry_updated_at();

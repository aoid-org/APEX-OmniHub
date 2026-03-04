-- APEX-OmniHub: Security Incidents Table (24-Month Retention)
-- Migration: Split retention classes — audit_logs (90d) vs security_incidents (24mo)
--
-- COMPLIANCE:
--   - PIPEDA breach regs: mandatory 24-month retention for breach records
--   - Append-only: no UPDATE/DELETE for authenticated users
--   - Tenant-scoped via tenant_id + RLS
--
-- RETENTION MATRIX:
--   audit_logs          → 90 days  (auto-cleanup via cleanup_old_audit_logs)
--   security_incidents  → 24 months (auto-cleanup via cleanup_old_security_incidents)
--   idempotency_receipts → 30 days  (auto-cleanup via pg_cron)

CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant
  tenant_id UUID NOT NULL,

  -- Actor
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id UUID,

  -- Incident classification
  incident_type TEXT NOT NULL CHECK (
    incident_type IN (
      'breach_detected',
      'unauthorized_access',
      'data_exfiltration_attempt',
      'memory_poisoning',
      'device_trust_violation',
      'rate_limit_exceeded',
      'injection_attempt',
      'policy_violation',
      'account_compromise'
    )
  ),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (
    severity IN ('critical', 'high', 'medium', 'low', 'info')
  ),

  -- Details
  summary TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  source_ip INET,

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamp (immutable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_security_incidents_tenant
  ON public.security_incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_type
  ON public.security_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity
  ON public.security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created
  ON public.security_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_incidents_actor
  ON public.security_incidents(actor_id)
  WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_incidents_unresolved
  ON public.security_incidents(created_at DESC)
  WHERE resolved_at IS NULL;

-- RLS
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- Authenticated users: read-only, own tenant only, no UPDATE/DELETE
CREATE POLICY security_incidents_user_select
  ON public.security_incidents
  FOR SELECT TO authenticated
  USING (
    tenant_id = (
      (current_setting('request.jwt.claims', true)::jsonb)
      ->> 'tenant_id'
    )::uuid
  );

-- INSERT allowed (for logging from client-side detection)
CREATE POLICY security_incidents_user_insert
  ON public.security_incidents
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (
      (current_setting('request.jwt.claims', true)::jsonb)
      ->> 'tenant_id'
    )::uuid
  );

-- No UPDATE/DELETE policies for authenticated = append-only

-- Service role: full access
CREATE POLICY security_incidents_service_role
  ON public.security_incidents
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 24-month retention cleanup (PIPEDA breach reg compliance)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_incidents()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.security_incidents
  WHERE created_at < NOW() - INTERVAL '24 months';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Comments
COMMENT ON TABLE public.security_incidents IS
  'PIPEDA-compliant security incident log. 24-month mandatory '
  'retention. Append-only for authenticated users.';
COMMENT ON FUNCTION public.cleanup_old_security_incidents IS
  'Removes incidents older than 24 months. Run via pg_cron monthly.';

-- Permissions
GRANT SELECT, INSERT ON public.security_incidents TO authenticated;
GRANT ALL ON public.security_incidents TO service_role;

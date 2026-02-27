-- Migration: JWT-Based RLS Policies (Zero-Latency)
-- Dependencies: 20260227000002_tenant_enforcement.sql
-- Rollback: DROP POLICY <policy_names>; Restore legacy policies.

BEGIN;

-- Drop legacy RLS policies
DROP POLICY IF EXISTS idempotency_receipts_tenant_isolation ON public.idempotency_receipts;
DROP POLICY IF EXISTS idempotency_receipts_service_role ON public.idempotency_receipts;

-- Install O(1) JWT-based policies (NO database lookups)
CREATE POLICY tenant_isolation_jwt ON public.idempotency_receipts
  FOR ALL
  USING (
    tenant_id::text IN (
      SELECT jsonb_array_elements_text(
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' -> 'tenants')::jsonb
      ) #>> '{tenant_id}'
    )
  );

CREATE POLICY service_role_bypass ON public.idempotency_receipts
  FOR ALL
  TO service_role
  USING (true);

-- Repeat for audit_logs
DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;

CREATE POLICY tenant_isolation_jwt ON public.audit_logs
  FOR ALL
  USING (
    tenant_id::text IN (
      SELECT jsonb_array_elements_text(
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' -> 'tenants')::jsonb
      ) #>> '{tenant_id}'
    )
  );

CREATE POLICY service_role_bypass ON public.audit_logs
  FOR ALL
  TO service_role
  USING (true);

-- Repeat for man_tasks
DROP POLICY IF EXISTS man_tasks_rls ON public.man_tasks;

CREATE POLICY tenant_isolation_jwt ON public.man_tasks
  FOR ALL
  USING (
    tenant_id::text IN (
      SELECT jsonb_array_elements_text(
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' -> 'tenants')::jsonb
      ) #>> '{tenant_id}'
    )
  );

CREATE POLICY service_role_bypass ON public.man_tasks
  FOR ALL
  TO service_role
  USING (true);

-- Repeat for omnitrace_runs
CREATE POLICY tenant_isolation_jwt ON public.omnitrace_runs
  FOR ALL
  USING (
    tenant_id::text IN (
      SELECT jsonb_array_elements_text(
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' -> 'tenants')::jsonb
      ) #>> '{tenant_id}'
    )
  );

CREATE POLICY service_role_bypass ON public.omnitrace_runs
  FOR ALL
  TO service_role
  USING (true);

-- Repeat for omnitrace_events
CREATE POLICY tenant_isolation_jwt ON public.omnitrace_events
  FOR ALL
  USING (
    tenant_id::text IN (
      SELECT jsonb_array_elements_text(
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' -> 'tenants')::jsonb
      ) #>> '{tenant_id}'
    )
  );

CREATE POLICY service_role_bypass ON public.omnitrace_events
  FOR ALL
  TO service_role
  USING (true);

-- Enable RLS on all tables
ALTER TABLE public.idempotency_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.man_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnitrace_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnitrace_events ENABLE ROW LEVEL SECURITY;

RAISE NOTICE '✓ Phase 4 Complete: JWT-based RLS policies active. Zero database lookups.';

COMMIT;
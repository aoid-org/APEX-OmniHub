-- ============================================================================
-- Migration: 20260302000000_financial_automation_core.sql
-- Purpose:   Financial Automation Layer — invoices + compliance_records
--            Zero-Trust tenant isolation via JWT tenant_id claim
-- Author:    APEX Business Systems Engineering
-- Date:      2026-03-02
-- ============================================================================
-- Constraints:
--   - auth.jwt() ->> 'tenant_id' = data_owner_id (exact match, no bypass)
--   - No SECURITY DEFINER shortcuts
--   - No service_role RLS bypass policies
--   - IMMUTABLE helper function pattern (byom_status_default precedent)
--   - Finance amounts stored as integer cents (no floating point)
-- ============================================================================

-- ── Helper: deterministic JWT tenant claim extractor ─────────────────────────
-- IMMUTABLE function pattern: a single read-only SQL function for re-use.
-- auth.jwt() is session-stable within a single transaction.
CREATE OR REPLACE FUNCTION public.apex_jwt_tenant_id()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
AS $$
  SELECT COALESCE(auth.jwt() ->> 'tenant_id', '')
$$;

COMMENT ON FUNCTION public.apex_jwt_tenant_id() IS
  'Returns the tenant_id claim from the current session JWT. '
  'Empty string when claim is absent. Used by RLS policies.';

-- ── invoices ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoices (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  tenant_id       text        NOT NULL,
  data_owner_id   text        NOT NULL,
  amount_cents    bigint      NOT NULL CHECK (amount_cents >= 0),
  currency        text        NOT NULL DEFAULT 'CAD'
                              CHECK (currency ~ '^[A-Z]{3}$'),
  status          text        NOT NULL DEFAULT 'draft'
                              CHECK (status IN (
                                'draft', 'pending', 'paid', 'void', 'cancelled'
                              )),
  line_items      jsonb,
  bridge_payload  jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE public.invoices IS
  'Tenant-isolated invoice records. '
  'data_owner_id MUST equal auth.jwt() tenant_id for access.';

COMMENT ON COLUMN public.invoices.amount_cents IS
  'Total invoice amount in integer cents — no floating point.';

COMMENT ON COLUMN public.invoices.bridge_payload IS
  'Last BridgePayload snapshot from the Semantic Bridge.';

-- Enable RLS — default-deny for anon/authenticated without matching policy
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "invoices_tenant_select"
  ON public.invoices
  FOR SELECT
  USING (public.apex_jwt_tenant_id() = data_owner_id);

-- INSERT policy — caller may only write their own tenant's rows
CREATE POLICY "invoices_tenant_insert"
  ON public.invoices
  FOR INSERT
  WITH CHECK (public.apex_jwt_tenant_id() = data_owner_id);

-- UPDATE policy
CREATE POLICY "invoices_tenant_update"
  ON public.invoices
  FOR UPDATE
  USING  (public.apex_jwt_tenant_id() = data_owner_id)
  WITH CHECK (public.apex_jwt_tenant_id() = data_owner_id);

-- DELETE policy
CREATE POLICY "invoices_tenant_delete"
  ON public.invoices
  FOR DELETE
  USING (public.apex_jwt_tenant_id() = data_owner_id);

-- ── compliance_records ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.compliance_records (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  tenant_id       text        NOT NULL,
  data_owner_id   text        NOT NULL,
  record_type     text        NOT NULL,
  classification  text        NOT NULL DEFAULT 'INTERNAL'
                              CHECK (classification IN (
                                'PUBLIC', 'INTERNAL', 'SENSITIVE', 'CRITICAL'
                              )),
  content         jsonb       NOT NULL DEFAULT '{}',
  audit_hash      text,
  bridge_payload  jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE public.compliance_records IS
  'Tenant-isolated compliance audit records. '
  'data_owner_id MUST equal auth.jwt() tenant_id for access.';

COMMENT ON COLUMN public.compliance_records.audit_hash IS
  'SHA-256 hash of the record content for tamper detection.';

-- Enable RLS
ALTER TABLE public.compliance_records ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "compliance_tenant_select"
  ON public.compliance_records
  FOR SELECT
  USING (public.apex_jwt_tenant_id() = data_owner_id);

-- INSERT policy
CREATE POLICY "compliance_tenant_insert"
  ON public.compliance_records
  FOR INSERT
  WITH CHECK (public.apex_jwt_tenant_id() = data_owner_id);

-- UPDATE policy
CREATE POLICY "compliance_tenant_update"
  ON public.compliance_records
  FOR UPDATE
  USING  (public.apex_jwt_tenant_id() = data_owner_id)
  WITH CHECK (public.apex_jwt_tenant_id() = data_owner_id);

-- DELETE policy
CREATE POLICY "compliance_tenant_delete"
  ON public.compliance_records
  FOR DELETE
  USING (public.apex_jwt_tenant_id() = data_owner_id);

-- ── Performance indexes ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_invoices_data_owner
  ON public.invoices (data_owner_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON public.invoices (status)
  WHERE status NOT IN ('paid', 'void', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_compliance_data_owner
  ON public.compliance_records (data_owner_id);

CREATE INDEX IF NOT EXISTS idx_compliance_classification
  ON public.compliance_records (classification);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.apex_set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.apex_set_updated_at() IS
  'Generic trigger to refresh updated_at on any modified row.';

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.apex_set_updated_at();

CREATE TRIGGER trg_compliance_records_updated_at
  BEFORE UPDATE ON public.compliance_records
  FOR EACH ROW EXECUTE FUNCTION public.apex_set_updated_at();

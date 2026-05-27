-- Migrate idempotency_receipts tenant isolation away from session settings.
-- Uses JWT app_metadata.tenant_id via SECURITY DEFINER helper.

BEGIN;

-- 1) SECURITY DEFINER helper with hardened search_path.
CREATE OR REPLACE FUNCTION public.current_tenant_id_from_jwt()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  jwt_claims jsonb;
  tenant_id text;
BEGIN
  jwt_claims := auth.jwt();

  IF jwt_claims IS NULL THEN
    RETURN NULL;
  END IF;

  tenant_id := jwt_claims -> 'app_metadata' ->> 'tenant_id';
  RETURN NULLIF(tenant_id, '');
END;
$$;

-- additive-allow: REVOKE Hardening function execution permissions
REVOKE ALL ON FUNCTION public.current_tenant_id_from_jwt() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_tenant_id_from_jwt() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_tenant_id_from_jwt() TO service_role;

-- 2) Replace policies that depended on current_setting('app.current_tenant', TRUE).
-- additive-allow: DROP_POLICY Re-creating tenant isolation policy additively
DROP POLICY IF EXISTS idempotency_receipts_tenant_isolation ON public.idempotency_receipts;
-- additive-allow: DROP_POLICY Re-creating service role policy additively
DROP POLICY IF EXISTS idempotency_receipts_service_role ON public.idempotency_receipts;

-- Tenant-scoped policy sourced from JWT tenant_id (no SET LOCAL app.current_tenant required).
CREATE POLICY idempotency_receipts_tenant_isolation
  ON public.idempotency_receipts
  FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id_from_jwt())
  WITH CHECK (tenant_id = public.current_tenant_id_from_jwt());

-- Explicit and minimal service-role override.
CREATE POLICY idempotency_receipts_service_role
  ON public.idempotency_receipts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;

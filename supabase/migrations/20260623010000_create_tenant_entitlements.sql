-- ============================================================================
-- MIGRATION: Tenant-scoped OmniConnect entitlements
-- ============================================================================
-- Purpose:
-- - Back the OmniConnect EntitlementsService contract with a real table.
-- - Preserve tenant/user/app/feature scoping without overloading Web3
--   public.entitlements or UEP public.user_entitlements domains.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  app_id text NOT NULL,
  feature_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tenant_entitlements_tenant_id_not_empty CHECK (length(btrim(tenant_id)) > 0),
  CONSTRAINT tenant_entitlements_app_id_not_empty CHECK (length(btrim(app_id)) > 0),
  CONSTRAINT tenant_entitlements_feature_key_not_empty CHECK (length(btrim(feature_key)) > 0)
);

DO $$
BEGIN
  ALTER TABLE public.tenant_entitlements
    ADD CONSTRAINT tenant_entitlements_unique_feature
    UNIQUE (tenant_id, user_id, app_id, feature_key);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_entitlements_user
  ON public.tenant_entitlements(user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_entitlements_tenant_user_active
  ON public.tenant_entitlements(tenant_id, user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_entitlements_lookup_active
  ON public.tenant_entitlements(tenant_id, user_id, app_id, feature_key)
  WHERE is_active = true;

ALTER TABLE public.tenant_entitlements ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.tenant_entitlements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_entitlements TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_entitlements'
      AND policyname = 'Users can view own tenant entitlements'
  ) THEN
    CREATE POLICY "Users can view own tenant entitlements"
      ON public.tenant_entitlements
      FOR SELECT
      TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_entitlements'
      AND policyname = 'Service role has full access to tenant entitlements'
  ) THEN
    CREATE POLICY "Service role has full access to tenant entitlements"
      ON public.tenant_entitlements
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_tenant_entitlements_updated_at'
      AND tgrelid = 'public.tenant_entitlements'::regclass
  ) THEN
    CREATE TRIGGER update_tenant_entitlements_updated_at
      BEFORE UPDATE ON public.tenant_entitlements
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE public.tenant_entitlements IS 'Tenant-scoped OmniConnect feature entitlements by user, app, and feature key';
COMMENT ON COLUMN public.tenant_entitlements.is_active IS 'Soft-revocation flag; only active rows grant access';

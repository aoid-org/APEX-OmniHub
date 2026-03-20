-- =============================================================================
-- Enterprise Auth & Tenant Isolation (USO Phase 6 — OmniBridge)
--
-- Creates the enterprise tenancy model with strict Row-Level Security (RLS)
-- for multi-tenant isolation. Supports SAML 2.0 and OIDC identity providers
-- mapped to Postgres RLS policies.
--
-- Tables:
--   enterprise_tenants     — Top-level tenant registry
--   tenant_memberships     — User-to-tenant role mappings
--
-- RLS Policies:
--   - Users can only see tenants they belong to
--   - Users can only see their own memberships
--   - Tenant admins can manage memberships for their tenant
--   - Service role bypasses all RLS (for edge functions)
--
-- APEX Business Systems Ltd. — Proprietary
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. enterprise_tenants — Top-level tenant registry
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.enterprise_tenants (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text        NOT NULL,
  slug          text        UNIQUE NOT NULL,

  -- Identity provider bindings (nullable — not all tenants use SSO)
  saml_provider_id   text   DEFAULT NULL,
  oidc_provider_id   text   DEFAULT NULL,

  -- Metadata
  domain        text        DEFAULT NULL,  -- e.g. 'acme.com' for email domain matching
  is_active     boolean     DEFAULT true NOT NULL,
  metadata      jsonb       DEFAULT '{}' NOT NULL,

  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

-- Index for domain-based tenant lookup (SAML/OIDC email domain matching)
CREATE INDEX IF NOT EXISTS idx_enterprise_tenants_domain
  ON public.enterprise_tenants (domain)
  WHERE domain IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_enterprise_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enterprise_tenants_updated_at ON public.enterprise_tenants;
CREATE TRIGGER trg_enterprise_tenants_updated_at
  BEFORE UPDATE ON public.enterprise_tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_enterprise_tenants_updated_at();

-- ---------------------------------------------------------------------------
-- 2. tenant_memberships — User-to-tenant role mappings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid        NOT NULL REFERENCES public.enterprise_tenants(id) ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'member'
              CHECK (role IN ('admin', 'member', 'viewer')),

  created_at  timestamptz DEFAULT now() NOT NULL,

  -- Each user can only have one role per tenant
  UNIQUE (user_id, tenant_id)
);

-- Index for fast user-based lookups
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user_id
  ON public.tenant_memberships (user_id);

-- Index for fast tenant-based lookups
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant_id
  ON public.tenant_memberships (tenant_id);

-- ---------------------------------------------------------------------------
-- 3. Enable RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.enterprise_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. RLS Policies — enterprise_tenants
-- ---------------------------------------------------------------------------

-- Policy: Users can SELECT tenants they belong to
-- Enforces tenant isolation: a user cannot see tenants they aren't a member of
CREATE POLICY enterprise_tenants_select_own
  ON public.enterprise_tenants
  FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only tenant admins can UPDATE their tenant
CREATE POLICY enterprise_tenants_update_admin
  ON public.enterprise_tenants
  FOR UPDATE
  USING (
    id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 5. RLS Policies — tenant_memberships
-- ---------------------------------------------------------------------------

-- Policy: Users can see their own memberships
CREATE POLICY tenant_memberships_select_own
  ON public.tenant_memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Tenant admins can see all memberships in their tenant
CREATE POLICY tenant_memberships_select_admin
  ON public.tenant_memberships
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Tenant admins can INSERT new memberships in their tenant
CREATE POLICY tenant_memberships_insert_admin
  ON public.tenant_memberships
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Tenant admins can UPDATE memberships in their tenant
-- (e.g., change a member's role)
CREATE POLICY tenant_memberships_update_admin
  ON public.tenant_memberships
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Tenant admins can DELETE memberships in their tenant
-- Users can also remove themselves
CREATE POLICY tenant_memberships_delete
  ON public.tenant_memberships
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Helper function: Get current user's tenant ID
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.tenant_memberships
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 7. Grant permissions
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.enterprise_tenants TO authenticated;
GRANT SELECT ON public.tenant_memberships TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tenant_memberships TO authenticated;

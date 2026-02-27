-- Migration: Multi-Tenant Schema Initialization
-- Dependencies: auth.users (Supabase Auth)
-- Rollback: DROP TABLE tenant_members, tenants CASCADE; 
--           ALTER TABLE <tables> DROP COLUMN tenant_id;

BEGIN;

-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON public.tenants(created_at DESC);

COMMENT ON TABLE public.tenants IS 
  'Multi-tenant workspace container. Each user belongs to one or more tenants via tenant_members.';

-- Create tenant_members junction table (RBAC)
CREATE TABLE IF NOT EXISTS public.tenant_members (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON public.tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON public.tenant_members(user_id);

COMMENT ON TABLE public.tenant_members IS 
  'User-to-tenant membership with RBAC role. Composite PK prevents duplicate memberships.';

-- Convert idempotency_receipts.tenant_id from TEXT to UUID (nullable for now)
ALTER TABLE public.idempotency_receipts 
  ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid,
  ALTER COLUMN tenant_id DROP NOT NULL;

-- Add tenant_id to operational tables (nullable for zero-downtime)
ALTER TABLE public.audit_logs 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

ALTER TABLE public.man_tasks 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

ALTER TABLE public.omnitrace_runs 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

ALTER TABLE public.omnitrace_events 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Create indexes for tenant_id columns (BEFORE enforcement)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant_id 
  ON public.audit_logs(tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_man_tasks_tenant_id 
  ON public.man_tasks(tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omnitrace_runs_tenant_id 
  ON public.omnitrace_runs(tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omnitrace_events_tenant_id 
  ON public.omnitrace_events(tenant_id) WHERE tenant_id IS NOT NULL;

RAISE NOTICE '✓ Phase 1 Complete: Tenant schema initialized. Columns nullable. Backfill required.';

COMMIT;
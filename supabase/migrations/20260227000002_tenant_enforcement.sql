-- Migration: Tenant Column Enforcement + JWT Hook
-- Dependencies: 20260227000001_tenant_backfill.sql
-- Rollback: ALTER TABLE <tables> ALTER COLUMN tenant_id DROP NOT NULL;
--           DROP FUNCTION IF EXISTS custom_access_token_hook CASCADE;

BEGIN;

-- Mark orphaned rows (safety check before enforcement)
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.idempotency_receipts
  WHERE tenant_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % orphaned idempotency_receipts rows. Marking with sentinel tenant.', orphan_count;
    
    -- Create sentinel tenant for orphaned data
    INSERT INTO public.tenants (id, name)
    VALUES ('00000000-0000-0000-0000-000000000000', 'Orphaned Data')
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.idempotency_receipts
    SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
    WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Enforce NOT NULL constraints (now safe)
ALTER TABLE public.idempotency_receipts 
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.audit_logs 
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.man_tasks 
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.omnitrace_runs 
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.omnitrace_events 
  ALTER COLUMN tenant_id SET NOT NULL;

-- Create custom access token hook (JWT injection)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  tenant_array jsonb := '[]'::jsonb;
BEGIN
  -- Query tenant_members to build array of {tenant_id, role}
  SELECT jsonb_agg(
    jsonb_build_object(
      'tenant_id', tm.tenant_id::text,
      'role', tm.role
    )
  ) INTO tenant_array
  FROM public.tenant_members tm
  WHERE tm.user_id = (event->'user_id')::uuid;

  -- Inject into JWT claims
  event := jsonb_set(
    event,
    '{claims,app_metadata,tenants}',
    COALESCE(tenant_array, '[]'::jsonb)
  );

  RETURN event;
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook IS
  'GoTrue hook: Injects tenant_id array into JWT app_metadata.tenants on token generation.';

-- Grant execution to Supabase Auth
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

RAISE NOTICE '✓ Phase 3 Complete: NOT NULL enforced. JWT hook installed.';

COMMIT;
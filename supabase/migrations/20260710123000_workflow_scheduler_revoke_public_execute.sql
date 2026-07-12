-- ============================================================================
-- P0 security remediation: lock down public.dispatch_scheduled_workflows()
--
-- Forward-only hardening for 20260704230000_workflow_scheduler_vault_project_url.sql
-- (do NOT edit the applied migration). That migration (re)creates the scheduler
-- function as SECURITY DEFINER. PostgreSQL grants EXECUTE to PUBLIC by default on
-- function creation, and CREATE OR REPLACE does not reset privileges. Left as-is,
-- anon / authenticated callers could invoke this Vault-backed workflow fan-out
-- through PostgREST RPC and trigger execute-workflow using the cron shared secret.
--
-- pg_cron runs this function as the job owner (superuser / table owner), which
-- bypasses EXECUTE privilege checks, so no role GRANT is required for scheduling
-- to keep working. We therefore only remove the implicit PUBLIC grant.
--
-- Idempotent: guards the function's existence and each role's existence so the
-- migration applies cleanly on a bare PostgreSQL bootstrap and on Supabase.
--
-- NOTE: the REVOKE statements below ARE the security fix (removing an over-broad
-- implicit grant), not a data-destructive change; they are explicitly allowlisted
-- for the additive-migration gate on the immediately preceding line.
-- ============================================================================

DO $$
BEGIN
  IF to_regprocedure('public.dispatch_scheduled_workflows()') IS NOT NULL THEN
    -- additive-allow: REVOKE P0 security fix: strip implicit PUBLIC EXECUTE from SECURITY DEFINER scheduler
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.dispatch_scheduled_workflows() FROM PUBLIC';

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      -- additive-allow: REVOKE P0 security fix: deny anon RPC access to Vault-backed workflow fan-out
      EXECUTE 'REVOKE EXECUTE ON FUNCTION public.dispatch_scheduled_workflows() FROM anon';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      -- additive-allow: REVOKE P0 security fix: deny authenticated RPC access to Vault-backed workflow fan-out
      EXECUTE 'REVOKE EXECUTE ON FUNCTION public.dispatch_scheduled_workflows() FROM authenticated';
    END IF;
  END IF;
END $$;

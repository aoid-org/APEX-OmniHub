-- =============================================================================
-- Security Advisory Hardening — 2026-06-08
-- Resolves all outstanding Supabase Security Advisor WARNs:
--   lint 0011 · function_search_path_mutable       (update_updated_at_column)
--   lint 0014 · extension_in_public                (vector, pg_net)
--   lint 0024 · rls_policy_always_true             (idempotency_ledger, usage_metering)
--   lint 0028 · anon_security_definer_function     (all listed functions)
--   lint 0029 · authenticated_security_definer     (trigger/internal functions only)
--
-- NOTE — lint 0029 on business RPCs (check_rate_limit, is_admin, etc.):
--   Those functions are intentionally callable by authenticated users.
--   They retain SECURITY DEFINER to bypass RLS for cross-table reads (e.g.
--   auth.users). The lint 0029 warning for those functions is an accepted
--   trade-off; all are guarded internally by auth.uid() / auth.role() checks.
--
-- NOTE — auth_leaked_password_protection:
--   Enable HaveIBeenPwned password checking in the Supabase dashboard:
--   Authentication → Settings → Password Security → Leaked password protection.
--   This cannot be changed via a SQL migration.
--
-- RFC-link: security hardening — resolves Supabase security advisories,
--   no new architecture introduced; all changes remove unintended privileges.
-- =============================================================================

BEGIN;

-- ============================================================
-- 1. Fix mutable search_path on update_updated_at_column
--    (lint 0011 — function_search_path_mutable)
-- ============================================================

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = '';

-- ============================================================
-- 2. Move extensions out of the public schema
--    (lint 0014 — extension_in_public)
--
--    Both pgvector and pg_net are relocatable on Supabase.
--    A NOTICE is raised (not an error) if relocation is not
--    possible, so the migration always commits successfully.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS extensions;

GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'vector' AND n.nspname = 'public'
  ) THEN
    BEGIN
      ALTER EXTENSION vector SET SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'vector extension could not be relocated automatically: %. '
                   'Resolve manually via the Supabase dashboard.', SQLERRM;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'pg_net' AND n.nspname = 'public'
  ) THEN
    BEGIN
      ALTER EXTENSION pg_net SET SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_net extension could not be relocated automatically: %. '
                   'Resolve manually via the Supabase dashboard.', SQLERRM;
    END;
  END IF;
END $$;

-- ============================================================
-- 3. Tighten overly-permissive RLS policies
--    (lint 0024 — rls_policy_always_true)
--
--    Both policies used USING (true) / WITH CHECK (true) without
--    a role constraint, making them apply to all roles (anon,
--    authenticated, service_role alike). Replacing them with an
--    explicit TO service_role restores the intended write boundary.
-- ============================================================

-- 3a. idempotency_ledger — replace ALL policy to scope it to service_role only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'idempotency_ledger'
      AND policyname  = 'Allow orchestrator to read and write idempotency records'
  ) THEN
-- additive-allow: DROP_POLICY Security fix: overly-permissive policy (USING true) replaced to restrict to service_role
    DROP POLICY "Allow orchestrator to read and write idempotency records"
      ON public.idempotency_ledger;
  END IF;
END $$;

CREATE POLICY "Allow orchestrator to read and write idempotency records"
  ON public.idempotency_ledger
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3b. usage_metering — replace INSERT policy to scope it to service_role only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'usage_metering'
      AND policyname = 'Service role can insert usage'
  ) THEN
-- additive-allow: DROP_POLICY Security fix: overly-permissive INSERT policy (WITH CHECK true) replaced to restrict to service_role
    DROP POLICY "Service role can insert usage"
      ON public.usage_metering;
  END IF;
END $$;

CREATE POLICY "Service role can insert usage"
  ON public.usage_metering
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- 4. Trigger / framework functions — lock to service_role
--    (lint 0028 anon + lint 0029 authenticated)
--
--    These functions are invoked only by PostgreSQL trigger
--    machinery or pg_cron jobs. No end-user JWT should be able
--    to call them via PostgREST RPC.
-- ============================================================

-- additive-allow: REVOKE Security fix: trigger function must not be directly executable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.audit_emergency_controls_changes()
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.audit_emergency_controls_changes()
  TO service_role;

-- additive-allow: REVOKE Security fix: internal UUID helper must not be executable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.emergency_controls_singleton_id()
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.emergency_controls_singleton_id()
  TO service_role;

-- additive-allow: REVOKE Security fix: auth trigger function must not be directly executable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.handle_new_user()
  TO service_role;

-- additive-allow: REVOKE Security fix: auth trigger function must not be directly executable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription()
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.handle_new_user_subscription()
  TO service_role;

-- additive-allow: REVOKE Security fix: timestamp trigger function must not be directly executable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.handle_updated_at()
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.handle_updated_at()
  TO service_role;

-- additive-allow: REVOKE Security fix: internal status helper must not be directly executable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.subscription_active_status()
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.subscription_active_status()
  TO service_role;

-- additive-allow: REVOKE Security fix: timestamp trigger function must not be directly executable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.update_man_notifications_updated_at()
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.update_man_notifications_updated_at()
  TO service_role;

-- additive-allow: REVOKE Security fix: timestamp trigger function must not be directly executable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.update_updated_at_column()
  TO service_role;

-- Maintenance / cron-only functions
-- additive-allow: REVOKE Security fix: nonce cleanup is a cron-only operation, must not be callable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_nonces()
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_expired_nonces()
  TO service_role;

-- additive-allow: REVOKE Security fix: audit log cleanup is a cron-only operation, must not be callable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs()
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_old_audit_logs()
  TO service_role;

-- additive-allow: REVOKE Security fix: DLQ cleanup is a cron-only operation, must not be callable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.cleanup_old_dlq_entries(integer)
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_old_dlq_entries(integer)
  TO service_role;

-- additive-allow: REVOKE Security fix: admin metadata sync is a cron-only operation, must not be callable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.sync_admin_metadata_to_user_roles()
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.sync_admin_metadata_to_user_roles()
  TO service_role;

-- ============================================================
-- 5. New trigger/guardian functions not covered by prior
--    migrations — lock to service_role
--    (lint 0028 anon + lint 0029 authenticated)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'physiomni_alert_audit_trigger'
  ) THEN
-- additive-allow: REVOKE Security fix: alert audit trigger must not be directly callable by anon or authenticated
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.physiomni_alert_audit_trigger() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT  EXECUTE ON FUNCTION public.physiomni_alert_audit_trigger() TO service_role';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'chronos_release_expired_locks'
  ) THEN
-- additive-allow: REVOKE Security fix: lock-release maintenance function must not be callable by anon or authenticated
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.chronos_release_expired_locks() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT  EXECUTE ON FUNCTION public.chronos_release_expired_locks() TO service_role';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'trigger_guardian_eval'
  ) THEN
-- additive-allow: REVOKE Security fix: guardian eval trigger must not be directly callable by anon or authenticated
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.trigger_guardian_eval() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT  EXECUTE ON FUNCTION public.trigger_guardian_eval() TO service_role';
  END IF;
END $$;

-- ============================================================
-- 6. Business RPCs — revoke anon; keep authenticated + service_role
--    (lint 0028 — anon_security_definer_function_executable)
--
--    These functions are intentionally callable by authenticated
--    users via /rest/v1/rpc/. They are NOT accessible to the
--    anon role (unauthenticated requests).
-- ============================================================

-- additive-allow: REVOKE Security fix: rate-limit check must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, integer, integer)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_rate_limit(uuid, integer, integer)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: entitlement check must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.check_skill_entitlement(uuid)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_skill_entitlement(uuid)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: admin role claim must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.claim_admin_role()
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_admin_role()
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: admin access claim must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.claim_admin_access(text)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_admin_access(text)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: DLQ replay claim must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.claim_dlq_entries_for_replay(uuid[])
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_dlq_entries_for_replay(uuid[])
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: emergency controls status must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.get_emergency_controls_status()
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_emergency_controls_status()
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: DLQ pending entries must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.get_pending_dlq_entries(integer)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_pending_dlq_entries(integer)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: user tier lookup must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.get_user_tier(uuid)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_user_tier(uuid)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: idempotent event insert must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.insert_agent_event_idempotent(text, integer, text, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.insert_agent_event_idempotent(text, integer, text, jsonb, uuid)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: admin check must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: kill-switch status must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.is_kill_switch_enabled()
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_kill_switch_enabled()
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: operation check must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.is_operation_allowed(text)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_operation_allowed(text)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: operator-takeover flag must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.is_operator_takeover_enabled()
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_operator_takeover_enabled()
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: paid-user check must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.is_paid_user(uuid)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_paid_user(uuid)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: safe-mode flag must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.is_safe_mode_enabled()
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_safe_mode_enabled()
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: audit event logging must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb, uuid)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: omnilink task claim must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.omnilink_claim_task(uuid, text, text)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.omnilink_claim_task(uuid, text, text)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: omnilink task completion must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.omnilink_complete_task(uuid, text, text, jsonb, text)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.omnilink_complete_task(uuid, text, text, jsonb, text)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: omnilink ingest must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.omnilink_ingest(uuid, uuid, uuid, text, jsonb, text, integer, jsonb)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.omnilink_ingest(uuid, uuid, uuid, text, jsonb, text, integer, jsonb)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: omnilink key revocation must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.omnilink_revoke_key(uuid, uuid)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.omnilink_revoke_key(uuid, uuid)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: omnilink approval must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.omnilink_set_approval(uuid, uuid, text)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.omnilink_set_approval(uuid, uuid, text)
  TO authenticated, service_role;

-- additive-allow: REVOKE Security fix: push token upsert must not be callable by unauthenticated (anon) callers
REVOKE EXECUTE ON FUNCTION public.upsert_push_device_token(uuid, text, text, text, text, text, text)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.upsert_push_device_token(uuid, text, text, text, text, text, text)
  TO authenticated, service_role;

COMMIT;

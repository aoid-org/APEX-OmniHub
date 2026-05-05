-- =============================================================================
-- Security Hardening: function search_path + execute grants + admin_claim_secrets RLS
-- Addresses remaining Supabase Security Advisor WARNs without breaking
-- any existing authenticated or service_role access.
-- =============================================================================

BEGIN;

-- ============================================================
-- 1. Fix mutable search_path on functions flagged by the advisor.
--    Pinning to 'public' prevents search_path injection attacks.
-- ============================================================

ALTER FUNCTION public.cleanup_expired_idempotency_receipts()
  SET search_path = public;

ALTER FUNCTION public.claim_admin_role()
  SET search_path = public;

ALTER FUNCTION public.update_idempotency_receipts_updated_at()
  SET search_path = public;

ALTER FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_limit_count integer,
  p_window_seconds integer
)
  SET search_path = public;

-- ============================================================
-- 2. Trigger / internal framework functions.
--    These are invoked by trigger machinery only — never via RPC.
--    REVOKE from PUBLIC, GRANT to service_role as fallback for
--    any internal operational calls.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.audit_emergency_controls_changes()     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.emergency_controls_singleton_id()       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription()          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at()                     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.subscription_active_status()            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_man_notifications_updated_at()   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()              FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.audit_emergency_controls_changes()     TO service_role;
GRANT EXECUTE ON FUNCTION public.emergency_controls_singleton_id()       TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user()                       TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_subscription()          TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_updated_at()                     TO service_role;
GRANT EXECUTE ON FUNCTION public.subscription_active_status()            TO service_role;
GRANT EXECUTE ON FUNCTION public.update_man_notifications_updated_at()   TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column()              TO service_role;

-- ============================================================
-- 3. Internal maintenance / admin-only functions.
--    Only service_role (pg_cron, operator scripts) needs these.
--    Never callable by end-user JWTs.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_nonces()                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs()                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_dlq_entries(integer)        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_admin_metadata_to_user_roles()     FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_nonces()                TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs()                TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_dlq_entries(integer)        TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_admin_metadata_to_user_roles()     TO service_role;

-- ============================================================
-- 4. Business-logic functions.
--    Remove PUBLIC (anon) access; explicitly preserve authenticated
--    + service_role so no existing frontend or edge function breaks.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, integer, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.check_rate_limit(uuid, integer, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.check_skill_entitlement(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.check_skill_entitlement(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.claim_admin_access(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.claim_admin_access(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.claim_admin_role() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.claim_admin_role() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.claim_dlq_entries_for_replay(uuid[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.claim_dlq_entries_for_replay(uuid[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_emergency_controls_status() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_emergency_controls_status() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_pending_dlq_entries(integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_pending_dlq_entries(integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_tier(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_tier(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.insert_agent_event_idempotent(text, integer, text, jsonb, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.insert_agent_event_idempotent(text, integer, text, jsonb, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_kill_switch_enabled() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_kill_switch_enabled() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_operation_allowed(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_operation_allowed(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_operator_takeover_enabled() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_operator_takeover_enabled() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_paid_user(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_paid_user(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_safe_mode_enabled() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_safe_mode_enabled() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.omnilink_claim_task(uuid, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.omnilink_claim_task(uuid, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.omnilink_complete_task(uuid, text, text, jsonb, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.omnilink_complete_task(uuid, text, text, jsonb, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.omnilink_ingest(uuid, uuid, uuid, text, jsonb, text, integer, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.omnilink_ingest(uuid, uuid, uuid, text, jsonb, text, integer, jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.omnilink_revoke_key(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.omnilink_revoke_key(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.omnilink_set_approval(uuid, uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.omnilink_set_approval(uuid, uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.upsert_push_device_token(uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.upsert_push_device_token(uuid, text, text, text, text, text, text) TO authenticated, service_role;

-- ============================================================
-- 5. admin_claim_secrets: RLS enabled but no policies.
--    Add service_role bypass so secrets remain accessible to
--    the admin claim flow.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'admin_claim_secrets'
      AND policyname = 'admin_claim_secrets_service_role_all'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY admin_claim_secrets_service_role_all
        ON public.admin_claim_secrets
        FOR ALL TO service_role
        USING (true) WITH CHECK (true)
    $pol$;
  END IF;
END$$;

COMMIT;

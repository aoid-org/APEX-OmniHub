-- Reduce authenticated SECURITY DEFINER exposure while preserving caller-bound RLS.
BEGIN;

ALTER FUNCTION public.check_skill_entitlement(uuid) SECURITY INVOKER;
ALTER FUNCTION public.omnilink_revoke_key(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.omnilink_set_approval(uuid, uuid, text) SECURITY INVOKER;
ALTER FUNCTION public.upsert_push_device_token(uuid, text, text, text, text, text, text) SECURITY INVOKER;

-- The converted OmniLink RPCs now require explicit caller-bound UPDATE paths.
-- additive-allow: DROP_POLICY Replace the existing policy in one transaction so its caller-bound USING and WITH CHECK expressions stay identical.
DROP POLICY IF EXISTS "Admins update own OmniLink keys" ON public.omnilink_api_keys;
CREATE POLICY "Admins update own OmniLink keys"
ON public.omnilink_api_keys
FOR UPDATE TO authenticated
USING ((SELECT public.is_admin((SELECT auth.uid()))) AND tenant_id = (SELECT auth.uid()))
WITH CHECK ((SELECT public.is_admin((SELECT auth.uid()))) AND tenant_id = (SELECT auth.uid()));

-- additive-allow: DROP_POLICY Replace the existing policy in one transaction so approval updates become caller-bound without a permissive overlap.
DROP POLICY IF EXISTS "Admins decide own OmniLink requests" ON public.omnilink_orchestration_requests;
CREATE POLICY "Admins decide own OmniLink requests"
ON public.omnilink_orchestration_requests
FOR UPDATE TO authenticated
USING ((SELECT public.is_admin((SELECT auth.uid()))) AND tenant_id = (SELECT auth.uid()))
WITH CHECK ((SELECT public.is_admin((SELECT auth.uid()))) AND tenant_id = (SELECT auth.uid()));

-- additive-allow: REVOKE Security fix: converted caller-bound RPCs must not inherit PUBLIC execute.
REVOKE EXECUTE ON FUNCTION public.check_skill_entitlement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_skill_entitlement(uuid) TO authenticated, service_role;
-- additive-allow: REVOKE Security fix: converted caller-bound RPCs must not inherit PUBLIC execute.
REVOKE EXECUTE ON FUNCTION public.omnilink_revoke_key(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.omnilink_revoke_key(uuid, uuid) TO authenticated, service_role;
-- additive-allow: REVOKE Security fix: converted caller-bound RPCs must not inherit PUBLIC execute.
REVOKE EXECUTE ON FUNCTION public.omnilink_set_approval(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.omnilink_set_approval(uuid, uuid, text) TO authenticated, service_role;
-- additive-allow: REVOKE Security fix: converted caller-bound RPCs must not inherit PUBLIC execute.
REVOKE EXECUTE ON FUNCTION public.upsert_push_device_token(uuid, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_push_device_token(uuid, text, text, text, text, text, text) TO authenticated, service_role;

COMMIT;

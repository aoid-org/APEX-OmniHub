-- Keep privileged RLS helpers out of the PostgREST-exposed public schema.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
-- additive-allow: REVOKE The private schema must never be available to anonymous callers.
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.get_user_tier(_user_id uuid)
RETURNS public.subscription_tier
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_tier public.subscription_tier;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM _user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT tier
  INTO v_tier
  FROM public.subscriptions
  WHERE user_id = _user_id
    AND status IN ('active', 'trialing', 'canceled')
    AND (
      (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
      OR (status = 'trialing' AND trial_end > now())
      OR (status = 'canceled' AND current_period_end > now())
    )
  LIMIT 1;

  RETURN coalesce(v_tier, 'free'::public.subscription_tier);
END
$function$;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM _user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
END
$function$;

CREATE OR REPLACE FUNCTION private.is_paid_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM _user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = _user_id
      AND tier IN ('starter', 'pro', 'business', 'enterprise')
      AND status IN ('active', 'trialing', 'canceled')
      AND (
        (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'trialing' AND trial_end > now())
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
END
$function$;

-- additive-allow: REVOKE Private helpers must be callable only by signed-in and service roles.
REVOKE ALL ON FUNCTION private.get_user_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_user_tier(uuid) TO authenticated, service_role;
-- additive-allow: REVOKE Private helpers must be callable only by signed-in and service roles.
REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, service_role;
-- additive-allow: REVOKE Private helpers must be callable only by signed-in and service roles.
REVOKE ALL ON FUNCTION private.is_paid_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_paid_user(uuid) TO authenticated, service_role;

-- Preserve the public RPC contract without exposing privileged execution.
CREATE OR REPLACE FUNCTION public.get_user_tier(_user_id uuid)
RETURNS public.subscription_tier
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.get_user_tier(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.is_admin(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.is_paid_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.is_paid_user(_user_id)
$function$;

-- additive-allow: REVOKE Public wrappers remain unavailable to anonymous callers.
REVOKE ALL ON FUNCTION public.get_user_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_tier(uuid) TO authenticated, service_role;
-- additive-allow: REVOKE Public wrappers remain unavailable to anonymous callers.
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
-- additive-allow: REVOKE Public wrappers remain unavailable to anonymous callers.
REVOKE ALL ON FUNCTION public.is_paid_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_paid_user(uuid) TO authenticated, service_role;

COMMIT;

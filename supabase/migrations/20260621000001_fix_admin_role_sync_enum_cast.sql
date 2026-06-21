-- Forward fix (runtime bug; underlying migration applies cleanly).
--
-- sync_admin_metadata_to_user_roles() runs AFTER INSERT on auth.users (whenever
-- raw_app_meta_data IS NOT NULL, i.e. on essentially every new user). It declared
--   _admin_role constant text := 'admin';
-- and then compared it against public.user_roles.role, whose type is the enum
-- public.app_role:
--   WHERE user_id = NEW.id AND role = _admin_role
-- PostgreSQL has no app_role = text operator, so this raised
--   "operator does not exist: public.app_role = text" (SQLSTATE 42883)
-- inside the trigger, making GoTrue fail new-user creation
-- ("Database error creating new user") — including the synthetic
-- ${fingerprint}@byom.local users created by the byom-login edge function.
--
-- Fix: declare the constant as the enum type public.app_role (schema-qualified
-- because the function pins search_path = ''). All three uses (the EXISTS check,
-- the INSERT value, and the DELETE predicate) then operate on app_role = app_role.
-- 'admin' is a valid app_role label. CREATE OR REPLACE keeps the signature,
-- SECURITY DEFINER, and search_path unchanged. Idempotent and safe to re-run.
CREATE OR REPLACE FUNCTION public.sync_admin_metadata_to_user_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  admin_flag boolean;
  role_exists boolean;
  _admin_role constant public.app_role := 'admin';
BEGIN
  admin_flag := COALESCE((NEW.raw_app_meta_data->>'admin')::boolean, false);

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.id AND role = _admin_role
  ) INTO role_exists;

  IF admin_flag = true AND role_exists = false THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _admin_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RAISE LOG 'Admin role granted to user % via app_metadata sync', NEW.id;
  ELSIF admin_flag = false AND role_exists = true THEN
    DELETE FROM public.user_roles
    WHERE user_id = NEW.id AND role = _admin_role;
    RAISE LOG 'Admin role revoked from user % via app_metadata sync', NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

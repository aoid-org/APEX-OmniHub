-- Forward fix (runtime bug; the prior migrations apply cleanly, so this is a
-- proper forward correction rather than an in-place history edit).
--
-- handle_new_user_subscription() inserted public.subscription_active_status()
-- (declared RETURNS text, body `SELECT 'active'`) directly into
-- public.subscriptions.status, whose type is the enum public.subscription_status.
-- PostgreSQL has no implicit text -> enum cast, so the INSERT raised
--   "column status is of type public.subscription_status but expression is of type text"
--   (SQLSTATE 42804)
-- inside the AFTER INSERT trigger on auth.users, which made GoTrue fail EVERY
-- new-user creation ("Database error creating new user") — including the synthetic
-- ${fingerprint}@byom.local users created by the byom-login edge function.
--
-- Fix: cast the helper result to the enum at the call site. CREATE OR REPLACE keeps
-- the trigger function signature, SECURITY DEFINER, and empty search_path unchanged;
-- only the explicit cast is added. Idempotent and safe to re-run.
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', public.subscription_active_status()::public.subscription_status)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

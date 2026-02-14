-- Enforce server-side data integrity for audit_logs and device_registry.
-- Prevents client-side spoofing of actor_id and user_id via triggers.
-- Prevents device self-promotion to 'trusted' status.

BEGIN;

-- ==========================================================================
-- audit_logs: Force actor_id to auth.uid() on every insert/update
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.enforce_audit_actor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.actor_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_audit_actor_trigger ON public.audit_logs;
CREATE TRIGGER enforce_audit_actor_trigger
  BEFORE INSERT OR UPDATE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_audit_actor();

-- Tighten INSERT policy: remove "OR actor_id IS NULL" since trigger handles it
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- trigger enforces actor_id = auth.uid()

-- ==========================================================================
-- device_registry: Force user_id to auth.uid() and block self-promotion
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.enforce_device_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.user_id := auth.uid();
  IF NEW.status = 'trusted' THEN
    RAISE EXCEPTION 'Cannot self-promote device to trusted status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_device_owner_trigger ON public.device_registry;
CREATE TRIGGER enforce_device_owner_trigger
  BEFORE INSERT OR UPDATE ON public.device_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_device_owner();

COMMIT;

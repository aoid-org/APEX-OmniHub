-- Migration: Harden man_notifications RLS
-- Purpose: Current SELECT policy allows ANY authenticated user to read ALL
--          MAN mode notifications — cross-tenant data leakage.
-- Gap:     NEW-7
-- Author:  APEX Engineering
-- Date:    2026-03-15

-- Add user_id foreign key for ownership scoping
ALTER TABLE public.man_notifications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_man_notifications_user_id
  ON public.man_notifications (user_id)
  WHERE user_id IS NOT NULL;

-- Drop the over-broad existing policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'man_notifications'
      AND policyname  = 'man_notifications_user_read'
  ) THEN
    DROP POLICY man_notifications_user_read ON public.man_notifications;
  END IF;
END $$;

-- Tighter policy: only the owning user or service_role can read notifications
CREATE POLICY "man_notifications_owner_read"
  ON public.man_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Keep service_role full-access policy intact (created in 20260119)
-- If not present, create it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'man_notifications'
      AND policyname  = 'man_notifications_service_full_access'
  ) THEN
    CREATE POLICY "man_notifications_service_full_access"
      ON public.man_notifications
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMENT ON COLUMN public.man_notifications.user_id IS
  'Owning user for RLS scoping. Set by the activity that creates the notification.';

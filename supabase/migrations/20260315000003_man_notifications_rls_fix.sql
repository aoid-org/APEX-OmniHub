-- Migration: Harden man_notifications RLS
-- Purpose:   Current SELECT policy uses auth.role() = 'authenticated'
--            which allows any authenticated user to read ALL MAN mode
--            notifications including those for other users' workflows.
--            This is a cross-tenant data leakage vulnerability.
-- Gap:       GAP-4 (man_notifications over-broad SELECT policy)
-- Author:    APEX Engineering
-- Date:      2026-03-15
--
-- man_notifications schema (from 20260119000000):
--   id, idempotency_key, task_id, workflow_id, step_id,
--   channel, message, metadata, sent_at, status,
--   created_at, updated_at

-- Add user_id for ownership scoping
ALTER TABLE public.man_notifications
    ADD COLUMN IF NOT EXISTS user_id UUID
        REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_man_notifications_user_id
    ON public.man_notifications (user_id)
    WHERE user_id IS NOT NULL;

-- Manage RLS policies in a single block to avoid literal duplication
DO $$
DECLARE
    _tbl CONSTANT TEXT := 'man_notifications';
    _schema CONSTANT TEXT := 'public';
BEGIN
    -- Drop the over-broad SELECT policy
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = _schema
          AND tablename  = _tbl
          AND policyname = 'man_notifications_user_read'
    ) THEN
        DROP POLICY man_notifications_user_read
            ON public.man_notifications;
    END IF;

    -- Scoped policy: only the owning user can read their notifications
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = _schema
          AND tablename  = _tbl
          AND policyname = 'man_notifications_owner_read'
    ) THEN
        CREATE POLICY "man_notifications_owner_read"
            ON public.man_notifications
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;

    -- Ensure service_role full-access policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = _schema
          AND tablename  = _tbl
          AND policyname = 'man_notifications_service_full_access'
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
    'Owning user for RLS scoping. Set by the activity that creates '
    'the notification. NULL rows visible to service_role only.';

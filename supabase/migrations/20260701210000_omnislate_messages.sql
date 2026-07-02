-- ============================================================================
-- MIGRATION: OmniSlate chat message persistence (PRCC-001 WP-2a)
-- ============================================================================
-- Purpose:
-- - Persist the OmniSlate agent chat so history survives reloads. Previously the
--   OmniSlateWidget held messages only in React useState, so every reload erased
--   the conversation (audit 2026-07-01, defect #2 — the platform's #1 trust break
--   for a product named "Universal Sync Orchestrator").
-- - Additive only: new table + RLS + indexes. No existing object altered.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.omnislate_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- additive-allow: ON_DELETE_CASCADE chat is user-owned data — deleting the user removes their conversation (GDPR-friendly); no cross-entity fan-out.
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT omnislate_messages_role_valid CHECK (role IN ('user','assistant')),
  CONSTRAINT omnislate_messages_content_not_empty CHECK (length(btrim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_omnislate_messages_user_created
  ON public.omnislate_messages(user_id, created_at);

ALTER TABLE public.omnislate_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.omnislate_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.omnislate_messages TO service_role;

-- Users may read their own chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'omnislate_messages'
      AND policyname = 'Users read own omnislate messages'
  ) THEN
    CREATE POLICY "Users read own omnislate messages"
      ON public.omnislate_messages FOR SELECT TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Users may append their own messages (client-driven chat)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'omnislate_messages'
      AND policyname = 'Users insert own omnislate messages'
  ) THEN
    CREATE POLICY "Users insert own omnislate messages"
      ON public.omnislate_messages FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Users may clear their own chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'omnislate_messages'
      AND policyname = 'Users delete own omnislate messages'
  ) THEN
    CREATE POLICY "Users delete own omnislate messages"
      ON public.omnislate_messages FOR DELETE TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'omnislate_messages'
      AND policyname = 'Service role full access to omnislate messages'
  ) THEN
    CREATE POLICY "Service role full access to omnislate messages"
      ON public.omnislate_messages FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

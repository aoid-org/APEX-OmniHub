-- OmniTrace read-contract guard (idempotent).
--
-- Guarantees the exact shape the OmniTrace decision-replay surface
-- (apps/omnihub-site/src/components/OmniTracePanel.tsx) reads:
--   SELECT id, actor_id, action_type, resource_type, resource_id, metadata,
--          created_at FROM audit_logs   (RLS-scoped to actor_id = auth.uid())
--
-- The original table migration (20251218000000) uses bare CREATE POLICY, which
-- is NOT idempotent on re-run. This migration is fully guarded so it can be
-- applied safely on a fresh DB, a partial DB, or an already-provisioned DB.
-- It does not weaken any existing policy and adds no new write surface.

-- 1. Table exists with the full read shape (fresh DB safety).
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Columns exist on partially-provisioned tables (additive, guarded).
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS resource_type text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS resource_id text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 3. RLS is enabled (no-op if already enabled).
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. The own-row SELECT policy exists exactly once (idempotent re-create).
-- additive-allow: DROP_POLICY guarded IF EXISTS drop is immediately followed by an identical CREATE POLICY (same SELECT/authenticated/USING actor_id = auth.uid()); no privilege is widened or removed, this only guarantees a single canonical policy on re-run.
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid());

-- 5. Read indexes backing the replay query (ordered by recency).
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON public.audit_logs(resource_type, resource_id) WHERE resource_type IS NOT NULL;

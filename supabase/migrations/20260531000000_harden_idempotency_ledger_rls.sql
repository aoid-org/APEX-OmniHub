-- Harden idempotency ledger access for existing deployments.
-- The orchestrator uses the Supabase service_role key, which bypasses RLS; browser roles do not need access.

DROP POLICY IF EXISTS "Allow orchestrator to read and write idempotency records"
    ON public.idempotency_ledger;

ALTER TABLE public.idempotency_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_ledger FORCE ROW LEVEL SECURITY;

-- Defense in depth: remove table privileges from browser/API roles even if default grants exist.
REVOKE ALL ON TABLE public.idempotency_ledger FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.idempotency_ledger TO service_role;

-- PhysiOmni telemetry partition RLS hardening.
--
-- The parent table public.physiomni_telemetry has RLS enabled with tenant-scoped
-- SELECT and service-role policies. In PostgreSQL, RLS and policies on a partitioned
-- parent are NOT automatically enforced for queries made *directly* against a child
-- partition. Because these partitions live in the PostgREST-exposed `public` schema,
-- a client could query them directly and bypass tenant isolation.
--
-- Remediation: enable RLS on each existing partition. With no partition-level policy,
-- direct access by `authenticated` / `anon` is denied (fail-closed); `service_role`
-- (BYPASSRLS in Supabase) is unaffected; normal reads continue through the parent,
-- which retains its tenant-scoped policies.
--
-- Rollback: supabase/migrations/rollback/20260528000000_physiomni_telemetry_partition_rls_down.sql

ALTER TABLE public.physiomni_telemetry_2026_05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physiomni_telemetry_2026_06 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physiomni_telemetry_2026_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physiomni_telemetry_2026_08 ENABLE ROW LEVEL SECURITY;

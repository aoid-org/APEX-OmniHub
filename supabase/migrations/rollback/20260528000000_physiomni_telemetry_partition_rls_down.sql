-- Rollback for 20260528000000_physiomni_telemetry_partition_rls.sql
-- Disables partition-level RLS. Note: rolling back re-exposes the partitions to direct
-- (RLS-bypassing) access in the public schema; only apply if intentionally reverting.

ALTER TABLE public.physiomni_telemetry_2026_05 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.physiomni_telemetry_2026_06 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.physiomni_telemetry_2026_07 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.physiomni_telemetry_2026_08 DISABLE ROW LEVEL SECURITY;

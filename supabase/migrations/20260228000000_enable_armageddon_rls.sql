-- ============================================================================
-- Migration: 20260228000000_enable_armageddon_rls.sql
-- Purpose:   Enable RLS on Armageddon telemetry tables
-- Author:    APEX Business Systems Engineering
-- Date:      2026-02-28
-- ============================================================================
-- Context:
--   armageddon_events and armageddon_runs were created without RLS
--   (commented out in 20260125000005_armageddon_events.sql, lines 59-60).
--
--   These tables are accessed EXCLUSIVELY via SUPABASE_SERVICE_ROLE_KEY
--   from Temporal activity workers (src/armageddon/activities/level7.ts).
--   The service_role bypasses RLS automatically — zero behavioral change.
--
--   Without RLS enabled, PostgREST exposes these tables to the anon key,
--   creating an unnecessary attack surface.
--
--   No RLS policies are needed because:
--   1. service_role bypasses RLS (the only legitimate accessor)
--   2. anon/authenticated should have ZERO access (default-deny with RLS on)
-- ============================================================================

ALTER TABLE public.armageddon_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.armageddon_runs ENABLE ROW LEVEL SECURITY;

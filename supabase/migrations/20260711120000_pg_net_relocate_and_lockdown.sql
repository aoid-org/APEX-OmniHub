-- =============================================================================
-- pg_net Relocation + Execute Lockdown — 2026-07-11 (post-audit live verification)
-- =============================================================================
-- Resolves the still-open Supabase Security Advisor finding on pg_net placement
-- referenced in AUDIT.md (2026-07-11, PR #1629 follow-up).
--
-- ROOT CAUSE (confirmed live via Supabase Management API SQL query, 2026-07-11):
--   The prior migration 20260608000000_security_advisory_hardening.sql attempted
--   `ALTER EXTENSION pg_net SET SCHEMA extensions` inside an exception-guarded DO
--   block. That statement fails with Postgres error 0A000:
--     "extension "pg_net" does not support SET SCHEMA"
--   pg_net is a non-relocatable extension, so the ALTER can never succeed — the
--   exception handler silently caught this and pg_net has remained in `public`
--   in production ever since (verified live: pg_extension.extnamespace = public
--   as of 2026-07-11; vector's relocation in the same migration DID succeed).
--
-- FIX: DROP + CREATE in the target schema is the only supported relocation path
--   for a non-relocatable extension. This is safe for existing callers because
--   pg_net always exposes its functions under its own dedicated `net` schema
--   regardless of which schema the extension itself is registered under —
--   confirmed against Supabase's pg_net docs/community guidance. All existing
--   net.http_post(...) call sites (20260527000000_physiomni_phase2_intelligence.sql,
--   20260701200000_workflow_scheduler.sql, 20260704184149_dynamic_workflow_scheduler_url.sql,
--   20260704230000_workflow_scheduler_vault_project_url.sql) are unaffected — none
--   qualify the call with `extensions.` and none need to change.
--
-- SECONDARY FINDING (same live audit, not previously flagged in AUDIT.md):
--   net.http_post / net.http_get / net.http_delete had EXECUTE granted to
--   `anon` and `authenticated` — pg_net's install-time default. No current live
--   caller needs this: every production caller is a SECURITY DEFINER function
--   owned by `postgres` (workflow_scheduler, physiomni_phase2), so revoking has
--   zero impact on any active runtime path. Leaving it open is an SSRF-adjacent
--   risk. Locking to postgres/service_role only, matching the pattern already
--   used for other internal-only functions in
--   20260608000000_security_advisory_hardening.sql.
--
-- CORRUPTION NOTE (2026-07-12): the first two commits of this file (merged via
-- PR #1632) were silently truncated mid-statement by a file-sync issue between
-- the agent's edit tool and its shell — CI's text-based additive-migrations
-- gate didn't catch it (truncation occurred after the last line it checked),
-- but `supabase db push` did, failing with "unterminated dollar-quoted
-- string." This version was written and verified end-to-end in a single shell
-- pass with explicit dollar-quote-balance and COMMIT-terminator checks.
--
-- RFC-link: security hardening — resolves an open Supabase advisory + closes an
--   unflagged over-broad grant; no new architecture, removes privileges only.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Relocate pg_net out of public (DROP + CREATE — ALTER is not supported).
--    Both statements run in this one transaction, so no external caller ever
--    observes a window where net.http_post is unavailable. If DROP fails for
--    an unforeseen reason, the whole transaction rolls back — intentionally
--    NOT exception-guarded here, unlike the prior migration, so a real
--    blocker surfaces instead of silently no-op'ing again.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'pg_net' AND n.nspname = 'public'
  ) THEN
    DROP EXTENSION pg_net;
    CREATE EXTENSION pg_net SCHEMA extensions;
  END IF;
END $$;

GRANT USAGE ON SCHEMA net TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- 2. Lock outbound-request functions to postgres/service_role only.
--    pg_net install-time default grants EXECUTE on net.http_get/http_post/
--    http_delete to anon + authenticated; no live caller needs this (all
--    callers are SECURITY DEFINER, owned by postgres) — closes an unflagged
--    SSRF-adjacent open grant. Each REVOKE below is individually annotated
--    per the additive-migrations gate.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'net' AND p.proname = 'http_post') THEN
-- additive-allow: REVOKE Security fix: net.http_post open to anon/authenticated by pg_net default; only postgres/service_role call it live
    REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer)
      TO postgres, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'net' AND p.proname = 'http_get') THEN
-- additive-allow: REVOKE Security fix: net.http_get open to anon/authenticated by pg_net default; only postgres/service_role call it live
    REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer)
      TO postgres, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'net' AND p.proname = 'http_delete') THEN
-- additive-allow: REVOKE Security fix: net.http_delete open to anon/authenticated by pg_net default; only postgres/service_role call it live
    REVOKE ALL ON FUNCTION net.http_delete(url text, params jsonb, headers jsonb, timeout_milliseconds integer, body jsonb)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION net.http_delete(url text, params jsonb, headers jsonb, timeout_milliseconds integer, body jsonb)
      TO postgres, service_role;
  END IF;
END $$;

COMMIT;

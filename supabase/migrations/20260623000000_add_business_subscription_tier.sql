-- ============================================================================
-- MIGRATION: Add 'business' tier to subscription_tier enum
-- PR: PhysiOmni Business+ Paywall Gating
-- Date: 2026-06-23
-- ============================================================================
-- Additive only — no DROP, no TRUNCATE, no breaking ALTER.
-- Inserts 'business' between 'pro' and 'enterprise' in the APEX tier ladder:
--   free → starter → pro → business ($299 CAD/mo) → enterprise (custom)
-- ============================================================================

DO $$ BEGIN
  ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'business' AFTER 'pro';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Comment the enum values for clarity
COMMENT ON TYPE public.subscription_tier IS
  'free=no access, starter=basic, pro=$99 CAD PhysiOmni preview only, business=$299 CAD full PhysiOmni pilot, enterprise=custom hardware+SLA';

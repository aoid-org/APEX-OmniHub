-- ============================================================================
-- MIGRATION: Skill Entitlement DB-Level Enforcement (TOCTOU Race Fix)
-- ============================================================================
-- Purpose: Close the check-then-insert race in the Skill Forge monetization
-- gate. The edge function generate-business-skills calls
-- check_skill_entitlement (read) and then inserts into user_generated_skills
-- (write) with no database-level enforcement — concurrent requests could
-- exceed the 3-skill BASIC cap. This migration adds an atomic BEFORE trigger
-- that serializes per-user inserts with a transaction advisory lock and
-- re-validates the cap inside the same transaction as the write.
--
-- FUNCTION: enforce_skill_entitlement (trigger)
-- - Skips rows where is_active is not true (inactive skills don't count)
-- - Takes pg_advisory_xact_lock keyed on the user id to serialize
--   concurrent active-skill inserts/activations for the same user
-- - Counts active skills, reads tier from user_entitlements (default BASIC)
-- - BASIC = 3 (The Pilot Trap), PRO = 999999 (effectively unlimited)
-- - Raises 'LIMIT_REACHED: ...' when the cap is hit; the edge function maps
--   this to the existing 402 LIMIT_REACHED contract
--
-- TRIGGER: trg_enforce_skill_entitlement
-- - BEFORE INSERT OR UPDATE OF is_active ON public.user_generated_skills
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_skill_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_count INTEGER;
    max_limit INTEGER;
    user_tier TEXT;
BEGIN
    -- Inactive skills do not count toward the entitlement cap
    IF NEW.is_active IS DISTINCT FROM true THEN
        RETURN NEW;
    END IF;

    -- Serialize concurrent inserts/activations for this user within the
    -- transaction (released automatically at COMMIT/ROLLBACK)
    PERFORM pg_advisory_xact_lock(
        hashtextextended('user_generated_skills:' || NEW.user_id::text, 0)
    );

    -- Count existing active skills (exclude the row itself for UPDATEs)
    SELECT COUNT(*) INTO current_count
    FROM public.user_generated_skills
    WHERE user_id = NEW.user_id
      AND is_active = true
      AND id <> NEW.id;

    -- Get tier from user_entitlements (default to BASIC if not found)
    SELECT tier INTO user_tier
    FROM public.user_entitlements
    WHERE user_id = NEW.user_id
    LIMIT 1;

    IF user_tier IS NULL THEN
        user_tier := 'BASIC';
    END IF;

    -- BASIC = 3 (The Pilot Trap), PRO = 999999 (effectively unlimited)
    IF user_tier = 'PRO' THEN
        max_limit := 999999;
    ELSE
        max_limit := 3;
    END IF;

    IF current_count >= max_limit THEN
        RAISE EXCEPTION 'LIMIT_REACHED: skill cap (%) reached for tier %',
            max_limit, user_tier;
    END IF;

    RETURN NEW;
END;
$$;

-- Idempotent trigger creation (Postgres 15+: CREATE OR REPLACE TRIGGER)
CREATE OR REPLACE TRIGGER trg_enforce_skill_entitlement
BEFORE INSERT OR UPDATE OF is_active ON public.user_generated_skills
FOR EACH ROW
EXECUTE FUNCTION public.enforce_skill_entitlement();

-- Lock down the SECURITY DEFINER trigger function (CANONICAL_TRUTH fact 8:
-- trigger functions revoke EXECUTE from PUBLIC, anon, and authenticated)
-- additive-allow: REVOKE Security hardening: trigger function must not be directly executable by anon or authenticated
REVOKE EXECUTE ON FUNCTION public.enforce_skill_entitlement()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.enforce_skill_entitlement() IS
'Atomic DB-level monetization gate for user_generated_skills. Closes the check-then-insert (TOCTOU) race in the Skill Forge flow: serializes per-user active-skill writes via pg_advisory_xact_lock and raises LIMIT_REACHED when the tier cap (BASIC=3, PRO=999999) is exceeded.';
